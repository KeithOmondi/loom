// src/pages/superadmin/SuperAdminUsers.tsx
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    listUsersThunk,
    updateUserByIdThunk,
    deleteUserByIdThunk,
    getUserStatsThunk,
    clearUserError,
    clearUserMessage,
} from '../../store/slices/userSlice';
import { registerAdminThunk } from '../../store/slices/authSlice'; // ✅ Changed import
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    UserX,
    Shield,
    UserCog,
    Store,
    Users,
    UserCircle,
    RefreshCw,
    Phone,
    Calendar,
    Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type UserRoleType = 'customer' | 'seller' | 'moderator' | 'admin' | 'super_admin';

// ✅ Role options for edit (only these can be assigned by admin)
type EditableRoleType = 'moderator' | 'admin' | 'super_admin';

const SuperAdminUsers = () => {
    const dispatch = useAppDispatch();
    const { users, stats, isLoading, isMutating, pagination, error, message } = useAppSelector(
        (state) => state.user
    );

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRoleType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // Selected user for actions
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState<{
        id: string;
        full_name: string;
        email: string;
        role: EditableRoleType;
        is_active: boolean;
    }>({
        id: '',
        full_name: '',
        email: '',
        role: 'moderator',
        is_active: true,
    });

    // Create form state
    const [createForm, setCreateForm] = useState<{
        email: string;
        password: string;
        full_name: string;
        phone: string;
        role: 'moderator' | 'admin' | 'super_admin';
    }>({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'moderator',
    });

    useEffect(() => {
        fetchUsers();
        dispatch(getUserStatsThunk());
    }, [page, roleFilter, statusFilter]);

    useEffect(() => {
        if (message) {
            toast.success(message);
            dispatch(clearUserMessage());
        }
        if (error) {
            toast.error(error);
            dispatch(clearUserError());
        }
    }, [message, error, dispatch]);

    const fetchUsers = () => {
        dispatch(
            listUsersThunk({
                page,
                limit,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                search: search || undefined,
                is_active: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
            })
        );
    };

    const handleSearch = () => {
        setPage(1);
        fetchUsers();
    };

    const handleEdit = (user: any) => {
        const currentRole = user.role as UserRoleType;
        let editableRole: EditableRoleType = 'moderator';
        
        if (currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'moderator') {
            editableRole = currentRole as EditableRoleType;
        }

        setEditForm({
            id: user.id,
            full_name: user.full_name || '',
            email: user.email || '',
            role: editableRole,
            is_active: user.is_active,
        });
        setShowEditModal(true);
    };

    const handleDelete = (userId: string) => {
        setSelectedUser(userId);
        setShowDeleteModal(true);
    };

    const handleCreate = () => {
        setShowCreateModal(true);
    };

    const confirmDelete = async () => {
        if (selectedUser) {
            try {
                await dispatch(deleteUserByIdThunk(selectedUser)).unwrap();
                toast.success('User deleted successfully');
                fetchUsers();
                dispatch(getUserStatsThunk());
            } catch (err) {
                // Error handled in slice
            }
            setShowDeleteModal(false);
            setSelectedUser(null);
        }
    };

    const confirmEdit = async () => {
        try {
            await dispatch(
                updateUserByIdThunk({
                    id: editForm.id,
                    data: {
                        full_name: editForm.full_name,
                        email: editForm.email,
                        role: editForm.role,
                        is_active: editForm.is_active,
                    },
                })
            ).unwrap();
            toast.success('User updated successfully');
            fetchUsers();
            setShowEditModal(false);
        } catch (err) {
            // Error handled in slice
        }
    };

    // ✅ Updated: Use registerAdminThunk from auth slice
// ✅ Updated: Use registerAdminThunk from auth slice
const confirmCreate = async () => {
    if (isCreating) return;

    // Validate required fields
    if (!createForm.full_name || !createForm.email || !createForm.password) {
        toast.error('Please fill in all required fields.');
        return;
    }

    setIsCreating(true);

    try {
        // ✅ Remove the unused 'result' variable
        await dispatch(registerAdminThunk({
            email: createForm.email,
            password: createForm.password,
            full_name: createForm.full_name,
            phone: createForm.phone || undefined,
            role: createForm.role,
        })).unwrap();

        // ✅ Success message from the thunk response
        toast.success(`${createForm.role} account created successfully! They will receive an email with their temporary password.`);
        setShowCreateModal(false);
        setCreateForm({
            email: '',
            password: '',
            full_name: '',
            phone: '',
            role: 'moderator',
        });
        fetchUsers();
        dispatch(getUserStatsThunk());
    } catch (err: any) {
        // Error handled in slice
        console.error('Failed to create admin user:', err);
    } finally {
        setIsCreating(false);
    }
};

    const getRoleBadge = (role: string) => {
        const badges: Record<string, { label: string; className: string }> = {
            customer: { label: 'Customer', className: 'bg-gray-100 text-gray-700' },
            seller: { label: 'Seller', className: 'bg-blue-100 text-blue-700' },
            moderator: { label: 'Moderator', className: 'bg-purple-100 text-purple-700' },
            admin: { label: 'Admin', className: 'bg-red-100 text-red-700' },
            super_admin: { label: 'Super Admin', className: 'bg-amber-100 text-amber-700' },
        };
        return badges[role] || badges.customer;
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive
            ? { label: 'Active', className: 'bg-green-100 text-green-700' }
            : { label: 'Inactive', className: 'bg-red-100 text-red-700' };
    };

    const getRoleIcon = (role: string) => {
        const icons: Record<string, any> = {
            customer: UserCircle,
            seller: Store,
            moderator: Shield,
            admin: UserCog,
            super_admin: Shield,
        };
        return icons[role] || UserCircle;
    };

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            customer: 'text-gray-600',
            seller: 'text-blue-600',
            moderator: 'text-purple-600',
            admin: 'text-red-600',
            super_admin: 'text-amber-600',
        };
        return colors[role] || 'text-gray-600';
    };

    // Stats cards
    const statCards = [
        {
            label: 'Total Users',
            value: stats?.total_users || 0,
            icon: Users,
            color: 'text-purple-600 bg-purple-50',
        },
        {
            label: 'Moderators',
            value: stats?.moderators || 0,
            icon: Shield,
            color: 'text-purple-600 bg-purple-50',
        },
        {
            label: 'Sellers',
            value: stats?.sellers || 0,
            icon: Store,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: 'Admins',
            value: stats?.admins || 0,
            icon: UserCog,
            color: 'text-red-600 bg-red-50',
        },
        {
            label: 'Active Users',
            value: stats?.active_users || 0,
            icon: UserCheck,
            color: 'text-green-600 bg-green-50',
        },
        {
            label: 'Inactive Users',
            value: stats?.inactive_users || 0,
            icon: UserX,
            color: 'text-red-600 bg-red-50',
        },
    ];

    // Role filter options
    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'customer', label: 'Customers' },
        { value: 'seller', label: 'Sellers' },
        { value: 'moderator', label: 'Moderators' },
        { value: 'admin', label: 'Admins' },
        { value: 'super_admin', label: 'Super Admins' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-serif text-warmGray-900">User Management</h2>
                    <p className="text-warmGray-500 text-sm">Manage all users across the platform</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
                    >
                        <Plus size={18} />
                        Create User
                    </button>
                    <button
                        onClick={fetchUsers}
                        className="p-2 bg-white border border-warmGray-200 rounded-xl hover:bg-warmGray-50 transition-colors"
                    >
                        <RefreshCw size={18} className="text-warmGray-600" />
                    </button>
                </div>
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
                                <span className="text-lg font-bold text-warmGray-900">{stat.value}</span>
                            </div>
                            <p className="text-xs text-warmGray-500 mt-1">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmGray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    <select
                        className="bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-sm text-warmGray-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                    >
                        {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-sm text-warmGray-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-warmGray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-warmGray-50 border-b border-warmGray-100">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-warmGray-500 uppercase tracking-wider">
                                    Contact
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
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-warmGray-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => {
                                    const RoleIcon = getRoleIcon(user.role);
                                    const roleBadge = getRoleBadge(user.role);
                                    const statusBadge = getStatusBadge(user.is_active);
                                    const roleColor = getRoleColor(user.role);

                                    const isEditableRole = ['moderator', 'admin', 'super_admin'].includes(user.role);
                                    const isSuperAdmin = user.role === 'super_admin';

                                    return (
                                        <tr key={user.id} className="hover:bg-warmGray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center">
                                                        {user.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-warmGray-900">
                                                            {user.full_name || 'Unnamed User'}
                                                        </p>
                                                        <p className="text-xs text-warmGray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <RoleIcon size={14} className={roleColor} />
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.className}`}>
                                                        {roleBadge.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                                    {statusBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-warmGray-600">
                                                    {user.phone ? (
                                                        <div className="flex items-center gap-1">
                                                            <Phone size={12} className="text-warmGray-400" />
                                                            {user.phone}
                                                        </div>
                                                    ) : (
                                                        <span className="text-warmGray-400">No phone</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-sm text-warmGray-600">
                                                    <Calendar size={12} className="text-warmGray-400" />
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isEditableRole && (
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="p-1.5 rounded-lg hover:bg-warmGray-100 transition-colors"
                                                            title="Edit user"
                                                        >
                                                            <Edit size={16} className="text-warmGray-600" />
                                                        </button>
                                                    )}
                                                    {!isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 size={16} className="text-red-500" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="p-1.5 rounded-lg hover:bg-warmGray-100 transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye size={16} className="text-warmGray-600" />
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
                {pagination && pagination.total > 0 && (
                    <div className="px-6 py-4 border-t border-warmGray-100 flex items-center justify-between">
                        <p className="text-sm text-warmGray-600">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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
                                Page {page} of {pagination.pages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= pagination.pages}
                                className="p-2 rounded-lg hover:bg-warmGray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} className="text-warmGray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-xl">
                        <h3 className="text-xl font-serif text-warmGray-900 mb-4">Edit User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    value={editForm.full_name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, full_name: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    value={editForm.email}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, email: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Role <span className="text-warmGray-400 text-xs">(Moderator, Admin, Super Admin)</span>
                                </label>
                                <select
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    value={editForm.role}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            role: e.target.value as EditableRoleType,
                                        })
                                    }
                                >
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-warmGray-700">Active</label>
                                <button
                                    onClick={() =>
                                        setEditForm({ ...editForm, is_active: !editForm.is_active })
                                    }
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                        editForm.is_active ? 'bg-green-500' : 'bg-warmGray-300'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            editForm.is_active ? 'translate-x-6' : ''
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmEdit}
                                disabled={isMutating}
                                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                                {isMutating ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-serif text-warmGray-900 mb-2">Delete User</h3>
                            <p className="text-warmGray-500 text-sm mb-6">
                                Are you sure you want to delete this user? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isMutating}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isMutating ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-xl">
                        <h3 className="text-xl font-serif text-warmGray-900 mb-4">Create User</h3>
                        <p className="text-sm text-warmGray-500 mb-4">
                            Create a new {createForm.role} account
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="e.g. Jane Moderator"
                                    value={createForm.full_name}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, full_name: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="user@example.com"
                                    value={createForm.email}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, email: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="At least 8 characters"
                                    value={createForm.password}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, password: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Phone Number <span className="text-warmGray-400">(optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="+1 (555) 000-0000"
                                    value={createForm.phone}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, phone: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full bg-warmGray-50 border border-warmGray-200 rounded-xl px-4 py-2 text-warmGray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    value={createForm.role}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            role: e.target.value as 'moderator' | 'admin' | 'super_admin',
                                        })
                                    }
                                >
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCreate}
                                disabled={isMutating || isCreating || !createForm.full_name || !createForm.email || !createForm.password}
                                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create User'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminUsers;