// src/pages/seller/DashboardPage.tsx

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Truck,
  RotateCcw,
  PlusCircle,
  Megaphone,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { selectAuthUser } from '../../store/slices/authSlice';
import { selectSellerProfile } from '../../store/slices/sellerSlice';
import { selectCurrentStore } from '../../store/slices/storeSlice';

// ============================================
// Mock Data Sets
// ============================================

const REVENUE_TIMELINE = [
  { date: 'Sep 01', revenue: 2400, orders: 18 },
  { date: 'Sep 03', revenue: 1398, orders: 12 },
  { date: 'Sep 05', revenue: 9800, orders: 45 },
  { date: 'Sep 07', revenue: 3908, orders: 28 },
  { date: 'Sep 09', revenue: 4800, orders: 32 },
  { date: 'Sep 11', revenue: 3800, orders: 24 },
  { date: 'Sep 13', revenue: 8300, orders: 51 },
  { date: 'Sep 15', revenue: 11200, orders: 64 },
];

const CATEGORY_DISTRIBUTION = [
  { name: 'Apparel & Fashion', value: 45, color: '#0f172a' },
  { name: 'Electronics', value: 25, color: '#f59e0b' },
  { name: 'Home & Living', value: 18, color: '#10b981' },
  { name: 'Beauty & Personal Care', value: 12, color: '#6366f1' },
];

