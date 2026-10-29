// src/routes/RequireVerifiedSeller.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useGetSellerProfileStatusQuery } from '../api/sellerApi';
import { useEffect } from 'react';

export function RequireVerifiedSeller() {
    const role = useAppSelector((state) => state.auth.user?.role);

    const {
        data: sellerStatus,
        isLoading,
        isError,
        error: errorData,
        refetch,
    } = useGetSellerProfileStatusQuery(undefined, {
        skip: role !== 'seller',
        refetchOnMountOrArgChange: true,
        pollingInterval: 10000,
    });

    // Force refetch when component mounts
    useEffect(() => {
        if (role === 'seller') {
            refetch();
        }
    }, [role, refetch]);

    // ✅ Refetch when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && role === 'seller') {
                refetch();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [role, refetch]);

    // Non-seller roles pass through
    if (role !== 'seller') {
        return <Outlet />;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking your seller status...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        const errorMessage = (errorData as any)?.data?.message || 'Unable to verify seller status';
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-800">Unable to verify seller status</h2>
                    <p className="text-gray-600 mt-2">{errorMessage}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-6 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    const data = sellerStatus?.data;
    const hasSellerProfile = data?.exists || false;
    const missingFields = data?.missingFields || [];
    const hasAllFields = missingFields.length === 0;

    // ✅ Single source of truth for gating store-creation routes.
    // This must mirror whatever the backend checks before allowing
    // POST /stores, so the guard and the API never disagree.
    const canCreateStores = data?.can_create_stores === true;

    // No seller profile at all yet — go fill in the form.
    if (!hasSellerProfile) {
        return <Navigate to="/seller-setup" replace />;
    }

    // Profile fields are missing — go finish the form.
    if (!hasAllFields) {
        return <Navigate to="/seller-setup" replace />;
    }

    // ✅ Only let sellers through to store routes if the backend says
    // they're actually allowed to create stores. Being "verified" is
    // necessary but not sufficient — don't infer this from status strings.
    if (canCreateStores) {
        return <Outlet />;
    }

    // ✅ Everything else (still pending, kyc submitted, verified-but-not-yet-
    // approved, rejected, suspended, closed, expired, etc.) goes to the
    // status page so the seller can see what's actually blocking them.
    return <Navigate to="/seller-status" replace />;
}