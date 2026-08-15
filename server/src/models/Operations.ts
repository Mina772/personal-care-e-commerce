import { Schema, model } from 'mongoose';

const supportTicketSchema = new Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  message: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const subscriberSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const bannerSchema = new Schema({
  title: { type: String, required: true },
  subtitle: String,
  image: { type: String, required: true },
  href: { type: String, required: true },
  placement: { type: String, enum: ['home_hero', 'home_promo', 'category'], default: 'home_promo', index: true },
  startsAt: Date,
  endsAt: Date,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const siteSettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: String,
  metadata: Schema.Types.Mixed,
  ip: String
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });

export const SupportTicket = model('SupportTicket', supportTicketSchema);
export const Subscriber = model('Subscriber', subscriberSchema);
export const Banner = model('Banner', bannerSchema);
export const SiteSetting = model('SiteSetting', siteSettingSchema);
export const AuditLog = model('AuditLog', auditLogSchema);