// src/store/api/storeApi.ts

// ============================================================
// ⚠️ SCOPE NOTE
// ------------------------------------------------------------
// This slice is for SELLER-scoped and PUBLIC store operations only:
//   • getMyStores       — the current seller's own stores
//   • getStoreById      — a single public (active) store
//   • getStoreBySlug    — a single public (active) store
//   • getStoreStatus    — seller's own store status check
//   • getStoreOnboarding— seller's own onboarding progress
//   • create/update/close/delete — seller's own store CRUD
//   • getStoreMetrics   — seller's own store analytics
//
// Moderator/admin operations on ALL stores live in `moderatorApi.ts`:
//   • useGetAllStoresQuery         — every store (any status)
//   • useGetPendingStoresQuery     — pending-only stores
//   • useGetModeratorStoreStatsQuery — store stats for the moderator UI
//   • useApproveStoreMutation      — approve a store
//   • useRejectStoreMutation       — reject a store
//
// Do NOT mix the two slices. The auth gate (`requireModerator`) will
// reject seller-scoped calls to /api/moderator/* and vice versa.
// ============================================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAccessToken } from './api';

// ============================================
// TYPES (Synchronized with backend)
// ============================================

/**
 * Store Status Code
 * 
 * Single-approval flow: stores are created as ACTIVE immediately after
 * the seller passes KYC. No store-level moderation.
 *
 * NOTE: this is just the status *code*. The API does not return this
 * string directly on a store — it's nested inside a status object, see
 * StoreStatusCheck below and StoreProfile.status.
 */
export type StoreStatus = 
  | 'active'         // ✅ Store is live and selling (default)
  | 'suspended'      // Admin-suspended
  | 'closed'         // Permanently closed
  // @deprecated — kept for backward compatibility
  | 'draft'
  | 'pending_approval'
  | 'rejected';

export type StoreType = 
  | 'physical'
  | 'digital'
  | 'services'
  | 'mixed';

export type StoreCategory = 
  | 'electronics'
  | 'fashion'
  | 'home_garden'
  | 'beauty'
  | 'books'
  | 'toys'
  | 'sports'
  | 'automotive'
  | 'health'
  | 'food'
  | 'services'
  | 'other';

export type StoreSetupStep = 
  | 'basic_info'
  | 'branding'
  | 'policies'
  | 'products'
  | 'publish';

// ============================================
// INTERFACES
// ============================================

export interface ReturnPolicy {
  days: number;
  condition: 'unused' | 'opened' | 'any';
  refund_method: 'original' | 'store_credit';
  restocking_fee_percent?: number;
  notes?: string;
}

export interface ShippingOrigin {
  country: string;
  state?: string;
  city?: string;
  zip_code?: string;
}

export interface StoreStatusCheck {
  id: string;
  status: StoreStatus;
  is_live: boolean;
  can_edit: boolean;
  can_add_products: boolean;
  can_process_orders: boolean;
  block_reason?: string;
  actions_required?: string[];
}

export interface StoreProfile {
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
  type: StoreType;
  category: StoreCategory;
  sub_categories: StoreCategory[];
  // ✅ FIX: the API embeds a full status object on every store record
  // (matches StoreStatusCheck exactly — id, status, is_live, can_edit,
  // can_add_products, can_process_orders), not the bare StoreStatus
  // string enum. Confirmed against the live /stores/my/stores response.
  status: StoreStatusCheck;
  currency: string;
  language: string;
  return_policy?: ReturnPolicy;
  shipping_origin?: ShippingOrigin;
  
  // ✅ New lifecycle fields
  is_active: boolean;
  activated_at?: string;
  
  // ✅ Admin action fields
  suspended_at?: string;
  suspended_by?: string;
  suspension_reason?: string;
  closed_at?: string;
  closed_by?: string;
  closure_reason?: string;
  
  // ✅ Metrics
  total_products: number;
  total_orders: number;
  total_reviews: number;
  average_rating: number;
  view_count: number;
  
