import bcrypt from 'bcryptjs';
import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  label: { type: String, trim: true, default: 'Home' },
  recipient: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, uppercase: true, default: 'US' },
  phone: { type: String, trim: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 60 },
  lastName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'support', 'manager', 'admin'], default: 'customer', index: true },
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  addresses: [addressSchema],
  passwordResetHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  emailVerifiedAt: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { transform: (_doc, value) => {
  const safeValue = value as Record<string, unknown>;
  delete safeValue.passwordHash;
  delete safeValue.passwordResetHash;
  return safeValue;
} } });

userSchema.statics.hashPassword = (password: string) => bcrypt.hash(password, 12);
userSchema.methods.verifyPassword = function (password: string) { return bcrypt.compare(password, this.passwordHash); };

export const User = model('User', userSchema);