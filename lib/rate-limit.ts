type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  // Normalize identifier to prevent bypass via casing/whitespace
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const entry = rateLimitStore.get(normalizedIdentifier);

  if (!entry || now >= entry.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(normalizedIdentifier, { count: 1, resetTime });
    // Cleanup old entries periodically
    if (rateLimitStore.size > 10000) {
      for (const [key, val] of rateLimitStore) {
        if (now >= val.resetTime) rateLimitStore.delete(key);
      }
    }
    return { success: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIp(req: { headers: { get: (key: string) => string | null } }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
