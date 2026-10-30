// src/components/seller/SellerSidebar.tsx

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import { useGetSellerProfileStatusQuery } from '../../api/sellerApi';
import { useGetMyStoresQuery } from '../../api/storeApi';
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  ShoppingBag,
  RotateCcw,
  Truck,
  BadgePercent,
  Wallet,
  CreditCard,
  Store,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  Bell,
  Settings,
  LogOut,
  AlertCircle,
  UserCircle,
  Clock,
  XCircle,
  PauseCircle,
  ChevronRight,
  X,
  ChevronLeft,
  Tags,
} from 'lucide-react';

// ============================================
// Config
// ============================================

/**
 * Feature phase currently shipped. Items tagged `phase: 2` stay in the config
 * but are hidden until you bump this to 2. Untagged items are phase 1.
 */
const ACTIVE_PHASE: 1 | 2 = 1;

// ============================================
// Types
// ============================================

type SellerStatusValue =
  | 'pending'
  | 'kyc_submitted'
  | 'kyc_update_pending'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'closed';

type StoreStatusValue =
  | 'active'
  | 'suspended'
  | 'closed'
  | 'draft'
  | 'pending_approval'
  | 'rejected';

type Tone = 'neutral' | 'warning' | 'danger' | 'success' | 'info';

interface BadgeInfo {
  text: string;
  tone: Tone;
}

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  badge: BadgeInfo;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: BadgeInfo;
  phase?: 1 | 2;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

interface NavContext {
  sellerStatusValue?: SellerStatusValue;
  sellerVerified: boolean;
  hasSellerProfile: boolean;
  isSellerComplete: boolean;
  storeStatusValue?: StoreStatusValue;
  hasStores: boolean;
  storeIsActive: boolean;
}

interface Onboarding {
  item: NavItem;
  header: BadgeInfo;
}

interface SellerSidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

// ============================================
// Styles
// ============================================

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-[#EAE0D2] text-[#6B6159]',
  warning: 'bg-[#F5E6D3] text-[#A66E38]',
  danger: 'bg-[#FBE8E8] text-[#8B3A2B]',
  success: 'bg-[#E8F3E8] text-[#3B6E3B]',
  info: 'bg-[#E2EFF8] text-[#2B688B]',
};

// ============================================
// Status Helpers
// ============================================

function getSellerStatusConfig(status?: SellerStatusValue): StatusConfig {
  switch (status) {
    case 'pending':
    case 'kyc_submitted':
    case 'kyc_update_pending':
      return {
        label: 'KYC Under Review',
        icon: Clock,
        badge: { text: 'Pending', tone: 'warning' },
      };
    case 'rejected':
      return {
        label: 'KYC Rejected',
        icon: XCircle,
        badge: { text: 'Action Req.', tone: 'danger' },
      };
    case 'suspended':
      return {
        label: 'Account Suspended',
        icon: PauseCircle,
        badge: { text: 'Suspended', tone: 'danger' },
      };
    case 'closed':
      return {
        label: 'Account Closed',
        icon: XCircle,
        badge: { text: 'Closed', tone: 'neutral' },
      };
    default:
      return {
        label: 'Verification',
        icon: AlertCircle,
        badge: { text: 'Required', tone: 'danger' },
      };
  }
}

// Only called when the store is NOT live, so "active" here means "approved, going live".
function getStoreStatusConfig(status?: StoreStatusValue): StatusConfig {
  switch (status) {
    case 'suspended':
      return {
        label: 'Store Suspended',
        icon: PauseCircle,
        badge: { text: 'Suspended', tone: 'danger' },
      };
    case 'closed':
      return {
        label: 'Store Closed',
        icon: XCircle,
        badge: { text: 'Closed', tone: 'neutral' },
      };
    case 'rejected':
      return {
        label: 'Store Rejected',
        icon: XCircle,
        badge: { text: 'Action Req.', tone: 'danger' },
      };
    case 'draft':
      return {
        label: 'Store Draft',
        icon: Store,
        badge: { text: 'Draft', tone: 'warning' },
      };
    case 'pending_approval':
      return {
        label: 'Store Review',
        icon: Clock,
        badge: { text: 'Pending', tone: 'warning' },
      };
    case 'active':
    default:
      // Approved but not live yet, or an unknown status: never claim "Active".
      return {
        label: 'Store Status',
        icon: Clock,
        badge: { text: 'Pending', tone: 'warning' },
      };
  }
}

// ============================================
// Onboarding (single source of truth for sidebar + header badge)
// ============================================

