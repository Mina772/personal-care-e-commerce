import { env } from '../config/env.js';

export type PricedLine = { productId: string; variantId: string; name: string; variantName: string; sku: string; image: string; unitPriceCents: number; quantity: number; categoryId: string };
export type CouponInput = { type: 'percentage' | 'fixed'; value: number; minimumCents: number; maximumDiscountCents?: number } | null;

export const calculateTotals = (items: PricedLine[], coupon: CouponInput) => {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  let discountCents = 0;
  if (coupon && subtotalCents >= coupon.minimumCents) {
    discountCents = coupon.type === 'percentage' ? Math.floor(subtotalCents * coupon.value / 100) : coupon.value;
    if (coupon.maximumDiscountCents) discountCents = Math.min(discountCents, coupon.maximumDiscountCents);
    discountCents = Math.min(discountCents, subtotalCents);
  }
  const discountedCents = subtotalCents - discountCents;
  const shippingCents = discountedCents >= env.FREE_SHIPPING_THRESHOLD_CENTS || discountedCents === 0 ? 0 : 695;
  const taxCents = Math.round(discountedCents * env.TAX_RATE_BPS / 10_000);
  return { subtotalCents, discountCents, shippingCents, taxCents, grandTotalCents: discountedCents + shippingCents + taxCents };
};