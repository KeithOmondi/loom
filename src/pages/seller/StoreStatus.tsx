// src/components/pages/seller/StoreStatus.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useGetMyStoresQuery } from '../../api/storeApi';
import { clearStoreError } from '../../store/slices/storeSlice';
import { logoutThunk } from '../../store/slices/authSlice';
import {
  PauseCircle,
  AlertCircle,
  Store,
  RefreshCw,
} from 'lucide-react';
// ✅ Import StoreStatusCheck instead, since that's what store.status actually is
import type { StoreStatus } from '../../api/storeApi';

const StoreStatusPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error } = useAppSelector((state) => state.store);
  const user = useAppSelector((state) => state.auth.user);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: storesData,
    isLoading: storesLoading,
    refetch: refetchStores,
  } = useGetMyStoresQuery(undefined, {
    pollingInterval: 30000,
  });

  const store = storesData?.data?.[0];

  // ✅ FIX: store.status is a StoreStatusCheck object.
  // Extract the actual status string from inside it.
  const storeStatus = store?.status?.status as StoreStatus | undefined;
  //const isStoreLive = store?.status?.is_live ?? false;

  // Auth guard
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'seller') {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Redirect logic based on store state
  useEffect(() => {
    if (storesLoading) return;

    // No store → go create one
    if (!store) {
      navigate('/store-setup', { replace: true });
      return;
    }

    // ✅ FIX: Read the status string from the nested object
    const currentStatus = store.status?.status;
    const currentIsLive = store.status?.is_live;

    // Active store → go to dashboard
    if (currentStatus === 'active' && currentIsLive) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Suspended/closed → stay here
    if (currentStatus !== 'suspended' && currentStatus !== 'closed') {
      navigate('/dashboard', { replace: true });
    }
  }, [store, storesLoading, navigate]);

  // Error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearStoreError());
    }
  }, [error, dispatch]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchStores();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmGray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
          <p className="mt-4 text-warmGray-600">Loading store status...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  // ============================================
  // SUSPENDED
  // ============================================

  // ✅ FIX: use the extracted string status
  if (storeStatus === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmGray-50 px-4">
        <div className="w-full max-w-lg bg-white rounded-3xl px-8 py-10 shadow-sm border border-warmGray-100">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <PauseCircle size={28} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
              Your store is suspended
            </h1>
            <p className="text-warmGray-500 text-sm mb-4">
              <span className="font-medium text-warmGray-700">"{store.name}"</span> has been temporarily deactivated.
            </p>
          </div>

          {store.suspended_at && (
            <div className="bg-warmGray-50 rounded-xl p-4 mb-4 text-left">
              <p className="text-xs text-warmGray-400 font-medium uppercase tracking-wider mb-1">
                Suspended On
              </p>
              <p className="text-sm text-warmGray-600">
                {new Date(store.suspended_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {store.suspension_reason && (
            <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-1">
                Reason
              </p>
              <p className="text-sm text-red-700">{store.suspension_reason}</p>
            </div>
          )}

          <div className="bg-warmGray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-warmGray-600">
              <span className="font-medium text-warmGray-700">What can I do?</span>
              <br />
              Contact our support team to understand why your store was suspended
              and what steps you can take to reactivate it.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 border border-warmGray-200 rounded-full py-3.5 text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Checking...' : 'Check Status'}
            </button>
            <button
              onClick={onLogout}
              className="w-full border border-warmGray-200 rounded-full py-3.5 text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // CLOSED
  // ============================================

  // ✅ FIX: use the extracted string status
  if (storeStatus === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmGray-50 px-4">
        <div className="w-full max-w-lg bg-white rounded-3xl px-8 py-10 shadow-sm border border-warmGray-100">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
              <Store size={28} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
              Your store is closed
            </h1>
            <p className="text-warmGray-500 text-sm mb-4">
              <span className="font-medium text-warmGray-700">"{store.name}"</span> has been permanently closed.
            </p>
          </div>

          {store.closed_at && (
            <div className="bg-warmGray-50 rounded-xl p-4 mb-4 text-left">
              <p className="text-xs text-warmGray-400 font-medium uppercase tracking-wider mb-1">
                Closed On
              </p>
              <p className="text-sm text-warmGray-600">
                {new Date(store.closed_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {store.closure_reason && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                Reason
              </p>
              <p className="text-sm text-gray-700">{store.closure_reason}</p>
            </div>
          )}

          <div className="bg-warmGray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-warmGray-600">
              <span className="font-medium text-warmGray-700">What can I do?</span>
              <br />
              To reopen your store, please contact our support team.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="w-full border border-warmGray-200 rounded-full py-3.5 text-warmGray-700 font-medium hover:bg-warmGray-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // FALLBACK
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmGray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-warmGray-100 text-center">
        <div className="w-16 h-16 rounded-full bg-warmGray-100 flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={28} className="text-warmGray-600" />
        </div>
        <h1 className="text-2xl font-serif text-warmGray-900 mb-2">
          Loading your store...
        </h1>
        <p className="text-warmGray-500 text-sm mb-8">
          Redirecting you to the appropriate page.
        </p>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 bg-accent-700 text-white rounded-full py-3.5 font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Checking...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default StoreStatusPage;