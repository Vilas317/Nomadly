import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import Redis from "ioredis";
import { createHmac } from "crypto";
import { RateLimitBucket } from "../rate-limit.types";

export type RateLimitIdentity = {
  ip: string;
  email?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const CONSUME_BUCKETS_SCRIPT = `
local blocked = 0
local retryAfterMs = 0
for index = 1, #KEYS do
  local limit = tonumber(ARGV[((index - 1) * 2) + 1])
  local windowMs = tonumber(ARGV[((index - 1) * 2) + 2])
  local count = redis.call('INCR', KEYS[index])
  if count == 1 then
    redis.call('PEXPIRE', KEYS[index], windowMs)
  end
  if count > limit then
    blocked = 1
    local ttl = redis.call('PTTL', KEYS[index])
    if ttl < 1 then ttl = windowMs end
    if ttl > retryAfterMs then retryAfterMs = ttl end
  end
end
return { blocked, retryAfterMs }
`;

@Injectable()
export class RedisRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRateLimitService.name);
  private readonly redis: Redis;
  private readonly keySecret: string;

  constructor() {
    const hmacSecret = process.env.RATE_LIMIT_HMAC_SECRET;

    if (!hmacSecret || !/^[a-fA-F0-9]{64}$/.test(hmacSecret)) {
      throw new Error(
        "RATE_LIMIT_HMAC_SECRET must be configured as exactly 64 hexadecimal characters",
      );
    }

    this.keySecret = hmacSecret;

    this.redis = new Redis(
      process.env.REDIS_URL || "redis://127.0.0.1:6379",
      {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 2000),
        commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT_MS || 2000),
        retryStrategy: (attempt) => Math.min(attempt * 250, 1500),
      },
    );

    this.redis.on("error", (error: Error & { code?: string }) => {
      // Log only the error type/code. Never log Redis URLs or credentials.
      this.logger.error(
        `Redis client error: ${error.name}${error.code ? ` (${error.code})` : ""}`,
      );
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      if (this.redis.status === "wait") {
        await this.redis.connect();
      }

      if (this.redis.status !== "ready") {
        throw new Error(`Unexpected Redis status: ${this.redis.status}`);
      }

      this.logger.log("Redis rate-limit connection established");
    } catch {
      this.redis.disconnect();

      this.logger.error("Failed to establish Redis connection during startup");

      throw new Error(
        "Failed to establish Redis connection during startup",
      );
    }
  }

  private digest(value: string): string {
    return createHmac("sha256", this.keySecret)
      .update(value)
      .digest("hex");
  }

  private buildKey(
    policyName: string,
    bucket: RateLimitBucket,
    identity: RateLimitIdentity,
  ): string {
    const ipDigest = this.digest(identity.ip);

    const identityValue =
      bucket.identity === "email-ip"
        ? `${identity.ip}\n${(identity.email || "<missing>")
            .trim()
            .toLowerCase()
            .slice(0, 320)}`
        : identity.ip;

    const identityDigest = this.digest(identityValue);

    return `nomadly:ratelimit:v1:${policyName}:${bucket.name}:${ipDigest}:${identityDigest}`;
  }

  async consume(
    policyName: string,
    buckets: RateLimitBucket[],
    identity: RateLimitIdentity,
  ): Promise<RateLimitResult> {
    if (!identity.ip || identity.ip.length > 128 || buckets.length === 0) {
      throw new ServiceUnavailableException(
        "Authentication protection is temporarily unavailable",
      );
    }

    const keys = buckets.map((bucket) =>
      this.buildKey(policyName, bucket, identity),
    );

    const args = buckets.flatMap((bucket) => [
      String(bucket.limit),
      String(bucket.windowSeconds * 1000),
    ]);

    try {
      const result = (await this.redis.eval(
        CONSUME_BUCKETS_SCRIPT,
        keys.length,
        ...keys,
        ...args,
      )) as [number, number];

      const blocked = Number(result[0]) === 1;

      return {
        allowed: !blocked,
        retryAfterSeconds: blocked
          ? Math.max(1, Math.ceil(Number(result[1]) / 1000))
          : 0,
      };
    } catch {
      // Fail closed: protected auth routes never silently run without Redis.
      throw new ServiceUnavailableException(
        "Authentication protection is temporarily unavailable",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === "ready") {
      await this.redis.quit().catch(() => this.redis.disconnect());
    } else {
      this.redis.disconnect();
    }
  }
}