// src/components/moderator/ModeratorSidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import {
    LayoutDashboard,
    ListChecks,
    Store,
    Package,
    Users,
    Flag,
    History,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
    X,
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

type BadgeKey = 'queue';
type BadgeTone = 'neutral' | 'danger';

interface ResolvedBadge {
    value: number;
    tone: BadgeTone;
    title?: string;
}

interface NavItem {
    to: string;
    label: string;
    icon: React.ElementType;
    end?: boolean;
    badgeKey?: BadgeKey;
    phase?: 1 | 2;
}

interface NavGroup {
    groupLabel?: string;
    items: NavItem[];
}

interface ModeratorSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

// ============================================
// Navigation
// ============================================

const NAV_GROUPS: NavGroup[] = [
    {
        items: [
            { to: '/moderator/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            // One queue page: build All / Pending / Urgent as tabs on this page.
            { to: '/moderator/queue', label: 'Review Queue', icon: ListChecks, badgeKey: 'queue' },
        ],
    },
    {
        groupLabel: 'Moderation',
        items: [
            // Verified / Rejected are status filters: build them as tabs on each page.
            { to: '/moderator/stores', label: 'Stores', icon: Store },
            { to: '/moderator/sellers', label: 'Sellers', icon: Users },
            { to: '/moderator/products-approval', label: 'Products', icon: Package },
            { to: '/moderator/flagged', label: 'Flagged Content', icon: Flag },
        ],
    },
    {
        groupLabel: 'Records',
        items: [
            { to: '/moderator/history', label: 'History', icon: History },
            { to: '/moderator/stats', label: 'Statistics', icon: BarChart3, phase: 2 },
        ],
    },
];

const VISIBLE_GROUPS: NavGroup[] = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.phase ?? 1) <= ACTIVE_PHASE),
})).filter((group) => group.items.length > 0);

// ============================================
// Small components
// ============================================

const formatCount = (n: number) => (n > 99 ? '99+' : String(n));

const Avatar = ({
    url,
    name,
    fallback,
}: {
    url?: string | null;
    name?: string | null;
    fallback: string;
}) =>
    url ? (
        <img
            src={url}
            alt={name || 'User'}
            className="w-8 h-8 rounded-full object-cover border border-[#E3D9C9] shrink-0"
        />
    ) : (
        <div className="w-8 h-8 rounded-full bg-[#8B3A2B] text-white font-semibold text-xs flex items-center justify-center shrink-0 border border-white/50 shadow-xs">
            {name?.charAt(0) || fallback}
        </div>
    );

const LogoutButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="p-1.5 text-[#A89F91] hover:text-[#8B3A2B] hover:bg-[#F3ECE1] rounded-full transition-colors shrink-0"
        title="Log out"
        aria-label="Log out"
    >
        <LogOut size={15} />
    </button>
);

// ============================================
// Main Component
// ============================================

