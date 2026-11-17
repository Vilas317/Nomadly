import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, REFRESH_TTL_SECONDS } from "./auth.constants";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

type AuthedRequest = Request & { user: { id: string } };

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

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return { user: await this.auth.register(body) };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    const tokens = await this.auth.issueTokens(user.id);
    this.setTokenCookies(response, tokens);
    return { user: { id: user.id, email: user.email, profile: user.profile } };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[REFRESH_COOKIE];
    if (!token) {
      this.clearTokenCookies(response);
      return { authenticated: false };
    }
    const tokens = await this.auth.rotateRefreshToken(token);
    this.setTokenCookies(response, tokens);
    return { authenticated: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.revokeRefreshToken(request.cookies?.[REFRESH_COOKIE]);
    this.clearTokenCookies(response);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: AuthedRequest) {
    return { user: await this.auth.getCurrentUser(request.user.id) };
  }
}
