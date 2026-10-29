// src/pages/moderator/ModeratorStores.tsx

import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import {
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Store,
    User,
    Mail,
    MapPin,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Package,
    ChevronDown,
    ChevronUp,
    FileText,
    Building2,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    useGetAllStoresQuery,
    useGetModeratorStoreStatsQuery,
    useApproveStoreMutation,
    useRejectStoreMutation,
    useGetStoreReviewHistoryQuery,
} from '../../api/moderatorApi';

// ============================================
// Local wire types (mirror what the API returns)
// ============================================

interface StoreRow {
    moderation_item: {
        id: string;
        target_type: string;
        target_id: string;
        status: string;
        priority: string;
        submitted_by: string;
        submitted_at: string;
        moderated_by?: string;
        moderated_at?: string;
        notes?: string;
        metadata?: Record<string, unknown>;
        created_at: string;
        updated_at: string;
    };
    store: {
        id: string;
        name: string;
        slug: string;
        seller_id: string;
        description?: string;
        tagline?: string;
        logo_url?: string;
        banner_url?: string;
        cover_image_url?: string;
        contact_email?: string;
        contact_phone?: string;
        support_hours?: string;
        location?: string;
        country?: string;
        timezone?: string;
        social_links: Record<string, string>;
        type: string;
        category: string;
        sub_categories?: string[];
        currency?: string;
        language?: string;
        return_policy?: Record<string, unknown>;
        shipping_origin?: Record<string, unknown>;
        status: string;
        is_approved: boolean;
        is_active?: boolean;
        rejection_reason?: string;
        created_at: string;
        updated_at: string;
        total_products?: number;
        total_orders?: number;
        total_reviews?: number;
        average_rating?: number;
        view_count?: number;
    };
    seller: {
        id: string;
        user_id: string;
        business_name: string;
        trading_name?: string;
        business_type: string;
        country: string;
        state?: string;
        city?: string;
        business_address?: string;
        business_phone?: string;
        status: string;
        verification_status: string;
        rating?: number;
        total_reviews?: number;
        total_orders?: number;
        total_products?: number;
        total_stores?: number;
        fulfillment_rate?: number;
        response_rate?: number;
        user: {
            id: string;
            full_name: string;
            email: string;
            phone?: string | null;
        };
        created_at?: string;
        user_joined_at?: string;
    };
    products_count: number;
    reviews_count: number;
    orders_count: number;
    review_history: unknown[];
}

// ----------------------------------------------------------------

