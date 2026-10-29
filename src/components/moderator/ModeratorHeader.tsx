// src/components/moderator/ModeratorHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import {
    Search,
    Bell,
    Menu,
    User,
    Settings,
    LogOut,
    Clock,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';

interface Notification {
    id: string;
    message: string;
    read: boolean;
}

interface ModeratorHeaderProps {
    setIsMobileOpen: (open: boolean) => void;
}

const ModeratorHeader: React.FC<ModeratorHeaderProps> = ({ setIsMobileOpen }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const notifications: Notification[] = [
        { id: '1', message: '12 stores pending review', read: false },
        { id: '2', message: '3 new product submissions', read: false },
    ];

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Route title resolver
    const getPageTitle = () => {
        const path = location.pathname;
        const lastSegment = path.split('/').pop() || '';
        const titles: Record<string, string> = {
            dashboard: 'Dashboard',
            queue: 'Moderation Queue',
            pending: 'Pending Review',
            urgent: 'Urgent Items',
            stores: 'Store Moderation',
            'products-approval': 'Product Moderation',
            sellers: 'Seller Verification',
            content: 'Content Moderation',
            verified: 'Verified Items',
            rejected: 'Rejected Items',
            flagged: 'Flagged Content',
            history: 'Moderation History',
            stats: 'Statistics',
        };
        return titles[lastSegment] || 'Moderator Panel';
    };

    const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const handleLogout = async () => {
        await dispatch(logoutThunk());
        navigate('/login', { replace: true });
    };

    return (
        <header className="sticky top-0 z-20 pt-4 px-4 sm:px-6 bg-[#F8F5EE]">
            <div className="bg-[#F3ECE1]/90 backdrop-blur-md border border-[#E3D9C9]/80 rounded-3xl min-h-[4.25rem] px-5 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
                
                {/* Left: Mobile Toggle, Title & Meta Info */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="lg:hidden p-2 rounded-full text-[#6B6159] hover:bg-[#EAE0D2] transition-colors"
                        aria-label="Open Sidebar"
                    >
                        <Menu size={20} />
                    </button>
                    
                    <div>
                        <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#3E2F2A] leading-tight">
                            {getPageTitle()}
                        </h1>
                        <p className="text-xs font-medium text-[#8A7E72] mt-0.5">
                            {user?.full_name || 'Omondi Keith'} • {formattedDate}
                        </p>
                    </div>
                </div>

                {/* Center / Right: Search, Badges & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                    
                    {/* Search Bar */}
                    <div className="relative hidden md:block w-56 lg:w-72">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89F91]" />
                        <input
                            type="text"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            placeholder="Search across queues, items, SKUs..."
                            className="w-full bg-white/80 border border-[#E3D9C9] rounded-full pl-9 pr-4 py-2 text-xs text-[#3E2F2A] placeholder:text-[#A89F91] focus:outline-none focus:ring-2 focus:ring-[#8B3A2B]/20 focus:border-[#8B3A2B] transition-all"
                        />
                    </div>

                    {/* Status Pills */}
                    <div className="hidden xl:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE0D2]/60 border border-[#E3D9C9] text-xs font-semibold text-[#8B3A2B]">
                            <Clock size={13} />
                            <span>0 pending</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7E6E4] border border-[#EAC4C1] text-xs font-semibold text-[#B93829]">
                            <AlertTriangle size={13} />
                            <span>0 urgent</span>
                        </div>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="p-2.5 rounded-full bg-white/80 border border-[#E3D9C9] text-[#6B6159] hover:bg-[#EAE0D2] transition-colors relative"
                            aria-label="Notifications"
                        >
                            <Bell size={17} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[#8B3A2B] rounded-full ring-2 ring-[#F3ECE1]" />
                            )}
                        </button>

                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl shadow-xl border border-[#E3D9C9] py-2 z-50 overflow-hidden">
                                <div className="px-5 py-3 border-b border-[#F0EBE1] flex items-center justify-between bg-[#F9F6F0]/50">
                                    <span className="text-xs font-bold text-[#3E2F2A]">Notifications</span>
                                    <button className="text-[11px] font-semibold text-[#8B3A2B] hover:text-[#6B2A1E]">
                                        Mark all read
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto divide-y divide-[#F0EBE1]">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className="px-5 py-3 hover:bg-[#F9F6F0] transition-colors cursor-pointer flex gap-3">
                                            <div className="p-1.5 rounded-full bg-[#F0EBE1] text-[#8B3A2B] h-fit mt-0.5">
                                                <Bell size={12} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-[#3E2F2A] font-medium">{notif.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Pill */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full bg-white/90 border border-[#E3D9C9] hover:bg-white transition-all shadow-2xs"
                        >
                            <div className="w-7 h-7 rounded-full bg-[#8B3A2B] text-white font-serif italic text-xs font-bold flex items-center justify-center shrink-0">
                                {user?.full_name?.charAt(0) || 'O'}
                            </div>
                            <div className="hidden sm:flex flex-col items-start text-left">
                                <span className="text-xs font-bold text-[#3E2F2A] leading-tight truncate max-w-[100px]">
                                    {user?.full_name || 'Omondi Keith'}
                                </span>
                                <span className="text-[10px] text-[#A89F91] leading-tight">
                                    Moderator Account
                                </span>
                            </div>
                            <ChevronDown size={14} className="text-[#8A7E72] hidden sm:block ml-0.5" />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-3 w-60 bg-white rounded-3xl shadow-xl border border-[#E3D9C9] py-2 z-50 overflow-hidden">
                                <div className="px-5 py-3 border-b border-[#F0EBE1] bg-[#F9F6F0]/50">
                                    <p className="text-sm font-bold text-[#3E2F2A] truncate">{user?.full_name || 'Omondi Keith'}</p>
                                    <p className="text-[11px] text-[#A89F91] truncate mt-0.5">{user?.email || 'kd.omondi1@gmail.com'}</p>
                                </div>
                                <div className="py-2">
                                    <button onClick={() => navigate('/moderator/profile')} className="flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#6B6159] hover:bg-[#F9F6F0] w-full text-left">
                                        <User size={16} className="text-[#A89F91]" /> Profile
                                    </button>
                                    <button onClick={() => navigate('/moderator/settings')} className="flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#6B6159] hover:bg-[#F9F6F0] w-full text-left">
                                        <Settings size={16} className="text-[#A89F91]" /> Settings
                                    </button>
                                </div>
                                <div className="border-t border-[#F0EBE1] pt-2 pb-1">
                                    <button onClick={handleLogout} className="flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-[#8B3A2B] hover:bg-[#F9F6F0] w-full text-left">
                                        <LogOut size={16} /> Log out
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

export default ModeratorHeader;