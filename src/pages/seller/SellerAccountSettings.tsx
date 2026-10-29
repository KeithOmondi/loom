// src/pages/seller/SellerAccountSettings.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { AppDispatch } from '../../store/store';
import {
  logoutThunk,
  fetchSessionsThunk,
  revokeSessionThunk,
  clearAuthError,
  clearAuthMessage,
  selectAuthUser,
  selectSessions,
  selectSessionsStatus,
  selectAuthError,
  selectAuthMessage,
  type AuthUser,
  type Session,
} from '../../store/slices/authSlice';
import {
  getProfileThunk,
  updateProfileThunk,
  changePasswordThunk,
  uploadAvatarThunk,
  removeAvatarThunk,
  clearUserError,
  clearUserMessage,
  selectUserProfile,
  selectUserLoading,
  selectUserMutating,
  selectUserError,
  selectUserMessage,
  type User,
  type UpdateProfileInput,
  type UpdatePasswordInput,
} from '../../store/slices/userSlice';

// ============================================
// HELPERS
// ============================================

const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const relativeTime = (iso: string) => {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diff / 30)} month${Math.floor(diff / 30) === 1 ? '' : 's'} ago`;
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

const ROLE_LABEL: Record<string, string> = {
  seller: 'Seller',
  moderator: 'Moderator',
  admin: 'Administrator',
  super_admin: 'Super administrator',
};

// Normalize either source into the richer `User` shape the sections expect.
// AuthUser has fewer required fields (created_at/updated_at are optional),
// so fill the gaps with safe defaults.
const toUser = (u: AuthUser | User | null | undefined): User | null => {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    phone: u.phone ?? null,
    is_active: u.is_active,
    avatar_url: u.avatar_url ?? null,
    avatar_public_id:
      'avatar_public_id' in u ? (u.avatar_public_id ?? null) : null,
    created_at: u.created_at ?? '',
    updated_at: u.updated_at ?? '',
  };
};

// ============================================
// COMPONENT
// ============================================

type Tab = 'profile' | 'security' | 'sessions' | 'danger';

const SellerAccountSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const authUser = useSelector(selectAuthUser) as AuthUser | null;
  const sessions = useSelector(selectSessions);
  const sessionsStatus = useSelector(selectSessionsStatus);
  const authError = useSelector(selectAuthError);
  const authMessage = useSelector(selectAuthMessage);

  const profile = useSelector(selectUserProfile) as User | null;
  const profileLoading = useSelector(selectUserLoading);
  const profileMutating = useSelector(selectUserMutating);
  const profileError = useSelector(selectUserError);
  const profileMessage = useSelector(selectUserMessage);

  // Prefer the user slice profile (richer), fall back to auth user,
  // then normalize to a single `User` shape so downstream components can
  // rely on required fields being present.
  const user = useMemo(
    () => toUser(profile) ?? toUser(authUser),
    [profile, authUser],
  );

  const [tab, setTab] = useState<Tab>('profile');
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  // ============================================================
  // HOOKS — all unconditional, before any early return
  // ============================================================

  useEffect(() => {
    dispatch(getProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (tab === 'sessions' && sessionsStatus === 'idle') {
      dispatch(fetchSessionsThunk());
    }
  }, [tab, sessionsStatus, dispatch]);

  // Merge messages from both slices into the banner.
  useEffect(() => {
    if (authMessage) {
      setBanner({ tone: 'success', text: String(authMessage) });
      dispatch(clearAuthMessage());
    }
  }, [authMessage, dispatch]);

  useEffect(() => {
    if (profileMessage) {
      setBanner({ tone: 'success', text: String(profileMessage) });
      dispatch(clearUserMessage());
    }
  }, [profileMessage, dispatch]);

  useEffect(() => {
    if (authError) {
      setBanner({ tone: 'error', text: String(authError) });
      dispatch(clearAuthError());
    }
  }, [authError, dispatch]);

  useEffect(() => {
    if (profileError) {
      setBanner({ tone: 'error', text: String(profileError) });
      dispatch(clearUserError());
    }
  }, [profileError, dispatch]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  // ============================================================
  // Loading / not signed in
  // ============================================================

  if (profileLoading && !user) {
    return <SkeletonPage />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Not signed in
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your session may have expired. Please sign in again.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </a>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, security, and active sessions.
        </p>
      </header>

      {/* Identity header */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <AvatarDisplay user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-900">
              {user.full_name}
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            {!user.is_active && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
          {user.phone && (
            <p className="mt-0.5 text-sm text-slate-500">{user.phone}</p>
          )}
          {user.created_at && (
            <p className="mt-1 text-xs text-slate-400">
              Member since {shortDateTime(user.created_at).split(',')[0]}
            </p>
          )}
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            banner.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['profile', 'Profile'],
            ['security', 'Security'],
            ['sessions', 'Active sessions'],
            ['danger', 'Danger zone'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as Tab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {tab === 'profile' && (
          <ProfileSection
            user={user}
            mutating={profileMutating}
            onSaveProfile={(data) => dispatch(updateProfileThunk(data)).unwrap()}
            onUploadAvatar={async (file) => {
              const res = await dispatch(uploadAvatarThunk(file)).unwrap();
              return res;
            }}
            onRemoveAvatar={() => dispatch(removeAvatarThunk()).unwrap()}
          />
        )}
        {tab === 'security' && (
          <SecuritySection
            mutating={profileMutating}
            onChangePassword={(data) =>
              dispatch(changePasswordThunk(data)).unwrap()
            }
          />
        )}
        {tab === 'sessions' && (
          <SessionsSection
            sessions={sessions}
            loading={sessionsStatus === 'loading'}
            onRefresh={() => dispatch(fetchSessionsThunk())}
            onRevoke={(id) => dispatch(revokeSessionThunk(id))}
          />
        )}
        {tab === 'danger' && <DangerZone onLogout={handleLogout} />}
      </div>
    </div>
  );
};

// ============================================
// AVATAR
// ============================================

const AvatarDisplay = ({
  user,
}: {
  user: Pick<User, 'full_name' | 'avatar_url'>;
}) => {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
      {initials(user.full_name)}
    </div>
  );
};

// ============================================
// PROFILE SECTION
// ============================================

const ProfileSection = ({
  user,
  mutating,
  onSaveProfile,
  onUploadAvatar,
  onRemoveAvatar,
}: {
  user: User;
  mutating: boolean;
  onSaveProfile: (data: UpdateProfileInput) => Promise<unknown>;
  onUploadAvatar: (file: File) => Promise<{ url: string; publicId: string }>;
  onRemoveAvatar: () => Promise<unknown>;
}) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [dirty, setDirty] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rehydrate when the underlying user changes (e.g. after successful save).
  useEffect(() => {
    setFullName(user.full_name);
    setEmail(user.email);
    setDirty(false);
  }, [user.id, user.full_name, user.email]);

  const handleSave = async () => {
    const payload: UpdateProfileInput = {};
    if (fullName.trim() !== user.full_name) payload.full_name = fullName.trim();
    if (email.trim() !== user.email) payload.email = email.trim();
    if (Object.keys(payload).length === 0) {
      setDirty(false);
      return;
    }
    await onSaveProfile(payload);
    setDirty(false);
  };

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image is too large. Max 5 MB.');
      return;
    }
    setAvatarBusy(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile photo?')) return;
    setAvatarBusy(true);
    try {
      await onRemoveAvatar();
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar block */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Profile photo</p>
        <div className="flex items-center gap-4">
          <AvatarDisplay
            user={{
              full_name: fullName || user.full_name,
              avatar_url: user.avatar_url,
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={mutating || avatarBusy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {avatarBusy
                ? 'Uploading…'
                : user.avatar_url
                  ? 'Change photo'
                  : 'Upload photo'}
            </button>
            {user.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={mutating || avatarBusy}
                className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          JPG, PNG, or WebP · max 5 MB
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* Name + email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setDirty(true);
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Email address" required>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setDirty(true);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Changing your email may require re-verification.
          </p>
        </Field>
      </div>

      {user.phone && (
        <Field label="Phone number">
          <input
            value={user.phone}
            disabled
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Contact support to change your phone number.
          </p>
        </Field>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setFullName(user.full_name);
            setEmail(user.email);
            setDirty(false);
          }}
          disabled={!dirty || mutating}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || mutating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {mutating ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// SECURITY SECTION
// ============================================

const SecuritySection = ({
  mutating,
  onChangePassword,
}: {
  mutating: boolean;
  onChangePassword: (data: UpdatePasswordInput) => Promise<unknown>;
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!current || !next || !confirm) {
      setLocalError('All fields are required.');
      return;
    }
    if (next.length < 8) {
      setLocalError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setLocalError('New password and confirmation do not match.');
      return;
    }
    if (next === current) {
      setLocalError('New password must be different from the current one.');
      return;
    }

    try {
      await onChangePassword({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });
      reset();
    } catch {
      // error message is surfaced by the slice to the parent banner
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-slate-900">Change password</h3>
        <p className="mt-1 text-xs text-slate-500">
          Use at least 8 characters. We recommend a mix of letters, numbers, and symbols.
        </p>
      </div>

      {localError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {localError}
        </div>
      )}

      <Field label="Current password" required>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" required>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password" required>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={mutating || (!current && !next && !confirm)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={mutating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {mutating ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
};

// ============================================
// SESSIONS SECTION
// ============================================

const SessionsSection = ({
  sessions,
  loading,
  onRefresh,
  onRevoke,
}: {
  sessions: Session[];
  loading: boolean;
  onRefresh: () => void;
  onRevoke: (id: string) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-900">
            Active sessions
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Devices currently signed in to your account.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No active sessions.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {s.user_agent ?? 'Unknown device'}
                  </p>
                  {s.is_current && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                      This device
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {s.ip_address ?? 'Unknown IP'} · started{' '}
                  {relativeTime(s.created_at)}
                  {s.last_used_at && ` · last active ${relativeTime(s.last_used_at)}`}
                </p>
              </div>
              {!s.is_current && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Sign out of this session?')) onRevoke(s.id);
                  }}
                  className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ============================================
// DANGER ZONE
// ============================================

const DangerZone = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!confirm('Sign out of your account on this device?')) return;
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Sign out</p>
            <p className="mt-1 text-xs text-slate-500">
              Ends this session on this device. Other sessions remain active.
            </p>
          </div>
          <button
            type="button"
            onClick={handle}
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-rose-900">Close seller account</p>
            <p className="mt-1 text-xs text-rose-700">
              Permanently close your seller account and disable all stores.
              Any pending payouts will be settled first. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Contact support to close your account"
            className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Request closure
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PRIMITIVES
// ============================================

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500';

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-1 text-rose-600">*</span>}
    </span>
    {children}
  </label>
);

const SkeletonPage = () => (
  <div className="mx-auto w-full max-w-4xl animate-pulse px-4 py-6">
    <div className="mb-6 h-8 w-56 rounded bg-slate-200" />
    <div className="mb-6 h-24 rounded-xl bg-slate-200" />
    <div className="mb-4 h-10 rounded bg-slate-200" />
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-10 rounded bg-slate-200" />
    </div>
  </div>
);

export default SellerAccountSettings;