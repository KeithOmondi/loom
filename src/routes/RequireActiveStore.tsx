// src/routes/RequireActiveStore.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useGetSellerProfileStatusQuery } from '../api/sellerApi';
import { useGetMyStoresQuery, type StoreStatus } from '../api/storeApi';

export function RequireActiveStore() {
    const role = useAppSelector((state) => state.auth.user?.role);

    const {
        data: sellerStatus,
        isLoading: sellerLoading,
        isError: sellerError,
        error: sellerErrorData,
    } = useGetSellerProfileStatusQuery(undefined, {
        skip: role !== 'seller',
    });

    const {
        data: storesData,
        isLoading: storesLoading,
        isError: storesError,
    } = useGetMyStoresQuery(undefined, {
        skip: role !== 'seller' || !sellerStatus?.data?.exists,
    });

    const isLoading = sellerLoading || storesLoading;
    const isError = sellerError || storesError;

    const hasSellerProfile = sellerStatus?.data?.exists || false;
    const isSellerComplete = sellerStatus?.data?.isComplete || false;
    const hasStores = (storesData?.data?.length || 0) > 0;
    const firstStore = hasStores ? storesData?.data[0] : null;

    // ⚠️ `store.status` from the API is a NESTED OBJECT, not the plain
    // string enum the type/old code assumed:
    //   store.status = { status: 'active', is_live, can_edit, can_add_products, can_process_orders, ... }
    // Comparing `firstStore?.status === 'active'` compares an object to a
    // string, which is always false — so this gate NEVER passed, and every
    // seller (even ones with a genuinely active store) was redirected to
    // /store-status, which is what fed the redirect loop.
    const storeStatus: StoreStatus | null = firstStore?.status?.status || null;

    // ✅ is_approved no longer exists — status: 'active' is the only gate now.
    // Prefer is_live where available since that's the field the backend
    // actually means to gate on; fall back to the status code otherwise.
    const isActive =
        firstStore?.status?.is_live === true || storeStatus === 'active';

    if (role !== 'seller') {
        return <Outlet />;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking your store status...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        const errorMessage = (sellerErrorData as any)?.data?.message || 'Unable to verify store status';
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-800">Unable to verify store status</h2>
                    <p className="text-gray-600 mt-2">{errorMessage}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    if (!hasSellerProfile) {
        return <Navigate to="/seller-setup" replace />;
    }

    if (!isSellerComplete) {
        return <Navigate to="/seller-setup" replace />;
    }

    if (!hasStores) {
        return <Navigate to="/store-setup" replace />;
    }

    // @deprecated branches — kept only for old rows that might still carry
    // these statuses from before the "instant activation" flow. New stores
    // never get created in these states.
    if (storeStatus === 'draft') {
        return <Navigate to="/store-setup" replace />;
    }
    if (storeStatus === 'pending_approval') {
        return <Navigate to="/store-status" replace state={{ status: 'pending_approval' }} />;
    }
    if (storeStatus === 'rejected') {
        return <Navigate to="/store-status" replace state={{ status: 'rejected' }} />;
    }
    if (storeStatus === 'suspended') {
        return <Navigate to="/store-status" replace state={{ status: 'suspended' }} />;
    }
    if (storeStatus === 'closed') {
        return <Navigate to="/store-status" replace state={{ status: 'closed' }} />;
    }

    // ✅ Only real gate now: is the store active?
    if (isActive) {
        return <Outlet />;
    }

    return <Navigate to="/store-status" replace state={{ status: 'inactive' }} />;
}