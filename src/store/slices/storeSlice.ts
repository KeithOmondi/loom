// src/store/slices/storeSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/api';

// ============================================
// TYPES (Using string unions instead of enums for erasableSyntaxOnly)
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
  // ✅ FIX: this file defined its own separate copy of StoreProfile
  // (duplicated from storeApi.ts) and had the same bug there — the API
  // returns a nested status object here (matches StoreStatusCheck,
  // defined just above), not the bare StoreStatus string enum.
  status: StoreStatusCheck;
  currency: string;
  language: string;
  return_policy?: ReturnPolicy;
  shipping_origin?: ShippingOrigin;
  
  // ✅ New lifecycle fields (no more approval fields)
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

export interface StoreWithSellerResponse {
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
// API RESPONSE TYPES
// ============================================

export interface StoreResponse {
  success: boolean;
  message: string;
  data: {
    store: StoreProfile;
    nextSteps?: string[];
  };
}

export interface StoresListResponse {
  success: boolean;
  data: StoreProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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
// STATE
// ============================================

interface StoreState {
  stores: StoreProfile[];
  currentStore: StoreProfile | null;
  currentStoreStatus: StoreStatusCheck | null;
  onboardingProgress: StoreOnboardingProgress | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  message: string | null;
  metrics: StoreMetrics | null;
  storeEligibility: {
    can_create_stores: boolean;
    can_update_stores: boolean;
    block_reason?: string;
    actions_required?: string[];
  } | null;
}

const initialState: StoreState = {
  stores: [],
  currentStore: null,
  currentStoreStatus: null,
  onboardingProgress: null,
  isLoading: false,
  isMutating: false,
  error: null,
  message: null,
  metrics: null,
  storeEligibility: null,
};

// ============================================
// ASYNC THUNKS
// ============================================

/**
 * Get store status (gatekeeper for operations)
 */
export const getStoreStatusThunk = createAsyncThunk(
  'store/getStatus',
  async (storeId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StoreStatusResponse>(
        `/stores/${storeId}/status`
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to get store status.');
    }
  }
);

/**
 * Get all stores for current seller
 */
export const getMyStoresThunk = createAsyncThunk(
  'store/getMyStores',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ success: boolean; data: StoreProfile[] }>(
        '/stores/my/stores'
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to get stores.');
    }
  }
);

/**
 * Get store by ID (public)
 */
export const getStoreByIdThunk = createAsyncThunk(
  'store/getById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ success: boolean; data: StoreWithSellerResponse }>(
        `/stores/${id}`
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to get store.');
    }
  }
);

/**
 * Get store by slug (public)
 */
export const getStoreBySlugThunk = createAsyncThunk(
  'store/getBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ success: boolean; data: StoreWithSellerResponse }>(
        `/stores/slug/${slug}`
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Store not found.');
    }
  }
);

/**
 * Get store onboarding progress
 */
export const getStoreOnboardingThunk = createAsyncThunk(
  'store/getOnboarding',
  async (storeId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StoreOnboardingResponse>(
        `/stores/${storeId}/onboarding`
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to get onboarding progress.');
    }
  }
);

/**
 * Create store (instant activation)
 */
export const createStoreThunk = createAsyncThunk(
  'store/create',
  async (input: CreateStoreInput, { rejectWithValue }) => {
    try {
      const { data } = await api.post<StoreResponse>('/stores', input);
      return {
        store: data.data.store,
        nextSteps: data.data.nextSteps,
        message: data.message,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to create store.');
    }
  }
);

/**
 * Update store
 */
export const updateStoreThunk = createAsyncThunk(
  'store/update',
  async ({ id, data }: { id: string; data: UpdateStoreInput }, { rejectWithValue }) => {
    try {
      const { data: response } = await api.put<StoreResponse>(
        `/stores/${id}`,
        data
      );
      return response.data.store;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to update store.');
    }
  }
);

/**
 * Close store (seller)
 */
export const closeStoreThunk = createAsyncThunk(
  'store/close',
  async (
    { storeId, reason }: { storeId: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<StoreResponse>(
        `/stores/${storeId}/close`,
        { reason }
      );
      return data.data.store;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to close store.');
    }
  }
);

/**
 * Delete store (soft delete)
 */
export const deleteStoreThunk = createAsyncThunk(
  'store/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/stores/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to delete store.');
    }
  }
);

/**
 * Get store metrics (dashboard)
 */
export const getStoreMetricsThunk = createAsyncThunk(
  'store/getMetrics',
  async (
    { storeId, period }: { storeId: string; period?: 'today' | 'week' | 'month' | 'year' | 'all' },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get<StoreMetricsResponse>(
        `/stores/${storeId}/metrics?period=${period || 'month'}`
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Failed to get store metrics.');
    }
  }
);

// ============================================
// SLICE
// ============================================

