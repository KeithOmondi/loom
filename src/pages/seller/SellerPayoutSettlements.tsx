// src/pages/seller/SellerPayoutSettlements.tsx

import { useMemo, useState } from 'react';

// ============================================
// TYPES
// ============================================

type PayoutStatus =
  | 'scheduled'      // period closed, awaiting processing
  | 'processing'     // being batched
  | 'in_transit'     // sent to bank, not yet settled
  | 'paid'           // settled
  | 'failed'         // bank rejected / returned
  | 'on_hold';       // blocked (dispute, KYC, etc.)

type PayoutMethod = 'bank' | 'mpesa' | 'paypal' | 'stripe' | 'crypto';

type PayoutSchedule = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface PayoutBreakdownLine {
  id: string;
  orderReference: string;
  description: string;
  gross: number;
  platformFee: number;
  net: number;
}

interface Payout {
  id: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  method: PayoutMethod;
  accountMask: string;
  currency: string;
  grossAmount: number;
  platformFees: number;
  refunds: number;
  disputeHolds: number;
  adjustments: number;
  netAmount: number;
  status: PayoutStatus;
  scheduledFor: string;
  paidAt: string | null;
  failureReason?: string;
  holdReason?: string;
  orderCount: number;
  breakdown: PayoutBreakdownLine[];
}

interface SellerPayoutSettings {
  method: PayoutMethod;
  accountMask: string;
  schedule: PayoutSchedule;
  minimumPayout: number;
  currency: string;
  holdPeriodDays: number;
  nextPayoutAt: string;
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
}

// ============================================
// DUMMY DATA
// ============================================

const SETTINGS: SellerPayoutSettings = {
  method: 'bank',
  accountMask: '****4821',
  schedule: 'biweekly',
  minimumPayout: 50,
  currency: 'USD',
  holdPeriodDays: 7,
  nextPayoutAt: '2026-10-15T09:00:00Z',
  availableBalance: 2743.72,
  pendingBalance: 812.4,
  reservedBalance: 156.0,
};

