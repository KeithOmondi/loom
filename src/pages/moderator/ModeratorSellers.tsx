// src/pages/moderator/ModeratorSellers.tsx

import { useState, useEffect } from "react";
import { useAppSelector } from "../../store/hooks";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  useGetAllSellersQuery,
  useVerifySellerMutation,
  useGetModeratorStatsQuery,
} from "../../api/moderatorApi";
import { useVerifyKycDocumentMutation } from "../../api/sellerApi";
import type { KycDocumentType, DocumentReference } from "../../api/sellerApi";

// ============================================
// Local wire types (mirror what the API returns)
// ============================================

interface SellerRow {
  id: string;
  priority: string;
  status: string;
  submitted_at: string;
  seller: {
    id: string;
    user_id: string;
    legal_business_name: string;
    trading_name?: string;
    business_type: string;
    tax_id?: string;
    registration_number?: string;
    country: string;
    state?: string;
    city?: string;
    business_address?: string;
    business_phone?: string;
    verification_status: string;
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

// ---- Friendly labels --------------------------------------------------------

const DOC_LABELS: Record<KycDocumentType, string> = {
  business_registration: "Business Registration",
  business_license: "Business License",
  tax_certificate: "Tax Certificate",
  id_front: "ID Front",
  id_back: "ID Back",
  selfie: "Selfie with ID",
  proof_of_address: "Proof of Address",
  bank_statement: "Bank Statement",
};

// ----------------------------------------------------------------

const ModeratorSellers = () => {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  // ---- State ----
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerRow | null>(null);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");
  const [rejectionReason, setRejectionReason] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Per-document rejection state: { [docType]: reason }
  const [docRejectReasons, setDocRejectReasons] = useState<
    Partial<Record<KycDocumentType, string>>
  >({});
  const [activeDocAction, setActiveDocAction] = useState<{
    sellerId: string;
    docType: KycDocumentType;
    action: "verified" | "rejected";
  } | null>(null);

  // ---- RTK Query ----
  const {
    data: sellersData,
    isLoading: isLoadingSellers,
    error: sellersError,
    refetch: refetchSellers,
  } = useGetAllSellersQuery({
    page,
    limit,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useGetModeratorStatsQuery();

  const [verifySeller, { isLoading: isVerifyingSeller }] =
    useVerifySellerMutation();
  const [verifyKycDocument, { isLoading: isVerifyingDoc }] =
    useVerifyKycDocumentMutation();

  // ---- Auth guard ----
  useEffect(() => {
    if (
      user &&
      user.role !== "moderator" &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      toast.error("You do not have permission to view this page.");
      navigate("/");
    }
  }, [user, navigate]);

  // ---- Error toast ----
  useEffect(() => {
    if (sellersError) {
      const err = sellersError as any;
      toast.error(err?.data?.message || "Failed to load sellers.");
    }
  }, [sellersError]);

  // ---- Whole-seller verify (kept as override) ----
  const handleVerifySeller = async (sellerId: string) => {
    try {
      await verifySeller({ sellerId, verified: true }).unwrap();
      toast.success("Seller verified.");
      closeVerifyModal();
      refetchSellers();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to verify seller.");
    }
  };

  const handleRejectSeller = async (sellerId: string) => {
    if (!rejectionReason) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    try {
      await verifySeller({
        sellerId,
        verified: false,
        reason: rejectionReason,
      }).unwrap();
      toast.success("Seller rejected.");
      closeVerifyModal();
      refetchSellers();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reject seller.");
    }
  };

  // ---- Per-document verify / reject ----
  const handleVerifyDoc = async (
    sellerId: string,
    docType: KycDocumentType,
    action: "verified" | "rejected",
    reason?: string
  ) => {
    if (action === "rejected" && !reason) {
      toast.error("Please provide a rejection reason for this document.");
      return;
    }

    try {
      const res = await verifyKycDocument({
        sellerId,
        documentType: docType,
        verification_status: action,
        rejection_reason: reason,
      }).unwrap();

      toast.success(
        res.data?.sellerFullyVerified
          ? "Document verified — seller is now fully verified."
          : action === "verified"
          ? "Document verified."
          : "Document rejected."
      );

      setActiveDocAction(null);
      setDocRejectReasons((prev) => {
        const copy = { ...prev };
        delete copy[docType];
        return copy;
      });

      refetchSellers();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update document.");
    }
  };

  const openVerifyModal = (seller: SellerRow, action: "verify" | "reject") => {
    setSelectedSeller(seller);
    setVerifyAction(action);
    setRejectionReason("");
    setShowVerifyModal(true);
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setSelectedSeller(null);
    setRejectionReason("");
  };

  const openDetailsModal = (seller: SellerRow) => {
    setSelectedSeller(seller);
    setShowDetailsModal(true);
  };

  const toggleExpand = (sellerId: string) => {
    setExpandedSeller(expandedSeller === sellerId ? null : sellerId);
  };

  // ---- Status helpers ----
  const getStatusBadge = (seller: SellerRow) => {
    const status = seller.seller?.verification_status || "pending";
    switch (status) {
      case "verified":
        return { label: "Verified", className: "bg-green-100 text-green-700" };
      case "rejected":
        return { label: "Rejected", className: "bg-red-100 text-red-700" };
      case "pending":
        return { label: "Pending", className: "bg-yellow-100 text-yellow-700" };
      case "suspended":
        return { label: "Suspended", className: "bg-orange-100 text-orange-700" };
      default:
        return {
          label: status || "Unknown",
          className: "bg-gray-100 text-gray-700",
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return CheckCircle;
      case "rejected":
        return XCircle;
      case "suspended":
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      case "suspended":
        return "text-orange-600";
      default:
        return "text-yellow-600";
    }
  };

  const sellers = sellersData?.data || [];
  const pagination = sellersData?.pagination;
  const total = pagination?.total || 0;
  const pages = pagination?.pages || 1;

  // ---- Stat Cards (driven directly by API data) ----
  const statCards = [
    {
      label: "Total Reviewed",
      value: statsData?.data?.total_reviewed ?? 0,
      icon: User,
      color: "text-purple-600 bg-purple-100/50",
    },
    {
      label: "Pending Verification",
      value: statsData?.data?.pending ?? 0,
      icon: Clock,
      color: "text-yellow-600 bg-yellow-100/50",
    },
    {
      label: "Verified",
      value: statsData?.data?.approved ?? 0,
      icon: CheckCircle,
      color: "text-green-600 bg-green-100/50",
    },
    {
      label: "Rejected",
      value: statsData?.data?.rejected ?? 0,
      icon: XCircle,
      color: "text-red-600 bg-red-100/50",
    },
    {
      label: "Suspended",
      value: statsData?.data?.suspended ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600 bg-orange-100/50",
    },
  ];

  const isLoading = isLoadingSellers || isLoadingStats;

  // ---- Status filter options ----
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#FDFBF7] via-[#F6F3EE] to-[#EAE5DD] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-warmGray-900 tracking-tight">
              Seller Verification
            </h2>
            <p className="text-warmGray-500 text-sm mt-1">
              Review KYC documents and verify sellers
            </p>
          </div>
          <button
            onClick={() => {
              refetchSellers();
              refetchStats();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-md border border-white/40 rounded-xl text-sm font-medium text-warmGray-700 hover:bg-white/90 hover:border-white/60 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats Grid - Glass Morphism */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-5 flex flex-col justify-between relative overflow-hidden group hover:bg-white/80 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className={`p-2.5 rounded-xl ${stat.color} backdrop-blur-sm shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-2xl font-bold text-warmGray-900">
                    {isLoadingStats ? (
                      <span className="inline-block w-6 h-6 bg-warmGray-200/80 animate-pulse rounded-md align-middle" />
                    ) : (
                      stat.value
                    )}
                  </span>
                </div>
                <p className="text-xs font-medium text-warmGray-500 uppercase tracking-wider relative z-10">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search Bar + Status Filter - Glass Panel */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warmGray-400"
              />
              <input
                type="text"
                placeholder="Search sellers by name, email, or business..."
                className="w-full bg-white/50 border border-white/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetchSellers()}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto bg-white/50 border border-white/60 rounded-xl py-2.5 px-4 text-sm text-warmGray-900 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => refetchSellers()}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600/90 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {isLoadingSellers ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : sellers.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/50 border-dashed p-12 text-center flex flex-col items-center justify-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 shadow-sm">
                <User size={32} className="text-warmGray-300" />
              </div>
              <h3 className="text-lg font-medium text-warmGray-900 mb-1">No sellers found</h3>
              <p className="text-sm text-warmGray-500 max-w-sm">
                There are no sellers matching your current filters. Try adjusting your search or status filter.
              </p>
            </div>
          ) : (
            sellers.map((seller: SellerRow) => {
              const statusKey = seller.seller?.verification_status || "pending";
              const StatusIcon = getStatusIcon(statusKey);
              const statusBadge = getStatusBadge(seller);
              const statusColor = getStatusColor(statusKey);
              const isExpanded = expandedSeller === seller.id;

              const docs = seller.seller?.kyc_documents ?? [];
              const verifiedDocs = docs.filter(
                (d: DocumentReference) => d.verification_status === "verified"
              ).length;
              const rejectedDocs = docs.filter(
                (d: DocumentReference) => d.verification_status === "rejected"
              ).length;
              const pendingDocs = docs.filter(
                (d: DocumentReference) => d.verification_status === "pending"
              ).length;

              return (
                <div
                  key={seller.id}
                  className="bg-white rounded-2xl shadow-sm border border-warmGray-200 overflow-hidden transition-all hover:shadow-md hover:border-warmGray-300"
                >
                  <div className="p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[#FDFBF7] border border-warmGray-200 flex items-center justify-center shrink-0">
                          <User size={24} className="text-warmGray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h3 className="text-lg font-semibold text-warmGray-900 truncate">
                              {seller.seller?.user?.full_name || "Unknown Seller"}
                            </h3>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusBadge.className}`}
                            >
                              <StatusIcon size={12} className={statusColor} />
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-sm text-warmGray-500">
                            {seller.seller?.legal_business_name || "Business Name"}{" "}
                            •{" "}
                            {seller.seller?.business_type?.replace("_", " ") ||
                              "N/A"}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-warmGray-400 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <Mail size={14} />
                              {seller.seller?.user?.email || "No email"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Phone size={14} />
                              {seller.seller?.user?.phone || "No phone"}
                            </span>
                            {seller.seller?.country && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} />
                                {seller.seller.country}
                              </span>
                            )}
                          </div>

                          {/* Document progress chips */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-warmGray-400">
                              Documents:
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100 font-medium">
                              {verifiedDocs} verified
                            </span>
                            {pendingDocs > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-100 font-medium">
                                {pendingDocs} pending
                              </span>
                            )}
                            {rejectedDocs > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 font-medium">
                                {rejectedDocs} rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openDetailsModal(seller)}
                          className="p-2 rounded-xl hover:bg-[#FDFBF7] border border-transparent hover:border-warmGray-200 transition-all"
                          title="View details"
                        >
                          <Eye size={18} className="text-warmGray-500" />
                        </button>
                        <button
                          onClick={() => toggleExpand(seller.id)}
                          className="p-2 rounded-xl hover:bg-[#FDFBF7] border border-transparent hover:border-warmGray-200 transition-all"
                          title={isExpanded ? "Collapse" : "Expand documents"}
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-warmGray-500" />
                          ) : (
                            <ChevronDown size={18} className="text-warmGray-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded — documents grid */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-warmGray-100 space-y-4">
                        <h4 className="text-sm font-semibold text-warmGray-700 flex items-center gap-2">
                          <FileText size={16} className="text-warmGray-400" />
                          KYC Documents ({docs.length})
                        </h4>

                        {docs.length === 0 ? (
                          <p className="text-sm text-warmGray-500 py-2">
                            No documents uploaded yet.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {docs.map((doc: DocumentReference) => (
                              <DocCard
                                key={doc.type}
                                doc={doc}
                                isBusy={isVerifyingDoc}
                                rejectReason={docRejectReasons[doc.type] ?? ""}
                                onRejectReasonChange={(v) =>
                                  setDocRejectReasons((prev) => ({
                                    ...prev,
                                    [doc.type]: v,
                                  }))
                                }
                                onApprove={() =>
                                  handleVerifyDoc(
                                    seller.id,
                                    doc.type,
                                    "verified"
                                  )
                                }
                                onReject={() =>
                                  handleVerifyDoc(
                                    seller.id,
                                    doc.type,
                                    "rejected",
                                    docRejectReasons[doc.type]
                                  )
                                }
                              />
                            ))}
                          </div>
                        )}

                        {/* Whole-seller fallback actions — only for pending sellers */}
                        {seller.seller?.verification_status === "pending" && (
                          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-warmGray-100">
                            <span className="text-xs text-warmGray-400 sm:mr-auto">
                              Manual override:
                            </span>
                            <button
                              onClick={() => openVerifyModal(seller, "verify")}
                              className="w-full sm:w-auto text-xs px-4 py-2 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 font-medium transition-colors"
                            >
                              Force verify seller
                            </button>
                            <button
                              onClick={() => openVerifyModal(seller, "reject")}
                              className="w-full sm:w-auto text-xs px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-medium transition-colors"
                            >
                              Force reject seller
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white/60 backdrop-blur-lg rounded-2xl shadow-sm border border-white/50 px-5 py-4 gap-4">
            <p className="text-sm text-warmGray-500">
              Showing <span className="font-medium text-warmGray-900">{(page - 1) * limit + 1}</span> to <span className="font-medium text-warmGray-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-warmGray-900">{total}</span> sellers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-warmGray-200 bg-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} className="text-warmGray-600" />
              </button>
              <span className="text-sm font-medium text-warmGray-700 px-2">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pages}
                className="p-2 rounded-xl border border-warmGray-200 bg-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} className="text-warmGray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verify/Reject whole seller modal */}
      {showVerifyModal && selectedSeller && (
        <Modal onClose={closeVerifyModal}>
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                verifyAction === "verify" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {verifyAction === "verify" ? (
                <CheckCircle size={28} className="text-green-600" />
              ) : (
                <XCircle size={28} className="text-red-600" />
              )}
            </div>
            <h3 className="text-xl font-serif text-warmGray-900 mb-2">
              {verifyAction === "verify" ? "Verify Seller" : "Reject Seller"}
            </h3>
            <p className="text-warmGray-500 text-sm mb-4">
              {verifyAction === "verify"
                ? `Force-verify "${selectedSeller.seller?.user?.full_name}"? This is a manual override and skips document-level review.`
                : `Force-reject "${selectedSeller.seller?.user?.full_name}"?`}
            </p>
            {verifyAction === "reject" && (
              <div className="text-left">
                <label className="block text-sm font-medium text-warmGray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this seller is being rejected..."
                  className="w-full bg-[#FDFBF7] border border-warmGray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={closeVerifyModal}
              className="flex-1 px-4 py-2.5 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-[#FDFBF7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                verifyAction === "verify"
                  ? handleVerifySeller(selectedSeller.id)
                  : handleRejectSeller(selectedSeller.id)
              }
              disabled={
                isVerifyingSeller ||
                (verifyAction === "reject" && !rejectionReason)
              }
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors ${
                verifyAction === "verify"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isVerifyingSeller
                ? "Processing…"
                : verifyAction === "verify"
                ? "Verify"
                : "Reject"}
            </button>
          </div>
        </Modal>
      )}

      {/* Details modal — extended with documents preview */}
      {showDetailsModal &&
        selectedSeller &&
        selectedSeller.seller && (
          <Modal
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedSeller(null);
            }}
            wide
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif text-warmGray-900">
                Seller Details
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSeller(null);
                }}
                className="p-2 rounded-xl hover:bg-[#FDFBF7] transition-colors"
              >
                <X size={20} className="text-warmGray-600" />
              </button>
            </div>

            {/* Documents */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-warmGray-700 mb-3">
                KYC Documents
              </h4>
              <div className="space-y-2">
                {(selectedSeller.seller.kyc_documents ?? []).map((doc: DocumentReference) => (
                  <div
                    key={doc.type}
                    className="flex items-center justify-between gap-3 p-3.5 bg-[#FDFBF7] border border-warmGray-100 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-warmGray-900 truncate">
                        {DOC_LABELS[doc.type]}
                      </p>
                      <p className="text-xs text-warmGray-500 truncate mt-0.5">
                        {doc.filename}
                      </p>
                    </div>
                    <DocStatusBadge doc={doc} />
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 shrink-0 transition-colors"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
                {(selectedSeller.seller.kyc_documents ?? []).length === 0 && (
                  <p className="text-sm text-warmGray-500 py-2">
                    No documents uploaded yet.
                  </p>
                )}
              </div>
            </div>
          </Modal>
        )}

      {/* Document rejection reason prompt */}
      {activeDocAction && activeDocAction.action === "rejected" && (
        <Modal onClose={() => setActiveDocAction(null)}>
          <h3 className="text-lg font-serif text-warmGray-900 mb-2">
            Reject Document
          </h3>
          <p className="text-sm text-warmGray-500 mb-4">
            {DOC_LABELS[activeDocAction.docType]} — provide a reason for the
            seller.
          </p>
          <textarea
            value={docRejectReasons[activeDocAction.docType] ?? ""}
            onChange={(e) =>
              setDocRejectReasons((prev) => ({
                ...prev,
                [activeDocAction.docType]: e.target.value,
              }))
            }
            className="w-full bg-[#FDFBF7] border border-warmGray-200 rounded-xl px-4 py-3 text-sm min-h-[80px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            placeholder="e.g. Image is blurry, please re-upload a clear photo"
          />
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setActiveDocAction(null)}
              className="flex-1 px-4 py-2.5 border border-warmGray-200 rounded-xl text-warmGray-700 font-medium hover:bg-[#FDFBF7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const reason =
                  docRejectReasons[activeDocAction.docType] ?? "";
                if (!reason.trim()) {
                  toast.error("Please enter a rejection reason.");
                  return;
                }
                handleVerifyDoc(
                  activeDocAction.sellerId,
                  activeDocAction.docType,
                  "rejected",
                  reason
                );
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
};

export default ModeratorSellers;

// ============================================================
// SUB-COMPONENTS
// ============================================================

const Modal = ({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className={`bg-white rounded-3xl w-full ${
        wide ? "max-w-3xl" : "max-w-md"
      } max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-warmGray-200`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const DocStatusBadge = ({ doc }: { doc: DocumentReference }) => {
  const map = {
    verified: "bg-green-50 text-green-700 border-green-100",
    rejected: "bg-red-50 text-red-700 border-red-100",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
  } as const;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${map[doc.verification_status]}`}>
      {doc.verification_status}
    </span>
  );
};

interface DocCardProps {
  doc: DocumentReference;
  isBusy: boolean;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

const DocCard = ({
  doc,
  isBusy,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
}: DocCardProps) => {
  const [showReject, setShowReject] = useState(false);

  const isPending = doc.verification_status === "pending";

  return (
    <div className="border border-warmGray-200 rounded-2xl p-4 flex flex-col gap-3 bg-[#FDFBF7]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-warmGray-900 text-sm">
              {DOC_LABELS[doc.type]}
            </span>
            <DocStatusBadge doc={doc} />
          </div>
          <p className="text-xs text-warmGray-500 truncate">
            {doc.filename}
          </p>
          {doc.rejection_reason && (
            <p className="text-xs text-red-600 mt-1.5 bg-red-50 p-1.5 rounded-md">
              Reason: {doc.rejection_reason}
            </p>
          )}
        </div>
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 shrink-0 transition-colors bg-white px-2 py-1 rounded-md border border-warmGray-200"
        >
          Open <ExternalLink size={12} />
        </a>
      </div>

      {isPending && !showReject && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onApprove}
            disabled={isBusy}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isBusy}
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {isPending && showReject && (
        <div className="space-y-2 mt-1">
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Reason for rejection…"
            className="w-full bg-white border border-warmGray-200 rounded-xl px-3 py-2 text-xs min-h-[60px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(false)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-warmGray-200 text-warmGray-700 hover:bg-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error("Please enter a reason.");
                  return;
                }
                onReject();
                setShowReject(false);
              }}
              disabled={isBusy}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
            >
              Confirm reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};