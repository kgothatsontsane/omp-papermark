import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ponytail: construct Upstash clients lazily — @upstash/redis validates config
// at construction, so eager `new Redis(undefined)` crashes module import
// (broke `trigger dev` task loading when env vars are absent, e.g. local dev).
function lazyRedis(
  url: string | undefined,
  token: string | undefined,
): Redis {
  let instance: Redis | undefined;
  return new Proxy({} as Redis, {
    get(_target, prop) {
      instance ??= new Redis({
        url: url as string,
        token: token as string,
      });
      const value = Reflect.get(instance as object, prop);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const redis = lazyRedis(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.UPSTASH_REDIS_REST_TOKEN,
);

export const lockerRedisClient = lazyRedis(
  process.env.UPSTASH_REDIS_REST_LOCKER_URL,
  process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN,
);

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "papermark",
  });
};
