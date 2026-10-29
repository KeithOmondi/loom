// src/store/slices/moderatorSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import api from "../../api/api";
import type {
  BusinessType,
  DocumentReference,
  DocumentVerificationStatus,
  KycDocumentType,
} from "../../api/sellerApi";

// ============================================
// TYPES
// ============================================

export type ModerationTarget =
  | "store"
  | "product"
  | "seller"
  | "review"
  | "content"
  | "dispute";

export type ModerationStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "flagged"
  | "suspended"
  | "removed"
  | "resolved";

export type ModerationPriority = "low" | "medium" | "high" | "urgent";

export type ModerationAction =
  | "approved"
  | "rejected"
  | "flagged"
  | "suspended"
  | "removed"
  | "resolved";

export type ModerationSortBy = "created_at" | "priority" | "status" | "updated_at";

// ============================================
// CORE MODERATION TYPES
// ============================================

export interface ModerationItem {
  id: string;
  target_type: ModerationTarget;
  target_id: string;
  status: ModerationStatus;
  priority: ModerationPriority;
  submitted_by: string;
  submitted_at: string;
  moderated_by?: string;
  moderated_at?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModerationItemWithDetails extends ModerationItem {
  target?: {
    name?: string;
    title?: string;
    description?: string;
    images?: string[];
    seller_id?: string;
    store_id?: string;
    user_id?: string;
  };
  submitter?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  moderator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ModerationQueue {
  pending: number;
  in_review: number;
  resolved: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  items: ModerationItem[];
}

export interface ModerationStats {
  total_reviewed: number;
  approved: number;
  rejected: number;
  flagged: number;
  suspended: number;
  removed: number;
  pending: number;
  in_review: number;
  response_time_avg: number;
  resolution_rate: number;
  today_pending: number;
  this_week_pending: number;
}

export interface ModerationHistoryEntry {
  id: string;
  moderator_id: string;
  moderator_name: string;
  moderator_email: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// STORE REVIEW TYPES
// ============================================

export interface StoreReviewDetails {
  store: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    tagline?: string;
    logo_url?: string;
    banner_url?: string;
    cover_image_url?: string;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
    support_hours?: string;
    social_links: Record<string, string>;
    type: string;
    category: string;
    status: string;
    is_approved: boolean;
    is_active: boolean;
    created_at: string;
    seller_id: string;
  };
  seller: {
    id: string;
    user_id: string;
    legal_business_name: string;
    trading_name?: string;
    business_type: string;
    country: string;
    verification_status: string;
    rating: number;
    total_reviews: number;
    total_orders: number;
    total_products: number;
    total_stores: number;
    email: string;
    full_name: string;
    phone?: string;
    user_joined_at: string;
  };
  products_count: number;
  reviews_count: number;
  orders_count: number;
  review_history: ModerationHistoryEntry[];
}

export interface ProductReviewDetails {
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    price: number;
    images: string[];
    category: string;
    store_id: string;
    status: string;
    is_active: boolean;
    created_at: string;
    store_name?: string;
    store_slug?: string;
    seller_name?: string;
  };
  store: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    id: string;
    business_name: string;
  };
  stats: {
    views: number;
    wishlist_count: number;
    order_count: number;
    average_rating: number;
    total_reviews: number;
  };
}

// ============================================
// PENDING / ALL STORE
// ============================================

export interface PendingStoreItem {
  id: string;
  target_type: ModerationTarget;
  target_id: string;
  status: ModerationStatus;
  priority: ModerationPriority;
  submitted_by: string;
  submitted_at: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  store: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    banner_url?: string;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
    social_links: Record<string, string>;
    is_active: boolean;
    is_approved: boolean;
    created_at: string;
    seller_id: string;
  };
  seller: {
    id: string;
    business_name: string;
    business_type: string;
    country: string;
    verification_status: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
}

// ============================================
// PENDING / ALL SELLER (KYC review)
// ============================================

export interface PendingSellerItem {
  /** Moderation queue row id */
  id: string;

