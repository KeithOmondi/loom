// src/store/slices/sellerSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import api from "../../api/api";

// ============================================
// TYPES — mirror backend enums as string unions
// ============================================

export type SellerStatus =
  | "pending"
  | "kyc_submitted"
  | "kyc_update_pending"
  | "verified"
  | "rejected"
  | "suspended"
  | "closed";

export type BusinessType =
  | "sole_proprietorship"
  | "llc"
  | "corporation"
  | "partnership"
  | "non_profit";

export type PayoutMethod = "bank" | "mpesa" | "paypal" | "stripe" | "crypto";

export type PayoutSchedule = "weekly" | "biweekly" | "monthly" | "daily";

export type SellerTier = "basic" | "pro" | "enterprise";

export type SellerSetupStep =
  | "none"
  | "basic_info"
  | "business_details"
  | "kyc_documents"
  | "payment_setup"
  | "complete";

export type DocumentVerificationStatus = "pending" | "verified" | "rejected";

export type KycDocumentType =
  | "business_registration"
  | "business_license"
  | "tax_certificate"
  | "id_front"
  | "id_back"
  | "selfie"
  | "proof_of_address"
  | "bank_statement";

export type NextStepAction = "upload_documents" | "configure_payout" | "create_store";
export type SetupNextStep = "upload_kyc" | "configure_payout" | "create_store" | "complete";

// ============================================
// INTERFACES
// ============================================

export interface DocumentReference {
  type: KycDocumentType;
  public_id: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  verification_status: DocumentVerificationStatus;
  verified_at?: string;
  rejection_reason?: string;
}

export interface SellerProfile {
  id: string;
  user_id: string;

  legal_business_name: string;
  trading_name: string;
  business_type: BusinessType;
  tax_id: string;
  registration_number: string;
  country: string;
  state: string;
  city: string;
  business_address: string;
  business_phone: string;

  status: SellerStatus;
  verification_status: DocumentVerificationStatus | "suspended";
  risk_score: number;
  kyc_expiry_date?: string;
  last_kyc_review_date?: string;
  kyc_documents: DocumentReference[];
  verified_at?: string;
  rejected_reason?: string;
  suspension_reason?: string;
  suspension_date?: string;

  payout_method: PayoutMethod;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_name?: string;
  bank_country?: string;
  paypal_email?: string;
  mpesa_phone?: string;
  stripe_connect_id?: string;

  commission_rate: number;
  custom_commission_rate?: number;
  payout_schedule: PayoutSchedule;
  minimum_payout: number;
  currency: string;
  hold_period_days: number;

  tier: SellerTier;
  max_stores_allowed: number;
  max_products_per_store: number;
  auto_approve_products: boolean;
  enable_negotiation: boolean;
  allow_backorders: boolean;
  allow_preorders: boolean;

  rating: number;
  total_reviews: number;
  total_orders: number;
  total_products: number;
  total_stores: number;
  fulfillment_rate: number;
  response_rate: number;
  response_time_hours?: number;
  cancellation_rate: number;
  dispute_rate: number;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  metadata?: Record<string, unknown>;
}

export interface SellerStatusCheck {
  status: SellerStatus;
  verification_status?: DocumentVerificationStatus | "suspended";
  is_active: boolean;
  can_create_stores: boolean;
  can_update_stores: boolean;
  has_pending_kyc_update: boolean;
  kyc_expired: boolean;
  current_store_count: number;
  max_stores_allowed: number;
  can_create_more_stores: boolean;
  block_reason?: string;
  actions_required?: string[];

  // Onboarding progress — mirrors backend SellerStatusCheck
  onboarding_step: SellerSetupStep;
  onboarding_complete: boolean;
  missing_fields: string[];
  missing_documents: KycDocumentType[];
}

export interface SellerSetupProgress {
  currentStep: SellerSetupStep;
  isComplete: boolean;
  missingFields: string[];
  requiredDocuments: KycDocumentType[];
  uploadedDocuments: KycDocumentType[];
  nextStepAction: NextStepAction;
}

// ============================================
// INPUTS
// ============================================

export interface CreateSellerInput {
  // All required for KYC
  legal_business_name: string;
  trading_name: string;
  business_type: BusinessType;
  tax_id: string;
  registration_number: string;
  country: string;
  state: string;
  city: string;
  business_address: string;
  business_phone: string;

  payout_method: PayoutMethod;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_name?: string;
  bank_country?: string;
  paypal_email?: string;
  mpesa_phone?: string;

