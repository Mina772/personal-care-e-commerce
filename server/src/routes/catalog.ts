import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Brand, Category } from '../models/Catalog.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.get('/categories', async (_request, response) => response.json({ success: true, data: await Category.find({ isActive: true }).sort('name').lean() }));
router.get('/brands', async (_request, response) => response.json({ success: true, data: await Brand.find({ isActive: true }).sort('name').lean() }));

router.get('/products', async (request, response) => {
  const query = z.object({ q: z.string().max(100).optional(), category: z.string().optional(), brand: z.string().optional(), minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(), rating: z.coerce.number().min(0).max(5).optional(), inStock: z.enum(['true', 'false']).optional(), featured: z.enum(['true', 'false']).optional(), sort: z.enum(['relevance', 'price-asc', 'price-desc', 'rating', 'newest', 'popular']).default('relevance'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(48).default(12) }).parse(request.query);
  const filter: Record<string, unknown> = { status: 'active', deletedAt: { $exists: false } };
  if (query.q) filter.$text = { $search: query.q };
  if (query.category) { const category = await Category.findOne({ slug: query.category }).lean(); if (category) filter.category = category._id; }
  if (query.brand) { const brand = await Brand.findOne({ slug: query.brand }).lean(); if (brand) filter.brand = brand._id; }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) filter.variants = { $elemMatch: { priceCents: { ...(query.minPrice !== undefined && { $gte: Math.round(query.minPrice * 100) }), ...(query.maxPrice !== undefined && { $lte: Math.round(query.maxPrice * 100) }) }, isActive: true } };
  if (query.rating !== undefined) filter.ratingAverage = { $gte: query.rating };
  if (query.inStock === 'true') filter['variants.stock'] = { $gt: 0 };
  if (query.featured === 'true') filter.isFeatured = true;
  const sorts: Record<string, Record<string, 1 | -1 | { $meta: 'textScore' }>> = { relevance: query.q ? { score: { $meta: 'textScore' } } : { isFeatured: -1, soldCount: -1 }, 'price-asc': { 'variants.0.priceCents': 1 }, 'price-desc': { 'variants.0.priceCents': -1 }, rating: { ratingAverage: -1, ratingCount: -1 }, newest: { createdAt: -1 }, popular: { soldCount: -1 } };
  const [items, total] = await Promise.all([Product.find(filter).populate('brand category', 'name slug').sort(sorts[query.sort] as any).skip((query.page - 1) * query.limit).limit(query.limit).lean(), Product.countDocuments(filter)]);
  response.json({ success: true, data: { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } } });
});

router.get('/products/:slug', async (request, response) => {
  const product = await Product.findOne({ slug: request.params.slug, status: 'active', deletedAt: { $exists: false } }).populate('brand category', 'name slug description').lean();
  if (!product) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  const reviews = await Review.find({ product: product._id, status: 'approved' }).populate('user', 'firstName lastName').sort('-createdAt').limit(20).lean();
  const related = await Product.find({ _id: { $ne: product._id }, category: (product.category as any)._id, status: 'active' }).populate('brand', 'name slug').limit(4).lean();
  response.json({ success: true, data: { product, reviews, related } });
});

router.get('/products/:id/reviews', async (request, response) => {
  if (!isValidObjectId(request.params.id)) throw new AppError(400, 'Invalid product id', 'INVALID_ID');
  response.json({ success: true, data: await Review.find({ product: request.params.id, status: 'approved' }).populate('user', 'firstName lastName').sort('-createdAt').lean() });
});

export default router;