const PAYOUTS: Payout[] = [
  {
    id: 'pyt_01HX700A',
    reference: 'PAY-2026-09-15',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    method: 'bank',
    accountMask: '****4821',
    currency: 'USD',
    grossAmount: 4820.5,
    platformFees: 482.05,
    refunds: 82.5,
    disputeHolds: 0,
    adjustments: -12.0,
    netAmount: 4243.95,
    status: 'paid',
    scheduledFor: '2026-09-15',
    paidAt: '2026-09-16T09:00:00Z',
    orderCount: 41,
    breakdown: [
      {
        id: 'br_01',
        orderReference: 'ORD-2026-000108',
        description: 'Wireless Headphones + Ear Cushions',
        gross: 348.36,
        platformFee: 34.84,
        net: 313.52,
      },
      {
        id: 'br_02',
        orderReference: 'ORD-2026-000112',
        description: 'Leather Messenger Bag — Tan',
        gross: 226.63,
        platformFee: 22.66,
        net: 203.97,
      },
      {
        id: 'br_03',
        orderReference: 'ORD-2026-000118',
        description: 'Mechanical Keyboard — TKL',
        gross: 222.75,
        platformFee: 22.28,
        net: 200.47,
      },
      {
        id: 'br_04',
        orderReference: 'REF-ORD-2026-000109',
        description: 'Refund issued — damaged item',
        gross: -82.5,
        platformFee: 0,
        net: -82.5,
      },
    ],
  },
  {
    id: 'pyt_01HX800B',
    reference: 'PAY-2026-09-30',
    periodStart: '2026-09-15',
    periodEnd: '2026-09-29',
    method: 'bank',
    accountMask: '****4821',
    currency: 'USD',
    grossAmount: 5210.75,
    platformFees: 521.08,
    refunds: 0,
    disputeHolds: 0,
    adjustments: 0,
    netAmount: 4689.67,
    status: 'paid',
    scheduledFor: '2026-09-30',
    paidAt: '2026-10-01T09:00:00Z',
    orderCount: 47,
    breakdown: [
      {
        id: 'br_05',
        orderReference: 'ORD-2026-000120',
        description: 'Yoga Mat — Extra Thick',
        gross: 82.5,
        platformFee: 8.25,
        net: 74.25,
      },
      {
        id: 'br_06',
        orderReference: 'ORD-2026-000125',
        description: 'Ceramic Pour-Over Coffee Set',
        gross: 91.25,
        platformFee: 9.13,
        net: 82.12,
      },
      {
        id: 'br_07',
        orderReference: 'ORD-2026-000131',
        description: 'Bulk order — Stainless Bottles × 8',
        gross: 612.75,
        platformFee: 61.28,
        net: 551.47,
      },
    ],
  },
  {
    id: 'pyt_01HX900C',
    reference: 'PAY-2026-10-15',
    periodStart: '2026-09-30',
    periodEnd: '2026-10-13',
    method: 'bank',
    accountMask: '****4821',
    currency: 'USD',
    grossAmount: 3140.25,
    platformFees: 314.03,
    refunds: 82.5,
    disputeHolds: 0,
    adjustments: 0,
    netAmount: 2743.72,
    status: 'in_transit',
    scheduledFor: '2026-10-15',
    paidAt: null,
    orderCount: 28,
    breakdown: [
      {
        id: 'br_08',
        orderReference: 'ORD-2026-000140',
        description: 'Audio equipment bundle',
        gross: 448.36,
        platformFee: 44.84,
        net: 403.52,
      },
      {
        id: 'br_09',
        orderReference: 'ORD-2026-000142',
        description: 'Wireless Headphones + Ear Cushions',
        gross: 348.36,
        platformFee: 34.84,
        net: 313.52,
      },
      {
        id: 'br_10',
        orderReference: 'REF-ORD-2026-000141',
        description: 'Refund issued — not as described',
        gross: -82.5,
        platformFee: 0,
        net: -82.5,
      },
    ],
  },
  {
    id: 'pyt_01HX910D',
    reference: 'PAY-2026-10-31',
    periodStart: '2026-10-14',
    periodEnd: '2026-10-27',
    method: 'bank',
    accountMask: '****4821',
    currency: 'USD',
    grossAmount: 0,
    platformFees: 0,
    refunds: 0,
    disputeHolds: 0,
    adjustments: 0,
    netAmount: 0,
    status: 'scheduled',
    scheduledFor: '2026-10-31',
    paidAt: null,
    orderCount: 0,
    breakdown: [],
  },
  {
    id: 'pyt_01HX920E',
    reference: 'PAY-2026-10-08',
    periodStart: '2026-09-24',
    periodEnd: '2026-10-07',
    method: 'mpesa',
    accountMask: '+254 *** 4407',
    currency: 'USD',
    grossAmount: 1280.0,
    platformFees: 128.0,
    refunds: 0,
    disputeHolds: 156.0,
    adjustments: 0,
    netAmount: 996.0,
    status: 'on_hold',
    scheduledFor: '2026-10-08',
    paidAt: null,
    holdReason: 'Partial hold while dispute DSP-2026-000012 is under review',
    orderCount: 12,
    breakdown: [
      {
        id: 'br_11',
        orderReference: 'ORD-2026-000129',
        description: 'Mechanical Keyboard — TKL (held)',
        gross: 139.0,
        platformFee: 13.9,
        net: 125.1,
      },
      {
        id: 'br_12',
        orderReference: 'ORD-2026-000130',
        description: 'Keycaps + accessories',
        gross: 189.0,
        platformFee: 18.9,
        net: 170.1,
      },
    ],
  },
  {
    id: 'pyt_01HX930F',
    reference: 'PAY-2026-09-01',
    periodStart: '2026-08-18',
    periodEnd: '2026-08-31',
    method: 'bank',
    accountMask: '****4821',
    currency: 'USD',
    grossAmount: 2210.4,
    platformFees: 221.04,
    refunds: 0,
    disputeHolds: 0,
    adjustments: 0,
    netAmount: 1989.36,
    status: 'failed',
    scheduledFor: '2026-09-01',
    paidAt: null,
    failureReason: 'Bank rejected transfer — account number mismatch. Update payout details and retry.',
    orderCount: 19,
    breakdown: [
      {
        id: 'br_13',
        orderReference: 'ORD-2026-000091',
        description: 'Bulk order — Yoga Mats × 6',
        gross: 408.0,
        platformFee: 40.8,
        net: 367.2,
      },
    ],
  },
];

