// src/components/moderator/pages/ModeratorDashboard.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Store,
    Package,
    Users,
    MessageSquare,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Eye,
    ArrowRight,
    RefreshCw,
    ShieldCheck,
    Bell,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getDashboardThunk } from '../../store/slices/moderationSlice';

const ModeratorDashboard = () => {
    const dispatch = useAppDispatch();
    const { dashboard, isLoading, error } = useAppSelector((state) => state.moderator);

    useEffect(() => {
        dispatch(getDashboardThunk());
    }, [dispatch]);

    const handleRefresh = () => {
        dispatch(getDashboardThunk());
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-warmGray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <p className="text-warmGray-600">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const stats = dashboard?.stats;
    const queue = dashboard?.queue;
    const performance = dashboard?.performance;
    const alerts = dashboard?.alerts || [];
    const recentActivity = dashboard?.recent_activity || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-serif text-warmGray-900">Dashboard</h2>
                    <p className="text-warmGray-500 text-sm">Overview of your moderation activities</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-warmGray-200 rounded-xl text-sm font-medium text-warmGray-700 hover:bg-warmGray-50 transition-colors"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warmGray-500 font-medium">Total Reviewed</p>
                            <p className="text-2xl font-bold text-warmGray-900 mt-1">{stats?.total_reviewed || 0}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Eye size={20} className="text-purple-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-green-600">↑ 12%</span>
                        <span className="text-warmGray-400">vs last week</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warmGray-500 font-medium">Pending Review</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats?.pending || 0}</p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                            <Clock size={20} className="text-yellow-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-yellow-600">{stats?.today_pending || 0} new today</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warmGray-500 font-medium">Approved</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{stats?.approved || 0}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                            <CheckCircle size={20} className="text-green-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-green-600">↑ 8%</span>
                        <span className="text-warmGray-400">approval rate</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warmGray-500 font-medium">Rejected</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{stats?.rejected || 0}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <XCircle size={20} className="text-red-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-red-600">↓ 3%</span>
                        <span className="text-warmGray-400">rejection rate</span>
                    </div>
                </div>
            </div>

            {/* Queue Summary & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Queue by Type */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <h3 className="text-sm font-semibold text-warmGray-900 mb-4">Queue by Type</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {queue?.by_type && Object.entries(queue.by_type).map(([type, count]) => {
                            const icons: Record<string, any> = {
                                store: Store,
                                product: Package,
                                seller: Users,
                                review: MessageSquare,
                                content: AlertTriangle,
                                dispute: ShieldCheck,
                            };
                            const Icon = icons[type] || Package;
                            const colors: Record<string, string> = {
                                store: 'text-purple-600 bg-purple-50',
                                product: 'text-blue-600 bg-blue-50',
                                seller: 'text-green-600 bg-green-50',
                                review: 'text-yellow-600 bg-yellow-50',
                                content: 'text-red-600 bg-red-50',
                                dispute: 'text-orange-600 bg-orange-50',
                            };
                            const color = colors[type] || 'text-warmGray-600 bg-warmGray-50';

                            return (
                                <Link
                                    key={type}
                                    to={`/moderator/queue?target_type=${type}`}
                                    className="flex flex-col items-center p-3 rounded-xl hover:bg-warmGray-50 transition-colors"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <p className="text-lg font-bold text-warmGray-900 mt-1">{count}</p>
                                    <p className="text-xs text-warmGray-500 capitalize">{type}s</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Performance */}
                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <h3 className="text-sm font-semibold text-warmGray-900 mb-4">Performance</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-warmGray-600">Avg Response Time</span>
                                <span className="font-semibold text-warmGray-900">
                                    {performance?.avg_response_time ? Math.round(performance.avg_response_time) : 0}h
                                </span>
                            </div>
                            <div className="mt-1 w-full bg-warmGray-100 rounded-full h-1.5">
                                <div
                                    className="bg-purple-600 h-1.5 rounded-full"
                                    style={{
                                        width: `${Math.min((performance?.avg_response_time || 0) / 72 * 100, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-warmGray-600">Approval Rate</span>
                                <span className="font-semibold text-warmGray-900">
                                    {performance?.approval_rate ? Math.round(performance.approval_rate) : 0}%
                                </span>
                            </div>
                            <div className="mt-1 w-full bg-warmGray-100 rounded-full h-1.5">
                                <div
                                    className="bg-green-600 h-1.5 rounded-full"
                                    style={{
                                        width: `${Math.min(performance?.approval_rate || 0, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-warmGray-100">
                            <span className="text-warmGray-600">Reviews Today</span>
                            <span className="font-semibold text-warmGray-900">{performance?.reviews_today || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-warmGray-600">This Week</span>
                            <span className="font-semibold text-warmGray-900">{performance?.reviews_this_week || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Alerts */}
                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <h3 className="text-sm font-semibold text-warmGray-900 mb-4 flex items-center gap-2">
                        <Bell size={16} className="text-warmGray-500" />
                        Alerts
                    </h3>
                    {alerts.length === 0 ? (
                        <p className="text-sm text-warmGray-500">No alerts</p>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-xl border ${
                                        alert.type === 'error'
                                            ? 'border-red-200 bg-red-50'
                                            : alert.type === 'warning'
                                            ? 'border-yellow-200 bg-yellow-50'
                                            : 'border-blue-200 bg-blue-50'
                                    }`}
                                >
                                    <p className="text-sm text-warmGray-800">{alert.message}</p>
                                    {alert.action && (
                                        <Link
                                            to={alert.action.url}
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                                        >
                                            {alert.action.label}
                                            <ArrowRight size={14} />
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                    <h3 className="text-sm font-semibold text-warmGray-900 mb-4 flex items-center justify-between">
                        <span>Recent Activity</span>
                        <Link
                            to="/moderator/history"
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                            View All
                        </Link>
                    </h3>
                    {recentActivity.length === 0 ? (
                        <p className="text-sm text-warmGray-500">No recent activity</p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-warmGray-50 transition-colors"
                                >
                                    <div className={`p-1.5 rounded-full ${
                                        activity.action === 'approved' || activity.action === 'verified'
                                            ? 'bg-green-50'
                                            : activity.action === 'rejected'
                                            ? 'bg-red-50'
                                            : 'bg-yellow-50'
                                    }`}>
                                        {activity.action === 'approved' || activity.action === 'verified' ? (
                                            <CheckCircle size={14} className="text-green-600" />
                                        ) : activity.action === 'rejected' ? (
                                            <XCircle size={14} className="text-red-600" />
                                        ) : (
                                            <AlertTriangle size={14} className="text-yellow-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-warmGray-800">
                                            {activity.action} {activity.target_type}: {activity.target_name || activity.target_id}
                                        </p>
                                        <p className="text-xs text-warmGray-400">
                                            {new Date(activity.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-5">
                <h3 className="text-sm font-semibold text-warmGray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                        to="/moderator/queue?status=pending"
                        className="flex items-center gap-3 p-3 rounded-xl border border-warmGray-200 hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                        <Clock size={18} className="text-yellow-600" />
                        <span className="text-sm font-medium text-warmGray-700">Review Queue</span>
                    </Link>
                    <Link
                        to="/moderator/stores"
                        className="flex items-center gap-3 p-3 rounded-xl border border-warmGray-200 hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                        <Store size={18} className="text-purple-600" />
                        <span className="text-sm font-medium text-warmGray-700">Review Stores</span>
                    </Link>
                    <Link
                        to="/moderator/products-approval"
                        className="flex items-center gap-3 p-3 rounded-xl border border-warmGray-200 hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                        <Package size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-warmGray-700">Review Products</span>
                    </Link>
                    <Link
                        to="/moderator/sellers"
                        className="flex items-center gap-3 p-3 rounded-xl border border-warmGray-200 hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                        <Users size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-warmGray-700">Verify Sellers</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ModeratorDashboard;