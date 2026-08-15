import { Schema, model } from 'mongoose';

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    addedAt: { type: Date, default: Date.now }
  }],
  couponCode: { type: String, uppercase: true, trim: true }
}, { timestamps: true });

export const Cart = model('Cart', cartSchema);