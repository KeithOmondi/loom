// Back-office screens for admin / finance / support.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Badge, Btn, Card, Empty, ErrorBox, Field, Modal, Money, PageHeader, Spinner, Stat, StatusBadge, Table, fmtDate, inputCls } from '../../components/ui/kit';
import { downloadFile, request, useAction, useFetch } from '../../lib/http';
import { formatKES } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useAppSelector } from '../../store/hooks';

const Tabs = ({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) => (
  <div className="mb-4 flex gap-1 overflow-x-auto" role="tablist">
    {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${value === k ? 'bg-accent-700 text-white' : 'bg-white text-warm-gray-700 hover:bg-warm-gray-100'}`}>{l}</button>)}
  </div>
);

const useDo = (reload: () => unknown) => {
  const { busy, run } = useAction();
  const act = async (fn: () => Promise<unknown>, ok: string) => { const r = await run(fn); if (!r.ok) { toast.error(r.error); return false; } toast.success(ok); await reload(); return true; };
  return { busy, act };
};

// ===========================================================================
// Dashboard
// ===========================================================================
interface AdminDash {
  period_days: number; gmv: number; orders: number; average_order_value: number; commission_earned: number; commission_in_escrow: number; delivery_fees_collected: number; delivery_fees_in_escrow: number;
  active_vendors: number; total_vendors: number; customers: number; new_customers: number; open_disputes: number; disputes_needing_review: number;
  pending_refunds: number; pending_refunds_amount: number; payouts_processing: number; payouts_processing_amount: number; balance_holds: number; open_fraud_flags: number;
  series: { day: string; gmv: number; orders: number }[]; orders_by_status: { status: string; n: number }[];
}

export const AdminDashboard = () => {
  useDocumentTitle('Dashboard');
  const role = useAppSelector((s) => s.auth.user?.role);
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useFetch<{ data: AdminDash }>(`/admin/dashboard?days=${days}`);
  const d = data?.data;
  const max = Math.max(1, ...(d?.series.map((s) => s.gmv) ?? [1]));
  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle={`Marketplace performance · ${role?.replace('_', ' ')}`} actions={<select className={`${inputCls} w-auto`} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">{[7, 30, 90, 365].map((n) => <option key={n} value={n}>Last {n} days</option>)}</select>} />
      {loading && !d ? <Spinner /> : error || !d ? <ErrorBox message={error ?? 'No data'} onRetry={reload} /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="GMV" value={formatKES(d.gmv)} hint={`${d.orders} paid orders`} />
            <Stat label="Avg. order" value={formatKES(Math.round(d.average_order_value))} />
            <Stat label="Commission earned" value={formatKES(d.commission_earned)} tone="good" hint={`${formatKES(d.commission_in_escrow)} still in escrow`} />
            <Stat label="Delivery fees" value={formatKES(d.delivery_fees_collected)} hint={`for couriers · ${formatKES(d.delivery_fees_in_escrow)} in escrow`} />
            <Stat label="Active vendors" value={`${d.active_vendors} / ${d.total_vendors}`} hint={`${d.customers} customers (+${d.new_customers})`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/disputes"><Stat label="Open disputes" value={d.open_disputes} tone={d.disputes_needing_review ? 'warn' : undefined} hint={`${d.disputes_needing_review} need review`} /></Link>
            <Link to="/admin/refunds"><Stat label="Refunds to approve" value={d.pending_refunds} tone={d.pending_refunds ? 'warn' : undefined} hint={formatKES(d.pending_refunds_amount)} /></Link>
            <Link to="/admin/payouts"><Stat label="Payouts processing" value={d.payouts_processing} hint={formatKES(d.payouts_processing_amount)} /></Link>
            <Link to="/admin/fraud"><Stat label="Fraud flags" value={d.open_fraud_flags} tone={d.open_fraud_flags ? 'warn' : undefined} hint={`${d.balance_holds} balance holds`} /></Link>
          </div>
          <Card title="Sales (GMV) by day">
            <div className="flex h-40 items-end gap-1">{d.series.map((s) => <div key={s.day} className="flex-1" title={`${fmtDate(s.day)}: ${formatKES(s.gmv)} · ${s.orders} orders`}><div className="w-full rounded-t bg-accent-500 hover:bg-accent-700" style={{ height: `${Math.max(2, (s.gmv / max) * 100)}%` }} /></div>)}</div>
          </Card>
          <Card title="Orders by status"><div className="flex flex-wrap gap-3">{d.orders_by_status.map((s) => <div key={s.status} className="flex items-center gap-2 text-sm"><StatusBadge status={s.status} /><strong>{s.n}</strong></div>)}</div></Card>
        </>
      )}
    </div>
  );
};

// ===========================================================================
// Orders / returns lists (support view)
// ===========================================================================
export const AdminOrders = () => {
  useDocumentTitle('Orders');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch<{ data: { id: string; order_number: string; status: string; payment_status: string; escrow_status: string; total: number; placed_at: string; store_name: string; customer_name: string; customer_email: string }[] }>(`/admin/orders?q=${encodeURIComponent(q)}&status=${status}`);
  return (
    <div>
      <PageHeader title="Orders" />
      <div className="mb-4 flex flex-wrap gap-2"><input className={`${inputCls} max-w-xs`} placeholder="Search order #, customer email, store…" value={q} onChange={(e) => setQ(e.target.value)} /><select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].map((s) => <option key={s}>{s}</option>)}</select></div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No orders match." columns={[
          { header: 'Order', cell: (o) => <div><p className="font-medium">{o.order_number}</p><p className="text-xs text-warm-gray-500">{fmtDate(o.placed_at, true)}</p></div> },
          { header: 'Customer', cell: (o) => <span className="text-xs">{o.customer_name}<br />{o.customer_email}</span> },
          { header: 'Store', cell: (o) => o.store_name },
          { header: 'Total', cell: (o) => <Money value={o.total} /> },
          { header: 'Status', cell: (o) => <div className="space-y-1"><StatusBadge status={o.status} /><p className="text-xs text-warm-gray-500">escrow: {o.escrow_status}</p></div> },
        ]} />
      )}
    </div>
  );
};

export const AdminReturns = () => {
  useDocumentTitle('Returns');
  const { data, loading, error, reload } = useFetch<{ data: { id: string; order_number: string; product_name: string; reason: string; status: string; store_name: string; created_at: string; refund_amount: number | null }[] }>('/returns');
  return (
    <div>
      <PageHeader title="Returns" subtitle="Seller-handled. Rejected returns the customer escalates appear under Disputes." />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No returns." columns={[
          { header: 'Item', cell: (r) => <div><p className="font-medium">{r.product_name}</p><p className="text-xs text-warm-gray-500">Order {r.order_number} · {r.store_name}</p></div> },
          { header: 'Reason', cell: (r) => r.reason }, { header: 'Status', cell: (r) => <StatusBadge status={r.status === 'pending' ? 'requested' : r.status} /> },
          { header: 'Refund', cell: (r) => (r.refund_amount ? <Money value={r.refund_amount} /> : '—') }, { header: 'Date', cell: (r) => fmtDate(r.created_at) },
        ]} />
      )}
    </div>
  );
};

// ===========================================================================
// Refunds (finance)
// ===========================================================================
interface RefundRow { id: string; order_number: string; customer_name: string; store_name: string; amount: number; method: string; status: string; reason: string | null; reference: string | null; created_at: string }

export const AdminRefunds = () => {
  useDocumentTitle('Refunds');
  const [tab, setTab] = useState('pending');
  const { data, loading, error, reload } = useFetch<{ data: RefundRow[] }>(`/refunds?status=${tab}`);
  const { busy, act } = useDo(reload);
  const [target, setTarget] = useState<RefundRow | null>(null);
  const [method, setMethod] = useState<'wallet' | 'original'>('wallet');
  const [ref, setRef] = useState('');
  const [rejecting, setRejecting] = useState<RefundRow | null>(null);
  const [why, setWhy] = useState('');
  const canApprove = ['admin', 'super_admin', 'finance'].includes(useAppSelector((s) => s.auth.user?.role) ?? '');

  return (
    <div>
      <PageHeader title="Refunds" subtitle="Approving a refund moves the money from the seller's balance or escrow to the customer." />
      <Tabs tabs={[['pending', 'To approve'], ['processed', 'Processed'], ['rejected', 'Rejected']]} value={tab} onChange={setTab} />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="Nothing here." columns={[
          { header: 'Order', cell: (r) => <div><p className="font-medium">{r.order_number}</p><p className="text-xs text-warm-gray-500">{r.customer_name} ← {r.store_name}</p></div> },
          { header: 'Amount', cell: (r) => <Money value={r.amount} className="font-semibold" /> },
          { header: 'Customer wants', cell: (r) => (r.method === 'wallet' ? 'Loom wallet' : 'M-Pesa') },
          { header: 'Reason', cell: (r) => <span className="text-xs">{r.reason}</span> },
          { header: 'Status', cell: (r) => <div><StatusBadge status={r.status} />{r.reference && <p className="text-xs text-warm-gray-500">Ref {r.reference}</p>}</div> },
          { header: '', cell: (r) => r.status === 'pending' && canApprove && <div className="flex flex-col gap-1.5"><Btn className="px-3 py-1.5 text-xs" onClick={() => { setTarget(r); setMethod(r.method as 'wallet' | 'original'); setRef(''); }}>Approve</Btn><Btn className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => { setRejecting(r); setWhy(''); }}>Reject</Btn></div> },
        ]} />
      )}
      <Modal open={!!target} onClose={() => setTarget(null)} title={`Approve refund of ${target ? formatKES(Number(target.amount)) : ''}`}>
        <div className="space-y-3">
          <Field label="Pay the customer via"><select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as 'wallet' | 'original')}><option value="wallet">Loom wallet (instant)</option><option value="original">M-Pesa (you send it manually)</option></select></Field>
          {method === 'original' && <Field label="M-Pesa reference of the money you sent" hint="Required — it is recorded against the refund"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} /></Field>}
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setTarget(null)}>Cancel</Btn><Btn busy={busy} disabled={method === 'original' && ref.length < 6} onClick={async () => { if (await act(() => request('post', `/refunds/${target!.id}/approve`, { method, ...(method === 'original' ? { reference: ref } : {}) }), 'Refund approved')) setTarget(null); }}>Approve refund</Btn></div>
        </div>
      </Modal>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject refund">
        <Field label="Reason"><textarea className={inputCls} rows={3} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <div className="mt-3 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setRejecting(null)}>Cancel</Btn><Btn variant="danger" busy={busy} disabled={why.trim().length < 3} onClick={async () => { if (await act(() => request('post', `/refunds/${rejecting!.id}/reject`, { reason: why }), 'Refund rejected')) setRejecting(null); }}>Reject</Btn></div>
      </Modal>
    </div>
  );
};

// ===========================================================================
// Payouts (finance)
// ===========================================================================
interface Batch { id: string; label: string; status: string; total_amount: number; payout_count: number; paid_count: number; created_at: string }
interface PayoutAdmin { id: string; batch_id: string; store_name: string; amount: number; method: string; status: string; destination: Record<string, string>; failure_reason: string | null; reference: string | null; attempts: number }

export const AdminPayouts = () => {
  useDocumentTitle('Payouts');
  const batches = useFetch<{ data: Batch[] }>('/payouts/admin/batches');
  const [batchId, setBatchId] = useState<string | null>(null);
  const payouts = useFetch<{ data: PayoutAdmin[] }>(`/payouts/admin/payouts${batchId ? `?batch_id=${batchId}` : ''}`);
  const holds = useFetch<{ data: { id: string; store_id: string; store_name: string; reason: string; created_at: string }[] }>('/payouts/admin/holds');
  const reloadAll = () => { void batches.reload(); void payouts.reload(); void holds.reload(); };
  const { busy, act } = useDo(reloadAll);
  const [paying, setPaying] = useState<PayoutAdmin | null>(null);
  const [ref, setRef] = useState('');
  const [failing, setFailing] = useState<PayoutAdmin | null>(null);
  const [why, setWhy] = useState('');

  return (
    <div className="space-y-8">
      <PageHeader title="Payouts" subtitle="Batches are drafted on schedule. Nothing is sent until you approve — then pay each vendor and record the reference." actions={<Btn busy={busy} onClick={() => act(() => request('post', '/payouts/admin/batches/generate', { schedule: 'all' }), 'Batch generated (if any vendor is eligible)')}>Generate batch now</Btn>} />

      <section>
        <h2 className="mb-3 font-semibold">Batches</h2>
        {batches.loading ? <Spinner /> : (
          <Table rows={batches.data?.data ?? []} empty="No batches yet." columns={[
            { header: 'Batch', cell: (b) => <button className="text-left" onClick={() => setBatchId(batchId === b.id ? null : b.id)}><p className="font-medium text-accent-700 underline">{b.label}</p><p className="text-xs text-warm-gray-500">{fmtDate(b.created_at, true)}</p></button> },
            { header: 'Total', cell: (b) => <Money value={b.total_amount} className="font-semibold" /> },
            { header: 'Progress', cell: (b) => `${b.paid_count} / ${b.payout_count} paid` }, { header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
            { header: '', cell: (b) => b.status === 'draft' && <div className="flex gap-2"><Btn className="px-3 py-1.5 text-xs" busy={busy} onClick={() => { if (confirm(`Approve this batch of ${formatKES(Number(b.total_amount))}?`)) void act(() => request('post', `/payouts/admin/batches/${b.id}/approve`, {}), 'Batch approved'); }}>Approve</Btn><Btn className="px-3 py-1.5 text-xs" variant="secondary" busy={busy} onClick={() => act(() => request('post', `/payouts/admin/batches/${b.id}/cancel`, {}), 'Batch cancelled')}>Cancel</Btn></div> },
          ]} />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{batchId ? 'Payouts in selected batch' : 'Recent payouts'} {batchId && <button className="ml-2 text-sm text-accent-700 underline" onClick={() => setBatchId(null)}>show all</button>}</h2>
        {payouts.loading ? <Spinner /> : (
          <Table rows={payouts.data?.data ?? []} empty="No payouts." columns={[
            { header: 'Vendor', cell: (p) => <span className="font-medium">{p.store_name}</span> },
            { header: 'Amount', cell: (p) => <Money value={p.amount} className="font-semibold" /> },
            { header: 'Send to', cell: (p) => <span className="text-xs">{p.method === 'mpesa' ? `M-Pesa ${p.destination.phone}` : `${p.destination.bank_name} · ${p.destination.account_name} · ${p.destination.account_number}`}</span> },
            { header: 'Status', cell: (p) => <div><StatusBadge status={p.status} />{p.failure_reason && <p className="text-xs text-red-700">{p.failure_reason}</p>}{p.reference && <p className="text-xs text-warm-gray-500">Ref {p.reference}</p>}</div> },
            { header: '', cell: (p) => (
              <div className="flex flex-col gap-1.5">
                {p.status === 'processing' && <><Btn className="px-3 py-1.5 text-xs" onClick={() => { setPaying(p); setRef(''); }}>Mark paid</Btn><Btn className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => { setFailing(p); setWhy(''); }}>Failed</Btn></>}
                {p.status === 'failed' && <Btn className="px-3 py-1.5 text-xs" busy={busy} onClick={() => act(() => request('post', `/payouts/admin/payouts/${p.id}/retry`, {}), 'Payout re-queued')}>Retry</Btn>}
              </div>) },
          ]} />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Balance holds</h2>
        <p className="mb-2 text-sm text-warm-gray-600">A held vendor is skipped by every payout batch (e.g. while a fraud or quality investigation is open).</p>
        <HoldForm onDone={reloadAll} />
        <div className="mt-3"><Table rows={holds.data?.data ?? []} empty="No active holds." columns={[{ header: 'Store', cell: (h) => h.store_name }, { header: 'Reason', cell: (h) => h.reason }, { header: 'Since', cell: (h) => fmtDate(h.created_at) }, { header: '', cell: (h) => <Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => act(() => request('delete', `/payouts/admin/holds/${h.store_id}`), 'Hold released')}>Release</Btn> }]} /></div>
      </section>

      <Modal open={!!paying} onClose={() => setPaying(null)} title={`Mark paid · ${paying?.store_name}`}>
        <p className="mb-3 text-sm text-warm-gray-600">Send <strong>{paying && formatKES(Number(paying.amount))}</strong> to the vendor, then record the {paying?.method === 'mpesa' ? 'M-Pesa transaction code' : 'bank reference'}.</p>
        <Field label="Reference"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <div className="mt-3 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setPaying(null)}>Cancel</Btn><Btn busy={busy} disabled={ref.trim().length < 3} onClick={async () => { if (await act(() => request('post', `/payouts/admin/payouts/${paying!.id}/paid`, { reference: ref.trim() }), 'Marked as paid')) setPaying(null); }}>Confirm paid</Btn></div>
      </Modal>
      <Modal open={!!failing} onClose={() => setFailing(null)} title="Mark payout failed">
        <p className="mb-3 text-sm text-warm-gray-600">The money returns to the vendor&apos;s available balance and they are notified.</p>
        <Field label="Why did it fail?"><input className={inputCls} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Invalid M-Pesa number" /></Field>
        <div className="mt-3 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setFailing(null)}>Cancel</Btn><Btn variant="danger" busy={busy} disabled={why.trim().length < 3} onClick={async () => { if (await act(() => request('post', `/payouts/admin/payouts/${failing!.id}/failed`, { reason: why }), 'Marked as failed')) setFailing(null); }}>Mark failed</Btn></div>
      </Modal>
    </div>
  );
};

const HoldForm = ({ onDone }: { onDone: () => void }) => {
  const stores = useFetch<{ data: { id: string; name: string }[] }>('/admin/stores');
  const [storeId, setStoreId] = useState('');
  const [reason, setReason] = useState('');
  const { busy, act } = useDo(onDone);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Store"><select className={`${inputCls} min-w-[14rem]`} value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">Choose…</option>{(stores.data?.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Reason"><input className={`${inputCls} min-w-[16rem]`} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Btn busy={busy} disabled={!storeId || reason.trim().length < 3} onClick={async () => {
        if (await act(() => request('post', '/payouts/admin/holds', { store_id: storeId, reason: reason.trim() }), 'Hold placed — the vendor was notified')) { setStoreId(''); setReason(''); }
      }}>Place hold</Btn>
    </div>
  );
};

// ===========================================================================
// Escrow & ledger
// ===========================================================================
interface Escrow { vendor_held: number; commission_held: number; delivery_held: number; held_orders: number; locked_orders: number; vendors_available: number; customer_wallets: number; mpesa_clearing: number; payouts_in_transit: number; ledger_balanced: boolean; ledger_difference: number; holds: { order_id: string; order_number: string; store_name: string; status: string; vendor_amount: number; commission_amount: number; release_after: string | null; dispute_locked: boolean; order_status: string }[] }

export const AdminEscrow = () => {
  useDocumentTitle('Escrow & ledger');
  const { data, loading, error, reload } = useFetch<{ data: Escrow }>('/admin/escrow');
  const ledger = useFetch<{ data: { id: string; type: string; description: string | null; created_at: string; entries: { account: string; direction: string; amount: number }[] }[] }>('/admin/ledger?limit=40');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? 'No data'} onRetry={reload} />;
  const e = data.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Escrow & ledger" subtitle="Every figure is derived from the double-entry ledger." actions={<Badge tone={e.ledger_balanced ? 'green' : 'red'}>{e.ledger_balanced ? 'Ledger balanced' : `UNBALANCED by ${e.ledger_difference}`}</Badge>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vendor money in escrow" value={formatKES(e.vendor_held)} hint={`${e.held_orders} orders`} />
        <Stat label="Commission in escrow" value={formatKES(e.commission_held)} />
        <Stat label="Delivery fees in escrow" value={formatKES(e.delivery_held)} hint="Loom's, to pay couriers" />
        <Stat label="Owed to vendors (available)" value={formatKES(e.vendors_available)} />
        <Stat label="Customer wallet credit" value={formatKES(e.customer_wallets)} />
        <Stat label="M-Pesa clearing" value={formatKES(e.mpesa_clearing)} hint="cash in − cash out" />
        <Stat label="Payouts in transit" value={formatKES(e.payouts_in_transit)} />
        <Stat label="Locked by disputes" value={e.locked_orders} tone={e.locked_orders ? 'warn' : undefined} />
      </div>
      <section><h2 className="mb-3 font-semibold">Orders currently in escrow</h2>
        <Table rows={e.holds.map((h) => ({ ...h, id: h.order_id }))} empty="Nothing is held right now." columns={[
          { header: 'Order', cell: (h) => <span className="font-medium">{h.order_number}</span> }, { header: 'Vendor', cell: (h) => h.store_name },
          { header: 'Vendor share', cell: (h) => <Money value={h.vendor_amount} /> }, { header: 'Commission', cell: (h) => <Money value={h.commission_amount} /> },
          { header: 'Releases', cell: (h) => (h.dispute_locked ? <Badge tone="red">Locked — dispute</Badge> : h.release_after ? fmtDate(h.release_after) : <span className="text-warm-gray-400">after delivery</span>) },
          { header: 'Order', cell: (h) => <StatusBadge status={h.order_status} /> },
        ]} /></section>
      <section><h2 className="mb-3 font-semibold">Recent ledger transactions</h2>
        {ledger.loading ? <Spinner /> : (
          <ul className="space-y-2 text-sm">{(ledger.data?.data ?? []).map((t) => (
            <li key={t.id} className="rounded-xl border border-warm-gray-200 bg-white p-3">
              <div className="flex justify-between"><span className="font-medium capitalize">{t.type.replace(/_/g, ' ')}</span><span className="text-xs text-warm-gray-500">{fmtDate(t.created_at, true)}</span></div>
              {t.description && <p className="text-xs text-warm-gray-500">{t.description}</p>}
              <ul className="mt-2 grid gap-x-6 gap-y-0.5 font-mono text-xs sm:grid-cols-2">{t.entries.map((en, i) => <li key={i} className="flex justify-between"><span className="truncate">{en.direction === 'debit' ? 'Dr' : 'Cr'} {en.account.replace(/[0-9a-f-]{36}/, '…')}</span><span>{Number(en.amount).toFixed(2)}</span></li>)}</ul>
            </li>))}</ul>
        )}
      </section>
    </div>
  );
};

// ===========================================================================
// Fraud, audit, notifications, reports
// ===========================================================================
export const AdminFraud = () => {
  useDocumentTitle('Fraud flags');
  const { data, loading, error, reload } = useFetch<{ data: { id: string; entity_type: string; entity_id: string; signal: string; severity: string; details: Record<string, unknown>; created_at: string }[] }>('/admin/fraud?status=open');
  const { busy, act } = useDo(reload);
  return (
    <div>
      <PageHeader title="Fraud flags" subtitle="Automatic signals for review — nobody is blocked automatically." />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No open flags." columns={[
          { header: 'Signal', cell: (f) => <div><p className="font-medium capitalize">{f.signal.replace(/_/g, ' ')}</p><p className="text-xs text-warm-gray-500">{f.entity_type} {f.entity_id.slice(0, 8)}…</p></div> },
          { header: 'Severity', cell: (f) => <Badge tone={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'gray'}>{f.severity}</Badge> },
          { header: 'Details', cell: (f) => <code className="text-xs">{JSON.stringify(f.details)}</code> }, { header: 'Raised', cell: (f) => fmtDate(f.created_at, true) },
          { header: '', cell: (f) => <div className="flex gap-2"><Btn className="px-3 py-1 text-xs" busy={busy} onClick={() => act(() => request('post', `/admin/fraud/${f.id}/review`, { status: 'reviewed' }), 'Marked reviewed')}>Reviewed</Btn><Btn className="px-3 py-1 text-xs" variant="secondary" onClick={() => act(() => request('post', `/admin/fraud/${f.id}/review`, { status: 'dismissed' }), 'Dismissed')}>Dismiss</Btn></div> },
        ]} />
      )}
    </div>
  );
};

export const AdminAudit = () => {
  useDocumentTitle('Audit log');
  const [action, setAction] = useState('');
  const { data, loading, error, reload } = useFetch<{ data: { id: number; actor_name: string | null; actor_role: string | null; action: string; entity_type: string | null; entity_id: string | null; metadata: Record<string, unknown>; created_at: string }[] }>(`/admin/audit-logs?action=${encodeURIComponent(action)}`);
  return (
    <div>
      <PageHeader title="Audit log" subtitle="A permanent record of sensitive actions." />
      <select className={`${inputCls} mb-4 w-auto`} value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter"><option value="">All actions</option>{['order.', 'refund.', 'payout.', 'dispute.', 'return.', 'settings.', 'coupon.', 'commission.', 'report.'].map((a) => <option key={a} value={a}>{a}*</option>)}</select>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={(data?.data ?? []).map((l) => ({ ...l, id: String(l.id) }))} empty="No entries." columns={[
          { header: 'When', cell: (l) => fmtDate(l.created_at, true) }, { header: 'Who', cell: (l) => <span className="text-xs">{l.actor_name ?? 'system'}<br /><span className="text-warm-gray-500">{l.actor_role}</span></span> },
          { header: 'Action', cell: (l) => <span className="font-mono text-xs">{l.action}</span> }, { header: 'Target', cell: (l) => <span className="text-xs">{l.entity_type} {l.entity_id?.slice(0, 8)}</span> },
          { header: 'Details', cell: (l) => <code className="block max-w-xs truncate text-xs" title={JSON.stringify(l.metadata)}>{JSON.stringify(l.metadata)}</code> },
        ]} />
      )}
    </div>
  );
};

export const AdminReports = () => {
  useDocumentTitle('Reports');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { busy, run } = useAction();
  const reports: [string, string, string][] = [['orders', 'Orders', 'Every paid order with totals and commission'], ['commissions', 'Commission', 'Released commission per order'], ['payouts', 'Payouts', 'Vendor payouts and their status'], ['refunds', 'Refunds', 'Refund requests and outcomes'], ['vendors', 'Vendors', 'Sales and commission per store'], ['ledger', 'Ledger', 'Every double-entry line in the range']];
  return (
    <div>
      <PageHeader title="Reports" subtitle="Download as CSV (opens in Excel and Google Sheets)." />
      <div className="mb-5 flex flex-wrap gap-3"><Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map(([k, title, hint]) => (
          <Card key={k}><p className="font-semibold">{title}</p><p className="mb-3 text-sm text-warm-gray-500">{hint}</p>
            <Btn variant="secondary" busy={busy} onClick={async () => { const r = await run(() => downloadFile(`/admin/reports/${k}.csv?from=${from}&to=${to}`, `loom-${k}-${from}_${to}.csv`)); if (!r.ok) toast.error(r.error); }}>Download CSV</Btn></Card>
        ))}
      </div>
    </div>
  );
};

// ===========================================================================
// Promotions (coupons, flash sales, banners)
// ===========================================================================
export const AdminPromotions = () => {
  useDocumentTitle('Promotions');
  const [tab, setTab] = useState('coupons');
  return (
    <div>
      <PageHeader title="Promotions" />
      <Tabs tabs={[['coupons', 'Coupons'], ['flash', 'Flash sales'], ['banners', 'Home banners']]} value={tab} onChange={setTab} />
      {tab === 'coupons' ? <CouponsAdmin /> : tab === 'flash' ? <FlashAdmin /> : <BannersAdmin />}
    </div>
  );
};

const CouponsAdmin = () => {
  const { data, loading, error, reload } = useFetch<{ data: { id: string; code: string; type: string; value: number; min_subtotal: number; used_count: number; usage_limit: number | null; scope: string; store_name: string | null; ends_at: string | null; is_active: boolean }[] }>('/admin/coupons');
  const { busy, act } = useDo(reload);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', type: 'percent', value: '10', min_subtotal: '0', usage_limit: '', per_user_limit: '1', ends_at: '', max_discount: '' });
  return (
    <>
      <div className="mb-3 flex justify-end"><Btn onClick={() => setOpen(true)}>New platform coupon</Btn></div>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No coupons." columns={[
          { header: 'Code', cell: (c) => <span className="font-mono font-semibold">{c.code}</span> }, { header: 'Discount', cell: (c) => (c.type === 'percent' ? `${Number(c.value)}%` : formatKES(Number(c.value))) },
          { header: 'Scope', cell: (c) => (c.scope === 'store' ? <Badge tone="blue">{c.store_name}</Badge> : <Badge tone="purple">Platform-funded</Badge>) },
          { header: 'Used', cell: (c) => `${c.used_count}${c.usage_limit ? ` / ${c.usage_limit}` : ''}` }, { header: 'Ends', cell: (c) => fmtDate(c.ends_at) },
          { header: '', cell: (c) => <Btn variant="secondary" className="px-3 py-1 text-xs" busy={busy} onClick={() => act(() => request('patch', `/admin/coupons/${c.id}`, { is_active: !c.is_active }), 'Updated')}>{c.is_active ? 'Turn off' : 'Turn on'}</Btn> },
        ]} />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New platform coupon">
        <p className="mb-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-900">Platform coupons are paid for by Loom: vendors still receive their full earnings.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed (KSh)</option></select></Field>
          <Field label="Value"><input type="number" className={inputCls} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Max discount (KSh)"><input type="number" className={inputCls} value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} /></Field>
          <Field label="Min. order (KSh)"><input type="number" className={inputCls} value={f.min_subtotal} onChange={(e) => setF({ ...f, min_subtotal: e.target.value })} /></Field>
          <Field label="Total uses"><input type="number" className={inputCls} value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} placeholder="Unlimited" /></Field>
          <Field label="Uses per customer"><input type="number" className={inputCls} value={f.per_user_limit} onChange={(e) => setF({ ...f, per_user_limit: e.target.value })} /></Field>
          <Field label="Ends"><input type="datetime-local" className={inputCls} value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn busy={busy} disabled={f.code.length < 3 || !Number(f.value)} onClick={async () => { if (await act(() => request('post', '/admin/coupons', { code: f.code, type: f.type, value: Number(f.value), min_subtotal: Number(f.min_subtotal) || 0, per_user_limit: Number(f.per_user_limit) || 1, ...(f.usage_limit ? { usage_limit: Number(f.usage_limit) } : {}), ...(f.max_discount ? { max_discount: Number(f.max_discount) } : {}), ...(f.ends_at ? { ends_at: new Date(f.ends_at).toISOString() } : {}) }), 'Coupon created')) setOpen(false); }}>Create</Btn></div>
      </Modal>
    </>
  );
};

const FlashAdmin = () => {
  const { data, loading, error, reload } = useFetch<{ data: { id: string; title: string; starts_at: string; ends_at: string; is_active: boolean; items: { name: string; price: number; sale_price: number; sold: number; quantity_limit: number | null }[] }[] }>('/admin/flash-sales');
  const products = useFetch<{ data: { id: string; name: string; price: number }[] }>('/products?limit=100');
  const { busy, act } = useDo(reload);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', starts_at: '', ends_at: '', product_id: '', sale_price: '', quantity_limit: '' });
  const picked = products.data?.data.find((p) => p.id === f.product_id);
  return (
    <>
      <div className="mb-3 flex justify-end"><Btn onClick={() => setOpen(true)}>New flash sale</Btn></div>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.data.length ? <Empty title="No flash sales" hint="Create one to feature discounted products on the home page." /> : (
        <ul className="space-y-3">{data.data.map((s) => (
          <li key={s.id} className="rounded-xl border border-warm-gray-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{s.title}</p><p className="text-xs text-warm-gray-500">{fmtDate(s.starts_at, true)} → {fmtDate(s.ends_at, true)}</p></div>
              <Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => act(() => request('patch', `/admin/flash-sales/${s.id}`, { is_active: !s.is_active }), 'Updated')}>{s.is_active ? 'Turn off' : 'Turn on'}</Btn></div>
            <ul className="mt-2 text-xs text-warm-gray-700">{s.items.map((i, k) => <li key={k}>{i.name}: <s>{formatKES(Number(i.price))}</s> → <strong>{formatKES(Number(i.sale_price))}</strong> · sold {i.sold}{i.quantity_limit ? `/${i.quantity_limit}` : ''}</li>)}</ul>
          </li>))}</ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New flash sale">
        <div className="space-y-3">
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Weekend deals" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Starts"><input type="datetime-local" className={inputCls} value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></Field><Field label="Ends"><input type="datetime-local" className={inputCls} value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></Field></div>
          <Field label="Product"><select className={inputCls} value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}><option value="">Choose…</option>{(products.data?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name.slice(0, 60)} — {formatKES(Number(p.price))}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Sale price (KSh)" hint={picked ? `Normal price ${formatKES(Number(picked.price))}` : undefined}><input type="number" className={inputCls} value={f.sale_price} onChange={(e) => setF({ ...f, sale_price: e.target.value })} /></Field><Field label="Units on sale"><input type="number" className={inputCls} value={f.quantity_limit} onChange={(e) => setF({ ...f, quantity_limit: e.target.value })} placeholder="No limit" /></Field></div>
          <p className="text-xs text-warm-gray-500">Add more products by creating the sale then another with the same window.</p>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn busy={busy} disabled={!f.title || !f.starts_at || !f.ends_at || !f.product_id || !Number(f.sale_price)} onClick={async () => { if (await act(() => request('post', '/admin/flash-sales', { title: f.title, starts_at: new Date(f.starts_at).toISOString(), ends_at: new Date(f.ends_at).toISOString(), items: [{ product_id: f.product_id, sale_price: Number(f.sale_price), ...(f.quantity_limit ? { quantity_limit: Number(f.quantity_limit) } : {}) }] }), 'Flash sale created')) setOpen(false); }}>Create</Btn></div>
        </div>
      </Modal>
    </>
  );
};

const BannersAdmin = () => {
  const { data, loading, error, reload } = useFetch<{ data: { id: string; title: string; subtitle: string | null; link_url: string | null; image_url: string | null; is_active: boolean; sort_order: number }[] }>('/admin/banners');
  const { busy, act } = useDo(reload);
  const [f, setF] = useState({ title: '', subtitle: '', link_url: '', image_url: '' });
  return (
    <>
      <Card title="Add a home-page banner" className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Subtitle"><input className={inputCls} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
          <Field label="Link (e.g. /shop?category=electronics)"><input className={inputCls} value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} /></Field>
          <Field label="Image URL (optional)"><input className={inputCls} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
        </div>
        <Btn className="mt-3" busy={busy} disabled={f.title.trim().length < 2} onClick={async () => { if (await act(() => request('post', '/admin/banners', { title: f.title, subtitle: f.subtitle || null, link_url: f.link_url || null, image_url: f.image_url || null }), 'Banner added')) setF({ title: '', subtitle: '', link_url: '', image_url: '' }); }}>Add banner</Btn>
      </Card>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No banners — the home page shows its default hero." columns={[
          { header: 'Banner', cell: (b) => <div><p className="font-medium">{b.title}</p><p className="text-xs text-warm-gray-500">{b.subtitle}</p></div> }, { header: 'Link', cell: (b) => b.link_url ?? '—' },
          { header: 'Status', cell: (b) => <Badge tone={b.is_active ? 'green' : 'gray'}>{b.is_active ? 'live' : 'off'}</Badge> },
          { header: '', cell: (b) => <div className="flex gap-2"><Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => act(() => request('patch', `/admin/banners/${b.id}`, { is_active: !b.is_active }), 'Updated')}>{b.is_active ? 'Turn off' : 'Turn on'}</Btn><Btn variant="danger" className="px-3 py-1 text-xs" onClick={() => { if (confirm('Delete this banner?')) void act(() => request('delete', `/admin/banners/${b.id}`), 'Deleted'); }}>Delete</Btn></div> },
        ]} />
      )}
    </>
  );
};

// ===========================================================================
// Delivery (zones + pickup stations)
// ===========================================================================
export const AdminDelivery = () => {
  useDocumentTitle('Delivery');
  const zones = useFetch<{ data: { id: string; name: string; counties: string[]; areas: string[]; base_fee: number; per_kg_fee: number; free_over: number | null; est_days_min: number; est_days_max: number; is_active: boolean }[] }>('/admin/shipping-zones');
  const stations = useFetch<{ data: { id: string; name: string; county: string; address: string; fee: number; is_active: boolean }[] }>('/admin/pickup-stations');
  const { busy, act } = useDo(() => { void zones.reload(); void stations.reload(); });
  const [z, setZ] = useState({ id: '', name: '', counties: '', areas: '', base_fee: '', per_kg_fee: '0', free_over: '', est_days_min: '2', est_days_max: '5' });
  const [s, setS] = useState({ name: '', county: '', address: '', fee: '0' });

  return (
    <div className="space-y-8">
      <PageHeader title="Delivery" subtitle="Fees are base + per extra kg. A customer's neighbourhood is matched first, then their county; anything unmatched uses the default fee in Settings. Loom keeps the delivery fee to pay couriers (change under Settings → delivery.handled_by)." />
      <section>
        <h2 className="mb-3 font-semibold">Shipping zones</h2>
        <Table rows={zones.data?.data ?? []} empty="No zones." columns={[
          { header: 'Zone', cell: (r) => <div><p className="font-medium">{r.name}</p><p className="max-w-xs text-xs text-warm-gray-500">{(r.areas ?? []).length > 0 && <span className="font-medium text-warm-gray-700">Areas: {r.areas.join(', ')}. </span>}{r.counties.length > 0 && <>Counties: {r.counties.join(', ')}</>}</p></div> },
          { header: 'Fee', cell: (r) => <span className="text-xs">{formatKES(Number(r.base_fee))} + {formatKES(Number(r.per_kg_fee))}/kg{r.free_over ? <><br />Free over {formatKES(Number(r.free_over))}</> : null}</span> },
          { header: 'Days', cell: (r) => `${r.est_days_min}–${r.est_days_max}` }, { header: 'Status', cell: (r) => <Badge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'active' : 'off'}</Badge> },
          { header: '', cell: (r) => <div className="flex gap-2"><Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => setZ({ id: r.id, name: r.name, counties: r.counties.join(', '), areas: (r.areas ?? []).join(', '), base_fee: String(r.base_fee), per_kg_fee: String(r.per_kg_fee), free_over: r.free_over ? String(r.free_over) : '', est_days_min: String(r.est_days_min), est_days_max: String(r.est_days_max) })}>Edit</Btn></div> },
        ]} />
        <Card title={z.id ? 'Edit zone' : 'Add a zone'} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input className={inputCls} value={z.name} onChange={(e) => setZ({ ...z, name: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Areas / neighbourhoods (comma separated)" hint="Matched first, so Westlands can cost less than Rongai"><input className={inputCls} value={z.areas} onChange={(e) => setZ({ ...z, areas: e.target.value })} placeholder="Westlands, Kilimani, CBD" /></Field></div>
            <div className="sm:col-span-3"><Field label="Counties (comma separated)" hint="Used for anywhere not matched by an area. Leave empty for an area-only zone."><input className={inputCls} value={z.counties} onChange={(e) => setZ({ ...z, counties: e.target.value })} placeholder="Nairobi, Kiambu, Machakos" /></Field></div>
            <Field label="Base fee (KSh)"><input type="number" className={inputCls} value={z.base_fee} onChange={(e) => setZ({ ...z, base_fee: e.target.value })} /></Field>
            <Field label="Per extra kg (KSh)"><input type="number" className={inputCls} value={z.per_kg_fee} onChange={(e) => setZ({ ...z, per_kg_fee: e.target.value })} /></Field>
            <Field label="Free over (KSh)"><input type="number" className={inputCls} value={z.free_over} onChange={(e) => setZ({ ...z, free_over: e.target.value })} placeholder="Never" /></Field>
            <Field label="Days (min)"><input type="number" className={inputCls} value={z.est_days_min} onChange={(e) => setZ({ ...z, est_days_min: e.target.value })} /></Field>
            <Field label="Days (max)"><input type="number" className={inputCls} value={z.est_days_max} onChange={(e) => setZ({ ...z, est_days_max: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn busy={busy} disabled={!z.name || (!z.counties.trim() && !z.areas.trim()) || z.base_fee === ''} onClick={async () => {
              const body = { name: z.name, counties: z.counties.split(',').map((c) => c.trim()).filter(Boolean), areas: z.areas.split(',').map((c) => c.trim()).filter(Boolean), base_fee: Number(z.base_fee), per_kg_fee: Number(z.per_kg_fee) || 0, free_over: z.free_over ? Number(z.free_over) : null, est_days_min: Number(z.est_days_min) || 0, est_days_max: Number(z.est_days_max) || 0, is_active: true };
              if (await act(() => (z.id ? request('put', `/admin/shipping-zones/${z.id}`, body) : request('post', '/admin/shipping-zones', body)), 'Zone saved')) setZ({ id: '', name: '', counties: '', areas: '', base_fee: '', per_kg_fee: '0', free_over: '', est_days_min: '2', est_days_max: '5' });
            }}>{z.id ? 'Save zone' : 'Add zone'}</Btn>
            {z.id && <Btn variant="secondary" onClick={() => setZ({ id: '', name: '', counties: '', areas: '', base_fee: '', per_kg_fee: '0', free_over: '', est_days_min: '2', est_days_max: '5' })}>Cancel edit</Btn>}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Pickup stations</h2>
        <Table rows={stations.data?.data ?? []} empty="No pickup stations — customers will only see home delivery." columns={[
          { header: 'Station', cell: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-warm-gray-500">{r.address}, {r.county}</p></div> }, { header: 'Fee', cell: (r) => (Number(r.fee) ? formatKES(Number(r.fee)) : 'Free') },
          { header: 'Status', cell: (r) => <Badge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'active' : 'off'}</Badge> },
          { header: '', cell: (r) => <Btn variant="secondary" className="px-3 py-1 text-xs" onClick={() => act(() => request('patch', `/admin/pickup-stations/${r.id}`, { is_active: !r.is_active }), 'Updated')}>{r.is_active ? 'Turn off' : 'Turn on'}</Btn> },
        ]} />
        <Card title="Add a pickup station" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name"><input className={inputCls} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
            <Field label="County"><input className={inputCls} value={s.county} onChange={(e) => setS({ ...s, county: e.target.value })} /></Field>
            <Field label="Address"><input className={inputCls} value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></Field>
            <Field label="Fee (KSh)"><input type="number" className={inputCls} value={s.fee} onChange={(e) => setS({ ...s, fee: e.target.value })} /></Field>
          </div>
          <Btn className="mt-3" busy={busy} disabled={!s.name || !s.county || s.address.length < 3} onClick={async () => { if (await act(() => request('post', '/admin/pickup-stations', { name: s.name, county: s.county, address: s.address, fee: Number(s.fee) || 0 }), 'Station added')) setS({ name: '', county: '', address: '', fee: '0' }); }}>Add station</Btn>
        </Card>
      </section>
    </div>
  );
};

// ===========================================================================
// Settings & fees
// ===========================================================================
export const AdminSettings = () => {
  useDocumentTitle('Settings');
  const settings = useFetch<{ data: { key: string; value: unknown; description: string | null }[] }>('/admin/settings');
  const cats = useFetch<{ data: { id: string; name: string; depth: number; commission_rate: number | null }[] }>('/admin/categories-commission');
  const sellers = useFetch<{ data: { id: string; name: string; custom_commission_rate: number | null }[] }>('/admin/sellers-commission');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { busy, act } = useDo(() => { void settings.reload(); void cats.reload(); void sellers.reload(); });

  const parse = (key: string, raw: string): unknown => {
    if (key === 'payout.default_schedule' || key === 'delivery.handled_by') return raw;
    if (raw.trim() === '' || raw === 'null') return null;
    return Number(raw);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Settings & fees" subtitle="Changes apply immediately to new orders and are written to the audit log." />
      <Card title="Marketplace rules">
        {settings.loading ? <Spinner /> : (
          <ul className="divide-y divide-warm-gray-100">
            {(settings.data?.data ?? []).map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="font-mono text-sm font-medium">{s.key}</p><p className="text-xs text-warm-gray-500">{s.description}</p></div>
                <div className="flex gap-2">
                  {s.key === 'delivery.handled_by' ? (
                    <select className={`${inputCls} w-32`} value={draft[s.key] ?? String(s.value)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}><option value="platform">platform</option><option value="vendor">vendor</option></select>
                  ) : s.key === 'payout.default_schedule' ? (
                    <select className={`${inputCls} w-32`} value={draft[s.key] ?? String(s.value)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}><option value="weekly">weekly</option><option value="monthly">monthly</option></select>
                  ) : <input className={`${inputCls} w-32`} value={draft[s.key] ?? (s.value === null ? '' : String(s.value))} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} placeholder={s.value === null ? 'off' : ''} />}
                  <Btn busy={busy} disabled={draft[s.key] === undefined} onClick={() => act(() => request('put', `/admin/settings/${s.key}`, { value: parse(s.key, draft[s.key]) }), 'Setting saved').then(() => setDraft(({ [s.key]: _x, ...rest }) => rest))}>Save</Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Commission by category" actions={<span className="text-xs text-warm-gray-500">blank = default</span>}>
          <ul className="max-h-96 divide-y divide-warm-gray-100 overflow-y-auto text-sm">
            {(cats.data?.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-1.5" style={{ paddingLeft: c.depth * 14 }}>
                <span>{c.name}</span>
                <span className="flex items-center gap-1"><input className={`${inputCls} w-20 py-1`} type="number" step="0.5" defaultValue={c.commission_rate ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (c.commission_rate === null ? null : Number(c.commission_rate))) void act(() => request('patch', `/admin/categories/${c.id}/commission`, { rate: v }), 'Category rate saved'); }} />%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Commission by vendor (overrides category)" actions={<span className="text-xs text-warm-gray-500">blank = none</span>}>
          <ul className="max-h-96 divide-y divide-warm-gray-100 overflow-y-auto text-sm">
            {(sellers.data?.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>{s.name}</span>
                <span className="flex items-center gap-1"><input className={`${inputCls} w-20 py-1`} type="number" step="0.5" defaultValue={s.custom_commission_rate ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (s.custom_commission_rate === null ? null : Number(s.custom_commission_rate))) void act(() => request('patch', `/admin/sellers/${s.id}/commission`, { rate: v }), 'Vendor rate saved'); }} />%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

// ===========================================================================
// Content pages (CMS)
// ===========================================================================
export const AdminContent = () => {
  useDocumentTitle('Content pages');
  const list = useFetch<{ data: { slug: string; title: string; is_published: boolean; updated_at: string }[] }>('/admin/pages');
  const [slug, setSlug] = useState<string | null>(null);
  const page = useFetch<{ data: { slug: string; title: string; body: string; is_published: boolean } }>(slug ? `/admin/pages/${slug}` : null);
  const [draft, setDraft] = useState<{ title: string; body: string; is_published: boolean } | null>(null);
  const { busy, act } = useDo(list.reload);
  const [newSlug, setNewSlug] = useState('');

  const open = (s: string) => { setSlug(s); setDraft(null); };
  const current = draft ?? (page.data ? { title: page.data.data.title, body: page.data.data.body, is_published: page.data.data.is_published } : null);

  return (
    <div>
      <PageHeader title="Content pages" subtitle="About, FAQ, Terms, Privacy, Return policy and more. Supports # headings, - lists, **bold** and > notes." />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div>
          {list.loading ? <Spinner /> : <ul className="space-y-1">{(list.data?.data ?? []).map((p) => <li key={p.slug}><button onClick={() => open(p.slug)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${slug === p.slug ? 'bg-accent-100 font-semibold' : 'bg-white hover:bg-warm-gray-100'}`}>{p.title}{!p.is_published && <Badge>hidden</Badge>}</button></li>)}</ul>}
          <div className="mt-3 flex gap-2"><input className={inputCls} placeholder="new-page-slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><Btn variant="secondary" disabled={newSlug.length < 2} onClick={() => { setSlug(newSlug); setDraft({ title: '', body: '', is_published: true }); }}>New</Btn></div>
        </div>
        {!slug ? <Empty title="Choose a page to edit" /> : page.loading && !draft ? <Spinner /> : current && (
          <Card>
            <div className="space-y-3">
              <Field label="Title"><input className={inputCls} value={current.title} onChange={(e) => setDraft({ ...current, title: e.target.value })} /></Field>
              <Field label="Content"><textarea className={`${inputCls} font-mono`} rows={20} value={current.body} onChange={(e) => setDraft({ ...current, body: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.is_published} onChange={(e) => setDraft({ ...current, is_published: e.target.checked })} className="accent-[#B85A38]" /> Published</label>
              <div className="flex gap-2"><Btn busy={busy} disabled={!current.title || !current.body} onClick={async () => { if (await act(() => request('put', `/admin/pages/${slug}`, current), 'Page saved')) { setDraft(null); await page.reload(); } }}>Save page</Btn><a className="self-center text-sm text-accent-700 underline" href={`/pages/${slug}`} target="_blank" rel="noreferrer">Preview</a></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ===========================================================================
// Staff
// ===========================================================================
export const AdminStaff = () => {
  useDocumentTitle('Staff');
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data, loading, error, reload } = useFetch<{ data: { id: string; full_name: string; email: string; role: string; is_active: boolean }[] }>('/admin/staff');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', email: '', role: 'support', password: '' });
  const { busy, act } = useDo(reload);
  return (
    <div>
      <PageHeader title="Staff" subtitle="Moderators review products and vendors; finance runs refunds and payouts; support resolves disputes; admins manage everything." actions={role === 'super_admin' && <Btn onClick={() => setOpen(true)}>Add staff member</Btn>} />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table rows={data?.data ?? []} empty="No staff." columns={[{ header: 'Name', cell: (u) => <span className="font-medium">{u.full_name}</span> }, { header: 'Email', cell: (u) => u.email }, { header: 'Role', cell: (u) => <Badge tone="purple">{u.role.replace('_', ' ')}</Badge> }, { header: 'Status', cell: (u) => <Badge tone={u.is_active ? 'green' : 'gray'}>{u.is_active ? 'active' : 'disabled'}</Badge> }]} />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add staff member">
        <div className="space-y-3">
          <Field label="Full name"><input className={inputCls} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{['support', 'finance', 'moderator', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Temporary password" hint="They must change it at first login"><input type="password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn busy={busy} disabled={!f.full_name || !f.email || f.password.length < 8} onClick={async () => { if (await act(() => request('post', '/auth/register/admin', f), 'Staff member added')) { setOpen(false); setF({ full_name: '', email: '', role: 'support', password: '' }); } }}>Create account</Btn></div>
        </div>
      </Modal>
    </div>
  );
};
