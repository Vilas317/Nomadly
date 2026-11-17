export type RateLimitBucket = {
  /** Stable bucket name used in the Redis key. */
  name: string;
  /** Maximum number of requests in the fixed window. */
  limit: number;
  /** Window duration in seconds. */
  windowSeconds: number;
  /** `ip` or `email-ip`; email-ip uses the normalized body email and client IP. */
  identity: "ip" | "email-ip";
};

export type RateLimitPolicy = {
  /** Stable endpoint policy name. */
  name: string;
  /** Every bucket is checked atomically. */
  buckets: RateLimitBucket[];
};
