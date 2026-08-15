import { env } from '../config/env.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { resolveCart } from './cart.js';
import { createPaymobIntention } from './paymob.js';

export const createCheckout = async (userId: string, input: { shippingAddress: Record<string, string>; billingAddress: Record<string, string> }) => {
  const resolved = await resolveCart(userId);
  if (!resolved.items.length) throw new AppError(422, 'Your cart is empty', 'EMPTY_CART');
  const reserved: Array<{ productId: string; variantId: string; quantity: number }> = [];
  let createdOrderId: string | undefined;
  try {
    for (const item of resolved.items) {
      const result = await Product.updateOne({ _id: item.productId, variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity }, isActive: true } } }, { $inc: { 'variants.$.stock': -item.quantity } });
      if (!result.modifiedCount) throw new AppError(409, `${item.name} no longer has enough stock`, 'INSUFFICIENT_STOCK');
      reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
    }
    const orderNumber = `WEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const order = await Order.create({ orderNumber, user: userId, items: resolved.items.map((item) => ({ product: item.productId, variantId: item.variantId, name: item.name, variantName: item.variantName, sku: item.sku, image: item.image, unitPriceCents: item.unitPriceCents, quantity: item.quantity, lineTotalCents: item.unitPriceCents * item.quantity })), shippingAddress: input.shippingAddress, billingAddress: input.billingAddress, totals: resolved.totals, couponCode: resolved.coupon?.code, inventoryReserved: true });
    createdOrderId = String(order._id);
    const user = await User.findById(userId).select('firstName lastName email').lean();
    if (!user) throw new AppError(401, 'Customer account is unavailable', 'INVALID_SESSION');
    const recipientParts = String(input.billingAddress.recipient || `${user.firstName} ${user.lastName}`).trim().split(/\s+/);
    const firstName = recipientParts.shift() || String(user.firstName);
    const lastName = recipientParts.join(' ') || String(user.lastName);
    const intention = await createPaymobIntention({
      amountCents: resolved.totals.grandTotalCents,
      orderNumber,
      billingData: { first_name: firstName.slice(0, 50), last_name: lastName.slice(0, 50), email: String(user.email), phone_number: String(input.billingAddress.phone), street: String(input.billingAddress.line1), apartment: String(input.billingAddress.line2 || 'NA'), building: 'NA', floor: 'NA', city: String(input.billingAddress.city), state: String(input.billingAddress.region), country: String(input.billingAddress.country), postal_code: String(input.billingAddress.postalCode) },
      items: [{ name: `Wellora order ${orderNumber}`.slice(0, 50), amount: resolved.totals.grandTotalCents, description: `${resolved.items.reduce((sum, item) => sum + item.quantity, 0)} item(s), shipping, discounts, and tax`, quantity: 1 }],
      returnUrl: `${env.CLIENT_URL.replace(/\/$/, '')}/account/orders/${order._id}`
    });
    order.paymobIntentionId = intention.intentionId;
    order.paymobOrderId = intention.paymobOrderId;
    await order.save();
    return { orderId: order._id, orderNumber, checkoutUrl: intention.checkoutUrl, totals: resolved.totals };
  } catch (error) {
    await Promise.all(reserved.map((item) => Product.updateOne({ _id: item.productId, 'variants._id': item.variantId }, { $inc: { 'variants.$.stock': item.quantity } })));
    if (createdOrderId) await Order.updateOne({ _id: createdOrderId }, { paymentStatus: 'failed', fulfillmentStatus: 'cancelled', inventoryReserved: false, $push: { statusHistory: { status: 'payment_failed', note: 'Paymob rejected intention creation' } } });
    throw error;
  }
};

export const finalizePaymobOrder = async (paymobOrderId: string, transactionId: string) => {
  const order = await Order.findOneAndUpdate({ paymobOrderId, paymentStatus: { $ne: 'paid' } }, { $set: { paymobTransactionId: transactionId, paymentStatus: 'paid', fulfillmentStatus: 'processing', paidAt: new Date() }, $push: { statusHistory: { status: 'paid', note: 'Paymob payment confirmed' } } }, { new: true });
  if (!order) return;
  await Cart.deleteOne({ user: order.user });
  if (order.couponCode) await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  await Promise.all(order.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.quantity } })));
};

export const releaseFailedPaymobOrder = async (paymobOrderId: string, transactionId?: string) => {
  const order = await Order.findOneAndUpdate({ paymobOrderId, inventoryReserved: true, paymentStatus: { $ne: 'paid' } }, { $set: { ...(transactionId && { paymobTransactionId: transactionId }), paymentStatus: 'failed', fulfillmentStatus: 'cancelled', inventoryReserved: false }, $push: { statusHistory: { status: 'payment_failed', note: 'Paymob payment failed or was declined' } } }, { new: true });
  if (!order) return;
  await Promise.all(order.items.map((item) => Product.updateOne({ _id: item.product, 'variants._id': item.variantId }, { $inc: { 'variants.$.stock': item.quantity } })));
};