// Seller back-office screens backed by the real API (orders, payouts, returns, coupons, variants).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { Badge, Btn, Card, Empty, ErrorBox, Field, Modal, Money, PageHeader, Spinner, Stat, StatusBadge, Table, fmtDate, inputCls } from '../../components/ui/kit';
import { downloadFile, request, useAction, useFetch } from '../../lib/http';
import { formatKES } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

// ===========================================================================
// Dashboard
// ===========================================================================
interface Dash {
  period_days: number; orders: number; gross_sales: number; commission: number; net_earnings: number; orders_to_ship: number;
  balances: { pending: number; available: number; inPayout: number };
  series: { day: string; revenue: number; orders: number }[];
  top_products: { id: string; name: string; units: number; revenue: number }[];
  orders_by_status: { status: string; n: number }[];
  low_stock: { id: string; name: string; stock_quantity: number }[];
}

const Bars = ({ series }: { series: Dash['series'] }) => {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily revenue">
      {series.map((s) => (
        <div key={s.day} className="group relative flex-1" title={`${fmtDate(s.day)}: ${formatKES(s.revenue)} · ${s.orders} orders`}>
          <div className="w-full rounded-t bg-accent-500 transition group-hover:bg-accent-700" style={{ height: `${Math.max(2, (s.revenue / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
};

export const SellerDashboard = () => {
  useDocumentTitle('Dashboard');
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useFetch<{ data: Dash }>(`/seller-hub/dashboard?days=${days}`);
  const d = data?.data;
  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="How your store is doing" actions={
        <select className={`${inputCls} w-auto`} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          {[7, 30, 90].map((n) => <option key={n} value={n}>Last {n} days</option>)}
        </select>} />
      {loading && !d ? <Spinner /> : error || !d ? <ErrorBox message={error ?? 'No data'} onRetry={reload} /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Gross sales" value={formatKES(d.gross_sales)} hint={`${d.orders} paid orders`} />
            <Stat label="Net earnings" value={formatKES(d.net_earnings)} hint={`after ${formatKES(d.commission)} commission`} />
            <Stat label="Available to withdraw" value={formatKES(d.balances.available)} tone="good" hint={`${formatKES(d.balances.pending)} still in escrow`} />
            <Stat label="Orders to ship" value={d.orders_to_ship} tone={d.orders_to_ship ? 'warn' : undefined} hint={d.orders_to_ship ? 'Customers are waiting' : 'All caught up'} />
          </div>
          <Card title="Revenue"><Bars series={d.series} /></Card>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Top products" className="lg:col-span-2">
              {!d.top_products.length ? <p className="text-sm text-warm-gray-500">No sales in this period yet.</p> : (
                <ul className="divide-y divide-warm-gray-100 text-sm">{d.top_products.map((p) => <li key={p.id} className="flex justify-between py-2"><span className="line-clamp-1">{p.name}</span><span className="shrink-0 text-warm-gray-600">{p.units} sold · <Money value={p.revenue} /></span></li>)}</ul>
              )}
            </Card>
            <Card title="Low stock">
              {!d.low_stock.length ? <p className="text-sm text-warm-gray-500">Stock levels look healthy.</p> : (
                <ul className="space-y-2 text-sm">{d.low_stock.map((p) => <li key={p.id} className="flex items-center justify-between gap-2"><span className="line-clamp-1">{p.name}</span><Badge tone={p.stock_quantity === 0 ? 'red' : 'amber'}>{p.stock_quantity} left</Badge></li>)}</ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

// ===========================================================================
// Orders
// ===========================================================================
interface SellerOrder {
  id: string; order_number: string; status: string; payment_status: string; escrow_status: string; total: number; subtotal: number; shipping_total: number;
  commission_total: number; platform_delivery_fee: number; carrier: string | null; tracking_number: string | null; placed_at: string; auto_confirm_at: string | null;
  items: { product_name: string; quantity: number; variant_name?: string }[];
  customer: { first_name: string; last_name: string };
  shipping: { address?: { address_line1: string; city: string; state?: string; phone: string }; method?: string };
}

const COURIERS = ['Sendy', 'G4S', 'Wells Fargo', 'Fargo Courier', 'Easy Coach', 'Own delivery', 'Other'];

export const ShipModal = ({ order, onClose, onDone }: { order: SellerOrder | null; onClose: () => void; onDone: () => void }) => {
  const [carrier, setCarrier] = useState(COURIERS[0]);
  const [tracking, setTracking] = useState('');
  const { busy, run } = useAction();
  if (!order) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('post', `/orders/${order.id}/ship`, { carrier, tracking_number: tracking.trim() }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Marked as shipped — the customer was notified.');
    onDone();
  };
  return (
    <Modal open onClose={onClose} title={`Ship order ${order.order_number}`}>
      <form onSubmit={submit} className="space-y-3">
        {order.shipping?.address && <p className="rounded-lg bg-warm-gray-50 p-3 text-sm">Deliver to: {order.customer.first_name} {order.customer.last_name}, {order.shipping.address.address_line1}, {order.shipping.address.city}{order.shipping.address.state ? `, ${order.shipping.address.state}` : ''} · {order.shipping.address.phone}</p>}
        <Field label="Courier"><select className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Tracking / waybill number" hint="The customer sees this on their order page"><input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" busy={busy} disabled={tracking.trim().length < 3}>Mark as shipped</Btn></div>
      </form>
    </Modal>
  );
};

const OrdersTable = ({ status, emptyText }: { status?: string; emptyText: string }) => {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch<{ data: SellerOrder[]; pagination: { pages: number } }>(`/orders/seller/mine?page=${page}${status ? `&status=${status}` : ''}`);
  const [ship, setShip] = useState<SellerOrder | null>(null);
  const { busy, run } = useAction();
  const act = async (fn: () => Promise<unknown>, msg: string) => { const r = await run(fn); if (!r.ok) return toast.error(r.error); toast.success(msg); await reload(); };

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load orders'} onRetry={reload} />;
  return (
    <>
      <Table rows={data.data} empty={emptyText} columns={[
        { header: 'Order', cell: (o) => <div><p className="font-medium">{o.order_number}</p><p className="text-xs text-warm-gray-500">{fmtDate(o.placed_at, true)}</p></div> },
        { header: 'Items', cell: (o) => <ul className="text-xs">{o.items.slice(0, 3).map((i, k) => <li key={k} className="line-clamp-1">{i.quantity} × {i.product_name}{i.variant_name ? ` (${i.variant_name})` : ''}</li>)}{o.items.length > 3 && <li className="text-warm-gray-500">+{o.items.length - 3} more</li>}</ul> },
        { header: 'Customer', cell: (o) => <span className="text-xs">{o.customer.first_name} {o.customer.last_name}<br />{o.shipping?.address?.city}</span> },
        { header: 'You earn', cell: (o) => <div><Money value={o.total - o.commission_total - Number(o.platform_delivery_fee ?? 0)} className="font-medium" /><p className="text-xs text-warm-gray-500">of <Money value={o.total} /> paid{Number(o.platform_delivery_fee) > 0 && ' (delivery goes to the courier)'}</p></div> },
        { header: 'Status', cell: (o) => <div className="space-y-1"><StatusBadge status={o.status} />{o.escrow_status === 'held' && <p className="text-xs text-amber-700">In escrow</p>}{o.escrow_status === 'released' && <p className="text-xs text-green-700">Paid to you</p>}{o.tracking_number && <p className="text-xs text-warm-gray-500">{o.carrier} · {o.tracking_number}</p>}</div> },
        { header: '', cell: (o) => (
          <div className="flex flex-col gap-1.5">
            {o.status === 'paid' && <Btn className="px-3 py-1.5 text-xs" variant="secondary" busy={busy} onClick={() => act(() => request('post', `/orders/${o.id}/accept`, {}), 'Order accepted')}>Accept</Btn>}
            {['paid', 'processing'].includes(o.status) && <Btn className="px-3 py-1.5 text-xs" onClick={() => setShip(o)}>Ship</Btn>}
            {o.status === 'shipped' && <Btn className="px-3 py-1.5 text-xs" variant="secondary" busy={busy} onClick={() => act(() => request('post', `/orders/${o.id}/deliver`, {}), 'Marked as delivered')}>Mark delivered</Btn>}
            {o.status === 'delivered' && o.auto_confirm_at && <span className="text-xs text-warm-gray-500">Auto-release {fmtDate(o.auto_confirm_at)}</span>}
          </div>) },
      ]} />
      {data.pagination.pages > 1 && <div className="mt-4 flex items-center justify-center gap-3 text-sm"><Btn variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page} of {data.pagination.pages}</span><Btn variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</Btn></div>}
      <ShipModal order={ship} onClose={() => setShip(null)} onDone={() => { setShip(null); void reload(); }} />
    </>
  );
};

export const SellerOrders = () => {
  useDocumentTitle('Orders');
  const [tab, setTab] = useState<string>('');
  const tabs: [string, string][] = [['', 'All'], ['paid', 'New'], ['processing', 'Processing'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
  return (
    <div>
      <PageHeader title="Orders" subtitle="Orders appear here once the customer has paid." />
      <div className="mb-4 flex gap-1 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${tab === k ? 'bg-accent-700 text-white' : 'bg-white text-warm-gray-700 hover:bg-warm-gray-100'}`}>{l}</button>)}</div>
      <OrdersTable key={tab} status={tab || undefined} emptyText="No orders here yet." />
    </div>
  );
};

export const SellerFulfillment = () => {
  useDocumentTitle('Shipping');
  return (
    <div className="space-y-8">
      <PageHeader title="Shipping & waybills" subtitle="Pack each paid order, add the courier and tracking number, then mark it delivered." />
      <section><h2 className="mb-3 font-semibold">Ready to ship</h2><OrdersTable status="paid" emptyText="Nothing waiting to be shipped." /></section>
      <section><h2 className="mb-3 font-semibold">Being prepared</h2><OrdersTable status="processing" emptyText="No orders in preparation." /></section>
      <section><h2 className="mb-3 font-semibold">In transit</h2><OrdersTable status="shipped" emptyText="No parcels in transit." /></section>
    </div>
  );
};

// ===========================================================================
// Returns & disputes
// ===========================================================================
interface SellerReturn { id: string; order_number: string; product_name: string; quantity: number; reason: string; description: string | null; photos: string[]; status: string; item_price: number; return_tracking: string | null; vendor_response: string | null; created_at: string }

export const SellerReturns = () => {
  useDocumentTitle('Returns & disputes');
  const { data, loading, error, reload } = useFetch<{ data: SellerReturn[] }>('/returns/store');
  const disputes = useFetch<{ data: { id: string; order_number: string; reason: string; status: string; respond_by: string | null }[] }>('/disputes');
  const { busy, run } = useAction();
  const [reject, setReject] = useState<SellerReturn | null>(null);
  const [why, setWhy] = useState('');

  const act = async (fn: () => Promise<unknown>, msg: string) => { const r = await run(fn); if (!r.ok) return toast.error(r.error); toast.success(msg); await reload(); };
  const open = (disputes.data?.data ?? []).filter((d) => !['resolved', 'closed'].includes(d.status));

  return (
    <div className="space-y-8">
      <PageHeader title="Returns & disputes" subtitle="Respond before the deadline to protect your account and your payouts." />
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">Open disputes {open.length > 0 && <Badge tone="red">{open.length}</Badge>}</h2>
        {disputes.loading ? <Spinner /> : open.length === 0 ? <Empty title="No open disputes" /> : (
          <ul className="space-y-2">{open.map((d) => (
            <li key={d.id}><Link to={`/seller/disputes/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warm-gray-200 bg-white p-4 hover:shadow-sm">
              <div><p className="font-medium">Order {d.order_number}</p><p className="text-sm text-warm-gray-600">{d.reason}</p></div>
              <div className="text-right"><StatusBadge status={d.status} />{d.status === 'awaiting_vendor' && d.respond_by && <p className="mt-1 flex items-center gap-1 text-xs text-red-700"><AlertTriangle size={12} /> reply by {fmtDate(d.respond_by, true)}</p>}</div>
            </Link></li>))}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Return requests</h2>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <Table rows={data?.data ?? []} empty="No return requests." columns={[
            { header: 'Item', cell: (r) => <div><p className="font-medium">{r.product_name} × {r.quantity}</p><p className="text-xs text-warm-gray-500">Order {r.order_number} · {fmtDate(r.created_at)}</p></div> },
            { header: 'Reason', cell: (r) => <div className="max-w-xs text-xs"><p>{r.reason}</p>{r.description && <p className="mt-1 text-warm-gray-600">{r.description}</p>}<div className="mt-1 flex gap-2">{r.photos.map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer" className="text-accent-700 underline">Photo {i + 1}</a>)}</div></div> },
            { header: 'Status', cell: (r) => <div className="space-y-1"><StatusBadge status={r.status === 'pending' ? 'requested' : r.status} />{r.return_tracking && <p className="text-xs text-warm-gray-500">Tracking: {r.return_tracking}</p>}</div> },
            { header: '', cell: (r) => (
              <div className="flex flex-col gap-1.5">
                {['requested', 'pending'].includes(r.status) && <><Btn className="px-3 py-1.5 text-xs" busy={busy} onClick={() => act(() => request('post', `/returns/${r.id}/decision`, { accept: true }), 'Return approved')}>Approve</Btn><Btn className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => { setReject(r); setWhy(''); }}>Reject</Btn></>}
                {r.status === 'approved' && <Btn className="px-3 py-1.5 text-xs" busy={busy} onClick={() => { if (confirm('Confirm you received the item back? This sends a refund request to Loom finance.')) void act(() => request('post', `/returns/${r.id}/received`, {}), 'Marked as received — refund sent for approval'); }}>Item received</Btn>}
              </div>) },
          ]} />
        )}
      </section>

      <Modal open={!!reject} onClose={() => setReject(null)} title="Reject this return">
        <Field label="Explain why (the customer will see this)"><textarea className={inputCls} rows={4} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <div className="mt-4 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setReject(null)}>Cancel</Btn>
          <Btn variant="danger" busy={busy} disabled={why.trim().length < 5} onClick={async () => { await act(() => request('post', `/returns/${reject!.id}/decision`, { accept: false, response: why }), 'Return rejected'); setReject(null); }}>Reject return</Btn></div>
      </Modal>
    </div>
  );
};

// ===========================================================================
// Payouts
// ===========================================================================
interface PayoutSummary { store_id: string; store_name: string; pending: number; available: number; in_payout: number; lifetime_paid: number; minimum_payout: number; on_hold: boolean; hold_reason: string | null; payout_method: string; payout_schedule: string; has_payout_details: boolean }
interface PayoutRow { id: string; amount: number; method: string; status: string; reference: string | null; failure_reason: string | null; paid_at: string | null; created_at: string; store_name: string }

export const SellerPayouts = () => {
  useDocumentTitle('Payouts');
  const sum = useFetch<{ data: PayoutSummary[] }>('/payouts/summary');
  const hist = useFetch<{ data: PayoutRow[] }>('/payouts/mine');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { busy, run } = useAction();

  if (sum.loading) return <Spinner />;
  if (sum.error || !sum.data) return <ErrorBox message={sum.error ?? 'Could not load payouts'} onRetry={sum.reload} />;
  const summary = sum.data.data;

  const statement = async () => {
    const r = await run(() => downloadFile(`/payouts/statement.csv?from=${from}&to=${to}`, `loom-statement-${from}_${to}.csv`));
    if (!r.ok) toast.error(r.error);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" subtitle="Customer payments are held in escrow, then released to your available balance." />
      {summary.map((s) => (
        <div key={s.store_id} className="space-y-3">
          {summary.length > 1 && <h2 className="font-semibold">{s.store_name}</h2>}
          {s.on_hold && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Your payouts are on hold: {s.hold_reason}. Contact support if you have questions.</div>}
          {!s.has_payout_details && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Add where to send your money in <Link to="/seller/bank-accounts" className="font-semibold underline">Bank & mobile money</Link> to receive payouts.</div>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Available" value={formatKES(s.available)} tone="good" hint={`Minimum payout ${formatKES(s.minimum_payout)}`} />
            <Stat label="In escrow" value={formatKES(s.pending)} hint="Released after delivery is confirmed" />
            <Stat label="Being paid out" value={formatKES(s.in_payout)} />
            <Stat label="Paid to date" value={formatKES(s.lifetime_paid)} hint={`${s.payout_schedule} payouts via ${s.payout_method === 'mpesa' ? 'M-Pesa' : 'bank'}`} />
          </div>
        </div>
      ))}

      <Card title="Download a statement" actions={undefined}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Btn variant="secondary" busy={busy} onClick={statement}>Download CSV</Btn>
        </div>
      </Card>

      <div><h2 className="mb-3 font-semibold">Payout history</h2>
        {hist.loading ? <Spinner /> : (
          <Table rows={hist.data?.data ?? []} empty="No payouts yet. Your first one is created automatically once your available balance reaches the minimum." columns={[
            { header: 'Date', cell: (p) => fmtDate(p.created_at) },
            { header: 'Amount', cell: (p) => <Money value={p.amount} className="font-medium" /> },
            { header: 'Method', cell: (p) => (p.method === 'mpesa' ? 'M-Pesa' : 'Bank') },
            { header: 'Status', cell: (p) => <div><StatusBadge status={p.status} />{p.failure_reason && <p className="mt-1 text-xs text-red-700">{p.failure_reason}</p>}</div> },
            { header: 'Reference', cell: (p) => p.reference ?? '—' },
          ]} />
        )}
      </div>
    </div>
  );
};

export const SellerPayoutSettings = () => {
  useDocumentTitle('Bank & mobile money');
  const { data, loading, error, reload } = useFetch<{ data: (PayoutSummary & { mpesa_phone: string | null; bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null })[] }>('/payouts/summary');
  const s = data?.data[0];
  const [method, setMethod] = useState<'mpesa' | 'bank' | null>(null);
  const [form, setForm] = useState({ mpesa_phone: '', bank_name: '', bank_account_name: '', bank_account_number: '', payout_schedule: '' });
  const { busy, run } = useAction();
  if (loading) return <Spinner />;
  if (error || !s) return <ErrorBox message={error ?? 'Open a store first'} onRetry={reload} />;
  const m = method ?? (s.payout_method === 'mpesa' ? 'mpesa' : 'bank');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { payout_method: m, ...(form.payout_schedule ? { payout_schedule: form.payout_schedule } : {}) };
    if (m === 'mpesa') body.mpesa_phone = form.mpesa_phone || s.mpesa_phone;
    else Object.assign(body, { bank_name: form.bank_name || s.bank_name, bank_account_name: form.bank_account_name || s.bank_account_name, bank_account_number: form.bank_account_number || undefined });
    const r = await run(() => request('put', '/payouts/settings', body));
    if (!r.ok) return toast.error(r.error);
    toast.success('Payout details saved');
    await reload();
  };

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Bank & mobile money" subtitle="Where we send your earnings." />
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['mpesa', 'bank'] as const).map((k) => <button type="button" key={k} onClick={() => setMethod(k)} className={`rounded-xl border-2 p-3 text-sm font-medium ${m === k ? 'border-accent-700 bg-accent-50' : 'border-warm-gray-200'}`}>{k === 'mpesa' ? 'M-Pesa' : 'Bank transfer'}</button>)}
          </div>
          {m === 'mpesa' ? (
            <Field label="M-Pesa phone number" hint={s.mpesa_phone ? `Current: ${s.mpesa_phone}` : undefined}><input className={inputCls} type="tel" value={form.mpesa_phone} onChange={(e) => setForm({ ...form, mpesa_phone: e.target.value })} placeholder="0712 345 678" /></Field>
          ) : (
            <>
              <Field label="Bank name"><input className={inputCls} value={form.bank_name || s.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></Field>
              <Field label="Account name"><input className={inputCls} value={form.bank_account_name || s.bank_account_name || ''} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} /></Field>
              <Field label="Account number" hint={s.bank_account_number ? `Current: ${s.bank_account_number}` : undefined}><input className={inputCls} value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} /></Field>
            </>
          )}
          <Field label="Payout schedule"><select className={inputCls} value={form.payout_schedule || s.payout_schedule} onChange={(e) => setForm({ ...form, payout_schedule: e.target.value })}><option value="weekly">Weekly (Mondays)</option><option value="monthly">Monthly (1st)</option></select></Field>
          <Btn type="submit" busy={busy}>Save</Btn>
        </form>
      </Card>
      <p className="text-xs text-warm-gray-500">Changes to payout details are logged for your security. Payouts need admin approval before they are sent.</p>
    </div>
  );
};

// ===========================================================================
// Coupons
// ===========================================================================
interface CouponRow { id: string; code: string; type: 'percent' | 'fixed'; value: number; min_subtotal: number; used_count: number; usage_limit: number | null; ends_at: string | null; is_active: boolean }

export const SellerCoupons = () => {
  useDocumentTitle('Coupons');
  const { data, loading, error, reload } = useFetch<{ data: CouponRow[] }>('/seller-hub/coupons');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', type: 'percent', value: '10', min_subtotal: '0', usage_limit: '', ends_at: '' });
  const { busy, run } = useAction();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('post', '/seller-hub/coupons', {
      code: f.code, type: f.type, value: Number(f.value), min_subtotal: Number(f.min_subtotal) || 0,
      ...(f.usage_limit ? { usage_limit: Number(f.usage_limit) } : {}), ...(f.ends_at ? { ends_at: new Date(f.ends_at).toISOString() } : {}),
    }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Coupon created');
    setOpen(false); setF({ code: '', type: 'percent', value: '10', min_subtotal: '0', usage_limit: '', ends_at: '' });
    await reload();
  };

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Discounts you fund yourself. They apply only to your products." actions={<Btn onClick={() => setOpen(true)}>New coupon</Btn>} />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No coupons yet." columns={[
          { header: 'Code', cell: (c) => <span className="font-mono font-semibold">{c.code}</span> },
          { header: 'Discount', cell: (c) => (c.type === 'percent' ? `${Number(c.value)}% off` : `${formatKES(Number(c.value))} off`) },
          { header: 'Min. order', cell: (c) => (Number(c.min_subtotal) ? formatKES(Number(c.min_subtotal)) : '—') },
          { header: 'Used', cell: (c) => `${c.used_count}${c.usage_limit ? ` / ${c.usage_limit}` : ''}` },
          { header: 'Ends', cell: (c) => fmtDate(c.ends_at) },
          { header: '', cell: (c) => <Btn variant={c.is_active ? 'secondary' : 'primary'} className="px-3 py-1 text-xs" onClick={async () => { await request('patch', `/seller-hub/coupons/${c.id}`, { is_active: !c.is_active }); await reload(); }}>{c.is_active ? 'Turn off' : 'Turn on'}</Btn> },
        ]} />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New coupon">
        <form onSubmit={create} className="space-y-3">
          <Field label="Code" hint="Letters and numbers, e.g. WELCOME10"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount (KSh)</option></select></Field>
            <Field label="Value"><input type="number" className={inputCls} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
            <Field label="Minimum order (KSh)"><input type="number" className={inputCls} value={f.min_subtotal} onChange={(e) => setF({ ...f, min_subtotal: e.target.value })} /></Field>
            <Field label="Usage limit"><input type="number" className={inputCls} value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} placeholder="Unlimited" /></Field>
          </div>
          <Field label="Ends (optional)"><input type="datetime-local" className={inputCls} value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Btn type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn type="submit" busy={busy} disabled={f.code.length < 3 || !Number(f.value)}>Create</Btn></div>
        </form>
      </Modal>
    </div>
  );
};

// ===========================================================================
// Variants editor (per product)
// ===========================================================================
interface MyProduct { id: string; name: string; price: number; stock_quantity: number; has_variants: boolean }
interface VariantRow { id?: string; name: string; sku: string; price: string; stock_quantity: string; compare_at_price: string }

export const SellerVariants = () => {
  useDocumentTitle('Product options');
  const { data, loading, error, reload } = useFetch<{ data: MyProduct[] }>('/products/my?limit=100');
  const [editing, setEditing] = useState<MyProduct | null>(null);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const { busy, run } = useAction();

  const edit = async (p: MyProduct) => {
    const res = await request<{ data: { id: string; name: string; sku: string | null; price: number; stock_quantity: number; compare_at_price: number | null }[] }>('get', `/products/${p.id}/variants`);
    setRows(res.data.map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? '', price: String(v.price), stock_quantity: String(v.stock_quantity), compare_at_price: v.compare_at_price ? String(v.compare_at_price) : '' })));
    setEditing(p);
  };

  const save = async () => {
    const variants = rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), name: r.name.trim(), sku: r.sku || null, options: { Option: r.name.trim() }, price: Number(r.price), stock_quantity: Math.max(0, Math.floor(Number(r.stock_quantity) || 0)), compare_at_price: r.compare_at_price ? Number(r.compare_at_price) : null, is_active: true }));
    const r = await run(() => request('put', `/products/${editing!.id}/variants`, { variants }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Options saved');
    setEditing(null);
    await reload();
  };

  const valid = rows.every((r) => r.name.trim() && Number(r.price) >= 0 && r.price !== '');

  return (
    <div>
      <PageHeader title="Product options" subtitle="Sizes, colours and other choices, each with its own price and stock. Remove all options to sell the product normally." />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="You have no products yet." columns={[
          { header: 'Product', cell: (p) => <span className="font-medium">{p.name}</span> },
          { header: 'Price', cell: (p) => <Money value={p.price} /> },
          { header: 'Stock', cell: (p) => p.stock_quantity },
          { header: 'Options', cell: (p) => (p.has_variants ? <Badge tone="blue">Has options</Badge> : <span className="text-warm-gray-400">—</span>) },
          { header: '', cell: (p) => <Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => edit(p)}>Edit options</Btn> },
        ]} />
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Options · ${editing?.name ?? ''}`} width="max-w-3xl">
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-warm-gray-500">No options — this product is sold as a single item.</p>}
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <Field label={i === 0 ? 'Option name (e.g. Red / M)' : ''}><input className={inputCls} value={r.name} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} /></Field>
              <Field label={i === 0 ? 'Price' : ''}><input type="number" className={inputCls} value={r.price} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, price: e.target.value } : x)))} /></Field>
              <Field label={i === 0 ? 'Was price' : ''}><input type="number" className={inputCls} value={r.compare_at_price} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, compare_at_price: e.target.value } : x)))} /></Field>
              <Field label={i === 0 ? 'Stock' : ''}><input type="number" className={inputCls} value={r.stock_quantity} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, stock_quantity: e.target.value } : x)))} /></Field>
              <button type="button" aria-label="Remove option" className="mb-2 text-red-600" onClick={() => setRows(rows.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
          <Btn variant="ghost" onClick={() => setRows([...rows, { name: '', sku: '', price: String(editing?.price ?? ''), stock_quantity: '0', compare_at_price: '' }])}>+ Add option</Btn>
          <div className="flex justify-end gap-2 border-t pt-3"><Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn><Btn busy={busy} disabled={!valid} onClick={save}>Save options</Btn></div>
        </div>
      </Modal>
    </div>
  );
};

