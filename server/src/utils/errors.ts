export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code = 'APPLICATION_ERROR', public details?: unknown) {
    super(message);
  }
}