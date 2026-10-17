import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { taskRouter } from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { BadRequestError } from './errors/AppError';

export const app = express();

// Trust reverse proxy (e.g. Nginx, Cloudflare, container ingress)
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet());

// In-memory rate limiting (Mounted BEFORE body parser so malformed/oversized requests are counted)
app.use(defaultRateLimiter);

// Body parser with payload size limit (50kb)
app.use(express.json({ limit: '50kb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Diagnostic test endpoints for verifying error handling in test suite
if (process.env.NODE_ENV === 'test') {
  app.get('/_test/error', () => {
    throw new Error('Simulated internal server failure');
  });

  app.get('/_test/app-error', () => {
    throw new BadRequestError('Custom bad request', ['detail-1', 'detail-2']);
  });
}

// Task endpoints
app.use('/tasks', taskRouter);

// Catch-all for undefined routes (404 JSON response)
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
