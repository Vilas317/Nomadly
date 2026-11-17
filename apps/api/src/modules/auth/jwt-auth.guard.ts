import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { ACCESS_COOKIE } from "./auth.constants";

type AuthenticatedRequest = Request & {
  user?: { id: string; sessionId: string };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    const token = request.cookies?.[ACCESS_COOKIE] || bearer;
    if (!token) throw new UnauthorizedException("Authentication required");

    let payload: { sub?: string; sid?: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException("Access token is missing its session identifier");
    }

    // Check the session on every guarded request. Revoking a session therefore
    // invalidates its access tokens immediately instead of waiting for JWT expiry.
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, user: { select: { status: true } } },
    });

    if (!session || session.user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("This session has been revoked or expired");
    }

    request.user = { id: payload.sub, sessionId: payload.sid };
    return true;
  }
}
