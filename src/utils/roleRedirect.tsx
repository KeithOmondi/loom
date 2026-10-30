// src/utils/roleRedirect.ts
import type { AuthUser, StoreStatus } from '../store/slices/authSlice';

interface RedirectOptions {
    // New options (for the new flow)
    hasSellerProfile?: boolean;
    isSellerComplete?: boolean;
    hasStores?: boolean;
    storeStatus?: 'pending_approval' | 'inactive' | 'active';
    // Legacy options (for backward compatibility)
    needsStoreSetup?: boolean;
    storeStatusLegacy?: StoreStatus | null;
}

export const getRoleRedirectPath = (
    user: AuthUser,
    options: RedirectOptions = {}
): string => {
    switch (user.role) {
        case 'customer':
            return '/';

        case 'seller':
            // Check legacy options first (for backward compatibility)
            if (options.needsStoreSetup !== undefined) {
                if (options.needsStoreSetup) {
                    return '/store-setup';
                }
                if (options.storeStatusLegacy && options.storeStatusLegacy !== 'active') {
                    return '/store-status';
                }
                return '/dashboard';
            }

            // New options flow
            // Check if seller has a profile
            if (options.hasSellerProfile === false) {
                return '/seller-setup';
            }

            // Check if seller profile is complete
            if (options.isSellerComplete === false) {
                return '/seller-setup/complete-profile';
            }

            // Check if seller has a store
            if (options.hasStores === false) {
                return '/store-setup';
            }

            // Check store status
            if (options.storeStatus === 'pending_approval') {
                return '/store-status';
            }

            if (options.storeStatus === 'inactive') {
                return '/store-status';
            }

            // Store is active - go to dashboard
            return '/dashboard';

        // ✅ NEW: Moderator role
        case 'moderator':
            return '/moderator/dashboard';

        case 'admin':
        case 'super_admin':
        case 'finance':
        case 'support':
            return '/admin/dashboard';

        default:
            return '/';
    }
};

/**
 * Get the redirect path after login
 * This is a convenience wrapper that handles the loading state
 */
export const getPostLoginRedirect = (
    user: AuthUser,
    extra: { needsStoreSetup?: boolean; storeStatus?: StoreStatus | null }
): string => {
    return getRoleRedirectPath(user, {
        needsStoreSetup: extra.needsStoreSetup,
        storeStatusLegacy: extra.storeStatus,
    });
};

/**
 * Get redirect path after seller profile check
 */
export const getSellerRedirect = (
    user: AuthUser,
    hasSellerProfile: boolean,
    isSellerComplete: boolean,
    hasStores: boolean,
    storeStatus?: 'pending_approval' | 'inactive' | 'active'
): string => {
    return getRoleRedirectPath(user, {
        hasSellerProfile,
        isSellerComplete,
        hasStores,
        storeStatus,
    });
};

// ============================================
// ✅ NEW: Role-based permission helpers
// ============================================

/**
 * Check if user has a specific role or higher
 */
export const hasRoleOrHigher = (
    user: AuthUser | null,
    requiredRole: 'customer' | 'seller' | 'moderator' | 'admin' | 'super_admin'
): boolean => {
    if (!user) return false;

    const roleHierarchy: Record<string, number> = {
        customer: 0,
        seller: 1,
        moderator: 2,
        admin: 3,
        super_admin: 4,
    };

    const userRank = roleHierarchy[user.role] ?? -1;
    const requiredRank = roleHierarchy[requiredRole] ?? -1;

    return userRank >= requiredRank;
};

/**
 * Check if user is a moderator or higher
 */
export const isModeratorOrHigher = (user: AuthUser | null): boolean => {
    return hasRoleOrHigher(user, 'moderator');
};

/**
 * Check if user is an admin or higher
 */
export const isAdminOrHigher = (user: AuthUser | null): boolean => {
    return hasRoleOrHigher(user, 'admin');
};

/**
 * Check if user is a super admin
 */
export const isSuperAdmin = (user: AuthUser | null): boolean => {
    return hasRoleOrHigher(user, 'super_admin');
};

/**
 * Check if user is a seller
 */
export const isSeller = (user: AuthUser | null): boolean => {
    return user?.role === 'seller';
};

/**
 * Get user's display role name
 */
export const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
        customer: 'Customer',
        seller: 'Seller',
        moderator: 'Moderator',
        admin: 'Administrator',
        super_admin: 'Super Administrator',
    };
    return roleNames[role] || role;
};

/**
 * Get user's role color
 */
export const getRoleColor = (role: string): string => {
    const roleColors: Record<string, string> = {
        customer: 'text-gray-500 bg-gray-100',
        seller: 'text-blue-600 bg-blue-50',
        moderator: 'text-purple-600 bg-purple-50',
        admin: 'text-red-600 bg-red-50',
        super_admin: 'text-amber-600 bg-amber-50',
    };
    return roleColors[role] || 'text-gray-500 bg-gray-100';
};

/**
 * Get user's role badge
 */
export const getRoleBadge = (role: string): { label: string; className: string } => {
    const badges: Record<string, { label: string; className: string }> = {
        customer: { label: 'Customer', className: 'bg-gray-100 text-gray-700' },
        seller: { label: 'Seller', className: 'bg-blue-100 text-blue-700' },
        moderator: { label: 'Moderator', className: 'bg-purple-100 text-purple-700' },
        admin: { label: 'Admin', className: 'bg-red-100 text-red-700' },
        super_admin: { label: 'Super Admin', className: 'bg-amber-100 text-amber-700' },
    };
    return badges[role] || badges.customer;
};