  currency?: string;
  payout_schedule?: PayoutSchedule;
  minimum_payout?: number;
  hold_period_days?: number;

  // Legal consent — required by backend
  accepted_terms_version: string;
  accepted_privacy_version: string;
  ip_address?: string;
  user_agent?: string;
}

export interface UpdateSellerInput {
  legal_business_name?: string;
  trading_name?: string;
  business_type?: BusinessType;
  tax_id?: string;
  registration_number?: string;
  business_address?: string;
  business_phone?: string;

  country?: string;
  state?: string;
  city?: string;
  currency?: string;

  payout_method?: PayoutMethod;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_name?: string;
  bank_country?: string;
  paypal_email?: string;
  mpesa_phone?: string;

  auto_approve_products?: boolean;
  enable_negotiation?: boolean;
  allow_backorders?: boolean;
  allow_preorders?: boolean;
  payout_schedule?: PayoutSchedule;
  minimum_payout?: number;
  hold_period_days?: number;
}

export interface UploadKycDocumentPayload {
  document_type: KycDocumentType;
  file: File;
  /** optional override of file.name sent to backend */
  filename?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SellerSetupResponse {
  success: boolean;
  message: string;
  data: {
    seller: SellerProfile;
    progress: SellerSetupProgress;
    nextStep: SetupNextStep;
    actions: { label: string; route: string; priority: "high" | "medium" | "low" }[];
  };
}

export interface SellerProfileStatusResponse {
  success: boolean;
  data: SellerStatusCheck &
    SellerSetupProgress & {
      exists: boolean;
      seller?: SellerProfile;
      message?: string;
    };
}

export interface SellerProfileResponse {
  success: boolean;
  data: {
    seller: SellerProfile;
    status: SellerStatusCheck;
    progress: SellerSetupProgress;
  };
}

export interface SellerProgressResponse {
  success: boolean;
  data: {
    progress: SellerSetupProgress;
    status: SellerStatusCheck;
  };
}

export interface UpdateSellerResponse {
  success: boolean;
  message: string;
  data: {
    seller: SellerProfile;
    kycRequired: boolean;
    status: SellerStatusCheck;
  };
}

export interface StoreEligibilityResponse {
  success: boolean;
  data: {
    can_create_stores: boolean;
    can_update_stores: boolean;
    current_store_count: number;
    max_stores_allowed: number;
    block_reason?: string;
    actions_required?: string[];
    missing_fields: string[];
    missing_documents: KycDocumentType[];
  };
}

export interface SellerMetrics {
  seller_id: string;
  period: "today" | "week" | "month" | "year" | "all";
  total_revenue: number;
  revenue_by_currency: Record<string, number>;
  platform_fees: number;
  net_payout: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  refunded_orders: number;
  average_order_value: number;
  total_products: number;
  active_products: number;
  out_of_stock_products: number;
  total_stores: number;
  active_stores: number;
  average_rating: number;
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
}

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: { document: DocumentReference };
}

// ============================================
// STATE
// ============================================

interface SellerState {
  // Core data
  profile: SellerProfile | null;
  status: SellerStatusCheck | null;
  progress: SellerSetupProgress | null;
  metrics: SellerMetrics | null;

  // Store eligibility
  isStoreEligible: boolean;
  storeEligibility: StoreEligibilityResponse["data"] | null;

  // Loading / error
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  message: string | null;

  // KYC document upload state — keyed by KycDocumentType
  uploadingDocuments: Partial<Record<KycDocumentType, boolean>>;
  uploadingDocNames: Partial<Record<KycDocumentType, string>>;
  uploadErrors: Partial<Record<KycDocumentType, string>>;
}

const initialState: SellerState = {
  profile: null,
  status: null,
  progress: null,
  metrics: null,
  isStoreEligible: false,
  storeEligibility: null,
  isLoading: false,
  isMutating: false,
  error: null,
  message: null,
  uploadingDocuments: {},
  uploadingDocNames: {},
  uploadErrors: {},
};

// ============================================
// HELPERS
// ============================================

const serializeError = (err: unknown): string => {
  const e = err as {
    response?: { data?: { message?: string; errors?: string[] } };
    message?: string;
  };
  if (e?.response?.data?.errors?.length) {
    return e.response.data.errors.join(", ");
  }
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.message) return e.message;
  return "Something went wrong.";
};

