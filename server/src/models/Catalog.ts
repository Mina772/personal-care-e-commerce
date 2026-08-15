import { Schema, model } from 'mongoose';

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  image: String,
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  seo: { title: String, description: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const brandSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  logo: String,
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Category = model('Category', categorySchema);
export const Brand = model('Brand', brandSchema);