/** Returns the next onboarding step, or null when the seller is fully live. */
const getOnboarding = (ctx: NavContext): Onboarding | null => {
  if (!ctx.hasSellerProfile) {
    return {
      item: {
        to: '/seller-setup',
        label: 'Create Seller Profile',
        icon: UserCircle,
        badge: { text: 'Required', tone: 'danger' },
      },
      header: { text: 'New', tone: 'neutral' },
    };
  }

  if (!ctx.isSellerComplete) {
    return {
      item: {
        to: '/seller-setup',
        label: 'Complete Profile',
        icon: UserCircle,
        badge: { text: 'Incomplete', tone: 'warning' },
      },
      header: { text: 'Setup', tone: 'warning' },
    };
  }

  if (!ctx.sellerVerified) {
    const config = getSellerStatusConfig(ctx.sellerStatusValue);
    return {
      item: {
        to: '/seller-status',
        label: config.label,
        icon: config.icon,
        badge: config.badge,
      },
      header: config.badge,
    };
  }

  if (!ctx.hasStores) {
    return {
      item: {
        to: '/store-setup',
        label: 'Create Store',
        icon: Store,
        badge: { text: 'Required', tone: 'danger' },
      },
      header: { text: 'No Store', tone: 'info' },
    };
  }

  if (!ctx.storeIsActive) {
    const config = getStoreStatusConfig(ctx.storeStatusValue);
    return {
      item: {
        to: '/store-status',
        label: config.label,
        icon: config.icon,
        badge: config.badge,
      },
      header: config.badge,
    };
  }

  return null;
};

// ============================================
// Navigation
// ============================================

const FULL_NAV: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Seller Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupLabel: 'Products & Stock',
    items: [
      { to: '/products', label: 'Catalog', icon: Package, end: true },
      { to: '/seller/variants', label: 'Product options', icon: Tags },
      { to: '/seller/inventory', label: 'Inventory Alerts', icon: FolderKanban },
    ],
  },
  {
    groupLabel: 'Orders & Logistics',
    items: [
      { to: '/seller/orders', label: 'Orders Ledger', icon: ShoppingBag },
      { to: '/seller/fulfillment', label: 'Shipping & Waybills', icon: Truck },
      // Returns and disputes are one workflow: build them as tabs on this page.
      { to: '/seller/returns', label: 'Returns & Disputes', icon: RotateCcw },
    ],
  },
  {
    groupLabel: 'Growth',
    items: [
      { to: '/seller/coupons', label: 'Coupons', icon: BadgePercent },
    ],
  },
  {
    groupLabel: 'Finance & Accounts',
    items: [
      { to: '/seller/payouts', label: 'Payout Settlements', icon: Wallet },
      { to: '/seller/bank-accounts', label: 'Bank & Mobile Money', icon: CreditCard },
    ],
  },
  {
    groupLabel: 'Store & Operations',
    items: [
      // Branding and banners live as a tab inside Store Profile.
      { to: '/seller/store', label: 'Store Profile', icon: Store, end: true },
      { to: '/seller/verification', label: 'KYC & Verification', icon: ShieldCheck },
    ],
  },
  {
    groupLabel: 'Support & Settings',
    items: [
      { to: '/seller/messages', label: 'Messages', icon: MessageSquare },
      { to: '/seller/notifications', label: 'Notifications', icon: Bell },
      { to: '/seller/settings', label: 'Account Settings', icon: Settings },
    ],
  },
];

// Always reachable while onboarding or restricted, so the sidebar is never empty
// and a suspended seller can still contact support.
const RESTRICTED_SUPPORT_GROUP: NavGroup = {
  groupLabel: 'Support',
  items: [
    { to: '/help', label: 'Help Center', icon: HelpCircle },
    { to: '/seller/settings', label: 'Account Settings', icon: Settings },
  ],
};

const getNavGroups = (onboarding: Onboarding | null): NavGroup[] => {
  if (onboarding) {
    return [
      { groupLabel: 'Onboarding', items: [onboarding.item] },
      RESTRICTED_SUPPORT_GROUP,
    ];
  }

  return FULL_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.phase ?? 1) <= ACTIVE_PHASE),
  })).filter((group) => group.items.length > 0);
};

// ============================================
// Small components
// ============================================

