// src/components/pages/seller/SellerSetup.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import {
  useGetSellerProfileStatusQuery,
  useSetupSellerProfileMutation,
  useUpdateSellerProfileMutation,
  useUploadKycDocumentMutation,
  useDeleteKycDocumentMutation,
  type BusinessType,
  type PayoutMethod,
  type KycDocumentType,
  type DocumentReference,
  type CreateSellerInput,
  type UpdateSellerInput,
} from "../../api/sellerApi";
import { useAppSelector } from "../../store/hooks";

// ============================================================
// CONSTANTS
// ============================================================

const STEPS = [
  { key: "business", label: "Business Info" },
  { key: "address", label: "Address & Contact" },
  { key: "payout", label: "Payout Method" },
  { key: "kyc", label: "KYC Documents" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const TERMS_VERSION = "1.0.0";
const PRIVACY_VERSION = "1.0.0";

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "non_profit", label: "Non-Profit" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

// ============================================================
// FORM SHAPE
// ============================================================

interface WizardFormState {
  // Business
  legal_business_name: string;
  trading_name: string;
  business_type: BusinessType | "";
  tax_id: string;
  registration_number: string;

  // Address & contact
  country: string;
  state: string;
  city: string;
  business_address: string;
  business_phone: string;

  // Payout
  payout_method: PayoutMethod;
  currency: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  bank_name: string;
  bank_country: string;
  paypal_email: string;
  mpesa_phone: string;

  // Legal consent
  accepted_terms: boolean;
  accepted_privacy: boolean;
}

const initialFormState: WizardFormState = {
  legal_business_name: "",
  trading_name: "",
  business_type: "",
  tax_id: "",
  registration_number: "",
  country: "",
  state: "",
  city: "",
  business_address: "",
  business_phone: "",
  payout_method: "bank",
  currency: "USD",
  bank_account_name: "",
  bank_account_number: "",
  bank_routing_number: "",
  bank_name: "",
  bank_country: "",
  paypal_email: "",
  mpesa_phone: "",
  accepted_terms: false,
  accepted_privacy: false,
};

// ============================================================
// ERROR HELPERS
// ============================================================

const extractErrorMessage = (err: unknown): string => {
  if (!err) return "Something went wrong.";
  const maybe = err as FetchBaseQueryError & {
    data?: { message?: string; errors?: string[] };
  };
  if (maybe.data?.errors?.length) return maybe.data.errors.join(", ");
  if (maybe.data?.message) return maybe.data.message;
  return "Something went wrong.";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const SellerSetup = () => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
    refetch,
  } = useGetSellerProfileStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<WizardFormState>(initialFormState);

  // Guards so refetches don't hijack user progress
  const didPrefill = useRef(false);
  const didInitialStepJump = useRef(false);

  // Whether the seller row already exists on the server
  const serverExists = statusData?.data?.exists ?? false;
  const serverComplete = statusData?.data?.isComplete ?? false;
  //const canCreateStores = statusData?.data?.can_create_stores ?? false;

  // ---- Auth guards ----
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "seller") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // ---- Status error toast ----
  useEffect(() => {
    if (statusError) {
      toast.error(extractErrorMessage(statusError));
    }
  }, [statusError]);

  // ---- Already verified → move on ----
  // ---- Onboarding is done — hand off to the status page ----
  useEffect(() => {
    if (serverExists && serverComplete) {
      toast.success("Your seller profile is complete.");
      navigate("/seller-status", { replace: true });
    }
  }, [serverExists, serverComplete, navigate]);

  // ---- Pre-fill form when editing an existing seller (ONCE) ----
  // Subsequent refetches must NOT overwrite what the user typed.
  useEffect(() => {
    if (didPrefill.current) return;
    if (!statusData?.data?.seller) return;

    const s = statusData.data.seller;
    setForm((prev) => ({
      ...prev,
      legal_business_name: s.legal_business_name ?? "",
      trading_name: s.trading_name ?? "",
      business_type: s.business_type ?? "",
      tax_id: s.tax_id ?? "",
      registration_number: s.registration_number ?? "",
      country: s.country ?? "",
      state: s.state ?? "",
      city: s.city ?? "",
      business_address: s.business_address ?? "",
      business_phone: s.business_phone ?? "",
      payout_method: s.payout_method ?? "bank",
      currency: s.currency ?? "USD",
      bank_account_name: s.bank_account_name ?? "",
      bank_account_number: s.bank_account_number ?? "",
      bank_routing_number: s.bank_routing_number ?? "",
      bank_name: s.bank_name ?? "",
      bank_country: s.bank_country ?? "",
      paypal_email: s.paypal_email ?? "",
      mpesa_phone: s.mpesa_phone ?? "",
    }));

    didPrefill.current = true;
  }, [statusData?.data?.seller]);

  // ---- Jump to the right step on first load only ----
  // After this, the user navigates freely via Back/Continue.
  useEffect(() => {
    if (didInitialStepJump.current) return;
    if (!serverExists) return;

    const step = statusData?.data?.onboarding_step;
    const map: Record<string, number> = {
      none: 0,
      basic_info: 0,
      business_details: 1,
      payment_setup: 2,
      kyc_documents: 3,
      complete: 4,
    };
    if (step && step in map) {
      setStepIndex(map[step]);
      didInitialStepJump.current = true;
    }
  }, [serverExists, statusData?.data?.onboarding_step]);

  const updateField = <K extends keyof WizardFormState>(
    key: K,
    value: WizardFormState[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  if (statusLoading) return <LoadingScreen />;
  if (!user || user.role !== "seller") return null;

  const currentStep: StepKey =
    STEPS[Math.min(stepIndex, STEPS.length - 1)].key;

  return (
    <div className="min-h-screen bg-warmGray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Header isEditing={serverExists} />

        <StepBar currentIndex={stepIndex} />

        <div className="bg-white rounded-3xl shadow-sm border border-warmGray-100 p-6 md:p-8 mt-6">
          {currentStep === "business" && (
            <BusinessStep
              form={form}
              onChange={updateField}
              onNext={() => setStepIndex(1)}
            />
          )}

          {currentStep === "address" && (
            <AddressStep
              form={form}
              onChange={updateField}
              onBack={() => setStepIndex(0)}
              onNext={() => setStepIndex(2)}
            />
          )}

          {currentStep === "payout" && (
            <PayoutStep
              form={form}
              onChange={updateField}
              onBack={() => setStepIndex(1)}
              onNext={() => setStepIndex(3)}
            />
          )}

          {currentStep === "kyc" && (
            <KycStep
              form={form}
              serverExists={serverExists}
              seller={statusData?.data?.seller ?? null}
              requiredDocuments={statusData?.data?.requiredDocuments ?? []}
              onSellerCreated={async () => {
                await refetch();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerSetup;

// ============================================================
// PRESENTATIONAL
// ============================================================

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-warmGray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto" />
      <p className="mt-4 text-warmGray-600">Loading your seller profile…</p>
    </div>
  </div>
);

const Header = ({ isEditing }: { isEditing: boolean }) => (
  <div className="text-center mb-8">
    <h1 className="text-3xl md:text-4xl font-serif text-warmGray-900">
      {isEditing ? "Complete Your Seller Profile" : "Set Up Your Seller Profile"}
    </h1>
    <p className="text-warmGray-500 mt-2 text-sm">
      {isEditing
        ? "Finish the remaining steps to start selling."
        : "We need a few details to get you selling on the marketplace."}
    </p>
  </div>
);

const StepBar = ({ currentIndex }: { currentIndex: number }) => (
  <div className="flex items-center justify-between gap-2">
    {STEPS.map((step, idx) => {
      const state =
        idx < currentIndex ? "done" : idx === currentIndex ? "active" : "todo";
      return (
        <div key={step.key} className="flex-1 flex items-center gap-2">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              state === "done"
                ? "bg-accent-700 text-white"
                : state === "active"
                ? "bg-accent-100 text-accent-800 ring-2 ring-accent-700"
                : "bg-warmGray-100 text-warmGray-500"
            }`}
          >
            {state === "done" ? "✓" : idx + 1}
          </div>
          <span
            className={`hidden md:inline text-xs font-medium ${
              state === "active" ? "text-accent-800" : "text-warmGray-500"
            }`}
          >
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px ${
                state === "done" ? "bg-accent-700" : "bg-warmGray-200"
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

// ============================================================
// SHARED STYLES
// ============================================================

const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1";
const inputClass =
  "w-full bg-warmGray-50/50 border border-warmGray-200 rounded-2xl px-4 py-3 text-warmGray-900 placeholder:text-warmGray-400 outline-none transition-all duration-200 focus:border-accent-700 focus:ring-2 focus:ring-accent-700/20 disabled:opacity-60";
const reqMark = <span className="text-red-500">*</span>;
const btnPrimary =
  "w-full bg-accent-800 disabled:opacity-40 rounded-2xl py-3.5 text-white font-medium transition-all hover:bg-accent-700 active:scale-[0.99] disabled:hover:bg-accent-800 disabled:active:scale-100";
const btnSecondary =
  "w-full border border-warmGray-200 rounded-2xl py-3 text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors disabled:opacity-50";

// ============================================================
// STEP PROPS
// ============================================================

interface StepCommonProps {
  form: WizardFormState;
  onChange: <K extends keyof WizardFormState>(
    key: K,
    value: WizardFormState[K]
  ) => void;
}

// ============================================================
// STEP 1 — BUSINESS
// ============================================================

const BusinessStep = ({
  form,
  onChange,
  onNext,
}: StepCommonProps & { onNext: () => void }) => {
  const canProceed =
    form.legal_business_name.trim().length >= 2 &&
    form.trading_name.trim().length >= 2 &&
    form.business_type !== "" &&
    form.tax_id.trim().length >= 1 &&
    form.registration_number.trim().length >= 1;

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-warmGray-900 mb-2">
        Business Information
      </h2>

      <div>
        <label className={labelClass}>Legal Business Name {reqMark}</label>
        <input
          className={inputClass}
          value={form.legal_business_name}
          onChange={(e) => onChange("legal_business_name", e.target.value)}
          placeholder="e.g. Acme Enterprises Ltd"
        />
      </div>

      <div>
        <label className={labelClass}>Trading Name {reqMark}</label>
        <input
          className={inputClass}
          value={form.trading_name}
          onChange={(e) => onChange("trading_name", e.target.value)}
          placeholder="The name customers see"
        />
      </div>

      <div>
        <label className={labelClass}>Business Type {reqMark}</label>
        <select
          className={inputClass}
          value={form.business_type}
          onChange={(e) =>
            onChange("business_type", e.target.value as BusinessType | "")
          }
        >
          <option value="">Select type</option>
          {BUSINESS_TYPES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tax ID {reqMark}</label>
          <input
            className={inputClass}
            value={form.tax_id}
            onChange={(e) => onChange("tax_id", e.target.value)}
            placeholder="e.g. KRA PIN or EIN"
          />
        </div>
        <div>
          <label className={labelClass}>Registration Number {reqMark}</label>
          <input
            className={inputClass}
            value={form.registration_number}
            onChange={(e) => onChange("registration_number", e.target.value)}
            placeholder="Company registration no."
          />
        </div>
      </div>

      <button className={btnPrimary} onClick={handleNext} disabled={!canProceed}>
        Continue
      </button>
    </div>
  );
};

// ============================================================
// STEP 2 — ADDRESS & CONTACT
// ============================================================

const AddressStep = ({
  form,
  onChange,
  onNext,
  onBack,
}: StepCommonProps & { onNext: () => void; onBack: () => void }) => {
  const canProceed =
    form.country.trim().length >= 2 &&
    form.state.trim().length >= 1 &&
    form.city.trim().length >= 1 &&
    form.business_address.trim().length >= 5 &&
    form.business_phone.trim().length >= 10;

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please fill in all fields.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-warmGray-900 mb-2">
        Address & Contact
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Country {reqMark}</label>
          <input
            className={inputClass}
            value={form.country}
            onChange={(e) => onChange("country", e.target.value)}
            placeholder="e.g. Kenya"
          />
        </div>
        <div>
          <label className={labelClass}>State / Province {reqMark}</label>
          <input
            className={inputClass}
            value={form.state}
            onChange={(e) => onChange("state", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>City {reqMark}</label>
        <input
          className={inputClass}
          value={form.city}
          onChange={(e) => onChange("city", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Business Address {reqMark}</label>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.business_address}
          onChange={(e) => onChange("business_address", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Business Phone {reqMark}</label>
        <input
          className={inputClass}
          value={form.business_phone}
          onChange={(e) => onChange("business_phone", e.target.value)}
          placeholder="+254 700 000 000"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button className={btnSecondary} onClick={onBack}>
          Back
        </button>
        <button className={btnPrimary} onClick={handleNext} disabled={!canProceed}>
          Continue
        </button>
      </div>
    </div>
  );
};

// ============================================================
// STEP 3 — PAYOUT
// ============================================================

const PayoutStep = ({
  form,
  onChange,
  onNext,
  onBack,
}: StepCommonProps & { onNext: () => void; onBack: () => void }) => {
  const canProceed = useMemo(() => {
    if (form.payout_method === "bank") {
      return (
        form.bank_account_name.trim() !== "" &&
        form.bank_account_number.trim() !== "" &&
        form.bank_routing_number.trim() !== "" &&
        form.bank_name.trim() !== ""
      );
    }
    if (form.payout_method === "mpesa") return form.mpesa_phone.trim() !== "";
    if (form.payout_method === "paypal") return form.paypal_email.trim() !== "";
    return false;
  }, [form]);

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please complete your payout details.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-warmGray-900 mb-2">
        Payout Method
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Payout Method {reqMark}</label>
          <select
            className={inputClass}
            value={form.payout_method}
            onChange={(e) =>
              onChange("payout_method", e.target.value as PayoutMethod)
            }
          >
            <option value="bank">Bank Transfer</option>
            <option value="mpesa">M-Pesa</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Currency</label>
          <select
            className={inputClass}
            value={form.currency}
            onChange={(e) => onChange("currency", e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.payout_method === "bank" && (
        <>
          <div>
            <label className={labelClass}>Account Holder Name {reqMark}</label>
            <input
              className={inputClass}
              value={form.bank_account_name}
              onChange={(e) => onChange("bank_account_name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Account Number {reqMark}</label>
              <input
                className={inputClass}
                value={form.bank_account_number}
                onChange={(e) =>
                  onChange(
                    "bank_account_number",
                    e.target.value.replace(/\D/g, "")
                  )
                }
              />
            </div>
            <div>
              <label className={labelClass}>Routing Number {reqMark}</label>
              <input
                className={inputClass}
                value={form.bank_routing_number}
                onChange={(e) =>
                  onChange(
                    "bank_routing_number",
                    e.target.value.replace(/\D/g, "")
                  )
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank Name {reqMark}</label>
              <input
                className={inputClass}
                value={form.bank_name}
                onChange={(e) => onChange("bank_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Bank Country</label>
              <input
                className={inputClass}
                value={form.bank_country}
                onChange={(e) => onChange("bank_country", e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {form.payout_method === "mpesa" && (
        <div>
          <label className={labelClass}>M-Pesa Phone {reqMark}</label>
          <input
            className={inputClass}
            value={form.mpesa_phone}
            onChange={(e) => onChange("mpesa_phone", e.target.value)}
            placeholder="+254 712 345 678"
          />
        </div>
      )}

      {form.payout_method === "paypal" && (
        <div>
          <label className={labelClass}>PayPal Email {reqMark}</label>
          <input
            type="email"
            className={inputClass}
            value={form.paypal_email}
            onChange={(e) => onChange("paypal_email", e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button className={btnSecondary} onClick={onBack}>
          Back
        </button>
        <button className={btnPrimary} onClick={handleNext} disabled={!canProceed}>
          Continue
        </button>
      </div>
    </div>
  );
};

// ============================================================
// STEP 4 — KYC DOCUMENTS
// ============================================================

interface KycStepProps {
  form: WizardFormState;
  serverExists: boolean;
  seller: { id: string; kyc_documents?: DocumentReference[] } | null;
  requiredDocuments: KycDocumentType[];
  onSellerCreated: () => Promise<void> | void;
}

const KycStep = ({
  form,
  serverExists,
  seller,
  requiredDocuments,
  onSellerCreated,
}: KycStepProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [setupSeller, { isLoading: isCreating }] = useSetupSellerProfileMutation();
  const [updateSeller, { isLoading: isUpdating }] = useUpdateSellerProfileMutation();
  const [upload, { isLoading: isUploading }] = useUploadKycDocumentMutation();
  const [remove, { isLoading: isDeleting }] = useDeleteKycDocumentMutation();

  const isBusy = isCreating || isUpdating || isUploading || isDeleting;

  const buildCreatePayload = (): CreateSellerInput => ({
    legal_business_name: form.legal_business_name.trim(),
    trading_name: form.trading_name.trim(),
    business_type: form.business_type as BusinessType,
    tax_id: form.tax_id.trim().toUpperCase(),
    registration_number: form.registration_number.trim().toUpperCase(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    business_address: form.business_address.trim(),
    business_phone: form.business_phone.trim(),
    payout_method: form.payout_method,
    ...(form.payout_method === "bank" && {
      bank_account_name: form.bank_account_name.trim(),
      bank_account_number: form.bank_account_number.trim(),
      bank_routing_number: form.bank_routing_number.trim(),
      bank_name: form.bank_name.trim(),
      bank_country: form.bank_country.trim() || undefined,
    }),
    ...(form.payout_method === "mpesa" && {
      mpesa_phone: form.mpesa_phone.trim(),
    }),
    ...(form.payout_method === "paypal" && {
      paypal_email: form.paypal_email.trim(),
    }),
    currency: form.currency,
    accepted_terms_version: TERMS_VERSION,
    accepted_privacy_version: PRIVACY_VERSION,
  });

  const buildUpdatePayload = (): UpdateSellerInput => ({
    legal_business_name: form.legal_business_name.trim(),
    trading_name: form.trading_name.trim(),
    business_type: form.business_type as BusinessType,
    tax_id: form.tax_id.trim().toUpperCase(),
    registration_number: form.registration_number.trim().toUpperCase(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    business_address: form.business_address.trim(),
    business_phone: form.business_phone.trim(),
    payout_method: form.payout_method,
    ...(form.payout_method === "bank" && {
      bank_account_name: form.bank_account_name.trim(),
      bank_account_number: form.bank_account_number.trim(),
      bank_routing_number: form.bank_routing_number.trim(),
      bank_name: form.bank_name.trim(),
      bank_country: form.bank_country.trim() || undefined,
    }),
    ...(form.payout_method === "mpesa" && {
      mpesa_phone: form.mpesa_phone.trim(),
    }),
    ...(form.payout_method === "paypal" && {
      paypal_email: form.paypal_email.trim(),
    }),
    currency: form.currency,
  });

  const handleSaveProfile = async () => {
    if (!termsAccepted || !privacyAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    try {
      if (serverExists) {
        await updateSeller(buildUpdatePayload()).unwrap();
        toast.success("Profile updated.");
      } else {
        await setupSeller(buildCreatePayload()).unwrap();
        toast.success("Profile created. You can now upload documents.");
      }
      await onSellerCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleFile = async (docType: KycDocumentType, file: File) => {
    try {
      await upload({ document_type: docType, file }).unwrap();
      toast.success("Document uploaded.");
      await onSellerCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async (docType: KycDocumentType) => {
    if (!confirm("Delete this document? You'll need to re-upload it.")) return;
    try {
      await remove(docType).unwrap();
      toast.success("Document removed.");
      await onSellerCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (!serverExists || !seller) {
    return (
      <div className="space-y-5">
        <h2 className="text-lg font-serif text-warmGray-900 mb-2">
          Almost there
        </h2>
        <p className="text-sm text-warmGray-600">
          Review the details you entered, accept our legal terms, and we'll
          create your seller account. You'll then be able to upload your KYC
          documents.
        </p>

        <div className="bg-warmGray-50 rounded-2xl p-4 text-sm text-warmGray-700 space-y-2">
          <Row label="Business" value={form.legal_business_name} />
          <Row label="Trading name" value={form.trading_name} />
          <Row label="Business type" value={form.business_type} />
          <Row label="Tax ID" value={form.tax_id} />
          <Row label="Registration no." value={form.registration_number} />
          <Row
            label="Address"
            value={`${form.business_address}, ${form.city}, ${form.state}, ${form.country}`}
          />
          <Row label="Phone" value={form.business_phone} />
          <Row label="Payout method" value={form.payout_method} />
        </div>

        <div className="space-y-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onChange={setTermsAccepted}
            label={
              <>
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-700 hover:underline"
                >
                  Terms of Service
                </a>
              </>
            }
          />
          <Checkbox
            id="privacy"
            checked={privacyAccepted}
            onChange={setPrivacyAccepted}
            label={
              <>
                I agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-700 hover:underline"
                >
                  Privacy Policy
                </a>
              </>
            }
          />
        </div>

        <button
          className={btnPrimary}
          onClick={handleSaveProfile}
          disabled={isBusy || !termsAccepted || !privacyAccepted}
        >
          {isCreating || isUpdating ? "Creating profile…" : "Create profile"}
        </button>
      </div>
    );
  }

  const documents = seller.kyc_documents ?? [];
  const uploadedTypes = new Set(documents.map((d) => d.type));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-serif text-warmGray-900 mb-1">
          KYC Documents
        </h2>
        <p className="text-sm text-warmGray-500">
          Upload clear images or PDFs. All documents are required for
          verification.
        </p>
      </div>

      <div className="space-y-3">
        {requiredDocuments.map((docType) => {
          const doc = documents.find((d) => d.type === docType);
          return (
            <DocRow
              key={docType}
              docType={docType}
              doc={doc}
              hasDoc={uploadedTypes.has(docType)}
              isBusy={isBusy}
              onUpload={handleFile}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      {requiredDocuments.every((t) => uploadedTypes.has(t)) ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          All documents submitted. A moderator will review them shortly.
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          Upload all required documents to submit your application.
        </div>
      )}
    </div>
  );
};

// ============================================================
// KYC DOCUMENT ROW
// ============================================================

const DOC_LABELS: Record<KycDocumentType, string> = {
  business_registration: "Business Registration Certificate",
  business_license: "Business License",
  tax_certificate: "Tax Certificate",
  id_front: "ID / Passport — Front",
  id_back: "ID / Passport — Back",
  selfie: "Selfie Holding ID",
  proof_of_address: "Proof of Address",
  bank_statement: "Bank Statement",
};

interface DocRowProps {
  docType: KycDocumentType;
  doc?: DocumentReference;
  hasDoc: boolean;
  isBusy: boolean;
  onUpload: (docType: KycDocumentType, file: File) => void | Promise<void>;
  onDelete: (docType: KycDocumentType) => void | Promise<void>;
}

const DocRow = ({
  docType,
  doc,
  hasDoc,
  isBusy,
  onUpload,
  onDelete,
}: DocRowProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const status = doc?.verification_status;

  type Mode = "empty" | "pending" | "verified" | "rejected";
  const mode: Mode =
    status === "pending"
      ? "pending"
      : status === "verified"
      ? "verified"
      : status === "rejected"
      ? "rejected"
      : "empty";

  const canSelectFile = mode === "empty" || mode === "rejected";
  const canDelete = mode === "rejected";

  const badge = {
    verified: { text: "Verified", cls: "bg-green-100 text-green-700" },
    rejected: {
      text: "Rejected — re-upload required",
      cls: "bg-red-100 text-red-700",
    },
    pending: { text: "Pending review", cls: "bg-yellow-100 text-yellow-700" },
    empty: hasDoc
      ? { text: "Uploaded", cls: "bg-blue-100 text-blue-700" }
      : { text: "Not uploaded", cls: "bg-warmGray-100 text-warmGray-600" },
  }[mode];

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    await onUpload(docType, selectedFile);
    setSelectedFile(null);
  };

  return (
    <div className="border border-warmGray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-warmGray-900">
            {DOC_LABELS[docType]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.text}
          </span>
        </div>

        {doc?.rejection_reason && (
          <p className="text-xs text-red-600 mt-1">
            Reason: {doc.rejection_reason}
          </p>
        )}

        {doc && (
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent-700 hover:underline mt-1 inline-block"
          >
            View uploaded file
          </a>
        )}

        {mode === "verified" && (
          <p className="text-xs text-warmGray-500 mt-1">
            This document has been verified and can no longer be changed.
          </p>
        )}
        {mode === "pending" && (
          <p className="text-xs text-warmGray-500 mt-1">
            This document is under review and cannot be changed.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {canSelectFile && (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/tiff,application/pdf"
              onChange={handleSelect}
              disabled={isBusy}
              className="hidden"
              id={`file-${docType}`}
            />
            <label
              htmlFor={`file-${docType}`}
              className={`cursor-pointer text-sm px-3 py-2 rounded-xl border border-warmGray-200 hover:bg-warmGray-50 ${
                isBusy ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {selectedFile
                ? selectedFile.name.slice(0, 20) + "…"
                : mode === "rejected"
                ? "Choose new file"
                : "Choose file"}
            </label>

            {selectedFile && (
              <button
                onClick={handleUploadClick}
                disabled={isBusy}
                className="text-sm px-3 py-2 rounded-xl bg-accent-800 text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {mode === "rejected" ? "Replace" : "Upload"}
              </button>
            )}
          </>
        )}

        {canDelete && doc && (
          <button
            onClick={() => onDelete(docType)}
            disabled={isBusy}
            className="text-sm px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SMALL HELPERS
// ============================================================

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-warmGray-500">{label}</span>
    <span className="font-medium text-warmGray-800 truncate">{value}</span>
  </div>
);

const Checkbox = ({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) => (
  <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-5 h-5 rounded border-warmGray-300 text-accent-700 focus:ring-accent-700 focus:ring-2"
    />
    <span className="text-sm text-warmGray-600">{label}</span>
  </label>
);