// src/pages/seller/SellerReturnsAndDisputes.tsx

import { useMemo, useState } from 'react';

// ============================================
// TYPES
// ============================================

type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'label_issued'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'rejected'
  | 'cancelled';

type DisputeStatus =
  | 'open'
  | 'awaiting_seller'
  | 'awaiting_customer'
  | 'under_review'
  | 'resolved_seller'
  | 'resolved_customer'
  | 'closed';

type ReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'changed_mind'
  | 'late_delivery'
  | 'missing_parts'
  | 'other';

type DisputeReason =
  | 'item_not_received'
  | 'item_damaged'
  | 'not_as_described'
  | 'refund_not_processed'
  | 'unauthorized_charge'
  | 'other';

type Resolution = 'refund' | 'replacement' | 'store_credit' | 'repair' | 'none';

interface Message {
  id: string;
  author: 'seller' | 'customer' | 'system' | 'moderator';
  authorName: string;
  body: string;
  createdAt: string;
}

interface ReturnRequest {
  id: string;
  reference: string;
  kind: 'return';
  orderReference: string;
  customerName: string;
  customerEmail: string;
  reason: ReturnReason;
  status: ReturnStatus;
  resolution: Resolution;
  refundAmount: number;
  itemName: string;
  itemSku: string;
  quantity: number;
  openedAt: string;
  updatedAt: string;
  dueBy: string | null;
  messages: Message[];
}

interface Dispute {
  id: string;
  reference: string;
  kind: 'dispute';
  orderReference: string;
  customerName: string;
  customerEmail: string;
  reason: DisputeReason;
  status: DisputeStatus;
  resolution: Resolution;
  refundAmount: number;
  itemName: string;
  itemSku: string;
  quantity: number;
  openedAt: string;
  updatedAt: string;
  dueBy: string | null;
  messages: Message[];
}

type Case = ReturnRequest | Dispute;

// ============================================
// DUMMY DATA
// ============================================