const ModeratorSidebar: React.FC<ModeratorSidebarProps> = ({
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen,
}) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);
    const { queueSummary } = useAppSelector((state) => state.moderator);

    const pendingCount = queueSummary?.pending ?? 0;
    const urgentCount = queueSummary?.by_priority?.urgent ?? 0;

    // Labels are visible when expanded, and always on the mobile drawer.
    const showLabels = !isCollapsed || isMobileOpen;

    const handleLogout = async () => {
        await dispatch(logoutThunk());
        navigate('/login', { replace: true });
    };

    const resolveBadge = (key?: BadgeKey): ResolvedBadge | null => {
        if (key === 'queue' && pendingCount > 0) {
            return {
                value: pendingCount,
                // Turns red-toned whenever anything urgent is waiting.
                tone: urgentCount > 0 ? 'danger' : 'neutral',
                title: urgentCount > 0 ? `${pendingCount} pending, ${urgentCount} urgent` : `${pendingCount} pending`,
            };
        }
        return null;
    };

    const badgeClass = (badge: ResolvedBadge, isActive: boolean): string => {
        if (!showLabels) {
            return 'absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#8B3A2B] text-[9px] font-bold text-white shadow-sm';
        }
        const base = 'px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors';
        if (isActive) return `${base} bg-[#8B3A2B] text-white shadow-sm`;
        return badge.tone === 'danger'
            ? `${base} bg-[#FBE8E8] text-[#8B3A2B]`
            : `${base} bg-[#EAE0D2] text-[#6B6159]`;
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[#F3ECE1] border border-[#E3D9C9]/80 rounded-3xl shadow-sm select-none text-[#4A403A] p-3 overflow-hidden">
            {/* Header */}
            <div className="h-14 px-3 flex items-center justify-between shrink-0 mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-[#8B3A2B] flex items-center justify-center text-white font-serif italic text-lg shadow-sm shrink-0">
                        M
                    </div>
                    {showLabels && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-serif italic font-bold text-lg text-[#3E2F2A] leading-none">
                                Market
                            </span>
                            <span className="text-[9px] tracking-widest uppercase font-semibold text-[#A89F91] mt-0.5">
                                Console
                            </span>
                        </div>
                    )}
                </div>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-1.5 rounded-full text-[#A89F91] hover:bg-[#EAE0D2] lg:hidden transition-colors"
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>

                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex p-1.5 rounded-full text-[#A89F91] hover:text-[#3E2F2A] hover:bg-[#EAE0D2] transition-colors"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Nav List */}
            <nav className="flex-1 overflow-y-auto px-1 py-1 space-y-5 scrollbar-thin scrollbar-thumb-[#DCD3C6]">
                {VISIBLE_GROUPS.map((group, groupIdx) => (
                    <div key={group.groupLabel ?? groupIdx} className="space-y-1">
                        {group.groupLabel && showLabels && (
                            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9E9486] mb-1.5">
                                {group.groupLabel}
                            </div>
                        )}
                        {group.items.map(({ to, label, icon: Icon, end, badgeKey }) => {
                            const badge = resolveBadge(badgeKey);
                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    onClick={() => setIsMobileOpen(false)}
                                    title={showLabels ? undefined : label}
                                    className={({ isActive }) =>
                                        `group relative flex items-center min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-medium transition-all duration-200 ${
                                            showLabels ? 'justify-between' : 'justify-center'
                                        } ${
                                            isActive
                                                ? 'bg-white text-[#3E2F2A] font-semibold shadow-sm'
                                                : 'text-[#6B6159] hover:bg-white/50 hover:text-[#3E2F2A]'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon
                                                    size={18}
                                                    className={`shrink-0 transition-colors ${
                                                        isActive
                                                            ? 'text-[#8B3A2B]'
                                                            : 'text-[#9E9486] group-hover:text-[#6B6159]'
                                                    }`}
                                                />
                                                {showLabels && <span className="truncate">{label}</span>}
                                            </div>

                                            {badge && (
                                                <span
                                                    className={badgeClass(badge, isActive)}
                                                    title={badge.title}
                                                >
                                                    {formatCount(badge.value)}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* User Footer Card */}
            <div className="mt-auto shrink-0 pt-2">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2.5 border border-[#E3D9C9]/60 shadow-xs">
                    {showLabels ? (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar url={user?.avatar_url} name={user?.full_name} fallback="M" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#3E2F2A] truncate leading-tight">
                                        {user?.full_name || 'Moderator'}
                                    </p>
                                    {user?.email && (
                                        <p className="text-[10px] text-[#A89F91] truncate leading-tight mt-0.5">
                                            {user.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <LogoutButton onClick={handleLogout} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Avatar url={user?.avatar_url} name={user?.full_name} fallback="M" />
                            <LogoutButton onClick={handleLogout} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Floating Drawer */}
            <aside
                className={`hidden lg:block shrink-0 sticky top-0 h-screen p-4 transition-all duration-300 z-25 ${
                    isCollapsed ? 'w-24' : 'w-68'
                }`}
            >
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Modal */}
            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
                    isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            >
                <div
                    className="absolute inset-0 bg-[#3E2F2A]/30 backdrop-blur-xs"
                    onClick={() => setIsMobileOpen(false)}
                />
                <aside
                    className={`absolute inset-y-0 left-0 w-72 p-4 transition-transform duration-300 transform ${
                        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    {sidebarContent}
                </aside>
            </div>
        </>
    );
};

export default ModeratorSidebar;