import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import slugify from 'slugify';
import { env } from '../config/env.js';
import { Brand, Category } from '../models/Catalog.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { AuditLog, Banner, SiteSetting, Subscriber, SupportTicket } from '../models/Operations.js';
import { PaymentEvent } from '../models/PaymentEvent.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';

const categories = [
  ['Skincare', 'Daily cleansers, moisturizers, serums, and sun care.', 'photo-1556228720-195a672e8a03'],
  ['Hair Care', 'Cleansing, conditioning, styling, and scalp essentials.', 'photo-1522338242992-e1a54906a8da'],
  ['Bath & Body', 'Body washes, lotions, and restorative bath care.', 'photo-1608248543803-ba4f8c70ae0b'],
  ['Oral Care', 'Thoughtful everyday care for teeth and gums.', 'photo-1607613009820-a29f7bb81c04'],
  ['Beauty Tools', 'Reliable tools for polished daily routines.', 'photo-1596462502278-27bfdc403348'],
  ['Grooming', 'Shaving, beard, and body grooming essentials.', 'photo-1621607512214-68297480165e'],
  ['Fragrance', 'Modern personal fragrance for every mood.', 'photo-1541643600914-78b084683601'],
  ['Wellness', 'Comfort-first accessories for rest and renewal.', 'photo-1540555700478-4be289fbecef'],
  ['Baby Care', 'Gentle, practical care for little ones.', 'photo-1595433707802-6b2626ef1c91'],
  ["Men's Care", 'Effective daily face, hair, and body care.', 'photo-1620916566398-39f1143ab7be']
] as const;

const brands = [
  ['Aster & Vale', 'Botanical formulas shaped by modern skin science.'],
  ['Common Ritual', 'Dependable essentials for considered daily care.'],
  ['Morrow Lab', 'Focused formulas with transparent ingredients.'],
  ['Field Theory', 'Plant-forward personal care with a light footprint.'],
  ['North Standard', 'Straightforward grooming made exceptionally well.'],
  ['Lumen House', 'Color, fragrance, and tools for expressive routines.']
] as const;

