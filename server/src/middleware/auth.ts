import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

declare global { namespace Express { interface Request { user?: { id: string; role: string } } } }

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const bearer = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : undefined;
    const token = request.cookies.accessToken ?? bearer;
    if (!token) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await User.findOne({ _id: payload.sub, isActive: true }).select('role').lean();
    if (!user) throw new AppError(401, 'Session is no longer valid', 'INVALID_SESSION');
    request.user = { id: String(user._id), role: String(user.role) };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Session is invalid or expired', 'INVALID_SESSION'));
  }
};

export const authorize = (...roles: string[]): RequestHandler => (request, _response, next) => {
  if (!request.user || !roles.includes(request.user.role)) return next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
  next();
};