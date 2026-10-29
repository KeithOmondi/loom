// src/pages/seller/SellerInventory.tsx

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import {
  useGetMyProductsQuery,
  useDeleteProductMutation,
  useSubmitProductForApprovalMutation,
  type Product,
  type ProductStatus,
  type GetProductsQuery,
} from '../../api/productApi';
import { useGetMyStoresQuery } from '../../api/storeApi';
import {
  selectCanAddProducts,
  selectCanEditStore,
  selectCurrentStore,
  selectCurrentStoreStatus,
} from '../../store/slices/storeSlice';
import {
  setProductFilters,
  resetProductFilters,
  setSelectedProductId,
  setProductFlash,
  clearProductFlash,
  selectProductFilters,
  selectSelectedProductId,
  selectProductFlash,
} from '../../store/slices/productSlice';

// ============================================
// CONSTANTS
// ============================================

const STATUS_OPTIONS: { value: ProductStatus; label: string; tone: string }[] = [
  { value: 'draft', label: 'Draft', tone: 'bg-slate-100 text-slate-700' },
  { value: 'pending', label: 'Pending review', tone: 'bg-amber-100 text-amber-800' },
  { value: 'active', label: 'Active', tone: 'bg-emerald-100 text-emerald-800' },
  { value: 'suspended', label: 'Suspended', tone: 'bg-orange-100 text-orange-800' },
  { value: 'rejected', label: 'Rejected', tone: 'bg-rose-100 text-rose-800' },
  { value: 'discontinued', label: 'Discontinued', tone: 'bg-slate-200 text-slate-600' },
];

const statusMeta = (status: ProductStatus) =>
  STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);

// Statuses a seller is allowed to submit for approval.
const SUBMITTABLE: ProductStatus[] = ['draft', 'rejected'];

// ============================================
// COMPONENT
// ============================================