  // ✅ Audit
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface StoreOnboardingProgress {
  steps: {
    step: StoreSetupStep;
    label: string;
    completed: boolean;
    required: boolean;
    error?: string;
  }[];
  isComplete: boolean;
  currentStep: StoreSetupStep;
  missingFields: string[];
}

export interface StoreWithSellerData {
  store: StoreProfile;
  seller: {
    id: string;
    legal_business_name: string;
    trading_name?: string;
    business_type: string;
    country: string;
    rating: number;
    total_reviews: number;
    fulfillment_rate: number;
    response_rate: number;
  };
}

export interface StoreMetrics {
  store_id: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  total_visits: number;
  unique_visitors: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  refunded_orders: number;
  average_order_value: number;
  total_revenue: number;
  revenue_by_currency: Record<string, number>;
  platform_fees: number;
  net_earnings: number;
  total_products: number;
  active_products: number;
  out_of_stock_products: number;
  top_selling_products: Array<{
    product_id: string;
    name: string;
    units_sold: number;
    revenue: number;
  }>;
  average_rating: number;
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
  conversion_rate: number;
  bounce_rate: number;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateStoreInput {
  name: string;
  category: StoreCategory;
  type: StoreType;
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
  sub_categories?: StoreCategory[];
  currency?: string;
  language?: string;
  return_policy?: ReturnPolicy;
  shipping_origin?: ShippingOrigin;
  social_links?: Record<string, string>;
}

export interface UpdateStoreInput {
  name?: string;
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
  category?: StoreCategory;
  sub_categories?: StoreCategory[];
  currency?: string;
  language?: string;
  return_policy?: ReturnPolicy;
  shipping_origin?: ShippingOrigin;
  social_links?: Record<string, string>;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface MyStoresResponse {
  success: boolean;
  data: StoreProfile[];
}

export interface StoreResponse {
  success: boolean;
  message: string;
  data: {
    store: StoreProfile;
    nextSteps?: string[];
  };
}

export interface StoreWithSellerResponse {
  success: boolean;
  data: StoreWithSellerData;
}

export interface StoreStatusResponse {
  success: boolean;
  data: StoreStatusCheck;
}

export interface StoreOnboardingResponse {
  success: boolean;
  data: StoreOnboardingProgress;
}

export interface StoreMetricsResponse {
  success: boolean;
  data: StoreMetrics;
}

// ============================================
// API Base URL from .env
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// ============================================
// API Slice
// ============================================

export const storeApi = createApi({
  reducerPath: 'storeApi',
  tagTypes: ['Stores', 'Store', 'StoreMetrics', 'StoreOnboarding'],
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
    // ============ My Stores ============

    /**
     * Get all stores for current seller
     * GET /stores/my/stores
     */
    getMyStores: builder.query<MyStoresResponse, void>({
      query: () => '/stores/my/stores',
      providesTags: ['Stores'],
    }),

    // ============ Store by ID (Public) ============

    /**
     * Get store by ID (public - only active)
     * GET /stores/:storeId
     */
    getStoreById: builder.query<StoreWithSellerResponse, string>({
      query: (id) => `/stores/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Store', id }],
    }),

    /**
     * Get store by slug (public - only active)
     * GET /stores/slug/:slug
     */
    getStoreBySlug: builder.query<StoreWithSellerResponse, string>({
      query: (slug) => `/stores/slug/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: 'Store', id: slug }],
    }),

    // ============ Store Status ============

    /**
     * Get store status (gatekeeper for operations)
     * GET /stores/:storeId/status
     */
    getStoreStatus: builder.query<StoreStatusResponse, string>({
      query: (storeId) => `/stores/${storeId}/status`,
      providesTags: (_result, _error, storeId) => [{ type: 'Store', id: storeId }],
    }),

    // ============ Store Onboarding ============

    /**
     * Get store onboarding progress
     * GET /stores/:storeId/onboarding
     */
    getStoreOnboarding: builder.query<StoreOnboardingResponse, string>({
      query: (storeId) => `/stores/${storeId}/onboarding`,
      providesTags: ['StoreOnboarding'],
    }),

    // ============ Store CRUD ============

    /**
     * Create store (instant activation — no approval needed)
     * POST /stores
     */
    createStore: builder.mutation<StoreResponse, CreateStoreInput>({
      query: (data) => ({
        url: '/stores',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Stores', 'Store'],
    }),

    /**
     * Update store
     * PUT /stores/:storeId
     */
    updateStore: builder.mutation<StoreResponse, { id: string; data: UpdateStoreInput }>({
      query: ({ id, data }) => ({
        url: `/stores/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Store', id }, 'Stores'],
    }),

    /**
     * Close own store (seller)
     * POST /stores/:storeId/close
     */
    closeStore: builder.mutation<StoreResponse, { storeId: string; reason?: string }>({
      query: ({ storeId, reason }) => ({
        url: `/stores/${storeId}/close`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { storeId }) => [{ type: 'Store', id: storeId }, 'Stores'],
    }),

    /**
     * Delete store (soft delete — only if closed)
     * DELETE /stores/:storeId
     */
    deleteStore: builder.mutation<void, string>({
      query: (id) => ({
        url: `/stores/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Stores'],
    }),

    // ============ Store Metrics ============

    /**
     * Get store metrics (dashboard)
     * GET /stores/:storeId/metrics
     */
    getStoreMetrics: builder.query<
      StoreMetricsResponse,
      { storeId: string; period?: 'today' | 'week' | 'month' | 'year' | 'all' }
    >({
      query: ({ storeId, period = 'month' }) => `/stores/${storeId}/metrics?period=${period}`,
      providesTags: ['StoreMetrics'],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const {
  // Queries
  useGetMyStoresQuery,
  useGetStoreByIdQuery,
  useGetStoreBySlugQuery,
  useGetStoreStatusQuery,
  useGetStoreOnboardingQuery,
  useGetStoreMetricsQuery,

  // Mutations
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useCloseStoreMutation,
  useDeleteStoreMutation,
} = storeApi;

// ============================================
// HELPERS
// ============================================

export const getStoreStatusCode = (store?: StoreProfile): StoreStatus | undefined =>
  store?.status?.status;

export const isStoreLive = (store?: StoreProfile): boolean =>
  store?.status?.is_live === true;

export const isStoreActive = (store?: StoreProfile): boolean =>
  store?.status?.status === 'active' && store?.status?.is_live === true;

export default storeApi;