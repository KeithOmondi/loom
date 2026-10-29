// src/pages/seller/ProductsPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  RefreshCw,
  Store,
  Box,
  Tag,
  Layers,
  Weight,
  Barcode,
  Calendar,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import {
  useGetMyProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSubmitProductForApprovalMutation,
  type Product,
  type ProductStatus,
  type GetProductsQuery,
  type CreateProductInput,
  type UpdateProductInput,
} from "../../api/productApi";
import {
  useGetCategoryTreeQuery,
  useGetCategoryAttributesQuery,
} from "../../api/categoryApi";
import { useGetMyStoresQuery } from "../../api/storeApi";

// ✅ Attribute-aware components
import CategoryPicker from "./CategoryPicker";
import AttributeFields, {
  formStateToPayload,
  payloadToFormState,
  findMissingRequired,
  type AttributeFormState,
} from "./AttributeFields";

// ✅ NEW: image uploader
import ProductImageUploader, {
  type UploaderImage,
} from "./ProductImageUploader";

// ============================================================
// CONSTANTS
// ============================================================

const PAGE_LIMIT = 12;

const STATUS_FILTERS: { value: "all" | ProductStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "discontinued", label: "Discontinued" },
];

const STATUS_BADGE: Record<ProductStatus, string> = {
  draft: "bg-stone-100 text-stone-700",
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
  discontinued: "bg-stone-200 text-stone-600",
};