const CASES: Case[] = [
  {
    id: 'ret_01HX9001',
    reference: 'RET-2026-000031',
    kind: 'return',
    orderReference: 'ORD-2026-000138',
    customerName: 'Nadia Hussein',
    customerEmail: 'nadia.hussein@example.com',
    reason: 'damaged',
    status: 'received',
    resolution: 'refund',
    refundAmount: 249.99,
    itemName: 'Wireless Noise-Cancelling Headphones',
    itemSku: 'AUD-WNC-001',
    quantity: 1,
    openedAt: '2026-10-02T10:15:00Z',
    updatedAt: '2026-10-08T14:20:00Z',
    dueBy: '2026-10-12T23:59:00Z',
    messages: [
      {
        id: 'msg_01',
        author: 'customer',
        authorName: 'Nadia Hussein',
        body: 'The right ear cup stopped producing sound after two days. Attached photos.',
        createdAt: '2026-10-02T10:15:00Z',
      },
      {
        id: 'msg_02',
        author: 'seller',
        authorName: 'You',
        body: 'Sorry about that — please send it back using the prepaid label. We will refund in full once received.',
        createdAt: '2026-10-02T11:02:00Z',
      },
      {
        id: 'msg_03',
        author: 'system',
        authorName: 'System',
        body: 'Return label issued via DHL Express. Tracking: DHL-8842-1193-882.',
        createdAt: '2026-10-02T11:05:00Z',
      },
      {
        id: 'msg_04',
        author: 'system',
        authorName: 'System',
        body: 'Item received at seller hub. Awaiting inspection.',
        createdAt: '2026-10-08T14:20:00Z',
      },
    ],
  },
  {
    id: 'ret_01HX9002',
    reference: 'RET-2026-000032',
    kind: 'return',
    orderReference: 'ORD-2026-000141',
    customerName: 'Tomás Ribeiro',
    customerEmail: 'tomas.ribeiro@example.com',
    reason: 'not_as_described',
    status: 'approved',
    resolution: 'refund',
    refundAmount: 189.0,
    itemName: 'Leather Messenger Bag — Tan',
    itemSku: 'BAG-LTH-TAN',
    quantity: 1,
    openedAt: '2026-10-07T09:40:00Z',
    updatedAt: '2026-10-08T08:00:00Z',
    dueBy: '2026-10-14T23:59:00Z',
    messages: [
      {
        id: 'msg_05',
        author: 'customer',
        authorName: 'Tomás Ribeiro',
        body: 'The bag is a much darker brown than the photos show. I would like to return it.',
        createdAt: '2026-10-07T09:40:00Z',
      },
      {
        id: 'msg_06',
        author: 'seller',
        authorName: 'You',
        body: 'Understood — issuing a return label now.',
        createdAt: '2026-10-08T08:00:00Z',
      },
    ],
  },
  {
    id: 'ret_01HX9003',
    reference: 'RET-2026-000033',
    kind: 'return',
    orderReference: 'ORD-2026-000145',
    customerName: 'Lucas Almeida',
    customerEmail: 'lucas.almeida@example.com',
    reason: 'changed_mind',
    status: 'rejected',
    resolution: 'none',
    refundAmount: 0,
    itemName: 'Leather Messenger Bag — Tan',
    itemSku: 'BAG-LTH-TAN',
    quantity: 1,
    openedAt: '2026-10-06T15:30:00Z',
    updatedAt: '2026-10-07T10:15:00Z',
    dueBy: null,
    messages: [
      {
        id: 'msg_07',
        author: 'customer',
        authorName: 'Lucas Almeida',
        body: 'I changed my mind, would like to return this.',
        createdAt: '2026-10-06T15:30:00Z',
      },
      {
        id: 'msg_08',
        author: 'seller',
        authorName: 'You',
        body: 'Our return policy only accepts returns for damaged or incorrect items. Sorry for the inconvenience.',
        createdAt: '2026-10-07T10:15:00Z',
      },
    ],
  },
  {
    id: 'ret_01HX9004',
    reference: 'RET-2026-000034',
    kind: 'return',
    orderReference: 'ORD-2026-000132',
    customerName: 'Elena Petrova',
    customerEmail: 'elena.petrova@example.com',
    reason: 'missing_parts',
    status: 'in_transit',
    resolution: 'replacement',
    refundAmount: 0,
    itemName: 'Ceramic Pour-Over Coffee Set',
    itemSku: 'KIT-COF-POV',
    quantity: 1,
    openedAt: '2026-10-04T11:00:00Z',
    updatedAt: '2026-10-08T07:15:00Z',
    dueBy: '2026-10-13T23:59:00Z',
    messages: [
      {
        id: 'msg_09',
        author: 'customer',
        authorName: 'Elena Petrova',
        body: 'The glass carafe arrived cracked and the filter cone is missing.',
        createdAt: '2026-10-04T11:00:00Z',
      },
      {
        id: 'msg_10',
        author: 'seller',
        authorName: 'You',
        body: 'Sending a replacement set at no charge. Please keep the damaged unit.',
        createdAt: '2026-10-05T09:20:00Z',
      },
      {
        id: 'msg_11',
        author: 'system',
        authorName: 'System',
        body: 'Replacement order RPL-2026-000011 dispatched via Sendy.',
        createdAt: '2026-10-08T07:15:00Z',
      },
    ],
  },
  {
    id: 'dsp_01HX9101',
    reference: 'DSP-2026-000012',
    kind: 'dispute',
    orderReference: 'ORD-2026-000129',
    customerName: 'Marcus Chen',
    customerEmail: 'marcus.chen@example.com',
    reason: 'item_not_received',
    status: 'awaiting_seller',
    resolution: 'refund',
    refundAmount: 139.0,
    itemName: 'Mechanical Keyboard — TKL, Hot-Swap',
    itemSku: 'CMP-KBD-TKL',
    quantity: 1,
    openedAt: '2026-10-05T16:20:00Z',
    updatedAt: '2026-10-09T09:00:00Z',
    dueBy: '2026-10-11T23:59:00Z',
    messages: [
      {
        id: 'msg_12',
        author: 'customer',
        authorName: 'Marcus Chen',
        body: 'Tracking shows delivered 6 days ago but I never received the package.',
        createdAt: '2026-10-05T16:20:00Z',
      },
      {
        id: 'msg_13',
        author: 'moderator',
        authorName: 'Moderation team',
        body: 'Please provide proof of delivery or a replacement plan within 48 hours.',
        createdAt: '2026-10-09T09:00:00Z',
      },
    ],
  },
  {
    id: 'dsp_01HX9102',
    reference: 'DSP-2026-000013',
    kind: 'dispute',
    orderReference: 'ORD-2026-000120',
    customerName: 'Aisha Bello',
    customerEmail: 'aisha.bello@example.com',
    reason: 'item_damaged',
    status: 'under_review',
    resolution: 'refund',
    refundAmount: 68.0,
    itemName: 'Yoga Mat — Extra Thick, Non-Slip',
    itemSku: 'SPT-YGA-THK',
    quantity: 1,
    openedAt: '2026-10-01T13:45:00Z',
    updatedAt: '2026-10-06T11:30:00Z',
    dueBy: null,
    messages: [
      {
        id: 'msg_14',
        author: 'customer',
        authorName: 'Aisha Bello',
        body: 'Mat arrived with a tear along one edge.',
        createdAt: '2026-10-01T13:45:00Z',
      },
      {
        id: 'msg_15',
        author: 'seller',
        authorName: 'You',
        body: 'Offered a partial refund and a replacement. Awaiting customer decision.',
        createdAt: '2026-10-03T10:00:00Z',
      },
      {
        id: 'msg_16',
        author: 'system',
        authorName: 'System',
        body: 'Dispute escalated to platform review.',
        createdAt: '2026-10-06T11:30:00Z',
      },
    ],
  },
  {
    id: 'dsp_01HX9103',
    reference: 'DSP-2026-000014',
    kind: 'dispute',
    orderReference: 'ORD-2026-000115',
    customerName: 'Oliver Brandt',
    customerEmail: 'oliver.brandt@example.com',
    reason: 'not_as_described',
    status: 'resolved_seller',
    resolution: 'store_credit',
    refundAmount: 0,
    itemName: 'Stainless Steel Water Bottle 750ml',
    itemSku: 'HOM-BTL-750',
    quantity: 3,
    openedAt: '2026-09-26T09:10:00Z',
    updatedAt: '2026-10-01T14:00:00Z',
    dueBy: null,
    messages: [
      {
        id: 'msg_17',
        author: 'customer',
        authorName: 'Oliver Brandt',
        body: 'Bottles are smaller than expected for 750ml.',
        createdAt: '2026-09-26T09:10:00Z',
      },
      {
        id: 'msg_18',
        author: 'seller',
        authorName: 'You',
        body: 'Offered full store credit plus a 10% coupon. Customer accepted.',
        createdAt: '2026-09-30T15:45:00Z',
      },
      {
        id: 'msg_19',
        author: 'moderator',
        authorName: 'Moderation team',
        body: 'Dispute resolved in favor of seller. No refund issued.',
        createdAt: '2026-10-01T14:00:00Z',
      },
    ],
  },
];

