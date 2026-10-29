// src/pages/seller/SellerStoreProfile.tsx

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  useGetMyStoresQuery,
  useUpdateStoreMutation,
  type StoreCategory,
  type StoreProfile,
  type StoreType,
  type UpdateStoreInput,
} from '../../api/storeApi';
import {
  clearStoreError,
  clearStoreMessage,
  setCurrentStore,
  selectCurrentStore,
  selectStoreError,
  selectStoreMessage,
  selectStoreMutating,
} from '../../store/slices/storeSlice';

// ============================================
// CONSTANTS
// ============================================

const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: 'physical', label: 'Physical goods' },
  { value: 'digital', label: 'Digital products' },
  { value: 'services', label: 'Services' },
  { value: 'mixed', label: 'Mixed' },
];

const STORE_CATEGORIES: { value: StoreCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home_garden', label: 'Home & Garden' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys' },
  { value: 'sports', label: 'Sports' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'health', label: 'Health' },
  { value: 'food', label: 'Food' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['USD', 'KES', 'NGN', 'EUR', 'GBP', 'ZAR'];

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'sw', label: 'Kiswahili' },
  { value: 'es', label: 'Español' },
];

// ============================================
// FORM SHAPE
// ============================================

interface FormState {
  name: string;
  tagline: string;
  description: string;
  category: StoreCategory;
  type: StoreType;
  sub_categories: StoreCategory[];
  contact_email: string;
  contact_phone: string;
  support_hours: string;
  location: string;
  country: string;
  timezone: string;
  currency: string;
  language: string;
  logo_url: string;
  banner_url: string;
  cover_image_url: string;
  social_links: {
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    website: string;
  };
  return_policy: {
    days: number;
    condition: 'unused' | 'opened' | 'any';
    refund_method: 'original' | 'store_credit';
    restocking_fee_percent: number;
    notes: string;
  };
  shipping_origin: {
    country: string;
    state: string;
    city: string;
    zip_code: string;
  };
}

const emptyForm: FormState = {
  name: '',
  tagline: '',
  description: '',
  category: 'other',
  type: 'physical',
  sub_categories: [],
  contact_email: '',
  contact_phone: '',
  support_hours: '',
  location: '',
  country: '',
  timezone: '',
  currency: 'USD',
  language: 'en',
  logo_url: '',
  banner_url: '',
  cover_image_url: '',
  social_links: {
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    website: '',
  },
  return_policy: {
    days: 14,
    condition: 'unused',
    refund_method: 'original',
    restocking_fee_percent: 0,
    notes: '',
  },
  shipping_origin: {
    country: '',
    state: '',
    city: '',
    zip_code: '',
  },
};

// Coerce whatever the backend sent into a StoreCategory[].
// Handles: array, null/undefined, single string, comma-separated string,
// arrays with nulls, and unknown values.
const normalizeSubCategories = (
  raw: unknown,
  fallbackCategory?: StoreCategory,
): StoreCategory[] => {
  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    list = raw.split(',').map((s) => s.trim());
  } else {
    list = [];
  }

  const valid = new Set(STORE_CATEGORIES.map((c) => c.value));

  return list
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && valid.has(v as StoreCategory))
    .filter((v) => v !== fallbackCategory) as StoreCategory[];
};

const toForm = (s: StoreProfile): FormState => {
  const category = (s.category ?? 'other') as StoreCategory;

  return {
    name: s.name ?? '',
    tagline: s.tagline ?? '',
    description: s.description ?? '',
    category,
    type: s.type ?? 'physical',
    sub_categories: normalizeSubCategories(s.sub_categories, category),
    contact_email: s.contact_email ?? '',
    contact_phone: s.contact_phone ?? '',
    support_hours: s.support_hours ?? '',
    location: s.location ?? '',
    country: s.country ?? '',
    timezone: s.timezone ?? '',
    currency: s.currency ?? 'USD',
    language: s.language ?? 'en',
    logo_url: s.logo_url ?? '',
    banner_url: s.banner_url ?? '',
    cover_image_url: s.cover_image_url ?? '',
    social_links: {
      twitter: s.social_links?.twitter ?? '',
      instagram: s.social_links?.instagram ?? '',
      facebook: s.social_links?.facebook ?? '',
      tiktok: s.social_links?.tiktok ?? '',
      website: s.social_links?.website ?? '',
    },
    return_policy: {
      days: s.return_policy?.days ?? 14,
      condition: s.return_policy?.condition ?? 'unused',
      refund_method: s.return_policy?.refund_method ?? 'original',
      restocking_fee_percent: s.return_policy?.restocking_fee_percent ?? 0,
      notes: s.return_policy?.notes ?? '',
    },
    shipping_origin: {
      country: s.shipping_origin?.country ?? '',
      state: s.shipping_origin?.state ?? '',
      city: s.shipping_origin?.city ?? '',
      zip_code: s.shipping_origin?.zip_code ?? '',
    },
  };
};

// Strip empty strings; result stays a record of strings (no undefined values).
const compactStrings = <T extends Record<string, string>>(
  obj: T,
): Partial<Record<keyof T, string>> => {
  const out: Partial<Record<keyof T, string>> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string' || v.trim() === '') continue;
    out[k as keyof T] = v.trim();
  }
  return out;
};

const toUpdateInput = (f: FormState): UpdateStoreInput => {
  // shipping_origin: country is required by the API type, so only build
  // the object when country is present.
  const so: UpdateStoreInput['shipping_origin'] = f.shipping_origin.country
    ? {
        country: f.shipping_origin.country.trim(),
        ...(f.shipping_origin.state && {
          state: f.shipping_origin.state.trim(),
        }),
        ...(f.shipping_origin.city && {
          city: f.shipping_origin.city.trim(),
        }),
        ...(f.shipping_origin.zip_code && {
          zip_code: f.shipping_origin.zip_code.trim(),
        }),
      }
    : undefined;

  // social_links: Record<string, string> — no undefined values allowed.
  const socials = compactStrings(f.social_links);
  const social_links =
    Object.keys(socials).length > 0
      ? (socials as Record<string, string>)
      : undefined;

  // return_policy: always sent; optional pieces stripped when empty.
  const return_policy: UpdateStoreInput['return_policy'] = {
    days: f.return_policy.days,
    condition: f.return_policy.condition,
    refund_method: f.return_policy.refund_method,
    ...(f.return_policy.restocking_fee_percent > 0 && {
      restocking_fee_percent: f.return_policy.restocking_fee_percent,
    }),
    ...(f.return_policy.notes && { notes: f.return_policy.notes.trim() }),
  };

  // Defense in depth: guarantee sub_categories is a valid array before send.
  const sub_categories = Array.isArray(f.sub_categories)
    ? f.sub_categories
    : normalizeSubCategories(f.sub_categories, f.category);

  return {
    name: f.name.trim(),
    ...(f.tagline && { tagline: f.tagline.trim() }),
    ...(f.description && { description: f.description.trim() }),
    category: f.category,
    sub_categories,
    ...(f.contact_email && { contact_email: f.contact_email.trim() }),
    ...(f.contact_phone && { contact_phone: f.contact_phone.trim() }),
    ...(f.support_hours && { support_hours: f.support_hours.trim() }),
    ...(f.location && { location: f.location.trim() }),
    ...(f.country && { country: f.country.trim() }),
    ...(f.timezone && { timezone: f.timezone.trim() }),
    currency: f.currency,
    language: f.language,
    ...(f.logo_url && { logo_url: f.logo_url.trim() }),
    ...(f.banner_url && { banner_url: f.banner_url.trim() }),
    ...(f.cover_image_url && { cover_image_url: f.cover_image_url.trim() }),
    ...(social_links && { social_links }),
    return_policy,
    ...(so && { shipping_origin: so }),
  };
};

// ============================================
// COMPONENT
// ============================================

