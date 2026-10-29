import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
const SellerLayout = lazy(() =>
    import('../components/seller/SellerLayout').then((m) => ({ default: m.SellerLayout })),
);
import { ProtectedRoute } from './ProtectedRoutes';
import { RequireActiveStore } from './RequireActiveStore';
import { RequireVerifiedSeller } from './Requireverifiedseller';

// Auth Pages
const Login = lazy(() => import('../pages/auth/LoginPage'));
const Register = lazy(() => import('../pages/auth/RegisterPage'));
const VerifyOtp = lazy(() => import('../pages/auth/VerifyOtpPage'));

// Seller Pages
const DashboardPage = lazy(() => import('../pages/seller/DashboardPage'));
const ProductsPage = lazy(() => import('../pages/seller/ProductsPage'));
const StoreSetup = lazy(() => import('../pages/seller/StoreSetup'));
const StoreStatusNotice = lazy(() => import('../pages/seller/StoreStatusNotice'));
const SellerSetup = lazy(() => import('../pages/seller/SellerSetup'));
const CompleteSellerProfile = lazy(() => import('../pages/seller/CompleteSellerProfile'));
const SellerStatusPage = lazy(() => import('../pages/seller/Sellerstatus'));

// Admin Pages
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));

// Super Admin Pages
const SuperAdminLayout = lazy(() => import('../components/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('../pages/superadmin/SuperAdminDashboard'));
//import SuperAdminStores from '../pages/superadmin/SuperAdminStores';
const SuperAdminUsers = lazy(() => import('../pages/superadmin/SuperAdminUsers'));

// Moderator Pages
const ModeratorLayout = lazy(() => import('../components/moderator/ModeratorLayout'));
const ModeratorDashboard = lazy(() => import('../pages/moderator/ModeratorDashboard'));
const ModeratorStores = lazy(() => import('../pages/moderator/ModeratorStores'));
const ModeratorSellers = lazy(() => import('../pages/moderator/ModeratorSellers'));
const ModeratorProductApproval = lazy(() => import('../pages/moderator/ModeratorProductApproval'));
const SuperAdminSellers = lazy(() => import('../pages/superadmin/SuperAdminSellers'));
const SellerInventory = lazy(() => import('../pages/seller/SellerInventory'));
const SellerOrderandLedger = lazy(() => import('../pages/seller/SellerOrderandLedger'));
const SellerShippingandWaybills = lazy(() => import('../pages/seller/SellerShippingandWaybills'));
const SellerReturnsandDisputes = lazy(() => import('../pages/seller/SellerReturnsandDisputes'));
const SellerPayoutSettlements = lazy(() => import('../pages/seller/SellerPayoutSettlements'));
const SellerBankMobileMoney = lazy(() => import('../pages/seller/SellerBankMobileMoney'));
const SellerStoreProfile = lazy(() => import('../pages/seller/SellerStoreProfile'));
const SellerKYCandVerification = lazy(() => import('../pages/seller/SellerKYCandVerification'));
const SellerMessages = lazy(() => import('../pages/seller/SellerMessages'));
const SellerAccountSettings = lazy(() => import('../pages/seller/SellerAccountSettings'));
const ComingSoon = lazy(() => import('../pages/ComingSoon'));
const StoreLayout = lazy(() => import('../components/store/StoreLayout'));
const HomePage = lazy(() => import('../pages/store/HomePage'));
const ShopPage = lazy(() => import('../pages/store/ShopPage'));
const ProductDetailPage = lazy(() => import('../pages/store/ProductDetailPage'));
const CartPage = lazy(() => import('../pages/store/CartPage'));
const SignupPage = lazy(() => import('../pages/store/SignupPage'));

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-neutral-700" />
    </div>
);

// Sidebar sections that are planned but not built yet — each renders <ComingSoon />
const SELLER_PLANNED = ['/analytics', '/warehouses', '/promotions', '/reviews', '/commissions', '/tax-invoices', '/notifications', '/support'];
const MODERATOR_PLANNED = ['/moderator/queue', '/moderator/flagged', '/moderator/history', '/moderator/stats', '/moderator/profile', '/moderator/settings'];
const SUPER_ADMIN_PLANNED = '/super-admin/ad-manager /super-admin/affiliates /super-admin/ai-enrichment /super-admin/announcements /super-admin/attributes /super-admin/audit-logs /super-admin/backups /super-admin/banners /super-admin/barcodes /super-admin/blacklists /super-admin/brands /super-admin/cancellations /super-admin/categories /super-admin/commissions /super-admin/coupons /super-admin/disputes /super-admin/escrow-ledger /super-admin/feature-flags /super-admin/financial-reports /super-admin/help-center /super-admin/integrations /super-admin/live-metrics /super-admin/localization /super-admin/logistics /super-admin/loyalty-wallets /super-admin/notifications /super-admin/orders /super-admin/pages /super-admin/payment-gateways /super-admin/payout-accounts /super-admin/payouts /super-admin/product-approvals /super-admin/products /super-admin/promotions /super-admin/reported-items /super-admin/reports /super-admin/returns /super-admin/reviews /super-admin/seller-plans /super-admin/settings /super-admin/shipping-zones /super-admin/staff-roles /super-admin/support-tickets /super-admin/system-queues /super-admin/taxation /super-admin/transactions /super-admin/vendor-compliance /super-admin/vendor-documents /super-admin/verifications /super-admin/warehouses'.split(' ');

export const AppRoutes = () => {
    return (
        <Suspense fallback={<PageLoader />}>
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Public storefront */}
            <Route element={<StoreLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/terms" element={<ComingSoon />} />
                <Route path="/privacy" element={<ComingSoon />} />
                <Route path="/checkout" element={<ComingSoon />} />
            </Route>

            {/* Protected Seller Routes */}
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
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/seller/inventory" element={<SellerInventory />} />
                        <Route path="/seller/orders" element={<SellerOrderandLedger />} />
                        <Route path="/seller/fulfillment" element={<SellerShippingandWaybills />} />
                        <Route path="/seller/returns" element={<SellerReturnsandDisputes />} />
                        <Route path="/seller/payouts" element={<SellerPayoutSettlements />} />
                        <Route path="/seller/bank-accounts" element={<SellerBankMobileMoney />} />
                        <Route path="/seller/store" element={<SellerStoreProfile />} />
                        <Route path="/seller/verification" element={<SellerKYCandVerification />} />
                        <Route path="/seller/messages" element={<SellerMessages />} />
                        <Route path="/seller/settings" element={<SellerAccountSettings />} />
                        {SELLER_PLANNED.map((path) => (
                            <Route key={path} path={path} element={<ComingSoon />} />
                        ))}
                    </Route>
                </Route>
            </Route>

            {/* Protected Moderator Routes */}
            <Route element={<ProtectedRoute roles={['moderator', 'admin', 'super_admin']} />}>
                <Route element={<ModeratorLayout />}>
                    <Route path="/moderator" element={<ModeratorDashboard />} />
                    <Route path="/moderator/dashboard" element={<ModeratorDashboard />} />
                    <Route path="/moderator/stores" element={<ModeratorStores />} />
                    <Route path="/moderator/sellers" element={<ModeratorSellers />} />
                    <Route path="/moderator/products-approval" element={<ModeratorProductApproval />} />
                    {MODERATOR_PLANNED.map((path) => (
                        <Route key={path} path={path} element={<ComingSoon />} />
                    ))}
                </Route>
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                </Route>
            </Route>

            {/* Protected Super Admin Routes */}
            <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
                <Route element={<SuperAdminLayout />}>
                    <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/users" element={<SuperAdminUsers />} />
                    <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
                    <Route path="/super-admin/stores" element={<SuperAdminSellers />} />
                    {SUPER_ADMIN_PLANNED.map((path) => (
                        <Route key={path} path={path} element={<ComingSoon />} />
                    ))}
                </Route>
            </Route>

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
    );
};