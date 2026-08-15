import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { calculateTotals, type PricedLine } from './pricing.js';

export const resolveCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId }).lean();
  const productIds = cart?.items.map((item) => item.product) ?? [];
  const products = await Product.find({ _id: { $in: productIds }, status: 'active', deletedAt: { $exists: false } }).populate('brand', 'name').lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const lines: PricedLine[] = [];
  for (const item of cart?.items ?? []) {
    const product = productMap.get(String(item.product));
    const variant = product?.variants.find((entry) => String(entry._id) === String(item.variantId) && entry.isActive);
    if (!product || !variant) continue;
    if (item.quantity > variant.stock) throw new AppError(409, `Only ${variant.stock} units of ${product.name} are available`, 'INSUFFICIENT_STOCK');
    lines.push({ productId: String(product._id), variantId: String(variant._id), name: product.name, variantName: variant.name, sku: variant.sku, image: product.images[0]?.url ?? '', unitPriceCents: variant.priceCents, quantity: item.quantity, categoryId: String(product.category) });
  }
  let coupon = null;
  if (cart?.couponCode) coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true, startsAt: { $lte: new Date() }, expiresAt: { $gte: new Date() } }).lean();
  const couponInput = coupon ? { type: coupon.type as 'percentage' | 'fixed', value: coupon.value, minimumCents: coupon.minimumCents, maximumDiscountCents: coupon.maximumDiscountCents ?? undefined } : null;
  return { cart, items: lines, coupon, totals: calculateTotals(lines, couponInput) };
};