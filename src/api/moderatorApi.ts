// src/store/api/moderatorApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  ModerationItem,
  ModerationItemWithDetails,
  ModerationQueue,
  ModerationStats,
  ModerationHistoryEntry,
  ModerationFilters,
  ModerationPriority,
  ModerationAction,
  BulkModerationResult,
  ModerationDashboardData,
} from "../store/slices/moderationSlice";
import type {
  DocumentReference,
  DocumentVerificationStatus,
  BusinessType,
} from "./sellerApi";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ============================================
// WIRE-SHAPE TYPES (mirror what the API actually returns)
// ============================================
//
// These are inlined here because the API is the source of truth — no
// separate types file to keep in sync. If the backend shape changes,
// update these interfaces and TypeScript will surface every mismatch.

/** Store row as returned by `GET /moderator/stores*`. */
export interface StoreRow {
  moderation_item: {
    id: string;
    target_type: "store";
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
    verification_status: DocumentVerificationStatus | "suspended";
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
  review_history: ModerationHistoryEntry[];
}

/** Seller row as returned by `GET /moderator/sellers*`. */
export interface SellerRow {
  id: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  submitted_at: string;
  seller: {
    id: string;
    user_id: string;
    legal_business_name: string;
    trading_name?: string;
    business_type: BusinessType;
    tax_id?: string;
    registration_number?: string;
    country: string;
    state?: string;
    city?: string;
    business_address?: string;
    business_phone?: string;
    verification_status: DocumentVerificationStatus | "suspended";
    status: string;
    kyc_documents: DocumentReference[];
    payout_method?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_routing_number?: string;
    bank_name?: string;
    bank_country?: string;
    paypal_email?: string;
    mpesa_phone?: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      phone?: string;
    };
    created_at?: string;
    updated_at?: string;
  };
}

/** Store stats response for `GET /moderator/stores/stats`. */
export interface StoreStatsData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  inactive: number;
  deleted: number;
  suspended: number;
  total_products: number;
  total_orders: number;
  category_distribution: Array<{ category: string; count: number }>;
}

// ============================================
// API SLICE
// ============================================

