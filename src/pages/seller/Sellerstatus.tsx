// src/components/pages/seller/SellerStatus.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  useGetSellerProfileStatusQuery,
  type KycDocumentType,
} from "../../api/sellerApi";
import { logoutThunk } from "../../store/slices/authSlice";
import {
  Clock,
  XCircle,
  PauseCircle,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Upload,
  FileCheck2,
} from "lucide-react";

// ---- Friendly labels for document types -------------------------------

const DOC_LABELS: Record<KycDocumentType, string> = {
  business_registration: "Business registration certificate",
  business_license: "Business license",
  tax_certificate: "Tax certificate",
  id_front: "ID / Passport (front)",
  id_back: "ID / Passport (back)",
  selfie: "Selfie holding ID",
  proof_of_address: "Proof of address",
  bank_statement: "Bank statement",
};

// ============================================================
// MAIN
// ============================================================

const SellerStatusPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const { data, isLoading, isError, refetch } = useGetSellerProfileStatusQuery(
    undefined,
    { refetchOnMountOrArgChange: true }
  );
  const status = data?.data;

  // ---- Auth guard ----
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "seller") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // ---- No seller profile yet → go create one ----
  useEffect(() => {
    if (status && status.exists === false) {
      navigate("/seller-setup", { replace: true });
    }
  }, [status, navigate]);

  // ---- Verified AND eligible → move on to store setup ----
  useEffect(() => {
    if (status?.can_create_stores) {
      navigate("/store-setup", { replace: true });
    }
  }, [status, navigate]);

  // ---- Onboarding incomplete → continue the wizard ----
  //   We only redirect when there's actual work to do AND the seller
  //   is not in a terminal "waiting for review" state.
  useEffect(() => {
    if (!status?.exists) return;

    const step = status.onboarding_step;
    const missingDocs = status.missing_documents ?? [];
    const inReview =
      status.status === "pending" ||
      status.status === "kyc_submitted" ||
      status.status === "kyc_update_pending";

    // Send sellers back to the wizard ONLY when they still have
    // onboarding work left AND aren't already waiting on us.
    if (
      step !== "complete" &&
      step !== "kyc_documents" &&
      !inReview &&
      status.status !== "rejected" &&
      status.status !== "suspended"
    ) {
      navigate("/seller-setup", { replace: true });
      return;
    }

    // If documents are still missing but everything else is done,
    // push them into the KYC step specifically.
    if (step === "kyc_documents" && missingDocs.length > 0 && !inReview) {
      // The wizard reads its own `onboarding_step` from the same
      // query, so navigating to /seller/setup will drop them into
      // the KYC step automatically.
      navigate("/seller-setup", { replace: true });
    }
  }, [status, navigate]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login", { replace: true });
  };

  const onRefresh = () => {
    refetch();
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmGray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto" />
          <p className="mt-4 text-warmGray-600">
            Checking your seller status…
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError || !status) {
    return (
      <CenteredCard>
        <IconBubble tone="red">
          <AlertCircle size={28} className="text-red-600" />
        </IconBubble>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          Unable to load your status
        </h1>
        <p className="text-warmGray-500 text-sm mb-8">
          Please try again in a moment.
        </p>
        <PrimaryButton onClick={onRefresh}>
          <RefreshCw size={18} />
          Retry
        </PrimaryButton>
      </CenteredCard>
    );
  }


  // ============================================================
// VERIFIED, BUT BLOCKED (e.g. store limit reached) — NOT a review state
// ============================================================

if (status.status === "verified" && !status.can_create_stores) {
  return (
    <CenteredCard>
      <IconBubble tone="blue">
        <ShieldAlert size={28} className="text-blue-600" />
      </IconBubble>
      <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
        You're verified!
      </h1>
      <p className="text-warmGray-500 text-sm mb-4">
        {status.block_reason || "You currently can't create another store."}
      </p>

      <InfoBox title="Your account">
        <p>
          Current stores: {status.current_store_count} / {status.max_stores_allowed}
        </p>
      </InfoBox>

      <div className="space-y-3">
        <PrimaryButton onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </PrimaryButton>
        <SecondaryButton onClick={onLogout}>Log out</SecondaryButton>
      </div>
    </CenteredCard>
  );
}

