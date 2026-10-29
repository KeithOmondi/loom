// src/pages/seller/OrderandLedger.tsx

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  useGetStoreOrdersQuery,
  type Order as ApiOrder,
  type OrderStatus as ApiOrderStatus,
  type GetOrdersQuery,
} from '../../api/orderApi';
import { useGetMyStoresQuery } from '../../api/storeApi';
import { selectCurrentStore } from '../../store/slices/storeSlice';

// ============================================
// TYPES
// ============================================

type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed';

type LedgerEntryType =
  | 'sale'
  | 'commission'
  | 'payout'
  | 'refund'
  | 'adjustment'
  | 'fee';

interface Payout {
  id: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  platformFees: number;
  refunds: number;
  adjustments: number;
  netAmount: number;
  status: PayoutStatus;
  method: 'bank' | 'mpesa' | 'paypal';
  paidAt: string | null;
  scheduledFor: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

// ============================================
// DUMMY DATA — payouts & ledger
// TODO: replace with a payoutsApi / ledgerApi when those endpoints exist.
// ============================================

const PAYOUTS: Payout[] = [
  {
    id: 'pyt_01HX700A',
    reference: 'PAY-2026-09-15',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    grossAmount: 4820.5,
    platformFees: 482.05,
    refunds: 82.5,
    adjustments: -12.0,
    netAmount: 4243.95,
    status: 'paid',
    method: 'bank',
    paidAt: '2026-09-16T09:00:00Z',
    scheduledFor: '2026-09-15',
  },
  {
    id: 'pyt_01HX800B',
    reference: 'PAY-2026-09-30',
    periodStart: '2026-09-15',
    periodEnd: '2026-09-29',
    grossAmount: 5210.75,
    platformFees: 521.08,
    refunds: 0,
    adjustments: 0,
    netAmount: 4689.67,
    status: 'paid',
    method: 'bank',
    paidAt: '2026-10-01T09:00:00Z',
    scheduledFor: '2026-09-30',
  },
  {
    id: 'pyt_01HX900C',
    reference: 'PAY-2026-10-15',
    periodStart: '2026-09-30',
    periodEnd: '2026-10-13',
    grossAmount: 3140.25,
    platformFees: 314.03,
    refunds: 82.5,
    adjustments: 0,
    netAmount: 2743.72,
    status: 'in_transit',
    method: 'bank',
    paidAt: null,
    scheduledFor: '2026-10-15',
  },
  {
    id: 'pyt_01HX910D',
    reference: 'PAY-2026-10-31',
    periodStart: '2026-10-14',
    periodEnd: '2026-10-27',
    grossAmount: 0,
    platformFees: 0,
    refunds: 0,
    adjustments: 0,
    netAmount: 0,
    status: 'pending',
    method: 'bank',
    paidAt: null,
    scheduledFor: '2026-10-31',
  },
];

const LEDGER: LedgerEntry[] = [
  {
    id: 'led_0001',
    date: '2026-09-01T08:00:00Z',
    type: 'sale',
    description: 'Order ORD-2026-000108 — 2 items',
    reference: 'ORD-2026-000108',
    debit: 0,
    credit: 342.5,
    balance: 342.5,
  },
  {
    id: 'led_0002',
    date: '2026-09-01T08:00:00Z',
    type: 'commission',
    description: 'Platform commission @ 10%',
    reference: 'ORD-2026-000108',
    debit: 34.25,
    credit: 0,
    balance: 308.25,
  },
  {
    id: 'led_0003',
    date: '2026-09-03T12:45:00Z',
    type: 'sale',
    description: 'Order ORD-2026-000112 — 1 item',
    reference: 'ORD-2026-000112',
    debit: 0,
    credit: 189.0,
    balance: 497.25,
  },
  {
    id: 'led_0004',
    date: '2026-09-03T12:45:00Z',
    type: 'commission',
    description: 'Platform commission @ 10%',
    reference: 'ORD-2026-000112',
    debit: 18.9,
    credit: 0,
    balance: 478.35,
  },
  {
    id: 'led_0005',
    date: '2026-09-10T09:00:00Z',
    type: 'fee',
    description: 'Payment gateway fee (Stripe)',
    reference: 'FEE-2026-09-10',
    debit: 12.4,
    credit: 0,
    balance: 465.95,
  },
  {
    id: 'led_0006',
    date: '2026-09-15T09:00:00Z',
    type: 'payout',
    description: 'Payout PAY-2026-09-15 to bank account ****4821',
    reference: 'PAY-2026-09-15',
    debit: 4243.95,
    credit: 0,
    balance: -3778.0,
  },
  {
    id: 'led_0007',
    date: '2026-09-22T14:12:00Z',
    type: 'sale',
    description: 'Order ORD-2026-000131 — 4 items',
    reference: 'ORD-2026-000131',
    debit: 0,
    credit: 612.75,
    balance: -3165.25,
  },
  {
    id: 'led_0008',
    date: '2026-09-22T14:12:00Z',
    type: 'commission',
    description: 'Platform commission @ 10%',
    reference: 'ORD-2026-000131',
    debit: 61.28,
    credit: 0,
    balance: -3226.53,
  },
  {
    id: 'led_0009',
    date: '2026-09-27T10:30:00Z',
    type: 'refund',
    description: 'Refund — Order ORD-2026-000131, damaged item',
    reference: 'ORD-2026-000131',
    debit: 82.5,
    credit: 0,
    balance: -3309.03,
  },
  {
    id: 'led_0010',
    date: '2026-10-01T09:00:00Z',
    type: 'payout',
    description: 'Payout PAY-2026-09-30 to bank account ****4821',
    reference: 'PAY-2026-09-30',
    debit: 4689.67,
    credit: 0,
    balance: -7998.7,
  },
  {
    id: 'led_0011',
    date: '2026-10-04T16:20:00Z',
    type: 'sale',
    description: 'Order ORD-2026-000140 — 2 items',
    reference: 'ORD-2026-000140',
    debit: 0,
    credit: 448.36,
    balance: -7550.34,
  },
  {
    id: 'led_0012',
    date: '2026-10-04T16:20:00Z',
    type: 'commission',
    description: 'Platform commission @ 10%',
    reference: 'ORD-2026-000140',
    debit: 44.84,
    credit: 0,
    balance: -7595.18,
  },
  {
    id: 'led_0013',
    date: '2026-10-07T11:00:00Z',
    type: 'adjustment',
    description: 'Goodwill credit — delayed shipment, order ORD-2026-000125',
    reference: 'ADJ-2026-10-07',
    debit: 15.0,
    credit: 0,
    balance: -7610.18,
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

const ORDER_STATUS_TONE: Record<ApiOrderStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  payment_pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-sky-100 text-sky-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
  refunded: 'bg-rose-100 text-rose-800',
  failed: 'bg-rose-100 text-rose-800',
};

const ORDER_STATUS_LABEL: Record<ApiOrderStatus, string> = {
  pending: 'Pending',
  payment_pending: 'Payment pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

const ORDER_STATUS_FILTERS: { value: ApiOrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'payment_pending', label: 'Payment pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
];

const PAYOUT_STATUS_TONE: Record<PayoutStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_transit: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};

const LEDGER_TYPE_LABEL: Record<LedgerEntryType, string> = {
  sale: 'Sale',
  commission: 'Commission',
  payout: 'Payout',
  refund: 'Refund',
  adjustment: 'Adjustment',
  fee: 'Fee',
};

const LEDGER_TYPE_TONE: Record<LedgerEntryType, string> = {
  sale: 'bg-emerald-100 text-emerald-800',
  commission: 'bg-rose-100 text-rose-800',
  payout: 'bg-sky-100 text-sky-800',
  refund: 'bg-amber-100 text-amber-800',
  adjustment: 'bg-violet-100 text-violet-800',
  fee: 'bg-slate-100 text-slate-700',
};

const customerName = (o: ApiOrder) =>
  `${o.customer?.first_name ?? ''} ${o.customer?.last_name ?? ''}`.trim() ||
  o.user?.full_name ||
  '—';

const customerEmail = (o: ApiOrder) =>
  o.customer?.email || o.user?.email || '—';

const formatPaymentMethod = (method: string) =>
  method.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ============================================
// COMPONENT
// ============================================

type Tab = 'orders' | 'ledger' | 'payouts';

const SellerOrderandLedger = () => {
  // Redux's `currentStore` is only populated after some other page
  // dispatches setCurrentStore() or getMyStoresThunk fulfils. If the
  // user lands here directly, it's null. Fall back to the first store
  // from useGetMyStoresQuery so the page self-heals.
  const currentStoreFromRedux = useSelector(selectCurrentStore);
  const { data: storesData, isLoading: storesLoading } = useGetMyStoresQuery();

  const stores = storesData?.data ?? [];
  const store = currentStoreFromRedux ?? stores[0] ?? null;
  const storeId = store?.id ?? null;

  const [tab, setTab] = useState<Tab>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 20;

  // ---- Orders query (scoped to the active store) ----
  const query: GetOrdersQuery = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: orderSearch.trim() || undefined,
      status: statusFilter === 'all' ? undefined : [statusFilter],
      sortBy: 'created_at',
      sortOrder: 'desc',
    }),
    [page, orderSearch, statusFilter],
  );

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetStoreOrdersQuery(
    { storeId: storeId ?? '', params: query },
    { skip: !storeId },
  );

  const orders = ordersData?.data ?? [];
  const ordersPagination = ordersData?.pagination;
  const ordersSummary = ordersData?.summary;

  // ---- Summary derived from orders + dummy payouts ----
  const summary = useMemo(() => {
    const grossRevenue = ordersSummary?.total_revenue ?? 0;
    const statusBreakdown = ordersSummary?.status_breakdown ?? {};

    const refundedTotal = orders
      .filter((o) => o.status === 'refunded' || o.status === 'failed')
      .reduce((sum, o) => sum + o.total, 0);

    const platformFees = grossRevenue * 0.1;
    const netEarnings = grossRevenue - platformFees - refundedTotal;

    const lifetimePaid = PAYOUTS.filter((p) => p.status === 'paid').reduce(
      (sum, p) => sum + p.netAmount,
      0,
    );
    const pendingPayout = PAYOUTS.filter(
      (p) => p.status === 'pending' || p.status === 'in_transit',
    ).reduce((sum, p) => sum + p.netAmount, 0);

    return {
      grossRevenue,
      platformFees,
      refundedTotal,
      netEarnings,
      lifetimePaid,
      pendingPayout,
      statusBreakdown,
    };
  }, [orders, ordersSummary]);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderSearch(e.target.value);
    setPage(1);
  };
  const onStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ApiOrderStatus | 'all');
    setPage(1);
  };

  const ordersTotal = ordersPagination?.total ?? 0;
  const ordersPages = ordersPagination?.pages ?? 1;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Orders &amp; Ledger
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track sales, refunds, payouts and your running account balance.
          {store && ` · ${store.name}`}
        </p>
      </header>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Gross revenue"
          value={currency(summary.grossRevenue)}
          hint="Paid, processing, shipped, delivered"
        />
        <SummaryCard
          label="Net earnings"
          value={currency(summary.netEarnings)}
          hint="After fees and refunds"
        />
        <SummaryCard
          label="Lifetime paid out"
          value={currency(summary.lifetimePaid)}
          hint={`${PAYOUTS.filter((p) => p.status === 'paid').length} payouts`}
        />
        <SummaryCard
          label="Pending payout"
          value={currency(summary.pendingPayout)}
          hint="In transit or scheduled"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['orders', `Orders (${ordersTotal})`],
            ['payouts', `Payouts (${PAYOUTS.length})`],
            ['ledger', `Ledger (${LEDGER.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as Tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
            <input
              value={orderSearch}
              onChange={onSearchChange}
              placeholder="Search by reference, customer, or product…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={onStatusChange}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {ORDER_STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Store gating — only render after the stores query settles. */}
          {!storesLoading && !store && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
              No active store. Create one to see orders here.
            </div>
          )}

          {ordersError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Failed to load orders.
              <button
                onClick={() => refetchOrders()}
                className="ml-3 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {store && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {ordersLoading || storesLoading ? (
                <OrdersTableSkeleton />
              ) : orders.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No orders match your filters.
                </div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Placed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {order.order_number}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.items.length} item
                            {order.items.length > 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800">
                            {customerName(order)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customerEmail(order)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_TONE[order.status]}`}
                          >
                            {ORDER_STATUS_LABEL[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">
                          {formatPaymentMethod(order.payment.method)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                          {currency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {shortDate(order.placed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagination */}
          {store && ordersTotal > 0 && ordersPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
              <p className="text-slate-600">
                Showing {(page - 1) * PAGE_LIMIT + 1}–
                {Math.min(page * PAGE_LIMIT, ordersTotal)} of {ordersTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || ordersFetching}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-800">
                  Page {page} of {ordersPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(ordersPages, p + 1))}
                  disabled={page >= ordersPages || ordersFetching}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payouts tab — unchanged */}
      {tab === 'payouts' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Fees</th>
                <th className="px-4 py-3 text-right">Refunds</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PAYOUTS.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.reference}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {shortDate(p.periodStart)} — {shortDate(p.periodEnd)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {currency(p.grossAmount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                    −{currency(p.platformFees)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                    {p.refunds > 0 ? `−${currency(p.refunds)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {currency(p.netAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PAYOUT_STATUS_TONE[p.status]}`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.paidAt ? shortDate(p.paidAt) : shortDate(p.scheduledFor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ledger tab — unchanged */}
      {tab === 'ledger' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LEDGER.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {shortDateTime(entry.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${LEDGER_TYPE_TONE[entry.type]}`}
                    >
                      {LEDGER_TYPE_LABEL[entry.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{entry.description}</div>
                    <div className="text-xs text-slate-500">
                      {entry.reference}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                    {entry.debit > 0 ? currency(entry.debit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {entry.credit > 0 ? currency(entry.credit) : '—'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      entry.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {currency(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const SummaryCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-xl font-semibold text-slate-900 tabular-nums">
      {value}
    </p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

const OrdersTableSkeleton = () => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
        <div className="h-4 w-4 rounded bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-1/5 rounded bg-slate-200" />
        </div>
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="h-3 w-16 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

export default SellerOrderandLedger;