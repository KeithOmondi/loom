import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Paperclip } from 'lucide-react';
import { Badge, Btn, Card, Empty, ErrorBox, Field, Money, PageHeader, Spinner, StatusBadge, fmtDate, inputCls } from '../../components/ui/kit';
import { request, uploadEvidence, useAction, useFetch } from '../../lib/http';
import { useAppSelector } from '../../store/hooks';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

// ---------------------------------------------------------------------------
// Customer: my returns
// ---------------------------------------------------------------------------
interface ReturnRow {
  id: string; order_number: string; product_name: string; reason: string; status: string; quantity: number; refund_amount: number | null;
  vendor_response: string | null; return_tracking: string | null; created_at: string; store_name: string;
}

const RETURN_HELP: Record<string, string> = {
  requested: 'Waiting for the seller to review your request.',
  approved: 'Approved. Send the item back and add the tracking number below.',
  rejected: 'The seller declined. If you disagree you can ask Loom to review.',
  received: 'The seller received your item. Your refund is being approved.',
  refunded: 'Refunded.',
  escalated: 'Escalated to Loom — see Disputes.',
  closed: 'Closed.',
};

export const ReturnsPage = () => {
  useDocumentTitle('Returns');
  const { data, loading, error, reload } = useFetch<{ data: ReturnRow[] }>('/returns/mine');
  const { busy, run } = useAction();
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    const r = await run(fn);
    if (!r.ok) return toast.error(r.error);
    toast.success(msg);
    await reload();
  };

  return (
    <div>
      <PageHeader title="Returns" subtitle="Start a return from the order page, within the return window." />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.data.length ? <Empty title="No returns" hint="Items you send back will be tracked here." /> : (
        <ul className="space-y-3">
          {data.data.map((r) => (
            <li key={r.id} className="rounded-xl border border-warm-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-medium">{r.product_name} × {r.quantity}</p><p className="text-xs text-warm-gray-500">Order {r.order_number} · {r.store_name} · {fmtDate(r.created_at)}</p></div>
                <StatusBadge status={r.status === 'pending' ? 'requested' : r.status} />
              </div>
              <p className="mt-2 text-sm text-warm-gray-700">Reason: {r.reason}</p>
              <p className="mt-1 text-sm text-warm-gray-600">{RETURN_HELP[r.status === 'pending' ? 'requested' : r.status]}</p>
              {r.vendor_response && <p className="mt-2 rounded-lg bg-warm-gray-50 p-2 text-sm">Seller: {r.vendor_response}</p>}
              {r.refund_amount != null && <p className="mt-2 text-sm">Refund: <Money value={r.refund_amount} /></p>}
              {r.status === 'approved' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.return_tracking ? <Badge tone="blue">Tracking: {r.return_tracking}</Badge> : (
                    <>
                      <input className={`${inputCls} max-w-xs`} placeholder="Courier tracking number" value={tracking[r.id] ?? ''} onChange={(e) => setTracking((t) => ({ ...t, [r.id]: e.target.value }))} />
                      <Btn busy={busy} disabled={(tracking[r.id] ?? '').length < 3} onClick={() => act(() => request('post', `/returns/${r.id}/tracking`, { tracking: tracking[r.id] }), 'Tracking added')}>Save tracking</Btn>
                    </>
                  )}
                </div>
              )}
              {r.status === 'rejected' && <Btn className="mt-3" variant="secondary" busy={busy} onClick={() => act(() => request('post', `/returns/${r.id}/escalate`, {}), 'Escalated to Loom')}>Ask Loom to review</Btn>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Disputes — list (customer / seller / support) and shared thread
// ---------------------------------------------------------------------------
interface DisputeRow { id: string; order_number: string; reason: string; status: string; total: number; respond_by: string | null; store_name: string; customer_name: string; created_at: string }

export const DisputesListPage = ({ base }: { base: string }) => {
  useDocumentTitle('Disputes');
  const { data, loading, error, reload } = useFetch<{ data: DisputeRow[] }>('/disputes');
  return (
    <div>
      <PageHeader title="Disputes" subtitle="Open cases on orders. Payment is protected until they are resolved." />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.data.length ? <Empty title="No disputes" hint="Great — nothing needs attention." /> : (
        <ul className="space-y-3">
          {data.data.map((d) => (
            <li key={d.id}>
              <Link to={`${base}/${d.id}`} className="block rounded-xl border border-warm-gray-200 bg-white p-4 hover:shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-medium">Order {d.order_number}</p><p className="text-sm text-warm-gray-600">{d.reason}</p></div>
                  <div className="text-right"><StatusBadge status={d.status} /><p className="mt-1 text-sm"><Money value={d.total} /></p></div>
                </div>
                <p className="mt-2 text-xs text-warm-gray-500">{d.customer_name} ↔ {d.store_name} · opened {fmtDate(d.created_at)}{d.respond_by && ['awaiting_vendor', 'awaiting_customer'].includes(d.status) ? ` · reply by ${fmtDate(d.respond_by, true)}` : ''}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface DisputeFull extends DisputeRow {
  viewer_role: 'customer' | 'seller' | 'staff'; resolution: string | null; resolution_notes: string | null; resolution_amount: number | null; order_id: string;
  messages: { id: string; sender_name: string; sender_role: string; body: string; created_at: string }[];
  evidence: { id: string; message_id: string | null; url: string; mime: string | null }[];
}

export const DisputePage = ({ back }: { back: string }) => {
  const { id = '' } = useParams();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data, loading, error, reload } = useFetch<{ data: DisputeFull }>(`/disputes/${id}`);
  const { busy, run } = useAction();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [resolution, setResolution] = useState('full_refund');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  useDocumentTitle('Dispute');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? 'Not found'} onRetry={reload} />;
  const d = data.data;
  const closed = ['resolved', 'closed'].includes(d.status);
  const canResolve = ['admin', 'super_admin', 'support'].includes(role ?? '') && !closed;
  const myTurn = (d.viewer_role === 'customer' && d.status === 'awaiting_customer') || (d.viewer_role === 'seller' && d.status === 'awaiting_vendor');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const r = await run(async () => {
      const evidence = files?.length ? await uploadEvidence(files) : [];
      return request('post', `/disputes/${id}/messages`, { body, evidence });
    });
    if (!r.ok) return toast.error(r.error);
    setBody(''); setFiles(null); (e.target as HTMLFormElement).reset();
    await reload();
  };

  const resolve = async () => {
    const r = await run(() => request('post', `/disputes/${id}/resolve`, { resolution, notes, ...(resolution === 'partial_refund' ? { amount: Number(amount) } : {}) }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Dispute resolved');
    await reload();
  };

  return (
    <div className="space-y-5">
      <Link to={back} className="text-sm text-accent-700 hover:underline">← All disputes</Link>
      <PageHeader title={`Dispute · order ${d.order_number}`} subtitle={d.reason} actions={<StatusBadge status={d.status} />} />

      {myTurn && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">It&apos;s your turn to respond{d.respond_by ? ` before ${fmtDate(d.respond_by, true)}` : ''}. If you don&apos;t, the case goes to the Loom team automatically.</div>}
      {closed && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900"><strong>Resolved: {d.resolution?.replace(/_/g, ' ')}</strong>{d.resolution_amount ? ` (KSh ${Number(d.resolution_amount).toLocaleString('en-KE')})` : ''}<br />{d.resolution_notes}</div>}

      <Card title="Conversation">
        <ul className="space-y-4">
          {d.messages.map((m) => (
            <li key={m.id} className={`rounded-xl p-3 text-sm ${m.sender_role === 'staff' ? 'bg-purple-50' : m.sender_role === 'seller' ? 'bg-warm-gray-50' : 'bg-accent-50'}`}>
              <p className="mb-1 text-xs font-semibold text-warm-gray-600">{m.sender_name} <span className="font-normal capitalize">({m.sender_role === 'staff' ? 'Loom support' : m.sender_role})</span> · {fmtDate(m.created_at, true)}</p>
              <p className="whitespace-pre-line">{m.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {d.evidence.filter((e) => e.message_id === m.id).map((e) => (
                  <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-warm-gray-200 bg-white px-2 py-1 text-xs text-accent-700"><Paperclip size={12} /> {e.mime === 'application/pdf' ? 'PDF' : 'Image'}</a>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {!closed && (
          <form onSubmit={send} className="mt-5 space-y-3 border-t border-warm-gray-100 pt-4">
            <Field label="Add a message"><textarea className={inputCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} /></Field>
            <input type="file" accept="image/*,application/pdf" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
            <div className="flex flex-wrap gap-2">
              <Btn type="submit" busy={busy} disabled={!body.trim()}>Send</Btn>
              {d.viewer_role !== 'staff' && d.status !== 'under_review' && <Btn type="button" variant="secondary" onClick={async () => { const r = await run(() => request('post', `/disputes/${id}/escalate`, {})); if (r.ok) { toast.success('Escalated to Loom'); await reload(); } else toast.error(r.error); }}>Ask Loom to step in</Btn>}
            </div>
          </form>
        )}
      </Card>

      {canResolve && (
        <Card title="Resolve this dispute (support)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Decision">
              <select className={inputCls} value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="full_refund">Full refund to customer</option>
                <option value="partial_refund">Partial refund</option>
                <option value="release_to_vendor">Release payment to seller</option>
                <option value="replacement">Replacement — seller reships</option>
              </select>
            </Field>
            {resolution === 'partial_refund' && <Field label="Refund amount (KSh)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
            <div className="sm:col-span-2"><Field label="Explanation (both parties will see this)"><textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
          </div>
          <Btn className="mt-3" busy={busy} disabled={notes.trim().length < 3 || (resolution === 'partial_refund' && !Number(amount))} onClick={resolve}>Resolve dispute</Btn>
        </Card>
      )}
    </div>
  );
};
