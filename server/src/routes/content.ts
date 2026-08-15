import { Router } from 'express';
import { z } from 'zod';
import { Banner, Subscriber, SupportTicket } from '../models/Operations.js';

const router = Router();

router.get('/banners', async (_request, response) => {
  const now = new Date();
  const banners = await Banner.find({ isActive: true, $and: [{ $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] }] }).sort('order').lean();
  response.json({ success: true, data: banners });
});

router.post('/support', async (request, response) => {
  const input = z.object({ name: z.string().min(2).max(120), email: z.email(), message: z.string().min(10).max(5000) }).parse(request.body);
  const ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await SupportTicket.create({ ...input, ticketNumber });
  response.status(201).json({ success: true, data: { ticketNumber, message: 'Your message has been received.' } });
});

router.post('/newsletter', async (request, response) => {
  const { email } = z.object({ email: z.email() }).parse(request.body);
  await Subscriber.findOneAndUpdate({ email: email.toLowerCase() }, { email: email.toLowerCase(), isActive: true, subscribedAt: new Date() }, { upsert: true });
  response.status(201).json({ success: true, data: { message: 'You are subscribed.' } });
});

export default router;