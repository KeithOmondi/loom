// src/components/pages/seller/CompleteSellerProfile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    getSellerProfileThunk,
    updateSellerProfileThunk,
    clearSellerError,
    clearSellerMessage,
    type BusinessType,
    type PayoutMethod,
} from '../../store/slices/sellerSlice';
import { AlertCircle, ArrowLeft } from 'lucide-react';

type Field =
    | 'legal_business_name'
    | 'trading_name'
    | 'business_type'
    | 'tax_id'
    | 'registration_number'
    | 'country'
    | 'state'
    | 'city'
    | 'business_address'
    | 'payout_method'
    | 'bank_account_name'
    | 'bank_account_number'
    | 'bank_routing_number'
    | 'bank_name'
    | 'paypal_email'
    | 'mpesa_phone';

// Fields to exclude from completion calculation
const EXCLUDED_FIELDS = [
    'id',
    'user_id',
    'created_at',
    'updated_at',
    'suspended_at',
    'suspended_reason',
    'verified_at',
    'rejected_reason',
    'rating',
    'total_reviews',
    'total_orders',
    'total_products',
    'fulfillment_rate',
    'response_rate',
    'response_time_hours',
    'commission_rate',
    'payout_schedule',
    'minimum_payout',
    'auto_approve_products',
    'enable_negotiation',
    'stripe_connect_id',
    'verification_documents',
];