// ============================================
// HELPERS
// ============================================

const currency = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cur,
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

const relativeDays = (iso: string) => {
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return `in ${diff} days`;
};

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  scheduled: 'Scheduled',
  processing: 'Processing',
  in_transit: 'In transit',
  paid: 'Paid',
  failed: 'Failed',
  on_hold: 'On hold',
};

const PAYOUT_STATUS_TONE: Record<PayoutStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-700',
  processing: 'bg-sky-100 text-sky-800',
  in_transit: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

const METHOD_LABEL: Record<PayoutMethod, string> = {
  bank: 'Bank transfer',
  mpesa: 'M-PESA',
  paypal: 'PayPal',
  stripe: 'Stripe',
  crypto: 'Crypto',
};

const SCHEDULE_LABEL: Record<PayoutSchedule, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
};

// ============================================
// COMPONENT
// ============================================

type FilterTab = 'all' | 'paid' | 'upcoming' | 'attention';

const SellerPayoutSettlements = () => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    PAYOUTS.find((p) => p.status === 'in_transit')?.id ?? PAYOUTS[0]?.id ?? null,
  );

  const counts = useMemo(
    () => ({
      all: PAYOUTS.length,
      paid: PAYOUTS.filter((p) => p.status === 'paid').length,
      upcoming: PAYOUTS.filter((p) =>
        ['scheduled', 'processing', 'in_transit'].includes(p.status),
      ).length,
      attention: PAYOUTS.filter((p) =>
        ['failed', 'on_hold'].includes(p.status),
      ).length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    return PAYOUTS.filter((p) => {
      if (filter === 'paid' && p.status !== 'paid') return false;
      if (
        filter === 'upcoming' &&
        !['scheduled', 'processing', 'in_transit'].includes(p.status)
      )
        return false;
      if (
        filter === 'attention' &&
        !['failed', 'on_hold'].includes(p.status)
      )
        return false;
      return true;
    });
  }, [filter]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const lifetimePaid = useMemo(
    () =>
      PAYOUTS.filter((p) => p.status === 'paid').reduce(
        (sum, p) => sum + p.netAmount,
        0,
      ),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Payouts &amp; settlements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track settlements, breakdowns, and your upcoming transfer.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Payout settings
        </button>
      </header>

      {/* Balance cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          label="Available balance"
          value={currency(SETTINGS.availableBalance)}
          hint="Ready to be paid out"
          tone="emerald"
        />
        <BalanceCard
          label="Pending balance"
          value={currency(SETTINGS.pendingBalance)}
          hint={`Clears after ${SETTINGS.holdPeriodDays}-day hold`}
        />
        <BalanceCard
          label="Reserved"
          value={currency(SETTINGS.reservedBalance)}
          hint="Held against open disputes"
          tone="amber"
        />
        <BalanceCard
          label="Lifetime paid"
          value={currency(lifetimePaid)}
          hint={`${counts.paid} settlement${counts.paid === 1 ? '' : 's'}`}
        />
      </div>

      {/* Upcoming payout banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Next payout
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {currency(SETTINGS.availableBalance)}{' '}
            <span className="text-sm font-normal text-slate-500">
              {relativeDays(SETTINGS.nextPayoutAt)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {SCHEDULE_LABEL[SETTINGS.schedule]} · {METHOD_LABEL[SETTINGS.method]}{' '}
            {SETTINGS.accountMask} · minimum {currency(SETTINGS.minimumPayout)}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Request early payout
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['all', `All (${counts.all})`],
            ['paid', `Paid (${counts.paid})`],
            ['upcoming', `Upcoming (${counts.upcoming})`],
            ['attention', `Needs attention (${counts.attention})`],
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Payout list */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No payouts match this filter.
            </div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`block w-full px-4 py-3 text-left transition ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {p.reference}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYOUT_STATUS_TONE[p.status]}`}
                            >
                              {PAYOUT_STATUS_LABEL[p.status]}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {shortDate(p.periodStart)} — {shortDate(p.periodEnd)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {METHOD_LABEL[p.method]} {p.accountMask} ·{' '}
                            {p.orderCount} order{p.orderCount === 1 ? '' : 's'}
                          </div>
                          {(p.failureReason || p.holdReason) && (
                            <p className="mt-1 line-clamp-2 text-xs text-rose-600">
                              {p.failureReason ?? p.holdReason}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular-nums text-slate-900">
                            {currency(p.netAmount, p.currency)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {p.paidAt
                              ? `Paid ${shortDate(p.paidAt)}`
                              : relativeDays(p.scheduledFor)}
                          </div>
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
              Select a payout to see its breakdown.
            </div>
          ) : (
            <PayoutDetail payout={selected} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// DETAIL PANEL
// ============================================

const PayoutDetail = ({ payout }: { payout: Payout }) => {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Payout
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {payout.reference}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYOUT_STATUS_TONE[payout.status]}`}
          >
            {PAYOUT_STATUS_LABEL[payout.status]}
          </span>
        </div>

        {/* Failure / hold notice */}
        {payout.failureReason && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {payout.failureReason}
          </div>
        )}
        {payout.holdReason && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {payout.holdReason}
          </div>
        )}

        {/* Amount summary */}
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Net payout
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {currency(payout.netAmount, payout.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {payout.paidAt
              ? `Settled ${shortDateTime(payout.paidAt)}`
              : `Scheduled for ${shortDateTime(payout.scheduledFor)}`}
          </p>
        </div>

        {/* Line items: gross -> net */}
        <div className="mt-4 space-y-2 text-sm">
          <Line label="Gross sales" value={currency(payout.grossAmount, payout.currency)} />
          <Line
            label="Platform fees"
            value={`−${currency(payout.platformFees, payout.currency)}`}
            tone="negative"
          />
          <Line
            label="Refunds"
            value={
              payout.refunds > 0
                ? `−${currency(payout.refunds, payout.currency)}`
                : '—'
            }
            tone={payout.refunds > 0 ? 'negative' : undefined}
          />
          <Line
            label="Dispute holds"
            value={
              payout.disputeHolds > 0
                ? `−${currency(payout.disputeHolds, payout.currency)}`
                : '—'
            }
            tone={payout.disputeHolds > 0 ? 'negative' : undefined}
          />
          <Line
            label="Adjustments"
            value={
              payout.adjustments !== 0
                ? `${payout.adjustments > 0 ? '+' : '−'}${currency(Math.abs(payout.adjustments), payout.currency)}`
                : '—'
            }
            tone={payout.adjustments !== 0 ? (payout.adjustments > 0 ? 'positive' : 'negative') : undefined}
          />
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-semibold text-slate-900">
              Net payout
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {currency(payout.netAmount, payout.currency)}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Detail label="Method" value={METHOD_LABEL[payout.method]} />
          <Detail label="Account" value={payout.accountMask} />
          <Detail
            label="Period"
            value={`${shortDate(payout.periodStart)} — ${shortDate(payout.periodEnd)}`}
          />
          <Detail label="Orders" value={String(payout.orderCount)} />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Download statement (PDF)
          </button>
          {payout.status === 'failed' && (
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Retry payout
            </button>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Breakdown ({payout.breakdown.length} line
          {payout.breakdown.length === 1 ? '' : 's'})
        </p>
        {payout.breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">
            This period hasn't closed yet — no transactions to show.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2 text-right">Gross</th>
                <th className="pb-2 text-right">Fee</th>
                <th className="pb-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payout.breakdown.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 pr-2">
                    <div className="font-mono text-xs text-slate-700">
                      {line.orderReference}
                    </div>
                    <div className="text-xs text-slate-500">
                      {line.description}
                    </div>
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      line.gross < 0 ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {currency(line.gross, payout.currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-rose-600">
                    {line.platformFee > 0
                      ? `−${currency(line.platformFee, payout.currency)}`
                      : '—'}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums font-medium ${
                      line.net < 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {currency(line.net, payout.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const BalanceCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'emerald' | 'amber';
}) => {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

const Line = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-600">{label}</span>
    <span
      className={`tabular-nums ${
        tone === 'negative'
          ? 'text-rose-600'
          : tone === 'positive'
            ? 'text-emerald-700'
            : 'text-slate-800'
      }`}
    >
      {value}
    </span>
  </div>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-slate-500">{label}</p>
    <p className="mt-0.5 font-medium text-slate-800">{value}</p>
  </div>
);

export default SellerPayoutSettlements;