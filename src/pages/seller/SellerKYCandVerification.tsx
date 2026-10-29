// src/pages/seller/SellerKYCAndVerification.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch } from '../../store/store';
import {
  getSellerProfileThunk,
  getSellerStatusThunk,
  uploadKycDocumentThunk,
  deleteKycDocumentThunk,
  clearSellerError,
  clearSellerMessage,
  clearUploadError,
  selectSellerProfile,
  selectSellerStatus,
  selectSellerLoading,
  selectSellerMutating,
  selectSellerError,
  selectSellerMessage,
  selectKycDocumentByType,
  selectRequiredDocuments,
  selectMissingDocuments,
  selectIsUploadingDocument,
  selectUploadErrorFor,
  selectKycProgress,
  type KycDocumentType,
  type DocumentReference,
} from '../../store/slices/sellerSlice';

// ============================================
// CONSTANTS — document catalog
// ============================================

interface DocSpec {
  type: KycDocumentType;
  label: string;
  description: string;
  required: boolean;
  accept: string;
  maxSizeMB: number;
  formatsHint: string;
}

const DOC_SPECS: DocSpec[] = [
  {
    type: 'business_registration',
    label: 'Business registration certificate',
    description:
      'Official registration document showing your legal business name and registration number.',
    required: true,
    accept: 'application/pdf,image/jpeg,image/png',
    maxSizeMB: 10,
    formatsHint: 'PDF, JPG, PNG · max 10 MB',
  },
  {
    type: 'business_license',
    label: 'Business license',
    description:
      'Valid trading or operating license for your jurisdiction. Required if your country mandates one.',
    required: true,
    accept: 'application/pdf,image/jpeg,image/png',
    maxSizeMB: 10,
    formatsHint: 'PDF, JPG, PNG · max 10 MB',
  },
  {
    type: 'tax_certificate',
    label: 'Tax certificate / TIN',
    description:
      'Tax identification document matching the business name on your registration.',
    required: true,
    accept: 'application/pdf,image/jpeg,image/png',
    maxSizeMB: 10,
    formatsHint: 'PDF, JPG, PNG · max 10 MB',
  },
  {
    type: 'id_front',
    label: 'ID — front',
    description:
      'Government-issued photo ID of the business owner or authorized representative (front side).',
    required: true,
    accept: 'image/jpeg,image/png',
    maxSizeMB: 5,
    formatsHint: 'JPG, PNG · max 5 MB',
  },
  {
    type: 'id_back',
    label: 'ID — back',
    description: 'Back side of the same government-issued ID.',
    required: true,
    accept: 'image/jpeg,image/png',
    maxSizeMB: 5,
    formatsHint: 'JPG, PNG · max 5 MB',
  },
  {
    type: 'selfie',
    label: 'Selfie with ID',
    description:
      'Clear photo of yourself holding the ID next to your face. Used to confirm identity match.',
    required: true,
    accept: 'image/jpeg,image/png',
    maxSizeMB: 5,
    formatsHint: 'JPG, PNG · max 5 MB',
  },
  {
    type: 'proof_of_address',
    label: 'Proof of business address',
    description:
      'Utility bill, bank statement, or lease agreement dated within the last 3 months.',
    required: true,
    accept: 'application/pdf,image/jpeg,image/png',
    maxSizeMB: 10,
    formatsHint: 'PDF, JPG, PNG · max 10 MB',
  },
  {
    type: 'bank_statement',
    label: 'Bank statement',
    description:
      'Recent statement for the payout account, showing the account holder name and account number.',
    required: false,
    accept: 'application/pdf',
    maxSizeMB: 10,
    formatsHint: 'PDF · max 10 MB',
  },
];

// ============================================
// HELPERS
// ============================================

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const isImage = (mime: string) =>
  mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';

const acceptsMime = (accept: string, mime: string) =>
  accept
    .split(',')
    .map((s) => s.trim())
    .some((pattern) => {
      if (pattern === '*/*') return true;
      if (pattern.endsWith('/*')) {
        return mime.startsWith(pattern.slice(0, -1));
      }
      return pattern === mime;
    });

// ============================================
// COMPONENT
// ============================================

