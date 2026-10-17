import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response headers were already sent, delegate to Express default handler to close stream
  if (res.headersSent) {
    next(err);
    return;
  }

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

  // 4. Client 4xx errors passed from upstream libraries (e.g. 415 Unsupported Media Type)
  if (
    typeof err === 'object' &&
    err !== null &&
    (('status' in err && typeof (err as { status: number }).status === 'number' && (err as { status: number }).status >= 400 && (err as { status: number }).status < 500) ||
     ('statusCode' in err && typeof (err as { statusCode: number }).statusCode === 'number' && (err as { statusCode: number }).statusCode >= 400 && (err as { statusCode: number }).statusCode < 500))
  ) {
    const statusCode = (err as { status?: number; statusCode?: number }).status || (err as { status?: number; statusCode?: number }).statusCode || 400;
    const message = (err as { message?: string }).message || 'Client request error';
    res.status(statusCode).json({
      error: 'ClientError',
      message
    });
    return;
  }

  // 5. Catch-all for unexpected internal errors (prevent internal stack trace leakage)
  console.error('Internal server error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected internal server error occurred'
  });
}
