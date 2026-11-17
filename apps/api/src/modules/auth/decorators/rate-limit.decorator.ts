import { SetMetadata } from "@nestjs/common";
import { AUTH_RATE_LIMIT_POLICY } from "../rate-limit.constants";
import { RateLimitPolicy } from "../rate-limit.types";

/** Attaches a policy; the controller explicitly orders the guard(s) per route. */
export function RateLimit(policy: RateLimitPolicy) {
  return SetMetadata(AUTH_RATE_LIMIT_POLICY, policy);
}