  /** Queue priority */
  priority: string;

  /** Queue status */
  status: string;

  /** When the seller submitted for review */
  submitted_at: string;

  seller: {
    // ---- Identity ----
    id: string;
    user_id: string;

    // ---- Business ----
    legal_business_name: string;
    trading_name?: string;
    business_type: BusinessType;
    tax_id?: string;
    registration_number?: string;

    // ---- Address ----
    country: string;
    state?: string;
    city?: string;
    business_address?: string;
    business_phone?: string;

    // ---- Status ----
    verification_status: DocumentVerificationStatus | "suspended";
    status: string;

    // ---- KYC documents ----
    kyc_documents: DocumentReference[];

    // ---- Payout (read-only for moderators) ----
    payout_method: string;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_routing_number?: string;
    bank_name?: string;
    bank_country?: string;
    paypal_email?: string;
    mpesa_phone?: string;

    // ---- Joined user record ----
    user: {
      id: string;
      full_name: string;
      email: string;
      phone?: string;
    };

    // ---- Timestamps ----
    created_at?: string;
    updated_at?: string;
  };
}

// ============================================
// STORE STATS
// ============================================

export interface StoreStats {
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
// BULK / DASHBOARD
// ============================================

export interface BulkModerationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: { id: string; error: string }[];
}

export interface ModerationDashboardData {
  stats: ModerationStats;
  queue: ModerationQueue;
  recent_activity: ModerationHistoryEntry[];
  performance: {
    reviews_today: number;
    reviews_this_week: number;
    avg_response_time: number;
    approval_rate: number;
  };
  alerts: {
    type: "info" | "warning" | "error";
    message: string;
    action?: { label: string; url: string };
  }[];
}

export interface ModerationFilters {
  target_type?: ModerationTarget;
  status?: ModerationStatus;
  priority?: ModerationPriority;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: ModerationSortBy;
  sortOrder?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
}

// ============================================
// STATE
// ============================================

interface ModeratorState {
  // Queue
  queue: ModerationItem[];
  queueSummary: ModerationQueue | null;
  selectedItem: ModerationItemWithDetails | null;

  // Pending
  pendingStores: PendingStoreItem[];
  allStores: PendingStoreItem[];
  pendingSellers: PendingSellerItem[];
  allSellers: PendingSellerItem[]; // <-- NEW: all sellers (any status)

  // Details
  storeReview: StoreReviewDetails | null;
  productReview: ProductReviewDetails | null;

  // Store stats
  storeStats: StoreStats | null;

  // History & Stats
  history: ModerationHistoryEntry[];
  stats: ModerationStats | null;
  dashboard: ModerationDashboardData | null;

  // Bulk
  bulkResult: BulkModerationResult | null;

  // UI State
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  message: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
}

const initialState: ModeratorState = {
  queue: [],
  queueSummary: null,
  selectedItem: null,
  pendingStores: [],
  allStores: [],
  pendingSellers: [],
  allSellers: [],
  storeReview: null,
  productReview: null,
  storeStats: null,
  history: [],
  stats: null,
  dashboard: null,
  bulkResult: null,
  isLoading: false,
  isMutating: false,
  error: null,
  message: null,
  pagination: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

// ---------- Dashboard ----------

export const getDashboardThunk = createAsyncThunk(
  "moderator/getDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: ModerationDashboardData;
      }>("/moderator/dashboard");
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load dashboard."
      );
    }
  }
);

// ---------- Pending Stores ----------

export const getPendingStoresThunk = createAsyncThunk(
  "moderator/getPendingStores",
  async (
    params: { page?: number; limit?: number; search?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const q = new URLSearchParams();
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      if (params.search) q.append("search", params.search);

      const { data } = await api.get<{
        success: boolean;
        data: PendingStoreItem[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/stores/pending?${q.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load pending stores."
      );
    }
  }
);

// ---------- ALL Stores ----------
//
// Fetches every store regardless of status. Optional `status` filter.

export const getAllStoresThunk = createAsyncThunk(
  "moderator/getAllStores",
  async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const q = new URLSearchParams();
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      if (params.search) q.append("search", params.search);
      if (params.status) q.append("status", params.status);

      const { data } = await api.get<{
        success: boolean;
        data: PendingStoreItem[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/stores?${q.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load stores."
      );
    }
  }
);

// ---------- Store Stats ----------

export const getStoreStatsThunk = createAsyncThunk(
  "moderator/getStoreStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: StoreStats;
      }>("/moderator/stores/stats");
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load store stats."
      );
    }
  }
);

