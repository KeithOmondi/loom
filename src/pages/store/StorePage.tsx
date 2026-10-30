import { Link, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useListProductsQuery } from '../../api/productApi';
import { ProductCard, ProductGridSkeleton } from '../../components/store/ProductCard';
import { ErrorBox, Spinner } from '../../components/ui/kit';
import { useFetch } from '../../lib/http';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

interface StoreData {
  id: string; name: string; slug: string; description?: string | null; logo_url?: string | null; banner_url?: string | null;
  rating?: number | null; total_reviews?: number | null; return_policy?: string | null; shipping_policy?: string | null; city?: string | null;
}

/** Public storefront for one seller: banner, logo, rating, policies and their products. */
const StorePage = () => {
  const { slug = '' } = useParams();
  const { data, loading, error, reload } = useFetch<{ data: StoreData }>(`/stores/slug/${slug}`);
  const store = data?.data;
  const { data: products, isLoading } = useListProductsQuery({ store_id: store?.id, limit: 40, sort: 'newest' }, { skip: !store?.id });
  useDocumentTitle(store?.name ?? 'Store');

  if (loading) return <Spinner />;
  if (error || !store) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorBox message="We couldn't find that store." onRetry={reload} /><p className="mt-4 text-center"><Link to="/shop" className="text-accent-700 underline">Back to shop</Link></p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-warm-gray-200 bg-white">
        <div className="h-36 bg-gradient-to-r from-accent-700 to-accent-500 sm:h-48" style={store.banner_url ? { backgroundImage: `url(${store.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-accent-100 text-2xl font-bold text-accent-800 shadow">
            {store.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full object-cover" /> : store.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <h1 className="text-xl font-bold">{store.name}</h1>
            <p className="text-sm text-warm-gray-600">
              {!!store.rating && <span className="mr-3 inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{Number(store.rating).toFixed(1)} ({store.total_reviews ?? 0})</span>}
              {store.city}
            </p>
          </div>
        </div>
        {store.description && <p className="border-t border-warm-gray-100 px-6 py-4 text-sm text-warm-gray-700">{store.description}</p>}
      </div>

      {(store.shipping_policy || store.return_policy) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {store.shipping_policy && <div className="rounded-xl border border-warm-gray-200 bg-white p-4 text-sm"><h2 className="mb-1 font-semibold">Shipping policy</h2><p className="whitespace-pre-line text-warm-gray-700">{store.shipping_policy}</p></div>}
          {store.return_policy && <div className="rounded-xl border border-warm-gray-200 bg-white p-4 text-sm"><h2 className="mb-1 font-semibold">Return policy</h2><p className="whitespace-pre-line text-warm-gray-700">{store.return_policy}</p></div>}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold">Products</h2>
      {isLoading ? <ProductGridSkeleton count={8} /> : !products?.data.length ? <p className="rounded-xl border border-dashed border-warm-gray-300 bg-white p-10 text-center text-sm text-warm-gray-500">This store has no products yet.</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{products.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </div>
  );
};

export default StorePage;
