import { Schema, model } from 'mongoose';

const imageSchema = new Schema({ url: { type: String, required: true }, alt: { type: String, required: true }, order: { type: Number, default: 0 } }, { _id: false });
const variantSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  priceCents: { type: Number, required: true, min: 0 },
  compareAtCents: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  attributes: { type: Map, of: String },
  isActive: { type: Boolean, default: true }
});

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  shortDescription: { type: String, required: true, maxlength: 300 },
  description: { type: String, required: true },
  ingredients: [String],
  benefits: [String],
  usage: String,
  images: { type: [imageSchema], validate: [(value: unknown[]) => value.length > 0, 'At least one image is required'] },
  variants: { type: [variantSchema], validate: [(value: unknown[]) => value.length > 0, 'At least one variant is required'] },
  tags: [{ type: String, lowercase: true, trim: true }],
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, min: 0, default: 0 },
  soldCount: { type: Number, min: 0, default: 0 },
  isFeatured: { type: Boolean, default: false, index: true },
  isNewArrival: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', index: true },
  seo: { title: String, description: String },
  shipping: { weightGrams: Number, shipsFree: { type: Boolean, default: false } },
  deletedAt: Date
}, { timestamps: true });

productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text' }, { weights: { name: 10, tags: 5, shortDescription: 2 } });
productSchema.index({ status: 1, category: 1, brand: 1, ratingAverage: -1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true });

export const Product = model('Product', productSchema);