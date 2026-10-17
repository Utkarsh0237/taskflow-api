import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../src/app';
import { createRateLimiter, resetRateLimits } from '../src/middleware/rateLimiter';

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

  describe('Centralized 500 Error Handler', () => {
    it('should catch unexpected errors and return structured 500 without leaking stack traces', async () => {
      // Temporarily suppress console.error during test
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
    it('should attach standard rate limit headers to requests', async () => {
      const res = await request(app).get('/health');

      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
      expect(res.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should reject requests with 429 when custom rate limit threshold is exceeded', async () => {
      const customApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 10 * 1000,
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
      expect(res3.headers).toHaveProperty('retry-after');
    });
  });
});