const FULFILLMENT_STATS = [
  { name: 'Unfulfilled', count: 14, icon: Clock, color: 'text-amber-600 bg-amber-50' },
  { name: 'Ready to Ship', count: 8, icon: Package, color: 'text-sky-600 bg-sky-50' },
  { name: 'In Transit', count: 29, icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
  { name: 'Returns/RMA', count: 2, icon: RotateCcw, color: 'text-rose-600 bg-rose-50' },
];

const RECENT_ORDERS = [
  {
    id: 'ORD-94821',
    customer: 'Sarah Jenkins',
    product: 'Leather Minimalist Wallet',
    amount: '$64.00',
    status: 'Paid',
    fulfillment: 'Processing',
    date: '10 mins ago',
  },
  {
    id: 'ORD-94820',
    customer: 'Michael Vance',
    product: 'Wireless Noise-Canceling Earbuds',
    amount: '$129.99',
    status: 'Paid',
    fulfillment: 'Ready to Ship',
    date: '25 mins ago',
  },
  {
    id: 'ORD-94819',
    customer: 'Elena Rostova',
    product: 'Ceramic Pour-Over Coffee Set',
    amount: '$45.50',
    status: 'Paid',
    fulfillment: 'Shipped',
    date: '1 hour ago',
  },
  {
    id: 'ORD-94818',
    customer: 'David K.',
    product: 'Organic Cotton Oversized Tee (XL)',
    amount: '$38.00',
    status: 'Refunded',
    fulfillment: 'Cancelled',
    date: '3 hours ago',
  },
];

const LOW_STOCK_ALERTS = [
  { id: 'SKU-091', name: 'Mechanical Keyboard Switch Pack', stock: 3, threshold: 10 },
  { id: 'SKU-204', name: 'Matte Black Water Bottle (750ml)', stock: 2, threshold: 15 },
  { id: 'SKU-118', name: 'USB-C Braided Cable (2m)', stock: 5, threshold: 20 },
];

// ============================================
// HELPERS
// ============================================

const TIER_LABEL: Record<string, string> = {
  basic: 'BASIC',
  pro: 'PRO STORE',
  enterprise: 'ENTERPRISE',
};

const TIER_TONE: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-amber-100 text-amber-800 border-amber-200',
  enterprise: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const greetingForHour = (h: number) => {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ============================================
// Main Dashboard Page
// ============================================

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const authUser = useSelector(selectAuthUser);
  const sellerProfile = useSelector(selectSellerProfile);
  const currentStore = useSelector(selectCurrentStore);

  const firstName = authUser?.full_name?.split(' ')[0] ?? 'there';
  const tier = sellerProfile?.tier ?? 'basic';
  const storeName = currentStore?.name;

  const greeting = useMemo(
    () => greetingForHour(new Date().getHours()),
    [],
  );

  // Slice the timeline according to the selected range. The mock data has
  // only 8 points, but the shape is correct for a real time series.
  const filteredTimeline = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    // Each mock point represents ~2 days, so convert days → points.
    const pointCount = Math.max(1, Math.ceil(days / 2));
    return REVENUE_TIMELINE.slice(-pointCount);
  }, [timeRange]);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen font-sans text-slate-800">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {greeting}, {firstName} 👋
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${TIER_TONE[tier] ?? TIER_TONE.basic}`}
            >
              {TIER_LABEL[tier] ?? tier.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {storeName
              ? `Here is your daily performance summary for ${storeName}.`
              : 'Here is your daily performance summary and order fulfillment queue.'}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            <PlusCircle size={15} />
            Add Product
          </Link>
          <Link
            to="/promotions"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            <Megaphone size={15} />
            Create Campaign
          </Link>
          <Link
            to="/seller/payouts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            <CreditCard size={15} />
            Request Payout
          </Link>
        </div>
      </div>

      {/* KPI Key Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Sales</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600" aria-hidden>
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">$42,590.00</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-600">
              <ArrowUpRight size={14} aria-hidden />
              <span>+14.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600" aria-hidden>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">1,284</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-600">
              <ArrowUpRight size={14} aria-hidden />
              <span>+8.4% from last month</span>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Store Conversion</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600" aria-hidden>
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">3.42%</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-rose-600">
              <ArrowDownRight size={14} aria-hidden />
              <span>-0.5% from last week</span>
            </div>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg. Order Value</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600" aria-hidden>
              <Package size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">$68.40</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-600">
              <ArrowUpRight size={14} aria-hidden />
              <span>+$2.10 trend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fulfillment Pipeline Quick Glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FULFILLMENT_STATS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={`/seller/orders?fulfillment=${encodeURIComponent(item.name.toLowerCase().replace(/\s+/g, '_'))}`}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{item.name}</p>
                <p className="text-xl font-bold text-slate-900">{item.count}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${item.color}`} aria-hidden>
                <Icon size={20} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sales Trend Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue & Volume Trend</h2>
              <p className="text-xs text-slate-500">Gross revenue vs order count over time</p>
            </div>

            {/* Time Filter Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    timeRange === range
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTimeline}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Top Categories</h2>
            <p className="text-xs text-slate-500">Sales share by product group</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2">
            {CATEGORY_DISTRIBUTION.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-slate-700">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Ledger & Side Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Ledger Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
              <p className="text-xs text-slate-500">Live transactions and order status</p>
            </div>
            <Link
              to="/seller/orders"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View All <ChevronRight size={14} aria-hidden />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Fulfillment</th>
                  <th className="py-3 px-6 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {RECENT_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{order.id}</td>
                    <td className="py-3.5 px-6">
                      <div className="text-slate-800">{order.customer}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{order.product}</div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-900 font-bold">{order.amount}</td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          order.fulfillment === 'Processing'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : order.fulfillment === 'Ready to Ship'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : order.fulfillment === 'Shipped'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {order.fulfillment}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400 text-[11px]">
                      {order.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock & Inventory Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" aria-hidden />
              <h2 className="text-base font-bold text-slate-900">Stock Alerts</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {LOW_STOCK_ALERTS.length} Low
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Items near or below reorder threshold.
          </p>

          <div className="space-y-3 pt-2">
            {LOW_STOCK_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{alert.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{alert.id}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-rose-600">{alert.stock} left</span>
                  <p className="text-[10px] text-slate-400">Min: {alert.threshold}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/seller/inventory"
            className="block w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Manage Inventory
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;