const ModeratorStores = () => {
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);

    // State
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Modals
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
    const [reviewNotes, setReviewNotes] = useState('');
    const [expandedStore, setExpandedStore] = useState<string | null>(null);
    const [historyStoreId, setHistoryStoreId] = useState<string | null>(null);

    // ---- RTK Query ----
    const {
        data: storesData,
        isLoading: isLoadingStores,
        error: storesError,
        refetch: refetchStores,
    } = useGetAllStoresQuery({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
    });

    const {
        data: statsData,
        isLoading: isLoadingStats,
        refetch: refetchStats,
    } = useGetModeratorStoreStatsQuery();

    const [approveStore, { isLoading: isApproving }] = useApproveStoreMutation();
    const [rejectStore, { isLoading: isRejecting }] = useRejectStoreMutation();

    const {
        data: historyData,
        isLoading: isLoadingHistory,
    } = useGetStoreReviewHistoryQuery(
        { storeId: historyStoreId || '' },
        { skip: !historyStoreId }
    );

    // Auth guard
    useEffect(() => {
        if (user && user.role !== 'moderator' && user.role !== 'admin' && user.role !== 'super_admin') {
            toast.error('You do not have permission to view this page.');
            navigate('/');
        }
    }, [user, navigate]);

    // Error toast
    useEffect(() => {
        if (storesError) {
            const err = storesError as any;
            toast.error(err?.data?.message || 'Failed to load stores.');
        }
    }, [storesError]);

    const handleApprove = async (storeId: string) => {
        try {
            await approveStore({ storeId, notes: reviewNotes }).unwrap();
            toast.success('Store approved successfully!');
            setShowReviewModal(false);
            setReviewNotes('');
            refetchStores();
            refetchStats();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to approve store.');
        }
    };

    const handleReject = async (storeId: string) => {
        if (!reviewNotes) {
            toast.error('Please provide a rejection reason.');
            return;
        }

        try {
            await rejectStore({ storeId, reason: reviewNotes }).unwrap();
            toast.success('Store rejected.');
            setShowReviewModal(false);
            setReviewNotes('');
            refetchStores();
            refetchStats();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to reject store.');
        }
    };

    const handleReview = async (storeId: string, approved: boolean) => {
        if (approved) {
            await handleApprove(storeId);
        } else {
            await handleReject(storeId);
        }
    };

    const openReviewModal = (store: StoreRow, action: 'approve' | 'reject') => {
        setSelectedStore(store);
        setReviewAction(action);
        setReviewNotes('');
        setShowReviewModal(true);
    };

    const openHistoryModal = (storeId: string) => {
        setHistoryStoreId(storeId);
        setShowHistoryModal(true);
    };

    // Reads from moderation_item.status
    const getStatusBadge = (store: StoreRow) => {
        const status = store.moderation_item?.status ?? 'pending';
        switch (status) {
            case 'pending':
                return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
            case 'approved':
                return { label: 'Approved', className: 'bg-green-100 text-green-700' };
            case 'rejected':
                return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
            case 'suspended':
                return { label: 'Suspended', className: 'bg-orange-100 text-orange-700' };
            case 'in_review':
                return { label: 'In Review', className: 'bg-blue-100 text-blue-700' };
            case 'removed':
                return { label: 'Removed', className: 'bg-gray-100 text-gray-700' };
            default:
                return { label: status || 'Unknown', className: 'bg-gray-100 text-gray-700' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return CheckCircle;
            case 'rejected':
                return XCircle;
            case 'suspended':
                return AlertTriangle;
            case 'pending':
            case 'in_review':
                return Clock;
            default:
                return Clock;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'text-green-600';
            case 'rejected':
                return 'text-red-600';
            case 'suspended':
                return 'text-orange-600';
            case 'pending':
            case 'in_review':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    const toggleExpand = (storeId: string) => {
        setExpandedStore(expandedStore === storeId ? null : storeId);
    };

    const stores = storesData?.data || [];
    const pagination = storesData?.pagination;
    const total = pagination?.total || 0;
    const pages = pagination?.pages || 1;

    // Stat cards from API
    const statCards = [
        {
            label: 'Total Stores',
            value: statsData?.data?.total ?? 0,
            icon: Store,
            color: 'text-purple-600 bg-purple-100/50',
        },
        {
            label: 'Pending Review',
            value: statsData?.data?.pending ?? 0,
            icon: Clock,
            color: 'text-yellow-600 bg-yellow-100/50',
        },
        {
            label: 'Approved',
            value: statsData?.data?.approved ?? 0,
            icon: CheckCircle,
            color: 'text-green-600 bg-green-100/50',
        },
        {
            label: 'Rejected',
            value: statsData?.data?.rejected ?? 0,
            icon: XCircle,
            color: 'text-red-600 bg-red-100/50',
        },
        {
            label: 'Suspended',
            value: statsData?.data?.suspended ?? 0,
            icon: AlertTriangle,
            color: 'text-orange-600 bg-orange-100/50',
        },
        {
            label: 'Total Products',
            value: statsData?.data?.total_products ?? 0,
            icon: Package,
            color: 'text-blue-600 bg-blue-100/50',
        },
    ];

    const isLoading = isLoadingStores || isLoadingStats;

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'in_review', label: 'In Review' },
    ];

    return (
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#FDFBF7] via-[#F6F3EE] to-[#EAE5DD] p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-serif text-warmGray-900 tracking-tight">Store Moderation</h2>
                        <p className="text-warmGray-500 text-sm mt-1">Review and manage all stores</p>
                    </div>
                    <button
                        onClick={() => {
                            refetchStores();
                            refetchStats();
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-md border border-white/40 rounded-xl text-sm font-medium text-warmGray-700 hover:bg-white/90 hover:border-white/60 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-white/80 transition-all duration-300"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                <div className="flex items-center justify-between mb-3 relative z-10">
                                    <div className={`p-2 rounded-xl ${stat.color} backdrop-blur-sm shadow-sm`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-lg font-bold text-warmGray-900">
                                        {isLoadingStats ? (
                                            <span className="inline-block w-5 h-5 bg-warmGray-200/80 animate-pulse rounded-md align-middle" />
                                        ) : (
                                            stat.value
                                        )}
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-warmGray-500 uppercase tracking-wider relative z-10">
                                    {stat.label}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Category Distribution */}
                {statsData?.data?.category_distribution && statsData.data.category_distribution.length > 0 && (
                    <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-4">
                        <h4 className="text-sm font-semibold text-warmGray-700 mb-3">Category Distribution</h4>
                        <div className="flex flex-wrap gap-2">
                            {statsData.data.category_distribution.map((cat) => (
                                <span
                                    key={cat.category}
                                    className="px-3 py-1 bg-white/70 border border-white/60 rounded-full text-xs text-warmGray-700 font-medium shadow-sm"
                                >
                                    {cat.category}: {cat.count}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full relative">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warmGray-400" />
                            <input
                                type="text"
                                placeholder="Search stores..."
                                className="w-full bg-white/50 border border-white/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && refetchStores()}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full sm:w-auto bg-white/50 border border-white/60 rounded-xl py-2.5 px-4 text-sm text-warmGray-900 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm cursor-pointer"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => refetchStores()}
                            className="w-full sm:w-auto px-6 py-2.5 bg-purple-600/90 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>

                {/* Stores List */}
                <div className="space-y-4">
                    {isLoadingStores ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/50 border-dashed p-12 text-center flex flex-col items-center justify-center shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 shadow-sm">
                                <Store size={32} className="text-warmGray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-warmGray-900 mb-1">No stores found</h3>
                            <p className="text-sm text-warmGray-500 max-w-sm">
                                There are no stores matching your current filters. Try adjusting your search or status filter.
                            </p>
                        </div>
                    ) : (
                        stores.map((store) => {
                            const moderationStatus = store.moderation_item?.status ?? 'pending';
                            const StatusIcon = getStatusIcon(moderationStatus);
                            const statusBadge = getStatusBadge(store);
                            const statusColor = getStatusColor(moderationStatus);
                            const isExpanded = expandedStore === store.store.id;

                            const submittedAt =
                                store.moderation_item?.submitted_at ??
                                store.store?.created_at;
                            const formattedSubmitted = submittedAt
                                ? new Date(submittedAt).toLocaleDateString()
                                : '—';

                            return (
                                <div
                                    key={store.store.id}
                                    className="bg-white rounded-2xl shadow-sm border border-warmGray-200 overflow-hidden transition-all hover:shadow-md hover:border-warmGray-300"
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className="w-14 h-14 rounded-2xl bg-[#FDFBF7] border border-warmGray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {store.store?.logo_url ? (
                                                        <img
                                                            src={store.store.logo_url}
                                                            alt={store.store.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Store size={24} className="text-warmGray-400" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                                        <h3 className="text-lg font-semibold text-warmGray-900 truncate">
                                                            {store.store?.name || 'Unnamed Store'}
                                                        </h3>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusBadge.className}`}>
                                                            <StatusIcon size={12} className={statusColor} />
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-warmGray-500">
                                                        {store.seller?.business_name || 'Business Name'} • {store.seller?.business_type?.replace('_', ' ') || 'N/A'}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-warmGray-400 flex-wrap">
                                                        <span className="flex items-center gap-1.5">
                                                            <User size={14} />
                                                            {store.seller?.user?.full_name || 'Unknown'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Mail size={14} />
                                                            {store.seller?.user?.email || 'No email'}
                                                        </span>
                                                        {store.store?.location && (
                                                            <span className="flex items-center gap-1.5">
                                                                <MapPin size={14} />
                                                                {store.store.location}
                                                            </span>
                                                        )}
                                                        {store.store?.category && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Building2 size={14} />
                                                                {store.store.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions — only for pending moderation status */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {moderationStatus === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => openReviewModal(store, 'approve')}
                                                            className="p-2 rounded-xl hover:bg-green-50 border border-transparent hover:border-green-200 transition-all"
                                                            title="Approve store"
                                                        >
                                                            <CheckCircle size={18} className="text-green-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => openReviewModal(store, 'reject')}
                                                            className="p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                                                            title="Reject store"
                                                        >
                                                            <XCircle size={18} className="text-red-600" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => openHistoryModal(store.store.id)}
                                                    className="p-2 rounded-xl hover:bg-[#FDFBF7] border border-transparent hover:border-warmGray-200 transition-all"
                                                    title="View history"
                                                >
                                                    <FileText size={18} className="text-warmGray-500" />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(store.store.id)}
                                                    className="p-2 rounded-xl hover:bg-[#FDFBF7] border border-transparent hover:border-warmGray-200 transition-all"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp size={18} className="text-warmGray-500" />
                                                    ) : (
                                                        <ChevronDown size={18} className="text-warmGray-500" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="mt-5 pt-5 border-t border-warmGray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-warmGray-500 mb-0.5">Store Type</p>
                                                    <p className="text-sm font-medium text-warmGray-800">
                                                        {store.store?.type || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-warmGray-500 mb-0.5">Category</p>
                                                    <p className="text-sm font-medium text-warmGray-800">
                                                        {store.store?.category || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-warmGray-500 mb-0.5">Submitted</p>
                                                    <p className="text-sm font-medium text-warmGray-800">
                                                        {formattedSubmitted}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-warmGray-500 mb-0.5">Priority</p>
                                                    <p className="text-sm font-medium text-warmGray-800 capitalize">
                                                        {store.moderation_item?.priority || 'medium'}
                                                    </p>
                                                </div>
                                                {store.store?.description && (
                                                    <div className="col-span-2 md:col-span-4">
                                                        <p className="text-xs text-warmGray-500 mb-0.5">Description</p>
                                                        <p className="text-sm text-warmGray-700">
                                                            {store.store.description}
                                                        </p>
                                                    </div>
                                                )}
                                                {store.store?.contact_email && (
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-warmGray-500 mb-0.5">Contact Email</p>
                                                        <p className="text-sm text-warmGray-700">
                                                            {store.store.contact_email}
                                                        </p>
                                                    </div>
                                                )}
                                                {store.store?.contact_phone && (
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-warmGray-500 mb-0.5">Contact Phone</p>
                                                        <p className="text-sm text-warmGray-700">
                                                            {store.store.contact_phone}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-white/60 backdrop-blur-lg rounded-2xl shadow-sm border border-white/50 px-5 py-4 gap-4">
                        <p className="text-sm text-warmGray-500">
                            Showing <span className="font-medium text-warmGray-900">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-warmGray-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-warmGray-900">{total}</span> stores
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                                className="p-2 rounded-xl border border-warmGray-200 bg-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} className="text-warmGray-600" />
                            </button>
                            <span className="text-sm font-medium text-warmGray-700 px-2">
                                Page {page} of {pages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= pages}
                                className="p-2 rounded-xl border border-warmGray-200 bg-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} className="text-warmGray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {showReviewModal && selectedStore && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReviewModal(false)}>
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-warmGray-200" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                reviewAction === 'approve' ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                                {reviewAction === 'approve' ? (
                                    <CheckCircle size={28} className="text-green-600" />
                                ) : (
                                    <XCircle size={28} className="text-red-600" />
                                )}
                            </div>
                            <h3 className="text-xl font-serif text-warmGray-900 mb-2">
                                {reviewAction === 'approve' ? 'Approve Store' : 'Reject Store'}
                            </h3>
                            <p className="text-warmGray-500 text-sm mb-4">
                                {reviewAction === 'approve'
                                    ? `Are you sure you want to approve "${selectedStore.store?.name}"?`
                                    : `Are you sure you want to reject "${selectedStore.store?.name}"?`
                                }
                            </p>
                            {reviewAction === 'reject' && (
                                <div className="text-left">
                                    <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                        Rejection Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Please provide a reason for rejection..."
                                        className="w-full bg-[#FDFBF7] border border-warmGray-200 rounded-xl px-4 py-3 text-sm text-warmGray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowReviewModal(false);
                                    setReviewNotes('');
                                    setSelectedStore(null);
                                }}
                                className="flex-1 px-4 py-2.5 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-[#FDFBF7] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReview(selectedStore.store.id, reviewAction === 'approve')}
                                disabled={isApproving || isRejecting || (reviewAction === 'reject' && !reviewNotes)}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors ${
                                    reviewAction === 'approve'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isApproving || isRejecting ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden p-6 shadow-2xl border border-warmGray-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-serif text-warmGray-900">Review History</h3>
                            <button
                                onClick={() => {
                                    setShowHistoryModal(false);
                                    setHistoryStoreId(null);
                                }}
                                className="p-2 rounded-xl hover:bg-[#FDFBF7] transition-colors"
                            >
                                <X size={20} className="text-warmGray-600" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh]">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                </div>
                            ) : !historyData?.data || historyData.data.length === 0 ? (
                                <p className="text-center text-warmGray-500 py-8">No review history found</p>
                            ) : (
                                <div className="space-y-3">
                                    {historyData.data.map((entry: any) => (
                                        <div key={entry.id} className="bg-[#FDFBF7] border border-warmGray-100 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-warmGray-900">
                                                        {entry.moderator_name || 'System'}
                                                    </span>
                                                    <span className="text-xs text-warmGray-500">
                                                        {entry.moderator_email || ''}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-warmGray-500">
                                                    {entry.created_at
                                                        ? new Date(entry.created_at).toLocaleString()
                                                        : '—'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-warmGray-700 mt-1">
                                                <span className="font-medium">Action:</span> {entry.action}
                                            </p>
                                            {entry.notes && (
                                                <p className="text-sm text-warmGray-600 mt-1">
                                                    <span className="font-medium">Notes:</span> {entry.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ModeratorStores;