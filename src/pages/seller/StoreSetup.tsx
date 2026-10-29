// src/components/pages/seller/StoreSetup.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Store, Link2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  useGetMyStoresQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  type StoreCategory,
  type StoreType,
  type ReturnPolicy,
  type ShippingOrigin,
  isStoreActive,
  getStoreStatusCode,
} from '../../api/storeApi';
import { clearStoreError, clearStoreMessage } from '../../store/slices/storeSlice';

type Field =
  | 'name'
  | 'description'
  | 'tagline'
  | 'contact_email'
  | 'contact_phone'
  | 'support_hours'
  | 'location'
  | 'country'
  | 'timezone'
  | 'category'
  | 'type'
  | 'return_days'
  | 'return_condition'
  | 'refund_method'
  | 'shipping_country'
  | 'shipping_state'
  | 'shipping_city'
  | 'shipping_zip';

// Country options with ISO codes
const countries = [
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'MA', name: 'Morocco' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IL', name: 'Israel' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TH', name: 'Thailand' },
  { code: 'NZ', name: 'New Zealand' },
];

const StoreSetup = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error, message } = useAppSelector((state) => state.store);
  const user = useAppSelector((state) => state.auth.user);

  // RTK Query hooks
  const {
    data: storesData,
    isLoading: storesLoading,
    refetch: refetchStores,
  } = useGetMyStoresQuery();
  const [createStore, { isLoading: isCreating }] = useCreateStoreMutation();
  const [updateStore, { isLoading: isUpdating }] = useUpdateStoreMutation();

  // Check if user has an existing store
  const existingStore = storesData?.data?.[0];

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [supportHours, setSupportHours] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [category, setCategory] = useState<StoreCategory | ''>('');
  const [type, setType] = useState<StoreType | ''>('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Return Policy
  const [returnDays, setReturnDays] = useState(30);
  const [returnCondition, setReturnCondition] = useState<'unused' | 'opened' | 'any'>('unused');
  const [refundMethod, setRefundMethod] = useState<'original' | 'store_credit'>('original');
  const [restockingFee, setRestockingFee] = useState(0);
  const [returnNotes, setReturnNotes] = useState('');

  // Shipping Origin
  const [shippingCountry, setShippingCountry] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingZip, setShippingZip] = useState('');

  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const [socialInput, setSocialInput] = useState({ platform: '', url: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check if user is authenticated and is a seller
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

  // Pre-fill form if editing existing store
  useEffect(() => {
    if (existingStore) {
      setName(existingStore.name || '');
      setDescription(existingStore.description || '');
      setTagline(existingStore.tagline || '');
      setContactEmail(existingStore.contact_email || '');
      setContactPhone(existingStore.contact_phone || '');
      setSupportHours(existingStore.support_hours || '');
      setLocation(existingStore.location || '');
      setCountry(existingStore.country || '');
      setTimezone(existingStore.timezone || '');
      setCategory(existingStore.category || '');
      setType(existingStore.type || '');
      setSocialLinks(existingStore.social_links || {});

      if (existingStore.return_policy) {
        setReturnDays(existingStore.return_policy.days || 30);
        setReturnCondition(existingStore.return_policy.condition || 'unused');
        setRefundMethod(existingStore.return_policy.refund_method || 'original');
        setRestockingFee(existingStore.return_policy.restocking_fee_percent || 0);
        setReturnNotes(existingStore.return_policy.notes || '');
      }

      if (existingStore.shipping_origin) {
        setShippingCountry(existingStore.shipping_origin.country || '');
        setShippingState(existingStore.shipping_origin.state || '');
        setShippingCity(existingStore.shipping_origin.city || '');
        setShippingZip(existingStore.shipping_origin.zip_code || '');
      }
    }
  }, [existingStore]);

  // Show toast messages
  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(clearStoreMessage());
    }
    if (error) {
      toast.error(error);
      dispatch(clearStoreError());
    }
  }, [message, error, dispatch]);

  // ✅ Redirect if store is already active (seller shouldn't be here)