const CompleteSellerProfile = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { profile, isLoading, isMutating, error, message } = useAppSelector((state) => state.seller);
    const user = useAppSelector((state) => state.auth.user);

    // Form state
    const [legalBusinessName, setLegalBusinessName] = useState('');
    const [tradingName, setTradingName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType | ''>('');
    const [taxId, setTaxId] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('bank');
    const [bankAccountName, setBankAccountName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankRoutingNumber, setBankRoutingNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paypalEmail, setPaypalEmail] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');

    const [focusedField, setFocusedField] = useState<Field | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

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

        // Fetch seller profile
        dispatch(getSellerProfileThunk());
    }, [user, navigate, dispatch]);

    // Populate form with existing data
    useEffect(() => {
        if (profile) {
            setLegalBusinessName(profile.legal_business_name || '');
            setTradingName(profile.trading_name || '');
            setBusinessType(profile.business_type || '');
            setTaxId(profile.tax_id || '');
            setRegistrationNumber(profile.registration_number || '');
            setCountry(profile.country || '');
            setState(profile.state || '');
            setCity(profile.city || '');
            setBusinessAddress(profile.business_address || '');
            setPayoutMethod(profile.payout_method || 'bank');
            setBankAccountName(profile.bank_account_name || '');
            setBankAccountNumber(profile.bank_account_number || '');
            setBankRoutingNumber(profile.bank_routing_number || '');
            setBankName(profile.bank_name || '');
            setPaypalEmail(profile.paypal_email || '');
            setMpesaPhone(profile.mpesa_phone || '');
        }
    }, [profile]);

    // Show success/error messages
    useEffect(() => {
        if (message) {
            toast.success(message);
            dispatch(clearSellerMessage());
            // Redirect to store setup after successful update
            navigate('/store-setup', { replace: true });
        }
        if (error) {
            toast.error(error);
            dispatch(clearSellerError());
        }
    }, [message, error, dispatch, navigate]);

    // Calculate profile completion percentage
    const getCompletionPercentage = (): number => {
        if (!profile) return 0;

        const fields = Object.keys(profile);
        const totalFields = fields.filter((field) => !EXCLUDED_FIELDS.includes(field)).length;

        const filledFields = fields.filter((field) => {
            if (EXCLUDED_FIELDS.includes(field)) return false;
            const value = profile[field as keyof typeof profile];
            return value !== null && value !== undefined && value !== '';
        }).length;

        return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    };

    const fieldBorder = (field: Field) => {
        const isMissing = missingFields.includes(field);
        const isFocused = focusedField === field;
        if (isMissing) return 'border-red-300 ring-2 ring-red-200/50';
        if (isFocused) return 'border-accent-700 ring-2 ring-accent-700/20';
        return 'border-warmGray-200';
    };

    const inputClass = (field: Field) =>
        `w-full bg-warmGray-50/50 border rounded-2xl px-4 py-3 text-warmGray-900 placeholder:text-warmGray-400 outline-none transition-all duration-200 ${fieldBorder(
            field
        )}`;

    // Check if all required fields are filled
    const isValid =
        legalBusinessName &&
        businessType &&
        country &&
        (payoutMethod === 'bank'
            ? bankAccountName && bankAccountNumber && bankRoutingNumber && bankName
            : payoutMethod === 'mpesa'
            ? mpesaPhone
            : payoutMethod === 'paypal'
            ? paypalEmail
            : true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const missing: string[] = [];
        if (!legalBusinessName) missing.push('legal_business_name');
        if (!businessType) missing.push('business_type');
        if (!country) missing.push('country');

        if (payoutMethod === 'bank') {
            if (!bankAccountName) missing.push('bank_account_name');
            if (!bankAccountNumber) missing.push('bank_account_number');
            if (!bankRoutingNumber) missing.push('bank_routing_number');
            if (!bankName) missing.push('bank_name');
        } else if (payoutMethod === 'mpesa' && !mpesaPhone) {
            missing.push('mpesa_phone');
        } else if (payoutMethod === 'paypal' && !paypalEmail) {
            missing.push('paypal_email');
        }

        if (missing.length > 0) {
            setMissingFields(missing);
            toast.error('Please fill in all required fields.');
            // Scroll to first missing field
            const firstMissing = document.querySelector(`[data-field="${missing[0]}"]`);
            if (firstMissing) {
                firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        try {
            await dispatch(
                updateSellerProfileThunk({
                    legal_business_name: legalBusinessName.trim(),
                    trading_name: tradingName.trim() || undefined,
                    business_type: businessType as BusinessType,
                    tax_id: taxId.trim() || undefined,
                    registration_number: registrationNumber.trim() || undefined,
                    country: country.trim(),
                    state: state.trim() || undefined,
                    city: city.trim() || undefined,
                    business_address: businessAddress.trim() || undefined,
                    payout_method: payoutMethod,
                    bank_account_name: bankAccountName.trim() || undefined,
                    bank_account_number: bankAccountNumber.trim() || undefined,
                    bank_routing_number: bankRoutingNumber.trim() || undefined,
                    bank_name: bankName.trim() || undefined,
                    paypal_email: paypalEmail.trim() || undefined,
                    mpesa_phone: mpesaPhone.trim() || undefined,
                })
            ).unwrap();
        } catch (err) {
            // Error is handled in the slice
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-warmGray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
                    <p className="mt-4 text-warmGray-600">Loading your profile...</p>
                </div>
            </div>
        );
    }

    // If profile is complete, redirect
    if (profile && !missingFields.length && !isLoading) {
        // Check if all required fields are present
        const hasAllRequired =
            profile.legal_business_name &&
            profile.business_type &&
            profile.country &&
            (profile.payout_method === 'bank'
                ? profile.bank_account_name && profile.bank_account_number &&
                  profile.bank_routing_number && profile.bank_name
                : profile.payout_method === 'mpesa'
                ? profile.mpesa_phone
                : profile.payout_method === 'paypal'
                ? profile.paypal_email
                : true);

        if (hasAllRequired) {
            navigate('/store-setup', { replace: true });
            return null;
        }
    }

    const completionPercentage = getCompletionPercentage();

    return (
        <div className="min-h-screen bg-warmGray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-warmGray-500 hover:text-warmGray-700 transition-colors mb-4"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} className="text-yellow-600" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif text-warmGray-900">
                            Complete Your Profile
                        </h1>
                        <p className="text-warmGray-500 mt-2 text-sm">
                            Please provide the missing information to complete your seller profile.
                        </p>
                        {missingFields.length > 0 && (
                            <div className="mt-4 inline-block bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">
                                <span className="font-medium">Missing required fields:</span>{' '}
                                {missingFields.map((field) => field.replace(/_/g, ' ')).join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-warmGray-100 p-6 md:p-8 space-y-6">
                    {/* Business Information */}
                    <div>
                        <h2 className="text-lg font-serif text-warmGray-900 mb-4 flex items-center gap-2">
                            Business Information
                            <span className="text-xs text-red-500 font-normal">* required</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Legal Business Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Enterprises Ltd"
                                    className={inputClass('legal_business_name')}
                                    data-field="legal_business_name"
                                    value={legalBusinessName}
                                    onChange={(e) => {
                                        setLegalBusinessName(e.target.value);
                                        setMissingFields((prev) =>
                                            prev.filter((f) => f !== 'legal_business_name')
                                        );
                                    }}
                                    onFocus={() => setFocusedField('legal_business_name')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Trading Name <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Store"
                                    className={inputClass('trading_name')}
                                    data-field="trading_name"
                                    value={tradingName}
                                    onChange={(e) => setTradingName(e.target.value)}
                                    onFocus={() => setFocusedField('trading_name')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Business Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full bg-warmGray-50/50 border border-warmGray-200 rounded-2xl px-4 py-3 text-warmGray-900 outline-none transition-all duration-200 focus:border-accent-700 focus:ring-2 focus:ring-accent-700/20"
                                    data-field="business_type"
                                    value={businessType}
                                    onChange={(e) => {
                                        setBusinessType(e.target.value as BusinessType | '');
                                        setMissingFields((prev) =>
                                            prev.filter((f) => f !== 'business_type')
                                        );
                                    }}
                                    onFocus={() => setFocusedField('business_type')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                >
                                    <option value="">Select type</option>
                                    <option value="sole_proprietorship">Sole Proprietorship</option>
                                    <option value="llc">LLC</option>
                                    <option value="corporation">Corporation</option>
                                    <option value="partnership">Partnership</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Tax ID <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="XX-XXXXXXX"
                                    className={inputClass('tax_id')}
                                    data-field="tax_id"
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    onFocus={() => setFocusedField('tax_id')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Registration Number <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="REG-123456"
                                    className={inputClass('registration_number')}
                                    data-field="registration_number"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    onFocus={() => setFocusedField('registration_number')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Country <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. United States"
                                    className={inputClass('country')}
                                    data-field="country"
                                    value={country}
                                    onChange={(e) => {
                                        setCountry(e.target.value);
                                        setMissingFields((prev) =>
                                            prev.filter((f) => f !== 'country')
                                        );
                                    }}
                                    onFocus={() => setFocusedField('country')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    State <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. California"
                                    className={inputClass('state')}
                                    data-field="state"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    onFocus={() => setFocusedField('state')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    City <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Los Angeles"
                                    className={inputClass('city')}
                                    data-field="city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    onFocus={() => setFocusedField('city')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Business Address <span className="text-warmGray-400 font-normal lowercase">(optional)</span>
                                </label>
                                <textarea
                                    placeholder="123 Main St, Suite 100"
                                    className={`${inputClass('business_address')} min-h-[80px] resize-y`}
                                    data-field="business_address"
                                    value={businessAddress}
                                    onChange={(e) => setBusinessAddress(e.target.value)}
                                    onFocus={() => setFocusedField('business_address')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payout Information */}
                    <div className="pt-4 border-t border-warmGray-100">
                        <h2 className="text-lg font-serif text-warmGray-900 mb-4 flex items-center gap-2">
                            Payout Information
                            <span className="text-xs text-red-500 font-normal">* required</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                    Payout Method <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full bg-warmGray-50/50 border border-warmGray-200 rounded-2xl px-4 py-3 text-warmGray-900 outline-none transition-all duration-200 focus:border-accent-700 focus:ring-2 focus:ring-accent-700/20"
                                    data-field="payout_method"
                                    value={payoutMethod}
                                    onChange={(e) => {
                                        setPayoutMethod(e.target.value as PayoutMethod);
                                        setMissingFields((prev) =>
                                            prev.filter(
                                                (f) =>
                                                    f !== 'bank_account_name' &&
                                                    f !== 'bank_account_number' &&
                                                    f !== 'bank_routing_number' &&
                                                    f !== 'bank_name' &&
                                                    f !== 'mpesa_phone' &&
                                                    f !== 'paypal_email'
                                            )
                                        );
                                    }}
                                    onFocus={() => setFocusedField('payout_method')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                >
                                    <option value="bank">Bank Transfer</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="paypal">PayPal</option>
                                </select>
                            </div>

                            {payoutMethod === 'bank' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                            Bank Account Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Acme Enterprises Ltd"
                                            className={inputClass('bank_account_name')}
                                            data-field="bank_account_name"
                                            value={bankAccountName}
                                            onChange={(e) => {
                                                setBankAccountName(e.target.value);
                                                setMissingFields((prev) =>
                                                    prev.filter((f) => f !== 'bank_account_name')
                                                );
                                            }}
                                            onFocus={() => setFocusedField('bank_account_name')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                            Bank Account Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1234567890"
                                            className={inputClass('bank_account_number')}
                                            data-field="bank_account_number"
                                            value={bankAccountNumber}
                                            onChange={(e) => {
                                                setBankAccountNumber(e.target.value);
                                                setMissingFields((prev) =>
                                                    prev.filter((f) => f !== 'bank_account_number')
                                                );
                                            }}
                                            onFocus={() => setFocusedField('bank_account_number')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                            Routing Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 987654321"
                                            className={inputClass('bank_routing_number')}
                                            data-field="bank_routing_number"
                                            value={bankRoutingNumber}
                                            onChange={(e) => {
                                                setBankRoutingNumber(e.target.value);
                                                setMissingFields((prev) =>
                                                    prev.filter((f) => f !== 'bank_routing_number')
                                                );
                                            }}
                                            onFocus={() => setFocusedField('bank_routing_number')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                            Bank Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Chase Bank"
                                            className={inputClass('bank_name')}
                                            data-field="bank_name"
                                            value={bankName}
                                            onChange={(e) => {
                                                setBankName(e.target.value);
                                                setMissingFields((prev) =>
                                                    prev.filter((f) => f !== 'bank_name')
                                                );
                                            }}
                                            onFocus={() => setFocusedField('bank_name')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {payoutMethod === 'mpesa' && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                        M-Pesa Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+254 712 345 678"
                                        className={inputClass('mpesa_phone')}
                                        data-field="mpesa_phone"
                                        value={mpesaPhone}
                                        onChange={(e) => {
                                            setMpesaPhone(e.target.value);
                                            setMissingFields((prev) =>
                                                prev.filter((f) => f !== 'mpesa_phone')
                                            );
                                        }}
                                        onFocus={() => setFocusedField('mpesa_phone')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                    />
                                </div>
                            )}

                            {payoutMethod === 'paypal' && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-warmGray-700 mb-1.5 ml-1">
                                        PayPal Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="paypal@example.com"
                                        className={inputClass('paypal_email')}
                                        data-field="paypal_email"
                                        value={paypalEmail}
                                        onChange={(e) => {
                                            setPaypalEmail(e.target.value);
                                            setMissingFields((prev) =>
                                                prev.filter((f) => f !== 'paypal_email')
                                            );
                                        }}
                                        onFocus={() => setFocusedField('paypal_email')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="pt-4 border-t border-warmGray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-warmGray-600">Profile completion</span>
                            <span className="text-sm font-medium text-warmGray-900">
                                {completionPercentage}%
                            </span>
                        </div>
                        <div className="w-full bg-warmGray-100 rounded-full h-2">
                            <div
                                className="bg-accent-700 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 border-t border-warmGray-100">
                        <button
                            type="submit"
                            disabled={isMutating || !isValid}
                            className="w-full bg-accent-800 disabled:opacity-40 rounded-2xl py-3.5 text-white font-medium text-base transition-all duration-200 hover:bg-accent-700 active:scale-[0.99] disabled:hover:bg-accent-800 disabled:active:scale-100 shadow-sm"
                        >
                            {isMutating ? 'Saving…' : 'Complete Profile'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/store-setup', { replace: true })}
                            className="w-full mt-3 border border-warmGray-200 rounded-2xl py-3 text-warmGray-600 font-medium hover:bg-warmGray-50 transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompleteSellerProfile;