// src/pages/seller/SellerBankMobileMoney.tsx

import { useMemo, useState } from 'react';

// ============================================
// TYPES
// ============================================

type PayoutMethod = 'bank' | 'mpesa' | 'paypal' | 'stripe' | 'crypto';

type DestinationStatus =
  | 'pending_verification'  // micro-deposit / OTP pending
  | 'verified'              // usable for payouts
  | 'failed'                // verification failed
  | 'disabled';             // manually disabled by seller

type Currency = 'USD' | 'KES' | 'NGN' | 'EUR' | 'GBP' | 'ZAR';

interface PayoutDestination {
  id: string;
  method: PayoutMethod;
  status: DestinationStatus;
  isDefault: boolean;
  currency: Currency;
  label: string;            // seller-facing nickname
  createdAt: string;
  verifiedAt: string | null;

  // Bank-specific
  bankName?: string;
  bankAccountName?: string;
  bankAccountMask?: string;
  bankRoutingMask?: string;
  bankCountry?: string;

  // Mobile-money specific
  mobileProvider?: string;
  mobilePhoneMask?: string;
  mobileCountry?: string;

  // PayPal / Stripe specific
  email?: string;
  stripeConnectId?: string;

  // Crypto-specific
  walletAddressMask?: string;
  network?: string;

  // Verification
  verificationMethod?: 'micro_deposit' | 'otp' | 'instant' | 'manual';
  verificationNote?: string;
  failureReason?: string;
}

interface PayoutSettings {
  schedule: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  minimumPayout: number;
  currency: Currency;
  holdPeriodDays: number;
  autoPayout: boolean;
}

// ============================================
// DUMMY DATA
// ============================================

const SETTINGS: PayoutSettings = {
  schedule: 'biweekly',
  minimumPayout: 50,
  currency: 'USD',
  holdPeriodDays: 7,
  autoPayout: true,
};

const DESTINATIONS: PayoutDestination[] = [
  {
    id: 'dst_01HX1001',
    method: 'bank',
    status: 'verified',
    isDefault: true,
    currency: 'USD',
    label: 'Primary business account',
    createdAt: '2026-01-14T09:00:00Z',
    verifiedAt: '2026-01-16T14:22:00Z',
    bankName: 'Chase Bank',
    bankAccountName: 'Mwangi Trading LLC',
    bankAccountMask: '****4821',
    bankRoutingMask: '****0092',
    bankCountry: 'United States',
    verificationMethod: 'micro_deposit',
    verificationNote: 'Verified via two micro-deposits on Jan 16.',
  },
  {
    id: 'dst_01HX1002',
    method: 'mpesa',
    status: 'verified',
    isDefault: false,
    currency: 'KES',
    label: 'Personal M-PESA (Kenya)',
    createdAt: '2026-02-02T10:15:00Z',
    verifiedAt: '2026-02-02T10:18:00Z',
    mobileProvider: 'Safaricom M-PESA',
    mobilePhoneMask: '+254 *** 4407',
    mobileCountry: 'Kenya',
    verificationMethod: 'otp',
    verificationNote: 'OTP confirmed on Feb 2.',
  },
  {
    id: 'dst_01HX1003',
    method: 'paypal',
    status: 'pending_verification',
    isDefault: false,
    currency: 'USD',
    label: 'Backup — PayPal',
    createdAt: '2026-10-08T16:40:00Z',
    verifiedAt: null,
    email: 'payouts@mwangi-trading.example',
    verificationMethod: 'instant',
    verificationNote: 'Confirm the email link PayPal sent to finish setup.',
  },
  {
    id: 'dst_01HX1004',
    method: 'bank',
    status: 'failed',
    isDefault: false,
    currency: 'USD',
    label: 'Old business account (replace)',
    createdAt: '2026-03-12T08:30:00Z',
    verifiedAt: null,
    bankName: 'Wells Fargo',
    bankAccountName: 'Mwangi Trading LLC',
    bankAccountMask: '****7710',
    bankRoutingMask: '****1200',
    bankCountry: 'United States',
    verificationMethod: 'micro_deposit',
    failureReason:
      'Micro-deposit amounts entered twice incorrectly. Re-add the account to retry.',
  },
  {
    id: 'dst_01HX1005',
    method: 'stripe',
    status: 'verified',
    isDefault: false,
    currency: 'USD',
    label: 'Stripe Connect',
    createdAt: '2026-05-20T12:00:00Z',
    verifiedAt: '2026-05-20T12:00:05Z',
    stripeConnectId: 'acct_1P4mQn2eZvKYlo2C',
    verificationMethod: 'instant',
  },
  {
    id: 'dst_01HX1006',
    method: 'crypto',
    status: 'disabled',
    isDefault: false,
    currency: 'USD',
    label: 'USDC — Ethereum',
    createdAt: '2026-06-10T14:00:00Z',
    verifiedAt: '2026-06-10T14:01:00Z',
    walletAddressMask: '0x74A1…9cB3',
    network: 'Ethereum mainnet',
    verificationMethod: 'instant',
    verificationNote: 'Disabled by you on Aug 3.',
  },
];

// ============================================
// HELPERS
// ============================================

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const METHOD_LABEL: Record<PayoutMethod, string> = {
  bank: 'Bank transfer',
  mpesa: 'M-PESA',
  paypal: 'PayPal',
  stripe: 'Stripe',
  crypto: 'Crypto wallet',
};

const METHOD_ICON_TONE: Record<PayoutMethod, string> = {
  bank: 'bg-sky-100 text-sky-800',
  mpesa: 'bg-emerald-100 text-emerald-800',
  paypal: 'bg-indigo-100 text-indigo-800',
  stripe: 'bg-violet-100 text-violet-800',
  crypto: 'bg-amber-100 text-amber-800',
};

const STATUS_LABEL: Record<DestinationStatus, string> = {
  pending_verification: 'Pending verification',
  verified: 'Verified',
  failed: 'Verification failed',
  disabled: 'Disabled',
};

const STATUS_TONE: Record<DestinationStatus, string> = {
  pending_verification: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  disabled: 'bg-slate-200 text-slate-600',
};

const SCHEDULE_LABEL: Record<PayoutSettings['schedule'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
};

// Compact summary line per destination, e.g. "Chase Bank · ****4821"
const destinationSummary = (d: PayoutDestination): string => {
  switch (d.method) {
    case 'bank':
      return [d.bankName, d.bankAccountMask].filter(Boolean).join(' · ');
    case 'mpesa':
      return [d.mobileProvider, d.mobilePhoneMask].filter(Boolean).join(' · ');
    case 'paypal':
      return d.email ?? 'PayPal account';
    case 'stripe':
      return d.stripeConnectId ?? 'Stripe Connect';
    case 'crypto':
      return [d.network, d.walletAddressMask].filter(Boolean).join(' · ');
  }
};

// ============================================
// COMPONENT
// ============================================

type FilterTab = 'all' | 'verified' | 'pending' | 'inactive';