// ============================================
// HELPERS
// ============================================

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const relativeDeadline = (iso: string | null) => {
  if (!iso) return null;
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return { label: 'overdue', tone: 'text-rose-600' };
  if (diff === 0) return { label: 'due today', tone: 'text-rose-600' };
  if (diff === 1) return { label: 'due tomorrow', tone: 'text-amber-700' };
  if (diff <= 3) return { label: `due in ${diff} days`, tone: 'text-amber-700' };
  return { label: `due in ${diff} days`, tone: 'text-slate-500' };
};

const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  damaged: 'Item damaged',
  wrong_item: 'Wrong item sent',
  not_as_described: 'Not as described',
  changed_mind: 'Changed mind',
  late_delivery: 'Arrived late',
  missing_parts: 'Missing parts',
  other: 'Other',
};

const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  item_not_received: 'Item not received',
  item_damaged: 'Item damaged',
  not_as_described: 'Not as described',
  refund_not_processed: 'Refund not processed',
  unauthorized_charge: 'Unauthorized charge',
  other: 'Other',
};

const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  label_issued: 'Label issued',
  in_transit: 'In transit',
  received: 'Received',
  refunded: 'Refunded',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  awaiting_seller: 'Awaiting you',
  awaiting_customer: 'Awaiting customer',
  under_review: 'Under review',
  resolved_seller: 'Resolved (seller)',
  resolved_customer: 'Resolved (customer)',
  closed: 'Closed',
};

