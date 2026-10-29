// src/store/api/adminApi.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAccessToken } from './api';

// ============================================
// TYPES
// ============================================

export interface AdminStoreItem {
    id: string;
    seller_id: string;
    name: string;
    slug: string;
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
    sub_categories: string[];
    status: 'draft' | 'pending_approval' | 'active' | 'suspended' | 'closed' | 'rejected';
    currency: string;
    language: string;
    return_policy?: Record<string, any>;
    shipping_origin?: Record<string, any>;
    is_approved: boolean;
    approved_at?: string;
    approved_by?: string;
    rejection_reason?: string;
    total_products: number;
    total_orders: number;
    total_reviews: number;
    average_rating: number;
    view_count: number;
    total_revenue?: number;
    created_at: string;
    updated_at: string;
    published_at?: string;
    suspended_at?: string;
    deleted_at?: string;
    seller?: {
        id: string;
        legal_business_name: string;
        trading_name?: string;
        business_type: string;
        country: string;
        rating: number;
        total_reviews: number;
        total_orders: number;
        total_products: number;
        full_name?: string;
        email?: string;
        phone?: string;
    };
}

export interface AdminStoreStats {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    closed: number;
    rejected: number;
    draft: number;
    total_products: number;
    total_orders: number;
    total_revenue: number;
    category_distribution: Array<{ category: string; count: number }>;
}

export interface AdminStoreDetails {
    id: string;
    name: string;
    slug: string;
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
    sub_categories: string[];
    status: string;
    currency: string;
    language: string;
    return_policy?: Record<string, any>;
    shipping_origin?: Record<string, any>;
    is_approved: boolean;
    approved_at?: string;
    approved_by?: string;
    rejection_reason?: string;
    total_products: number;
    total_orders: number;
    total_reviews: number;
    average_rating: number;
    view_count: number;
    total_revenue?: number;
    created_at: string;
    updated_at: string;
    published_at?: string;
    suspended_at?: string;
    seller?: {
        id: string;
        legal_business_name: string;
        trading_name?: string;
        business_type: string;
        country: string;
        state?: string;
        city?: string;
        business_address?: string;
        business_phone?: string;
        status: string;
        verification_status: string;
        rating: number;
        total_reviews: number;
        total_orders: number;
        total_products: number;
        total_stores: number;
        fulfillment_rate: number;
        response_rate: number;
        full_name: string;
        email: string;
        phone?: string;
        user_joined_at: string;
    };
}

export interface AdminUserItem {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    seller?: {
        id: string;
        business_name: string;
        business_type: string;
        country: string;
        verification_status: string;
        total_products: number;
        total_orders: number;
        total_stores: number;
        rating: number;
    };
}

// ============================================
// API Base URL from .env
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// ============================================
// API Slice
// ============================================

