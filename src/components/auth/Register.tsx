// src/components/pages/auth/Register.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAuthError, registerSellerThunk } from '../../store/slices/authSlice';

type Field = 'full_name' | 'email' | 'password' | 'phone';

const Register = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isLoading = useAppSelector((state) => state.auth.status === 'loading');
    const error = useAppSelector((state) => state.auth.error);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [focusedField, setFocusedField] = useState<Field | null>(null);

    // Show error from Redux
    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearAuthError());
        }
    }, [error, dispatch]);

    const fieldBorder = (field: Field) =>
        focusedField === field ? 'border-[#8c431d]' : 'border-[#b89f8c]';

    const isValid = fullName && email && password.length >= 8 && phone;

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(clearAuthError());

        try {
            await dispatch(
                registerSellerThunk({
                    email: email.trim(),
                    password,
                    full_name: fullName.trim(),
                    phone: phone.trim(),
                })
            ).unwrap();

            toast.success('Account created! Check your email for a verification code.');
            navigate('/verify-otp', {
                replace: true,
                state: { email: email.trim() }
            });
        } catch (err: any) {
            toast.error(typeof err === 'string' ? err : 'Registration failed. Please try again.');
        }
    };

    const inputClass = (field: Field) =>
        `w-full bg-white border-2 rounded-full px-5 py-2.5 text-gray-800 outline-none transition-all ${fieldBorder(
            field
        )}`;

    return (
        <div 
            className="h-screen w-screen overflow-hidden flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 relative"
            style={{ backgroundImage: `url('https://images.pexels.com/photos/27323161/pexels-photo-27323161.jpeg')` }}
        >
            {/* Soft background overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>

            <div className="relative z-10 w-full max-w-[380px] bg-white rounded-[32px] p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-y-auto">
                
                {/* Header Logo Container */}
                <div className="w-full bg-[#f8f4eb] rounded-[24px] p-4 mb-4 flex items-center justify-center h-[120px] shrink-0 overflow-hidden">
                    <img 
                        src="/loom_logo.png" 
                        alt="Loom Logo" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                </div>

                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-[#2d2118] mb-1 ml-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Jane Doe"
                            className={inputClass('full_name')}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            onFocus={() => setFocusedField('full_name')}
                            onBlur={() => setFocusedField(null)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#2d2118] mb-1 ml-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            placeholder="jane@example.com"
                            className={inputClass('email')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#2d2118] mb-1 ml-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className={`${inputClass('password')} pr-16`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c431d] hover:text-[#6a3215] text-xs font-semibold"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#2d2118] mb-1 ml-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            className={inputClass('phone')}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onFocus={() => setFocusedField('phone')}
                            onBlur={() => setFocusedField(null)}
                            autoComplete="tel"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !isValid}
                        className="w-full bg-[#8c431d] hover:bg-[#733515] active:scale-[0.99] disabled:opacity-50 rounded-full py-3 text-white font-semibold text-base transition-all shadow-md disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? 'Creating account…' : 'Sign up'}
                    </button>
                </form>

                <p className="text-center text-gray-700 text-xs mt-4 font-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#8c431d] hover:underline font-bold ml-1">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;