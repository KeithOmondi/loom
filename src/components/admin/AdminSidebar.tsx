import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Store,
  ShieldCheck,
  Award,
  UserCheck,
  FileCheck2,
  Building2,
  Package,
  FolderTree,
  Tags,
  Layers,
  Sparkles,
  Barcode,
  CheckSquare,
  ShoppingBag,
  Truck,
  RotateCcw,
  MessageSquareWarning,
  MapPin,
  Warehouse,
  Wallet,
  Receipt,
  FileText,
  CreditCard,
  Building,
  History,
  Users,
  Star,
  Coins,
  Ticket,
  UserX,
  BadgePercent,
  Megaphone,
  Share2,
  Image,
  FileSpreadsheet,
  HelpCircle,
  Mail,
  KeyRound,
  ShieldAlert,
  Webhook,
  SlidersHorizontal,
  Server,
  Database,
  Globe,
  Settings,
  X,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: string;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'Overview & Health',
    items: [
      { to: '/super-admin', label: 'Executive Dashboard', icon: LayoutDashboard, end: true },
      { to: '/super-admin/live-metrics', label: 'System Uptime & Live Metrics', icon: Activity },
    ],
  },
  {
    groupLabel: 'Merchant & Vendor Governance',
    items: [
      { to: '/super-admin/stores', label: 'Store Directory', icon: Store },
      { to: '/super-admin/verifications', label: 'KYC / KYB Approvals', icon: ShieldCheck },
      { to: '/super-admin/seller-plans', label: 'Subscription Tiers', icon: Award },
      { to: '/super-admin/vendor-compliance', label: 'Vendor Performance & SLA', icon: UserCheck },
      { to: '/super-admin/vendor-documents', label: 'Business Licenses Vault', icon: FileCheck2 },
      { to: '/super-admin/payout-accounts', label: 'Bank & M-Pesa Accounts', icon: Building2 },
    ],
  },
  {
    groupLabel: 'Global Catalog & Inventory',
    items: [
      { to: '/super-admin/products', label: 'All Products', icon: Package },
      { to: '/super-admin/product-approvals', label: 'Product Moderation Queue', icon: CheckSquare },
      { to: '/super-admin/categories', label: 'Category Hierarchy', icon: FolderTree },
      { to: '/super-admin/attributes', label: 'Attributes & Variants', icon: Tags },
      { to: '/super-admin/brands', label: 'Brand Registry & IP', icon: Layers },
      { to: '/super-admin/barcodes', label: 'GTIN / Barcode Governance', icon: Barcode },
      { to: '/super-admin/ai-enrichment', label: 'AI Catalog Processing', icon: Sparkles },
    ],
  },
  {
    groupLabel: 'Orders, Logistics & Claims',
    items: [
      { to: '/super-admin/orders', label: 'Global Orders Ledger', icon: ShoppingBag },
      { to: '/super-admin/disputes', label: 'Disputes & Claim Overrides', icon: MessageSquareWarning },
      { to: '/super-admin/returns', label: 'Returns & RMA Center', icon: RotateCcw },
      { to: '/super-admin/logistics', label: '3PL Carriers & Fulfillment', icon: Truck },
      { to: '/super-admin/warehouses', label: 'Cross-Dock & Warehouses', icon: Warehouse },
      { to: '/super-admin/shipping-zones', label: 'Shipping Zones & Rates', icon: MapPin },
    ],
  },
  {
    groupLabel: 'Financial Ledger & Compliance',
    items: [
      { to: '/super-admin/payouts', label: 'Payout Settlements', icon: Wallet },
      { to: '/super-admin/commissions', label: 'Commission Rules Engine', icon: Receipt },
      { to: '/super-admin/taxation', label: 'KRA / Tax Compliance', icon: FileText },
      { to: '/super-admin/payment-gateways', label: 'Payment Gateways', icon: CreditCard },
      { to: '/super-admin/escrow-ledger', label: 'Escrow & Hold Accounts', icon: Building },
      { to: '/super-admin/financial-reports', label: 'Reconciliation Logs', icon: History },
    ],
  },
  {
    groupLabel: 'Customers & Loyalty',
    items: [
      { to: '/super-admin/users', label: 'Customer Directory', icon: Users },
      { to: '/super-admin/reviews', label: 'Review Moderation', icon: Star },
      { to: '/super-admin/loyalty-wallets', label: 'Customer Wallets & Credits', icon: Coins },
      { to: '/super-admin/support-tickets', label: 'Customer Support Tickets', icon: Ticket },
      { to: '/super-admin/blacklists', label: 'Fraud & Banned Accounts', icon: UserX },
    ],
  },
  {
    groupLabel: 'Marketing & Promotions',
    items: [
      { to: '/super-admin/promotions', label: 'Platform Flash Sales', icon: BadgePercent },
      { to: '/super-admin/coupons', label: 'Global Vouchers', icon: Ticket },
      { to: '/super-admin/ad-manager', label: 'Featured Listings & Ads', icon: Megaphone },
      { to: '/super-admin/affiliates', label: 'Affiliates & Referrals', icon: Share2 },
      { to: '/super-admin/banners', label: 'Banners Placement Engine', icon: Image },
    ],
  },
  {
    groupLabel: 'CMS & Communications',
    items: [
      { to: '/super-admin/pages', label: 'Static Pages & Policies', icon: FileSpreadsheet },
      { to: '/super-admin/help-center', label: 'Knowledge Base & FAQs', icon: HelpCircle },
      { to: '/super-admin/notifications', label: 'SMS & Email Templates', icon: Mail },
    ],
  },
  {
    groupLabel: 'System & Security',
    items: [
      { to: '/super-admin/staff-roles', label: 'RBAC Staff Roles & ACL', icon: KeyRound },
      { to: '/super-admin/audit-logs', label: 'Immutable Audit Logs', icon: ShieldAlert },
      { to: '/super-admin/integrations', label: 'Webhooks & API Keys', icon: Webhook },
      { to: '/super-admin/system-queues', label: 'Background Jobs & Queues', icon: Server },
      { to: '/super-admin/backups', label: 'Database & Asset Backups', icon: Database },
      { to: '/super-admin/localization', label: 'Currencies & Localization', icon: Globe },
      { to: '/super-admin/feature-flags', label: 'Feature Toggles', icon: SlidersHorizontal },
      { to: '/super-admin/settings', label: 'Global Engine Settings', icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 w-72 h-screen bg-white border-r border-neutral-200 flex flex-col shrink-0 shadow-sm transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              M
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-neutral-900 block leading-none">
                Marketplace
              </span>
              <span className="text-[10px] font-semibold text-neutral-400 block leading-none mt-1">
                Admin Console
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                {group.groupLabel}
              </div>
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
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
                  {badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Operational Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-neutral-700">Production</span>
          </div>
          <span className="font-mono text-[10px] text-neutral-400">v2.4.0</span>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;