// ===========================================================================
// Inbox: customer questions + conversations
// ===========================================================================
import { MessagesPage } from '../shared/MessagesPage';

interface QuestionRow { id: string; question: string; answer: string | null; product_name: string; product_slug: string; created_at: string }

export const SellerInbox = () => {
  useDocumentTitle('Messages');
  const { data, loading, reload } = useFetch<{ data: QuestionRow[] }>('/seller-hub/questions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  const open = (data?.data ?? []).filter((q) => !q.answer);

  const answer = async (id: string) => {
    const r = await run(() => request('post', `/questions/${id}/answer`, { answer: answers[id] }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Answer posted');
    await reload();
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">Product questions {open.length > 0 && <Badge tone="amber">{open.length} waiting</Badge>}</h2>
        {loading ? <Spinner /> : open.length === 0 ? <Empty title="No unanswered questions" /> : (
          <ul className="space-y-3">{open.map((q) => (
            <li key={q.id} className="rounded-xl border border-warm-gray-200 bg-white p-4 text-sm">
              <Link to={`/product/${q.product_slug}`} className="text-xs text-accent-700 hover:underline">{q.product_name}</Link>
              <p className="mt-1 font-medium">{q.question}</p>
              <div className="mt-2 flex gap-2"><input className={inputCls} placeholder="Your answer" value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} /><Btn busy={busy} disabled={(answers[q.id] ?? '').trim().length < 2} onClick={() => answer(q.id)}>Reply</Btn></div>
            </li>))}</ul>
        )}
      </section>
      <MessagesPage />
    </div>
  );
};