const STATUS_TONE: Record<string, string> = {
  // returns
  requested: 'bg-slate-100 text-slate-700',
  approved: 'bg-sky-100 text-sky-800',
  label_issued: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-violet-100 text-violet-800',
  received: 'bg-amber-100 text-amber-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-slate-200 text-slate-600',
  // disputes
  open: 'bg-slate-100 text-slate-700',
  awaiting_seller: 'bg-amber-100 text-amber-800',
  awaiting_customer: 'bg-sky-100 text-sky-800',
  under_review: 'bg-violet-100 text-violet-800',
  resolved_seller: 'bg-emerald-100 text-emerald-800',
  resolved_customer: 'bg-rose-100 text-rose-800',
  closed: 'bg-slate-200 text-slate-600',
};

const statusLabel = (c: Case) =>
  c.kind === 'return'
    ? RETURN_STATUS_LABEL[c.status]
    : DISPUTE_STATUS_LABEL[c.status];

const reasonLabel = (c: Case) =>
  c.kind === 'return'
    ? RETURN_REASON_LABEL[c.reason]
    : DISPUTE_REASON_LABEL[c.reason];

// A case needs the seller's attention when the ball is in their court.
const needsAction = (c: Case) =>
  (c.kind === 'return' &&
    (c.status === 'requested' || c.status === 'received')) ||
  (c.kind === 'dispute' &&
    (c.status === 'awaiting_seller' || c.status === 'open'));

// ============================================
// COMPONENT
// ============================================

type FilterTab = 'action' | 'returns' | 'disputes' | 'all';

