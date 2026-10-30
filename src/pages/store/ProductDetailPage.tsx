import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetProductBySlugQuery, useListProductsQuery, type Product, type ProductAttributeValue } from '../../api/productApi';
import { useAddToCartMutation } from '../../api/cartApi';
import { ProductCard, isPurchasable } from '../../components/store/ProductCard';
import { WishlistHeart } from '../account/MiscPages';
import { Btn, Card, Field, Spinner, fmtDate, inputCls } from '../../components/ui/kit';
import { NO_IMAGE, discountPercent, formatKES, imageAt } from '../../lib/format';
import { request, useAction, useFetch } from '../../lib/http';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useAppSelector } from '../../store/hooks';

interface Variant { id: string; name: string; options: Record<string, string>; price: number; compare_at_price: number | null; stock_quantity: number; image_url: string | null }
interface Review { id: string; rating: number; title: string | null; comment: string | null; is_verified_purchase: boolean; created_at: string; user?: { full_name: string } }
interface Question { id: string; question: string; answer: string | null; asker: string; created_at: string }

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

const conditionLabel: Record<string, string> = { new: 'New', used_like_new: 'Used — like new', used_good: 'Used — good', used_fair: 'Used — fair', refurbished: 'Refurbished' };

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-warm-gray-300'} />)}
  </span>
);

const NotFound = () => (
  <div className="mx-auto max-w-xl px-4 py-20 text-center">
    <h1 className="text-xl font-bold">Product not found</h1>
    <p className="mt-2 text-warm-gray-600">This product may have been removed or is no longer available.</p>
    <Link to="/shop" className="mt-6 inline-block rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-medium text-white">Keep shopping</Link>
  </div>
);

