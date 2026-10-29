// src/pages/superadmin/SuperAdminStores.tsx

import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import {
    Search,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Store,
    Package,
    ShoppingBag,
    CheckCircle,
    XCircle,
    Clock,
    X,
    User,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    useGetAdminStoresQuery,
    useGetAdminStoreStatsQuery,
    useAdminApproveStoreMutation,
    useAdminRejectStoreMutation,
    useAdminDeleteStoreMutation,
    useGetAdminStoreDetailsQuery, // ✅ Uncommented and fixed
    type AdminStoreItem,
    //type AdminStoreStats,
} from '../../api/adminApi'; // ✅ Fixed import path

const SuperAdminStores = () => {
    const user = useAppSelector((state) => state.auth.user);

    // State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended' | 'closed'>('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // Modals
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<AdminStoreItem | null>(null);
    const [approveAction, setApproveAction] = useState<'approve' | 'reject'>('approve');
    const [rejectionReason, setRejectionReason] = useState('');

    // RTK Query hooks
    const {
        data: storesData,
        isLoading: isLoadingStores,
        error: storesError,
        refetch: refetchStores,
    } = useGetAdminStoresQuery({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
    });

    const {
        data: statsData,
        isLoading: isLoadingStats,
        refetch: refetchStats,
    } = useGetAdminStoreStatsQuery();

    const [approveStore, { isLoading: isApproving }] = useAdminApproveStoreMutation();
    const [rejectStore, { isLoading: isRejecting }] = useAdminRejectStoreMutation();
    const [deleteStore, { isLoading: isDeleting }] = useAdminDeleteStoreMutation();

    // ✅ Now this works because we uncommented the import
    const {
        data: storeDetailsData,
        isLoading: isLoadingDetails,
    } = useGetAdminStoreDetailsQuery(
        { storeId: selectedStore?.id || '' },
        { skip: !selectedStore || !showDetailModal }
    );

    // Check if user is super admin or admin
    useEffect(() => {
        if (user?.role !== 'super_admin' && user?.role !== 'admin') {
            toast.error('You do not have permission to view this page.');
        }
    }, [user]);

    // Show error messages
    useEffect(() => {
        if (storesError) {
            const err = storesError as any;
            toast.error(err?.data?.message || 'Failed to load stores.');
        }
    }, [storesError]);

    const handleApprove = async (storeId: string) => {
        try {
            await approveStore({ storeId }).unwrap();
            toast.success('Store approved successfully!');
            setShowApproveModal(false);
            setSelectedStore(null);
            refetchStores();
            refetchStats();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to approve store.');
        }
    };

    const handleReject = async (storeId: string) => {
        if (!rejectionReason) {
            toast.error('Please provide a rejection reason.');
            return;
        }

        try {
            await rejectStore({ storeId, reason: rejectionReason }).unwrap();
            toast.success('Store rejected.');
            setShowApproveModal(false);
            setSelectedStore(null);
            setRejectionReason('');
            refetchStores();
            refetchStats();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to reject store.');
        }
    };

    const handleDelete = async (storeId: string) => {
        try {
            await deleteStore({ storeId }).unwrap();
            toast.success('Store deleted successfully!');
            setShowDeleteModal(false);
            setSelectedStore(null);
            refetchStores();
            refetchStats();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete store.');
        }
    };

    const handleViewDetails = (store: AdminStoreItem) => {
        setSelectedStore(store);
        setShowDetailModal(true);
    };

    const getStatusBadge = (store: AdminStoreItem) => {
        const status = store.status;
        switch (status) {
            case 'active':
                return { label: 'Active', className: 'bg-green-100 text-green-700' };
            case 'pending_approval':
                return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
            case 'suspended':
                return { label: 'Suspended', className: 'bg-orange-100 text-orange-700' };
            case 'closed':
                return { label: 'Closed', className: 'bg-gray-100 text-gray-700' };
            case 'rejected':
                return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
            case 'draft':
                return { label: 'Draft', className: 'bg-blue-100 text-blue-700' };
            default:
                return { label: status || 'Unknown', className: 'bg-gray-100 text-gray-700' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return CheckCircle;
            case 'pending_approval':
            case 'draft':
                return Clock;
            case 'suspended':
            case 'closed':
            case 'rejected':
                return XCircle;
            default:
                return Clock;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-600';
            case 'pending_approval':
            case 'draft':
                return 'text-yellow-600';
            case 'suspended':
                return 'text-orange-600';
            case 'closed':
            case 'rejected':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const stores = storesData?.data || [];
    const pagination = storesData?.pagination;
    const total = pagination?.total || 0;
    const pages = pagination?.pages || 1;

    const stats = statsData?.data || {
        total: 0,
        pending: 0,
        active: 0,
        suspended: 0,
        closed: 0,
        rejected: 0,
        draft: 0,
        total_products: 0,
        total_orders: 0,
        total_revenue: 0,
        category_distribution: [],
    };

    const statCards = [
        {
            label: 'Total Stores',
            value: stats.total,
            icon: Store,
            color: 'text-purple-600 bg-purple-50',
        },
        {
            label: 'Active',
            value: stats.active || 0,
            icon: CheckCircle,
            color: 'text-green-600 bg-green-50',
        },
        {
            label: 'Pending Review',
            value: stats.pending || 0,
            icon: Clock,
            color: 'text-yellow-600 bg-yellow-50',
        },
        {
            label: 'Suspended',
            value: stats.suspended || 0,
            icon: XCircle,
            color: 'text-orange-600 bg-orange-50',
        },
        {
            label: 'Total Products',
            value: stats.total_products || 0,
            icon: Package,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: 'Total Revenue',
            value: `KSh ${((stats.total_revenue || 0) / 1000).toFixed(1)}K`,
            icon: ShoppingBag,
            color: 'text-emerald-600 bg-emerald-50',
        },
    ];

    const isLoading = isLoadingStores || isLoadingStats;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-serif text-warmGray-900">Store Management</h2>
                    <p className="text-warmGray-500 text-sm">Manage all stores on the platform</p>
                </div>
                <button
                    onClick={() => {
                        refetchStores();
                        refetchStats();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-warmGray-200 rounded-xl text-sm font-medium text-warmGray-700 hover:bg-warmGray-50 transition-colors"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className={`p-2 rounded-xl ${stat.color}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-lg font-bold text-warmGray-900">
                                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                </span>
                            </div>
                            <p className="text-xs text-warmGray-500 mt-1">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Category Distribution */}
            {stats.category_distribution && stats.category_distribution.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-4">
                    <h4 className="text-sm font-medium text-warmGray-700 mb-2">Category Distribution</h4>
                    <div className="flex flex-wrap gap-2">
                        {stats.category_distribution.map((cat: any) => (
                            <span
                                key={cat.category}
                                className="px-3 py-1 bg-warmGray-100 rounded-full text-xs text-warmGray-700"
                            >
                                {cat.category}: {cat.count}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmGray-400" />
                            <input
                                type="text"
                                placeholder="Search stores..."
                                className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && refetchStores()}
                            />
                        </div>
                    </div>

                    <select
                        className="bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-sm text-warmGray-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending</option>
                        <option value="suspended">Suspended</option>
                        <option value="closed">Closed</option>
                    </select>

                    <button
                        onClick={() => refetchStores()}
                        className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Stores Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-warmGray-50 border-b border-warmGray-100">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Store
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Seller
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Products
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Orders
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Revenue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-warmGray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : stores.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-warmGray-500">
                                        No stores found
                                    </td>
                                </tr>
                            ) : (
                                stores.map((store) => {
                                    const statusBadge = getStatusBadge(store);
                                    const StatusIcon = getStatusIcon(store.status);
                                    const statusColor = getStatusColor(store.status);

                                    return (
                                        <tr key={store.id} className="hover:bg-warmGray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center">
                                                        {store.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-warmGray-900">
                                                            {store.name || 'Unnamed Store'}
                                                        </p>
                                                        <p className="text-xs text-warmGray-500">{store.slug || 'No slug'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-warmGray-900">
                                                        {store.seller?.legal_business_name || 'Business Name'}
                                                    </p>
                                                    <p className="text-xs text-warmGray-500 flex items-center gap-1">
                                                        <User size={12} />
                                                        {store.seller?.full_name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${statusBadge.className}`}>
                                                    <StatusIcon size={12} className={statusColor} />
                                                    {statusBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-warmGray-600">
                                                {store.total_products || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-warmGray-600">
                                                {store.total_orders || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                                                KSh {(store.total_revenue || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-warmGray-600">
                                                {store.created_at ? new Date(store.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(store)}
                                                        className="p-1.5 rounded-lg hover:bg-warmGray-100 transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye size={16} className="text-warmGray-600" />
                                                    </button>
                                                    {(store.status === 'pending_approval' || store.status === 'draft') && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStore(store);
                                                                setApproveAction('approve');
                                                                setRejectionReason('');
                                                                setShowApproveModal(true);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                                            title="Approve store"
                                                        >
                                                            <CheckCircle size={16} className="text-green-600" />
                                                        </button>
                                                    )}
                                                    {store.status === 'pending_approval' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStore(store);
                                                                setApproveAction('reject');
                                                                setRejectionReason('');
                                                                setShowApproveModal(true);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Reject store"
                                                        >
                                                            <XCircle size={16} className="text-red-600" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStore(store);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete store"
                                                    >
                                                        <Trash2 size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-warmGray-100 flex items-center justify-between">
                        <p className="text-sm text-warmGray-600">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} stores
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                                className="p-2 rounded-lg hover:bg-warmGray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} className="text-warmGray-600" />
                            </button>
                            <span className="text-sm font-medium text-warmGray-700">
                                Page {page} of {pages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= pages}
                                className="p-2 rounded-lg hover:bg-warmGray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} className="text-warmGray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Store Detail Modal */}
            {showDetailModal && selectedStore && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6 shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-serif text-warmGray-900">{selectedStore.name || 'Unnamed Store'}</h3>
                                <p className="text-sm text-warmGray-500">{selectedStore.slug || 'No slug'}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 rounded-lg hover:bg-warmGray-100 transition-colors"
                            >
                                <X size={20} className="text-warmGray-600" />
                            </button>
                        </div>

                        {isLoadingDetails ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            </div>
                        ) : storeDetailsData?.data ? (
                            <div className="space-y-4">
                                {/* Store Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-warmGray-500">Description</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.description || 'No description'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-warmGray-500">Category</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.category || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-warmGray-500">Type</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.type || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-warmGray-500">Location</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.location || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-warmGray-500">Contact Email</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.contact_email || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-warmGray-500">Contact Phone</p>
                                        <p className="text-sm text-warmGray-900">{storeDetailsData.data.contact_phone || 'Not provided'}</p>
                                    </div>
                                </div>

                                {/* Seller Info */}
                                {storeDetailsData.data.seller && (
                                    <div className="border-t border-warmGray-100 pt-4">
                                        <h4 className="text-sm font-semibold text-warmGray-900 mb-2">Seller Information</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-warmGray-500">Business Name</p>
                                                <p className="text-sm text-warmGray-900">{storeDetailsData.data.seller.legal_business_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-warmGray-500">Owner</p>
                                                <p className="text-sm text-warmGray-900">{storeDetailsData.data.seller.full_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-warmGray-500">Email</p>
                                                <p className="text-sm text-warmGray-900">{storeDetailsData.data.seller.email || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-warmGray-500">Store Status</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedStore).className}`}>
                                                    {getStatusBadge(selectedStore).label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="border-t border-warmGray-100 pt-4">
                                    <h4 className="text-sm font-semibold text-warmGray-900 mb-2">Store Statistics</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-warmGray-50 rounded-xl p-3 text-center">
                                            <p className="text-lg font-bold text-warmGray-900">{storeDetailsData.data.total_products || 0}</p>
                                            <p className="text-xs text-warmGray-500">Products</p>
                                        </div>
                                        <div className="bg-warmGray-50 rounded-xl p-3 text-center">
                                            <p className="text-lg font-bold text-warmGray-900">{storeDetailsData.data.total_orders || 0}</p>
                                            <p className="text-xs text-warmGray-500">Orders</p>
                                        </div>
                                        <div className="bg-warmGray-50 rounded-xl p-3 text-center">
                                            <p className="text-lg font-bold text-emerald-600">KSh {(storeDetailsData.data.total_revenue || 0).toLocaleString()}</p>
                                            <p className="text-xs text-warmGray-500">Revenue</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-warmGray-500 py-8">Failed to load store details</p>
                        )}
                    </div>
                </div>
            )}

            {/* Approve/Reject Modal */}
            {showApproveModal && selectedStore && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-xl">
                        <div className="text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                approveAction === 'approve' ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                                {approveAction === 'approve' ? (
                                    <CheckCircle size={28} className="text-green-600" />
                                ) : (
                                    <XCircle size={28} className="text-red-600" />
                                )}
                            </div>
                            <h3 className="text-xl font-serif text-warmGray-900 mb-2">
                                {approveAction === 'approve' ? 'Approve Store' : 'Reject Store'}
                            </h3>
                            <p className="text-warmGray-500 text-sm mb-4">
                                {approveAction === 'approve'
                                    ? `Are you sure you want to approve "${selectedStore.name}"? This will make the store live on the platform.`
                                    : `Are you sure you want to reject "${selectedStore.name}"? This will prevent the store from going live.`
                                }
                            </p>
                            {approveAction === 'reject' && (
                                <div className="text-left">
                                    <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                        Rejection Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Please provide a reason for rejection..."
                                        className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-3 text-sm text-warmGray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowApproveModal(false);
                                    setSelectedStore(null);
                                    setRejectionReason('');
                                }}
                                className="flex-1 px-4 py-2 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (approveAction === 'approve') {
                                        handleApprove(selectedStore.id);
                                    } else {
                                        handleReject(selectedStore.id);
                                    }
                                }}
                                disabled={isApproving || isRejecting || (approveAction === 'reject' && !rejectionReason)}
                                className={`flex-1 px-4 py-2 rounded-xl text-white font-medium transition-colors ${
                                    approveAction === 'approve'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isApproving || isRejecting ? 'Processing...' : approveAction === 'approve' ? 'Approve' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedStore && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-serif text-warmGray-900 mb-2">Delete Store</h3>
                            <p className="text-warmGray-500 text-sm mb-6">
                                Are you sure you want to delete "{selectedStore.name}"? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedStore(null);
                                }}
                                className="flex-1 px-4 py-2 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(selectedStore.id)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminStores;