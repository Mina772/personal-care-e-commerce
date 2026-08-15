import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/wellora'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PAYMOB_SECRET_KEY: z.string().default(''),
  PAYMOB_PUBLIC_KEY: z.string().default(''),
  PAYMOB_HMAC_SECRET: z.string().default(''),
  PAYMOB_INTEGRATION_IDS: z.string().default(''),
  PAYMOB_CURRENCY: z.string().length(3).default('EGP'),
  PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com'),
  PAYMOB_CHECKOUT_URL: z.string().url().default('https://eg.checkout.paymob.com'),
  SERVER_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  TAX_RATE_BPS: z.coerce.number().int().min(0).default(825),
  FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().min(0).default(7500)
});

export const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'development-only-secret-change-me-now') {
  throw new Error('JWT_SECRET must be explicitly configured in production');
}