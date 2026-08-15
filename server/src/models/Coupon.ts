import { Schema, model } from 'mongoose';

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 1 },
  minimumCents: { type: Number, min: 0, default: 0 },
  maximumDiscountCents: { type: Number, min: 0 },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true },
  usageLimit: { type: Number, min: 1 },
  usedCount: { type: Number, min: 0, default: 0 },
  perUserLimit: { type: Number, min: 1, default: 1 },
  eligibleProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  eligibleCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Coupon = model('Coupon', couponSchema);