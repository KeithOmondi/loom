// src/components/seller/SellerHeader.tsx

import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Settings, ShieldCheck, Menu } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';

function initialsFrom(name?: string) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

interface SellerHeaderProps {
  setIsMobileOpen?: (open: boolean) => void;
}

const SellerHeader = ({ setIsMobileOpen }: SellerHeaderProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    const lastSegment = path.split('/').pop() || '';
    const titles: Record<string, string> = {
      overview: 'Overview',
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      settings: 'Store Settings',
      verification: 'KYC Verification',
      notifications: 'Notifications',
    };
    return titles[lastSegment] || 'Seller Portal';
  };

  const onLogout = async () => {
    setMenuOpen(false);
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 pt-4 px-4 sm:px-6">
      <div className="bg-[#F3ECE1]/90 backdrop-blur-md border border-[#E3D9C9]/80 rounded-3xl h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Mobile Menu Toggle & Title Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen?.(true)}
            className="p-2 rounded-xl text-[#6B6159] hover:bg-[#EAE0D2]/60 lg:hidden transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-base sm:text-lg font-serif font-bold text-[#3E2F2A] tracking-tight">
            {getPageTitle()}
          </h1>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-full text-[#6B6159] hover:bg-[#EAE0D2]/60 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#8B3A2B] rounded-full ring-2 ring-[#F3ECE1]" />
          </button>

          <div className="h-4 w-px bg-[#E3D9C9] mx-1" />

          {/* User Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full bg-white/90 border border-[#E3D9C9] hover:bg-white transition-all shadow-2xs group"
            >
              <div className="w-7 h-7 rounded-full bg-[#8B3A2B] text-white font-serif italic text-xs font-bold flex items-center justify-center shrink-0">
                {initialsFrom(user?.full_name)}
              </div>
              
              <div className="hidden sm:flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-[#3E2F2A] truncate leading-tight">
                  {user?.full_name ?? 'Seller'}
                </span>
                <span className="text-[10px] text-[#A89F91] truncate leading-tight">
                  Merchant Account
                </span>
              </div>

              <ChevronDown
                size={14}
                className={`text-[#8A7E72] group-hover:text-[#3E2F2A] transition-transform duration-200 ml-0.5 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded Menu Drawer */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-3 w-60 bg-white border border-[#E3D9C9] rounded-3xl shadow-xl py-2 z-50 overflow-hidden">
                <div className="px-5 py-3 border-b border-[#F0EBE1] bg-[#F9F6F0]/50">
                  <p className="text-sm font-bold text-[#3E2F2A] truncate">
                    {user?.full_name ?? 'Seller Account'}
                  </p>
                  <p className="text-[11px] text-[#A89F91] truncate mt-0.5">
                    {user?.email ?? 'seller@marketplace.com'}
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0EBE1] text-[#8B3A2B] text-[10px] font-bold tracking-wide uppercase">
                    <ShieldCheck size={12} />
                    <span>Merchant</span>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/seller/settings');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#6B6159] hover:bg-[#F9F6F0] text-left transition-colors"
                  >
                    <User size={16} className="text-[#A89F91]" />
                    Profile & Account
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/seller/verification');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#6B6159] hover:bg-[#F9F6F0] text-left transition-colors"
                  >
                    <ShieldCheck size={16} className="text-[#A89F91]" />
                    KYC Verification
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/seller/settings');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#6B6159] hover:bg-[#F9F6F0] text-left transition-colors"
                  >
                    <Settings size={16} className="text-[#A89F91]" />
                    Store Settings
                  </button>
                </div>

                <div className="border-t border-[#F0EBE1] pt-2 pb-1">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#8B3A2B] hover:bg-[#F9F6F0] text-left transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SellerHeader;