import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoutes';
import { RequireActiveStore } from './RequireActiveStore';
import { RequireVerifiedSeller } from './Requireverifiedseller';

// Named-export helper so grouped page modules can be code-split per screen.
const named = <T extends Record<string, React.ComponentType<any>>>(loader: () => Promise<T>, key: keyof T) =>
    lazy(() => loader().then((m) => ({ default: m[key] }))) as React.LazyExoticComponent<React.ComponentType<any>>;

// ---- Auth ----
const Login = lazy(() => import('../pages/auth/LoginPage'));
const Register = lazy(() => import('../pages/auth/RegisterPage'));
const VerifyOtp = lazy(() => import('../pages/auth/VerifyOtpPage'));
const SignupPage = lazy(() => import('../pages/store/SignupPage'));
const ForgotPasswordPage = named(() => import('../pages/store/ContentPages'), 'ForgotPasswordPage');
const ResetPasswordPage = named(() => import('../pages/store/ContentPages'), 'ResetPasswordPage');

// ---- Storefront ----
const StoreLayout = lazy(() => import('../components/store/StoreLayout'));
const HomePage = lazy(() => import('../pages/store/HomePage'));
const ShopPage = lazy(() => import('../pages/store/ShopPage'));
const ProductDetailPage = lazy(() => import('../pages/store/ProductDetailPage'));
const StorePage = lazy(() => import('../pages/store/StorePage'));
const CartPage = lazy(() => import('../pages/store/CartPage'));
const CheckoutPage = lazy(() => import('../pages/store/CheckoutPage'));
const CmsPage = named(() => import('../pages/store/ContentPages'), 'CmsPage');

// ---- Customer account ----
const AccountLayout = lazy(() => import('../components/account/AccountLayout'));
const OrdersPage = named(() => import('../pages/account/OrdersPages'), 'OrdersPage');
const OrderDetailPage = named(() => import('../pages/account/OrdersPages'), 'OrderDetailPage');
const ReturnsPage = named(() => import('../pages/account/AfterSalesPages'), 'ReturnsPage');
const DisputesListPage = named(() => import('../pages/account/AfterSalesPages'), 'DisputesListPage');
const DisputePage = named(() => import('../pages/account/AfterSalesPages'), 'DisputePage');
const WalletPage = named(() => import('../pages/account/MiscPages'), 'WalletPage');
const AddressesPage = named(() => import('../pages/account/MiscPages'), 'AddressesPage');
const WishlistPage = named(() => import('../pages/account/MiscPages'), 'WishlistPage');
const NotificationsPage = named(() => import('../pages/account/MiscPages'), 'NotificationsPage');
const ProfilePage = named(() => import('../pages/account/MiscPages'), 'ProfilePage');
const MessagesPage = named(() => import('../pages/shared/MessagesPage'), 'MessagesPage');

// ---- Seller ----
const SellerLayout = named(() => import('../components/seller/SellerLayout'), 'SellerLayout');
const ProductsPage = lazy(() => import('../pages/seller/ProductsPage'));
const StoreSetup = lazy(() => import('../pages/seller/StoreSetup'));
const StoreStatusNotice = lazy(() => import('../pages/seller/StoreStatusNotice'));
const SellerSetup = lazy(() => import('../pages/seller/SellerSetup'));
const CompleteSellerProfile = lazy(() => import('../pages/seller/CompleteSellerProfile'));
const SellerStatusPage = lazy(() => import('../pages/seller/Sellerstatus'));
const SellerInventory = lazy(() => import('../pages/seller/SellerInventory'));
const SellerStoreProfile = lazy(() => import('../pages/seller/SellerStoreProfile'));
const SellerKYCandVerification = lazy(() => import('../pages/seller/SellerKYCandVerification'));
const SellerAccountSettings = lazy(() => import('../pages/seller/SellerAccountSettings'));
const SellerDashboard = named(() => import('../pages/seller/SellerPages'), 'SellerDashboard');
const SellerOrders = named(() => import('../pages/seller/SellerPages'), 'SellerOrders');
const SellerFulfillment = named(() => import('../pages/seller/SellerPages'), 'SellerFulfillment');
const SellerReturns = named(() => import('../pages/seller/SellerPages'), 'SellerReturns');
const SellerPayouts = named(() => import('../pages/seller/SellerPages'), 'SellerPayouts');
const SellerPayoutSettings = named(() => import('../pages/seller/SellerPages'), 'SellerPayoutSettings');
const SellerCoupons = named(() => import('../pages/seller/SellerPages'), 'SellerCoupons');
const SellerVariants = named(() => import('../pages/seller/SellerPages'), 'SellerVariants');
const SellerInbox = named(() => import('../pages/seller/SellerPages'), 'SellerInbox');

