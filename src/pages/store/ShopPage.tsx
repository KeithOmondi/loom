import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useGetCategoryTreeQuery, type CategoryNode } from '../../api/categoryApi';
import { useListProductsQuery, type GetProductsQuery } from '../../api/productApi';
import { ProductCard, ProductGridSkeleton } from '../../components/store/ProductCard';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const PAGE_SIZE = 20;

const SORTS: { value: NonNullable<GetProductsQuery['sort']>; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
];

const findBySlug = (nodes: CategoryNode[], slug: string): CategoryNode | undefined => {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const hit = n.children && findBySlug(n.children, slug);
    if (hit) return hit;
  }
  return undefined;
};

const ShopPage = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categorySlug = params.get('category') ?? '';
  const sort = (params.get('sort') as GetProductsQuery['sort']) ?? (q ? 'relevance' : 'newest');
  const minPrice = params.get('min') ?? '';
  const maxPrice = params.get('max') ?? '';
  const inStock = params.get('in_stock') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: tree } = useGetCategoryTreeQuery({ depth_max: 2, include_product_count: true });
  const nodes = useMemo(() => tree?.data ?? [], [tree]);
  const category = categorySlug ? findBySlug(nodes, categorySlug) : undefined;

  const title = category?.name ?? (q ? `Results for “${q}”` : 'All products');
  useDocumentTitle(title);

  // Wait for the category tree before querying a category-filtered list, so we never flash unfiltered results.
  const waitingForCategory = !!categorySlug && !tree;
  const query: GetProductsQuery = {
    page,
    limit: PAGE_SIZE,
    sort,
    ...(q && { search: q }),
    ...(category && { category_id: category.id, category_include_descendants: true }),
    ...(minPrice && { min_price: Number(minPrice) }),
    ...(maxPrice && { max_price: Number(maxPrice) }),
    ...(inStock && { in_stock: true }),
  };
  const { data, isFetching, isError, refetch } = useListProductsQuery(query, { skip: waitingForCategory });

  const products = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const pages = data?.pagination.pages ?? 1;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    update({ min: priceDraft.min || null, max: priceDraft.max || null });
  };

  const clearAll = () => {
    setPriceDraft({ min: '', max: '' });
    setParams(q ? { q } : {});
  };

  const hasFilters = !!(categorySlug || minPrice || maxPrice || inStock);

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Category</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              onClick={() => update({ category: null })}
              className={!categorySlug ? 'font-semibold text-accent-700' : 'text-warm-gray-700 hover:text-accent-700'}
            >
              All categories
            </button>
          </li>
          {nodes.map((d) => {
            const open = categorySlug === d.slug || d.children?.some((c) => c.slug === categorySlug);
            return (
              <li key={d.id}>
                <button
                  onClick={() => update({ category: d.slug })}
                  className={
                    categorySlug === d.slug ? 'font-semibold text-accent-700' : 'text-warm-gray-700 hover:text-accent-700'
                  }
                >
                  {d.name}
                </button>
                {open && d.children?.length > 0 && (
                  <ul className="ml-3 mt-1 space-y-1 border-l border-warm-gray-200 pl-3">
                    {d.children.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => update({ category: c.slug })}
                          className={
                            categorySlug === c.slug
                              ? 'font-semibold text-accent-700'
                              : 'text-warm-gray-600 hover:text-accent-700'
                          }
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form onSubmit={applyPrice}>
        <h3 className="mb-2 text-sm font-semibold">Price (KSh)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
            className="w-full rounded-lg border border-warm-gray-300 px-2 py-1.5 text-sm outline-none focus:border-accent-700"
          />
          <span className="text-warm-gray-400">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
            className="w-full rounded-lg border border-warm-gray-300 px-2 py-1.5 text-sm outline-none focus:border-accent-700"
          />
        </div>
        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-accent-700 py-1.5 text-sm font-medium text-white hover:bg-accent-800"
        >
          Apply
        </button>
      </form>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => update({ in_stock: e.target.checked ? 'true' : null })}
          className="h-4 w-4 accent-[#B85A38]"
        />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 text-sm text-warm-gray-500">
        <Link to="/" className="hover:text-accent-700">Home</Link> <span className="mx-1">/</span>
        <span className="text-warm-gray-800">{title}</span>
      </nav>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">{filterPanel}</aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {data && (
                <p className="text-sm text-warm-gray-600">
                  {total} {total === 1 ? 'product' : 'products'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-warm-gray-300 bg-white px-3 py-2 text-sm lg:hidden"
              >
                <SlidersHorizontal size={16} /> Filters
              </button>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value })}
                aria-label="Sort products"
                className="rounded-lg border border-warm-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-700"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              {category && <Chip label={category.name} onClear={() => update({ category: null })} />}
              {(minPrice || maxPrice) && (
                <Chip
                  label={`KSh ${minPrice || 0} – ${maxPrice || '∞'}`}
                  onClear={() => {
                    setPriceDraft({ min: '', max: '' });
                    update({ min: null, max: null });
                  }}
                />
              )}
              {inStock && <Chip label="In stock" onClear={() => update({ in_stock: null })} />}
              <button onClick={clearAll} className="text-accent-700 hover:underline">
                Clear all
              </button>
            </div>
          )}

          {isError ? (
            <div className="rounded-xl border border-warm-gray-200 bg-white p-10 text-center">
              <p className="text-warm-gray-700">We couldn&apos;t load products.</p>
              <button onClick={refetch} className="mt-3 rounded-lg bg-accent-700 px-4 py-2 text-sm text-white">
                Try again
              </button>
            </div>
          ) : isFetching || waitingForCategory ? (
            <ProductGridSkeleton count={8} />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-warm-gray-200 bg-white p-10 text-center">
              <p className="font-medium">No products found</p>
              <p className="mt-1 text-sm text-warm-gray-600">Try a different search or remove some filters.</p>
              {hasFilters && (
                <button onClick={clearAll} className="mt-3 text-sm text-accent-700 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
                className="rounded-lg border border-warm-gray-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-warm-gray-600">
                Page {page} of {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => update({ page: String(page + 1) })}
                className="rounded-lg border border-warm-gray-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
};

const Chip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <span className="flex items-center gap-1 rounded-full bg-accent-100 px-3 py-1 text-accent-800">
    {label}
    <button onClick={onClear} aria-label={`Remove ${label} filter`}>
      <X size={14} />
    </button>
  </span>
);

export default ShopPage;