const SellerReturnsandDisputes = () => {
  const [filter, setFilter] = useState<FilterTab>('action');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    CASES.find(needsAction)?.id ?? CASES[0]?.id ?? null,
  );

  const counts = useMemo(
    () => ({
      action: CASES.filter(needsAction).length,
      returns: CASES.filter((c) => c.kind === 'return').length,
      disputes: CASES.filter((c) => c.kind === 'dispute').length,
      all: CASES.length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CASES.filter((c) => {
      if (filter === 'action' && !needsAction(c)) return false;
      if (filter === 'returns' && c.kind !== 'return') return false;
      if (filter === 'disputes' && c.kind !== 'dispute') return false;
      if (!q) return true;
      return (
        c.reference.toLowerCase().includes(q) ||
        c.orderReference.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.itemName.toLowerCase().includes(q)
      );
    });
  }, [filter, search]);

  const selected = useMemo(
    () => filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Returns &amp; disputes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Resolve customer return requests and platform disputes within the
          response window.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['action', `Needs action (${counts.action})`],
            ['returns', `Returns (${counts.returns})`],
            ['disputes', `Disputes (${counts.disputes})`],
            ['all', `All (${counts.all})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterTab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* List */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case, order, customer, or item…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Nothing here — you're all caught up.
            </div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((c) => {
                const isSelected = selected?.id === c.id;
                const deadline = relativeDeadline(c.dueBy);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`block w-full px-4 py-3 text-left transition ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                c.kind === 'return'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {c.kind}
                            </span>
                            <span className="font-medium text-slate-900">
                              {c.reference}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status]}`}
                            >
                              {statusLabel(c)}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {c.orderReference} · {c.customerName}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-700">
                            {c.itemName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {reasonLabel(c)}
                            {c.refundAmount > 0 &&
                              ` · ${currency(c.refundAmount)}`}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {needsAction(c) && (
                            <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                              Action
                            </span>
                          )}
                          <div className="text-xs text-slate-500">
                            {shortDate(c.updatedAt)}
                          </div>
                          {deadline && (
                            <div
                              className={`mt-1 text-xs font-medium ${deadline.tone}`}
                            >
                              {deadline.label}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select a case to view details.
            </div>
          ) : (
            <CaseDetail caseData={selected} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// DETAIL PANEL
// ============================================

const CaseDetail = ({ caseData }: { caseData: Case }) => {
  const deadline = relativeDeadline(caseData.dueBy);
  const actionable = needsAction(caseData);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {caseData.kind === 'return' ? 'Return request' : 'Dispute'} ·{' '}
              {caseData.orderReference}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {caseData.reference}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[caseData.status]}`}
          >
            {statusLabel(caseData)}
          </span>
        </div>

        {deadline && (
          <div
            className={`mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium ${deadline.tone}`}
          >
            Response {deadline.label} — {shortDateTime(caseData.dueBy!)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Detail label="Customer" value={caseData.customerName} />
          <Detail label="Email" value={caseData.customerEmail} />
          <Detail label="Reason" value={reasonLabel(caseData)} />
          <Detail
            label="Amount"
            value={
              caseData.refundAmount > 0
                ? currency(caseData.refundAmount)
                : 'No refund'
            }
          />
          <Detail label="Resolution" value={caseData.resolution.replace('_', ' ')} capitalize />
          <Detail
            label="Opened"
            value={shortDate(caseData.openedAt)}
          />
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
          <p className="font-medium text-slate-700">Item</p>
          <p className="mt-1 text-slate-600">
            {caseData.itemName}
            <br />
            <span className="font-mono text-slate-500">
              {caseData.itemSku}
            </span>{' '}
            · Qty {caseData.quantity}
          </p>
        </div>

        {/* Seller action bar — only when ball is in seller's court */}
        {actionable && (
          <div className="mt-4 flex flex-wrap gap-2">
            {caseData.kind === 'return' ? (
              <>
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Approve return
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Offer alternative
                </button>
                <button
                  type="button"
                  className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Provide evidence
                </button>
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Offer refund
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Counter
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Conversation
        </p>
        <ol className="space-y-3">
          {caseData.messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border p-3 text-sm ${
                m.author === 'seller'
                  ? 'border-slate-900/10 bg-slate-900 text-white'
                  : m.author === 'system'
                    ? 'border-slate-200 bg-slate-50 text-slate-600'
                    : m.author === 'moderator'
                      ? 'border-violet-200 bg-violet-50 text-violet-900'
                      : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-semibold ${
                    m.author === 'seller' ? 'text-white/90' : 'text-slate-700'
                  }`}
                >
                  {m.authorName}
                </span>
                <span
                  className={`text-[11px] ${
                    m.author === 'seller' ? 'text-white/60' : 'text-slate-500'
                  }`}
                >
                  {shortDateTime(m.createdAt)}
                </span>
              </div>
              <p
                className={
                  m.author === 'seller' ? 'text-white/95' : undefined
                }
              >
                {m.body}
              </p>
            </li>
          ))}
        </ol>

        {/* Reply box */}
        <div className="mt-4">
          <textarea
            rows={3}
            placeholder="Write a reply…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Attach file
            </button>
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Send reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Detail = ({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) => (
  <div>
    <p className="text-slate-500">{label}</p>
    <p
      className={`mt-0.5 font-medium text-slate-800 ${capitalize ? 'capitalize' : ''}`}
    >
      {value}
    </p>
  </div>
);

export default SellerReturnsandDisputes;