const Badge = ({ text, tone, className = '' }: BadgeInfo & { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${TONE_STYLES[tone]} ${className}`}
  >
    {text}
  </span>
);

const LiveBadge = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F3E8] text-[#3B6E3B]">
    <span className="relative flex h-1.5 w-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4E8B4E] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3B6E3B]"></span>
    </span>
    Live
  </span>
);

const NavSkeleton = () => (
  <div className="space-y-2 px-1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="h-9 rounded-2xl bg-[#EAE0D2]/60 animate-pulse" />
    ))}
  </div>
);

// ============================================
// Main Component
// ============================================

const SellerSidebar = ({
  isCollapsed = false,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}: SellerSidebarProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);

  const { data: storesData, isLoading: storesLoading } = useGetMyStoresQuery();
  const { data: sellerStatus, isLoading: sellerLoading } = useGetSellerProfileStatusQuery();

  const isLoading = storesLoading || sellerLoading;

  const currentStore = storesData?.data?.[0] ?? null;

  const hasSellerProfile = sellerStatus?.data?.exists ?? false;
  const isSellerComplete = sellerStatus?.data?.isComplete ?? false;
  const sellerStatusValue = sellerStatus?.data?.status as SellerStatusValue | undefined;
  const sellerVerified = sellerStatusValue === 'verified';

  const hasStores = currentStore !== null;
  const storeStatusValue = currentStore?.status?.status as StoreStatusValue | undefined;
  const storeIsActive = currentStore?.status?.is_live === true;

  const onboarding = getOnboarding({
    sellerStatusValue,
    sellerVerified,
    hasSellerProfile,
    isSellerComplete,
    storeStatusValue,
    hasStores,
    storeIsActive,
  });

  const navGroups = getNavGroups(onboarding);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  const renderHeaderBadge = () => {
    if (isCollapsed || isLoading) return null;
    if (onboarding) return <Badge {...onboarding.header} />;
    return <LiveBadge />;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#3E2F2A]/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-4 inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out font-sans antialiased my-0 lg:my-4 lg:ml-4 rounded-none lg:rounded-3xl bg-[#F3ECE1] border-r lg:border border-[#E3D9C9] lg:h-[calc(100vh-2rem)] shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Card */}
        <div className="p-4 border-b border-[#E3D9C9] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-2xl bg-[#8B3A2B] text-white flex items-center justify-center shrink-0 font-serif font-bold text-lg shadow-xs">
              M
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-serif font-bold text-[#3E2F2A] text-base leading-tight truncate">
                  Marketplace
                </span>
                <span className="text-[11px] text-[#8A7E72] font-medium tracking-wide uppercase truncate">
                  Merchant Hub
                </span>
              </div>
            )}
          </div>

          {renderHeaderBadge()}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="p-1 rounded-lg text-[#8A7E72] hover:text-[#3E2F2A] lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Options List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-[#E3D9C9]">
          {isLoading ? (
            <NavSkeleton />
          ) : (
            navGroups.map((group, groupIdx) => (
              <div key={group.groupLabel ?? groupIdx} className="space-y-1">
                {group.groupLabel && !isCollapsed && (
                  <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#A89F91]">
                    {group.groupLabel}
                  </div>
                )}
                {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setIsMobileOpen?.(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-[#8B3A2B] text-white shadow-xs'
                          : 'text-[#6B6159] hover:bg-[#EAE0D2]/60 hover:text-[#3E2F2A]'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`
                    }
                    title={isCollapsed ? label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            size={18}
                            className={`shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : 'text-[#8A7E72] group-hover:text-[#3E2F2A]'
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="truncate tracking-wide">{label}</span>
                          )}
                        </div>

                        {!isCollapsed && badge ? (
                          <Badge {...badge} className="text-[9px] font-bold" />
                        ) : (
                          !isCollapsed &&
                          isActive && (
                            <ChevronRight
                              size={14}
                              className="text-white/70 shrink-0"
                            />
                          )
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))
          )}
        </nav>

        {/* Footer Account Drawer */}
        <div className="p-3 border-t border-[#E3D9C9] space-y-2">
          {!isCollapsed ? (
            <div className="p-3 rounded-2xl bg-[#EAE0D2]/50 border border-[#E3D9C9]/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#8B3A2B] text-white font-serif italic text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.full_name?.charAt(0) || 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#3E2F2A] truncate leading-tight">
                    {user?.full_name || 'Store Manager'}
                  </p>
                  <p className="text-[10px] text-[#A89F91] truncate mt-0.5">
                    {currentStore?.name || (hasSellerProfile ? 'No Store Configured' : 'No Profile')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-xl text-[#8A7E72] hover:text-[#8B3A2B] hover:bg-white/60 transition-colors"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full py-2.5 flex items-center justify-center text-[#8A7E72] hover:text-[#8B3A2B] hover:bg-[#EAE0D2]/60 rounded-2xl transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}

          {/* Desktop Collapse Switcher */}
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center w-full py-2 text-[#8A7E72] hover:text-[#3E2F2A] text-xs font-medium gap-2 rounded-2xl hover:bg-[#EAE0D2]/40 transition-colors"
            >
              <ChevronLeft
                size={16}
                className={`transition-transform duration-300 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
              />
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default SellerSidebar;