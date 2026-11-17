import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";

type AuthUser = {
  id: string;
  email: string;
  profile: { username: string; displayName: string; avatarUrl: string | null } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private accessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
    return secret;
  }

  private refreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < 32) throw new Error("JWT_REFRESH_SECRET must be at least 32 characters");
    return secret;
  }

  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private publicUser(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      profile: user.profile,
    };
  }

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const [emailExists, usernameExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.profile.findUnique({ where: { username }, select: { id: true } }),
    ]);
    if (emailExists) throw new ConflictException("An account with this email already exists");
    if (usernameExists) throw new ConflictException("This username is already taken");

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: { create: { username, displayName: input.displayName.trim() } },
        },
        select: { id: true, email: true, profile: { select: { username: true, displayName: true, avatarUrl: true } } },
      });
      return this.publicUser(user);
    } catch (error: any) {
      if (error?.code === "P2002") throw new ConflictException("Email or username is already in use");
      throw error;
    }
  }

  async validateCredentials(emailInput: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
      select: {
        id: true, email: true, passwordHash: true, status: true,
        profile: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!user || user.status !== AccountStatus.ACTIVE) throw new UnauthorizedException("Invalid email or password");
    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) throw new UnauthorizedException("Invalid email or password");
    const { passwordHash: _hash, status: _status, ...safeUser } = user;
    return safeUser;
  }

  async issueTokens(userId: string) {
    const tokenId = randomUUID();
    const payload = { sub: userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: this.accessSecret(), expiresIn: "15m" }),
      this.jwt.signAsync({ ...payload, jti: tokenId }, { secret: this.refreshSecret(), expiresIn: "30d" }),
    ]);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(token: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    if (!payload.sub || !payload.jti) throw new UnauthorizedException("Refresh token is invalid");
    const tokenHash = this.tokenHash(token);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.userId !== payload.sub || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    // Delete before issuing the replacement: a refresh token can only be used once.
    await this.prisma.refreshToken.delete({ where: { tokenHash } });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });
    if (!user || user.status !== AccountStatus.ACTIVE) throw new UnauthorizedException("Account is unavailable");
    return this.issueTokens(user.id);
  }

  async revokeRefreshToken(token: string | undefined) {
    if (!token) return;
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.tokenHash(token) } });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, profile: { select: {
        username: true, displayName: true, bio: true, avatarUrl: true,
        homeCity: true, homeState: true, homeCountry: true, visibility: true,
        travelStyle: true, budgetMin: true, budgetMax: true, languages: true, interests: true,
      } } },
    });
    if (!user) throw new UnauthorizedException("Account not found");
    return user;
  }
}