// ============================================
// ASYNC THUNKS
// ============================================

// ---- STATUS / PROFILE -------------------------------------------------------

export const getSellerStatusThunk = createAsyncThunk(
  "seller/getStatus",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SellerProfileStatusResponse>(
        "/sellers/profile/status"
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

export const getSellerProfileThunk = createAsyncThunk(
  "seller/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SellerProfileResponse>("/sellers/profile");
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

export const getSellerProgressThunk = createAsyncThunk(
  "seller/getProgress",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SellerProgressResponse>(
        "/sellers/profile/progress"
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

// ---- CREATE / UPDATE --------------------------------------------------------

export const createSellerProfileThunk = createAsyncThunk(
  "seller/createProfile",
  async (input: CreateSellerInput, { rejectWithValue }) => {
    try {
      const { data } = await api.post<SellerSetupResponse>("/sellers/setup", input);
      return {
        seller: data.data.seller,
        progress: data.data.progress,
        nextStep: data.data.nextStep,
        actions: data.data.actions,
        message: data.message,
      };
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

export const updateSellerProfileThunk = createAsyncThunk(
  "seller/updateProfile",
  async (input: UpdateSellerInput, { rejectWithValue }) => {
    try {
      const { data } = await api.put<UpdateSellerResponse>("/sellers/profile", input);
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

// ---- STORE ELIGIBILITY / METRICS -------------------------------------------

export const checkStoreEligibilityThunk = createAsyncThunk(
  "seller/checkStoreEligibility",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StoreEligibilityResponse>(
        "/sellers/store-eligibility"
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

export const getSellerMetricsThunk = createAsyncThunk(
  "seller/getMetrics",
  async (
    period: "today" | "week" | "month" | "year" | "all" = "month",
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get<{ success: boolean; data: SellerMetrics }>(
        `/sellers/metrics?period=${period}`
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(serializeError(err));
    }
  }
);

// ---- KYC DOCUMENTS ----------------------------------------------------------

/**
 * Upload a single KYC document.
 *
 * Content-Type: multipart/form-data
 *   field "file"          → binary
 *   field "document_type" → KycDocumentType
 *   field "filename"      → optional override
 */
export const uploadKycDocumentThunk = createAsyncThunk<
  UploadDocumentResponse["data"],
  UploadKycDocumentPayload,
  { rejectValue: string }
>("seller/uploadKycDocument", async (payload, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("document_type", payload.document_type);
    formData.append("file", payload.file);
    formData.append("filename", payload.filename ?? payload.file.name);

    const { data } = await api.post<UploadDocumentResponse>(
      "/sellers/me/documents",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data.data;
  } catch (err) {
    return rejectWithValue(serializeError(err));
  }
});

export const deleteKycDocumentThunk = createAsyncThunk<
  { document_type: KycDocumentType },
  KycDocumentType,
  { rejectValue: string }
>("seller/deleteKycDocument", async (documentType, { rejectWithValue }) => {
  try {
    await api.delete(`/sellers/me/documents/${documentType}`);
    return { document_type: documentType };
  } catch (err) {
    return rejectWithValue(serializeError(err));
  }
});

// ============================================
// SLICE
// ============================================

const sellerSlice = createSlice({
  name: "seller",
  initialState,
  reducers: {
    clearSellerError(state) {
      state.error = null;
    },
    clearSellerMessage(state) {
      state.message = null;
    },
    clearUploadError(state, action: PayloadAction<KycDocumentType>) {
      delete state.uploadErrors[action.payload];
    },
    clearSellerState(state) {
      Object.assign(state, initialState);
    },
    resetSellerState: () => initialState,
  },
  extraReducers: (builder) => {
    builder

      // ===== GET STATUS =====
      .addCase(getSellerStatusThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSellerStatusThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const d = action.payload;
        state.status = {
          status: d.status,
          verification_status: d.verification_status,
          is_active: d.is_active,
          can_create_stores: d.can_create_stores,
          can_update_stores: d.can_update_stores,
          has_pending_kyc_update: d.has_pending_kyc_update,
          kyc_expired: d.kyc_expired,
          current_store_count: d.current_store_count,
          max_stores_allowed: d.max_stores_allowed,
          can_create_more_stores: d.can_create_more_stores,
          block_reason: d.block_reason,
          actions_required: d.actions_required,
          onboarding_step: d.onboarding_step ?? d.currentStep ?? "none",
          onboarding_complete: d.onboarding_complete ?? d.isComplete ?? false,
          missing_fields: d.missing_fields ?? d.missingFields ?? [],
          missing_documents: d.missing_documents ?? [],
        };
        state.progress = {
          currentStep: d.currentStep ?? d.onboarding_step ?? "none",
          isComplete: d.isComplete ?? d.onboarding_complete ?? false,
          missingFields: d.missingFields ?? d.missing_fields ?? [],
          requiredDocuments: d.requiredDocuments ?? [],
          uploadedDocuments: d.uploadedDocuments ?? [],
          nextStepAction: d.nextStepAction ?? "upload_documents",
        };
        if (d.seller) state.profile = d.seller;
        state.isStoreEligible = d.can_create_stores;
      })
      .addCase(getSellerStatusThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET PROFILE =====
      .addCase(getSellerProfileThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSellerProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload.seller;
        state.status = action.payload.status;
        state.progress = action.payload.progress;
        state.isStoreEligible = action.payload.status.can_create_stores;
      })
      .addCase(getSellerProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== GET PROGRESS =====
      .addCase(getSellerProgressThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSellerProgressThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.progress = action.payload.progress;
        state.status = action.payload.status;
        state.isStoreEligible = action.payload.status.can_create_stores;
      })
      .addCase(getSellerProgressThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== CREATE PROFILE =====
      .addCase(createSellerProfileThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createSellerProfileThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.profile = action.payload.seller;
        state.progress = action.payload.progress;
        state.message = action.payload.message;
        state.isStoreEligible = action.payload.progress.isComplete;
      })
      .addCase(createSellerProfileThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== UPDATE PROFILE =====
      .addCase(updateSellerProfileThunk.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateSellerProfileThunk.fulfilled, (state, action) => {
        state.isMutating = false;
        state.profile = action.payload.seller;
        state.status = action.payload.status;
        state.isStoreEligible = action.payload.status.can_create_stores;
        state.message = action.payload.kycRequired
          ? "Profile updated. KYC re-verification required."
          : "Profile updated successfully.";
      })
      .addCase(updateSellerProfileThunk.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })

      // ===== STORE ELIGIBILITY =====
      .addCase(checkStoreEligibilityThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkStoreEligibilityThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.storeEligibility = action.payload;
        state.isStoreEligible = action.payload.can_create_stores;
      })
      .addCase(checkStoreEligibilityThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== METRICS =====
      .addCase(getSellerMetricsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSellerMetricsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.metrics = action.payload;
      })
      .addCase(getSellerMetricsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // ===== UPLOAD KYC DOCUMENT =====
      .addCase(uploadKycDocumentThunk.pending, (state, action) => {
        const dt = action.meta.arg.document_type;
        state.uploadingDocuments[dt] = true;
        state.uploadingDocNames[dt] = action.meta.arg.file.name;
        delete state.uploadErrors[dt];
      })
      .addCase(uploadKycDocumentThunk.fulfilled, (state, action) => {
        const doc = action.payload.document;
        state.uploadingDocuments[doc.type] = false;
        delete state.uploadingDocNames[doc.type];

        // If profile is loaded, merge the new document into kyc_documents
        if (state.profile) {
          const existing = state.profile.kyc_documents ?? [];
          const withoutDup = existing.filter((d) => d.type !== doc.type);
          state.profile.kyc_documents = [...withoutDup, doc];
        }

        // Update progress.uploadedDocuments so the UI reflects it immediately
        if (state.progress) {
          const set = new Set(state.progress.uploadedDocuments);
          set.add(doc.type);
          state.progress.uploadedDocuments = Array.from(set);
        }

        state.message = "Document uploaded successfully.";
      })
      .addCase(uploadKycDocumentThunk.rejected, (state, action) => {
        const dt = action.meta.arg.document_type;
        state.uploadingDocuments[dt] = false;
        delete state.uploadingDocNames[dt];
        state.uploadErrors[dt] = (action.payload as string) ?? "Upload failed.";
        state.error = state.uploadErrors[dt] ?? null;
      })

      // ===== DELETE KYC DOCUMENT =====
      .addCase(deleteKycDocumentThunk.pending, (state, action) => {
        const dt = action.meta.arg;
        state.uploadingDocuments[dt] = true;
        delete state.uploadErrors[dt];
      })
      .addCase(deleteKycDocumentThunk.fulfilled, (state, action) => {
        const dt = action.payload.document_type;
        state.uploadingDocuments[dt] = false;

        if (state.profile) {
          state.profile.kyc_documents = (state.profile.kyc_documents ?? []).filter(
            (d) => d.type !== dt
          );
        }
        if (state.progress) {
          state.progress.uploadedDocuments = state.progress.uploadedDocuments.filter(
            (t) => t !== dt
          );
        }
        state.message = "Document deleted successfully.";
      })
      .addCase(deleteKycDocumentThunk.rejected, (state, action) => {
        const dt = action.meta.arg;
        state.uploadingDocuments[dt] = false;
        state.uploadErrors[dt] = (action.payload as string) ?? "Delete failed.";
        state.error = state.uploadErrors[dt] ?? null;
      });
  },
});

// ============================================
// ACTIONS
// ============================================

export const {
  clearSellerError,
  clearSellerMessage,
  clearUploadError,
  clearSellerState,
  resetSellerState,
} = sellerSlice.actions;

export default sellerSlice.reducer;

// ============================================
// SELECTORS
// ============================================

type RootWithSeller = { seller: SellerState };

export const selectSellerProfile = (s: RootWithSeller) => s.seller.profile;
export const selectSellerStatus = (s: RootWithSeller) => s.seller.status;
export const selectSellerProgress = (s: RootWithSeller) => s.seller.progress;
export const selectSellerLoading = (s: RootWithSeller) => s.seller.isLoading;
export const selectSellerMutating = (s: RootWithSeller) => s.seller.isMutating;
export const selectSellerError = (s: RootWithSeller) => s.seller.error;
export const selectSellerMessage = (s: RootWithSeller) => s.seller.message;
export const selectSellerMetrics = (s: RootWithSeller) => s.seller.metrics;
export const selectIsStoreEligible = (s: RootWithSeller) => s.seller.isStoreEligible;
export const selectStoreEligibility = (s: RootWithSeller) => s.seller.storeEligibility;

export const selectCanCreateStores = (s: RootWithSeller) =>
  s.seller.status?.can_create_stores ?? false;
export const selectCanUpdateStores = (s: RootWithSeller) =>
  s.seller.status?.can_update_stores ?? false;
export const selectSellerStatusBlockReason = (s: RootWithSeller) =>
  s.seller.status?.block_reason;
export const selectSellerActionsRequired = (s: RootWithSeller) =>
  s.seller.status?.actions_required ?? [];
export const selectSellerSetupComplete = (s: RootWithSeller) =>
  s.seller.progress?.isComplete ?? false;
export const selectSellerCurrentStep = (s: RootWithSeller) =>
  s.seller.progress?.currentStep ?? "none";
export const selectSellerMissingFields = (s: RootWithSeller) =>
  s.seller.progress?.missingFields ?? [];
export const selectSellerNextStepAction = (s: RootWithSeller) =>
  s.seller.progress?.nextStepAction ?? "upload_documents";

// ----- KYC-specific selectors -------------------------------------------------

export const selectKycDocuments = (s: RootWithSeller) =>
  s.seller.profile?.kyc_documents ?? [];

export const selectKycDocumentByType = (
  s: RootWithSeller,
  type: KycDocumentType
): DocumentReference | undefined =>
  s.seller.profile?.kyc_documents?.find((d) => d.type === type);

export const selectRequiredDocuments = (s: RootWithSeller) =>
  s.seller.progress?.requiredDocuments ?? [];

export const selectUploadedDocuments = (s: RootWithSeller) =>
  s.seller.progress?.uploadedDocuments ?? [];

export const selectMissingDocuments = (s: RootWithSeller) =>
  s.seller.status?.missing_documents ?? [];

export const selectIsUploadingDocument = (s: RootWithSeller, type: KycDocumentType) =>
  s.seller.uploadingDocuments[type] ?? false;

export const selectUploadErrorFor = (s: RootWithSeller, type: KycDocumentType) =>
  s.seller.uploadErrors[type];

export const selectAllUploadErrors = (s: RootWithSeller) => s.seller.uploadErrors;

export const selectKycProgress = (s: RootWithSeller) => {
  const required = s.seller.progress?.requiredDocuments ?? [];
  const uploaded = s.seller.progress?.uploadedDocuments ?? [];
  const total = required.length;
  const done = required.filter((t) => uploaded.includes(t)).length;
  return { total, done, percent: total === 0 ? 100 : Math.round((done / total) * 100) };
};