const getPrimaryImageUrl = (product: Product | null | undefined): string | undefined => {
  if (!product?.images?.length) return undefined;
  const primary = product.images.find((i) => i.is_primary);
  if (primary) return primary.url;
  return [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
};

const sortedImages = (product: Product) =>
  [...(product.images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

// ============================================================
// PAGE
// ============================================================

const ProductsPage = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: storesData, isLoading: storesLoading } = useGetMyStoresQuery();

  const stores = storesData?.data ?? [];
  const activeStore = stores.find((s) => s.is_active) ?? stores[0] ?? null;
  const storeId = activeStore?.id ?? null;

  const query: GetProductsQuery = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      sort: "newest",
    }),
    [page, search, statusFilter]
  );

  const { data, isLoading, isFetching, error, refetch } =
    useGetMyProductsQuery(query);

  const products = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const pages = pagination?.pages ?? 1;

  const [submitForApproval, { isLoading: isSubmitting }] =
    useSubmitProductForApprovalMutation();
  const [deleteProduct, { isLoading: isDeleting }] =
    useDeleteProductMutation();

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const onStatusChange = (status: "all" | ProductStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleAddProductClick = () => {
    if (!storeId) {
      toast.error("Create a store first before adding products.");
      navigate("/store-setup");
      return;
    }
    setShowCreateDrawer(true);
  };

  const handleSubmitForApproval = async (product: Product) => {
    try {
      await submitForApproval(product.id).unwrap();
      toast.success(`"${product.name}" submitted for approval.`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteProduct(confirmDeleteId).unwrap();
      toast.success("Product deleted.");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center bg-white/60 backdrop-blur-md rounded-2xl p-8 border border-white/80 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-800 mx-auto" />
          <p className="mt-4 text-stone-600 font-medium">Loading your store…</p>
        </div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="max-w-md w-full bg-white/60 backdrop-blur-xl rounded-3xl shadow-sm border border-white/80 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Store size={28} className="text-amber-800" />
          </div>
          <h1 className="text-2xl font-serif text-stone-900 mb-2">
            You need a store first
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            Products live inside a store. Set one up before adding your catalog.
          </p>
          <button
            onClick={() => navigate("/store-setup")}
            className="w-full flex items-center justify-center gap-2 bg-amber-800 text-white rounded-xl py-3 font-medium hover:bg-amber-700 transition-colors"
          >
            <Store size={18} />
            Create your store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-stone-900">
              My Products
            </h1>
            <p className="text-stone-500 text-sm mt-2 max-w-lg">
              Manage your catalog. Submit drafts for approval to go live.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/80 bg-white/60 text-stone-700 hover:bg-white/80 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
              <span className="text-sm font-medium hidden sm:inline">
                Refresh
              </span>
            </button>
            <button
              onClick={handleAddProductClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 text-white font-medium hover:bg-amber-700 shadow-sm shadow-amber-800/20 transition-all"
            >
              <Plus size={18} />
              Add product
            </button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm p-5 space-y-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              placeholder="Search by name, SKU, or description…"
              value={search}
              onChange={onSearchChange}
              className="w-full bg-white/70 border border-white/80 rounded-2xl py-3 pl-11 pr-4 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/10 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onStatusChange(f.value)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  statusFilter === f.value
                    ? "bg-amber-800 text-white shadow-sm"
                    : "bg-white/60 text-stone-600 hover:bg-white/90 border border-white/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-md border border-red-200/60 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle
              size={20}
              className="text-red-600 shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">
                Couldn't load products.
              </p>
              <p className="text-xs text-red-600 mt-1">
                {extractErrorMessage(error)}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200/80 text-red-700 hover:bg-red-100/50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <EmptyState
            hasFilters={Boolean(search) || statusFilter !== "all"}
            onClearFilters={() => {
              setSearch("");
              setStatusFilter("all");
              setPage(1);
            }}
            onCreate={handleAddProductClick}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSubmitting={isSubmitting}
                onView={() => setViewingProduct(product)}
                onEdit={() => setEditingProduct(product)}
                onSubmit={() => handleSubmitForApproval(product)}
                onDelete={() => setConfirmDeleteId(product.id)}
              />
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm px-5 py-3">
            <p className="text-sm text-stone-600">
              Showing {(page - 1) * PAGE_LIMIT + 1}–
              {Math.min(page * PAGE_LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-white/60"
              >
                <ChevronLeft size={18} className="text-stone-600" />
              </button>
              <span className="text-sm font-semibold text-stone-800">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-2 rounded-xl hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-transparent hover:border-white/60"
              >
                <ChevronRight size={18} className="text-stone-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateDrawer && storeId && (
        <ProductFormDrawer
          mode="create"
          storeId={storeId}
          onClose={() => setShowCreateDrawer(false)}
          onSuccess={() => {
            setShowCreateDrawer(false);
            toast.success("Product created.");
          }}
        />
      )}

      {editingProduct && (
        <ProductFormDrawer
          mode="edit"
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            toast.success("Product updated.");
          }}
        />
      )}

      {viewingProduct && (
        <ProductViewModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onEdit={() => {
            setEditingProduct(viewingProduct);
            setViewingProduct(null);
          }}
          onSubmit={async () => {
            await handleSubmitForApproval(viewingProduct);
            setViewingProduct(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete product?"
          message="This will remove the product from your catalog. It cannot be undone."
          confirmLabel="Delete"
          destructive
          isLoading={isDeleting}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default ProductsPage;

// ============================================================
// PRODUCT CARD
// ============================================================

const ProductCard = ({
  product,
  isSubmitting,
  onView,
  onEdit,
  onSubmit,
  onDelete,
}: {
  product: Product;
  isSubmitting: boolean;
  onView: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}) => {
  const canSubmit =
    product.status === "draft" || product.status === "rejected";
  const canDelete = product.status !== "active";
  const canEdit =
    product.status !== "suspended" && product.status !== "discontinued";

  const imageUrl = getPrimaryImageUrl(product);

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:bg-white/90">
      <div className="aspect-square bg-stone-100 relative m-2 rounded-2xl overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-stone-300" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
            STATUS_BADGE[product.status]
          }`}
        >
          {product.status.replace("_", " ")}
        </span>
      </div>

      <div className="px-4 pb-4 pt-1 flex-1 flex flex-col">
        <h3 className="font-semibold text-stone-900 text-sm line-clamp-2">
          {product.name}
        </h3>
        <p className="text-[11px] text-stone-500 mt-1 truncate font-medium">
          SKU: {product.sku || "—"}
        </p>

        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="text-lg font-bold text-stone-900">
              {formatPrice(product.price)}
            </p>
            {product.compare_at_price && (
              <p className="text-[11px] text-stone-400 line-through font-medium">
                {formatPrice(product.compare_at_price)}
              </p>
            )}
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
              product.stock_quantity > 0
                ? "bg-stone-100 text-stone-600"
                : "bg-red-50 text-red-700"
            }`}
          >
            {product.stock_quantity > 0
              ? `${product.stock_quantity} in stock`
              : "Out of stock"}
          </span>
        </div>

        {product.status === "rejected" && product.rejection_reason && (
          <div className="mt-3 p-2 bg-red-50/80 rounded-xl border border-red-100">
            <p className="text-[10px] text-red-700 font-medium line-clamp-2">
              {product.rejection_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-white/80">
          <button
            onClick={onView}
            className="flex-1 text-[11px] font-semibold px-2 py-2 rounded-xl text-stone-600 hover:bg-white hover:text-stone-900 transition-colors flex items-center justify-center gap-1.5"
            title="View"
          >
            <Eye size={14} />
            View
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex-1 text-[11px] font-semibold px-2 py-2 rounded-xl text-stone-600 hover:bg-white hover:text-stone-900 transition-colors flex items-center justify-center gap-1.5"
              title="Edit"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          {canSubmit && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 text-[11px] font-semibold px-2 py-2 rounded-xl text-amber-800 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Submit for approval"
            >
              <Send size={14} />
              Submit
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PRODUCT VIEW MODAL
// ============================================================

const ProductViewModal = ({
  product,
  onClose,
  onEdit,
  onSubmit,
  isSubmitting,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) => {
  const images = sortedImages(product);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const activeImage = images[activeImageIndex];
  const canSubmit =
    product.status === "draft" || product.status === "rejected";
  const canEdit =
    product.status !== "suspended" && product.status !== "discontinued";

  const tags = product.tags ?? [];
  const attributes = product.attributes ?? [];

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/80 bg-white/60 backdrop-blur-xl">
          <div className="min-w-0 flex items-center gap-3">
            <h2 className="text-lg font-serif font-bold text-stone-900 truncate">
              {product.name}
            </h2>
            <span
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                STATUS_BADGE[product.status]
              }`}
            >
              {product.status.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Left — gallery */}
            <div className="space-y-3">
              <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden relative">
                {activeImage ? (
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    className="w-full h-full"
                  >
                    <img
                      src={activeImage.url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={64} className="text-stone-300" />
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                        idx === activeImageIndex
                          ? "border-amber-800"
                          : "border-transparent hover:border-stone-300"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right — details */}
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-stone-900">
                  {formatPrice(product.price)}
                </p>
                {product.compare_at_price && (
                  <p className="text-sm text-stone-400 line-through font-medium mt-1">
                    {formatPrice(product.compare_at_price)}
                  </p>
                )}
              </div>

              {product.short_description && (
                <p className="text-sm text-stone-600 leading-relaxed">
                  {product.short_description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                <DetailRow icon={Barcode} label="SKU" value={product.sku || "—"} />
                <DetailRow
                  icon={Package}
                  label="Stock"
                  value={
                    product.stock_quantity > 0
                      ? `${product.stock_quantity} units`
                      : "Out of stock"
                  }
                />
                <DetailRow
                  icon={Layers}
                  label="Type"
                  value={product.type}
                  capitalize
                />
                <DetailRow
                  icon={Star}
                  label="Condition"
                  value={product.condition.replace("_", " ")}
                  capitalize
                />
                {product.weight != null && (
                  <DetailRow
                    icon={Weight}
                    label="Weight"
                    value={`${product.weight} ${product.weight_unit ?? ""}`}
                  />
                )}
                <DetailRow
                  icon={Calendar}
                  label="Updated"
                  value={formatDate(product.updated_at)}
                />
              </div>

              {product.status === "rejected" && product.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs font-semibold text-red-800 mb-1">
                    Rejection reason
                  </p>
                  <p className="text-xs text-red-700">
                    {product.rejection_reason}
                  </p>
                </div>
              )}

              {product.description && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                    Description
                  </p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {tags.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-stone-100 text-stone-700"
                      >
                        <Tag size={11} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {attributes.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                    Attributes
                  </p>
                  <dl className="space-y-1.5">
                    {attributes.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <dt className="text-stone-500 shrink-0">
                          {a.attribute.name}
                        </dt>
                        <dd className="text-stone-800 font-medium text-right">
                          {formatAttributeValue(a)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer — actions */}
        <div className="border-t border-white/80 bg-white/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {canSubmit && (
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-amber-800/30 text-amber-800 hover:bg-amber-50 font-medium disabled:opacity-50 transition-colors"
              >
                <Send size={15} />
                Submit for approval
              </button>
            )}
            {canEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-800 text-white hover:bg-amber-700 font-medium shadow-sm shadow-amber-800/20 transition-all"
              >
                <Pencil size={15} />
                Edit product
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {galleryOpen && activeImage && (
        <div
          className="fixed inset-0 z-[60] bg-stone-900/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setGalleryOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setGalleryOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close image"
          >
            <X size={22} />
          </button>
          <img
            src={activeImage.url}
            alt={product.name}
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(idx);
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === activeImageIndex
                      ? "border-amber-400"
                      : "border-white/30 hover:border-white/60"
                  }`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
}) => (
  <div className="flex items-start gap-2">
    <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
        {label}
      </p>
      <p
        className={`text-xs font-medium text-stone-800 truncate ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

// ============================================================
// SKELETON + EMPTY STATE
// ============================================================

const ProductGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/80 overflow-hidden animate-pulse"
      >
        <div className="aspect-square bg-stone-200/50 m-2 rounded-2xl" />
        <div className="px-4 pb-4 pt-1 space-y-3">
          <div className="h-4 bg-stone-200/50 rounded w-3/4" />
          <div className="h-3 bg-stone-200/50 rounded w-1/2" />
          <div className="h-5 bg-stone-200/50 rounded w-1/3 mt-4" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({
  hasFilters,
  onClearFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) => (
  <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm p-12 text-center">
    <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/80">
      <Box size={40} className="text-stone-400" />
    </div>
    <h2 className="text-xl font-serif text-stone-900 mb-2">
      {hasFilters ? "No products match your filters" : "No products yet"}
    </h2>
    <p className="text-sm text-stone-500 mb-8 max-w-sm mx-auto">
      {hasFilters
        ? "Try adjusting the search or status filter to find what you're looking for."
        : "Add your first product to start selling and building your catalog."}
    </p>
    {hasFilters ? (
      <button
        onClick={onClearFilters}
        className="px-6 py-2.5 rounded-xl border border-white/80 bg-white/60 text-stone-700 hover:bg-white/90 font-medium transition-colors shadow-sm"
      >
        Clear filters
      </button>
    ) : (
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-800 text-white font-medium hover:bg-amber-700 shadow-sm shadow-amber-800/20 transition-all"
      >
        <Plus size={18} />
        Add your first product
      </button>
    )}
  </div>
);

// ============================================================
// PRODUCT FORM DRAWER — unchanged
// ============================================================

const ProductFormDrawer = ({
  mode,
  product,
  storeId,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  product?: Product;
  storeId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const isSaving = isCreating || isUpdating;

  const { data: categoryTreeData } = useGetCategoryTreeQuery();
  const categoryTree = categoryTreeData?.data ?? [];

  const flatCategories = useMemo(() => {
    const out: { id: string; name: string; depth: number }[] = [];
    const walk = (nodes: typeof categoryTree, depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, name: n.name, depth });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    };
    walk(categoryTree, 0);
    return out;
  }, [categoryTree]);
  void flatCategories;

  const [attributeValues, setAttributeValues] = useState<AttributeFormState>(
    () => payloadToFormState(product?.attributes as any)
  );

  const [images, setImages] = useState<UploaderImage[]>(() => {
    if (mode !== "edit" || !product?.images?.length) return [];
    return [...product.images]
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.sort_order - b.sort_order;
      })
      .map((img) => ({
        id: img.id,
        url: img.url,
        is_primary: img.is_primary,
      }));
  });

  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    short_description: product?.short_description ?? "",
    type: product?.type ?? ("physical" as const),
    condition: product?.condition ?? ("new" as const),
    visibility: product?.visibility ?? ("public" as const),
    category_id: product?.category_id ?? "",
    tags: (product?.tags ?? []).join(", "),
    price: product?.price ?? 0,
    compare_at_price: product?.compare_at_price ?? undefined,
    sku: product?.sku ?? "",
    stock_quantity: product?.stock_quantity ?? 0,
    allow_backorders: product?.allow_backorders ?? false,
    weight: product?.weight ?? undefined,
    weight_unit: product?.weight_unit ?? ("kg" as const),
    requires_shipping: product?.requires_shipping ?? true,
  });

  const { data: catAttrsData } = useGetCategoryAttributesQuery(
    form.category_id,
    { skip: !form.category_id }
  );
  const catAttributes = catAttrsData?.data?.attributes ?? [];

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCategoryChange = (categoryId: string) => {
    update("category_id", categoryId);
    setAttributeValues({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Product name must be at least 2 characters.");
      return;
    }
    if (form.price <= 0) {
      toast.error("Price must be greater than 0.");
      return;
    }
    if (form.type === "physical" && !form.weight) {
      toast.error("Physical products require a weight.");
      return;
    }
    if (
      form.compare_at_price !== undefined &&
      form.compare_at_price <= form.price
    ) {
      toast.error("Compare-at price must be greater than the regular price.");
      return;
    }

    if (form.category_id && catAttributes.length > 0) {
      const missing = findMissingRequired(catAttributes, attributeValues);
      if (missing) {
        toast.error(`Please fill in required attribute: ${missing}`);
        return;
      }
    }

    const attributesPayload = formStateToPayload(attributeValues);

    const payloadBase = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      short_description: form.short_description.trim() || undefined,
      type: form.type,
      condition: form.condition,
      visibility: form.visibility,
      category_id: form.category_id || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      price: form.price,
      compare_at_price: form.compare_at_price,
      sku: form.sku || undefined,
      stock_quantity: form.stock_quantity,
      allow_backorders: form.allow_backorders,
      weight: form.weight,
      weight_unit: form.weight_unit,
      requires_shipping: form.requires_shipping,
      attributes:
        attributesPayload.length > 0 ? attributesPayload : undefined,
    };

    const filesForUpload: File[] = [];
    const primaryImage = images.find((img) => img.is_primary && img.file);
    if (primaryImage?.file) filesForUpload.push(primaryImage.file);
    for (const img of images) {
      if (img.file && img !== primaryImage) filesForUpload.push(img.file);
    }

    try {
      if (mode === "create") {
        if (!storeId) {
          toast.error("Store ID is missing. Refresh the page and try again.");
          return;
        }
        const createPayload: CreateProductInput = {
          ...payloadBase,
          status: "draft",
        };
        await createProduct({
          storeId,
          input: createPayload,
          images: filesForUpload.length > 0 ? filesForUpload : undefined,
        }).unwrap();
      } else if (product) {
        const updatePayload: UpdateProductInput = { ...payloadBase };
        await updateProduct({
          productId: product.id,
          input: updatePayload,
          images: filesForUpload.length > 0 ? filesForUpload : undefined,
        }).unwrap();
      }
      onSuccess();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl h-full overflow-y-auto shadow-2xl border-l border-white/80 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-white/80 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-serif font-bold text-stone-900">
            {mode === "create" ? "Add product" : "Edit product"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 flex-1">
          <FormSection title="Basic information">
            <FormField label="Name" required>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
                placeholder="e.g. Wireless Bluetooth Headphones"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Short description">
              <input
                value={form.short_description}
                onChange={(e) => update("short_description", e.target.value)}
                className={inputClass}
                placeholder="One-line summary shown in listings"
                maxLength={500}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="Detailed product description"
                disabled={isSaving}
              />
            </FormField>
          </FormSection>

          <FormSection title="Classification">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type" required>
                <select
                  value={form.type}
                  onChange={(e) =>
                    update("type", e.target.value as typeof form.type)
                  }
                  className={inputClass}
                  disabled={isSaving}
                >
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                  <option value="service">Service</option>
                  <option value="subscription">Subscription</option>
                </select>
              </FormField>

              <FormField label="Condition">
                <select
                  value={form.condition}
                  onChange={(e) =>
                    update("condition", e.target.value as typeof form.condition)
                  }
                  className={inputClass}
                  disabled={isSaving}
                >
                  <option value="new">New</option>
                  <option value="used_like_new">Used — Like new</option>
                  <option value="used_good">Used — Good</option>
                  <option value="used_fair">Used — Fair</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </FormField>
            </div>

            <FormField label="Category">
              <CategoryPicker
                value={form.category_id}
                onChange={handleCategoryChange}
                disabled={isSaving}
              />
            </FormField>

            {form.category_id && (
              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-800 border-b border-amber-700/20 pb-2">
                  Category Attributes
                </h4>
                <AttributeFields
                  categoryId={form.category_id}
                  values={attributeValues}
                  onChange={setAttributeValues}
                  disabled={isSaving}
                />
              </div>
            )}

            <FormField label="Tags (comma-separated)">
              <input
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                className={inputClass}
                placeholder="wireless, bluetooth, audio"
                disabled={isSaving}
              />
            </FormField>
          </FormSection>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Price" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    update("price", parseFloat(e.target.value) || 0)
                  }
                  className={inputClass}
                  disabled={isSaving}
                />
              </FormField>

              <FormField label="Compare at price">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.compare_at_price ?? ""}
                  onChange={(e) =>
                    update(
                      "compare_at_price",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className={inputClass}
                  disabled={isSaving}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Inventory">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="SKU">
                <input
                  value={form.sku}
                  onChange={(e) => update("sku", e.target.value)}
                  className={inputClass}
                  disabled={isSaving}
                />
              </FormField>

              <FormField label="Stock quantity">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    update("stock_quantity", parseInt(e.target.value) || 0)
                  }
                  className={inputClass}
                  disabled={isSaving}
                />
              </FormField>
            </div>

            <label className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allow_backorders}
                onChange={(e) => update("allow_backorders", e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
                disabled={isSaving}
              />
              Allow backorders when out of stock
            </label>
          </FormSection>

          {form.type === "physical" && (
            <FormSection title="Shipping">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Weight" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.weight ?? ""}
                    onChange={(e) =>
                      update(
                        "weight",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className={inputClass}
                    disabled={isSaving}
                  />
                </FormField>

                <FormField label="Weight unit">
                  <select
                    value={form.weight_unit}
                    onChange={(e) =>
                      update(
                        "weight_unit",
                        e.target.value as typeof form.weight_unit
                      )
                    }
                    className={inputClass}
                    disabled={isSaving}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                  </select>
                </FormField>
              </div>

              <label className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requires_shipping}
                  onChange={(e) => update("requires_shipping", e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
                  disabled={isSaving}
                />
                This product requires shipping
              </label>
            </FormSection>
          )}

          <FormSection title="Product Images">
            <ProductImageUploader
              value={images}
              onChange={setImages}
              maxFiles={10}
              maxSizeBytes={10 * 1024 * 1024}
              disabled={isSaving}
            />
          </FormSection>

          <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-white/80 -mx-6 -mb-6 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-amber-800 text-white font-medium hover:bg-amber-700 disabled:opacity-50 shadow-sm shadow-amber-800/20 transition-all"
            >
              {isSaving
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                ? "Create product"
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// SMALL HELPERS
// ============================================================

const inputClass =
  "w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/10 disabled:opacity-60 transition-all shadow-sm";

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 border-b border-white/60 pb-2">
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  destructive,
  isLoading,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div
    className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 max-w-md w-full p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            destructive ? "bg-red-50" : "bg-amber-50"
          }`}
        >
          <AlertTriangle
            size={24}
            className={destructive ? "text-red-600" : "text-amber-800"}
          />
        </div>
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-900">
            {title}
          </h3>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-5 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 shadow-sm transition-all ${
            destructive
              ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
              : "bg-amber-800 hover:bg-amber-700 shadow-amber-800/20"
          }`}
        >
          {isLoading ? "Working…" : confirmLabel}
        </button>
      </div>
    </div>
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

const formatPrice = (amount: number, currency: string = "USD"): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatAttributeValue = (a: {
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  option?: { value: string } | null;
  options?: { value: string }[] | null;
}): string => {
  if (a.options?.length) return a.options.map((o) => o.value).join(", ");
  if (a.option) return a.option.value;
  if (a.value_boolean !== null) return a.value_boolean ? "Yes" : "No";
  if (a.value_number !== null) return String(a.value_number);
  if (a.value_date) return formatDate(a.value_date);
  if (a.value_text) return a.value_text;
  return "—";
};