const ProductDetailPage = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const isAuthed = useAppSelector((s) => s.auth.isAuthenticated);
  const { data, isLoading, isError } = useGetProductBySlugQuery({ slug });
  const product: Product | undefined = data?.data;
  const variantsQ = useFetch<{ data: Variant[] }>(product?.has_variants ? `/products/${product.id}/variants` : null);
  const reviewsQ = useFetch<{ data: Review[]; summary: { average_rating: number; total_reviews: number } }>(product ? `/products/${product.id}/reviews?limit=10` : null);
  const questionsQ = useFetch<{ data: Question[] }>(product ? `/products/${product.id}/questions` : null);
  const storeQ = useFetch<{ data: { id: string; name: string; slug: string } }>(product ? `/stores/${product.store_id}` : null);

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'details' | 'reviews' | 'qa'>('details');
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();
  const variants = variantsQ.data?.data ?? [];

  useDocumentTitle(product?.name ?? '');
  useEffect(() => { setActiveImage(0); setQty(1); setVariantId(null); }, [product?.id]);

  // schema.org Product markup + meta description, for search engines
  useEffect(() => {
    if (!product) return;
    const img = product.images?.[0]?.url;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.short_description ?? product.description ?? undefined,
      sku: product.sku ?? undefined,
      image: img ? [imageAt(img, 900)] : undefined,
      offers: {
        '@type': 'Offer',
        url: window.location.href,
        priceCurrency: 'KES',
        price: product.price,
        availability: isPurchasable(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      },
      ...(product.total_reviews > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.average_rating, reviewCount: product.total_reviews } } : {}),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = `${product.name} — ${formatKES(product.price)}. Buy on Loom with M-Pesa and protected payments.`;
    return () => { script.remove(); if (meta && previous !== undefined) meta.content = previous; };
  }, [product]);
  useEffect(() => { if (!variantId && variants.length) setVariantId((variants.find((v) => v.stock_quantity > 0) ?? variants[0]).id); }, [variants, variantId]);

  const { data: related } = useListProductsQuery({ category_id: product?.category_id ?? undefined, limit: 6, sort: 'popular' }, { skip: !product?.category_id });

  if (isLoading) return <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-8 md:grid-cols-2"><div className="aspect-square rounded-2xl bg-warm-gray-200" /><div className="space-y-4"><div className="h-6 w-3/4 rounded bg-warm-gray-200" /><div className="h-8 w-1/3 rounded bg-warm-gray-200" /></div></div>;
  if (isError || !product) return <NotFound />;

  const variant = variants.find((v) => v.id === variantId);
  const needsVariant = product.has_variants && !variant;
  const price = variant?.price ?? product.price;
  const compareAt = variant?.compare_at_price ?? product.compare_at_price;
  const off = discountPercent(price, compareAt);
  const stockQty = variant ? variant.stock_quantity : product.stock_quantity;
  const available = variant ? variant.stock_quantity > 0 || product.allow_backorders : isPurchasable(product);
  const maxQty = product.allow_backorders ? 99 : Math.max(1, Math.min(stockQty, 99));

  const images = product.images?.length ? [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order) : [];
  const mainImage = (variant?.image_url && activeImage === 0 ? variant.image_url : images[activeImage]?.url) ?? '';
  const specs = (product.attributes ?? []).map((a) => ({ name: a.attribute.name, value: attributeValue(a) })).filter((s): s is { name: string; value: string } => !!s.value);

  const onAdd = async (buyNow = false) => {
    try {
      await addToCart({ product_id: product.id, variant_id: variant?.id ?? null, quantity: qty }).unwrap();
      if (buyNow) navigate('/checkout'); else toast.success('Added to cart');
    } catch (err: any) {
      toast.error(err?.data?.error ?? err?.data?.message ?? 'Could not add to cart');
    }
  };

  const relatedProducts = (related?.data ?? []).filter((p) => p.id !== product.id).slice(0, 5);
  const rs = reviewsQ.data?.summary;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 text-sm text-warm-gray-500">
        <Link to="/" className="hover:text-accent-700">Home</Link> <span className="mx-1">/</span>
        {product.category && <><Link to={`/shop?category=${product.category.slug}`} className="hover:text-accent-700">{product.category.name}</Link> <span className="mx-1">/</span></>}
        <span className="text-warm-gray-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 rounded-2xl border border-warm-gray-200 bg-white p-4 md:grid-cols-2 md:p-6">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-warm-gray-100"><img src={imageAt(mainImage, 900) || NO_IMAGE} alt={images[activeImage]?.alt_text ?? product.name} className="h-full w-full object-contain" /></div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImage(i)} aria-label={`Show image ${i + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? 'border-accent-700' : 'border-transparent'}`}>
                  <img src={imageAt(img.url, 150)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-warm-gray-600">
            {!!rs?.total_reviews && <button onClick={() => setTab('reviews')} className="flex items-center gap-1.5 hover:underline"><Stars value={rs.average_rating} /> {rs.average_rating.toFixed(1)} ({rs.total_reviews})</button>}
            {product.condition !== 'new' && <span className="rounded-full bg-warm-gray-100 px-2 py-0.5 text-xs">{conditionLabel[product.condition] ?? product.condition}</span>}
            {storeQ.data && <span>Sold by <Link to={`/store/${storeQ.data.data.slug}`} className="font-medium text-accent-700 hover:underline">{storeQ.data.data.name}</Link></span>}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-3xl font-bold">{formatKES(price)}</p>
            {off > 0 && compareAt && <><p className="text-warm-gray-500 line-through">{formatKES(compareAt)}</p><span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-sm font-bold text-accent-800">-{off}%</span></>}
          </div>
          <p className={`mt-2 text-sm font-medium ${available ? 'text-green-700' : 'text-red-600'}`}>{!available ? 'Out of stock' : stockQty > 0 && stockQty <= product.low_stock_threshold ? `Only ${stockQty} left` : 'In stock'}</p>
          {product.short_description && <p className="mt-3 text-sm text-warm-gray-700">{product.short_description}</p>}

          {variants.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Choose an option</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button key={v.id} disabled={v.stock_quantity <= 0 && !product.allow_backorders} onClick={() => { setVariantId(v.id); setQty(1); }}
                    className={`rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${v.id === variantId ? 'border-accent-700 bg-accent-50 text-accent-800' : 'border-warm-gray-300 hover:border-accent-300'}`}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-warm-gray-300">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="p-2.5 disabled:opacity-40"><Minus size={16} /></button>
              <span className="w-10 text-center text-sm font-medium" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity" className="p-2.5 disabled:opacity-40"><Plus size={16} /></button>
            </div>
            <button onClick={() => onAdd(false)} disabled={!available || adding || needsVariant} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent-700 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              <ShoppingCart size={18} /> {adding ? 'Adding…' : 'Add to cart'}
            </button>
            <button onClick={() => onAdd(true)} disabled={!available || adding || needsVariant} className="rounded-lg border border-accent-700 px-6 py-3 text-sm font-semibold text-accent-700 hover:bg-accent-50 disabled:opacity-50">Buy now</button>
            <WishlistHeart productId={product.id} />
          </div>

          <ul className="mt-6 space-y-2 rounded-xl bg-warm-gray-50 p-4 text-sm text-warm-gray-700">
            <li className="flex gap-2"><Truck size={16} className="mt-0.5 shrink-0 text-accent-700" /> Delivery fee and estimated arrival are shown at checkout for your location.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent-700" /> Pay with M-Pesa. Your money is protected until you confirm delivery.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-warm-gray-200 bg-white">
        <div className="flex gap-1 border-b border-warm-gray-100 px-4" role="tablist">
          {([['details', 'Details'], ['reviews', `Reviews${rs?.total_reviews ? ` (${rs.total_reviews})` : ''}`], ['qa', `Questions${questionsQ.data?.data.length ? ` (${questionsQ.data.data.length})` : ''}`]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === k ? 'border-accent-700 text-accent-800' : 'border-transparent text-warm-gray-600'}`}>{label}</button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'details' && (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-3 text-lg font-bold">Description</h2>
                {product.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-warm-gray-700">{product.description}</p> : <p className="text-sm text-warm-gray-500">The seller hasn&apos;t added a description yet.</p>}
              </div>
              <div>
                <h2 className="mb-3 text-lg font-bold">Specifications</h2>
                <dl className="divide-y divide-warm-gray-100 text-sm">
                  {product.sku && <Spec name="SKU" value={product.sku} />}
                  <Spec name="Condition" value={conditionLabel[product.condition] ?? product.condition} />
                  {product.weight ? <Spec name="Weight" value={`${product.weight} ${product.weight_unit}`} /> : null}
                  {specs.map((s) => <Spec key={s.name} name={s.name} value={s.value} />)}
                </dl>
              </div>
            </div>
          )}
          {tab === 'reviews' && <Reviews productId={product.id} q={reviewsQ} isAuthed={isAuthed} />}
          {tab === 'qa' && <QA productId={product.id} q={questionsQ} isAuthed={isAuthed} />}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
};

const Spec = ({ name, value }: { name: string; value: string }) => (
  <div className="flex justify-between gap-4 py-2"><dt className="text-warm-gray-500">{name}</dt><dd className="text-right font-medium text-warm-gray-800">{value}</dd></div>
);

const Reviews = ({ productId, q, isAuthed }: { productId: string; q: ReturnType<typeof useFetch<{ data: Review[]; summary: { average_rating: number; total_reviews: number } }>>; isAuthed: boolean }) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const { busy, run } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('post', '/products/reviews', { product_id: productId, rating, title: title || undefined, comment: comment || undefined }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Thanks! Your review will appear once it has been checked.');
    setTitle(''); setComment('');
    await q.reload();
  };
  const reviews = q.data?.data ?? [];
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {q.loading ? <Spinner /> : reviews.length === 0 ? <p className="text-sm text-warm-gray-500">No reviews yet. Be the first once you&apos;ve received this product.</p> : (
          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-warm-gray-100 pb-5 text-sm">
                <div className="flex items-center gap-2"><Stars value={r.rating} />{r.is_verified_purchase && <span className="text-xs font-medium text-green-700">Verified purchase</span>}</div>
                {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                {r.comment && <p className="mt-1 text-warm-gray-700">{r.comment}</p>}
                <p className="mt-1 text-xs text-warm-gray-500">{r.user?.full_name ?? 'Customer'} · {fmtDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card title="Write a review">
        {!isAuthed ? <p className="text-sm"><Link to="/login" className="text-accent-700 underline">Sign in</Link> to review a product you&apos;ve received.</p> : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star size={24} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-warm-gray-300'} /></button>)}</div>
            <Field label="Title (optional)"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
            <Field label="Your review"><textarea className={inputCls} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} /></Field>
            <Btn type="submit" busy={busy}>Submit review</Btn>
            <p className="text-xs text-warm-gray-500">Only customers who received this product can review it.</p>
          </form>
        )}
      </Card>
    </div>
  );
};

const QA = ({ productId, q, isAuthed }: { productId: string; q: ReturnType<typeof useFetch<{ data: Question[] }>>; isAuthed: boolean }) => {
  const [question, setQuestion] = useState('');
  const { busy, run } = useAction();
  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('post', `/products/${productId}/questions`, { question }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Question sent to the seller.');
    setQuestion('');
    await q.reload();
  };
  const items = q.data?.data ?? [];
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {q.loading ? <Spinner /> : items.length === 0 ? <p className="text-sm text-warm-gray-500">No questions yet.</p> : (
          <ul className="space-y-4 text-sm">
            {items.map((it) => (
              <li key={it.id} className="border-b border-warm-gray-100 pb-4">
                <p><span className="font-semibold">Q:</span> {it.question} <span className="text-xs text-warm-gray-500">— {it.asker}</span></p>
                {it.answer ? <p className="mt-1 text-warm-gray-700"><span className="font-semibold">A:</span> {it.answer}</p> : <p className="mt-1 text-xs text-warm-gray-400">Waiting for the seller to answer.</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card title="Ask the seller">
        {!isAuthed ? <p className="text-sm"><Link to="/login" className="text-accent-700 underline">Sign in</Link> to ask a question.</p> : (
          <form onSubmit={ask} className="space-y-3">
            <textarea className={inputCls} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Does it come with a warranty?" maxLength={500} />
            <Btn type="submit" busy={busy} disabled={question.trim().length < 5}>Ask</Btn>
            <p className="text-xs text-warm-gray-500">Phone numbers, emails and links aren&apos;t allowed.</p>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProductDetailPage;
