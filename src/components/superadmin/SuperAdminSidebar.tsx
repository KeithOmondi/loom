import { NavLink } from 'react-router-dom';
import {
  // Home
  LayoutDashboard,
  BarChart3,
  Activity,

  // Sellers
  Store,
  UserPlus,
  Award,
  Gauge,
  FileCheck2,

  // Products
  Package,
  CheckSquare,
  FolderTree,
  Tags,
  Layers,
  Flag,

  // Orders & Delivery
  ShoppingBag,
  XCircle,
  RotateCcw,
  MessageSquareWarning,
  Truck,
  MapPin,
  Warehouse,

  // Money
  Wallet,
  Landmark,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  Lock,
  FileText,

  // Customers
  Users,
  Star,
  Coins,
  LifeBuoy,
  UserX,

  // Marketing
  BadgePercent,
  Ticket,
  Megaphone,
  Share2,
  Image,

  // Content & Messages
  Bell,
  Mail,
  HelpCircle,

  // Team & Settings
  KeyRound,
  ScrollText,
  Plug,
  Database,
  Globe,
  ToggleRight,
  Settings,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

/**
 * Counts shown as red badges, keyed by the item's route.
 * Pass whatever your API returns, e.g.
 * { '/super-admin/seller-applications': 4, '/super-admin/disputes': 2 }
 * Zero or missing = no badge.
 */
interface SuperAdminSidebarProps {
  badges?: Record<string, number>;
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'Home',
    items: [
      { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/super-admin/reports', label: 'Sales & Reports', icon: BarChart3 },
      { to: '/super-admin/live-metrics', label: 'System Status', icon: Activity },
    ],
  },
  {
    groupLabel: 'Sellers',
    items: [
      { to: '/super-admin/stores', label: 'All Sellers', icon: Store },
      { to: '/super-admin/verifications', label: 'Seller Applications', icon: UserPlus },
      { to: '/super-admin/vendor-documents', label: 'Seller Documents', icon: FileCheck2 },
      { to: '/super-admin/vendor-compliance', label: 'Seller Performance', icon: Gauge },
      { to: '/super-admin/seller-plans', label: 'Seller Plans', icon: Award },
    ],
  },
  {
    groupLabel: 'Products',
    items: [
      { to: '/super-admin/products', label: 'All Products', icon: Package },
      { to: '/super-admin/product-approvals', label: 'Products to Review', icon: CheckSquare },
      { to: '/super-admin/reported-items', label: 'Reported Listings', icon: Flag },
      { to: '/super-admin/categories', label: 'Categories', icon: FolderTree },
      { to: '/super-admin/attributes', label: 'Sizes, Colors & Options', icon: Tags },
      { to: '/super-admin/brands', label: 'Brands', icon: Layers },
    ],
  },
  {
    groupLabel: 'Orders & Delivery',
    items: [
      { to: '/super-admin/orders', label: 'All Orders', icon: ShoppingBag },
      { to: '/super-admin/cancellations', label: 'Cancelled Orders', icon: XCircle },
      { to: '/super-admin/returns', label: 'Returns & Refunds', icon: RotateCcw },
      { to: '/super-admin/disputes', label: 'Order Disputes', icon: MessageSquareWarning },
      { to: '/super-admin/logistics', label: 'Delivery Partners', icon: Truck },
      { to: '/super-admin/shipping-zones', label: 'Delivery Areas & Fees', icon: MapPin },
      { to: '/super-admin/warehouses', label: 'Warehouses & Pickup Points', icon: Warehouse },
    ],
  },
  {
    groupLabel: 'Money',
    items: [
      { to: '/super-admin/transactions', label: 'All Payments', icon: ArrowRightLeft },
      { to: '/super-admin/payouts', label: 'Seller Payouts', icon: Wallet },
      { to: '/super-admin/payout-accounts', label: 'Seller Bank & M-Pesa Details', icon: Landmark },
      { to: '/super-admin/escrow-ledger', label: 'Money on Hold', icon: Lock },
      { to: '/super-admin/commissions', label: 'Commission & Fees', icon: Receipt },
      { to: '/super-admin/payment-gateways', label: 'Payment Methods', icon: CreditCard },
      { to: '/super-admin/taxation', label: 'Taxes (KRA)', icon: FileText },
    ],
  },
  {
    groupLabel: 'Customers',
    items: [
      { to: '/super-admin/users', label: 'All Customers', icon: Users },
      { to: '/super-admin/support-tickets', label: 'Help Requests', icon: LifeBuoy },
      { to: '/super-admin/reviews', label: 'Reviews & Ratings', icon: Star },
      { to: '/super-admin/loyalty-wallets', label: 'Wallets & Store Credit', icon: Coins },
      { to: '/super-admin/blacklists', label: 'Blocked Accounts', icon: UserX },
    ],
  },
  {
    groupLabel: 'Promotions',
    items: [
      { to: '/super-admin/promotions', label: 'Sales & Deals', icon: BadgePercent },
      { to: '/super-admin/coupons', label: 'Coupons & Discount Codes', icon: Ticket },
      { to: '/super-admin/banners', label: 'Homepage Banners', icon: Image },
      { to: '/super-admin/ad-manager', label: 'Paid Featured Listings', icon: Megaphone },
      { to: '/super-admin/affiliates', label: 'Referrals & Affiliates', icon: Share2 },
    ],
  },
  {
    groupLabel: 'Content & Messages',
    items: [
      { to: '/super-admin/announcements', label: 'Announcements', icon: Bell },
      { to: '/super-admin/notifications', label: 'Email & SMS Messages', icon: Mail },
      { to: '/super-admin/pages', label: 'Pages & Policies', icon: FileText },
      { to: '/super-admin/help-center', label: 'Help Center & FAQs', icon: HelpCircle },
    ],
  },
  {
    groupLabel: 'Team & Settings',
    items: [
      { to: '/super-admin/staff-roles', label: 'Staff & Permissions', icon: KeyRound },
      { to: '/super-admin/audit-logs', label: 'Activity History', icon: ScrollText },
      { to: '/super-admin/localization', label: 'Currency & Language', icon: Globe },
      { to: '/super-admin/feature-flags', label: 'Feature Switches', icon: ToggleRight },
      { to: '/super-admin/integrations', label: 'Connected Apps & API Keys', icon: Plug },
      { to: '/super-admin/backups', label: 'Backups', icon: Database },
      { to: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

const SuperAdminSidebar = ({ badges = {} }: SuperAdminSidebarProps) => {
  return (
    <aside className="hidden md:flex md:flex-col w-72 shrink-0 border-r border-neutral-200 bg-white h-screen sticky top-0 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
            M
          </div>
          <span className="text-base font-bold font-serif uppercase tracking-tight text-neutral-900">LoOM</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
          v2.4
        </span>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Super admin"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200"
      >
        {navGroups.map((group) => (
          <div key={group.groupLabel} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {group.groupLabel}
            </div>
            {group.items.map(({ to, label, icon: Icon, end }) => {
              const count = badges[to] ?? 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  {count > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Status */}
      <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0 bg-neutral-50/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-neutral-700">Live site</span>
        </div>
        <span className="text-[11px] text-neutral-400">Nairobi</span>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;