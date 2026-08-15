import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { createCheckout } from '../services/order-payments.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.use(['/checkout', '/orders'], authenticate);
const address = z.object({ recipient: z.string().min(2), line1: z.string().min(3), line2: z.string().optional().default(''), city: z.string().min(2), region: z.string().min(2), postalCode: z.string().min(3), country: z.string().length(2), phone: z.string().min(8).max(20) });
router.post('/checkout/create-session', async (request, response) => { const input = z.object({ shippingAddress: address, billingAddress: address }).parse(request.body); response.status(201).json({ success: true, data: await createCheckout(request.user!.id, input) }); });
router.get('/orders', async (request, response) => response.json({ success: true, data: await Order.find({ user: request.user!.id }).sort('-createdAt').lean() }));
router.get('/orders/:id', async (request, response) => { const order = await Order.findOne({ _id: request.params.id, user: request.user!.id }).lean(); if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'); response.json({ success: true, data: order }); });
router.post('/products/:productId/reviews', authenticate, async (request, response) => {
  const input = z.object({ rating: z.number().int().min(1).max(5), title: z.string().min(3).max(100), body: z.string().min(10).max(2000) }).parse(request.body);
  const verifiedPurchase = Boolean(await Order.exists({ user: request.user!.id, 'items.product': request.params.productId, paymentStatus: 'paid' }));
  const review = await Review.findOneAndUpdate({ product: request.params.productId, user: request.user!.id }, { ...input, verifiedPurchase }, { upsert: true, new: true, runValidators: true });
  const stats = await Review.aggregate([{ $match: { product: review.product, status: 'approved' } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  await Product.updateOne({ _id: review.product }, { ratingAverage: stats[0]?.average ?? 0, ratingCount: stats[0]?.count ?? 0 });
  response.status(201).json({ success: true, data: review });
});
export default router;