import { Router } from 'express';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';
import { PaymentEvent } from '../models/PaymentEvent.js';
import { finalizePaymobOrder, releaseFailedPaymobOrder } from '../services/order-payments.js';
import { verifyPaymobHmac } from '../services/paymob.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.post('/paymob/callback', async (request, response) => {
  if (!env.PAYMOB_HMAC_SECRET) throw new AppError(503, 'Paymob callback is not configured', 'WEBHOOK_NOT_CONFIGURED');
  const payload = request.body as Record<string, any>;
  const suppliedHmac = String(request.query.hmac ?? payload.hmac ?? '');
  if (!verifyPaymobHmac(payload, suppliedHmac)) throw new AppError(400, 'Paymob HMAC verification failed', 'INVALID_SIGNATURE');
  const transaction = payload.obj ?? payload;
  if (!transaction.id || !(transaction.order?.id ?? transaction.order_id)) throw new AppError(422, 'Invalid Paymob transaction callback', 'INVALID_CALLBACK');
  const paymobOrderId = String(transaction.order?.id ?? transaction.order_id);
  const transactionId = String(transaction.id);
  const providerEventId = `paymob:${transactionId}:${Boolean(transaction.success)}:${Boolean(transaction.is_refunded)}:${Boolean(transaction.is_voided)}:${Boolean(transaction.is_capture)}`;
  if (await PaymentEvent.exists({ providerEventId })) return response.json({ received: true, duplicate: true });
  if (transaction.is_refunded) await Order.updateOne({ paymobOrderId }, { paymentStatus: 'refunded', fulfillmentStatus: 'refunded', paymobTransactionId: transactionId });
  else if (transaction.is_voided) await Order.updateOne({ paymobOrderId }, { paymentStatus: 'failed', fulfillmentStatus: 'cancelled', paymobTransactionId: transactionId });
  else if (transaction.success && !transaction.pending) await finalizePaymobOrder(paymobOrderId, transactionId);
  else if (!transaction.pending) await releaseFailedPaymobOrder(paymobOrderId, transactionId);
  const order = await Order.findOne({ paymobOrderId }).select('_id').lean();
  await PaymentEvent.create({ providerEventId, type: transaction.success ? 'payment.succeeded' : 'payment.failed', order: order?._id });
  response.json({ received: true });
});
export default router;