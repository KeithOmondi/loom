import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Circle, Package } from 'lucide-react';
import { Badge, Btn, Card, Empty, ErrorBox, Field, Modal, Money, PageHeader, Spinner, StatusBadge, fmtDate, inputCls } from '../../components/ui/kit';
import { request, uploadEvidence, useAction, useFetch } from '../../lib/http';
import { NO_IMAGE, imageAt } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

interface OrderItemJson { product_name: string; quantity: number; price: number; metadata?: { image?: string } }
interface OrderRow {
  id: string; order_number: string; status: string; payment_status: string; total: number; placed_at: string;
  items: OrderItemJson[];
}

export const OrdersPage = () => {
  useDocumentTitle('My orders');
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useFetch<{ data: OrderRow[] }>('/orders/my?limit=50');
  const orders = (data?.data ?? []).filter((o) => o.payment_status !== 'pending' || ['payment_pending', 'pending'].includes(o.status));

  return (
    <div>
      <PageHeader title="My orders" />
      {params.get('placed') && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <div><p className="font-semibold">Thank you — your payment was received!</p><p>The seller has been notified. You&apos;ll get an update when your order ships.</p></div>
        </div>
      )}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : orders.length === 0 ? (
        <Empty title="No orders yet" hint="When you place an order it will show up here." action={<Link to="/shop" className="rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white">Start shopping</Link>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/account/orders/${o.id}`} className="block rounded-xl border border-warm-gray-200 bg-white p-4 hover:shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold">{o.order_number}</p><p className="text-xs text-warm-gray-500">Placed {fmtDate(o.placed_at)}</p></div>
                  <div className="text-right"><StatusBadge status={o.status} /><p className="mt-1 text-sm font-semibold"><Money value={o.total} /></p></div>
                </div>
                <div className="mt-3 flex gap-2 overflow-hidden">
                  {o.items.slice(0, 5).map((it, i) => (
                    <img key={i} src={imageAt(it.metadata?.image, 120) || NO_IMAGE} alt={it.product_name} className="h-14 w-14 rounded-lg object-cover" />
                  ))}
                  {o.items.length > 5 && <span className="self-center text-xs text-warm-gray-500">+{o.items.length - 5} more</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

interface OrderDetail extends OrderRow {
  subtotal: number; shipping_total: number; discount_total: number; coupon_code: string | null;
  payment_confirmed_at: string | null; processed_at: string | null; shipped_at: string | null; delivered_at: string | null;
  completed_at: string | null; cancelled_at: string | null; auto_confirm_at: string | null; escrow_status: string;
  tracking_number: string | null; carrier: string | null;
  shipping: { address?: { first_name: string; last_name: string; address_line1: string; address_line2?: string; city: string; state?: string; phone: string }; method?: string; tracking_url?: string };
}
interface Line { id: string; product_name: string; product_slug: string; variant_name: string | null; quantity: number; price: number; total: number; image: string | null; return_status: string | null }

const Step = ({ done, label, when }: { done: boolean; label: string; when?: string | null }) => (
  <li className="flex gap-3">
    {done ? <CheckCircle2 className="shrink-0 text-green-600" size={20} /> : <Circle className="shrink-0 text-warm-gray-300" size={20} />}
    <div><p className={`text-sm ${done ? 'font-medium' : 'text-warm-gray-500'}`}>{label}</p>{when && <p className="text-xs text-warm-gray-500">{fmtDate(when, true)}</p>}</div>
  </li>
);

export const OrderDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const order = useFetch<{ data: OrderDetail }>(`/orders/${id}`);
  const lines = useFetch<{ data: Line[] }>(`/orders/${id}/lines`);
  const { busy, run } = useAction();
  const [returnFor, setReturnFor] = useState<Line | null>(null);
  const [problem, setProblem] = useState(false);
  const o = order.data?.data;
  useDocumentTitle(o ? `Order ${o.order_number}` : 'Order');

  if (order.loading) return <Spinner />;
  if (order.error || !o) return <ErrorBox message={order.error ?? 'Order not found'} onRetry={order.reload} />;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    const r = await run(fn);
    if (!r.ok) return toast.error(r.error);
    toast.success(ok);
    await Promise.all([order.reload(), lines.reload()]);
  };

  const cancelled = o.status === 'cancelled' || o.status === 'refunded';
  const canCancel = ['pending', 'payment_pending', 'paid', 'processing'].includes(o.status);
  const canConfirm = ['shipped', 'delivered'].includes(o.status);
  const canReturn = ['delivered', 'completed'].includes(o.status);
  const canDispute = o.payment_status === 'paid' && ['shipped', 'delivered', 'completed', 'processing', 'paid'].includes(o.status);
  const addr = o.shipping?.address;

  return (
    <div className="space-y-5">
      <PageHeader title={`Order ${o.order_number}`} subtitle={`Placed ${fmtDate(o.placed_at, true)}`} actions={<StatusBadge status={o.status} />} />

      {o.status === 'delivered' && o.auto_confirm_at && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Delivered. Please confirm you received it — otherwise payment goes to the seller automatically on <strong>{fmtDate(o.auto_confirm_at)}</strong>. Problem with the order? Report it before then.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Items">
            {lines.loading ? <Spinner /> : (
              <ul className="divide-y divide-warm-gray-100">
                {(lines.data?.data ?? []).map((l) => (
                  <li key={l.id} className="flex gap-4 py-3">
                    <img src={imageAt(l.image, 160) || NO_IMAGE} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${l.product_slug}`} className="line-clamp-2 text-sm hover:text-accent-700">{l.product_name}</Link>
                      {l.variant_name && <p className="text-xs text-warm-gray-500">{l.variant_name}</p>}
                      <p className="text-xs text-warm-gray-500">{l.quantity} × <Money value={l.price} /></p>
                      {l.return_status && <p className="mt-1"><Badge tone="amber">Return: {l.return_status}</Badge></p>}
                    </div>
                    <div className="text-right"><Money value={l.total} className="font-medium" />
                      {canReturn && !l.return_status && <button onClick={() => setReturnFor(l)} className="mt-1 block text-xs text-accent-700 hover:underline">Request a return</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Order progress">
            {cancelled ? (
              <ol className="space-y-4"><Step done label="Order placed" when={o.placed_at} /><Step done label={o.status === 'refunded' ? 'Refunded' : 'Cancelled'} when={o.cancelled_at} /></ol>
            ) : (
              <ol className="space-y-4">
                <Step done label="Order placed" when={o.placed_at} />
                <Step done={!!o.payment_confirmed_at} label="Payment received" when={o.payment_confirmed_at} />
                <Step done={!!o.processed_at || !!o.shipped_at} label="Seller preparing your order" when={o.processed_at} />
                <Step done={!!o.shipped_at} label={o.carrier ? `Shipped with ${o.carrier} · tracking ${o.tracking_number}` : 'Shipped'} when={o.shipped_at} />
                <Step done={!!o.delivered_at} label="Delivered" when={o.delivered_at} />
                <Step done={!!o.completed_at} label="Completed — payment released to seller" when={o.completed_at} />
              </ol>
            )}
            {o.shipping?.tracking_url && <a href={o.shipping.tracking_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-accent-700 underline">Track with courier</a>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Summary">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd><Money value={o.subtotal} /></dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd><Money value={o.shipping_total} /></dd></div>
              {Number(o.discount_total) > 0 && <div className="flex justify-between text-green-700"><dt>Discount {o.coupon_code && `(${o.coupon_code})`}</dt><dd>− <Money value={o.discount_total} /></dd></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd><Money value={o.total} /></dd></div>
            </dl>
          </Card>
          {addr && (
            <Card title={o.shipping?.method === 'pickup' ? 'Pickup' : 'Delivery address'}>
              <p className="text-sm">{addr.first_name} {addr.last_name}<br />{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}<br />{addr.city}{addr.state ? `, ${addr.state}` : ''}<br />{addr.phone}</p>
            </Card>
          )}
          <Card title="Actions">
            <div className="flex flex-col gap-2">
              {canConfirm && <Btn busy={busy} onClick={() => act(() => request('post', `/orders/${id}/confirm-delivery`, {}), 'Thanks! Payment released to the seller.')}>I received my order</Btn>}
              {canDispute && <Btn variant="secondary" onClick={() => setProblem(true)}>Report a problem</Btn>}
              {canCancel && <Btn variant="danger" busy={busy} onClick={() => { if (confirm('Cancel this order? If you already paid, the money goes to your Loom wallet.')) void act(() => request('post', `/orders/${id}/cancel`, { reason: 'Cancelled by customer' }), 'Order cancelled'); }}>Cancel order</Btn>}
              {!canConfirm && !canDispute && !canCancel && <p className="text-sm text-warm-gray-500">No actions available.</p>}
            </div>
          </Card>
        </div>
      </div>

      <ReturnModal line={returnFor} orderId={id} onClose={() => setReturnFor(null)} onDone={() => { setReturnFor(null); void lines.reload(); toast.success('Return requested'); navigate('/account/returns'); }} />
      <ProblemModal open={problem} orderId={id} onClose={() => setProblem(false)} onDone={(did) => { setProblem(false); navigate(`/account/disputes/${did}`); }} />
    </div>
  );
};

const ReturnModal = ({ line, orderId, onClose, onDone }: { line: Line | null; orderId: string; onClose: () => void; onDone: () => void }) => {
  const [reason, setReason] = useState('Item is faulty or damaged');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState(1);
  const [pref, setPref] = useState<'refund' | 'wallet'>('wallet');
  const [files, setFiles] = useState<FileList | null>(null);
  const { busy, run } = useAction();
  if (!line) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(async () => {
      const photos = files?.length ? (await uploadEvidence(files)).map((f) => f.url) : [];
      return request('post', '/returns', { order_id: orderId, order_item_id: line.id, quantity: qty, reason, description: description || undefined, photos, preferred_resolution: pref });
    });
    if (!r.ok) return toast.error(r.error);
    onDone();
  };

  return (
    <Modal open onClose={onClose} title="Request a return">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-warm-gray-600">{line.product_name}</p>
        <Field label="Reason">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {['Item is faulty or damaged', 'Wrong item received', 'Not as described', 'Missing parts or accessories', 'Other'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        {line.quantity > 1 && <Field label="Quantity to return"><input type="number" min={1} max={line.quantity} className={inputCls} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(line.quantity, Number(e.target.value) || 1)))} /></Field>}
        <Field label="Tell us more"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} /></Field>
        <Field label="Photos (optional)" hint="Up to 6 images, 8MB each"><input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" /></Field>
        <Field label="Refund me to"><select className={inputCls} value={pref} onChange={(e) => setPref(e.target.value as 'refund' | 'wallet')}><option value="wallet">Loom wallet (instant)</option><option value="refund">M-Pesa</option></select></Field>
        <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" busy={busy}>Submit request</Btn></div>
      </form>
    </Modal>
  );
};

const ProblemModal = ({ open, orderId, onClose, onDone }: { open: boolean; orderId: string; onClose: () => void; onDone: (disputeId: string) => void }) => {
  const [reason, setReason] = useState("Item hasn't arrived");
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const { busy, run } = useAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(async () => {
      const evidence = files?.length ? await uploadEvidence(files) : [];
      return request<{ data: { id: string } }>('post', '/disputes', { order_id: orderId, reason, description: description || undefined, evidence });
    });
    if (!r.ok) return toast.error(r.error);
    toast.success('Dispute opened. The seller has been notified.');
    onDone(r.value.data.id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Report a problem">
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">While a dispute is open, your payment stays protected and is not released to the seller. The seller has 72 hours to respond; after that our team steps in.</p>
        <Field label="What went wrong?">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {["Item hasn't arrived", 'Item is not as described', 'Item is damaged or faulty', 'Wrong item received', 'Seller is not responding', 'Other'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Details"><textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} placeholder="Describe what happened" /></Field>
        <Field label="Evidence (optional)" hint="Photos or a PDF — up to 6 files, 8MB each"><input type="file" accept="image/*,application/pdf" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" busy={busy}>Open dispute</Btn></div>
      </form>
    </Modal>
  );
};

export const OrdersIcon = Package;
