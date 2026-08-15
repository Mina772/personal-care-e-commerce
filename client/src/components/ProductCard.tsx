import { Heart, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAddWishlistMutation, useMeQuery } from '../app/api';
import { money } from '../app/format';
import type { Product } from '../app/types';

const fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="750"%3E%3Crect width="100%25" height="100%25" fill="%23e8e5dc"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23505b55" font-family="Georgia" font-size="24"%3EWellora%3C/text%3E%3C/svg%3E';
export const ProductImage = ({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) => <img className={className} src={src || fallback} alt={alt} loading="lazy" onError={(event) => { event.currentTarget.src = fallback; }} />;

export const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate(); const { data: user } = useMeQuery(); const [addWishlist] = useAddWishlistMutation();
  const variant = product.variants[0];
  const wish = async () => { if (!user) return navigate('/login?next=/wishlist'); await addWishlist(product._id); };
  return <article className="product-card">
    <div className="product-media"><Link to={`/products/${product.slug}`}><ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.name} /></Link>{product.isNewArrival && <span className="badge">New</span>}<button className="icon-button wish" onClick={wish} aria-label={`Save ${product.name}`} title="Add to wishlist"><Heart size={18} /></button></div>
    <div className="product-copy"><p className="eyebrow">{product.brand.name}</p><h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3><div className="rating" aria-label={`${product.ratingAverage} out of 5 stars`}><Star size={14} fill="currentColor" /> {product.ratingAverage.toFixed(1)} <span>({product.ratingCount})</span></div><div className="price">{variant && money(variant.priceCents)} {variant?.compareAtCents && <del>{money(variant.compareAtCents)}</del>}</div></div>
  </article>;
};