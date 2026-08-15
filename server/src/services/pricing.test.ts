import { describe, expect, it } from 'vitest';
import { calculateTotals, type PricedLine } from './pricing.js';

const line = (price: number, quantity: number): PricedLine => ({ productId: 'p', variantId: 'v', name: 'Item', variantName: 'Standard', sku: 'SKU', image: '', unitPriceCents: price, quantity, categoryId: 'c' });
describe('calculateTotals', () => {
  it('uses integer cents for subtotal, shipping, and tax', () => expect(calculateTotals([line(1999, 2)], null)).toEqual({ subtotalCents: 3998, discountCents: 0, shippingCents: 695, taxCents: 330, grandTotalCents: 5023 }));
  it('caps percentage discounts and applies free shipping threshold', () => expect(calculateTotals([line(5000, 2)], { type: 'percentage', value: 30, minimumCents: 4000, maximumDiscountCents: 2000 })).toEqual({ subtotalCents: 10000, discountCents: 2000, shippingCents: 0, taxCents: 660, grandTotalCents: 8660 }));
  it('does not apply a coupon below its minimum', () => expect(calculateTotals([line(2000, 1)], { type: 'fixed', value: 500, minimumCents: 4000 }).discountCents).toBe(0));
  it('never discounts below zero', () => expect(calculateTotals([line(1000, 1)], { type: 'fixed', value: 5000, minimumCents: 0 }).grandTotalCents).toBe(0));
});