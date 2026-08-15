import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { resolveCart } from '../services/cart.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.use(['/cart', '/wishlist'], authenticate);
router.get('/cart', async (request, response) => response.json({ success: true, data: await resolveCart(request.user!.id) }));
router.post('/cart/items', async (request, response) => {
  const input = z.object({ productId: z.string(), variantId: z.string(), quantity: z.number().int().min(1).max(99) }).parse(request.body);
  const product = await Product.findOne({ _id: input.productId, status: 'active', 'variants._id': input.variantId });
  const variant = product?.variants.id(input.variantId);
  if (!product || !variant || !variant.isActive) throw new AppError(404, 'Product variant is unavailable', 'VARIANT_UNAVAILABLE');
  if (variant.stock < input.quantity) throw new AppError(409, 'Requested quantity exceeds available stock', 'INSUFFICIENT_STOCK');
  const cart = await Cart.findOneAndUpdate({ user: request.user!.id }, { $setOnInsert: { user: request.user!.id } }, { upsert: true, new: true });
  const existing = cart.items.find((item) => String(item.product) === input.productId && String(item.variantId) === input.variantId);
  const requestedQuantity = (existing?.quantity ?? 0) + input.quantity;
  if (requestedQuantity > variant.stock) throw new AppError(409, `Only ${variant.stock} units are available`, 'INSUFFICIENT_STOCK');
  if (existing) existing.quantity = requestedQuantity; else cart.items.push({ product: input.productId, variantId: input.variantId, quantity: input.quantity } as any);
  await cart.save();
  response.status(201).json({ success: true, data: await resolveCart(request.user!.id) });
});
router.patch('/cart/items/:variantId', async (request, response) => {
  const { quantity } = z.object({ quantity: z.number().int().min(1).max(99) }).parse(request.body);
  const cart = await Cart.findOne({ user: request.user!.id });
  const item = cart?.items.find((entry) => String(entry.variantId) === request.params.variantId);
  if (!cart || !item) throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
  item.quantity = quantity; await cart.save();
  response.json({ success: true, data: await resolveCart(request.user!.id) });
});
router.delete('/cart/items/:variantId', async (request, response) => { await Cart.updateOne({ user: request.user!.id }, { $pull: { items: { variantId: request.params.variantId } } }); response.json({ success: true, data: await resolveCart(request.user!.id) }); });
router.post('/cart/coupon', async (request, response) => {
  const { code } = z.object({ code: z.string().min(2).max(30).transform((value) => value.toUpperCase()) }).parse(request.body);
  const coupon = await Coupon.findOne({ code, isActive: true, startsAt: { $lte: new Date() }, expiresAt: { $gte: new Date() } });
  if (!coupon || coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(422, 'Coupon is invalid or expired', 'INVALID_COUPON');
  await Cart.findOneAndUpdate({ user: request.user!.id }, { couponCode: code }, { upsert: true });
  const result = await resolveCart(request.user!.id);
  if (result.totals.discountCents === 0) throw new AppError(422, `Coupon requires a minimum purchase of $${(coupon.minimumCents / 100).toFixed(2)}`, 'COUPON_MINIMUM');
  response.json({ success: true, data: result });
});
router.get('/wishlist', async (request, response) => { const user = await User.findById(request.user!.id).populate({ path: 'wishlist', populate: { path: 'brand category', select: 'name slug' } }); response.json({ success: true, data: user?.wishlist ?? [] }); });
router.post('/wishlist/:productId', async (request, response) => { if (!await Product.exists({ _id: request.params.productId, status: 'active' })) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND'); await User.updateOne({ _id: request.user!.id }, { $addToSet: { wishlist: request.params.productId } }); response.status(204).send(); });
router.delete('/wishlist/:productId', async (request, response) => { await User.updateOne({ _id: request.user!.id }, { $pull: { wishlist: request.params.productId } }); response.status(204).send(); });
export default router;