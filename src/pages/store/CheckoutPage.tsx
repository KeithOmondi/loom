import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, MapPin, Smartphone, Store as StoreIcon, Truck } from 'lucide-react';
import { useGetCartQuery } from '../../api/cartApi';
import { AddressForm, type AddressValues } from '../../components/store/AddressForm';
import { Btn, Card, Field, Spinner, inputCls } from '../../components/ui/kit';
import { errorMessage, request, useAction, useFetch } from '../../lib/http';
import { formatKES } from '../../lib/format';
import { toMpesaPhone } from '../../lib/kenya';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useAppSelector } from '../../store/hooks';

interface SavedAddress extends AddressValues { id: string }
interface Quote {
  subtotal: number; shipping: number; discount: number; total: number; coupon_code: string | null;
  orders: { store_id: string; subtotal: number; shipping: number; discount: number; total: number; est_days: { min: number; max: number } }[];
}
interface Station { id: string; name: string; county: string; address: string; fee: number }
type PayState = { phase: 'idle' } | { phase: 'waiting'; groupId: string } | { phase: 'failed'; groupId: string; message: string } | { phase: 'timeout'; groupId: string };

const CheckoutPage = () => {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { data: cart, isLoading: cartLoading } = useGetCartQuery();
  const addresses = useFetch<{ data: SavedAddress[] }>('/addresses');
  const stations = useFetch<{ data: Station[] }>('/shipping/pickup-stations');

  const [mode, setMode] = useState<'home' | 'pickup'>('home');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [stationId, setStationId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [pay, setPay] = useState<PayState>({ phase: 'idle' });
  const { busy, run } = useAction();
  const poll = useRef<number | null>(null);

  const saved = addresses.data?.data ?? [];

  // pick the default saved address once loaded
  useEffect(() => {
    if (!addressId && saved.length) setAddressId((saved.find((a) => (a as any).is_default) ?? saved[0]).id);
  }, [saved, addressId]);

  useEffect(() => {
    if (!phone) {
      const p = saved.find((a) => a.id === addressId)?.phone;
      if (p) setPhone(p);
    }
  }, [addressId, saved, phone]);

  const destinationReady = mode === 'home' ? !!addressId : !!stationId;

  const refreshQuote = useCallback(async () => {
    if (!destinationReady) { setQuote(null); return; }
    try {
      const body = mode === 'home' ? { address_id: addressId } : { pickup_station_id: stationId };
      const res = await request<{ data: Quote }>('post', '/orders/quote', { ...body, coupon_code: coupon });
      setQuote(res.data);
      setQuoteError(null);
      setCouponError(null);
    } catch (err) {
      const msg = errorMessage(err);
      if (coupon) { setCouponError(msg); setCoupon(null); } else { setQuote(null); setQuoteError(msg); }
    }
  }, [mode, addressId, stationId, coupon, destinationReady]);

  useEffect(() => { void refreshQuote(); }, [refreshQuote]);
  useEffect(() => () => { if (poll.current) window.clearInterval(poll.current); }, []);

  const saveAddress = async (v: AddressValues) => {
    const r = await run(() => request<{ data: SavedAddress }>('post', '/addresses', v));
    if (!r.ok) return toast.error(r.error);
    await addresses.reload();
    setAddressId(r.value.data.id);
    setAddingAddress(false);
  };

  const startPolling = (groupId: string) => {
    let tries = 0;
    if (poll.current) window.clearInterval(poll.current);
    poll.current = window.setInterval(async () => {
      tries += 1;
      try {
        const res = await request<{ data: { status: string; result_desc: string | null } }>('get', `/payments/mpesa/status/${groupId}`);
        const s = res.data.status;
        if (s === 'success') {
          window.clearInterval(poll.current!);
          toast.success('Payment received!');
          navigate(`/account/orders?placed=1`, { replace: true });
        } else if (['failed', 'cancelled', 'timeout'].includes(s)) {
          window.clearInterval(poll.current!);
          setPay({ phase: 'failed', groupId, message: res.data.result_desc ?? 'The payment was not completed.' });
        }
      } catch { /* transient — keep polling */ }
      if (tries >= 40) { // ~2 minutes
        window.clearInterval(poll.current!);
        setPay({ phase: 'timeout', groupId });
      }
    }, 3000);
  };

  const initiatePayment = async (groupId: string) => {
    const msisdn = toMpesaPhone(phone);
    if (!msisdn) return toast.error('Enter a valid Safaricom number, e.g. 0712 345 678.');
    const r = await run(() => request('post', '/payments/mpesa/initiate', { payment_group_id: groupId, phone: msisdn }));
    if (!r.ok) { setPay({ phase: 'failed', groupId, message: r.error }); return; }
    setPay({ phase: 'waiting', groupId });
    startPolling(groupId);
  };

  const placeOrder = async () => {
    if (!quote) return;
    if (!toMpesaPhone(phone)) return toast.error('Enter the M-Pesa number to pay with, e.g. 0712 345 678.');
    const body = mode === 'home' ? { address_id: addressId } : { pickup_station_id: stationId };
    const r = await run(() => request<{ data: { payment_group_id: string } }>('post', '/orders/checkout', { ...body, coupon_code: coupon, customer_notes: notes || undefined }));
    if (!r.ok) return toast.error(r.error);
    await initiatePayment(r.value.data.payment_group_id);
  };

  const cancelUnpaid = async (groupId: string) => {
    const orders = await request<{ data: { id: string; payment_group_id: string }[] }>('get', '/orders/my?limit=50');
    const mine = orders.data.filter((o) => o.payment_group_id === groupId);
    await Promise.all(mine.map((o) => request('post', `/orders/${o.id}/cancel`, {}).catch(() => null)));
    setPay({ phase: 'idle' });
    toast('Order cancelled — your cart items were released.');
    navigate('/cart');
  };

  if (cartLoading || addresses.loading) return <Spinner />;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <Link to="/shop" className="mt-4 inline-block rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-medium text-white">Start shopping</Link>
      </div>
    );
  }

  if (pay.phase === 'waiting') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Smartphone className="mx-auto mb-4 text-accent-700" size={40} />
        <h1 className="text-xl font-bold">Check your phone</h1>
        <p className="mt-2 text-warm-gray-600">We sent an M-Pesa prompt to <strong>{phone}</strong>. Enter your PIN to pay {quote && formatKES(quote.total)}.</p>
        <div className="mt-6"><Spinner label="Waiting for payment…" /></div>
        <p className="text-xs text-warm-gray-500">Don&apos;t close this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-5 text-xl font-bold">Checkout</h1>

      {(pay.phase === 'failed' || pay.phase === 'timeout') && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{pay.phase === 'failed' ? 'Payment not completed' : 'Still waiting for confirmation'}</p>
          <p className="mt-1">{pay.phase === 'failed' ? pay.message : 'If you entered your PIN, your payment will show up in My orders shortly. Otherwise you can try again.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn onClick={() => initiatePayment(pay.groupId)} busy={busy}>Retry payment</Btn>
            <Btn variant="secondary" onClick={() => cancelUnpaid(pay.groupId)}>Cancel order</Btn>
            {pay.phase === 'timeout' && <Link to="/account/orders" className="self-center text-accent-700 underline">Go to my orders</Link>}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="1. Delivery method">
            <div className="grid gap-3 sm:grid-cols-2">
              {([['home', 'Home / office delivery', Truck], ['pickup', 'Pick up at a station', StoreIcon]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setMode(key)} className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left ${mode === key ? 'border-accent-700 bg-accent-50' : 'border-warm-gray-200'}`}>
                  <Icon size={20} className="text-accent-700" /> <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </Card>

          {mode === 'home' ? (
            <Card title="2. Delivery address">
              {addingAddress || saved.length === 0 ? (
                <AddressForm busy={busy} onSubmit={saveAddress} submitLabel="Save and use this address" onCancel={saved.length ? () => setAddingAddress(false) : undefined} />
              ) : (
                <div className="space-y-3">
                  {saved.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 ${addressId === a.id ? 'border-accent-700 bg-accent-50' : 'border-warm-gray-200'}`}>
                      <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[#B85A38]" />
                      <span className="text-sm">
                        <span className="flex items-center gap-1 font-medium"><MapPin size={14} /> {a.first_name} {a.last_name}</span>
                        <span className="block text-warm-gray-600">{a.address_line1}, {a.city}, {a.state}</span>
                        <span className="block text-warm-gray-600">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                  <Btn variant="ghost" onClick={() => setAddingAddress(true)}>+ Add a new address</Btn>
                </div>
              )}
            </Card>
          ) : (
            <Card title="2. Choose a pickup station">
              {(stations.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-warm-gray-600">No pickup stations are available yet — please choose home delivery.</p>
              ) : (
                <div className="space-y-3">
                  {stations.data!.data.map((s) => (
                    <label key={s.id} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 ${stationId === s.id ? 'border-accent-700 bg-accent-50' : 'border-warm-gray-200'}`}>
                      <input type="radio" name="station" checked={stationId === s.id} onChange={() => setStationId(s.id)} className="mt-1 accent-[#B85A38]" />
                      <span className="text-sm"><span className="font-medium">{s.name}</span> · {s.county}<span className="block text-warm-gray-600">{s.address}</span><span className="text-warm-gray-600">Fee: {s.fee ? formatKES(Number(s.fee)) : 'Free'}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card title="3. Payment">
            <Field label="M-Pesa phone number" hint="You will get a payment prompt on this number">
              <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
            </Field>
            <div className="mt-4">
              <Field label="Order notes (optional)">
                <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </Field>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-warm-gray-600">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
              Your money is held securely by Loom and only released to the seller after you confirm delivery.
            </p>
          </Card>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-28">
          <Card title="Order summary">
            <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto text-sm">
              {cart.items.map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span className="line-clamp-1">{l.quantity} × {l.product.name}{(l as any).variant_name ? ` (${(l as any).variant_name})` : ''}</span>
                  <span className="shrink-0">{formatKES(l.line_total)}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 border-t border-warm-gray-100 pt-3">
              <input className={inputCls} placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
              <Btn variant="secondary" onClick={() => { setCoupon(couponInput.trim() || null); }} disabled={!couponInput.trim()}>Apply</Btn>
            </div>
            {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
            {quote?.coupon_code && <p className="mt-1 text-xs text-green-700">Coupon {quote.coupon_code} applied</p>}

            <dl className="mt-4 space-y-1.5 border-t border-warm-gray-100 pt-3 text-sm">
              <Row label="Subtotal" value={formatKES(quote?.subtotal ?? cart.subtotal)} />
              <Row label="Delivery" value={quote ? (quote.shipping ? formatKES(quote.shipping) : 'Free') : '—'} />
              {!!quote?.discount && <Row label="Discount" value={`− ${formatKES(quote.discount)}`} green />}
              <div className="flex justify-between border-t border-warm-gray-100 pt-2 text-base font-bold">
                <dt>Total</dt><dd>{quote ? formatKES(quote.total) : '—'}</dd>
              </div>
            </dl>
            {quote && quote.orders.length > 1 && <p className="mt-2 text-xs text-warm-gray-500">Your items come from {quote.orders.length} sellers, so they ship as {quote.orders.length} separate deliveries.</p>}
            {quote && <p className="mt-2 text-xs text-warm-gray-500">Estimated delivery: {Math.min(...quote.orders.map((o) => o.est_days.min))}–{Math.max(...quote.orders.map((o) => o.est_days.max))} days</p>}
            {quoteError && <p className="mt-2 text-sm text-red-600">{quoteError}</p>}

            <Btn className="mt-4 w-full py-3" busy={busy} disabled={!quote || pay.phase !== 'idle'} onClick={placeOrder}>
              Pay {quote ? formatKES(quote.total) : ''} with M-Pesa
            </Btn>
            <p className="mt-2 text-center text-xs text-warm-gray-500">Signed in as {user?.email}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

const Row = ({ label, value, green }: { label: string; value: string; green?: boolean }) => (
  <div className="flex justify-between"><dt className="text-warm-gray-600">{label}</dt><dd className={green ? 'text-green-700' : ''}>{value}</dd></div>
);

export default CheckoutPage;