export const adminApi = createApi({
    reducerPath: 'adminApi',
    tagTypes: [
        'AdminStores',
        'AdminStoreStats',
        'AdminStoreDetails',
        'AdminUsers',
        'AdminUserDetails',
        'AdminDashboard',
    ],
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        credentials: 'include',
        prepareHeaders: (headers) => {
            const token = getAccessToken();

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    endpoints: (builder) => ({
        // ============ Store Management ============

        /**
         * Get all stores with pagination and filters (Admin only)
         * GET /admin/stores
         */
        getAdminStores: builder.query<{
            success: boolean;
            data: AdminStoreItem[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        }, {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            category?: string;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        }>({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params.page) queryParams.append('page', String(params.page));
                if (params.limit) queryParams.append('limit', String(params.limit));
                if (params.search) queryParams.append('search', params.search);
                if (params.status) queryParams.append('status', params.status);
                if (params.category) queryParams.append('category', params.category);
                if (params.sortBy) queryParams.append('sortBy', params.sortBy);
                if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
                return `/admin/stores?${queryParams.toString()}`;
            },
            providesTags: ['AdminStores'],
        }),

        /**
         * Get admin store statistics
         * GET /admin/stores/stats
         */
        getAdminStoreStats: builder.query<{
            success: boolean;
            data: AdminStoreStats;
        }, void>({
            query: () => '/admin/stores/stats',
            providesTags: ['AdminStoreStats'],
        }),

        /**
         * Get store details for admin
         * GET /admin/stores/:storeId
         */
        getAdminStoreDetails: builder.query<{
            success: boolean;
            data: AdminStoreDetails;
        }, {
            storeId: string;
        }>({
            query: ({ storeId }) => `/admin/stores/${storeId}`,
            providesTags: (_result, _error, { storeId }) => [{ type: 'AdminStoreDetails', id: storeId }],
        }),

        /**
         * Approve a store (Admin only)
         * PUT /admin/stores/:storeId/approve
         */
        adminApproveStore: builder.mutation<{
            success: boolean;
            message: string;
            data: AdminStoreItem;
        }, {
            storeId: string;
            notes?: string;
        }>({
            query: ({ storeId, notes }) => ({
                url: `/admin/stores/${storeId}/approve`,
                method: 'PUT',
                body: { approved: true, notes },
            }),
            invalidatesTags: (_result, _error, { storeId }) => [
                { type: 'AdminStoreDetails', id: storeId },
                'AdminStores',
                'AdminStoreStats',
            ],
        }),

        /**
         * Reject a store (Admin only)
         * PUT /admin/stores/:storeId/approve
         */
        adminRejectStore: builder.mutation<{
            success: boolean;
            message: string;
            data: AdminStoreItem;
        }, {
            storeId: string;
            reason: string;
            notes?: string;
        }>({
            query: ({ storeId, reason, notes }) => ({
                url: `/admin/stores/${storeId}/approve`,
                method: 'PUT',
                body: { approved: false, rejection_reason: reason, notes },
            }),
            invalidatesTags: (_result, _error, { storeId }) => [
                { type: 'AdminStoreDetails', id: storeId },
                'AdminStores',
                'AdminStoreStats',
            ],
        }),

        /**
         * Suspend a store (Admin only)
         * POST /admin/stores/:storeId/suspend
         */
        adminSuspendStore: builder.mutation<{
            success: boolean;
            message: string;
            data: AdminStoreItem;
        }, {
            storeId: string;
            reason: string;
            notify_seller?: boolean;
        }>({
            query: ({ storeId, reason, notify_seller = true }) => ({
                url: `/admin/stores/${storeId}/suspend`,
                method: 'POST',
                body: { reason, notify_seller },
            }),
            invalidatesTags: (_result, _error, { storeId }) => [
                { type: 'AdminStoreDetails', id: storeId },
                'AdminStores',
                'AdminStoreStats',
            ],
        }),

        /**
         * Reinstate a store (Admin only)
         * POST /admin/stores/:storeId/reinstate
         */
        adminReinstateStore: builder.mutation<{
            success: boolean;
            message: string;
            data: AdminStoreItem;
        }, {
            storeId: string;
            reason?: string;
            notify_seller?: boolean;
        }>({
            query: ({ storeId, reason, notify_seller = true }) => ({
                url: `/admin/stores/${storeId}/reinstate`,
                method: 'POST',
                body: { reason, notify_seller },
            }),
            invalidatesTags: (_result, _error, { storeId }) => [
                { type: 'AdminStoreDetails', id: storeId },
                'AdminStores',
                'AdminStoreStats',
            ],
        }),

        /**
         * Delete a store (Admin only - hard delete or soft delete)
         * DELETE /admin/stores/:storeId
         */
        adminDeleteStore: builder.mutation<{
            success: boolean;
            message: string;
        }, {
            storeId: string;
            permanent?: boolean;
        }>({
            query: ({ storeId, permanent = false }) => ({
                url: `/admin/stores/${storeId}`,
                method: 'DELETE',
                body: { permanent },
            }),
            invalidatesTags: (_result, _error, { storeId }) => [
                { type: 'AdminStoreDetails', id: storeId },
                'AdminStores',
                'AdminStoreStats',
            ],
        }),

        // ============ User Management ============

        /**
         * Get all users with pagination and filters (Admin only)
         * GET /admin/users
         */
        getAdminUsers: builder.query<{
            success: boolean;
            data: AdminUserItem[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        }, {
            page?: number;
            limit?: number;
            search?: string;
            role?: string;
            is_active?: boolean;
        }>({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params.page) queryParams.append('page', String(params.page));
                if (params.limit) queryParams.append('limit', String(params.limit));
                if (params.search) queryParams.append('search', params.search);
                if (params.role) queryParams.append('role', params.role);
                if (params.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
                return `/admin/users?${queryParams.toString()}`;
            },
            providesTags: ['AdminUsers'],
        }),

        /**
         * Get user details for admin
         * GET /admin/users/:userId
         */
        getAdminUserDetails: builder.query<{
            success: boolean;
            data: AdminUserItem & { seller?: AdminUserItem['seller'] };
        }, {
            userId: string;
        }>({
            query: ({ userId }) => `/admin/users/${userId}`,
            providesTags: (_result, _error, { userId }) => [{ type: 'AdminUserDetails', id: userId }],
        }),

        /**
         * Update user role (Admin only)
         * PUT /admin/users/:userId/role
         */
        adminUpdateUserRole: builder.mutation<{
            success: boolean;
            message: string;
        }, {
            userId: string;
            role: string;
        }>({
            query: ({ userId, role }) => ({
                url: `/admin/users/${userId}/role`,
                method: 'PUT',
                body: { role },
            }),
            invalidatesTags: (_result, _error, { userId }) => [
                { type: 'AdminUserDetails', id: userId },
                'AdminUsers',
            ],
        }),

        /**
         * Activate or deactivate user (Admin only)
         * PUT /admin/users/:userId/activate
         */
        adminToggleUserActive: builder.mutation<{
            success: boolean;
            message: string;
        }, {
            userId: string;
            is_active: boolean;
        }>({
            query: ({ userId, is_active }) => ({
                url: `/admin/users/${userId}/activate`,
                method: 'PUT',
                body: { is_active },
            }),
            invalidatesTags: (_result, _error, { userId }) => [
                { type: 'AdminUserDetails', id: userId },
                'AdminUsers',
            ],
        }),

        // ============ Dashboard ============

        /**
         * Get admin dashboard data
         * GET /admin/dashboard
         */
        getAdminDashboard: builder.query<{
            success: boolean;
            data: {
                stats: {
                    total_users: number;
                    total_sellers: number;
                    total_stores: number;
                    total_orders: number;
                    total_revenue: number;
                    pending_stores: number;
                    pending_sellers: number;
                };
                recent_activity: Array<{
                    id: string;
                    action: string;
                    target_type: string;
                    target_id: string;
                    target_name?: string;
                    created_at: string;
                    user?: {
                        id: string;
                        full_name: string;
                        email: string;
                    };
                }>;
                chart_data: {
                    labels: string[];
                    orders: number[];
                    revenue: number[];
                };
            };
        }, void>({
            query: () => '/admin/dashboard',
            providesTags: ['AdminDashboard'],
        }),

        // ============ Bulk Operations ============

        /**
         * Bulk update store status (Admin only)
         * POST /admin/stores/bulk
         */
        adminBulkUpdateStores: builder.mutation<{
            success: boolean;
            message: string;
            data: {
                processed: number;
                failed: number;
                errors: Array<{ id: string; error: string }>;
            };
        }, {
            store_ids: string[];
            status: string;
            reason?: string;
            notify_sellers?: boolean;
        }>({
            query: (body) => ({
                url: '/admin/stores/bulk',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['AdminStores', 'AdminStoreStats'],
        }),
    }),
});

// ============================================
// HOOKS
// ============================================

// Stores
export const useGetAdminStoresQuery = adminApi.useGetAdminStoresQuery;
export const useGetAdminStoreStatsQuery = adminApi.useGetAdminStoreStatsQuery;
export const useGetAdminStoreDetailsQuery = adminApi.useGetAdminStoreDetailsQuery;
export const useAdminApproveStoreMutation = adminApi.useAdminApproveStoreMutation;
export const useAdminRejectStoreMutation = adminApi.useAdminRejectStoreMutation;
export const useAdminSuspendStoreMutation = adminApi.useAdminSuspendStoreMutation;
export const useAdminReinstateStoreMutation = adminApi.useAdminReinstateStoreMutation;
export const useAdminDeleteStoreMutation = adminApi.useAdminDeleteStoreMutation;

// Users
export const useGetAdminUsersQuery = adminApi.useGetAdminUsersQuery;
export const useGetAdminUserDetailsQuery = adminApi.useGetAdminUserDetailsQuery;
export const useAdminUpdateUserRoleMutation = adminApi.useAdminUpdateUserRoleMutation;
export const useAdminToggleUserActiveMutation = adminApi.useAdminToggleUserActiveMutation;

// Dashboard
export const useGetAdminDashboardQuery = adminApi.useGetAdminDashboardQuery;

// Bulk
export const useAdminBulkUpdateStoresMutation = adminApi.useAdminBulkUpdateStoresMutation;

export default adminApi;