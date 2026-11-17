import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { RedisRateLimitService } from "../services/redis-rate-limit.service";
import { AUTH_RATE_LIMIT_POLICY } from "../rate-limit.constants";
import { RateLimitPolicy } from "../rate-limit.types";

type RateLimitedRequest = Request & { body?: { email?: unknown } };

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RedisRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<RateLimitPolicy>(AUTH_RATE_LIMIT_POLICY, context.getHandler());
    if (!policy) return true;

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = request.ip || request.socket.remoteAddress || "";
    const rawEmail = request.body?.email;
    const email = typeof rawEmail === "string" ? rawEmail : undefined;

    const result = await this.rateLimiter.consume(policy.name, policy.buckets, { ip, email });
    if (!result.allowed) {
      response.setHeader("Retry-After", String(result.retryAfterSeconds));
      throw new HttpException(
  {
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests. Please try again later.',
  },
  HttpStatus.TOO_MANY_REQUESTS,
);
    }
    return true;
  }
}
