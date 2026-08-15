import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

type BillingData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  apartment?: string;
  building?: string;
  floor?: string;
};

type IntentionItem = { name: string; amount: number; description?: string; quantity: number };

type IntentionResponse = {
  id: string;
  intention_order_id: number;
  client_secret: string;
  status: string;
};

const integrationIds = () => env.PAYMOB_INTEGRATION_IDS.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0);

export const assertPaymobConfigured = () => {
  if (!env.PAYMOB_SECRET_KEY || !env.PAYMOB_PUBLIC_KEY || !env.PAYMOB_HMAC_SECRET || !integrationIds().length) {
    throw new AppError(503, 'Paymob payments are not configured for this environment', 'PAYMOB_NOT_CONFIGURED');
  }
};

export const createPaymobIntention = async (input: { amountCents: number; orderNumber: string; billingData: BillingData; items: IntentionItem[]; returnUrl: string }) => {
  assertPaymobConfigured();
  const response = await fetch(`${env.PAYMOB_BASE_URL.replace(/\/$/, '')}/v1/intention/`, {
    method: 'POST',
    headers: { Authorization: `Token ${env.PAYMOB_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: env.PAYMOB_CURRENCY,
      payment_methods: integrationIds(),
      items: input.items,
      billing_data: input.billingData,
      special_reference: input.orderNumber,
      expiration: 3600,
      notification_url: `${env.SERVER_URL.replace(/\/$/, '')}/api/v1/payments/paymob/callback`,
      redirection_url: input.returnUrl
    })
  });

  if (!response.ok) {
    console.error('Paymob intention creation failed', { status: response.status });
    throw new AppError(502, 'Paymob rejected the payment request. Check credentials and integration IDs.', 'PAYMOB_REQUEST_FAILED');
  }

  const intention = await response.json() as IntentionResponse;
  if (!intention.id || !intention.intention_order_id || !intention.client_secret) throw new AppError(502, 'Paymob returned an incomplete payment intention', 'PAYMOB_INVALID_RESPONSE');
  const checkoutUrl = `${env.PAYMOB_CHECKOUT_URL.replace(/\/$/, '')}/?publicKey=${encodeURIComponent(env.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(intention.client_secret)}`;
  return { intentionId: intention.id, paymobOrderId: String(intention.intention_order_id), checkoutUrl };
};

const callbackValues = (payload: Record<string, any>) => {
  const object = payload.obj ?? payload;
  return [object.amount_cents, object.created_at, object.currency, object.error_occured, object.has_parent_transaction, object.id, object.integration_id, object.is_3d_secure, object.is_auth, object.is_capture, object.is_refunded, object.is_standalone_payment, object.is_voided, object.order?.id ?? object.order_id, object.owner, object.pending, object.source_data?.pan, object.source_data?.sub_type, object.source_data?.type, object.success].map((value) => String(value ?? '')).join('');
};

export const calculatePaymobHmac = (payload: Record<string, any>, secret = env.PAYMOB_HMAC_SECRET) => crypto.createHmac('sha512', secret).update(callbackValues(payload)).digest('hex');

export const verifyPaymobHmac = (payload: Record<string, any>, suppliedHmac: string) => {
  if (!env.PAYMOB_HMAC_SECRET || !suppliedHmac) return false;
  const expected = calculatePaymobHmac(payload);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const suppliedBuffer = Buffer.from(suppliedHmac, 'utf8');
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
};