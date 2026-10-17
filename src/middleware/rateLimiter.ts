import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  maxStoredIps?: number;
}

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  reset(): void;
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiterMiddleware {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const maxRequests = options.maxRequests || 100; // 100 requests default
  const maxStoredIps = options.maxStoredIps || 5000; // Cap map size to prevent unbounded memory growth

  // Instance-scoped sliding window storage (IP -> array of request timestamps)
  const ipRequests = new Map<string, number[]>();

  // Periodically sweep expired IP entries to prevent memory exhaustion
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipRequests.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        ipRequests.delete(ip);
      } else {
        ipRequests.set(ip, active);
      }
    }
  }, windowMs);

  sweepInterval.unref();

  const rateLimiter = function (req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Map size protection: evict only expired entries, and fail-closed if completely saturated with active clients
    if (ipRequests.size >= maxStoredIps && !ipRequests.has(ip)) {
      for (const [existingIp, existingTimestamps] of ipRequests.entries()) {
        const stillActive = existingTimestamps.filter(t => now - t < windowMs);
        if (stillActive.length === 0) {
          ipRequests.delete(existingIp);
          break;
        } else {
          ipRequests.set(existingIp, stillActive);
        }
      }

      // If map is still full of active clients, fail closed so existing clients cannot have their limits wiped out
      if (ipRequests.size >= maxStoredIps && !ipRequests.has(ip)) {
        const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Rate limit capacity reached. Please try again later.',
          retryAfter: retryAfterSeconds
        });
        return;
      }
    }

    const timestamps = ipRequests.get(ip) || [];
    // Slide window: keep only timestamps within the current window
    const activeTimestamps = timestamps.filter(t => now - t < windowMs);

    if (activeTimestamps.length >= maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetTime = oldestActive + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSeconds
      });
      return;
    }

    activeTimestamps.push(now);
    ipRequests.set(ip, activeTimestamps);

    const remaining = maxRequests - activeTimestamps.length;
    const resetTime = activeTimestamps[0] + windowMs;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    next();
  };

  rateLimiter.reset = () => {
    ipRequests.clear();
  };

  return rateLimiter;
}

export const defaultRateLimiter = createRateLimiter();

export function resetRateLimits(): void {
  defaultRateLimiter.reset();
}