type Tab = 'brand' | 'contact' | 'policies' | 'shipping';

const SellerStoreProfile = () => {
  const dispatch = useDispatch();

  const { data: storesData, isLoading: storesLoading } = useGetMyStoresQuery();

  const currentStore = useSelector(selectCurrentStore);
  const isMutating = useSelector(selectStoreMutating);
  const storeError = useSelector(selectStoreError);
  const storeMessage = useSelector(selectStoreMessage);

  const [updateStore] = useUpdateStoreMutation();

  // Pick currentStore if it's in the fetched list, else fall back to first.
  const store: StoreProfile | undefined = useMemo(() => {
    const list = storesData?.data ?? [];
    if (currentStore && list.some((s) => s.id === currentStore.id)) {
      return list.find((s) => s.id === currentStore.id);
    }
    return list[0];
  }, [storesData, currentStore]);

  useEffect(() => {
    if (store && store.id !== currentStore?.id) {
      dispatch(setCurrentStore(store));
    }
  }, [store, currentStore?.id, dispatch]);

  const [tab, setTab] = useState<Tab>('brand');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  // Rehydrate form when the underlying store changes.
  useEffect(() => {
    if (store) {
      setForm(toForm(store));
      setDirty(false);
    }
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Surface slice messages/errors as toasts.
  useEffect(() => {
    if (storeMessage) {
      setBanner({ tone: 'success', text: storeMessage });
      dispatch(clearStoreMessage());
    }
  }, [storeMessage, dispatch]);

  useEffect(() => {
    if (storeError) {
      setBanner({ tone: 'error', text: storeError });
      dispatch(clearStoreError());
    }
  }, [storeError, dispatch]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const setSocial = (
    key: keyof FormState['social_links'],
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value },
    }));
    setDirty(true);
  };

  const setReturn = <K extends keyof FormState['return_policy']>(
    key: K,
    value: FormState['return_policy'][K],
  ) => {
    setForm((prev) => ({
      ...prev,
      return_policy: { ...prev.return_policy, [key]: value },
    }));
    setDirty(true);
  };

  const setShipping = <K extends keyof FormState['shipping_origin']>(
    key: K,
    value: FormState['shipping_origin'][K],
  ) => {
    setForm((prev) => ({
      ...prev,
      shipping_origin: { ...prev.shipping_origin, [key]: value },
    }));
    setDirty(true);
  };

  const toggleSubCategory = (cat: StoreCategory) => {
    setForm((prev) => {
      const current = Array.isArray(prev.sub_categories)
        ? prev.sub_categories
        : [];
      const next = new Set(current);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return { ...prev, sub_categories: Array.from(next) };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!store) return;
    try {
      await updateStore({
        id: store.id,
        data: toUpdateInput(form),
      }).unwrap();
      setDirty(false);
    } catch {
      setBanner({ tone: 'error', text: 'Could not save changes. Try again.' });
    }
  };

  const handleReset = () => {
    if (store) {
      setForm(toForm(store));
      setDirty(false);
    }
  };

  // ------------------------------------------------------------
  // Loading / empty
  // ------------------------------------------------------------

  if (storesLoading && !store) {
    return <SkeletonPage />;
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          You don't have a store yet
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a store before you can edit its profile.
        </p>
        <a
          href="/store-setup"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create a store
        </a>
      </div>
    );
  }

  const isLive = store.status?.is_live === true;
  const canEdit = store.status?.can_edit !== false;
  const blockReason = store.status?.block_reason;

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Store profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            How your store appears to customers.{' '}
            <span className={isLive ? 'text-emerald-700' : 'text-amber-700'}>
              · {isLive ? 'Live' : 'Not live'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!dirty || isMutating}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isMutating || !canEdit}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {isMutating ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </header>

      {!canEdit && blockReason && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {blockReason}
        </div>
      )}

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
            ['brand', 'Brand'],
            ['contact', 'Contact & location'],
            ['policies', 'Return policy'],
            ['shipping', 'Shipping origin'],
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
        {tab === 'brand' && (
          <BrandSection
            form={form}
            set={set}
            setSocial={setSocial}
            toggleSubCategory={toggleSubCategory}
            slug={store.slug}
            disabled={!canEdit}
          />
        )}
        {tab === 'contact' && (
          <ContactSection form={form} set={set} disabled={!canEdit} />
        )}
        {tab === 'policies' && (
          <PoliciesSection
            form={form}
            setReturn={setReturn}
            disabled={!canEdit}
          />
        )}
        {tab === 'shipping' && (
          <ShippingSection
            form={form}
            setShipping={setShipping}
            disabled={!canEdit}
          />
        )}
      </div>
    </div>
  );
};

