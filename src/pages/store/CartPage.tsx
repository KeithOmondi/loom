import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCartQuery, useRemoveCartItemMutation, useUpdateCartItemMutation } from '../../api/cartApi';
import { useAppSelector } from '../../store/hooks';
import { NO_IMAGE, formatKES, imageAt } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const CartPage = () => {
  useDocumentTitle('Cart');
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: cart, isLoading, isError, refetch } = useGetCartQuery();
  const [updateItem, { isLoading: updating }] = useUpdateCartItemMutation();
  const [removeItem, { isLoading: removing }] = useRemoveCartItemMutation();
  const busy = updating || removing;

  const change = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: any) {
      toast.error(err?.data?.error ?? err?.data?.message ?? 'Could not update your cart');
    }
  };

  const checkout = () => {
    if (!isAuthenticated) {
      toast('Sign in to continue to checkout');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (isLoading) {
    return <div className="mx-auto max-w-5xl animate-pulse px-4 py-8"><div className="h-40 rounded-xl bg-warm-gray-200" /></div>;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-warm-gray-700">We couldn&apos;t load your cart.</p>
        <button onClick={refetch} className="mt-4 rounded-lg bg-accent-700 px-4 py-2 text-sm text-white">
          Try again
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-warm-gray-600">Browse our products and add something you like.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-lg bg-accent-700 px-6 py-3 text-sm font-semibold text-white">
          Start shopping
        </Link>
      </div>
    );
  }

  const hasUnavailable = cart.items.some((l) => !l.is_available || !l.in_stock);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Cart ({cart.item_count})</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {cart.items.map((line) => (
            <li key={line.id} className="flex gap-4 rounded-xl border border-warm-gray-200 bg-white p-4">
              <Link to={`/product/${line.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-warm-gray-100">
                <img src={imageAt(line.product.image?.url, 200) || NO_IMAGE} alt="" className="h-full w-full object-cover" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/product/${line.product.slug}`} className="line-clamp-2 text-sm hover:text-accent-700">
                  {line.product.name}
                </Link>
                {(!line.is_available || !line.in_stock) && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {line.is_available ? 'Out of stock' : 'No longer available'} — remove to continue
                  </p>
                )}
                <p className="mt-1 text-sm text-warm-gray-600">{formatKES(line.unit_price)} each</p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-lg border border-warm-gray-300">
                    <button
                      disabled={busy || line.quantity <= 1}
                      onClick={() => change(() => updateItem({ itemId: line.id, quantity: line.quantity - 1 }).unwrap())}
                      aria-label="Decrease quantity"
                      className="p-2 disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      disabled={busy}
                      onClick={() => change(() => updateItem({ itemId: line.id, quantity: line.quantity + 1 }).unwrap())}
                      aria-label="Increase quantity"
                      className="p-2 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">{formatKES(line.line_total)}</p>
                    <button
                      disabled={busy}
                      onClick={() => change(() => removeItem(line.id).unwrap())}
                      aria-label="Remove item"
                      className="text-warm-gray-400 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-warm-gray-200 bg-white p-5">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-warm-gray-600">Subtotal ({cart.item_count} items)</span>
            <span className="font-medium">{formatKES(cart.subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-warm-gray-500">Delivery fees are calculated at checkout.</p>
          <button
            onClick={checkout}
            disabled={hasUnavailable}
            className="mt-5 w-full rounded-lg bg-accent-700 py-3 text-sm font-semibold text-white hover:bg-accent-800 disabled:opacity-50"
          >
            Checkout · {formatKES(cart.subtotal)}
          </button>
          <Link to="/shop" className="mt-3 block text-center text-sm text-accent-700 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
