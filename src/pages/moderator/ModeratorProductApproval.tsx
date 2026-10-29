// src/pages/moderator/ModeratorProductApproval.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  Package,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  Store,
  User,
  Tag,
  DollarSign,
  Boxes,
} from "lucide-react";
import {
  useModeratorListPendingProductsQuery,
  useModeratorGetProductQuery,
  useModeratorReviewProductMutation,
  type GetProductsQuery,
  type Product,
  type ProductImage,
  type ProductStatus,
  type ModerationProductSnapshot,
} from "../../api/productApi";
import { useGetCategoryTreeQuery } from "../../api/categoryApi";

// ============================================================
// CONSTANTS
// ============================================================

const PAGE_LIMIT = 12;

const STATUS_BADGE: Record<ProductStatus, string> = {
  draft: "bg-[#F0EBE1] text-[#6B6159]",
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
  discontinued: "bg-[#EBE5D9] text-[#A89F91]",
};

// ============================================================
// HELPERS — UUID check
// ============================================================

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ============================================================
// HELPERS — image resolution
// ============================================================

const getPrimaryImage = (
  product: Product | null | undefined
): ProductImage | undefined => {
  const imgs = Array.isArray(product?.images) ? product.images : [];
  if (imgs.length === 0) return undefined;
  return (
    imgs.find((i) => i?.is_primary) ??
    [...imgs].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))[0]
  );
};

const getPrimaryImageUrl = (
  product: Product | null | undefined
): string | undefined => {
  const img = getPrimaryImage(product);
  return img?.url && typeof img.url === "string" ? img.url : undefined;
};

// ============================================================
// NORMALIZE IMAGES — the backend isn't consistent across endpoints
// ============================================================

const normalizeProductImages = (
  raw: unknown,
  fallbackUrl?: string
): ProductImage[] => {
  let list: unknown[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    list = Object.values(raw as Record<string, unknown>);
  } else if (typeof raw === "string" && raw.trim().length > 0) {
    list = [{ url: raw }];
  }

  const images: ProductImage[] = [];

  list.forEach((entry, idx) => {
    if (!entry) return;

    if (typeof entry === "string") {
      const url = entry.trim();
      if (!url) return;
      images.push({
        id: `img_${idx}`,
        product_id: "",
        url,
        public_id: "",
        alt_text: null,
        is_primary: idx === 0,
        sort_order: idx,
        metadata: null,
        created_at: "",
      });
      return;
    }

    if (typeof entry === "object") {
      const e = entry as Partial<ProductImage> & {
        url?: string;
        image_url?: string;
        src?: string;
      };
      const url = e.url ?? e.image_url ?? e.src;
      if (!url || typeof url !== "string") return;
      images.push({
        id: (e.id as string) ?? `img_${idx}`,
        product_id: (e.product_id as string) ?? "",
        url,
        public_id: (e.public_id as string) ?? "",
        alt_text: (e.alt_text as string | null) ?? null,
        is_primary: e.is_primary ?? idx === 0,
        sort_order: typeof e.sort_order === "number" ? e.sort_order : idx,
        metadata: (e.metadata as Record<string, unknown> | null) ?? null,
        created_at: (e.created_at as string) ?? "",
      });
    }
  });

  if (images.length === 0 && fallbackUrl) {
    images.push({
      id: "img_flat",
      product_id: "",
      url: fallbackUrl,
      public_id: "",
      alt_text: null,
      is_primary: true,
      sort_order: 0,
      metadata: null,
      created_at: "",
    });
  }

  return images;
};

// ============================================================
// NORMALIZE QUEUE ROW → Product
// ------------------------------------------------------------
// The moderator list endpoint returns:
//   {
//     id: <queue_row_uuid>,
//     target_id: <product_uuid>,
//     product: { id: <product_uuid>, name, ..., images },
//     store: {...},
//     seller: {...}
//   }
//
// The detail endpoint wants the *product* uuid, never the queue row id.
// We always take `row.product.id` when the nested product exists.
// ============================================================