export const moderatorApi = createApi({
  reducerPath: "moderatorApi",
  tagTypes: [
    "ModerationQueue",
    "ModerationItem",
    "ModerationStats",
    "PendingStores",
    "AllStores",
    "PendingSellers",
    "AllSellers",
    "StoreReview",
    "ProductReview",
    "ModerationHistory",
    "Stores",
    "Seller",
    "SellerProfile",
    "SellerDocuments",
  ],
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    // ============================================================
    // DASHBOARD & STATS
    // ============================================================

    getModeratorDashboard: builder.query<
      { success: boolean; data: ModerationDashboardData },
      void
    >({
      query: () => "/moderator/dashboard",
      providesTags: ["ModerationStats"],
    }),

    getModeratorStats: builder.query<
      { success: boolean; data: ModerationStats },
      void
    >({
      query: () => "/moderator/stats",
      providesTags: ["ModerationStats"],
    }),

    getModeratorStoreStats: builder.query<
      { success: boolean; data: StoreStatsData },
      void
    >({
      query: () => "/moderator/stores/stats",
      providesTags: ["ModerationStats"],
    }),

    // ============================================================
    // STORES
    // ============================================================

    getPendingStores: builder.query<
      {
        success: boolean;
        data: StoreRow[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.append("page", String(params.page));
        if (params.limit) q.append("limit", String(params.limit));
        if (params.search) q.append("search", params.search);
        return `/moderator/stores/pending?${q.toString()}`;
      },
      providesTags: ["PendingStores"],
    }),

    getAllStores: builder.query<
      {
        success: boolean;
        data: StoreRow[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      { page?: number; limit?: number; search?: string; status?: string }
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.append("page", String(params.page));
        if (params.limit) q.append("limit", String(params.limit));
        if (params.search) q.append("search", params.search);
        if (params.status) q.append("status", params.status);
        return `/moderator/stores?${q.toString()}`;
      },
      providesTags: ["AllStores", "PendingStores", "Stores"],
    }),

    // ============================================================
    // SELLERS
    // ============================================================

    getPendingSellers: builder.query<
      {
        success: boolean;
        data: SellerRow[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.append("page", String(params.page));
        if (params.limit) q.append("limit", String(params.limit));
        if (params.search) q.append("search", params.search);
        return `/moderator/sellers/pending?${q.toString()}`;
      },
      providesTags: ["PendingSellers"],
    }),

    getAllSellers: builder.query<
      {
        success: boolean;
        data: SellerRow[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      { page?: number; limit?: number; search?: string; status?: string }
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.append("page", String(params.page));
        if (params.limit) q.append("limit", String(params.limit));
        if (params.search) q.append("search", params.search);
        if (params.status) q.append("status", params.status);
        return `/moderator/sellers?${q.toString()}`;
      },
      providesTags: ["AllSellers", "PendingSellers"],
    }),

    // ============================================================
    // STORE REVIEW
    // ============================================================

    getStoreForReview: builder.query<
      { success: boolean; data: unknown },
      string
    >({
      query: (storeId) => `/moderator/stores/${storeId}`,
      providesTags: (_r, _e, storeId) => [{ type: "StoreReview", id: storeId }],
    }),

    getStoreReviewHistory: builder.query<
      { success: boolean; data: ModerationHistoryEntry[] },
      { storeId: string }
    >({
      query: ({ storeId }) => `/moderator/stores/${storeId}/history`,
      providesTags: (_r, _e, { storeId }) => [{ type: "StoreReview", id: storeId }],
    }),

    approveStore: builder.mutation<
      { success: boolean; message: string; data: unknown },
      { storeId: string; notes?: string }
    >({
      query: ({ storeId, notes }) => ({
        url: `/moderator/stores/${storeId}/review`,
        method: "PUT",
        body: { approved: true, notes },
      }),
      invalidatesTags: (_r, _e, { storeId }) => [
        { type: "StoreReview", id: storeId },
        "PendingStores",
        "AllStores",
        "ModerationStats",
        "ModerationQueue",
        { type: "Stores" },
      ],
    }),

    rejectStore: builder.mutation<
      { success: boolean; message: string; data: unknown },
      { storeId: string; reason: string; notes?: string }
    >({
      query: ({ storeId, reason, notes }) => ({
        url: `/moderator/stores/${storeId}/review`,
        method: "PUT",
        body: { approved: false, rejection_reason: reason, notes },
      }),
      invalidatesTags: (_r, _e, { storeId }) => [
        { type: "StoreReview", id: storeId },
        "PendingStores",
        "AllStores",
        "ModerationStats",
        "ModerationQueue",
        { type: "Stores" },
      ],
    }),

    // ============================================================
    // PRODUCT REVIEW
    // ============================================================

    getProductForReview: builder.query<
      { success: boolean; data: unknown },
      string
    >({
      query: (productId) => `/moderator/products/${productId}`,
      providesTags: (_r, _e, productId) => [
        { type: "ProductReview", id: productId },
      ],
    }),

    reviewProduct: builder.mutation<
      { success: boolean; message: string },
      {
        productId: string;
        approved: boolean;
        rejection_reason?: string;
        notes?: string;
      }
    >({
      query: ({ productId, approved, rejection_reason, notes }) => ({
        url: `/moderator/products/${productId}/review`,
        method: "PUT",
        body: { approved, rejection_reason, notes },
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "ProductReview", id: productId },
        "ModerationQueue",
      ],
    }),

    // ============================================================
    // SELLER VERIFICATION
    // ============================================================

    verifySeller: builder.mutation<
      { success: boolean; message: string },
      { sellerId: string; verified: boolean; reason?: string }
    >({
      query: ({ sellerId, verified, reason }) => ({
        url: `/moderator/sellers/${sellerId}/verify`,
        method: "PUT",
        body: { verified, reason },
      }),
      invalidatesTags: [
        "ModerationQueue",
        "ModerationStats",
        "PendingSellers",
        "AllSellers",
        { type: "Seller" },
        { type: "SellerProfile" },
        "SellerDocuments",
      ],
    }),

    // ============================================================
    // QUEUE
    // ============================================================

    getModerationQueue: builder.query<
      {
        success: boolean;
        data: ModerationItem[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      ModerationFilters
    >({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.target_type) params.append("target_type", filters.target_type);
        if (filters.status) params.append("status", filters.status);
        if (filters.priority) params.append("priority", filters.priority);
        if (filters.search) params.append("search", filters.search);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        if (filters.date_from) params.append("date_from", filters.date_from);
        if (filters.date_to) params.append("date_to", filters.date_to);
        return `/moderator/queue?${params.toString()}`;
      },
      providesTags: ["ModerationQueue"],
    }),

    getModerationQueueSummary: builder.query<
      { success: boolean; data: ModerationQueue },
      void
    >({
      query: () => "/moderator/queue/summary",
      providesTags: ["ModerationQueue"],
    }),

    getModerationItem: builder.query<
      { success: boolean; data: ModerationItemWithDetails },
      string
    >({
      query: (itemId) => `/moderator/queue/${itemId}`,
      providesTags: (_r, _e, itemId) => [{ type: "ModerationItem", id: itemId }],
    }),

    updateModerationPriority: builder.mutation<
      { success: boolean; data: ModerationItem },
      { itemId: string; priority: ModerationPriority }
    >({
      query: ({ itemId, priority }) => ({
        url: `/moderator/queue/${itemId}/priority`,
        method: "PATCH",
        body: { priority },
      }),
      invalidatesTags: (_r, _e, { itemId }) => [
        { type: "ModerationItem", id: itemId },
        "ModerationQueue",
      ],
    }),

    assignModeratorToItem: builder.mutation<
      { success: boolean; data: ModerationItem },
      string
    >({
      query: (itemId) => ({
        url: `/moderator/queue/${itemId}/assign`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, itemId) => [
        { type: "ModerationItem", id: itemId },
        "ModerationQueue",
      ],
    }),

    // ============================================================
    // CONTENT / REPORTING / BULK
    // ============================================================

    moderateContent: builder.mutation<
      { success: boolean; message: string },
      { contentId: string; action: "approve" | "remove" | "flag"; reason?: string }
    >({
      query: ({ contentId, action, reason }) => ({
        url: `/moderator/content/${contentId}`,
        method: "PUT",
        body: { action, reason },
      }),
      invalidatesTags: ["ModerationQueue", "ModerationStats"],
    }),

    reportContent: builder.mutation<
      { success: boolean; data: ModerationItem },
      {
        target_type: string;
        target_id: string;
        priority?: ModerationPriority;
        notes?: string;
        metadata?: Record<string, unknown>;
      }
    >({
      query: (body) => ({
        url: "/moderator/report",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ModerationQueue", "ModerationStats"],
    }),

    bulkModerate: builder.mutation<
      { success: boolean; data: BulkModerationResult },
      {
        target_type: string;
        target_ids: string[];
        action: ModerationAction;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/moderator/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "ModerationQueue",
        "ModerationStats",
        "PendingStores",
        "AllStores",
        "PendingSellers",
        "AllSellers",
      ],
    }),

    // ============================================================
    // HISTORY
    // ============================================================

    getModerationHistory: builder.query<
      {
        success: boolean;
        data: ModerationHistoryEntry[];
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      {
        moderator_id?: string;
        target_type?: string;
        action?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.moderator_id) q.append("moderator_id", params.moderator_id);
        if (params.target_type) q.append("target_type", params.target_type);
        if (params.action) q.append("action", params.action);
        if (params.page) q.append("page", String(params.page));
        if (params.limit) q.append("limit", String(params.limit));
        return `/moderator/history?${q.toString()}`;
      },
      providesTags: ["ModerationHistory"],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const useGetModeratorDashboardQuery = moderatorApi.useGetModeratorDashboardQuery;
export const useGetModeratorStatsQuery = moderatorApi.useGetModeratorStatsQuery;
export const useGetModeratorStoreStatsQuery = moderatorApi.useGetModeratorStoreStatsQuery;

export const useGetPendingStoresQuery = moderatorApi.useGetPendingStoresQuery;
export const useGetAllStoresQuery = moderatorApi.useGetAllStoresQuery;
export const useGetPendingSellersQuery = moderatorApi.useGetPendingSellersQuery;
export const useGetAllSellersQuery = moderatorApi.useGetAllSellersQuery;

export const useGetModerationQueueQuery = moderatorApi.useGetModerationQueueQuery;
export const useGetModerationQueueSummaryQuery = moderatorApi.useGetModerationQueueSummaryQuery;
export const useGetModerationItemQuery = moderatorApi.useGetModerationItemQuery;
export const useUpdateModerationPriorityMutation = moderatorApi.useUpdateModerationPriorityMutation;
export const useAssignModeratorToItemMutation = moderatorApi.useAssignModeratorToItemMutation;

export const useGetStoreForReviewQuery = moderatorApi.useGetStoreForReviewQuery;
export const useGetStoreReviewHistoryQuery = moderatorApi.useGetStoreReviewHistoryQuery;
export const useApproveStoreMutation = moderatorApi.useApproveStoreMutation;
export const useRejectStoreMutation = moderatorApi.useRejectStoreMutation;

export const useGetProductForReviewQuery = moderatorApi.useGetProductForReviewQuery;
export const useReviewProductMutation = moderatorApi.useReviewProductMutation;

export const useVerifySellerMutation = moderatorApi.useVerifySellerMutation;

export const useModerateContentMutation = moderatorApi.useModerateContentMutation;
export const useReportContentMutation = moderatorApi.useReportContentMutation;
export const useBulkModerateMutation = moderatorApi.useBulkModerateMutation;

export const useGetModerationHistoryQuery = moderatorApi.useGetModerationHistoryQuery;

// ---- Lazy variants -------------------------------------------------------

export const useLazyGetPendingSellersQuery = moderatorApi.useLazyGetPendingSellersQuery;
export const useLazyGetAllSellersQuery = moderatorApi.useLazyGetAllSellersQuery;
export const useLazyGetPendingStoresQuery = moderatorApi.useLazyGetPendingStoresQuery;
export const useLazyGetAllStoresQuery = moderatorApi.useLazyGetAllStoresQuery;
export const useLazyGetModerationQueueQuery = moderatorApi.useLazyGetModerationQueueQuery;
export const useLazyGetModeratorStatsQuery = moderatorApi.useLazyGetModeratorStatsQuery;

export default moderatorApi;