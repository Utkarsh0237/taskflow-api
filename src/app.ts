import express, { Request, Response } from 'express';
import { taskRouter } from './routes/taskRoutes';

export const app = express();

// Global middleware
app.use(express.json());

// Handle malformed JSON error from express.json()
app.use((err: unknown, _req: Request, res: Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Malformed JSON payload'
    });
    return;
  }
  next(err);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Task endpoints
app.use('/tasks', taskRouter);

export default app;