const SellerInventory = () => {
  const dispatch = useDispatch();

  const filters = useSelector(selectProductFilters);
  const selectedId = useSelector(selectSelectedProductId);
  const flash = useSelector(selectProductFlash);

  const currentStore = useSelector(selectCurrentStore);
  const storeStatus = useSelector(selectCurrentStoreStatus);
  const canAddProducts = useSelector(selectCanAddProducts);
  const canEditStore = useSelector(selectCanEditStore);

  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  // ------------------------------------------------------------
  // Data
  // ------------------------------------------------------------

  const { data: storesData, isLoading: storesLoading } = useGetMyStoresQuery();

  const storeId = currentStore?.id ?? storesData?.data?.[0]?.id;

  // Scope the list to the active store when we have one.
  const scopedFilters: GetProductsQuery = useMemo(
    () => ({ ...filters, store_id: storeId }),
    [filters, storeId],
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetMyProductsQuery(scopedFilters, {
    skip: !storeId,
    refetchOnMountOrArgChange: true,
  });

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [submitForApproval, { isLoading: isSubmitting }] =
    useSubmitProductForApprovalMutation();

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  // Clear selection when the page/filter set changes.
  useEffect(() => {
    setChecked(new Set());
    dispatch(setSelectedProductId(null));
  }, [filters.page, filters.status, filters.search, storeId, dispatch]);

  // Auto-dismiss flash messages.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => dispatch(clearProductFlash()), 3500);
    return () => clearTimeout(t);
  }, [flash, dispatch]);

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(
      setProductFilters({
        search: searchInput.trim() || undefined,
        page: 1,
      }),
    );
  };

  const toggleStatus = (status: ProductStatus) => {
    const active = filters.status;
    const list = Array.isArray(active) ? active : active ? [active] : [];
    const next = list.includes(status)
      ? list.filter((s) => s !== status)
      : [...list, status];

    dispatch(
      setProductFilters({
        status: next.length ? (next as ProductStatus[]) : undefined,
        page: 1,
      }),
    );
  };

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allOnPageChecked =
    products.length > 0 && products.every((p) => checked.has(p.id));

  const toggleAllOnPage = () => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (allOnPageChecked) products.forEach((p) => next.delete(p.id));
      else products.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id).unwrap();
      dispatch(setProductFlash(`"${product.name}" deleted.`));
      setConfirmDelete(null);
    } catch {
      dispatch(setProductFlash('Could not delete that product. Try again.'));
    }
  };

  const handleBulkSubmit = async () => {
    const targets = products.filter(
      (p) => checked.has(p.id) && SUBMITTABLE.includes(p.status),
    );
    if (!targets.length) {
      dispatch(setProductFlash('No draft or rejected products selected.'));
      return;
    }
    try {
      await Promise.all(targets.map((p) => submitForApproval(p.id).unwrap()));
      dispatch(
        setProductFlash(
          `${targets.length} product${targets.length > 1 ? 's' : ''} submitted for review.`,
        ),
      );
      setChecked(new Set());
    } catch {
      dispatch(setProductFlash('Some products could not be submitted.'));
    }
  };

  // ------------------------------------------------------------
  // Gating — no store yet, or store can't hold products
  // ------------------------------------------------------------

  if (!storesLoading && !storeId) {
    return (
      <EmptyState
        title="No store yet"
        body="Create a store before you can list products."
        ctaLabel="Create a store"
        ctaTo="/store-setup"
      />
    );
  }

  if (storeStatus && !canAddProducts) {
    return (
      <EmptyState
        title="Store isn't ready for products"
        body={
          storeStatus.block_reason ??
          'Your store must be active before you can add or edit products.'
        }
        ctaLabel={canEditStore ? 'Go to store settings' : 'View store status'}
        ctaTo="/seller/store"
      />
    );
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination
              ? `${pagination.total} product${pagination.total === 1 ? '' : 's'}`
              : 'Manage your product catalogue'}
            {currentStore ? ` · ${currentStore.name}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>

        </div>
      </header>

      {/* Flash */}
      {flash && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          {flash}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={applySearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products by name, SKU, barcode…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = Array.isArray(filters.status)
              ? filters.status.includes(opt.value)
              : filters.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? opt.tone
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}

          {(filters.status || filters.search) && (
            <button
              type="button"
              onClick={() => {
                dispatch(resetProductFilters());
                setSearchInput('');
              }}
              className="ml-auto text-xs font-medium text-slate-500 underline hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk bar */}
        {checked.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-700">
              {checked.size} selected
            </span>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Submit for approval
            </button>
            <button
              type="button"
              onClick={() => setChecked(new Set())}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="p-8 text-center text-sm text-rose-600">
            Failed to load products.{' '}
            {(error as { data?: { message?: string } })?.data?.message ?? ''}
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No products found</p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust your filters or add your first product.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add product
            </Link>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageChecked}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const meta = statusMeta(product.status);
                const isSelected = selectedId === product.id;
                return (
                  <tr
                    key={product.id}
                    onClick={() => dispatch(setSelectedProductId(product.id))}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(product.id)}
                        onChange={() => toggleChecked(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                          {product.images?.[0]?.url && (
                            <img
                              src={product.images[0].url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {product.sku ?? product.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                      {product.status === 'rejected' && product.rejection_reason && (
                        <p className="mt-1 text-xs text-rose-600">
                          {product.rejection_reason}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {currency(product.price)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          product.stock_quantity > 0
                            ? 'text-slate-800'
                            : 'text-rose-600'
                        }
                      >
                        {product.stock_quantity}
                      </span>
                    </td>

                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/products"
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(product)}
                          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || isFetching}
                onClick={() =>
                  dispatch(setProductFilters({ page: pagination.page - 1 }))
                }
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages || isFetching}
                onClick={() =>
                  dispatch(setProductFilters({ page: pagination.page + 1 }))
                }
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete product?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{confirmDelete.name}</span> will be
              removed from your store. This can't be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const EmptyState = ({
  title,
  body,
  ctaLabel,
  ctaTo,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
}) => (
  <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <p className="mt-2 text-sm text-slate-600">{body}</p>
    <Link
      to={ctaTo}
      className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      {ctaLabel}
    </Link>
  </div>
);

const TableSkeleton = () => (
  <div className="divide-y divide-slate-100">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
        <div className="h-4 w-4 rounded bg-slate-200" />
        <div className="h-10 w-10 rounded bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-1/5 rounded bg-slate-200" />
        </div>
        <div className="h-3 w-16 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

export default SellerInventory;