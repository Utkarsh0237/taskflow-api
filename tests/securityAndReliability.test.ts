import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../src/app';
import { createRateLimiter, resetRateLimits } from '../src/middleware/rateLimiter';
import { handleShutdown } from '../src/server';

describe('Security & Reliability (PR #3: Hardening, Headers, Limits, Errors)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe('Security Headers (Helmet)', () => {
    it('should set essential security headers and remove X-Powered-By', async () => {
      const res = await request(app).get('/health');

      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
      expect(res.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('Undefined Route Handling (404 JSON)', () => {
    it('should return structured JSON for undefined GET routes instead of HTML', async () => {
      const res = await request(app).get('/api/unknown/endpoint');

      expect(res.status).toBe(404);
      expect(res.header['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        error: 'NotFound',
        message: 'Cannot GET /api/unknown/endpoint'
      });
    });

    it('should return structured JSON for undefined POST routes', async () => {
      const res = await request(app).post('/nonexistent-path').send({});

      expect(res.status).toBe(404);
      expect(res.header['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        error: 'NotFound',
        message: 'Cannot POST /nonexistent-path'
      });
    });
  });

  describe('Payload Size Limit (50kb)', () => {
    it('should return 413 PayloadTooLarge when body exceeds 50kb', async () => {
      // 55kb payload
      const largeDescription = 'x'.repeat(55 * 1024);

      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Large Payload Task',
          description: largeDescription
        });

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        error: 'PayloadTooLarge',
        message: 'Request payload exceeds maximum allowed size'
      });
    });
  });

  describe('Centralized Error Handler', () => {
    it('should catch AppError operational exceptions and return structured JSON with details', async () => {
      const res = await request(app).get('/_test/app-error');

      expect(res.status).toBe(400);
      expect(res.header['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        error: 'BadRequestError',
        message: 'Custom bad request',
        details: ['detail-1', 'detail-2']
      });
    });

    it('should catch unexpected errors and return structured 500 without leaking stack traces', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/_test/error');

      expect(res.status).toBe(500);
      expect(res.header['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        error: 'InternalServerError',
        message: 'An unexpected internal server error occurred'
      });
      expect(res.body).not.toHaveProperty('stack');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('In-Memory Rate Limiting', () => {
    it('should attach standard rate limit headers with accurate counts and decrements', async () => {
      const res1 = await request(app).get('/health');
      expect(res1.headers['x-ratelimit-limit']).toBe('100');
      expect(res1.headers['x-ratelimit-remaining']).toBe('99');
      expect(Number(res1.headers['x-ratelimit-reset'])).toBeGreaterThan(0);

      const res2 = await request(app).get('/health');
      expect(res2.headers['x-ratelimit-limit']).toBe('100');
      expect(res2.headers['x-ratelimit-remaining']).toBe('98');
    });

    it('should reject requests with 429 when rate limit threshold is exceeded and provide valid Retry-After', async () => {
      const customApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 5 * 1000,
        maxRequests: 2
      });

      customApp.use(testLimiter);
      customApp.get('/limited', (_req, res) => res.json({ ok: true }));

      // First two requests should pass
      const res1 = await request(customApp).get('/limited');
      expect(res1.status).toBe(200);

      const res2 = await request(customApp).get('/limited');
      expect(res2.status).toBe(200);

      // Third request should be rate-limited
      const res3 = await request(customApp).get('/limited');
      expect(res3.status).toBe(429);
      expect(res3.body).toMatchObject({
        error: 'TooManyRequests',
        message: 'Too many requests. Please try again later.'
      });

      const retryAfter = Number(res3.headers['retry-after']);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(5);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close idle connections, close server, and exit cleanly with code 0 on SIGTERM', () => {
      const mockServer = {
        close: vi.fn((cb?: (err?: Error) => void) => {
          if (cb) cb();
        }),
        closeIdleConnections: vi.fn()
      };

      const mockExit = vi.fn();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      handleShutdown(mockServer, 'SIGTERM', { exitFn: mockExit, timeoutMs: 1000 });

      expect(mockServer.closeIdleConnections).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should exit with code 1 if server.close returns an error', () => {
      const mockServer = {
        close: vi.fn((cb?: (err?: Error) => void) => {
          if (cb) cb(new Error('Close error'));
        }),
        closeIdleConnections: vi.fn()
      };

      const mockExit = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      handleShutdown(mockServer, 'SIGINT', { exitFn: mockExit, timeoutMs: 1000 });

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });
  });
});
