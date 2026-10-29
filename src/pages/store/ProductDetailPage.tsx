import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetProductBySlugQuery,
  useListProductsQuery,
  type Product,
  type ProductAttributeValue,
} from '../../api/productApi';
import { useAddToCartMutation } from '../../api/cartApi';
import { ProductCard, isPurchasable } from '../../components/store/ProductCard';
import { NO_IMAGE, discountPercent, formatKES, imageAt } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const attributeValue = (a: ProductAttributeValue): string | null => {
  if (a.options?.length) return a.options.map((o) => o.value).join(', ');
  if (a.option) return a.option.value;
  if (a.value_text) return a.value_text;
  if (a.value_number !== null && a.value_number !== undefined) {
    const unit = a.attribute.validation?.unit;
    return unit ? `${a.value_number} ${unit}` : String(a.value_number);
  }
  if (a.value_boolean !== null && a.value_boolean !== undefined) return a.value_boolean ? 'Yes' : 'No';
  return a.value_date;
};

const conditionLabel: Record<string, string> = {
  new: 'New',
  used_like_new: 'Used — like new',
  used_good: 'Used — good',
  used_fair: 'Used — fair',
  refurbished: 'Refurbished',
};

const NotFound = () => (
  <div className="mx-auto max-w-xl px-4 py-20 text-center">
    <h1 className="text-xl font-bold">Product not found</h1>
    <p className="mt-2 text-warm-gray-600">This product may have been removed or is no longer available.</p>
    <Link to="/shop" className="mt-6 inline-block rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-medium text-white">
      Keep shopping
    </Link>
  </div>
);

const ProductDetailPage = () => {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useGetProductBySlugQuery({ slug });
  const product: Product | undefined = data?.data;

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();

  useDocumentTitle(product?.name ?? '');

  useEffect(() => {
    setActiveImage(0);
    setQty(1);
  }, [product?.id]);

  const { data: related } = useListProductsQuery(
    { category_id: product?.category_id ?? undefined, limit: 6, sort: 'popular' },
    { skip: !product?.category_id },
  );

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-8 md:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-warm-gray-200" />
        <div className="space-y-4">
          <div className="h-6 w-3/4 rounded bg-warm-gray-200" />
          <div className="h-8 w-1/3 rounded bg-warm-gray-200" />
          <div className="h-24 rounded bg-warm-gray-200" />
        </div>
      </div>
    );
  }
  if (isError || !product) return <NotFound />;

  // The cart API prices every line at the base product price, so variant products can't be
  // ordered on the web until the server supports variants.
  const hasUnsupportedVariants = product.has_variants;
  const price = product.price;
  const compareAt = product.compare_at_price;
  const off = discountPercent(price, compareAt);
  const stockQty = product.stock_quantity;
  const available = isPurchasable(product);
  const maxQty = product.allow_backorders ? 99 : Math.max(1, Math.min(stockQty, 99));

  const images = product.images?.length
    ? [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    : [];
  const mainImage = images[activeImage]?.url ?? '';

  const specs = (product.attributes ?? [])
    .map((a) => ({ name: a.attribute.name, value: attributeValue(a) }))
    .filter((s): s is { name: string; value: string } => !!s.value);

  const onAdd = async () => {
    try {
      await addToCart({ product_id: product.id, quantity: qty }).unwrap();
      toast.success('Added to cart');
    } catch (err: any) {
      toast.error(err?.data?.error ?? err?.data?.message ?? 'Could not add to cart');
    }
  };

  const relatedProducts = (related?.data ?? []).filter((p) => p.id !== product.id).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 text-sm text-warm-gray-500">
        <Link to="/" className="hover:text-accent-700">Home</Link> <span className="mx-1">/</span>
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-accent-700">
              {product.category.name}
            </Link>{' '}
            <span className="mx-1">/</span>
          </>
        )}
        <span className="text-warm-gray-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 rounded-2xl border border-warm-gray-200 bg-white p-4 md:grid-cols-2 md:p-6">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-warm-gray-100">
            <img
              src={imageAt(mainImage, 900) || NO_IMAGE}
              alt={images[activeImage]?.alt_text ?? product.name}
              className="h-full w-full object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === activeImage ? 'border-accent-700' : 'border-transparent'
                  }`}
                >
                  <img src={imageAt(img.url, 150)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-warm-gray-600">
            {product.total_reviews > 0 && (
              <span className="flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {product.average_rating.toFixed(1)} ({product.total_reviews} reviews)
              </span>
            )}
            {product.condition !== 'new' && (
              <span className="rounded-full bg-warm-gray-100 px-2 py-0.5 text-xs">
                {conditionLabel[product.condition] ?? product.condition}
              </span>
            )}
            {product.store && (
              <span>
                Sold by <span className="font-medium text-warm-gray-800">{product.store.name}</span>
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-3xl font-bold">{formatKES(price)}</p>
            {off > 0 && compareAt && (
              <>
                <p className="text-warm-gray-500 line-through">{formatKES(compareAt)}</p>
                <span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-sm font-bold text-accent-800">-{off}%</span>
              </>
            )}
          </div>

          <p className={`mt-2 text-sm font-medium ${available ? 'text-green-700' : 'text-red-600'}`}>
            {!available
              ? 'Out of stock'
              : stockQty > 0 && stockQty <= product.low_stock_threshold
                ? `Only ${stockQty} left`
                : 'In stock'}
          </p>

          {product.short_description && (
            <p className="mt-3 text-sm text-warm-gray-700">{product.short_description}</p>
          )}

          {hasUnsupportedVariants && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              This product comes in several options that can&apos;t be ordered on the website yet. Please order it in
              the Loom mobile app.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-warm-gray-300">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="p-2.5 disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-medium" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Increase quantity"
                className="p-2.5 disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={onAdd}
              disabled={!available || adding || hasUnsupportedVariants}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <ShoppingCart size={18} />
              {adding ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-warm-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Description</h2>
          {product.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-warm-gray-700">{product.description}</p>
          ) : (
            <p className="text-sm text-warm-gray-500">The seller hasn&apos;t added a description yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-warm-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-bold">Specifications</h2>
          <dl className="divide-y divide-warm-gray-100 text-sm">
            {product.sku && <Spec name="SKU" value={product.sku} />}
            <Spec name="Condition" value={conditionLabel[product.condition] ?? product.condition} />
            {product.weight ? <Spec name="Weight" value={`${product.weight} ${product.weight_unit}`} /> : null}
            {specs.map((s) => (
              <Spec key={s.name} name={s.name} value={s.value} />
            ))}
          </dl>
        </section>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const Spec = ({ name, value }: { name: string; value: string }) => (
  <div className="flex justify-between gap-4 py-2">
    <dt className="text-warm-gray-500">{name}</dt>
    <dd className="text-right font-medium text-warm-gray-800">{value}</dd>
  </div>
);

export default ProductDetailPage;