const products = [
  ['Cloudmilk Barrier Cleanser', 'Skincare', 'Aster & Vale', 2400, 'A creamy low-foam cleanser that lifts sunscreen and daily buildup without a tight after-feel.', ['Glycerin', 'Oat kernel extract', 'Squalane'], ['Supports the moisture barrier', 'Fragrance-free', 'Comfortable daily cleanse']],
  ['Dewpoint Hydration Serum', 'Skincare', 'Morrow Lab', 3200, 'A cushiony hydration serum with multi-weight humectants for soft, comfortable skin.', ['Hyaluronic acid', 'Panthenol', 'Beta-glucan'], ['Layer-friendly texture', 'Immediate hydration', 'Suitable for sensitive skin']],
  ['Daymark Mineral SPF 40', 'Skincare', 'Common Ritual', 2800, 'A sheer mineral daily sunscreen with a natural finish and no added fragrance.', ['Zinc oxide', 'Bisabolol', 'Vitamin E'], ['Broad spectrum SPF 40', 'No white cast on many skin tones', 'Water resistant 40 minutes']],
  ['Night Garden Renewal Cream', 'Skincare', 'Aster & Vale', 3900, 'A rich evening moisturizer formulated to soften the look of dry, tired skin.', ['Ceramides', 'Bakuchiol', 'Jojoba oil'], ['Deep overnight moisture', 'Softens texture', 'Non-retinoid formula']],
  ['Soft Current Gel Cleanser', 'Skincare', 'Field Theory', 2100, 'A fresh gel cleanser for combination skin with a balanced, non-stripping finish.', ['Aloe', 'Green tea', 'Allantoin'], ['Removes excess oil', 'Calms visible redness', 'Soap-free']],
  ['Rootkind Scalp Shampoo', 'Hair Care', 'Field Theory', 2600, 'A sulfate-free shampoo that cleanses the scalp while keeping lengths soft.', ['Rosemary leaf', 'Niacinamide', 'Amino acids'], ['Balanced scalp cleanse', 'Color-safe', 'Fresh herbal scent']],
  ['Silk Route Daily Conditioner', 'Hair Care', 'Common Ritual', 2500, 'A lightweight conditioner that smooths tangles without flattening fine hair.', ['Rice protein', 'Shea esters', 'Aloe'], ['Easy detangling', 'Soft shine', 'Silicone-free']],
  ['After Rain Curl Cream', 'Hair Care', 'Aster & Vale', 2900, 'A flexible styling cream that defines waves and curls with touchable hold.', ['Flax extract', 'Mango butter', 'Hydrolyzed quinoa'], ['Humidity support', 'Soft definition', 'No crunch']],
  ['Sunday Reset Hair Mask', 'Hair Care', 'Morrow Lab', 3600, 'A concentrated weekly mask for dry lengths and heat-styled hair.', ['Ceramides', 'Argan oil', 'Peptides'], ['Improves manageability', 'Reduces breakage from brushing', 'Five-minute treatment']],
  ['Meadowfoam Body Wash', 'Bath & Body', 'Field Theory', 1800, 'A soft-lather body cleanser with a clean botanical aroma.', ['Meadowfoam oil', 'Aloe', 'Glycerin'], ['Gentle daily cleanse', 'Biodegradable surfactants', 'Refill-ready bottle']],
  ['Quiet Skin Body Lotion', 'Bath & Body', 'Common Ritual', 2200, 'A fragrance-free lotion that absorbs quickly and relieves everyday dryness.', ['Colloidal oatmeal', 'Ceramides', 'Sunflower oil'], ['Fast absorbing', 'Fragrance-free', 'Suitable for the whole family']],
  ['Mineral Soak No. 02', 'Bath & Body', 'Lumen House', 2000, 'A restorative mineral bath soak scented with hinoki and eucalyptus.', ['Magnesium salts', 'Sea salt', 'Eucalyptus oil'], ['Aromatic bathing ritual', 'Single-scoop dosing', 'Resealable pouch']],
  ['Brightmint Toothpaste', 'Oral Care', 'Common Ritual', 1100, 'A fluoride toothpaste with a clean mint taste for twice-daily cavity protection.', ['Sodium fluoride', 'Hydrated silica', 'Xylitol'], ['Cavity protection', 'Freshens breath', 'SLS-free']],
  ['Softline Floss Set', 'Oral Care', 'Common Ritual', 900, 'Expanding woven floss designed for a comfortable, thorough clean.', ['Waxed woven fiber'], ['Gentle grip', 'Recyclable outer carton', 'Two-spool set']],
  ['Arc Sonic Toothbrush', 'Oral Care', 'Morrow Lab', 6900, 'A quiet sonic toothbrush with three modes, timer, and travel case.', ['BPA-free nylon bristles'], ['Three brushing modes', 'Two-minute timer', 'Six-week battery']],
  ['Contour Facial Roller', 'Beauty Tools', 'Lumen House', 2400, 'A stainless steel facial roller with a naturally cooling feel.', ['Stainless steel'], ['Easy to sanitize', 'Cooling massage', 'Weighted handle']],
  ['Precision Complexion Brush', 'Beauty Tools', 'Lumen House', 1900, 'A densely packed angled brush for seamless liquid and cream application.', ['Synthetic fibers', 'Aluminum ferrule'], ['Vegan fibers', 'No-streak finish', 'Easy-grip handle']],
  ['Everyday Lash Curler', 'Beauty Tools', 'Lumen House', 1600, 'A balanced lash curler with a rounded pad and two replacements.', ['Stainless steel', 'Silicone'], ['Wide opening', 'Two refill pads', 'Soft matte grip']],
  ['Close Study Shave Cream', 'Grooming', 'North Standard', 1800, 'A low-foam shave cream that cushions skin and rinses clean.', ['Aloe', 'Shea butter', 'Allantoin'], ['Visible glide', 'Non-drying', 'Subtle cedar scent']],
  ['Workshop Beard Oil', 'Grooming', 'North Standard', 2300, 'A quick-absorbing beard oil for softer facial hair and comfortable skin.', ['Jojoba oil', 'Squalane', 'Cedarwood'], ['Softens coarse hair', 'Low-shine finish', 'Dropper dosing']],
  ['Atlas Precision Trimmer', 'Grooming', 'North Standard', 7800, 'A waterproof cordless trimmer with five guards and detail blade.', ['Stainless steel blades'], ['Ninety-minute runtime', 'Waterproof body', 'USB-C charging']],
  ['Open Air Eau de Parfum', 'Fragrance', 'Lumen House', 7200, 'A bright woody fragrance with bergamot, fig leaf, and pale cedar.', ['Alcohol denat.', 'Fragrance', 'Water'], ['Long-wearing eau de parfum', 'Unisex composition', 'Recyclable glass bottle']],
  ['Velvet Hour Eau de Parfum', 'Fragrance', 'Lumen House', 7600, 'A warm floral fragrance of iris, black tea, and smooth amber.', ['Alcohol denat.', 'Fragrance', 'Water'], ['Warm floral profile', 'Fine mist atomizer', 'Gift-ready carton']],
  ['Restwell Weighted Eye Mask', 'Wellness', 'Common Ritual', 2800, 'A softly weighted eye mask with a washable cotton cover.', ['Glass microbeads', 'Cotton'], ['Light blocking', 'Removable washable cover', 'Adjustable strap']],
  ['Daily Ease Heat Wrap', 'Wellness', 'Field Theory', 4200, 'A microwavable flaxseed wrap for soothing warmth at home.', ['Linen', 'Flaxseed', 'Lavender'], ['Flexible shape', 'Reusable warmth', 'Removable cover']],
  ['Little Cloud Wash', 'Baby Care', 'Common Ritual', 1700, 'A fragrance-free hair and body wash made for delicate skin.', ['Glycerin', 'Oat extract', 'Aloe'], ['Tear-free formula', 'Fragrance-free', 'Pediatrician reviewed']],
  ['Nest Baby Balm', 'Baby Care', 'Aster & Vale', 1900, 'A rich multi-use balm for dry cheeks, knees, and elbows.', ['Sunflower oil', 'Beeswax', 'Calendula'], ['Water-free formula', 'Travel friendly', 'No added fragrance']],
  ['First Light Face Wash', "Men's Care", 'North Standard', 1900, 'A clear daily face wash that removes oil and sunscreen without over-cleansing.', ['Green tea', 'Aloe', 'Glycerin'], ['Balanced cleanse', 'Fresh rinse', 'Dermatologist tested']],
  ['All Hours Face Moisturizer', "Men's Care", 'North Standard', 2700, 'A lightweight moisturizer for face and beard area with a natural finish.', ['Niacinamide', 'Squalane', 'Ceramides'], ['No-shine hydration', 'Fragrance-free', 'Non-comedogenic']],
  ['Utility Deodorant', "Men's Care", 'North Standard', 1500, 'An aluminum-free deodorant with a clean vetiver scent.', ['Magnesium hydroxide', 'Arrowroot', 'Coconut oil'], ['Smooth application', 'Baking soda-free', 'Recyclable tube']]
] as const;