// ---- Moderator ----
const ModeratorLayout = lazy(() => import('../components/moderator/ModeratorLayout'));
const ModeratorDashboard = lazy(() => import('../pages/moderator/ModeratorDashboard'));
const ModeratorStores = lazy(() => import('../pages/moderator/ModeratorStores'));
const ModeratorSellers = lazy(() => import('../pages/moderator/ModeratorSellers'));
const ModeratorProductApproval = lazy(() => import('../pages/moderator/ModeratorProductApproval'));

// ---- Back office (admin / finance / support) ----
const StaffLayout = lazy(() => import('../components/admin/StaffLayout'));
const AdminDashboard = named(() => import('../pages/admin/AdminPages'), 'AdminDashboard');
const AdminOrders = named(() => import('../pages/admin/AdminPages'), 'AdminOrders');
const AdminReturns = named(() => import('../pages/admin/AdminPages'), 'AdminReturns');
const AdminRefunds = named(() => import('../pages/admin/AdminPages'), 'AdminRefunds');
const AdminPayouts = named(() => import('../pages/admin/AdminPages'), 'AdminPayouts');
const AdminEscrow = named(() => import('../pages/admin/AdminPages'), 'AdminEscrow');
const AdminFraud = named(() => import('../pages/admin/AdminPages'), 'AdminFraud');
const AdminAudit = named(() => import('../pages/admin/AdminPages'), 'AdminAudit');
const AdminReports = named(() => import('../pages/admin/AdminPages'), 'AdminReports');
const AdminPromotions = named(() => import('../pages/admin/AdminPages'), 'AdminPromotions');
const AdminDelivery = named(() => import('../pages/admin/AdminPages'), 'AdminDelivery');
const AdminSettings = named(() => import('../pages/admin/AdminPages'), 'AdminSettings');
const AdminContent = named(() => import('../pages/admin/AdminPages'), 'AdminContent');
const AdminStaff = named(() => import('../pages/admin/AdminPages'), 'AdminStaff');

