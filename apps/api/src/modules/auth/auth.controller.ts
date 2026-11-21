import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, REFRESH_TTL_SECONDS } from "./auth.constants";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RateLimit } from "./decorators/rate-limit.decorator";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";

type AuthedRequest = Request & { user: { id: string; sessionId: string } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/v1/auth",
      maxAge: maxAge * 1000,
    };
  }

  private setTokenCookies(response: Response, tokens: { accessToken: string; refreshToken: string }) {
    response.cookie(ACCESS_COOKIE, tokens.accessToken, this.cookieOptions(ACCESS_TTL_SECONDS));
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, this.cookieOptions(REFRESH_TTL_SECONDS));
  }

  private clearTokenCookies(response: Response) {
    response.clearCookie(ACCESS_COOKIE, { ...this.cookieOptions(0), maxAge: undefined });
    response.clearCookie(REFRESH_COOKIE, { ...this.cookieOptions(0), maxAge: undefined });
  }

  @RateLimit({
    name: "register",
    buckets: [{ name: "ip", identity: "ip", limit: 5, windowSeconds: 15 * 60 }],
  })
  @Post("register")
  @UseGuards(AuthRateLimitGuard)
  async register(@Body() body: RegisterDto) {
    return { user: await this.auth.register(body) };
  }

  @RateLimit({ name: "verify-email", buckets: [{ name: "ip", identity: "ip", limit: 20, windowSeconds: 15 * 60 }] })
  @Post("verify-email")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async verifyEmail(@Body() body: { token?: string }) {
    return this.auth.verifyEmail(body.token || "");
  }

  @RateLimit({ name: "resend-verification", buckets: [{ name: "ip", identity: "ip", limit: 5, windowSeconds: 15 * 60 }] })
  @Post("resend-verification")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async resendVerification(@Body() body: { email?: string }) {
    if (!body.email || body.email.length > 254) throw new BadRequestException("A valid email is required");
    return this.auth.resendVerification(body.email);
  }

  @RateLimit({ name: "google-login", buckets: [{ name: "ip", identity: "ip", limit: 20, windowSeconds: 15 * 60 }] })
  @Post("google")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async google(@Body() body: { credential?: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.authenticateGoogleCredential(body.credential || "");
    const tokens = await this.auth.issueTokens(user.id, { userAgent: request.get("user-agent"), ipAddress: request.ip });
    this.setTokenCookies(response, tokens);
    return { user };
  }

  @RateLimit({
    name: "login",
    buckets: [
      { name: "ip-email", identity: "email-ip", limit: 10, windowSeconds: 15 * 60 },
      { name: "ip-wide", identity: "ip", limit: 50, windowSeconds: 15 * 60 },
    ],
  })
  @Post("login")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    const tokens = await this.auth.issueTokens(user.id, {
      userAgent: request.get("user-agent"),
      ipAddress: request.ip,
    });
    this.setTokenCookies(response, tokens);
    return { user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerifiedAt), profile: user.profile } };
  }

  @RateLimit({
    name: "refresh",
    buckets: [{ name: "ip", identity: "ip", limit: 60, windowSeconds: 60 }],
  })
  @Post("refresh")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[REFRESH_COOKIE];
    if (!token) {
      this.clearTokenCookies(response);
      return { authenticated: false };
    }
    const requestId = request.header("x-refresh-request-id");
    if (!requestId) throw new BadRequestException("X-Refresh-Request-Id header is required");
    const tokens = await this.auth.rotateRefreshToken(token, requestId);
    this.setTokenCookies(response, tokens);
    return { authenticated: true };
  }

  @RateLimit({
    name: "logout",
    buckets: [{ name: "ip", identity: "ip", limit: 20, windowSeconds: 60 }],
  })
  @Post("logout")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard, JwtAuthGuard)
  async logout(@Req() request: AuthedRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.revokeSession(request.user.id, request.user.sessionId);
    this.clearTokenCookies(response);
    return { success: true };
  }

  @RateLimit({
    name: "logout-all",
    buckets: [{ name: "ip", identity: "ip", limit: 20, windowSeconds: 60 }],
  })
  @Post("logout-all")
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard, JwtAuthGuard)
  async logoutAll(@Req() request: AuthedRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.revokeAllSessions(request.user.id);
    this.clearTokenCookies(response);
    return { success: true, revokedSessions: result.revokedSessions };
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  async sessions(@Req() request: AuthedRequest) {
    return {
      sessions: await this.auth.listActiveSessions(request.user.id, request.user.sessionId),
    };
  }

  @Delete("sessions/:sessionId")
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @Param("sessionId") sessionId: string,
    @Req() request: AuthedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!sessionId || sessionId.length > 128) throw new BadRequestException("Invalid session ID");
    const revoked = await this.auth.revokeSession(request.user.id, sessionId);
    if (!revoked) throw new BadRequestException("Session not found or already revoked");
    if (sessionId === request.user.sessionId) this.clearTokenCookies(response);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: AuthedRequest) {
    return { user: await this.auth.getCurrentUser(request.user.id) };
  }
}