// ---------- Pending Sellers ----------

export const getPendingSellersThunk = createAsyncThunk(
  "moderator/getPendingSellers",
  async (
    params: { page?: number; limit?: number; search?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const q = new URLSearchParams();
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      if (params.search) q.append("search", params.search);

      const { data } = await api.get<{
        success: boolean;
        data: PendingSellerItem[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/sellers/pending?${q.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load pending sellers."
      );
    }
  }
);

// ---------- ALL Sellers (NEW) ----------
//
// Fetches every seller regardless of status. Optional `status` filter.

export const getAllSellersThunk = createAsyncThunk(
  "moderator/getAllSellers",
  async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const q = new URLSearchParams();
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));
      if (params.search) q.append("search", params.search);
      if (params.status) q.append("status", params.status);

      const { data } = await api.get<{
        success: boolean;
        data: PendingSellerItem[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/sellers?${q.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load sellers."
      );
    }
  }
);

// ---------- Queue ----------

export const getQueueThunk = createAsyncThunk(
  "moderator/getQueue",
  async (filters: ModerationFilters = {}, { rejectWithValue }) => {
    try {
      const p = new URLSearchParams();
      if (filters.target_type) p.append("target_type", filters.target_type);
      if (filters.status) p.append("status", filters.status);
      if (filters.priority) p.append("priority", filters.priority);
      if (filters.search) p.append("search", filters.search);
      if (filters.page) p.append("page", String(filters.page));
      if (filters.limit) p.append("limit", String(filters.limit));
      if (filters.sortBy) p.append("sortBy", filters.sortBy);
      if (filters.sortOrder) p.append("sortOrder", filters.sortOrder);
      if (filters.date_from) p.append("date_from", filters.date_from);
      if (filters.date_to) p.append("date_to", filters.date_to);

      const { data } = await api.get<{
        success: boolean;
        data: ModerationItem[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/queue?${p.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load queue."
      );
    }
  }
);

export const getQueueSummaryThunk = createAsyncThunk(
  "moderator/getQueueSummary",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: ModerationQueue;
      }>("/moderator/queue/summary");
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load queue summary."
      );
    }
  }
);

export const getModerationItemThunk = createAsyncThunk(
  "moderator/getItem",
  async (itemId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: ModerationItemWithDetails;
      }>(`/moderator/queue/${itemId}`);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load item."
      );
    }
  }
);

export const updatePriorityThunk = createAsyncThunk(
  "moderator/updatePriority",
  async (
    { itemId, priority }: { itemId: string; priority: ModerationPriority },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.patch<{
        success: boolean;
        data: ModerationItem;
      }>(`/moderator/queue/${itemId}/priority`, { priority });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to update priority."
      );
    }
  }
);

export const assignModeratorThunk = createAsyncThunk(
  "moderator/assignModerator",
  async (itemId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{
        success: boolean;
        data: ModerationItem;
      }>(`/moderator/queue/${itemId}/assign`);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to assign moderator."
      );
    }
  }
);

// ---------- Store Review ----------

export const getStoreForReviewThunk = createAsyncThunk(
  "moderator/getStoreReview",
  async (storeId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: StoreReviewDetails;
      }>(`/moderator/stores/${storeId}`);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load store details."
      );
    }
  }
);

