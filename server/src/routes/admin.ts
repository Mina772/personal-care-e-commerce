import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { Brand, Category } from '../models/Catalog.js';
import { AuditLog, Banner, SiteSetting, SupportTicket } from '../models/Operations.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.use(authenticate, authorize('admin', 'manager'));
router.get('/dashboard', async (_request, response) => {
  const [sales, orders, customers, lowStock, recentOrders] = await Promise.all([Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, revenueCents: { $sum: '$totals.grandTotalCents' }, averageOrderCents: { $avg: '$totals.grandTotalCents' } } }]), Order.countDocuments(), User.countDocuments({ role: 'customer' }), Product.aggregate([{ $unwind: '$variants' }, { $match: { $expr: { $lte: ['$variants.stock', '$variants.lowStockThreshold'] }, status: 'active' } }, { $project: { name: 1, slug: 1, variant: '$variants.name', sku: '$variants.sku', stock: '$variants.stock' } }, { $limit: 10 }]), Order.find().populate('user', 'firstName lastName email').sort('-createdAt').limit(8).lean()]);
  response.json({ success: true, data: { revenueCents: sales[0]?.revenueCents ?? 0, averageOrderCents: Math.round(sales[0]?.averageOrderCents ?? 0), orders, customers, lowStock, recentOrders } });
});
router.get('/orders', async (_request, response) => response.json({ success: true, data: await Order.find().populate('user', 'firstName lastName email').sort('-createdAt').lean() }));
router.patch('/orders/:id/status', async (request, response) => { const { status, note } = z.object({ status: z.enum(['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded']), note: z.string().max(300).optional() }).parse(request.body); const order = await Order.findByIdAndUpdate(request.params.id, { fulfillmentStatus: status, $push: { statusHistory: { status, note, changedBy: request.user!.id } } }, { new: true }); if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'); response.json({ success: true, data: order }); });
router.get('/products', async (_request, response) => response.json({ success: true, data: await Product.find({ deletedAt: { $exists: false } }).populate('brand category', 'name slug').sort('-updatedAt').lean() }));
router.post('/products', async (request, response) => {
  const input = z.object({ name: z.string().min(3).max(180), slug: z.string().min(3), brand: z.string(), category: z.string(), shortDescription: z.string().min(10).max(300), description: z.string().min(20), images: z.array(z.object({ url: z.url(), alt: z.string().min(2), order: z.number().int().default(0) })).min(1), variants: z.array(z.object({ name: z.string(), sku: z.string().min(3), priceCents: z.number().int().min(0), compareAtCents: z.number().int().min(0).optional(), stock: z.number().int().min(0), lowStockThreshold: z.number().int().min(0).default(5), isActive: z.boolean().default(true) })).min(1), tags: z.array(z.string()).default([]), ingredients: z.array(z.string()).default([]), benefits: z.array(z.string()).default([]), usage: z.string().default('Use as directed.'), status: z.enum(['draft', 'active']).default('draft') }).parse(request.body);
  const product = await Product.create(input);
  await AuditLog.create({ actor: request.user!.id, action: 'product.create', entityType: 'Product', entityId: String(product._id), ip: request.ip });
  response.status(201).json({ success: true, data: product });
});
router.patch('/products/:id', async (request, response) => { const allowed = z.object({ name: z.string().min(3).max(180).optional(), brand: z.string().optional(), category: z.string().optional(), shortDescription: z.string().min(10).max(300).optional(), description: z.string().min(20).optional(), images: z.array(z.object({ url: z.url(), alt: z.string().min(2), order: z.number().int().default(0) })).min(1).optional(), tags: z.array(z.string()).optional(), ingredients: z.array(z.string()).optional(), benefits: z.array(z.string()).optional(), usage: z.string().optional(), status: z.enum(['draft', 'active', 'archived']).optional(), isFeatured: z.boolean().optional(), variants: z.array(z.object({ _id: z.string().optional(), name: z.string(), sku: z.string(), priceCents: z.number().int().min(0), compareAtCents: z.number().int().min(0).optional(), stock: z.number().int().min(0), lowStockThreshold: z.number().int().min(0).default(5), isActive: z.boolean().default(true) })).min(1).optional() }).parse(request.body); const product = await Product.findByIdAndUpdate(request.params.id, allowed, { new: true, runValidators: true }); if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND'); await AuditLog.create({ actor: request.user!.id, action: 'product.update', entityType: 'Product', entityId: request.params.id, ip: request.ip }); response.json({ success: true, data: product }); });
router.delete('/products/:id', async (request, response) => { await Product.findByIdAndUpdate(request.params.id, { status: 'archived', deletedAt: new Date() }); await AuditLog.create({ actor: request.user!.id, action: 'product.archive', entityType: 'Product', entityId: request.params.id, ip: request.ip }); response.status(204).send(); });
router.get('/resources/:resource', async (request, response) => {
  const resource = z.enum(['customers', 'categories', 'brands', 'inventory', 'reviews', 'coupons', 'payments', 'banners', 'settings', 'audit', 'support']).parse(request.params.resource);
  const queries: Record<typeof resource, () => Promise<unknown>> = {
    customers: () => User.find({ role: 'customer' }).select('firstName lastName email isActive createdAt').sort('-createdAt').lean(),
    categories: () => Category.find().sort('name').lean(), brands: () => Brand.find().sort('name').lean(),
    inventory: () => Product.aggregate([{ $unwind: '$variants' }, { $project: { product: '$name', variant: '$variants.name', sku: '$variants.sku', stock: '$variants.stock', threshold: '$variants.lowStockThreshold' } }, { $sort: { stock: 1 } }]),
    reviews: () => Review.find().populate('user product', 'firstName lastName name').sort('-createdAt').lean(), coupons: () => Coupon.find().sort('-createdAt').lean(),
    payments: () => Order.find({ paymobIntentionId: { $exists: true } }).select('orderNumber user totals paymentStatus paymobIntentionId paymobOrderId paymobTransactionId createdAt').populate('user', 'email').sort('-createdAt').lean(),
    banners: () => Banner.find().sort('order').lean(), settings: () => SiteSetting.find().sort('key').lean(),
    audit: () => AuditLog.find().populate('actor', 'firstName lastName email').sort('-createdAt').limit(200).lean(), support: () => SupportTicket.find().sort('-createdAt').lean()
  };
  response.json({ success: true, data: await queries[resource]() });
});
export default router;