useEffect(() => {
  if (isStoreActive(existingStore)) {
    navigate('/dashboard', { replace: true });
    return;
  }
  const code = getStoreStatusCode(existingStore);
  if (code === 'suspended' || code === 'closed') {
    navigate('/store-status', { replace: true });
  }
}, [existingStore, navigate]);

  const fieldBorder = (field: Field) =>
    focusedField === field
      ? 'border-accent-700 ring-2 ring-accent-700/20'
      : 'border-warmGray-200';

  const inputClass = (field: Field) =>
    `w-full bg-warmGray-50/50 border rounded-2xl px-4 py-3 text-warmGray-900 placeholder:text-warmGray-400 outline-none transition-all duration-200 ${fieldBorder(
      field
    )}`;

  const selectClass = (field: Field) =>
    `w-full bg-warmGray-50/50 border rounded-2xl px-4 py-3 text-warmGray-900 outline-none transition-all duration-200 ${fieldBorder(
      field
    )}`;

  const isValid =
    name.trim() !== '' &&
    contactEmail.trim() !== '' &&
    category !== '' &&
    type !== '' &&
    acceptedTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error('Please fill in all required fields and accept the terms.');
      return;
    }

    try {
      const returnPolicy: ReturnPolicy | undefined = {
        days: returnDays,
        condition: returnCondition,
        refund_method: refundMethod,
        restocking_fee_percent: restockingFee > 0 ? restockingFee : undefined,
        notes: returnNotes || undefined,
      };

      // ✅ Only include shipping_origin for physical/mixed stores
      let shippingOrigin: ShippingOrigin | undefined = undefined;

      if (type === 'physical' || type === 'mixed') {
        shippingOrigin =
          shippingCountry || shippingState || shippingCity || shippingZip
            ? {
                country: shippingCountry || '',
                state: shippingState || undefined,
                city: shippingCity || undefined,
                zip_code: shippingZip || undefined,
              }
            : undefined;
      }

      const countryCode = country || '';

      const formData = {
        name: name.trim(),
        description: description.trim() || undefined,
        tagline: tagline.trim() || undefined,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || undefined,
        support_hours: supportHours.trim() || undefined,
        location: location.trim() || undefined,
        country: countryCode,
        timezone: timezone.trim() || undefined,
        category: category as StoreCategory,
        type: type as StoreType,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        return_policy: returnPolicy,
        shipping_origin: shippingOrigin,
      };

      if (existingStore) {
        // ===== UPDATE EXISTING STORE =====
        await updateStore({
          id: existingStore.id,
          data: formData,
        }).unwrap();

        toast.success('Store updated successfully!');
        navigate('/dashboard', { replace: true });
      } else {
        // ===== CREATE NEW STORE (INSTANT ACTIVATION) =====
        const result = await createStore(formData).unwrap();

        // ✅ Store is live immediately — no approval needed
        toast.success(result.message || 'Store created successfully! You can now start selling.');

        // Refetch stores to update the UI
        try {
          await refetchStores();
        } catch (err) {
          console.debug('Refetch skipped:', err);
        }

        // ✅ Redirect straight to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // Error handled by RTK Query — toast shown via useEffect
      console.error('Store setup error:', err);
    }
  };

  const addSocialLink = () => {
    if (socialInput.platform && socialInput.url) {
      setSocialLinks((prev) => ({
        ...prev,
        [socialInput.platform]: socialInput.url,
      }));
      setSocialInput({ platform: '', url: '' });
    }
  };

  const removeSocialLink = (platform: string) => {
    const newLinks = { ...socialLinks };
    delete newLinks[platform];
    setSocialLinks(newLinks);
  };

  // Loading state
  if (storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmGray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
          <p className="mt-4 text-warmGray-600">Loading your store information...</p>
        </div>
      </div>
    );
  }

  const isEditing = !!existingStore;
  const isProcessing = isCreating || isUpdating;

  return (
    <div className="min-h-screen bg-warmGray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center">
              <Store size={32} className="text-accent-700" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-warmGray-900">
            {isEditing ? 'Edit Your Store' : 'Create Your Store'}
          </h1>
          <p className="text-warmGray-500 mt-2 text-sm">
            {isEditing
              ? 'Update your store information.'
              : 'Set up your storefront and start selling immediately.'}
          </p>

          {/* ✅ New: Positive messaging for instant activation */}
          {!isEditing && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700">
              <CheckCircle size={16} />
              <span>
                <span className="font-medium">No approval needed.</span> Your store goes live the moment you create it.
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-sm border border-warmGray-100 p-6 md:p-8 space-y-6"
        >
          {/* Store Basic Information */}
          <div>
            <h2 className="text-lg font-serif text-warmGray-900 mb-4">Store Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Electronics"
                  className={inputClass('name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isProcessing}
                />
                <p className="text-xs text-warmGray-400 mt-1.5 ml-1">
                  This will be your store's public name and URL slug.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Store Description <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  placeholder="Tell customers what your store is about..."
                  className={`${inputClass('description')} min-h-[100px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Tagline <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quality Electronics Since 2024"
                  className={inputClass('tagline')}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  onFocus={() => setFocusedField('tagline')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          {/* Store Type & Category */}
          <div className="pt-4 border-t border-warmGray-100">
            <h2 className="text-lg font-serif text-warmGray-900 mb-4">Store Type & Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Store Type <span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass('type')}
                  value={type}
                  onChange={(e) => setType(e.target.value as StoreType | '')}
                  onFocus={() => setFocusedField('type')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isProcessing}
                >
                  <option value="">Select type</option>
                  <option value="physical">Physical Products</option>
                  <option value="digital">Digital Products</option>
                  <option value="services">Services</option>
                  <option value="mixed">Mixed (Physical + Digital)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  className={selectClass('category')}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StoreCategory | '')}
                  onFocus={() => setFocusedField('category')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isProcessing}
                >
                  <option value="">Select category</option>
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home_garden">Home & Garden</option>
                  <option value="beauty">Beauty</option>
                  <option value="books">Books</option>
                  <option value="toys">Toys</option>
                  <option value="sports">Sports</option>
                  <option value="automotive">Automotive</option>
                  <option value="health">Health</option>
                  <option value="food">Food</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="pt-4 border-t border-warmGray-100">
            <h2 className="text-lg font-serif text-warmGray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="store@example.com"
                  className={inputClass('contact_email')}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onFocus={() => setFocusedField('contact_email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Contact Phone <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={inputClass('contact_phone')}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  onFocus={() => setFocusedField('contact_phone')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Support Hours <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Mon-Fri 9AM-5PM EST"
                  className={inputClass('support_hours')}
                  value={supportHours}
                  onChange={(e) => setSupportHours(e.target.value)}
                  onFocus={() => setFocusedField('support_hours')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Timezone <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="America/Los_Angeles"
                  className={inputClass('timezone')}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  onFocus={() => setFocusedField('timezone')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Store Location <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nairobi, Kenya"
                  className={inputClass('location')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => setFocusedField('location')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                  Country <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                </label>
                <select
                  className={selectClass('country')}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  onFocus={() => setFocusedField('country')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isProcessing}
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-warmGray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-warmGray-600 hover:text-warmGray-900 transition-colors"
            >
              <span className="text-lg font-serif">Advanced Settings</span>
              {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <p className="text-sm text-warmGray-400 mt-1">
              Return policy and shipping origin (optional)
            </p>

            {showAdvanced && (
              <div className="mt-4 space-y-6">
                {/* Return Policy */}
                <div>
                  <h3 className="text-sm font-semibold text-warmGray-700 mb-3">Return Policy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                        Return Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        className={inputClass('return_days')}
                        value={returnDays}
                        onChange={(e) => setReturnDays(parseInt(e.target.value) || 0)}
                        onFocus={() => setFocusedField('return_days')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isProcessing}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                        Return Condition
                      </label>
                      <select
                        className={selectClass('return_condition')}
                        value={returnCondition}
                        onChange={(e) => setReturnCondition(e.target.value as any)}
                        onFocus={() => setFocusedField('return_condition')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isProcessing}
                      >
                        <option value="unused">Unused/New</option>
                        <option value="opened">Opened (with tags)</option>
                        <option value="any">Any Condition</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                        Refund Method
                      </label>
                      <select
                        className={selectClass('refund_method')}
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as any)}
                        onFocus={() => setFocusedField('refund_method')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isProcessing}
                      >
                        <option value="original">Original Payment</option>
                        <option value="store_credit">Store Credit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                        Restocking Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className={inputClass('return_days')}
                        value={restockingFee}
                        onChange={(e) => setRestockingFee(parseInt(e.target.value) || 0)}
                        onFocus={() => setFocusedField('return_days')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                        Return Policy Notes
                      </label>
                      <textarea
                        placeholder="Additional return policy details..."
                        className={`${inputClass('return_days')} min-h-[60px] resize-y`}
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        onFocus={() => setFocusedField('return_days')}
                        onBlur={() => setFocusedField(null)}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Origin - Only for physical/mixed stores */}
                {(type === 'physical' || type === 'mixed') && (
                  <div>
                    <h3 className="text-sm font-semibold text-warmGray-700 mb-3">Shipping Origin</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="KE"
                          className={inputClass('shipping_country')}
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value)}
                          onFocus={() => setFocusedField('shipping_country')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                          State <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nairobi"
                          className={inputClass('shipping_state')}
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          onFocus={() => setFocusedField('shipping_state')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                          City <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nairobi"
                          className={inputClass('shipping_city')}
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          onFocus={() => setFocusedField('shipping_city')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                          Zip Code <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="00100"
                          className={inputClass('shipping_zip')}
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          onFocus={() => setFocusedField('shipping_zip')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {type === 'digital' && (
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                    💡 Shipping origin is not required for digital stores.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-warmGray-100">
            <h2 className="text-lg font-serif text-warmGray-900 mb-4">
              Social Links <span className="text-sm font-normal text-warmGray-400">(optional)</span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(socialLinks).map(([platform]) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-2 bg-warmGray-100 rounded-full px-3 py-1.5 text-sm text-warmGray-700"
                >
                  <Link2 size={14} />
                  {platform}
                  <button
                    type="button"
                    onClick={() => removeSocialLink(platform)}
                    className="text-warmGray-400 hover:text-red-500 transition-colors"
                    disabled={isProcessing}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Platform (e.g. facebook)"
                className="flex-1 bg-warmGray-50/50 border border-warmGray-200 rounded-2xl px-4 py-2.5 text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-accent-700 focus:ring-2 focus:ring-accent-700/20 transition-all"
                value={socialInput.platform}
                onChange={(e) =>
                  setSocialInput((prev) => ({ ...prev, platform: e.target.value }))
                }
                disabled={isProcessing}
              />
              <input
                type="url"
                placeholder="URL"
                className="flex-1 bg-warmGray-50/50 border border-warmGray-200 rounded-2xl px-4 py-2.5 text-warmGray-900 placeholder:text-warmGray-400 outline-none focus:border-accent-700 focus:ring-2 focus:ring-accent-700/20 transition-all"
                value={socialInput.url}
                onChange={(e) =>
                  setSocialInput((prev) => ({ ...prev, url: e.target.value }))
                }
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={addSocialLink}
                disabled={!socialInput.platform || !socialInput.url || isProcessing}
                className="px-6 bg-accent-700 disabled:opacity-40 text-white rounded-2xl font-medium hover:bg-accent-600 transition-colors disabled:hover:bg-accent-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="pt-4 border-t border-warmGray-100">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 w-5 h-5 rounded border-warmGray-300 text-accent-700 focus:ring-accent-700 focus:ring-2"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={isProcessing}
                required
              />
              <label htmlFor="terms" className="text-sm text-warmGray-600">
                I confirm that all information provided is accurate and I agree to the{' '}
                <a href="/terms" className="text-accent-700 hover:underline" target="_blank">
                  Store Terms
                </a>
                . <span className="text-red-500">*</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-warmGray-100">
            <button
              type="submit"
              disabled={isProcessing || !isValid}
              className="w-full bg-accent-800 disabled:opacity-40 rounded-2xl py-3.5 text-white font-medium text-base transition-all duration-200 hover:bg-accent-700 active:scale-[0.99] disabled:hover:bg-accent-800 disabled:active:scale-100 shadow-sm"
            >
              {isProcessing
                ? isEditing
                  ? 'Updating store…'
                  : 'Creating store…'
                : isEditing
                ? 'Update Store'
                : 'Create Store'}
            </button>

            {/* ✅ New: Instant activation messaging */}
            <p className="text-center text-xs text-warmGray-400 mt-4">
              {isEditing
                ? 'Your changes will be saved immediately.'
                : 'Your store will be live immediately — no approval needed.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreSetup;