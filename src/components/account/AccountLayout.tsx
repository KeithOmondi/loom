import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Heart, MapPin, MessageSquare, Package, RotateCcw, ShieldAlert, User, Wallet } from 'lucide-react';

const LINKS = [
  { to: '/account/orders', label: 'My orders', icon: Package },
  { to: '/account/returns', label: 'Returns', icon: RotateCcw },
  { to: '/account/disputes', label: 'Disputes', icon: ShieldAlert },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/wallet', label: 'Wallet', icon: Wallet },
  { to: '/account/messages', label: 'Messages', icon: MessageSquare },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/profile', label: 'Profile', icon: User },
];

export const AccountLayout = () => (
  <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
    <nav className="md:sticky md:top-28 md:h-fit" aria-label="Account">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-accent-100 font-semibold text-accent-800' : 'text-warm-gray-700 hover:bg-warm-gray-100'}`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
    <div className="min-w-0"><Outlet /></div>
  </div>
);

export default AccountLayout;
