import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';

describe('cart integration', () => {
  let database: MongoMemoryServer;
  const agent = request.agent(createApp());
  let productId = '';
  let variantId = '';

  beforeAll(async () => {
    database = await MongoMemoryServer.create({ instance: { dbName: 'wellora-cart-test' } });
    await mongoose.connect(database.getUri());
    const passwordHash = await (User as any).hashPassword('Integration123!');
    await User.create({ firstName: 'Cart', lastName: 'Tester', email: 'cart@test.local', passwordHash });
    const product = await Product.create({ name: 'Integration Cleanser', slug: 'integration-cleanser', brand: new Types.ObjectId(), category: new Types.ObjectId(), shortDescription: 'A product used to verify cart behavior.', description: 'A complete product description used only by the isolated integration test.', images: [{ url: 'https://images.unsplash.com/test', alt: 'Integration cleanser', order: 0 }], variants: [{ name: 'Standard', sku: 'INT-CART-001', priceCents: 2500, stock: 3, lowStockThreshold: 1, isActive: true }], status: 'active' });
    productId = String(product._id); variantId = String(product.variants[0]!._id);
    await Coupon.create({ code: 'TEST10', type: 'percentage', value: 10, minimumCents: 1000, startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60_000), isActive: true });
    await agent.post('/api/v1/auth/login').send({ email: 'cart@test.local', password: 'Integration123!' }).expect(200);
  }, 30_000);

  afterAll(async () => { await mongoose.disconnect(); await database.stop(); });

  it('persists mapped product ids and calculates coupon totals', async () => {
    const added = await agent.post('/api/v1/cart/items').send({ productId, variantId, quantity: 2 }).expect(201);
    expect(added.body.data.items[0]).toMatchObject({ productId, variantId, quantity: 2, unitPriceCents: 2500 });
    const discounted = await agent.post('/api/v1/cart/coupon').send({ code: 'TEST10' }).expect(200);
    expect(discounted.body.data.totals).toMatchObject({ subtotalCents: 5000, discountCents: 500 });
  });

  it('rejects an aggregate quantity above stock', async () => {
    const response = await agent.post('/api/v1/cart/items').send({ productId, variantId, quantity: 2 }).expect(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('restores reserved inventory when Paymob is not configured', async () => {
    const address = { recipient: 'Cart Tester', line1: '12 Test Street', line2: '', city: 'Cairo', region: 'Cairo', postalCode: '11511', country: 'EG', phone: '01010101010' };
    const response = await agent.post('/api/v1/checkout/create-session').send({ shippingAddress: address, billingAddress: address }).expect(503);
    expect(response.body.error.code).toBe('PAYMOB_NOT_CONFIGURED');
    const product = await Product.findById(productId).lean();
    expect(product?.variants[0]?.stock).toBe(3);
    const order = await Order.findOne({ user: (await User.findOne({ email: 'cart@test.local' }))?._id }).sort('-createdAt').lean();
    expect(order).toMatchObject({ paymentStatus: 'failed', fulfillmentStatus: 'cancelled', inventoryReserved: false });
  });
});