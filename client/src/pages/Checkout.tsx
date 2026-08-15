import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCheckoutMutation, useGetCartQuery, useMeQuery } from '../app/api';
import { apiMessage, money } from '../app/format';
import type { Address } from '../app/types';
import { Seo } from '../components/Seo';

export default function Checkout() {
  const { data: user, isLoading: authLoading } = useMeQuery();
  const { data: cart, isLoading: cartLoading } = useGetCartQuery(undefined, { skip: !user });
  const [checkout, checkoutState] = useCheckoutMutation();
  const [error, setError] = useState('');

  if (authLoading || user && cartLoading) return <div className="page-loading" role="status">Loading secure checkout…</div>;
  if (!user) return <Navigate to="/login?next=/checkout" replace/>;
  if (!cart?.items.length) return <Navigate to="/cart" replace/>;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const address: Address = {
      recipient: String(values.recipient),
      line1: String(values.line1),
      line2: String(values.line2 ?? ''),
      city: String(values.city),
      region: String(values.region),
      postalCode: String(values.postalCode),
      country: 'US',
      phone: String(values.phone ?? '')
    };

    try {
      const result = await checkout({ shippingAddress: address, billingAddress: address }).unwrap();
      window.location.assign(result.checkoutUrl);
    } catch (value) {
      setError(apiMessage(value));
    }
  };

  return <main className="checkout-page">
    <Seo title="Secure Checkout | Wellora Market" description="Complete your Wellora Market order on Paymob's secure hosted checkout."/>
    <div>
      <p className="eyebrow">Secure checkout</p>
      <h1>Delivery & payment</h1>
      <form className="checkout-form" onSubmit={submit}>
        <h2>Shipping address</h2>
        <label>Full name<input name="recipient" defaultValue={`${user.firstName} ${user.lastName}`} required/></label>
        <label>Street address<input name="line1" required/></label>
        <label>Apartment, suite, etc. <span>Optional</span><input name="line2"/></label>
        <div className="field-row">
          <label>City<input name="city" required/></label>
          <label>State<input name="region" required maxLength={2}/></label>
        </div>
        <div className="field-row">
          <label>ZIP code<input name="postalCode" required/></label>
          <label>Phone<input name="phone" type="tel" minLength={8} maxLength={20} required/></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button full" disabled={checkoutState.isLoading}>
          <LockKeyhole size={17}/>{checkoutState.isLoading ? 'Opening Paymob…' : 'Continue to Paymob'}
        </button>
      </form>
    </div>
    <aside className="order-summary checkout-summary">
      <h2>Your order</h2>
      {cart.items.map((item) => <div className="summary-line" key={item.variantId}><span>{item.name} × {item.quantity}</span><strong>{money(item.unitPriceCents * item.quantity)}</strong></div>)}
      <div><span>Subtotal</span><strong>{money(cart.totals.subtotalCents)}</strong></div>
      <div><span>Shipping</span><strong>{cart.totals.shippingCents ? money(cart.totals.shippingCents) : 'Free'}</strong></div>
      <div><span>Tax</span><strong>{money(cart.totals.taxCents)}</strong></div>
      <div className="total"><span>Total</span><strong>{money(cart.totals.grandTotalCents)}</strong></div>
      <p className="fine-print"><LockKeyhole size={14}/> You will complete payment on Paymob's secure hosted page. Wellora never stores card details.</p>
    </aside>
  </main>;
}