const normalizeQueueRow = (row: any): Product => {
  const nestedProduct =
    row?.product && typeof row.product === "object" ? row.product : null;

  const source = nestedProduct ?? row;

  // Priority: nested product id → target_id → row.id → (nothing)
  // We never want the moderation_queue row's id, so it's the last resort
  // only if all other options are missing.
  const id =
    (isUuid(nestedProduct?.id) && nestedProduct.id) ||
    (isUuid(row?.target_id) && row.target_id) ||
    (isUuid(row?.id) && row.id) ||
    nestedProduct?.id ||
    row?.id;

  const fallbackImageUrl =
    source?.main_image_url ??
    source?.thumbnail_url ??
    source?.image_url ??
    row?.main_image_url ??
    row?.thumbnail_url ??
    row?.image_url ??
    undefined;

  const images = normalizeProductImages(
    source?.images ?? row?.images,
    typeof fallbackImageUrl === "string" ? fallbackImageUrl : undefined
  );

  return {
    ...source,
    id,
    images,
    store: row?.store ?? source?.store,
    seller: row?.seller ?? source?.seller,
    ...(row?.queue_id ? { queue_id: row.queue_id } : {}),
  } as Product;
};

// ============================================================
// PAGE
// ============================================================

const ModeratorProductApproval = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState<Product | null>(null);
  const [confirmReject, setConfirmReject] = useState<Product | null>(null);

  // ---- Query ----
  const query: GetProductsQuery = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: search || undefined,
      sort: "oldest",
      status: "pending",
    }),
    [page, search]
  );

  const { data, isLoading, isFetching, error, refetch } =
    useModeratorListPendingProductsQuery(query);

  // ---- Category lookup ----
  const { data: categoryTreeData } = useGetCategoryTreeQuery();
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        map.set(n.id, n.name);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(categoryTreeData?.data ?? []);
    return map;
  }, [categoryTreeData?.data]);

  const products: Product[] = useMemo(
    () => (data?.data ?? []).map(normalizeQueueRow),
    [data?.data]
  );

  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const pages = pagination?.pages ?? 1;

  const [reviewProduct, { isLoading: isReviewing }] =
    useModeratorReviewProductMutation();

  // ---- Handlers ----
  const handleApprove = async (product: Product) => {
    if (!isUuid(product.id)) {
      toast.error("This product can't be approved — invalid id.");
      return;
    }
    try {
      await reviewProduct({ productId: product.id, approved: true }).unwrap();
      toast.success(`"${product.name ?? "Product"}" approved.`);
      setReviewing(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleReject = async (
    product: Product,
    reason: string,
    notes?: string
  ) => {
    if (!isUuid(product.id)) {
      toast.error("This product can't be rejected — invalid id.");
      return;
    }
    try {
      await reviewProduct({
        productId: product.id,
        approved: false,
        rejection_reason: reason,
        notes,
      }).unwrap();
      toast.success(`"${product.name ?? "Product"}" rejected.`);
      setConfirmReject(null);
      setReviewing(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // ---- Render ----
  return (
    <div className="min-h-screen bg-transparent py-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#3E2F2A]">
              Pending Products
            </h1>
            <p className="text-[#A89F91] text-sm mt-1">
              Review products submitted by sellers. Approve to publish, or
              reject with a reason.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={() => navigate("/moderator/sellers")}
              className="text-sm px-5 py-2.5 rounded-2xl border border-[#E6DFD3] bg-white text-[#6B6159] font-medium hover:bg-[#F9F6F0] transition-colors"
            >
              Sellers queue
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#8B3A2B] border border-[#8B3A2B] rounded-2xl text-sm font-medium text-white hover:bg-[#6B2A1E] disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD3] p-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F91]"
            />
            <input
              type="text"
              placeholder="Search by name, SKU, seller name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#F9F6F0] border border-[#E6DFD3] rounded-2xl py-3 pl-11 pr-4 text-sm text-[#3E2F2A] placeholder:text-[#A89F91] outline-none focus:border-[#8B3A2B] focus:bg-white focus:ring-2 focus:ring-[#8B3A2B]/20 transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-start gap-4">
            <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-bold">
                Couldn't load pending products.
              </p>
              <p className="text-xs text-red-600 mt-1">
                {extractErrorMessage(error)}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs px-4 py-2 rounded-xl border border-red-200 text-red-700 font-medium hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <SkeletonGrid />
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const isExpanded = expandedId === product.id;
              return (
                <PendingProductCard
                  key={product.id}
                  product={product}
                  categoryName={
                    product.category?.name ??
                    (product.category_id
                      ? categoryNameById.get(product.category_id)
                      : undefined)
                  }
                  isExpanded={isExpanded}
                  isReviewing={isReviewing}
                  onToggle={() =>
                    setExpandedId(isExpanded ? null : product.id)
                  }
                  onView={() => setReviewing(product)}
                  onApprove={() => handleApprove(product)}
                  onReject={() => setConfirmReject(product)}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between bg-white rounded-3xl shadow-sm border border-[#E6DFD3] px-6 py-4">
            <p className="text-sm text-[#A89F91]">
              Showing {(page - 1) * PAGE_LIMIT + 1}–
              {Math.min(page * PAGE_LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2.5 rounded-full hover:bg-[#F0EBE1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} className="text-[#6B6159]" />
              </button>
              <span className="text-sm font-semibold text-[#3E2F2A]">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-2.5 rounded-full hover:bg-[#F0EBE1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} className="text-[#6B6159]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review drawer */}
      {reviewing && (
        <ReviewDrawer
          product={reviewing}
          categoryName={
            reviewing.category?.name ??
            (reviewing.category_id
              ? categoryNameById.get(reviewing.category_id)
              : undefined)
          }
          isReviewing={isReviewing}
          onClose={() => setReviewing(null)}
          onApprove={() => handleApprove(reviewing)}
          onReject={() => {
            setConfirmReject(reviewing);
            setReviewing(null);
          }}
        />
      )}

      {/* Reject dialog */}
      {confirmReject && (
        <RejectDialog
          product={confirmReject}
          isSubmitting={isReviewing}
          onCancel={() => setConfirmReject(null)}
          onSubmit={(reason, notes) =>
            handleReject(confirmReject, reason, notes)
          }
        />
      )}
    </div>
  );
};

export default ModeratorProductApproval;

// ============================================================
// PENDING PRODUCT CARD
// ============================================================

const PendingProductCard = ({
  product,
  categoryName,
  isExpanded,
  isReviewing,
  onToggle,
  onView,
  onApprove,
  onReject,
}: {
  product: Product;
  categoryName?: string;
  isExpanded: boolean;
  isReviewing: boolean;
  onToggle: () => void;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const imageUrl = getPrimaryImageUrl(product);
  const images = Array.isArray(product.images) ? product.images : [];
  const canReview = product.status === "pending" && isUuid(product.id);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD3] overflow-hidden transition-all duration-200">
      <div className="p-5 flex items-start gap-5">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#F9F6F0] border border-[#E6DFD3] shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name ?? "Product"}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-[#A89F91]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-bold text-[#3E2F2A] truncate">
              {product.name || "Untitled product"}
            </h3>
            {product.status && (
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  STATUS_BADGE[product.status] ??
                  "bg-[#F0EBE1] text-[#6B6159]"
                }`}
              >
                {product.status.replace("_", " ")}
              </span>
            )}
          </div>

          <p className="text-xs text-[#A89F91] mt-1.5 font-medium">
            SKU: {product.sku || "—"}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-[#6B6159] font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} className="text-[#A89F91]" />
              {formatPrice(product.price)}
            </span>
            <span className="flex items-center gap-1.5">
              <Boxes size={14} className="text-[#A89F91]" />
              {product.stock_quantity ?? 0} in stock
            </span>
            {product.store?.name && (
              <span className="flex items-center gap-1.5">
                <Store size={14} className="text-[#A89F91]" />
                {product.store.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-[#F9F6F0] p-1.5 rounded-2xl border border-[#E6DFD3]">
          {canReview && (
            <>
              <button
                onClick={onApprove}
                disabled={isReviewing}
                className="p-2 rounded-xl hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                title="Approve"
              >
                <CheckCircle size={18} className="text-emerald-600" />
              </button>
              <button
                onClick={onReject}
                disabled={isReviewing}
                className="p-2 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                title="Reject"
              >
                <XCircle size={18} className="text-red-600" />
              </button>
            </>
          )}

          <button
            onClick={onView}
            className="p-2 rounded-xl hover:bg-white transition-colors"
            title="View details"
          >
            <Eye size={18} className="text-[#6B6159]" />
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-white transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUp size={18} className="text-[#6B6159]" />
            ) : (
              <ChevronDown size={18} className="text-[#6B6159]" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-[#F0EBE1] bg-[#F9F6F0]/30 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-4">
            <Field label="Type" value={product.type} />
            <Field label="Condition" value={product.condition} />
            <Field label="Visibility" value={product.visibility} />
            <Field label="Category" value={categoryName} />
            <Field
              label="Weight"
              value={
                product.weight
                  ? `${product.weight} ${product.weight_unit ?? "kg"}`
                  : undefined
              }
            />
            <Field
              label="Tags"
              value={product.tags?.length ? product.tags.join(", ") : undefined}
            />
          </div>

          {product.short_description && (
            <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-1">
                Short description
              </p>
              <p className="text-sm text-[#3E2F2A]">
                {product.short_description}
              </p>
            </div>
          )}

          {product.description && (
            <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-1">
                Description
              </p>
              <p className="text-sm text-[#3E2F2A] whitespace-pre-line line-clamp-6">
                {product.description}
              </p>
            </div>
          )}

          {images.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-3">
                Images ({images.length})
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <a
                    key={img.id ?? `${idx}-${img.url}`}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-24 h-24 rounded-xl overflow-hidden bg-[#F9F6F0] shrink-0 border border-[#E6DFD3] hover:border-[#8B3A2B] transition-colors"
                  >
                    <img
                      src={img.url}
                      alt={img.alt_text ?? product.name ?? "Product image"}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// REVIEW DRAWER
// ============================================================

const ReviewDrawer = ({
  product,
  categoryName,
  isReviewing,
  onClose,
  onApprove,
  onReject,
}: {
  product: Product;
  categoryName?: string;
  isReviewing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const canFetchDetail = isUuid(product.id);

  const { data: detailData, isLoading: isDetailLoading } =
    useModeratorGetProductQuery(product.id, {
      skip: !canFetchDetail,
    });

  const detail: ModerationProductSnapshot | null = detailData?.data ?? null;
  const full = detail?.product ?? product;
  const seller = detail?.seller ?? null;
  const store = detail?.store ?? product.store;
  const stats = detail?.stats;

  const images = useMemo(
    () => normalizeProductImages(full?.images),
    [full?.images]
  );

  const imageUrl = getPrimaryImageUrl({ ...full, images } as Product);

  const canReview = full.status === "pending" && isUuid(full.id);

  return (
    <div
      className="fixed inset-0 bg-[#3E2F2A]/40 backdrop-blur-sm z-50 flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#F9F6F0] h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#E6DFD3] px-6 py-5 flex items-center justify-between z-10">
          <h2 className="text-xl font-serif font-bold text-[#3E2F2A]">
            Review product
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F0EBE1] text-[#6B6159] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {canFetchDetail && isDetailLoading ? (
            <div className="text-center py-12 text-sm text-[#A89F91] font-medium">
              Loading details…
            </div>
          ) : (
            <>
              {imageUrl && (
                <div className="aspect-video bg-[#F0EBE1] rounded-3xl overflow-hidden border border-[#E6DFD3]">
                  <img
                    src={imageUrl}
                    alt={full.name ?? "Product"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="bg-white p-5 rounded-3xl border border-[#E6DFD3]">
                <h3 className="text-2xl font-serif font-bold text-[#3E2F2A]">
                  {full.name || "Untitled product"}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-2xl font-bold text-[#8B3A2B]">
                    {formatPrice(full.price)}
                  </p>
                  {full.compare_at_price && (
                    <p className="text-sm text-[#A89F91] line-through font-medium">
                      {formatPrice(full.compare_at_price)}
                    </p>
                  )}
                </div>
                {full.short_description && (
                  <p className="text-sm text-[#6B6159] mt-3">
                    {full.short_description}
                  </p>
                )}
              </div>

              {seller && (
                <InfoBox title="Seller" icon={<User size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-bold">
                    {seller.legal_business_name}
                  </p>
                  {seller.trading_name &&
                    seller.trading_name !== seller.legal_business_name && (
                      <p className="text-xs text-[#A89F91] mt-0.5">
                        Trading as {seller.trading_name}
                      </p>
                    )}
                  {seller.user && (
                    <div className="mt-2 pt-2 border-t border-[#F0EBE1]">
                      <p className="text-xs text-[#6B6159] font-medium">
                        {seller.user.full_name}
                      </p>
                      <p className="text-xs text-[#A89F91]">
                        {seller.user.email}
                      </p>
                    </div>
                  )}
                </InfoBox>
              )}

              {store && (
                <InfoBox title="Store" icon={<Store size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-bold">
                    {store.name}
                  </p>
                  <p className="text-xs text-[#A89F91] mt-0.5">/{store.slug}</p>
                </InfoBox>
              )}

              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat label="Views" value={stats.views} />
                  <MiniStat label="Wishlists" value={stats.wishlist_count} />
                  <MiniStat label="Orders" value={stats.order_count} />
                  <MiniStat
                    label="Rating"
                    value={Number(stats.average_rating ?? 0).toFixed(1)}
                    sub={`${stats.total_reviews} reviews`}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InfoBox title="Type" icon={<Tag size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium capitalize">
                    {full.type ?? "—"}
                  </p>
                </InfoBox>
                <InfoBox title="Condition" icon={<Tag size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium capitalize">
                    {(full.condition ?? "—").replace(/_/g, " ")}
                  </p>
                </InfoBox>
                <InfoBox title="Stock" icon={<Boxes size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium">
                    {full.stock_quantity ?? 0} units
                  </p>
                </InfoBox>
                <InfoBox title="SKU" icon={<Package size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium">
                    {full.sku || "—"}
                  </p>
                </InfoBox>
                <InfoBox title="Category" icon={<Tag size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium capitalize">
                    {categoryName ?? "—"}
                  </p>
                </InfoBox>
                <InfoBox title="Visibility" icon={<Tag size={14} />}>
                  <p className="text-sm text-[#3E2F2A] font-medium capitalize">
                    {full.visibility ?? "—"}
                  </p>
                </InfoBox>
              </div>

              {full.description && (
                <div className="bg-white p-5 rounded-3xl border border-[#E6DFD3]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-2">
                    Description
                  </p>
                  <p className="text-sm text-[#3E2F2A] whitespace-pre-line">
                    {full.description}
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-[#E6DFD3]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-3">
                    Images ({images.length})
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <a
                        key={img.id ?? `${idx}-${img.url}`}
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-xl overflow-hidden bg-[#F9F6F0] border border-[#E6DFD3] hover:border-[#8B3A2B] transition-colors"
                      >
                        <img
                          src={img.url}
                          alt={img.alt_text ?? full.name ?? "Product image"}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {full.tags && full.tags.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-[#E6DFD3]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-3">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {full.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1 rounded-full bg-[#F0EBE1] text-[#6B6159] font-medium border border-[#E6DFD3]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {canReview ? (
          <div className="sticky bottom-0 bg-white border-t border-[#E6DFD3] px-6 py-5 flex items-center gap-4">
            <button
              onClick={onReject}
              disabled={isReviewing}
              className="flex-1 px-5 py-3 rounded-2xl border border-red-200 text-red-700 font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              disabled={isReviewing}
              className="flex-1 px-5 py-3 rounded-2xl bg-[#8B3A2B] text-white font-bold hover:bg-[#6B2A1E] disabled:opacity-50 transition-colors shadow-sm"
            >
              {isReviewing ? "Approving…" : "Approve"}
            </button>
          </div>
        ) : (
          <div className="sticky bottom-0 bg-white border-t border-[#E6DFD3] px-6 py-5 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-[#E6DFD3] text-[#6B6159] font-bold hover:bg-[#F9F6F0] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// REJECT DIALOG
// ============================================================

const RejectDialog = ({
  product,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  product: Product;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string, notes?: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    onSubmit(reason.trim(), notes.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 bg-[#3E2F2A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#E6DFD3]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <XCircle size={28} className="text-red-600" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#3E2F2A]">
            Reject product
          </h3>
          <p className="text-sm text-[#A89F91] mt-2">
            "{product.name || "Product"}" will be rejected. The seller will
            see your reason.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6B6159] uppercase tracking-wider mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Image quality is too low, price seems incorrect…"
              className="w-full bg-[#F9F6F0] border border-[#E6DFD3] rounded-2xl px-4 py-3 text-sm text-[#3E2F2A] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 min-h-[100px] transition-all"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B6159] uppercase tracking-wider mb-2">
              Internal notes{" "}
              <span className="text-[#A89F91] font-normal normal-case">
                (optional)
              </span>
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Only visible to moderators"
              className="w-full bg-[#F9F6F0] border border-[#E6DFD3] rounded-2xl px-4 py-3 text-sm text-[#3E2F2A] outline-none focus:border-[#8B3A2B] focus:ring-2 focus:ring-[#8B3A2B]/20 transition-all"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl border border-[#E6DFD3] text-[#6B6159] font-bold hover:bg-[#F9F6F0] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="px-5 py-2.5 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSubmitting ? "Rejecting…" : "Reject product"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SMALL HELPERS
// ============================================================

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91]">
      {label}
    </p>
    <p className="text-sm font-semibold text-[#3E2F2A] capitalize mt-0.5">
      {value || "—"}
    </p>
  </div>
);

const InfoBox = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl p-4 border border-[#E6DFD3]">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mb-2">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const MiniStat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) => (
  <div className="bg-white rounded-2xl p-4 text-center border border-[#E6DFD3]">
    <p className="text-xl font-bold text-[#8B3A2B]">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89F91] mt-1">
      {label}
    </p>
    {sub && <p className="text-[10px] text-[#A89F91] mt-0.5">{sub}</p>}
  </div>
);

const SkeletonGrid = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-3xl shadow-sm border border-[#E6DFD3] p-5 flex items-start gap-5 animate-pulse"
      >
        <div className="w-24 h-24 rounded-2xl bg-[#F0EBE1]" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-5 bg-[#F0EBE1] rounded-full w-1/3" />
          <div className="h-3 bg-[#F0EBE1] rounded-full w-1/4" />
          <div className="h-3 bg-[#F0EBE1] rounded-full w-1/2 mt-4" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD3] p-16 text-center">
    <div className="w-20 h-20 bg-[#F9F6F0] rounded-full flex items-center justify-center mx-auto mb-6">
      <Package size={40} className="text-[#A89F91]" />
    </div>
    <h2 className="text-xl font-serif font-bold text-[#3E2F2A] mb-2">
      No pending products
    </h2>
    <p className="text-sm text-[#A89F91] max-w-sm mx-auto">
      When sellers submit products for approval, they'll appear here.
    </p>
  </div>
);

// ============================================================
// UTILITIES
// ============================================================

const extractErrorMessage = (err: unknown): string => {
  const e = err as {
    data?: { message?: string; errors?: string[] };
    message?: string;
  };
  if (e?.data?.errors?.length) return e.data.errors.join(", ");
  if (e?.data?.message) return e.data.message;
  if (e?.message) return e.message;
  return "Something went wrong.";
};

const formatPrice = (
  amount: number | null | undefined,
  currency = "KSH"
): string => {
  const value =
    typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};