const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {
    clearStoreError(state) {
      state.error = null;
    },
    clearStoreMessage(state) {
      state.message = null;
    },
    clearStoreState(state) {
      state.stores = [];
      state.currentStore = null;
      state.currentStoreStatus = null;
      state.onboardingProgress = null;
      state.isLoading = false;
      state.isMutating = false;
      state.error = null;
      state.message = null;
      state.metrics = null;
      state.storeEligibility = null;
    },
    setCurrentStore(state, action: PayloadAction<StoreProfile>) {
      state.currentStore = action.payload;
    },
    clearCurrentStore(state) {
      state.currentStore = null;
    },
    resetStoreState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ===== GET STORE STATUS =====
      .addCase(getStoreStatusThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStoreStatusThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStoreStatus = action.payload;
      })
      .addCase(getStoreStatusThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET MY STORES =====
      .addCase(getMyStoresThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyStoresThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stores = action.payload;
        if (action.payload.length > 0 && !state.currentStore) {
          state.currentStore = action.payload[0];
        }
      })
      .addCase(getMyStoresThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET STORE BY ID =====
      .addCase(getStoreByIdThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStoreByIdThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStore = action.payload.store;
      })
      .addCase(getStoreByIdThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET STORE BY SLUG =====
      .addCase(getStoreBySlugThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStoreBySlugThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStore = action.payload.store;
      })
      .addCase(getStoreBySlugThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET ONBOARDING =====
      .addCase(getStoreOnboardingThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStoreOnboardingThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.onboardingProgress = action.payload;
      })
      .addCase(getStoreOnboardingThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== CREATE STORE =====
      .addCase(createStoreThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createStoreThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.stores.push(action.payload.store);
        state.currentStore = action.payload.store;
        // ✅ Updated message — store is live immediately
        state.message = action.payload.message || 'Store created successfully! You can now start selling.';
      })
      .addCase(createStoreThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== UPDATE STORE =====
      .addCase(updateStoreThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateStoreThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        const index = state.stores.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.stores[index] = action.payload;
        }
        state.currentStore = action.payload;
        state.message = 'Store updated successfully.';
      })
      .addCase(updateStoreThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== CLOSE STORE =====
      .addCase(closeStoreThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(closeStoreThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        const index = state.stores.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.stores[index] = action.payload;
        }
        state.currentStore = action.payload;
        state.message = 'Store closed successfully.';
      })
      .addCase(closeStoreThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== DELETE STORE =====
      .addCase(deleteStoreThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(deleteStoreThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.stores = state.stores.filter((s) => s.id !== action.payload);
        if (state.currentStore?.id === action.payload) {
          state.currentStore = state.stores[0] || null;
        }
        state.message = 'Store deleted successfully.';
      })
      .addCase(deleteStoreThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== GET STORE METRICS =====
      .addCase(getStoreMetricsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStoreMetricsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.metrics = action.payload;
      })
      .addCase(getStoreMetricsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearStoreError,
  clearStoreMessage,
  clearStoreState,
  setCurrentStore,
  clearCurrentStore,
  resetStoreState,
} = storeSlice.actions;

export default storeSlice.reducer;

// ============================================
// SELECTORS
// ============================================

export const selectAllStores = (state: { store: StoreState }) => state.store.stores;
export const selectCurrentStore = (state: { store: StoreState }) => state.store.currentStore;
export const selectCurrentStoreStatus = (state: { store: StoreState }) => state.store.currentStoreStatus;
export const selectStoreOnboarding = (state: { store: StoreState }) => state.store.onboardingProgress;
export const selectStoreLoading = (state: { store: StoreState }) => state.store.isLoading;
export const selectStoreMutating = (state: { store: StoreState }) => state.store.isMutating;
export const selectStoreError = (state: { store: StoreState }) => state.store.error;
export const selectStoreMessage = (state: { store: StoreState }) => state.store.message;
export const selectStoreMetrics = (state: { store: StoreState }) => state.store.metrics;
export const selectStoreEligibility = (state: { store: StoreState }) => state.store.storeEligibility;
export const selectCanEditStore = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.can_edit ?? false;
export const selectCanAddProducts = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.can_add_products ?? false;
export const selectCanProcessOrders = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.can_process_orders ?? false;
export const selectIsStoreLive = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.is_live ?? false;
export const selectStoreBlockReason = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.block_reason;
export const selectStoreActionsRequired = (state: { store: StoreState }) => 
  state.store.currentStoreStatus?.actions_required ?? [];
// ✅ FIX: currentStore.status is the nested StoreStatusCheck object, not
// a plain string — read the status code and is_live off it instead of
// comparing the whole object to 'active'.
export const selectIsStoreActive = (state: { store: StoreState }) => 
  state.store.currentStore?.status?.is_live === true;