export const reviewStoreThunk = createAsyncThunk(
  "moderator/reviewStore",
  async (
    {
      storeId,
      approved,
      rejection_reason,
      notes,
    }: {
      storeId: string;
      approved: boolean;
      rejection_reason?: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.put<{
        success: boolean;
        message: string;
        data: unknown;
      }>(`/moderator/stores/${storeId}/review`, {
        approved,
        rejection_reason,
        notes,
      });
      return { storeId, approved, message: data.message, store: data.data };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to review store."
      );
    }
  }
);

// ---------- Product Review ----------

export const getProductForReviewThunk = createAsyncThunk(
  "moderator/getProductReview",
  async (productId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: ProductReviewDetails;
      }>(`/moderator/products/${productId}`);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load product details."
      );
    }
  }
);

export const reviewProductThunk = createAsyncThunk(
  "moderator/reviewProduct",
  async (
    {
      productId,
      approved,
      rejection_reason,
      notes,
    }: {
      productId: string;
      approved: boolean;
      rejection_reason?: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.put<{ success: boolean; message: string }>(
        `/moderator/products/${productId}/review`,
        { approved, rejection_reason, notes }
      );
      return { productId, approved, message: data.message };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to review product."
      );
    }
  }
);

// ---------- Seller Verification (whole-seller override) ----------

export const verifySellerThunk = createAsyncThunk(
  "moderator/verifySeller",
  async (
    {
      sellerId,
      verified,
      reason,
    }: { sellerId: string; verified: boolean; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.put<{ success: boolean; message: string }>(
        `/moderator/sellers/${sellerId}/verify`,
        { verified, reason }
      );
      return { sellerId, verified, message: data.message };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to verify seller."
      );
    }
  }
);

// ---------- Seller Document Verification (per-document) ----------

export const verifySellerDocumentThunk = createAsyncThunk(
  "moderator/verifySellerDocument",
  async (
    {
      sellerId,
      documentType,
      verification_status,
      rejection_reason,
    }: {
      sellerId: string;
      documentType: KycDocumentType;
      verification_status: "verified" | "rejected";
      rejection_reason?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.patch<{
        success: boolean;
        message: string;
        data: { document: DocumentReference; sellerFullyVerified: boolean };
      }>(
        `/sellers/admin/sellers/${sellerId}/documents/${documentType}/verify`,
        { verification_status, rejection_reason }
      );
      return {
        sellerId,
        documentType,
        verification_status,
        document: data.data.document,
        sellerFullyVerified: data.data.sellerFullyVerified,
        message: data.message,
      };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to verify document."
      );
    }
  }
);

// ---------- Content Moderation ----------

export const moderateContentThunk = createAsyncThunk(
  "moderator/moderateContent",
  async (
    {
      contentId,
      action,
      reason,
    }: {
      contentId: string;
      action: "approve" | "remove" | "flag";
      reason?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.put<{ success: boolean; message: string }>(
        `/moderator/content/${contentId}`,
        { action, reason }
      );
      return { contentId, action, message: data.message };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to moderate content."
      );
    }
  }
);

// ---------- Reporting ----------

export const reportContentThunk = createAsyncThunk(
  "moderator/reportContent",
  async (
    {
      target_type,
      target_id,
      priority,
      notes,
      metadata,
    }: {
      target_type: string;
      target_id: string;
      priority?: ModerationPriority;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<{
        success: boolean;
        data: ModerationItem;
      }>("/moderator/report", {
        target_type,
        target_id,
        priority,
        notes,
        metadata,
      });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to report content."
      );
    }
  }
);

// ---------- Bulk Moderation ----------

export const bulkModerateThunk = createAsyncThunk(
  "moderator/bulkModerate",
  async (
    {
      target_type,
      target_ids,
      action,
      notes,
    }: {
      target_type: string;
      target_ids: string[];
      action: ModerationAction;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<{
        success: boolean;
        data: BulkModerationResult;
      }>("/moderator/bulk", { target_type, target_ids, action, notes });
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to perform bulk moderation."
      );
    }
  }
);

// ---------- History & Stats ----------