const SellerBankMobileMoney = () => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [confirmRemove, setConfirmRemove] = useState<PayoutDestination | null>(
    null,
  );

  const counts = useMemo(
    () => ({
      all: DESTINATIONS.length,
      verified: DESTINATIONS.filter((d) => d.status === 'verified').length,
      pending: DESTINATIONS.filter((d) => d.status === 'pending_verification')
        .length,
      inactive: DESTINATIONS.filter((d) =>
        ['failed', 'disabled'].includes(d.status),
      ).length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    return DESTINATIONS.filter((d) => {
      if (filter === 'verified' && d.status !== 'verified') return false;
      if (filter === 'pending' && d.status !== 'pending_verification')
        return false;
      if (
        filter === 'inactive' &&
        !['failed', 'disabled'].includes(d.status)
      )
        return false;
      return true;
    });
  }, [filter]);

  const defaultDest = DESTINATIONS.find((d) => d.isDefault);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Bank &amp; mobile money
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the accounts that receive your payouts.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add payout method
        </button>
      </header>

      {/* Default destination summary */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Default payout destination
          </p>
          {defaultDest ? (
            <>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {defaultDest.label}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                {METHOD_LABEL[defaultDest.method]} ·{' '}
                {destinationSummary(defaultDest)} · {defaultDest.currency}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-rose-600">
              No default payout method set. Add one to receive payouts.
            </p>
          )}
        </div>
        {defaultDest && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Verified
          </span>
        )}
      </div>

      {/* Payout schedule summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryTile
          label="Payout schedule"
          value={SCHEDULE_LABEL[SETTINGS.schedule]}
        />
        <SummaryTile
          label="Minimum payout"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: SETTINGS.currency,
          }).format(SETTINGS.minimumPayout)}
        />
        <SummaryTile
          label="Hold period"
          value={`${SETTINGS.holdPeriodDays} days`}
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['all', `All (${counts.all})`],
            ['verified', `Verified (${counts.verified})`],
            ['pending', `Pending (${counts.pending})`],
            ['inactive', `Inactive (${counts.inactive})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterTab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Destination list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No payout methods match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((d) => (
            <DestinationCard
              key={d.id}
              destination={d}
              onRemove={() => setConfirmRemove(d)}
            />
          ))}
        </ul>
      )}

      {/* Remove confirmation */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Remove payout method?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{confirmRemove.label}</span> (
              {METHOD_LABEL[confirmRemove.method]}) will be removed. Payouts
              currently in transit to this account are not affected.
            </p>
            {confirmRemove.isDefault && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This is your default method. Choose a new default before the
                next payout cycle.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// DESTINATION CARD
// ============================================

const DestinationCard = ({
  destination,
  onRemove,
}: {
  destination: PayoutDestination;
  onRemove: () => void;
}) => {
  const isVerified = destination.status === 'verified';
  const isPending = destination.status === 'pending_verification';
  const isFailed = destination.status === 'failed';
  const isDisabled = destination.status === 'disabled';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${METHOD_ICON_TONE[destination.method]}`}
          >
            {METHOD_LABEL[destination.method].slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-slate-900">
                {destination.label}
              </p>
              {destination.isDefault && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Default
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[destination.status]}`}
              >
                {STATUS_LABEL[destination.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {METHOD_LABEL[destination.method]} ·{' '}
              {destinationSummary(destination)} · {destination.currency}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Added {shortDate(destination.createdAt)}
              {destination.verifiedAt
                ? ` · Verified ${shortDate(destination.verifiedAt)}`
                : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {isPending && (
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Continue verification
            </button>
          )}
          {isFailed && (
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Retry
            </button>
          )}
          {isVerified && !destination.isDefault && (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Make default
            </button>
          )}
          {isDisabled && (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Enable
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Inline notices */}
      {isPending && destination.verificationNote && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {destination.verificationNote}
        </p>
      )}
      {isFailed && destination.failureReason && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {destination.failureReason}
        </p>
      )}
      {isDisabled && destination.verificationNote && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {destination.verificationNote}
        </p>
      )}

      {/* Verification footer for verified methods */}
      {isVerified && destination.verificationMethod && (
        <p className="mt-3 text-xs text-slate-500">
          Verified via{' '}
          <span className="font-medium text-slate-700">
            {destination.verificationMethod === 'micro_deposit'
              ? 'micro-deposits'
              : destination.verificationMethod === 'otp'
                ? 'OTP'
                : destination.verificationMethod === 'instant'
                  ? 'instant confirmation'
                  : 'manual review'}
          </span>
          {destination.verificationNote ? ` — ${destination.verificationNote}` : ''}
        </p>
      )}
    </li>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const SummaryTile = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

export default SellerBankMobileMoney;