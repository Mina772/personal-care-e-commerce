import { Schema, model } from 'mongoose';

const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 100 },
  body: { type: String, required: true, maxlength: 2000 },
  verifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true }
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
export const Review = model('Review', reviewSchema);