// ============================================
// SECTIONS
// ============================================

const BrandSection = ({
  form,
  set,
  setSocial,
  toggleSubCategory,
  slug,
  disabled,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setSocial: (k: keyof FormState['social_links'], v: string) => void;
  toggleSubCategory: (cat: StoreCategory) => void;
  slug: string;
  disabled: boolean;
}) => (
  <div className="space-y-5">
    <Field label="Store name" required>
      <input
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        disabled={disabled}
        className={inputClass}
      />
      <p className="mt-1 text-xs text-slate-500">
        Public URL: <span className="font-mono">/stores/{slug}</span>
      </p>
    </Field>

    <Field label="Tagline">
      <input
        value={form.tagline}
        onChange={(e) => set('tagline', e.target.value)}
        disabled={disabled}
        maxLength={120}
        placeholder="Short one-liner shown next to your store name"
        className={inputClass}
      />
    </Field>

    <Field label="Description">
      <textarea
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        disabled={disabled}
        rows={5}
        className={inputClass}
        placeholder="Tell customers what your store is about"
      />
    </Field>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Store type">
        <select
          value={form.type}
          onChange={(e) => set('type', e.target.value as StoreType)}
          disabled={disabled}
          className={inputClass}
        >
          {STORE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Primary category">
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value as StoreCategory)}
          disabled={disabled}
          className={inputClass}
        >
          {STORE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
    </div>

    <Field label="Sub-categories">
      <div className="flex flex-wrap gap-2">
        {STORE_CATEGORIES.filter((c) => c.value !== form.category).map((c) => {
          const active = Array.isArray(form.sub_categories)
            ? form.sub_categories.includes(c.value)
            : false;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleSubCategory(c.value)}
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              } disabled:opacity-40`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </Field>

    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Logo URL">
        <input
          value={form.logo_url}
          onChange={(e) => set('logo_url', e.target.value)}
          disabled={disabled}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>
      <Field label="Banner URL">
        <input
          value={form.banner_url}
          onChange={(e) => set('banner_url', e.target.value)}
          disabled={disabled}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>
      <Field label="Cover image URL">
        <input
          value={form.cover_image_url}
          onChange={(e) => set('cover_image_url', e.target.value)}
          disabled={disabled}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>
    </div>

    <Field label="Social links">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['website', 'Website'],
            ['twitter', 'X / Twitter'],
            ['instagram', 'Instagram'],
            ['facebook', 'Facebook'],
            ['tiktok', 'TikTok'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {label}
            </span>
            <input
              value={form.social_links[key]}
              onChange={(e) => setSocial(key, e.target.value)}
              disabled={disabled}
              placeholder={`https://${key}.com/…`}
              className={inputClass}
            />
          </label>
        ))}
      </div>
    </Field>
  </div>
);

