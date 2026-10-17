import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handled operational application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  // 2. Malformed JSON parsing errors
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Malformed JSON payload'
    });
    return;
  }

  // 3. Request entity too large (payload limit exceeded)
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: 'PayloadTooLarge',
      message: 'Request payload exceeds maximum allowed size'
    });
    return;
  }

  // 4. Catch-all for unexpected internal errors (prevent internal stack trace leakage)
  console.error('Internal server error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected internal server error occurred'
  });
}
