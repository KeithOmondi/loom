import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Smartphone, Store, ChevronRight } from 'lucide-react';
import { useGetCategoryTreeQuery } from '../../api/categoryApi';
import { useListProductsQuery, type Product } from '../../api/productApi';
import { ProductCard, ProductGridSkeleton } from '../../components/store/ProductCard';
import { discountPercent, imageAt } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useFetch } from '../../lib/http';
import { formatKES } from '../../lib/format';

const TRUST = [
  { icon: Smartphone, title: 'Pay with M-Pesa', text: 'Fast, familiar mobile checkout' },
  { icon: ShieldCheck, title: 'Verified sellers', text: 'Every seller is checked before selling' },
  { icon: Store, title: 'Local community', text: 'Support sellers near you' },
];

const Section = ({ title, to, children }: { title: string; to: string; children: React.ReactNode }) => (
  <section className="mx-auto mt-10 max-w-7xl px-4">
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-xl font-bold text-warm-gray-900">{title}</h2>
      <Link to={to} className="flex items-center text-sm font-medium text-accent-700 hover:text-accent-800">
        See all <ChevronRight size={16} />
      </Link>
    </div>
    {children}
  </section>
);

const Grid = ({ products }: { products: Product[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {products.map((p) => (
      <ProductCard key={p.id} product={p} />
    ))}
  </div>
);

interface FlashItem { product_id: string; name: string; slug: string; price: number; sale_price: number; remaining: number | null; image: string | null }
interface FlashSale { id: string; title: string; ends_at: string; items: FlashItem[] }
interface BannerRow { id: string; title: string; subtitle: string | null; image_url: string | null; link_url: string | null }

const useCountdown = (endsAt: string) => {
  const [left, setLeft] = useState(() => new Date(endsAt).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  const s = Math.max(0, Math.floor(left / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return { over: left <= 0, text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` };
};

const FlashSaleBand = ({ sale }: { sale: FlashSale }) => {
  const { over, text } = useCountdown(sale.ends_at);
  if (over) return null;
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-5 text-white">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">⚡ {sale.title}</h2>
          <span className="rounded-lg bg-white/20 px-3 py-1 font-mono text-sm" aria-label="Time left">Ends in {text}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {sale.items.slice(0, 5).map((it) => (
            <Link key={it.product_id} to={`/product/${it.slug}`} className="rounded-xl bg-white p-3 text-warm-gray-900 hover:shadow-lg">
              <img src={imageAt(it.image, 300)} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <p className="mt-2 line-clamp-2 text-sm">{it.name}</p>
              <p className="font-bold text-red-600">{formatKES(Number(it.sale_price))}</p>
              <p className="text-xs text-warm-gray-500 line-through">{formatKES(Number(it.price))}</p>
              {it.remaining !== null && <p className="mt-1 text-xs font-medium text-orange-700">{it.remaining} left</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  useDocumentTitle('');

  const { data: tree } = useGetCategoryTreeQuery({ depth_max: 1, include_product_count: false });
  const { data: newest, isLoading: loadingNew, isError } = useListProductsQuery({ sort: 'newest', limit: 40 });
  const { data: featured } = useListProductsQuery({ is_featured: true, limit: 10 });

  const content = useFetch<{ data: { banners: BannerRow[]; flash_sales: FlashSale[] } }>('/storefront/home');
  const banners = content.data?.data.banners ?? [];
  const flashSales = content.data?.data.flash_sales ?? [];
  const departments = tree?.data ?? [];
  const latest = newest?.data ?? [];
  const deals = latest
    .filter((p) => discountPercent(p.price, p.compare_at_price) > 0)
    .sort((a, b) => discountPercent(b.price, b.compare_at_price) - discountPercent(a.price, a.compare_at_price))
    .slice(0, 10);
  const heroProduct = deals[0] ?? latest[0];
  const heroImage = heroProduct?.images?.find((i) => i.is_primary) ?? heroProduct?.images?.[0];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto mt-4 grid max-w-7xl gap-3 px-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-800 via-accent-700 to-accent-500 p-8 text-white lg:col-span-2 lg:p-12">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-100">Welcome to Loom</p>
          <h1 className="mt-2 max-w-md text-3xl font-bold leading-tight sm:text-4xl">
            Shop from trusted sellers in your community
          </h1>
          <p className="mt-3 max-w-md text-accent-100">
            Electronics, fashion, home and more — paid for easily with M-Pesa.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-accent-800 hover:bg-accent-50"
          >
            Start shopping
          </Link>
          {heroImage && (
            <img
              src={imageAt(heroImage.url, 400)}
              alt=""
              className="pointer-events-none absolute -bottom-6 -right-6 hidden h-64 w-64 rotate-6 rounded-2xl object-cover opacity-90 shadow-2xl md:block"
            />
          )}
        </div>
        <div className="grid gap-3">
          <Link
            to="/shop?sort=newest"
            className="flex flex-col justify-center rounded-2xl bg-accent-100 p-6 hover:bg-accent-300/60"
          >
            <p className="text-sm font-medium text-accent-800">Just in</p>
            <p className="mt-1 text-lg font-bold text-warm-gray-900">New arrivals</p>
            <p className="text-sm text-warm-gray-600">See what sellers added lately</p>
          </Link>
          <Link
            to="/register"
            className="flex flex-col justify-center rounded-2xl bg-warm-gray-900 p-6 text-white hover:bg-warm-gray-800"
          >
            <p className="text-sm font-medium text-accent-300">For businesses</p>
            <p className="mt-1 text-lg font-bold">Sell on Loom</p>
            <p className="text-sm text-warm-gray-300">Open your store and reach new customers</p>
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto mt-4 grid max-w-7xl gap-3 px-4 sm:grid-cols-3">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl border border-warm-gray-200 bg-white p-4">
            <Icon className="shrink-0 text-accent-700" size={24} />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-warm-gray-600">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Admin-managed banners */}
      {banners.length > 0 && (
        <section className="mx-auto mt-4 grid max-w-7xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => {
            const inner = (
              <div className="relative flex h-32 flex-col justify-end overflow-hidden rounded-2xl bg-warm-gray-900 p-4 text-white" style={b.image_url ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,.1)), url(${b.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                <p className="text-lg font-bold">{b.title}</p>
                {b.subtitle && <p className="text-sm text-white/80">{b.subtitle}</p>}
              </div>
            );
            return b.link_url ? <Link key={b.id} to={b.link_url}>{inner}</Link> : <div key={b.id}>{inner}</div>;
          })}
        </section>
      )}

      {flashSales.map((fs) => <FlashSaleBand key={fs.id} sale={fs} />)}

      {/* Categories */}
      {departments.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {departments.map((d) => (
              <Link
                key={d.id}
                to={`/shop?category=${d.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-warm-gray-200 bg-white p-4 text-center transition hover:border-accent-300 hover:shadow-sm"
              >
                {d.image_url ? (
                  <img src={d.image_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-xl font-bold text-accent-800">
                    {d.name.charAt(0)}
                  </span>
                )}
                <span className="text-sm font-medium text-warm-gray-800">{d.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      {loadingNew && (
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <ProductGridSkeleton count={5} />
        </section>
      )}

      {isError && (
        <p className="mx-auto mt-10 max-w-7xl px-4 text-center text-sm text-warm-gray-600">
          We couldn&apos;t load products right now. Please refresh in a moment.
        </p>
      )}

      {!loadingNew && !isError && latest.length === 0 && (
        <p className="mx-auto mt-10 max-w-7xl px-4 text-center text-warm-gray-600">
          Products are on their way — check back soon.
        </p>
      )}

      {deals.length > 0 && (
        <Section title="Top deals" to="/shop?sort=price_asc">
          <Grid products={deals} />
        </Section>
      )}

      {(featured?.data.length ?? 0) > 0 && (
        <Section title="Featured" to="/shop">
          <Grid products={featured!.data} />
        </Section>
      )}

      {latest.length > 0 && (
        <Section title="New arrivals" to="/shop?sort=newest">
          <Grid products={latest.slice(0, 10)} />
        </Section>
      )}
    </div>
  );
};

export default HomePage;
