import { Router } from 'express';
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const credentials = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const publicUser = (user: any) => ({ id: String(user._id), firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, addresses: user.addresses });
const issueToken = (id: string) => jwt.sign({}, env.JWT_SECRET, { subject: id, expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
const setSession = (response: any, token: string) => response.cookie('accessToken', token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

router.post('/register', async (request, response) => {
  const input = credentials.extend({ firstName: z.string().min(2).max(60), lastName: z.string().min(2).max(60) }).parse(request.body);
  if (await User.exists({ email: input.email.toLowerCase() })) throw new AppError(409, 'An account already exists for this email', 'EMAIL_EXISTS');
  const user = await User.create({ ...input, email: input.email.toLowerCase(), passwordHash: await (User as any).hashPassword(input.password) });
  setSession(response, issueToken(String(user._id)));
  response.status(201).json({ success: true, data: { user: publicUser(user) } });
});

router.post('/login', async (request, response) => {
  const input = credentials.parse(request.body);
  const user = await User.findOne({ email: input.email.toLowerCase(), isActive: true }).select('+passwordHash');
  if (!user || !await (user as any).verifyPassword(input.password)) throw new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
  setSession(response, issueToken(String(user._id)));
  response.json({ success: true, data: { user: publicUser(user) } });
});

router.post('/logout', (_request, response) => { response.clearCookie('accessToken'); response.status(204).send(); });
router.post('/forgot-password', async (request, response) => {
  const { email } = z.object({ email: z.email() }).parse(request.body);
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+passwordResetHash +passwordResetExpiresAt');
  let developmentResetToken: string | undefined;
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetHash = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    if (env.NODE_ENV === 'development') developmentResetToken = token;
  }
  response.json({ success: true, data: { message: 'If an account matches that email, reset instructions have been prepared.', developmentResetToken } });
});
router.post('/reset-password', async (request, response) => {
  const { token, password } = z.object({ token: z.string().length(64), password: z.string().min(8).max(128) }).parse(request.body);
  const passwordResetHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetHash, passwordResetExpiresAt: { $gt: new Date() }, isActive: true }).select('+passwordHash +passwordResetHash +passwordResetExpiresAt');
  if (!user) throw new AppError(422, 'Reset link is invalid or expired', 'INVALID_RESET_TOKEN');
  user.passwordHash = await (User as any).hashPassword(password); user.passwordResetHash = undefined; user.passwordResetExpiresAt = undefined; await user.save();
  response.json({ success: true, data: { message: 'Password updated successfully.' } });
});
router.get('/me', authenticate, async (request, response) => response.json({ success: true, data: { user: publicUser(await User.findById(request.user!.id)) } }));
router.patch('/me', authenticate, async (request, response) => {
  const input = z.object({ firstName: z.string().min(2).max(60).optional(), lastName: z.string().min(2).max(60).optional(), addresses: z.array(z.object({ label: z.string(), recipient: z.string(), line1: z.string(), line2: z.string().optional(), city: z.string(), region: z.string(), postalCode: z.string(), country: z.string().length(2), phone: z.string().optional(), isDefault: z.boolean().optional() })).optional() }).parse(request.body);
  const user = await User.findByIdAndUpdate(request.user!.id, input, { new: true, runValidators: true });
  response.json({ success: true, data: { user: publicUser(user) } });
});

export default router;