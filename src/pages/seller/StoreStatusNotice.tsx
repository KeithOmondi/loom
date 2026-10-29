// src/components/pages/seller/StoreStatusNotice.tsx

import { PauseCircle, AlertCircle, RefreshCw, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { useGetMyStoresQuery } from '../../api/storeApi';
import { logoutThunk } from '../../store/slices/authSlice';
import type { StoreStatus } from '../../api/storeApi';

/**
 * Store Status Notice
 * 
 * Single-approval flow: stores go live immediately. This component only
 * handles the states where a store is NOT active:
 * 
 *   - 'none'      : Seller has no store yet → prompt to create
 *   - 'suspended' : Admin suspended the store
 *   - 'closed'    : Store permanently closed
 * 
 * All other states ('active', 'draft', 'pending_approval', 'rejected')
 * are legacy and handled by redirecting to /dashboard.
 */

type DisplayStoreStatus = StoreStatus | 'none';

interface StoreStatusNoticeProps {
  status?: DisplayStoreStatus;
  storeName?: string;
  reason?: string;
  onAction?: () => void;
}

const StoreStatusNotice = ({
  status: propStatus,
  storeName: propStoreName,
  reason: propReason,
  onAction,
}: StoreStatusNoticeProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // RTK Query
  const {
    data: storesData,
    isLoading,
    isError,
    refetch,
  } = useGetMyStoresQuery(undefined, {
    skip: !!propStatus,
  });

  // Local state
  const [status, setStatus] = useState<DisplayStoreStatus | null>(propStatus || null);
  const [storeName, setStoreName] = useState<string | undefined>(propStoreName);
  const [reason, setReason] = useState<string | undefined>(propReason);

  // Derive state from props or API
  useEffect(() => {
    if (propStatus) {
      setStatus(propStatus);
      setStoreName(propStoreName);
      setReason(propReason);
      return;
    }

    if (storesData?.data && storesData.data.length > 0) {
      const store = storesData.data[0];
      setStoreName(store.name);

      // ✅ FIX: be explicit about every status instead of defaulting the
      // "else" branch to 'active'. Previously, any malformed/undefined
      // status (e.g. from a degraded API response) fell into the else
      // branch and was mislabeled 'active', which triggered the navigate
      // effect below and sent the user to /dashboard — where
      // RequireActiveStore's *strict* `status === 'active'` check would
      // fail and bounce them straight back here, causing an infinite
      // redirect loop ("Maximum update depth exceeded").
      // ⚠️ `store.status` from the API is a NESTED OBJECT, not the plain
      // string enum the old code assumed:
      //   store.status = { status: 'active', is_live, can_edit, ... }
      // Comparing store.status to a string directly always fails silently.
      // Read the actual status code from store.status.status.
      const statusCode = store.status?.status;

      switch (statusCode) {
        case 'suspended':
          setStatus('suspended');
          setReason(store.suspension_reason);
          break;
        case 'closed':
          setStatus('closed');
          setReason(store.closure_reason);
          break;
        case 'active':
          setStatus('active');
          break;
        case 'draft':
        case 'pending_approval':
        case 'rejected':
          // Legacy in-progress states — let RequireActiveStore's own
          // routing handle these; don't guess here.
          setStatus(statusCode);
          break;
        default:
          // Unknown/malformed status — do NOT assume 'active'.
          // Surface it as an error state instead of silently routing on
          // to /dashboard.
          setStatus(null);
      }
    } else {
      setStatus('none');
    }
  }, [propStatus, propStoreName, propReason, storesData]);


  // Only navigate for states we're CONFIDENT are legacy-active states —
  // 'active' alone is not enough anymore; it must have come through the
  // explicit switch above, not a fallback guess.
  useEffect(() => {
    if (status === 'active' || status === 'draft' || status === 'pending_approval' || status === 'rejected') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  const onRefresh = async () => {
    await refetch();
  };



  const onGoToStoreSetup = () => {
    navigate('/store-setup', { replace: true });
    if (onAction) onAction();
  };

  // ============================================
  // Loading
  // ============================================

  if (isLoading && !propStatus) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store status...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Error
  // ============================================

  if (isError && !isLoading && !propStatus) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-gray-100 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={26} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-serif text-gray-900 mb-2">
            Unable to load store status
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            We couldn't retrieve your store information. Please try again.
          </p>
          <button
            onClick={onRefresh}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-full py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Content
  // ============================================

  const renderContent = () => {
    switch (status) {
      // ✅ No store yet — prompt to create
      case 'none':
        return (
          <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-5">
              <Store size={26} className="text-yellow-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">No store found</h1>
            <p className="text-gray-500 text-sm mb-8">
              You haven't created a store yet. Set up your store to start selling.
            </p>
            <button
              onClick={onGoToStoreSetup}
              className="w-full bg-accent-700 text-white rounded-full py-3.5 font-medium hover:bg-accent-600 transition-colors mb-3"
            >
              Create Store
            </button>
            <button
              onClick={onLogout}
              className="w-full border border-gray-200 rounded-full py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Log out
            </button>
          </div>
        );



      // ✅ Store is suspended — show notice
      case 'suspended':
        return (
          <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <PauseCircle size={26} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">
              Your store is suspended
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              {storeName
                ? `"${storeName}" has been temporarily deactivated.`
                : 'Your store has been temporarily deactivated.'}
            </p>

            {reason && (
              <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="text-sm text-red-700">{reason}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-700">What can I do?</span>
                <br />
                Contact our support team to understand why your store was
                suspended and what steps you can take to reactivate it.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={onRefresh}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-full py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                Check Status
              </button>
              <button
                onClick={onLogout}
                className="w-full border border-gray-200 rounded-full py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        );

      // ✅ Store is closed — terminal state
      case 'closed':
        return (
          <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
              <Store size={26} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">
              Your store is closed
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              {storeName
                ? `"${storeName}" has been permanently closed.`
                : 'Your store has been permanently closed.'}
            </p>

            {reason && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="text-sm text-gray-700">{reason}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-700">What can I do?</span>
                <br />
                To reopen your store, please contact our support team.
              </p>
            </div>

            <button
              onClick={onLogout}
              className="w-full border border-gray-200 rounded-full py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Log out
            </button>
          </div>
        );


      // ✅ Fallback — genuinely unresolved/unknown status. Note this is
      // now reachable for real (previously any unknown status silently
      // became 'active' and skipped this branch entirely).
      default:
        return (
          <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10 shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={26} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">
              Loading your store...
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Redirecting you to the appropriate page.
            </p>
            <button
              onClick={onRefresh}
              className="w-full flex items-center justify-center gap-2 bg-accent-700 text-white rounded-full py-3.5 font-medium hover:bg-accent-600 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-50 px-4">
      {renderContent()}
    </div>
  );
};

export default StoreStatusNotice;