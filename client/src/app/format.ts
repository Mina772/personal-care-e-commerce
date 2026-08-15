export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: import.meta.env.VITE_CURRENCY ?? 'EGP' }).format(cents / 100);
export const apiMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  const value = error as { data?: { error?: { message?: string } } };
  return value?.data?.error?.message ?? fallback;
};