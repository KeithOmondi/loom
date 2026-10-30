import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import { useGetCategoryTreeQuery } from '../../api/categoryApi';
import { useFetch } from '../../lib/http';
import { useGetCartQuery, useMergeCartMutation } from '../../api/cartApi';
import { clearGuestCartToken, getGuestCartToken } from '../../lib/guestCart';
import { getRoleRedirectPath } from '../../utils/roleRedirect';

const StoreHeader = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const user = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: cart } = useGetCartQuery();
  const notifs = useFetch<{ unread: number }>(isAuthenticated ? '/notifications' : null);
  const unread = notifs.data?.unread ?? 0;
  const { data: tree } = useGetCategoryTreeQuery({ depth_max: 1, include_product_count: false });
  const departments = tree?.data ?? [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const signOut = async () => {
    setMenuOpen(false);
    await dispatch(logoutThunk());
    navigate('/');
  };

  const portalPath = user && user.role !== 'customer' ? getRoleRedirectPath(user) : null;

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="bg-warm-gray-900 text-xs text-warm-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span>Pay securely with M-Pesa</span>
          <Link to="/sell-on-loom" className="hover:text-white">
            Sell on Loom
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/loom_logo.png" alt="Loom" className="h-9 w-auto" />
        </Link>

        <form onSubmit={onSearch} className="order-3 flex w-full flex-1 md:order-none md:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands and categories"
            aria-label="Search products"
            className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-warm-gray-300 px-4 py-2.5 text-sm outline-none focus:border-accent-700"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-r-lg bg-accent-700 px-5 text-sm font-medium text-white hover:bg-accent-800"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="relative">
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-warm-gray-800 hover:bg-warm-gray-100"
                >
                  <User size={18} />
                  <span className="hidden max-w-[8rem] truncate sm:inline">Hi, {user.full_name.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 overflow-hidden rounded-lg border border-warm-gray-200 bg-white py-1 text-sm shadow-lg"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    {user.role === 'customer' && (
                      <>
                        {[['/account/orders', 'My orders'], ['/account/wishlist', 'Wishlist'], ['/account/wallet', 'Wallet'], ['/account/messages', 'Messages'], ['/account/notifications', unread ? `Notifications (${unread})` : 'Notifications'], ['/account/profile', 'Profile']].map(([to, label]) => (
                          <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-warm-gray-100">{label}</Link>
                        ))}
                      </>
                    )}
                    {portalPath && (
                      <Link
                        to={portalPath}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-warm-gray-100"
                      >
                        Go to my portal
                      </Link>
                    )}
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-warm-gray-100"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-warm-gray-800 hover:bg-warm-gray-100"
              >
                <User size={18} />
                <span>Sign in</span>
              </Link>
            )}
          </div>

          <Link
            to="/cart"
            className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-warm-gray-800 hover:bg-warm-gray-100"
            aria-label={`Cart, ${cart?.item_count ?? 0} items`}
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            {!!cart?.item_count && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent-700 px-1 text-xs font-bold text-white">
                {cart.item_count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {departments.length > 0 && (
        <nav className="border-t border-warm-gray-100">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 text-sm">
            <NavLink
              to="/shop"
              end
              className={({ isActive }) =>
                `shrink-0 px-3 py-2.5 font-medium hover:text-accent-700 ${isActive ? 'text-accent-700' : 'text-warm-gray-800'}`
              }
            >
              All products
            </NavLink>
            {departments.map((d) => (
              <Link
                key={d.id}
                to={`/shop?category=${d.slug}`}
                className="shrink-0 px-3 py-2.5 text-warm-gray-700 hover:text-accent-700"
              >
                {d.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

const StoreFooter = () => (
  <footer className="mt-16 bg-warm-gray-900 text-warm-gray-300">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <img src="/loom_logo.png" alt="Loom" className="h-8 w-auto rounded bg-white p-1" />
        <p className="mt-3 text-sm">Connecting you to your community — shop from trusted local sellers.</p>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Shop</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/shop" className="hover:text-white">All products</Link></li>
          <li><Link to="/cart" className="hover:text-white">My cart</Link></li>
          <li><Link to="/account/orders" className="hover:text-white">My orders</Link></li>
          <li><Link to="/help" className="hover:text-white">Help Centre</Link></li>
          <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
          <li><Link to="/contact" className="hover:text-white">Contact us</Link></li>
          <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Sell</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/register" className="hover:text-white">Become a seller</Link></li>
          <li><Link to="/login" className="hover:text-white">Seller sign in</Link></li>
          <li><Link to="/sell-on-loom" className="hover:text-white">Sell on Loom</Link></li>
          <li><Link to="/vendor-agreement" className="hover:text-white">Vendor agreement</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/terms" className="hover:text-white">Terms of use</Link></li>
          <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
          <li><Link to="/returns" className="hover:text-white">Return policy</Link></li>
          <li><Link to="/about" className="hover:text-white">About Loom</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-warm-gray-800 py-4 text-center text-xs text-warm-gray-500">
      © {new Date().getFullYear()} Loom. All rights reserved.
    </div>
  </footer>
);

/** Public storefront shell. Also merges a guest cart into the account right after sign-in. */
export const StoreLayout = () => {
  const { pathname } = useLocation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [mergeCart] = useMergeCartMutation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    const guestToken = getGuestCartToken();
    if (!isAuthenticated || !guestToken) return;
    mergeCart({ guest_token: guestToken })
      .unwrap()
      .catch(() => {})
      .finally(clearGuestCartToken);
  }, [isAuthenticated, mergeCart]);

  return (
    <div className="flex min-h-screen flex-col bg-warm-gray-50 text-warm-gray-900">
      <StoreHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <StoreFooter />
    </div>
  );
};

export default StoreLayout;
