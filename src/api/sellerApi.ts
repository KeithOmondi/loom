// src/store/api/sellerApi.ts

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ============================================
// TYPES — mirror backend
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

export type NextStepAction =
  | "upload_documents"
  | "configure_payout"
  | "create_store";
export type SetupNextStep =
  | "upload_kyc"
  | "configure_payout"
  | "create_store"
  | "complete";

// ============================================
// DOCUMENT / PROFILE
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

  // Onboarding
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

export interface UploadKycDocumentArgs {
  document_type: KycDocumentType;
  file: File;
  filename?: string;
}

export interface VerifyDocumentArgs {
  sellerId: string;
  documentType: KycDocumentType;
  verification_status: "verified" | "rejected";
  rejection_reason?: string;
}

// ============================================
// RESPONSES
// ============================================

export interface SellerSetupResponse {
  success: boolean;
  message: string;
  data: {
    seller: SellerProfile;
    progress: SellerSetupProgress;
    nextStep: SetupNextStep;
    actions: {
      label: string;
      route: string;
      priority: "high" | "medium" | "low";
    }[];
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

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: { document: DocumentReference };
}

export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
}

export interface VerifyDocumentResponse {
  success: boolean;
  message: string;
  data: {
    document: DocumentReference;
    sellerFullyVerified: boolean;
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




// ============================================
// API SLICE
// ============================================

export const sellerApi = createApi({
  reducerPath: "sellerApi",
  tagTypes: [
    "Seller",
    "SellerProfile",
    "SellerStatus",
    "SellerProgress",
    "SellerDocuments",
    "SellerMetrics",
    "StoreEligibility",
    "AdminSellerList",
    "AdminSellerDetail",
  ],
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    // ============================================================
    // SELLER — STATUS / PROFILE
    // ============================================================

    /**
     * GET /sellers/profile/status
     * Returns exists=false if the seller hasn't been created yet.
     */
    getSellerProfileStatus: builder.query<SellerProfileStatusResponse, void>({
      query: () => "/sellers/profile/status",
      providesTags: ["SellerStatus", "SellerProfile", "SellerProgress"],
    }),

    /**
     * GET /sellers/profile
     */
    getSellerProfile: builder.query<SellerProfileResponse, void>({
      query: () => "/sellers/profile",
      providesTags: [
        "Seller",
        "SellerProfile",
        "SellerStatus",
        "SellerProgress",
        "SellerDocuments",
      ],
    }),

    /**
     * GET /sellers/profile/progress
     */
    getSellerProgress: builder.query<SellerProgressResponse, void>({
      query: () => "/sellers/profile/progress",
      providesTags: ["SellerProgress", "SellerStatus"],
    }),

    // ============================================================
    // SELLER — SETUP / UPDATE
    // ============================================================

    /**
     * POST /sellers/setup
     */
    setupSellerProfile: builder.mutation<SellerSetupResponse, CreateSellerInput>({
      query: (data) => ({
        url: "/sellers/setup",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        "Seller",
        "SellerProfile",
        "SellerStatus",
        "SellerProgress",
        "StoreEligibility",
      ],
    }),

    /**
     * PUT /sellers/profile
     */
    updateSellerProfile: builder.mutation<
      UpdateSellerResponse,
      UpdateSellerInput
    >({
      query: (data) => ({
        url: "/sellers/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [
        "Seller",
        "SellerProfile",
        "SellerStatus",
        "SellerProgress",
        "StoreEligibility",
      ],
    }),

    // ============================================================
    // SELLER — KYC DOCUMENTS
    // ============================================================

    /**
     * POST /sellers/me/documents
     * Multipart upload. Content-Type is set automatically by the browser.
     */
    uploadKycDocument: builder.mutation<
      UploadDocumentResponse,
      UploadKycDocumentArgs
    >({
      query: ({ document_type, file, filename }) => {
        const formData = new FormData();
        formData.append("document_type", document_type);
        formData.append("file", file);
        formData.append("filename", filename ?? file.name);

        return {
          url: "/sellers/me/documents",
          method: "POST",
          body: formData,
          // Explicitly unset Content-Type so the browser sets the boundary
          headers: { "Content-Type": undefined as unknown as string },
        };
      },
      invalidatesTags: [
        "SellerProfile",
        "SellerDocuments",
        "SellerStatus",
        "SellerProgress",
        "StoreEligibility",
      ],
    }),

    /**
     * DELETE /sellers/me/documents/:documentType
     */
    deleteKycDocument: builder.mutation<
      DeleteDocumentResponse,
      KycDocumentType
    >({
      query: (documentType) => ({
        url: `/sellers/me/documents/${documentType}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "SellerProfile",
        "SellerDocuments",
        "SellerStatus",
        "SellerProgress",
        "StoreEligibility",
      ],
    }),

    /**
     * PATCH /admin/sellers/:sellerId/documents/:documentType/verify
     * Admin / moderator only.
     */
    verifyKycDocument: builder.mutation<
      VerifyDocumentResponse,
      VerifyDocumentArgs
    >({
      query: ({ sellerId, documentType, verification_status, rejection_reason }) => ({
        url: `/sellers/admin/sellers/${sellerId}/documents/${documentType}/verify`,
        method: "PATCH",
        body: { verification_status, rejection_reason },
      }),
      invalidatesTags: [
        "AdminSellerDetail",
        "AdminSellerList",
        "SellerDocuments",
        "SellerStatus",
      ],
    }),

    // ============================================================
    // SELLER — ELIGIBILITY & METRICS
    // ============================================================

    /**
     * GET /sellers/store-eligibility
     */
    checkStoreEligibility: builder.query<StoreEligibilityResponse, void>({
      query: () => "/sellers/store-eligibility",
      providesTags: ["StoreEligibility", "SellerStatus"],
    }),

    /**
     * GET /sellers/metrics?period=month
     */
    getSellerMetrics: builder.query<
      { success: boolean; data: SellerMetrics },
      { period?: "today" | "week" | "month" | "year" | "all" }
    >({
      query: ({ period = "month" }) => `/sellers/metrics?period=${period}`,
      providesTags: ["SellerMetrics"],
    }),

    // ============================================================
    // PUBLIC
    // ============================================================

    /**
     * GET /sellers/:sellerId  (public profile)
     */
    getPublicSellerProfile: builder.query<
      { success: boolean; data: Partial<SellerProfile> },
      string
    >({
      query: (sellerId) => `/sellers/${sellerId}`,
      providesTags: (_r, _e, id) => [{ type: "SellerProfile", id }],
    }),

    // ============================================================
    // ADMIN
    // ============================================================

    /**
     * GET /sellers/admin/sellers
     */
    adminListSellers: builder.query<
      {
        success: boolean;
        data: SellerProfile[];
        summary: {
          total: number;
          pending: number;
          verified: number;
          suspended: number;
          total_stores: number;
          total_revenue: number;
        };
        pagination: { page: number; limit: number; total: number; pages: number };
      },
      {
        page?: number;
        limit?: number;
        status?: SellerStatus | SellerStatus[];
        search?: string;
        sortBy?: "created_at" | "rating" | "total_orders" | "fulfillment_rate";
        sortOrder?: "asc" | "desc";
      }
    >({
      query: (params) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (Array.isArray(v)) v.forEach((x) => search.append(k, String(x)));
          else search.set(k, String(v));
        });
        const qs = search.toString();
        return `/sellers/admin/sellers${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["AdminSellerList"],
    }),

    /**
     * GET /sellers/admin/sellers/:sellerId
     */
    adminGetSeller: builder.query<
      {
        success: boolean;
        data: {
          seller: SellerProfile;
          status: SellerStatusCheck;
          metrics: SellerMetrics;
        };
      },
      string
    >({
      query: (sellerId) => `/sellers/admin/sellers/${sellerId}`,
      providesTags: (_r, _e, id) => [{ type: "AdminSellerDetail", id }],
    }),

    /**
     * PUT /sellers/admin/sellers/:sellerId/verify
     */
    adminVerifySeller: builder.mutation<
      { success: boolean; message: string; data: SellerProfile },
      {
        sellerId: string;
        status: "verified" | "rejected";
        reason?: string;
        reviewer_notes?: string;
        kyc_expiry_date?: string;
      }
    >({
      query: ({ sellerId, ...body }) => ({
        url: `/sellers/admin/sellers/${sellerId}/verify`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { sellerId }) => [
        { type: "AdminSellerDetail", id: sellerId },
        "AdminSellerList",
      ],
    }),

    /**
     * POST /sellers/admin/sellers/:sellerId/suspend
     */
    adminSuspendSeller: builder.mutation<
      { success: boolean; message: string; data: SellerProfile },
      {
        sellerId: string;
        reason: string;
        notes?: string;
        suspend_stores?: boolean;
        notify_seller?: boolean;
      }
    >({
      query: ({ sellerId, ...body }) => ({
        url: `/sellers/admin/sellers/${sellerId}/suspend`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { sellerId }) => [
        { type: "AdminSellerDetail", id: sellerId },
        "AdminSellerList",
      ],
    }),

    /**
     * POST /sellers/admin/sellers/:sellerId/reinstate
     */
    adminReinstateSeller: builder.mutation<
      { success: boolean; message: string; data: SellerProfile },
      {
        sellerId: string;
        reason?: string;
        notes?: string;
        reinstate_stores?: boolean;
        notify_seller?: boolean;
      }
    >({
      query: ({ sellerId, ...body }) => ({
        url: `/sellers/admin/sellers/${sellerId}/reinstate`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { sellerId }) => [
        { type: "AdminSellerDetail", id: sellerId },
        "AdminSellerList",
      ],
    }),

    /**
     * PUT /sellers/admin/sellers/:sellerId/tier
     */
    adminUpdateTier: builder.mutation<
      { success: boolean; message: string; data: SellerProfile },
      {
        sellerId: string;
        tier: SellerTier;
        reason: string;
        effective_from?: string;
        max_stores_allowed?: number;
        max_products_per_store?: number;
      }
    >({
      query: ({ sellerId, ...body }) => ({
        url: `/sellers/admin/sellers/${sellerId}/tier`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { sellerId }) => [
        { type: "AdminSellerDetail", id: sellerId },
        "AdminSellerList",
      ],
    }),
  }),
});

// ============================================
// HOOKS
// ============================================

export const {
  // Seller — read
  useGetSellerProfileStatusQuery,
  useGetSellerProfileQuery,
  useGetSellerProgressQuery,
  useCheckStoreEligibilityQuery,
  useGetSellerMetricsQuery,

  // Seller — write
  useSetupSellerProfileMutation,
  useUpdateSellerProfileMutation,

  // KYC documents
  useUploadKycDocumentMutation,
  useDeleteKycDocumentMutation,
  useVerifyKycDocumentMutation,

  // Public
  useGetPublicSellerProfileQuery,

  // Admin
  useAdminListSellersQuery,
  useAdminGetSellerQuery,
  useAdminVerifySellerMutation,
  useAdminSuspendSellerMutation,
  useAdminReinstateSellerMutation,
  useAdminUpdateTierMutation,
} = sellerApi;

// ============================================
// LAZY QUERY HOOKS (for dynamic triggering)
// ============================================

export const {
  useLazyGetSellerProfileStatusQuery,
  useLazyGetSellerProfileQuery,
  useLazyGetSellerProgressQuery,
  useLazyCheckStoreEligibilityQuery,
  useLazyGetSellerMetricsQuery,
  useLazyAdminListSellersQuery,
  useLazyAdminGetSellerQuery,
} = sellerApi;

export default sellerApi;