const imageIds = ['photo-1556228578-8c89e6adf883', 'photo-1571781926291-c477ebfd024b', 'photo-1620916566398-39f1143ab7be', 'photo-1608248597279-f99d160bfcbc', 'photo-1598440947619-2c35fc9aa908', 'photo-1522335789203-aabd1fc54bc9'];
const imageUrl = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export const seedDatabase = async ({ uri = env.MONGODB_URI, fresh = process.argv.includes('--fresh') }: { uri?: string; fresh?: boolean } = {}) => {
  await mongoose.connect(uri);
  if (fresh) await Promise.all([AuditLog.deleteMany({}), SupportTicket.deleteMany({}), Subscriber.deleteMany({}), Banner.deleteMany({}), SiteSetting.deleteMany({}), PaymentEvent.deleteMany({}), Review.deleteMany({}), Order.deleteMany({}), Cart.deleteMany({}), Coupon.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}), Brand.deleteMany({}), User.deleteMany({})]);
  const categoryDocs = new Map<string, any>();
  for (const [name, description, image] of categories) categoryDocs.set(name, await Category.findOneAndUpdate({ slug: slugify(name, { lower: true }) }, { name, slug: slugify(name, { lower: true }), description, image: imageUrl(image), seo: { title: `${name} | Wellora Market`, description } }, { upsert: true, new: true }));
  const brandDocs = new Map<string, any>();
  for (const [name, description] of brands) brandDocs.set(name, await Brand.findOneAndUpdate({ slug: slugify(name, { lower: true }) }, { name, slug: slugify(name, { lower: true }), description, isFeatured: true }, { upsert: true, new: true }));
  const productDocs = [];
  for (const [index, item] of products.entries()) {
    const [name, category, brand, priceCents, description, ingredients, benefits] = item;
    const slug = slugify(name, { lower: true, strict: true });
    const base = imageIds[index % imageIds.length]!;
    const product = await Product.findOneAndUpdate({ slug }, { name, slug, category: categoryDocs.get(category)._id, brand: brandDocs.get(brand)._id, shortDescription: description, description: `${description} Made for a simple, consistent routine with clear directions and thoughtfully selected materials. Individual results and preferences vary.`, ingredients, benefits, usage: 'Use as directed on the package. Discontinue use if irritation occurs. For external use only unless labeled otherwise.', images: [{ url: imageUrl(base), alt: `${name} product view`, order: 0 }, { url: imageUrl(base, 1200), alt: `${name} detail view`, order: 1 }], variants: [{ name: index % 4 === 0 ? 'Travel' : 'Standard', sku: `WEL-${String(index + 1).padStart(3, '0')}-STD`, priceCents, compareAtCents: index % 3 === 0 ? Math.round(priceCents * 1.2) : undefined, stock: 16 + index * 3 % 48, lowStockThreshold: 6, attributes: { size: index % 4 === 0 ? '50 ml' : 'Full size' }, isActive: true }], tags: [category.toLowerCase(), brand.toLowerCase(), index % 2 ? 'everyday essential' : 'best seller'], ratingAverage: 4.2 + (index % 7) / 10, ratingCount: 8 + index * 3, soldCount: 20 + index * 11, isFeatured: index < 8, isNewArrival: index >= 22, status: 'active', seo: { title: `${name} | Wellora Market`, description }, shipping: { weightGrams: 180 + index * 15, shipsFree: priceCents >= 7000 } }, { upsert: true, new: true, runValidators: true });
    productDocs.push(product);
  }
  const passwordHash = await (User as any).hashPassword('Wellora123!');
  const admin = await User.findOneAndUpdate({ email: 'admin@wellora.test' }, { firstName: 'Avery', lastName: 'Morgan', email: 'admin@wellora.test', passwordHash, role: 'admin', isActive: true, emailVerifiedAt: new Date() }, { upsert: true, new: true });
  const customer = await User.findOneAndUpdate({ email: 'customer@wellora.test' }, { firstName: 'Jordan', lastName: 'Lee', email: 'customer@wellora.test', passwordHash, role: 'customer', isActive: true, emailVerifiedAt: new Date(), addresses: [{ label: 'Home', recipient: 'Jordan Lee', line1: '184 Willow Street', city: 'Portland', region: 'OR', postalCode: '97205', country: 'US', isDefault: true }] }, { upsert: true, new: true });
  await Coupon.findOneAndUpdate({ code: 'WELCOME15' }, { code: 'WELCOME15', type: 'percentage', value: 15, minimumCents: 4000, maximumDiscountCents: 2500, startsAt: new Date('2025-01-01'), expiresAt: new Date('2030-12-31'), usageLimit: 5000, usedCount: 12, perUserLimit: 1, isActive: true }, { upsert: true });
  await Banner.findOneAndUpdate({ placement: 'home_hero' }, { title: 'Care that earns its place.', subtitle: 'Effective essentials and better-made basics.', image: imageUrl('photo-1612817288484-6f916006741a', 2000), href: '/shop', placement: 'home_hero', isActive: true, order: 0 }, { upsert: true });
  await Promise.all([
    SiteSetting.findOneAndUpdate({ key: 'store.name' }, { key: 'store.name', value: 'Wellora Market', isPublic: true }, { upsert: true }),
    SiteSetting.findOneAndUpdate({ key: 'shipping.freeThresholdCents' }, { key: 'shipping.freeThresholdCents', value: env.FREE_SHIPPING_THRESHOLD_CENTS, isPublic: true }, { upsert: true }),
    SiteSetting.findOneAndUpdate({ key: 'support.email' }, { key: 'support.email', value: 'care@wellora.test', isPublic: true }, { upsert: true })
  ]);
  for (const [index, product] of productDocs.slice(0, 12).entries()) await Review.findOneAndUpdate({ product: product._id, user: customer._id }, { product: product._id, user: customer._id, rating: 4 + index % 2, title: index % 2 ? 'Earned a place in my routine' : 'Thoughtfully made and easy to use', body: 'The texture and packaging both feel considered, and the directions were clear. I have been using it consistently and would purchase it again.', verifiedPurchase: true, status: 'approved' }, { upsert: true });
  const first = productDocs[0]!; const variant = first.variants[0]!;
  await Order.findOneAndUpdate({ orderNumber: 'WEL-SEED-1001' }, { orderNumber: 'WEL-SEED-1001', user: customer._id, items: [{ product: first._id, variantId: variant._id, name: first.name, variantName: variant.name, sku: variant.sku, image: first.images[0]!.url, unitPriceCents: variant.priceCents, quantity: 2, lineTotalCents: variant.priceCents * 2 }], shippingAddress: customer.addresses[0], billingAddress: customer.addresses[0], totals: { subtotalCents: variant.priceCents * 2, discountCents: 0, shippingCents: 695, taxCents: 396, grandTotalCents: variant.priceCents * 2 + 1091 }, paymentStatus: 'paid', fulfillmentStatus: 'delivered', inventoryReserved: true, paidAt: new Date('2026-07-18') }, { upsert: true });
  console.info(`Seed complete: ${categoryDocs.size} categories, ${brandDocs.size} brands, ${productDocs.length} products. Admin: ${admin.email}`);
  await mongoose.disconnect();
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) seedDatabase().catch((error) => { console.error(error); process.exit(1); });