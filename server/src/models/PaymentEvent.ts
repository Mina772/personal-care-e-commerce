import { Schema, model } from 'mongoose';

const paymentEventSchema = new Schema({
  providerEventId: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
  order: { type: Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

export const PaymentEvent = model('PaymentEvent', paymentEventSchema);