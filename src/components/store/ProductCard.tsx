import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '../../api/productApi';
import { useAddToCartMutation } from '../../api/cartApi';
import { NO_IMAGE, discountPercent, formatKES, imageAt } from '../../lib/format';

export const isPurchasable = (p: Pick<Product, 'stock_status' | 'stock_quantity' | 'allow_backorders'>) =>
  p.stock_status !== 'out_of_stock' && (p.stock_quantity > 0 || p.allow_backorders);

export const ProductCard = ({ product }: { product: Product }) => {
  const [addToCart, { isLoading }] = useAddToCartMutation();
  const image = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const off = discountPercent(product.price, product.compare_at_price);
  const available = isPurchasable(product);

  const quickAdd = async () => {
    try {
      await addToCart({ product_id: product.id, quantity: 1 }).unwrap();
      toast.success('Added to cart');
    } catch (err: any) {
      toast.error(err?.data?.error ?? err?.data?.message ?? 'Could not add to cart');
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-warm-gray-200 bg-white transition hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square bg-warm-gray-100">
        <img
          src={imageAt(image?.url, 400) || NO_IMAGE}
          alt={image?.alt_text ?? product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {off > 0 && (
          <span className="absolute right-2 top-2 rounded-md bg-accent-100 px-1.5 py-0.5 text-xs font-bold text-accent-800">
            -{off}%
          </span>
        )}
        {!available && (
          <span className="absolute inset-x-0 bottom-0 bg-warm-gray-900/70 py-1 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          to={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm text-warm-gray-800 hover:text-accent-700"
        >
          {product.name}
        </Link>

        <div className="mt-1">
          <p className="text-base font-semibold text-warm-gray-900">{formatKES(product.price)}</p>
          {off > 0 && product.compare_at_price && (
            <p className="text-xs text-warm-gray-500 line-through">{formatKES(product.compare_at_price)}</p>
          )}
        </div>

        {product.total_reviews > 0 && (
          <p className="flex items-center gap-1 text-xs text-warm-gray-600">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {product.average_rating.toFixed(1)} ({product.total_reviews})
          </p>
        )}

        <div className="mt-auto pt-2">
          {product.has_variants || !available ? (
            <Link
              to={`/product/${product.slug}`}
              className="block rounded-lg border border-warm-gray-300 py-2 text-center text-sm font-medium text-warm-gray-700 hover:border-accent-700 hover:text-accent-700"
            >
              {available ? 'Choose options' : 'View details'}
            </Link>
          ) : (
            <button
              onClick={quickAdd}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-700 py-2 text-sm font-medium text-white transition hover:bg-accent-800 disabled:opacity-60"
            >
              <ShoppingCart size={16} />
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-warm-gray-200 bg-white">
        <div className="aspect-square bg-warm-gray-100" />
        <div className="space-y-2 p-3">
          <div className="h-3 w-5/6 rounded bg-warm-gray-100" />
          <div className="h-3 w-2/3 rounded bg-warm-gray-100" />
          <div className="h-5 w-1/3 rounded bg-warm-gray-100" />
        </div>
      </div>
    ))}
  </div>
);