const SellerKYCandVerification = () => {
  const dispatch = useDispatch<AppDispatch>();

  const profile = useSelector(selectSellerProfile);
  const status = useSelector(selectSellerStatus);
  const loading = useSelector(selectSellerLoading);
  const mutating = useSelector(selectSellerMutating);
  const error = useSelector(selectSellerError);
  const message = useSelector(selectSellerMessage);

  const requiredDocs = useSelector(selectRequiredDocuments);
  const missingDocs = useSelector(selectMissingDocuments);
  const progress = useSelector(selectKycProgress);

  const [banner, setBanner] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  // ============================================================
  // ALL HOOKS RUN UNCONDITIONALLY, BEFORE ANY EARLY RETURN
  // ============================================================

  useEffect(() => {
    dispatch(getSellerProfileThunk());
    dispatch(getSellerStatusThunk());
  }, [dispatch]);

  useEffect(() => {
    if (message) {
      setBanner({ tone: 'success', text: message });
      dispatch(clearSellerMessage());
    }
  }, [message, dispatch]);

  useEffect(() => {
    if (error) {
      setBanner({ tone: 'error', text: error });
      dispatch(clearSellerError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const requiredSet = useMemo(() => {
    if (requiredDocs.length > 0) return new Set(requiredDocs);
    return new Set(DOC_SPECS.filter((d) => d.required).map((d) => d.type));
  }, [requiredDocs]);

  const missingSet = useMemo(() => new Set(missingDocs), [missingDocs]);

  const handleUpload = async (type: KycDocumentType, file: File) => {
    const spec = DOC_SPECS.find((d) => d.type === type);
    if (spec) {
      if (!acceptsMime(spec.accept, file.type)) {
        setBanner({
          tone: 'error',
          text: `Unsupported file type for "${spec.label}". Accepted: ${spec.formatsHint}`,
        });
        return;
      }
      const maxBytes = spec.maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setBanner({
          tone: 'error',
          text: `File too large. Max ${spec.maxSizeMB} MB for "${spec.label}".`,
        });
        return;
      }
    }
    try {
      await dispatch(
        uploadKycDocumentThunk({ document_type: type, file }),
      ).unwrap();
    } catch {
      // slice stores per-doc error state which the card reads
    }
  };

  const handleDelete = async (type: KycDocumentType) => {
    try {
      await dispatch(deleteKycDocumentThunk(type)).unwrap();
    } catch {
      // slice stores error state
    }
  };

  // ============================================================
  // NOW SAFE TO EARLY-RETURN — every hook has already run
  // ============================================================

  if (loading && !profile && !status) {
    return <SkeletonPage />;
  }

  const verificationStatus =
    profile?.verification_status ?? status?.verification_status;
  const overallStatus = status?.status ?? profile?.status;
  const isVerified = overallStatus === 'verified';
  const isRejected =
    overallStatus === 'rejected' || verificationStatus === 'rejected';
  const isSuspended =
    overallStatus === 'suspended' || verificationStatus === 'suspended';
  const hasPendingUpdate = status?.has_pending_kyc_update === true;
  const kycExpired = status?.kyc_expired === true;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          KYC &amp; verification
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the documents we need to verify your business and activate
          payouts.
        </p>
      </header>

      <VerificationStatusCard
        isVerified={isVerified}
        isRejected={isRejected}
        isSuspended={isSuspended}
        hasPendingUpdate={hasPendingUpdate}
        kycExpired={kycExpired}
        rejectionReason={profile?.rejected_reason}
        suspensionReason={profile?.suspension_reason}
        kycExpiryDate={profile?.kyc_expiry_date}
        verifiedAt={profile?.verified_at}
        progress={progress}
      />

      {banner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            banner.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Documents submitted
          </p>
          <p className="text-sm font-medium tabular-nums text-slate-700">
            {progress.done} / {progress.total}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {progress.total === 0
            ? 'All required documents submitted.'
            : progress.percent === 100
              ? 'All required documents submitted — review typically completes within 1–3 business days.'
              : `${progress.total - progress.done} document${progress.total - progress.done === 1 ? '' : 's'} still required.`}
        </p>
      </div>

      {/* Documents — each card owns its own selectors */}
      <div className="space-y-3">
        {DOC_SPECS.map((spec) => (
          <DocumentCard
            key={spec.type}
            spec={spec}
            isRequired={requiredSet.has(spec.type)}
            isMissing={missingSet.has(spec.type)}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onClearUploadError={() => dispatch(clearUploadError(spec.type))}
            disabled={mutating || isSuspended}
          />
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-medium text-slate-700">Need help?</p>
        <p className="mt-1">
          Documents are reviewed manually and typically verified within 1–3
          business days. If a document is rejected, the reason will appear next
          to it — re-upload a corrected version and review will restart for
          that document only.
        </p>
      </div>
    </div>
  );
};

// ============================================
// DOCUMENT CARD — owns its own selector hooks
// ============================================

const DocumentCard = ({
  spec,
  isRequired,
  isMissing,
  onUpload,
  onDelete,
  onClearUploadError,
  disabled,
}: {
  spec: DocSpec;
  isRequired: boolean;
  isMissing: boolean;
  onUpload: (type: KycDocumentType, file: File) => Promise<void>;
  onDelete: (type: KycDocumentType) => Promise<void>;
  onClearUploadError: () => void;
  disabled: boolean;
}) => {
  // ✅ Selectors live here — three hooks per card, always the same count.
  const existing = useSelector((s: any) =>
    selectKycDocumentByType(s, spec.type),
  ) as DocumentReference | undefined;
  const uploading = useSelector((s: any) =>
    selectIsUploadingDocument(s, spec.type),
  ) as boolean;
  const uploadError = useSelector((s: any) =>
    selectUploadErrorFor(s, spec.type),
  ) as string | undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void onUpload(spec.type, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const isVerified = existing?.verification_status === 'verified';
  const isPending = existing?.verification_status === 'pending';
  const isDocRejected = existing?.verification_status === 'rejected';

  let cardBorder = 'border-slate-200';
  if (isVerified) cardBorder = 'border-emerald-200';
  else if (isDocRejected) cardBorder = 'border-rose-200';
  else if (isPending) cardBorder = 'border-amber-200';
  else if (isMissing && isRequired) cardBorder = 'border-amber-300';

  return (
    <div className={`rounded-xl border bg-white p-4 ${cardBorder}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{spec.label}</p>
            {isRequired && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Required
              </span>
            )}
            <StatusBadge
              existing={existing}
              isMissing={isMissing}
              isRequired={isRequired}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{spec.description}</p>
          <p className="mt-1 text-xs text-slate-400">{spec.formatsHint}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!existing && !uploading && (
            <button
              type="button"
              onClick={pickFile}
              disabled={disabled}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Upload
            </button>
          )}
          {uploading && (
            <span className="text-xs font-medium text-slate-500">
              Uploading…
            </span>
          )}
          {existing && !uploading && (
            <>
              <button
                type="button"
                onClick={pickFile}
                disabled={disabled}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={disabled}
                className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {existing && !uploading && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <FilePreview document={existing} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-800">
              {existing.filename}
            </p>
            <p className="text-xs text-slate-500">
              {formatBytes(existing.size_bytes)} · uploaded{' '}
              {shortDateTime(existing.uploaded_at)}
            </p>
            {existing.verified_at && (
              <p className="text-xs text-emerald-700">
                Verified {shortDateTime(existing.verified_at)}
              </p>
            )}
          </div>
          <a
            href={existing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-slate-700 underline hover:text-slate-900"
          >
            View
          </a>
        </div>
      )}

      {!existing && !uploading && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={pickFile}
          className={`mt-3 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-xs transition ${
            dragOver
              ? 'border-slate-500 bg-slate-50'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          Drag a file here, or click to browse
        </div>
      )}

      {isDocRejected && existing?.rejection_reason && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span className="font-medium">Rejected:</span>{' '}
          {existing.rejection_reason}
        </div>
      )}

      {uploadError && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={onClearUploadError}
            className="shrink-0 text-rose-700 underline hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={spec.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          handleFile(f);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Remove document?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Removing{' '}
              <span className="font-medium">{spec.label}</span> will require you
              to re-upload it before verification can continue.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmDelete(false);
                  await onDelete(spec.type);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STATUS CARD
// ============================================

const VerificationStatusCard = ({
  isVerified,
  isRejected,
  isSuspended,
  hasPendingUpdate,
  kycExpired,
  rejectionReason,
  suspensionReason,
  kycExpiryDate,
  verifiedAt,
  progress,
}: {
  isVerified: boolean;
  isRejected: boolean;
  isSuspended: boolean;
  hasPendingUpdate: boolean;
  kycExpired: boolean;
  rejectionReason?: string;
  suspensionReason?: string;
  kycExpiryDate?: string;
  verifiedAt?: string;
  progress: { total: number; done: number; percent: number };
}) => {
  type Tone = 'success' | 'error' | 'warning' | 'info';
  let tone: Tone = 'info';
  let title = 'Verification in progress';
  let body = 'Upload the required documents to continue.';

  if (isSuspended) {
    tone = 'error';
    title = 'Account suspended';
    body =
      suspensionReason ??
      'Your seller account is suspended. Contact support for next steps.';
  } else if (isRejected) {
    tone = 'error';
    title = 'Verification rejected';
    body =
      rejectionReason ??
      'Some documents were rejected. Review the reasons and re-upload.';
  } else if (isVerified) {
    tone = 'success';
    title = 'Business verified';
    body = verifiedAt
      ? `Verified on ${shortDate(verifiedAt)}.`
      : 'Your business is fully verified.';
    if (kycExpiryDate) {
      body += ` KYC expires ${shortDate(kycExpiryDate)}.`;
    }
  } else if (kycExpired) {
    tone = 'warning';
    title = 'KYC expired';
    body =
      'Your KYC documents have expired. Re-upload updated documents to keep your store active.';
  } else if (hasPendingUpdate) {
    tone = 'warning';
    title = 'KYC update pending';
    body =
      'You submitted updated documents. Review is in progress — some features may be limited until it completes.';
  } else if (progress.total > 0 && progress.percent < 100) {
    tone = 'info';
    title = 'Complete your KYC';
    body = `Upload ${progress.total - progress.done} more document${progress.total - progress.done === 1 ? '' : 's'} to submit for review.`;
  } else if (progress.percent === 100) {
    tone = 'info';
    title = 'Documents submitted';
    body = 'Review typically completes within 1–3 business days.';
  }

  const toneClasses: Record<Tone, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-slate-200 bg-white text-slate-900',
  };

  const titleTone: Record<Tone, string> = {
    success: 'text-emerald-900',
    error: 'text-rose-900',
    warning: 'text-amber-900',
    info: 'text-slate-900',
  };

  return (
    <div className={`mb-6 rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className={`text-sm font-semibold ${titleTone[tone]}`}>{title}</p>
      <p className="mt-1 text-sm opacity-90">{body}</p>
    </div>
  );
};

// ============================================
// SMALL PIECES
// ============================================

const StatusBadge = ({
  existing,
  isMissing,
  isRequired,
}: {
  existing?: DocumentReference;
  isMissing: boolean;
  isRequired: boolean;
}) => {
  if (existing?.verification_status === 'verified') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
        Verified
      </span>
    );
  }
  if (existing?.verification_status === 'pending') {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
        Pending review
      </span>
    );
  }
  if (existing?.verification_status === 'rejected') {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800">
        Rejected
      </span>
    );
  }
  if (isMissing && isRequired) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
        Missing
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Not uploaded
    </span>
  );
};

const FilePreview = ({ document }: { document: DocumentReference }) => {
  if (isImage(document.mime_type)) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
        <img
          src={document.url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500">
      PDF
    </div>
  );
};

const SkeletonPage = () => (
  <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-6">
    <div className="mb-6 h-8 w-64 rounded bg-slate-200" />
    <div className="mb-6 h-24 rounded-xl bg-slate-200" />
    <div className="mb-6 h-20 rounded-xl bg-slate-200" />
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="mb-3 h-32 rounded-xl border border-slate-200 bg-white"
      />
    ))}
  </div>
);

export default SellerKYCandVerification;