export const getHistoryThunk = createAsyncThunk(
  "moderator/getHistory",
  async (
    params: {
      moderator_id?: string;
      target_type?: string;
      action?: string;
      page?: number;
      limit?: number;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const q = new URLSearchParams();
      if (params.moderator_id) q.append("moderator_id", params.moderator_id);
      if (params.target_type) q.append("target_type", params.target_type);
      if (params.action) q.append("action", params.action);
      if (params.page) q.append("page", String(params.page));
      if (params.limit) q.append("limit", String(params.limit));

      const { data } = await api.get<{
        success: boolean;
        data: ModerationHistoryEntry[];
        pagination: ModeratorState["pagination"];
      }>(`/moderator/history?${q.toString()}`);

      return { items: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load history."
      );
    }
  }
);

export const getStatsThunk = createAsyncThunk(
  "moderator/getStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        success: boolean;
        data: ModerationStats;
      }>("/moderator/stats");
      return data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to load stats."
      );
    }
  }
);

// ============================================
// SLICE
// ============================================

const moderatorSlice = createSlice({
  name: "moderator",
  initialState,
  reducers: {
    clearModeratorError(state) {
      state.error = null;
    },
    clearModeratorMessage(state) {
      state.message = null;
    },
    clearModeratorState(state) {
      Object.assign(state, initialState);
    },
    resetModeratorState: () => initialState,
    setSelectedItem(
      state,
      action: PayloadAction<ModerationItemWithDetails | null>
    ) {
      state.selectedItem = action.payload;
    },
    clearBulkResult(state) {
      state.bulkResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== Dashboard =====
      .addCase(getDashboardThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDashboardThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard = action.payload;
        state.stats = action.payload.stats;
        state.queueSummary = action.payload.queue;
        state.history = action.payload.recent_activity;
      })
      .addCase(getDashboardThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== Pending Stores =====
      .addCase(getPendingStoresThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPendingStoresThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingStores = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(getPendingStoresThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== ALL Stores =====
      .addCase(getAllStoresThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllStoresThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allStores = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(getAllStoresThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== Store Stats =====
      .addCase(getStoreStatsThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(getStoreStatsThunk.fulfilled, (state, action) => {
        state.storeStats = action.payload;
      })
      .addCase(getStoreStatsThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // ===== Pending Sellers =====
      .addCase(getPendingSellersThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPendingSellersThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingSellers = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(getPendingSellersThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== ALL Sellers (NEW) =====
      .addCase(getAllSellersThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllSellersThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allSellers = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(getAllSellersThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== Queue =====
      .addCase(getQueueThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getQueueThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queue = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(getQueueThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(getQueueSummaryThunk.fulfilled, (state, action) => {
        state.queueSummary = action.payload;
      })

      .addCase(getModerationItemThunk.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
      })

      .addCase(updatePriorityThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.queue.findIndex((i) => i.id === updated.id);
        if (idx !== -1) state.queue[idx] = updated;
        if (state.selectedItem?.id === updated.id) {
          state.selectedItem = { ...state.selectedItem, ...updated };
        }
        state.message = "Priority updated.";
      })

      .addCase(assignModeratorThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.queue.findIndex((i) => i.id === updated.id);
        if (idx !== -1) state.queue[idx] = updated;
        if (state.selectedItem?.id === updated.id) {
          state.selectedItem = { ...state.selectedItem, ...updated };
        }
        state.message = "Moderator assigned.";
      })

      // ===== Store Review =====
      .addCase(getStoreForReviewThunk.fulfilled, (state, action) => {
        state.storeReview = action.payload;
      })

      .addCase(reviewStoreThunk.fulfilled, (state, action) => {
        const { storeId, approved, message } = action.payload;

        state.isMutating = false;
        state.message = message;

        // Remove from queue + pendingStores (decision made, no longer pending)
        state.queue = state.queue.filter((i) => i.target_id !== storeId);
        state.pendingStores = state.pendingStores.filter(
          (i) => i.target_id !== storeId
        );

        // Update in place in allStores so the store remains visible with new status
        const idx = state.allStores.findIndex(
          (i) => i.target_id === storeId || i.store.id === storeId
        );
        if (idx !== -1) {
          const prev = state.allStores[idx];
          state.allStores[idx] = {
            ...prev,
            status: approved ? "approved" : "rejected",
            store: {
              ...prev.store,
              is_approved: approved,
              is_active: approved ? true : prev.store.is_active,
            },
            notes: approved
              ? prev.notes
              : action.payload.store
              ? (action.payload.store as any)?.rejection_reason ?? prev.notes
              : prev.notes,
          };
        }

        // Update storeReview snapshot if it's the same store
        if (state.storeReview && state.storeReview.store.id === storeId) {
          state.storeReview.store.is_approved = approved;
          state.storeReview.store.status = approved ? "active" : "rejected";
        }

        // Optimistically bump storeStats counters
        if (state.storeStats) {
          if (approved) {
            state.storeStats.approved += 1;
            state.storeStats.pending = Math.max(
              0,
              state.storeStats.pending - 1
            );
          } else {
            state.storeStats.rejected += 1;
            state.storeStats.pending = Math.max(
              0,
              state.storeStats.pending - 1
            );
          }
        }
      })

      // ===== Product Review =====
      .addCase(getProductForReviewThunk.fulfilled, (state, action) => {
        state.productReview = action.payload;
      })

      .addCase(reviewProductThunk.fulfilled, (state, action) => {
        state.message = action.payload.message;
        state.queue = state.queue.filter(
          (i) => i.target_id !== action.payload.productId
        );
      })

      // ===== Seller Verification (whole-seller) =====
      .addCase(verifySellerThunk.fulfilled, (state, action) => {
        const { sellerId, verified, message } = action.payload;
        state.message = message;

        // Remove from pending list — decision made
        state.pendingSellers = state.pendingSellers.filter(
          (i) => i.seller.id !== sellerId
        );

        // Update in place in allSellers so the seller stays visible with
        // the new verification_status
        const idx = state.allSellers.findIndex((i) => i.seller.id === sellerId);
        if (idx !== -1) {
          const prev = state.allSellers[idx];
          state.allSellers[idx] = {
            ...prev,
            seller: {
              ...prev.seller,
              verification_status: verified ? "verified" : "rejected",
              status: verified ? "verified" : "rejected",
            },
          };
        }
      })

      // ===== Seller Document Verification =====
      .addCase(verifySellerDocumentThunk.fulfilled, (state, action) => {
        const { sellerId, documentType, document, sellerFullyVerified } =
          action.payload;

        // Update the doc in the pending list
        const target = state.pendingSellers.find((i) => i.seller.id === sellerId);
        if (target) {
          const idx = target.seller.kyc_documents.findIndex(
            (d) => d.type === documentType
          );
          if (idx !== -1) {
            target.seller.kyc_documents[idx] = document;
          }

          if (sellerFullyVerified) {
            target.seller.verification_status = "verified";
            target.seller.status = "verified";
          } else if (action.payload.verification_status === "rejected") {
            // Don't drop from list — seller needs to re-upload. Just mark.
            target.seller.verification_status = "rejected";
          }
        }

        // Also update the doc in allSellers
        const allTarget = state.allSellers.find((i) => i.seller.id === sellerId);
        if (allTarget) {
          const idx = allTarget.seller.kyc_documents.findIndex(
            (d) => d.type === documentType
          );
          if (idx !== -1) {
            allTarget.seller.kyc_documents[idx] = document;
          }
          if (sellerFullyVerified) {
            allTarget.seller.verification_status = "verified";
            allTarget.seller.status = "verified";
          } else if (action.payload.verification_status === "rejected") {
            allTarget.seller.verification_status = "rejected";
          }
        }

        state.message = action.payload.message;
      })

      // ===== Content Moderation =====
      .addCase(moderateContentThunk.fulfilled, (state, action) => {
        state.message = action.payload.message;
      })

      // ===== Reporting =====
      .addCase(reportContentThunk.fulfilled, (state, action) => {
        state.queue.unshift(action.payload);
        state.message = "Content reported.";
      })

      // ===== Bulk =====
      .addCase(bulkModerateThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
        state.bulkResult = null;
      })
      .addCase(bulkModerateThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.bulkResult = action.payload;
        state.message = `Processed ${action.payload.processed}, failed ${action.payload.failed}.`;
      })
      .addCase(bulkModerateThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== History & Stats =====
      .addCase(getHistoryThunk.fulfilled, (state, action) => {
        state.history = action.payload.items;
        state.pagination = action.payload.pagination;
      })

      .addCase(getStatsThunk.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const {
  clearModeratorError,
  clearModeratorMessage,
  clearModeratorState,
  resetModeratorState,
  setSelectedItem,
  clearBulkResult,
} = moderatorSlice.actions;

export default moderatorSlice.reducer;

// ============================================
// SELECTORS
// ============================================

type RootWithModerator = { moderator: ModeratorState };

export const selectModeratorQueue = (s: RootWithModerator) => s.moderator.queue;
export const selectModeratorQueueSummary = (s: RootWithModerator) =>
  s.moderator.queueSummary;
export const selectModeratorSelectedItem = (s: RootWithModerator) =>
  s.moderator.selectedItem;
export const selectModeratorPendingStores = (s: RootWithModerator) =>
  s.moderator.pendingStores;
export const selectModeratorAllStores = (s: RootWithModerator) =>
  s.moderator.allStores;
export const selectModeratorStoreStats = (s: RootWithModerator) =>
  s.moderator.storeStats;
export const selectModeratorPendingSellers = (s: RootWithModerator) =>
  s.moderator.pendingSellers;
export const selectModeratorAllSellers = (s: RootWithModerator) =>
  s.moderator.allSellers; // <-- NEW
export const selectModeratorStoreReview = (s: RootWithModerator) =>
  s.moderator.storeReview;
export const selectModeratorProductReview = (s: RootWithModerator) =>
  s.moderator.productReview;
export const selectModeratorHistory = (s: RootWithModerator) =>
  s.moderator.history;
export const selectModeratorStats = (s: RootWithModerator) => s.moderator.stats;
export const selectModeratorDashboard = (s: RootWithModerator) =>
  s.moderator.dashboard;
export const selectModeratorBulkResult = (s: RootWithModerator) =>
  s.moderator.bulkResult;
export const selectModeratorLoading = (s: RootWithModerator) =>
  s.moderator.isLoading;
export const selectModeratorMutating = (s: RootWithModerator) =>
  s.moderator.isMutating;
export const selectModeratorError = (s: RootWithModerator) => s.moderator.error;
export const selectModeratorMessage = (s: RootWithModerator) =>
  s.moderator.message;
export const selectModeratorPagination = (s: RootWithModerator) =>
  s.moderator.pagination;

// ---- Per-seller document helpers ----------------------------------------

export const selectPendingSellerById = (
  s: RootWithModerator,
  sellerId: string
) => s.moderator.pendingSellers.find((i) => i.seller.id === sellerId);

export const selectPendingSellerDocuments = (
  s: RootWithModerator,
  sellerId: string
) => {
  const item = selectPendingSellerById(s, sellerId);
  return item?.seller.kyc_documents ?? [];
};

export const selectPendingSellerDocumentByType = (
  s: RootWithModerator,
  sellerId: string,
  docType: KycDocumentType
) => {
  const item = selectPendingSellerById(s, sellerId);
  return item?.seller.kyc_documents.find((d) => d.type === docType);
};

// ---- Per-seller helpers (all sellers) -----------------------------------

export const selectAllSellerById = (
  s: RootWithModerator,
  sellerId: string
) => s.moderator.allSellers.find((i) => i.seller.id === sellerId);

export const selectAllSellerDocuments = (
  s: RootWithModerator,
  sellerId: string
) => {
  const item = selectAllSellerById(s, sellerId);
  return item?.seller.kyc_documents ?? [];
};