const ContactSection = ({
  form,
  set,
  disabled,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  disabled: boolean;
}) => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Contact email">
        <input
          type="email"
          value={form.contact_email}
          onChange={(e) => set('contact_email', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
      <Field label="Contact phone">
        <input
          type="tel"
          value={form.contact_phone}
          onChange={(e) => set('contact_phone', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
    </div>

    <Field label="Support hours">
      <input
        value={form.support_hours}
        onChange={(e) => set('support_hours', e.target.value)}
        disabled={disabled}
        placeholder="Mon–Fri, 9am–6pm EAT"
        className={inputClass}
      />
    </Field>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Location (display)">
        <input
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          disabled={disabled}
          placeholder="Westlands, Nairobi"
          className={inputClass}
        />
      </Field>
      <Field label="Country">
        <input
          value={form.country}
          onChange={(e) => set('country', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Timezone">
        <input
          value={form.timezone}
          onChange={(e) => set('timezone', e.target.value)}
          disabled={disabled}
          placeholder="Africa/Nairobi"
          className={inputClass}
        />
      </Field>
      <Field label="Currency">
        <select
          value={form.currency}
          onChange={(e) => set('currency', e.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Language">
        <select
          value={form.language}
          onChange={(e) => set('language', e.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  </div>
);

const PoliciesSection = ({
  form,
  setReturn,
  disabled,
}: {
  form: FormState;
  setReturn: <K extends keyof FormState['return_policy']>(
    key: K,
    value: FormState['return_policy'][K],
  ) => void;
  disabled: boolean;
}) => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Return window (days)">
        <input
          type="number"
          min={0}
          max={120}
          value={form.return_policy.days}
          onChange={(e) => setReturn('days', Number(e.target.value))}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
      <Field label="Condition accepted">
        <select
          value={form.return_policy.condition}
          onChange={(e) =>
            setReturn(
              'condition',
              e.target.value as FormState['return_policy']['condition'],
            )
          }
          disabled={disabled}
          className={inputClass}
        >
          <option value="unused">Unused only</option>
          <option value="opened">Opened, in original packaging</option>
          <option value="any">Any condition</option>
        </select>
      </Field>
      <Field label="Refund method">
        <select
          value={form.return_policy.refund_method}
          onChange={(e) =>
            setReturn(
              'refund_method',
              e.target.value as FormState['return_policy']['refund_method'],
            )
          }
          disabled={disabled}
          className={inputClass}
        >
          <option value="original">Original payment method</option>
          <option value="store_credit">Store credit</option>
        </select>
      </Field>
    </div>

    <Field label="Restocking fee (%)">
      <input
        type="number"
        min={0}
        max={50}
        value={form.return_policy.restocking_fee_percent}
        onChange={(e) =>
          setReturn('restocking_fee_percent', Number(e.target.value))
        }
        disabled={disabled}
        className={inputClass}
      />
    </Field>

    <Field label="Additional notes">
      <textarea
        value={form.return_policy.notes}
        onChange={(e) => setReturn('notes', e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder="Any exceptions, exclusions, or details customers should know."
        className={inputClass}
      />
    </Field>
  </div>
);

const ShippingSection = ({
  form,
  setShipping,
  disabled,
}: {
  form: FormState;
  setShipping: <K extends keyof FormState['shipping_origin']>(
    key: K,
    value: FormState['shipping_origin'][K],
  ) => void;
  disabled: boolean;
}) => (
  <div className="space-y-5">
    <p className="text-sm text-slate-600">
      Where do you ship from? This is used to calculate rates and delivery
      estimates at checkout.
    </p>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Country">
        <input
          value={form.shipping_origin.country}
          onChange={(e) => setShipping('country', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
      <Field label="State / province">
        <input
          value={form.shipping_origin.state}
          onChange={(e) => setShipping('state', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="City">
        <input
          value={form.shipping_origin.city}
          onChange={(e) => setShipping('city', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
      <Field label="Postal / ZIP code">
        <input
          value={form.shipping_origin.zip_code}
          onChange={(e) => setShipping('zip_code', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </Field>
    </div>
  </div>
);

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
  <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-6">
    <div className="mb-6 h-8 w-48 rounded bg-slate-200" />
    <div className="mb-4 h-10 rounded bg-slate-200" />
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-32 rounded bg-slate-200" />
    </div>
  </div>
);

export default SellerStoreProfile;