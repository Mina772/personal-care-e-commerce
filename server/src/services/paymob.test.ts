import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { calculatePaymobHmac, createPaymobIntention } from './paymob.js';

const callback = { obj: { amount_cents: 6541, created_at: '2026-08-15T08:00:00Z', currency: 'EGP', error_occured: false, has_parent_transaction: false, id: 9001, integration_id: 1234, is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false, order: { id: 7001 }, owner: 44, pending: false, source_data: { pan: '1111', sub_type: 'Visa', type: 'card' }, success: true } };
const originalEnv = { ...env };

afterEach(() => { Object.assign(env, originalEnv); vi.unstubAllGlobals(); });

describe('Paymob HMAC', () => {
  it('is deterministic for the documented transaction field order', () => expect(calculatePaymobHmac(callback, 'test-hmac-secret')).toBe('589ab077b6f0f91009bf5fc5b23ad3b688435dbed9ec0bb075d2a402e810ce4fd8eed231868a59afd5c15969d0b24f66af26bfcc07ff31efe43f5492c9cd4415'));
  it('changes when a signed payment field is modified', () => expect(calculatePaymobHmac({ obj: { ...callback.obj, success: false } }, 'test-hmac-secret')).not.toBe(calculatePaymobHmac(callback, 'test-hmac-secret')));

  it('creates a hosted checkout intention with server-owned totals', async () => {
    Object.assign(env, { PAYMOB_SECRET_KEY: 'egy_sk_test_example', PAYMOB_PUBLIC_KEY: 'egy_pk_test_example', PAYMOB_HMAC_SECRET: 'hmac', PAYMOB_INTEGRATION_IDS: '1234, 5678', PAYMOB_CURRENCY: 'EGP', PAYMOB_BASE_URL: 'https://accept.paymob.com', PAYMOB_CHECKOUT_URL: 'https://eg.checkout.paymob.com', SERVER_URL: 'https://api.wellora.test' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'pi_test_example', intention_order_id: 778899, client_secret: 'egy_csk_test_example', status: 'intended' }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await createPaymobIntention({ amountCents: 6541, orderNumber: 'WEL-TEST-1', billingData: { first_name: 'Jordan', last_name: 'Lee', email: 'customer@wellora.test', phone_number: '01010101010', street: '12 Test Street', city: 'Cairo', state: 'Cairo', country: 'EG', postal_code: '11511' }, items: [{ name: 'Wellora order WEL-TEST-1', amount: 6541, quantity: 1 }], returnUrl: 'https://wellora.test/account/orders/1' });
    expect(result).toEqual({ intentionId: 'pi_test_example', paymobOrderId: '778899', checkoutUrl: 'https://eg.checkout.paymob.com/?publicKey=egy_pk_test_example&clientSecret=egy_csk_test_example' });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://accept.paymob.com/v1/intention/');
    expect(options.headers.Authorization).toBe('Token egy_sk_test_example');
    expect(JSON.parse(options.body)).toMatchObject({ amount: 6541, currency: 'EGP', payment_methods: [1234, 5678], special_reference: 'WEL-TEST-1', notification_url: 'https://api.wellora.test/api/v1/payments/paymob/callback' });
  });
});