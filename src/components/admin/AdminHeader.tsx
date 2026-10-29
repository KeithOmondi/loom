import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  Shield,
  LogOut,
  Settings,
  ExternalLink,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="h-16 border-b border-neutral-200 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-sm">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl md:hidden transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search stores, orders, products, or KRA PINs... (Press '/' to focus)"
            className="w-full bg-neutral-100/80 border border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:bg-white rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all duration-150"
          />
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Marketplace Store Front Link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <span>Live Site</span>
          <ExternalLink size={13} />
        </a>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl py-3 z-50 animate-fade-in">
              <div className="px-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">Notifications</span>
                <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  3 Pending
                </span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                <div className="p-3 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <p className="text-xs font-semibold text-neutral-800">New Store KYC Submitted</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                    Nairobi Artisans applied for seller verification.
                  </p>
                  <span className="text-[9px] text-neutral-400 mt-1 block">5 minutes ago</span>
                </div>
                <div className="p-3 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <p className="text-xs font-semibold text-neutral-800">High-Value Order Dispute</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                    Order #ORD-8821 claim escalated by customer.
                  </p>
                  <span className="text-[9px] text-neutral-400 mt-1 block">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-200 hidden sm:block" />

        {/* Super Admin User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              SA
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-neutral-900 leading-none">Super Admin</p>
              <p className="text-[10px] text-neutral-500 mt-0.5 leading-none">admin@marketplace.com</p>
            </div>
            <ChevronDown size={14} className="text-neutral-400 hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-neutral-100 md:hidden">
                <p className="text-xs font-bold text-neutral-900">Super Admin</p>
                <p className="text-[10px] text-neutral-500 truncate">admin@marketplace.com</p>
              </div>

              <NavLink
                to="/super-admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Settings size={15} />
                <span>Account Settings</span>
              </NavLink>

              <NavLink
                to="/super-admin/staff-roles"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Shield size={15} />
                <span>Security & Permissions</span>
              </NavLink>

              <a
                href="#help"
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <HelpCircle size={15} />
                <span>Documentation</span>
              </a>

              <div className="my-1 border-t border-neutral-100" />

              <button
                onClick={() => alert('Logged out')}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;