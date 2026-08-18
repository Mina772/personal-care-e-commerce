import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('HTTP application', () => {
  const app = createApp();
  it('reports health without exposing internals', async () => { const response = await request(app).get('/api/v1/health'); expect(response.status).toBe(200); expect(response.body).toEqual({ success: true, data: { status: 'healthy' } }); expect(response.headers['x-powered-by']).toBeUndefined(); expect(response.headers['content-security-policy']).toContain('https://images.unsplash.com'); });
  it('rejects unauthenticated admin access', async () => { const response = await request(app).get('/api/v1/admin/dashboard'); expect(response.status).toBe(401); expect(response.body.error.code).toBe('AUTH_REQUIRED'); });
  it('expires the authentication cookie on logout', async () => { const response = await request(app).post('/api/v1/auth/logout'); expect(response.status).toBe(204); expect(response.headers['set-cookie']?.[0]).toContain('accessToken=;'); expect(response.headers['set-cookie']?.[0]).toContain('Path=/'); });
  it('uses a consistent missing-route response', async () => { const response = await request(app).get('/api/v1/missing'); expect(response.status).toBe(404); expect(response.body.error.code).toBe('NOT_FOUND'); });
  it('rejects unsigned Paymob callbacks', async () => { const response = await request(app).post('/api/v1/payments/paymob/callback').send({ obj: {} }); expect([400, 503]).toContain(response.status); });
  it('rejects malformed newsletter addresses', async () => { const response = await request(app).post('/api/v1/newsletter').send({ email: 'not-an-email' }); expect(response.status).toBe(422); expect(response.body.error.code).toBe('VALIDATION_ERROR'); });
  it('rejects underspecified support tickets', async () => { const response = await request(app).post('/api/v1/support').send({ name: 'A', email: 'bad', message: 'short' }); expect(response.status).toBe(422); expect(response.body.error.code).toBe('VALIDATION_ERROR'); });
});