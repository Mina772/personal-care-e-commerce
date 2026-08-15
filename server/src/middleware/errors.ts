import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const notFound: RequestHandler = (request, _response, next) => next(new AppError(404, `Route ${request.method} ${request.path} not found`, 'NOT_FOUND'));

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) return response.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.flatten() } });
  if (error instanceof AppError) return response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
  console.error('Unhandled request error', error);
  return response.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
};