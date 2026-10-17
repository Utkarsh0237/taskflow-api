import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { taskRouter } from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { defaultRateLimiter } from './middleware/rateLimiter';

export const app = express();

// Security headers with Helmet
app.use(helmet());

// Body parser with payload size limit (50kb)
app.use(express.json({ limit: '50kb' }));

// In-memory rate limiting
app.use(defaultRateLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Diagnostic test endpoint for verifying 500 error handling in test suite
if (process.env.NODE_ENV === 'test') {
  app.get('/_test/error', () => {
    throw new Error('Simulated internal server failure');
  });
}

// Task endpoints
app.use('/tasks', taskRouter);

// Catch-all for undefined routes (404 JSON response)
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
