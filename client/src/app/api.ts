import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Address, Cart, NamedRef, Order, Product, User } from './types';

type Envelope<T> = { success: true; data: T };
type ProductList = { items: Product[]; pagination: { page: number; limit: number; total: number; pages: number } };
type ProductDetail = { product: Product; reviews: Array<{ _id: string; rating: number; title: string; body: string; verifiedPurchase: boolean; createdAt: string; user: { firstName: string; lastName: string } }>; related: Product[] };
export type AdminProductInput = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  shortDescription: string;
  description: string;
  images: Array<{ url: string; alt: string; order: number }>;
  variants: Array<{ name: string; sku: string; priceCents: number; compareAtCents?: number; stock: number; lowStockThreshold: number; isActive: boolean }>;
  tags: string[];
  ingredients: string[];
  benefits: string[];
  usage: string;
  status: 'draft' | 'active';
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL ?? '/api/v1', credentials: 'include' }),
  tagTypes: ['Auth', 'Cart', 'Wishlist', 'Orders', 'Products', 'Admin'],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductList, string | void>({ query: (params = '') => `/products${params ? `?${params}` : ''}`, transformResponse: (response: Envelope<ProductList>) => response.data, providesTags: ['Products'] }),
    getProduct: builder.query<ProductDetail, string>({ query: (slug) => `/products/${slug}`, transformResponse: (response: Envelope<ProductDetail>) => response.data, providesTags: ['Products'] }),
    getCategories: builder.query<NamedRef[], void>({ query: () => '/categories', transformResponse: (response: Envelope<NamedRef[]>) => response.data }),
    getBrands: builder.query<NamedRef[], void>({ query: () => '/brands', transformResponse: (response: Envelope<NamedRef[]>) => response.data }),
    subscribeNewsletter: builder.mutation<{ message: string }, string>({ query: (email) => ({ url: '/newsletter', method: 'POST', body: { email } }), transformResponse: (response: Envelope<{ message: string }>) => response.data }),
    createSupportTicket: builder.mutation<{ ticketNumber: string; message: string }, { name: string; email: string; message: string }>({ query: (body) => ({ url: '/support', method: 'POST', body }), transformResponse: (response: Envelope<{ ticketNumber: string; message: string }>) => response.data }),
    me: builder.query<User, void>({ query: () => '/auth/me', transformResponse: (response: Envelope<{ user: User }>) => response.data.user, providesTags: ['Auth'] }),
    login: builder.mutation<User, { email: string; password: string }>({ query: (body) => ({ url: '/auth/login', method: 'POST', body }), transformResponse: (response: Envelope<{ user: User }>) => response.data.user, invalidatesTags: ['Auth', 'Cart', 'Wishlist'] }),
    register: builder.mutation<User, { firstName: string; lastName: string; email: string; password: string }>({ query: (body) => ({ url: '/auth/register', method: 'POST', body }), transformResponse: (response: Envelope<{ user: User }>) => response.data.user, invalidatesTags: ['Auth'] }),
    logout: builder.mutation<void, void>({ query: () => ({ url: '/auth/logout', method: 'POST' }), invalidatesTags: ['Auth', 'Cart', 'Wishlist'] }),
    forgotPassword: builder.mutation<{ message: string; developmentResetToken?: string }, string>({ query: (email) => ({ url: '/auth/forgot-password', method: 'POST', body: { email } }), transformResponse: (response: Envelope<{ message: string; developmentResetToken?: string }>) => response.data }),
    resetPassword: builder.mutation<{ message: string }, { token: string; password: string }>({ query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }), transformResponse: (response: Envelope<{ message: string }>) => response.data }),
    getCart: builder.query<Cart, void>({ query: () => '/cart', transformResponse: (response: Envelope<Cart>) => response.data, providesTags: ['Cart'] }),
    addCart: builder.mutation<Cart, { productId: string; variantId: string; quantity: number }>({ query: (body) => ({ url: '/cart/items', method: 'POST', body }), transformResponse: (response: Envelope<Cart>) => response.data, invalidatesTags: ['Cart'] }),
    updateCart: builder.mutation<Cart, { variantId: string; quantity: number }>({ query: ({ variantId, quantity }) => ({ url: `/cart/items/${variantId}`, method: 'PATCH', body: { quantity } }), invalidatesTags: ['Cart'] }),
    removeCart: builder.mutation<Cart, string>({ query: (variantId) => ({ url: `/cart/items/${variantId}`, method: 'DELETE' }), invalidatesTags: ['Cart'] }),
    applyCoupon: builder.mutation<Cart, string>({ query: (code) => ({ url: '/cart/coupon', method: 'POST', body: { code } }), invalidatesTags: ['Cart'] }),
    getWishlist: builder.query<Product[], void>({ query: () => '/wishlist', transformResponse: (response: Envelope<Product[]>) => response.data, providesTags: ['Wishlist'] }),
    addWishlist: builder.mutation<void, string>({ query: (id) => ({ url: `/wishlist/${id}`, method: 'POST' }), invalidatesTags: ['Wishlist'] }),
    removeWishlist: builder.mutation<void, string>({ query: (id) => ({ url: `/wishlist/${id}`, method: 'DELETE' }), invalidatesTags: ['Wishlist'] }),
      checkout: builder.mutation<{ orderId: string; orderNumber: string; checkoutUrl: string; totals: Cart['totals'] }, { shippingAddress: Address; billingAddress: Address }>({ query: (body) => ({ url: '/checkout/create-session', method: 'POST', body }), transformResponse: (response: Envelope<{ orderId: string; orderNumber: string; checkoutUrl: string; totals: Cart['totals'] }>) => response.data }),
    getOrders: builder.query<Order[], void>({ query: () => '/orders', transformResponse: (response: Envelope<Order[]>) => response.data, providesTags: ['Orders'] }),
    getOrder: builder.query<Order, string>({ query: (id) => `/orders/${id}`, transformResponse: (response: Envelope<Order>) => response.data, providesTags: ['Orders'] }),
    submitReview: builder.mutation<void, { productId: string; rating: number; title: string; body: string }>({ query: ({ productId, ...body }) => ({ url: `/products/${productId}/reviews`, method: 'POST', body }), invalidatesTags: ['Products'] }),
    adminDashboard: builder.query<any, void>({ query: () => '/admin/dashboard', transformResponse: (response: Envelope<any>) => response.data, providesTags: ['Admin'] }),
    adminOrders: builder.query<Order[], void>({ query: () => '/admin/orders', transformResponse: (response: Envelope<Order[]>) => response.data, providesTags: ['Admin'] }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({ query: ({ id, status }) => ({ url: `/admin/orders/${id}/status`, method: 'PATCH', body: { status } }), invalidatesTags: ['Admin', 'Orders'] }),
    adminProducts: builder.query<Product[], void>({ query: () => '/admin/products', transformResponse: (response: Envelope<Product[]>) => response.data, providesTags: ['Admin'] }),
    createAdminProduct: builder.mutation<Product, AdminProductInput>({ query: (body) => ({ url: '/admin/products', method: 'POST', body }), transformResponse: (response: Envelope<Product>) => response.data, invalidatesTags: ['Admin', 'Products'] }),
    updateAdminProduct: builder.mutation<Product, { id: string; body: Partial<AdminProductInput> }>({ query: ({ id, body }) => ({ url: `/admin/products/${id}`, method: 'PATCH', body }), transformResponse: (response: Envelope<Product>) => response.data, invalidatesTags: ['Admin', 'Products'] }),
    deleteAdminProduct: builder.mutation<void, string>({ query: (id) => ({ url: `/admin/products/${id}`, method: 'DELETE' }), invalidatesTags: ['Admin', 'Products'] })
    ,adminResource: builder.query<Record<string, unknown>[], string>({ query: (resource) => `/admin/resources/${resource}`, transformResponse: (response: Envelope<Record<string, unknown>[]>) => response.data, providesTags: ['Admin'] })
  })
});

export const { useGetProductsQuery, useGetProductQuery, useGetCategoriesQuery, useGetBrandsQuery, useSubscribeNewsletterMutation, useCreateSupportTicketMutation, useMeQuery, useLoginMutation, useRegisterMutation, useLogoutMutation, useForgotPasswordMutation, useResetPasswordMutation, useGetCartQuery, useAddCartMutation, useUpdateCartMutation, useRemoveCartMutation, useApplyCouponMutation, useGetWishlistQuery, useAddWishlistMutation, useRemoveWishlistMutation, useCheckoutMutation, useGetOrdersQuery, useGetOrderQuery, useSubmitReviewMutation, useAdminDashboardQuery, useAdminOrdersQuery, useUpdateOrderStatusMutation, useAdminProductsQuery, useCreateAdminProductMutation, useUpdateAdminProductMutation, useDeleteAdminProductMutation, useAdminResourceQuery } = api;