// ---- Super admin (existing vendor / user management) ----
const SuperAdminLayout = lazy(() => import('../components/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('../pages/superadmin/SuperAdminDashboard'));
const SuperAdminUsers = lazy(() => import('../pages/superadmin/SuperAdminUsers'));
const SuperAdminSellers = lazy(() => import('../pages/superadmin/SuperAdminSellers'));
const ComingSoon = lazy(() => import('../pages/ComingSoon'));

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-neutral-700" />
    </div>
);

// Sections of the older moderator / super-admin menus that are still planned. Each renders <ComingSoon />.
const MODERATOR_PLANNED = ['/moderator/queue', '/moderator/flagged', '/moderator/history', '/moderator/stats', '/moderator/profile', '/moderator/settings'];
const SUPER_ADMIN_PLANNED = '/super-admin/ad-manager /super-admin/affiliates /super-admin/ai-enrichment /super-admin/announcements /super-admin/attributes /super-admin/audit-logs /super-admin/backups /super-admin/banners /super-admin/barcodes /super-admin/blacklists /super-admin/brands /super-admin/cancellations /super-admin/categories /super-admin/commissions /super-admin/coupons /super-admin/disputes /super-admin/escrow-ledger /super-admin/feature-flags /super-admin/financial-reports /super-admin/help-center /super-admin/integrations /super-admin/live-metrics /super-admin/localization /super-admin/logistics /super-admin/loyalty-wallets /super-admin/notifications /super-admin/orders /super-admin/pages /super-admin/payment-gateways /super-admin/payout-accounts /super-admin/payouts /super-admin/product-approvals /super-admin/products /super-admin/promotions /super-admin/reported-items /super-admin/reports /super-admin/returns /super-admin/reviews /super-admin/seller-plans /super-admin/settings /super-admin/shipping-zones /super-admin/staff-roles /super-admin/support-tickets /super-admin/system-queues /super-admin/taxation /super-admin/transactions /super-admin/vendor-compliance /super-admin/vendor-documents /super-admin/verifications /super-admin/warehouses'.split(' ');

const STAFF = ['admin', 'super_admin', 'finance', 'support'] as const;
const CMS_PAGES: [string, string][] = [['/about', 'about'], ['/contact', 'contact'], ['/faq', 'faq'], ['/terms', 'terms'], ['/privacy', 'privacy'], ['/returns', 'returns'], ['/vendor-agreement', 'vendor-agreement'], ['/sell-on-loom', 'sell-on-loom'], ['/help', 'help']];

export const AppRoutes = () => {
    return (
        <Suspense fallback={<PageLoader />}>
        <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Public storefront */}
            <Route element={<StoreLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/store/:slug" element={<StorePage />} />
                <Route path="/cart" element={<CartPage />} />
                {CMS_PAGES.map(([path, slug]) => <Route key={path} path={path} element={<CmsPage slug={slug} />} />)}
                <Route path="/pages/:slug" element={<CmsPage />} />

                {/* Signed-in customer area */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/account" element={<AccountLayout />}>
                        <Route index element={<Navigate to="orders" replace />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="orders/:id" element={<OrderDetailPage />} />
                        <Route path="returns" element={<ReturnsPage />} />
                        <Route path="disputes" element={<DisputesListPage base="/account/disputes" />} />
                        <Route path="disputes/:id" element={<DisputePage back="/account/disputes" />} />
                        <Route path="wishlist" element={<WishlistPage />} />
                        <Route path="wallet" element={<WalletPage />} />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="addresses" element={<AddressesPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                    </Route>
                </Route>
            </Route>

            {/* Seller */}
            <Route element={<ProtectedRoute roles={['seller']} />}>
                <Route path="/seller-setup" element={<SellerSetup />} />
                <Route path="/seller-setup/complete-profile" element={<CompleteSellerProfile />} />
                <Route path="/seller-status" element={<SellerStatusPage />} />
                <Route path="/store-status" element={<StoreStatusNotice />} />

                <Route element={<RequireVerifiedSeller />}>
                    <Route path="/store-setup" element={<StoreSetup />} />
                </Route>

                <Route element={<RequireActiveStore />}>
                    <Route element={<SellerLayout />}>
                        <Route path="/dashboard" element={<SellerDashboard />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/seller/variants" element={<SellerVariants />} />
                        <Route path="/seller/inventory" element={<SellerInventory />} />
                        <Route path="/seller/orders" element={<SellerOrders />} />
                        <Route path="/seller/fulfillment" element={<SellerFulfillment />} />
                        <Route path="/seller/returns" element={<SellerReturns />} />
                        <Route path="/seller/disputes/:id" element={<DisputePage back="/seller/returns" />} />
                        <Route path="/seller/coupons" element={<SellerCoupons />} />
                        <Route path="/seller/payouts" element={<SellerPayouts />} />
                        <Route path="/seller/bank-accounts" element={<SellerPayoutSettings />} />
                        <Route path="/seller/store" element={<SellerStoreProfile />} />
                        <Route path="/seller/verification" element={<SellerKYCandVerification />} />
                        <Route path="/seller/messages" element={<SellerInbox />} />
                        <Route path="/seller/notifications" element={<NotificationsPage />} />
                        <Route path="/seller/settings" element={<SellerAccountSettings />} />
                    </Route>
                </Route>
            </Route>

            {/* Moderator */}
            <Route element={<ProtectedRoute roles={['moderator', 'admin', 'super_admin']} />}>
                <Route element={<ModeratorLayout />}>
                    <Route path="/moderator" element={<ModeratorDashboard />} />
                    <Route path="/moderator/dashboard" element={<ModeratorDashboard />} />
                    <Route path="/moderator/stores" element={<ModeratorStores />} />
                    <Route path="/moderator/sellers" element={<ModeratorSellers />} />
                    <Route path="/moderator/products-approval" element={<ModeratorProductApproval />} />
                    {MODERATOR_PLANNED.map((path) => <Route key={path} path={path} element={<ComingSoon />} />)}
                </Route>
            </Route>

            {/* Back office: admin, finance, support */}
            <Route element={<ProtectedRoute roles={[...STAFF]} />}>
                <Route element={<StaffLayout />}>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/returns" element={<AdminReturns />} />
                    <Route path="/admin/disputes" element={<DisputesListPage base="/admin/disputes" />} />
                    <Route path="/admin/disputes/:id" element={<DisputePage back="/admin/disputes" />} />
                    <Route path="/admin/refunds" element={<AdminRefunds />} />
                    <Route path="/admin/payouts" element={<AdminPayouts />} />
                    <Route path="/admin/escrow" element={<AdminEscrow />} />
                    <Route path="/admin/fraud" element={<AdminFraud />} />
                    <Route path="/admin/audit" element={<AdminAudit />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/promotions" element={<AdminPromotions />} />
                    <Route path="/admin/delivery" element={<AdminDelivery />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/content" element={<AdminContent />} />
                    <Route path="/admin/staff" element={<AdminStaff />} />
                    <Route path="/admin/notifications" element={<NotificationsPage />} />
                </Route>
            </Route>

            {/* Super admin: vendor and user management (existing screens) */}
            <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
                <Route element={<SuperAdminLayout />}>
                    <Route path="/super-admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/users" element={<SuperAdminUsers />} />
                    <Route path="/super-admin/stores" element={<SuperAdminSellers />} />
                    {SUPER_ADMIN_PLANNED.map((path) => <Route key={path} path={path} element={<ComingSoon />} />)}
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
    );
};