// ============================================================
// DEFAULT — PENDING / KYC_SUBMITTED / KYC_UPDATE_PENDING
// ============================================================


  // ============================================================
  // REJECTED
  // ============================================================

  if (status.status === "rejected") {
    return (
      <CenteredCard>
        <IconBubble tone="red">
          <XCircle size={28} className="text-red-600" />
        </IconBubble>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          Verification was not approved
        </h1>
        <p className="text-warmGray-500 text-sm mb-4">
          {status.block_reason || "Your seller verification was rejected."}
        </p>

        <InfoBox title="What can I do?">
          <p>
            Review the rejection reason above, then re-upload the affected
            documents from your setup page and resubmit.
          </p>
        </InfoBox>

        <div className="space-y-3">
          <PrimaryButton onClick={() => navigate("/seller-setup")}>
            <Upload size={18} />
            Fix documents
          </PrimaryButton>
          <SecondaryButton onClick={onLogout}>Log out</SecondaryButton>
        </div>
      </CenteredCard>
    );
  }

  // ============================================================
  // SUSPENDED
  // ============================================================

  if (status.status === "suspended") {
    return (
      <CenteredCard>
        <IconBubble tone="red">
          <PauseCircle size={28} className="text-red-600" />
        </IconBubble>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          Your seller account is suspended
        </h1>
        <p className="text-warmGray-500 text-sm mb-4">
          {status.block_reason || "Your account has been suspended."}
        </p>

        <InfoBox title="Need help?">
          <p>
            Contact support to understand what happened and whether the
            suspension can be lifted.
          </p>
        </InfoBox>

        <SecondaryButton onClick={onLogout}>Log out</SecondaryButton>
      </CenteredCard>
    );
  }

  // ============================================================
  // KYC EXPIRED
  // ============================================================

  if (status.kyc_expired) {
    return (
      <CenteredCard>
        <IconBubble tone="yellow">
          <ShieldAlert size={28} className="text-yellow-600" />
        </IconBubble>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          Your verification has expired
        </h1>
        <p className="text-warmGray-500 text-sm mb-4">
          {status.block_reason ||
            "Please renew your verification to continue selling."}
        </p>

        <PrimaryButton onClick={() => navigate("/seller-setup")}>
          <Upload size={18} />
          Renew now
        </PrimaryButton>
      </CenteredCard>
    );
  }

  // ============================================================
  // MISSING DOCUMENTS — user hasn't finished uploading
  // ============================================================

  const missingDocs = status.missing_documents ?? [];

  if (missingDocs.length > 0 && status.status !== "kyc_submitted") {
    return (
      <CenteredCard>
        <IconBubble tone="blue">
          <FileCheck2 size={28} className="text-blue-600" />
        </IconBubble>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          We need a few more documents
        </h1>
        <p className="text-warmGray-500 text-sm mb-4">
          Upload the documents below so we can verify your account.
        </p>

        <InfoBox title={`Missing documents (${missingDocs.length})`}>
          <ul className="space-y-1.5">
            {missingDocs.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{DOC_LABELS[d] ?? d}</span>
              </li>
            ))}
          </ul>
        </InfoBox>

        <PrimaryButton onClick={() => navigate("/seller-setup")}>
          <Upload size={18} />
          Upload documents
        </PrimaryButton>
      </CenteredCard>
    );
  }

  // ============================================================
  // DEFAULT — PENDING / KYC_SUBMITTED / KYC_UPDATE_PENDING
  // ============================================================

  return (
    <CenteredCard>
      <IconBubble tone="yellow">
        <Clock size={28} className="text-yellow-600" />
      </IconBubble>
      <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
        Your account is under review
      </h1>
      <p className="text-warmGray-500 text-sm mb-4">
        {status.block_reason ||
          "Our team is reviewing your seller application. This usually takes 1–2 business days."}
      </p>

      <InfoBox title="What happens next?">
        <ul className="space-y-2 text-sm text-warmGray-600">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            A moderator reviews each of your uploaded documents
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            You'll receive an email once your account is verified
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            You can then create your store and start selling
          </li>
        </ul>
      </InfoBox>

      <div className="space-y-3">
        <PrimaryButton onClick={onRefresh}>
          <RefreshCw size={18} />
          Check status
        </PrimaryButton>
        
        <SecondaryButton onClick={onLogout}>Log out</SecondaryButton>
      </div>
    </CenteredCard>
  );
};

export default SellerStatusPage;

// ============================================================
// PRESENTATIONAL HELPERS
// ============================================================

const CenteredCard = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-warmGray-50 px-4">
    <div className="w-full max-w-lg bg-white rounded-3xl px-8 py-10 shadow-sm border border-warmGray-100">
      <div className="text-center">{children}</div>
    </div>
  </div>
);

const IconBubble = ({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "red" | "yellow" | "blue";
}) => {
  const bg = {
    red: "bg-red-50",
    yellow: "bg-yellow-50",
    blue: "bg-blue-50",
  }[tone];
  return (
    <div
      className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center mx-auto mb-5`}
    >
      {children}
    </div>
  );
};

const InfoBox = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-warmGray-50 rounded-xl p-4 mb-6 text-left">
    <p className="text-xs text-warmGray-400 font-medium uppercase tracking-wider mb-2">
      {title}
    </p>
    <div className="text-sm text-warmGray-600">{children}</div>
  </div>
);

const PrimaryButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 bg-accent-700 text-white rounded-full py-3.5 font-medium hover:bg-accent-600 transition-colors"
  >
    {children}
  </button>
);

const SecondaryButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full border border-warmGray-200 rounded-full py-3.5 text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
  >
    {children}
  </button>
);