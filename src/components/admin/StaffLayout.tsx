import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Banknote, Bell, ClipboardList, FileText, Flag, Gauge, History, LogOut, MapPin, Percent, RotateCcw, ScrollText, Settings, ShieldAlert,
  ShieldCheck, ShoppingBag, Store, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';

interface Item { to: string; label: string; icon: LucideIcon; roles?: string[] }
const ALL = ['admin', 'super_admin', 'finance', 'support'];
const ADMIN = ['admin', 'super_admin'];

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: Gauge }] },
  {
    title: 'Operations',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, roles: ['admin', 'super_admin', 'support', 'finance'] },
      { to: '/admin/disputes', label: 'Disputes', icon: ShieldAlert, roles: ['admin', 'super_admin', 'support'] },
      { to: '/admin/returns', label: 'Returns', icon: RotateCcw, roles: ['admin', 'super_admin', 'support', 'finance'] },
      { to: '/admin/fraud', label: 'Fraud flags', icon: Flag, roles: ['admin', 'super_admin', 'support'] },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/admin/refunds', label: 'Refunds', icon: Banknote, roles: ['admin', 'super_admin', 'finance'] },
      { to: '/admin/payouts', label: 'Payouts', icon: Wallet, roles: ['admin', 'super_admin', 'finance'] },
      { to: '/admin/escrow', label: 'Escrow & ledger', icon: ShieldCheck, roles: ['admin', 'super_admin', 'finance'] },
      { to: '/admin/reports', label: 'Reports', icon: ClipboardList, roles: ['admin', 'super_admin', 'finance'] },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { to: '/super-admin/stores', label: 'Vendors & KYC', icon: Store, roles: ADMIN },
      { to: '/moderator/products-approval', label: 'Product review', icon: ClipboardList, roles: ADMIN },
      { to: '/super-admin/users', label: 'Users', icon: Users, roles: ADMIN },
      { to: '/admin/promotions', label: 'Promotions', icon: Percent, roles: ADMIN },
      { to: '/admin/delivery', label: 'Delivery', icon: MapPin, roles: ADMIN },
      { to: '/admin/content', label: 'Content pages', icon: FileText, roles: ADMIN },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/admin/settings', label: 'Settings & fees', icon: Settings, roles: ADMIN },
      { to: '/admin/staff', label: 'Staff', icon: Users, roles: ADMIN },
      { to: '/admin/audit', label: 'Audit log', icon: History, roles: ALL },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

export const StaffLayout = () => {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = user?.role ?? '';
  const signOut = async () => { await dispatch(logoutThunk()); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-warm-gray-50 text-warm-gray-900">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-warm-gray-200 bg-white md:flex">
        <Link to="/admin/dashboard" className="flex items-center gap-2 border-b border-warm-gray-100 px-5 py-4"><img src="/loom_logo.png" alt="Loom" className="h-8 w-auto" /><span className="text-xs font-semibold uppercase tracking-wide text-warm-gray-500">Back office</span></Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Back office">
          {GROUPS.map((g) => {
            const items = g.items.filter((i) => !i.roles || i.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={g.title}>
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-warm-gray-400">{g.title}</p>
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${isActive ? 'bg-accent-100 font-semibold text-accent-800' : 'text-warm-gray-700 hover:bg-warm-gray-100'}`}>
                    <Icon size={16} /> {label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-warm-gray-100 p-3 text-sm">
          <p className="truncate font-medium">{user?.full_name}</p>
          <p className="mb-2 text-xs capitalize text-warm-gray-500">{role.replace('_', ' ')}</p>
          <button onClick={signOut} className="flex items-center gap-2 text-warm-gray-600 hover:text-red-600"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-warm-gray-200 bg-white px-4 py-3 md:hidden">
          <span className="font-semibold">Loom back office</span>
          <button onClick={signOut} aria-label="Sign out"><ScrollText size={18} /></button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-warm-gray-200 bg-white px-3 py-2 text-sm md:hidden" aria-label="Back office">
          {GROUPS.flatMap((g) => g.items).filter((i) => !i.roles || i.roles.includes(role)).map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => `shrink-0 rounded-full px-3 py-1 ${isActive ? 'bg-accent-700 text-white' : 'bg-warm-gray-100'}`}>{i.label}</NavLink>
          ))}
        </nav>
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
};

export default StaffLayout;
