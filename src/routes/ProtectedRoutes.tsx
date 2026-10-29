// src/routes/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { refreshThunk, type UserRole } from '../store/slices/authSlice';
import { getRoleRedirectPath } from '../utils/roleRedirect';

/**
 * Wraps authenticated routes, optionally restricted to `roles`. On mount, attempts a silent session restore via
 * the httpOnly refresh cookie (mirrors mobile's restoreSession/AuthGate),
 * since the access token lives only in memory and is lost on page reload.
 *
 * While bootstrapping, renders nothing (swap in a spinner/splash if desired)
 * to avoid a flash of the login page before the refresh attempt resolves.
 */
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        await dispatch(refreshThunk()).unwrap().catch(() => {});
      }
      setIsBootstrapped(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-neutral-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Signed in with the wrong role: send them to their own home instead of
  // showing another portal's pages (the API enforces roles too).
  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to={user ? getRoleRedirectPath(user) : '/login'} replace />;
  }

  return <Outlet />;
}

