import { Schema, model } from 'mongoose';

const addressSnapshot = new Schema({ recipient: String, line1: String, line2: String, city: String, region: String, postalCode: String, country: String, phone: String }, { _id: false });
const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, variantId: Schema.Types.ObjectId, name: String, variantName: String, sku: String, image: String, unitPriceCents: Number, quantity: Number, lineTotalCents: Number }],
  shippingAddress: { type: addressSnapshot, required: true },
  billingAddress: { type: addressSnapshot, required: true },
  totals: { subtotalCents: Number, discountCents: Number, shippingCents: Number, taxCents: Number, grandTotalCents: Number },
  couponCode: String,
  paymentStatus: { type: String, enum: ['pending', 'requires_action', 'paid', 'failed', 'refunded', 'partially_refunded'], default: 'pending', index: true },
  fulfillmentStatus: { type: String, enum: ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending', index: true },
  paymobIntentionId: { type: String, sparse: true, unique: true },
  paymobOrderId: { type: String, sparse: true, unique: true },
  paymobTransactionId: { type: String, sparse: true, unique: true },
  inventoryReserved: { type: Boolean, default: false },
  paidAt: Date,
  statusHistory: [{ status: String, note: String, changedAt: { type: Date, default: Date.now }, changedBy: { type: Schema.Types.ObjectId, ref: 'User' } }]
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
export const Order = model('Order', orderSchema);