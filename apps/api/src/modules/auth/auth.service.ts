import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";

type AuthUser = { id: string; email: string; profile: { username: string; displayName: string; avatarUrl: string | null } | null };
type TokenBundle = { accessToken: string; refreshToken: string };
type EncryptedBundle = { successorCiphertext: string; successorIv: string; successorAuthTag: string };
type RefreshOutcome =
  | { kind: "rotated"; tokens: TokenBundle }
  | { kind: "reused" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "unavailable" };

type SessionMetadata = { userAgent?: string | null; ipAddress?: string | null };

const RETRY_WINDOW_MS = 30_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

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

  private encryptionKey() {
    const value = process.env.REFRESH_TOKEN_ENCRYPTION_KEY;
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
      throw new Error("REFRESH_TOKEN_ENCRYPTION_KEY must be a 64-character hex-encoded 32-byte key");
    }
    return Buffer.from(value, "hex");
  }

  private tokenHash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private publicUser(user: AuthUser) {
    return { id: user.id, email: user.email, profile: user.profile };
  }

  private encryptBundle(tokens: TokenBundle): EncryptedBundle {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
    return {
      successorCiphertext: ciphertext.toString("base64"),
      successorIv: iv.toString("base64"),
      successorAuthTag: cipher.getAuthTag().toString("base64"),
    };
  }

  private decryptBundle(row: {
    successorCiphertext: string | null;
    successorIv: string | null;
    successorAuthTag: string | null;
  }): TokenBundle {
    if (!row.successorCiphertext || !row.successorIv || !row.successorAuthTag) {
      throw new UnauthorizedException("The refresh retry window is no longer available");
    }
    try {
      const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), Buffer.from(row.successorIv, "base64"));
      decipher.setAuthTag(Buffer.from(row.successorAuthTag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(row.successorCiphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
      const result = JSON.parse(plaintext) as TokenBundle;
      if (!result.accessToken || !result.refreshToken) throw new Error("Invalid token bundle");
      return result;
    } catch {
      throw new UnauthorizedException("The refresh retry could not be completed");
    }
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
        data: { email, passwordHash, profile: { create: { username, displayName: input.displayName.trim() } } },
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

  async issueTokens(userId: string, metadata: SessionMetadata = {}): Promise<TokenBundle> {
    const familyId = randomUUID();
    const tokenId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const payload = { sub: userId, sid: familyId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: this.accessSecret(), expiresIn: "15m" }),
      this.jwt.signAsync({ ...payload, jti: tokenId }, { secret: this.refreshSecret(), expiresIn: "30d" }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.create({
        data: {
          id: familyId,
          userId,
          createdAt: now,
          lastUsedAt: now,
          expiresAt,
          userAgent: metadata.userAgent?.slice(0, 512) ?? null,
          ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
        },
      });
      await tx.refreshToken.create({
        data: {
          userId,
          familyId,
          tokenHash: this.tokenHash(refreshToken),
          expiresAt,
        },
      });
    });

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(token: string, requestId: string): Promise<TokenBundle> {
    if (!requestId || requestId.length > 128) throw new UnauthorizedException("A valid refresh request ID is required");

    let payload: { sub: string; jti: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    if (!payload.sub || !payload.jti || !payload.sid) throw new UnauthorizedException("Refresh token is invalid");

    const oldHash = this.tokenHash(token);
    const requestIdHash = this.tokenHash(requestId);
    const nextId = randomUUID();
    const tokenPayload = { sub: payload.sub, sid: payload.sid };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(tokenPayload, { secret: this.accessSecret(), expiresIn: "15m" }),
      this.jwt.signAsync({ ...tokenPayload, jti: nextId }, { secret: this.refreshSecret(), expiresIn: "30d" }),
    ]);
    const tokens = { accessToken, refreshToken };
    const encrypted = this.encryptBundle(tokens);
    const newHash = this.tokenHash(refreshToken);
    const now = new Date();
    const retryUntil = new Date(now.getTime() + RETRY_WINDOW_MS);
    const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const outcome: RefreshOutcome = await this.prisma.$transaction(async (tx) => {
      const current = await tx.refreshToken.findUnique({ where: { tokenHash: oldHash } });
      if (!current || current.userId !== payload.sub || current.familyId !== payload.sid) return { kind: "invalid" };

      const duplicateOutcome = async (row: typeof current): Promise<RefreshOutcome> => {
        // A consumed token may be retried idempotently only while its session
        // and account are still active. Never return a successor bundle after
        // logout, logout-all, individual session revocation, or suspension.
        const activeSession = await tx.authSession.findFirst({
          where: {
            id: payload.sid,
            userId: payload.sub,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            user: { is: { status: AccountStatus.ACTIVE } },
          },
          select: { id: true },
        });
        if (!activeSession) return { kind: "unavailable" };

        if (
          row.refreshRequestKeyHash === requestIdHash &&
          row.retryUntil && row.retryUntil > new Date() &&
          row.successorCiphertext && row.successorIv && row.successorAuthTag
        ) {
          return { kind: "rotated", tokens: this.decryptBundle(row) };
        }
        return { kind: "reused" };
      };

      if (current.revokedAt) return duplicateOutcome(current);
      if (current.expiresAt <= now) return { kind: "expired" };

      const consumed = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null, expiresAt: { gt: now } },
        data: {
          revokedAt: now,
          replacedByTokenHash: newHash,
          refreshRequestKeyHash: requestIdHash,
          retryUntil,
          ...encrypted,
        },
      });

      if (consumed.count !== 1) {
        const latest = await tx.refreshToken.findUnique({ where: { id: current.id } });
        if (latest?.revokedAt) return duplicateOutcome(latest);
        return { kind: "reused" };
      }

      const user = await tx.user.findUnique({ where: { id: payload.sub }, select: { id: true, status: true } });
      const session = await tx.authSession.findFirst({
        where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (!user || user.status !== AccountStatus.ACTIVE || !session) return { kind: "unavailable" };

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId: current.familyId,
          tokenHash: newHash,
          expiresAt: sessionExpiresAt,
        },
      });
      await tx.authSession.update({
        where: { id: current.familyId },
        data: { lastUsedAt: now, expiresAt: sessionExpiresAt },
      });
      return { kind: "rotated", tokens };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

    if (outcome.kind === "reused") {
      await this.revokeTokenFamily(payload.sid);
      throw new UnauthorizedException("Refresh token reuse detected; this session has been revoked");
    }
    if (outcome.kind === "expired") throw new UnauthorizedException("Refresh token has expired");
    if (outcome.kind === "unavailable") throw new UnauthorizedException("Account or session is unavailable");
    if (outcome.kind !== "rotated") throw new UnauthorizedException("Refresh token is invalid");

    // A duplicate retry returns the same token bundle; this update never clears a revocation.
    await this.prisma.authSession.updateMany({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null },
      data: { lastUsedAt: new Date(), expiresAt: sessionExpiresAt },
    });
    return outcome.tokens;
  }

  private async revokeTokenFamily(familyId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { id: familyId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async revokeRefreshToken(token: string | undefined) {
    if (!token) return;
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokenHash(token) },
      select: { familyId: true },
    });
    if (stored) await this.revokeTokenFamily(stored.familyId);
  }

  async revokeSession(userId: string, sessionId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.authSession.findFirst({
        where: { id: sessionId, userId, revokedAt: null },
        select: { id: true },
      });
      if (!session) return false;
      await tx.authSession.update({ where: { id: sessionId }, data: { revokedAt: now } });
      await tx.refreshToken.updateMany({
        where: { familyId: sessionId, userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });
  }

  async revokeAllSessions(userId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { revokedSessions: sessions.count };
    });
  }

  async listActiveSessions(userId: string, currentSessionId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
    }).then((sessions) => sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    })));
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
