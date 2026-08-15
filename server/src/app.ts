import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/paymob-payments.js';
import contentRoutes from './routes/content.js';
import { errorHandler, notFound } from './middleware/errors.js';

export const createApp = () => {
  const app = express();
  const sanitizeKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sanitizeKeys);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('$') && !key.includes('.')).map(([key, entry]) => [key, sanitizeKeys(entry)]));
    return value;
  };
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use((request, _response, next) => { if (request.body) request.body = sanitizeKeys(request.body); next(); });
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.get('/api/v1/health', (_request, response) => response.json({ success: true, data: { status: 'healthy' } }));
  app.get('/sitemap.xml', async (_request, response) => {
    const { Product } = await import('./models/Product.js');
    const products = await Product.find({ status: 'active', deletedAt: { $exists: false } }).select('slug updatedAt').lean();
    const urls = ['', '/shop', ...products.map((product) => `/products/${product.slug}`)];
    response.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${env.CLIENT_URL}${path}</loc></url>`).join('')}</urlset>`);
  });
  app.get('/robots.txt', (_request, response) => response.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /account/\nDisallow: /admin/\nDisallow: /checkout\nSitemap: ${env.CLIENT_URL.replace(/\/$/, '')}/sitemap.xml\n`));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', contentRoutes);
  app.use('/api/v1', catalogRoutes);
  app.use('/api/v1', cartRoutes);
  app.use('/api/v1', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/admin', adminRoutes);
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  app.use(express.static(clientDist));
  app.use((request, response, next) => {
    if (request.method === 'GET' && !request.path.startsWith('/api/')) {
      response.sendFile(path.join(clientDist, 'index.html'));
      return;
    }
    next();
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
};