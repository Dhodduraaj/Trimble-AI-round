import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../errors/DomainErrors';

/**
 * Global Error Handler formatting all exceptions as RFC 7807 Problem Details payloads.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      type: `https://api.lms.com/errors/${err.code}`,
      title: err.name,
      status: err.statusCode,
      code: err.code,
      detail: err.message,
      timestamp: timestamp,
      instance: req.originalUrl,
    });
    return;
  }

  // Handle generic internal server errors
  console.error('[UnhandledError]', err);
  res.status(500).json({
    type: 'https://api.lms.com/errors/INTERNAL_SERVER_ERROR',
    title: 'InternalServerError',
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    detail: 'An unexpected internal server error occurred.',
    timestamp: timestamp,
    instance: req.originalUrl,
  });
}
