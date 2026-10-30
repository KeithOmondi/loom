// src/components/pages/auth/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAuthError, loginThunk } from '../../store/slices/authSlice';
import { getRoleRedirectPath } from '../../utils/roleRedirect';

const Login = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isLoading = useAppSelector((state) => state.auth.status === 'loading');
    const user = useAppSelector((state) => state.auth.user);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

    // ✅ Redirect user based on role after login
    useEffect(() => {
        if (user) {
            const path = getRoleRedirectPath(user);
            navigate(path, { replace: true });
        }
    }, [user, navigate]);

    const fieldBorder = (field: 'email' | 'password') =>
        focusedField === field ? 'border-[#8c431d]' : 'border-[#b89f8c]';

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(clearAuthError());

        try {

            await dispatch(loginThunk({ email: email.trim(), password })).unwrap();

            toast.success('Welcome back! You are now logged in.');
        } catch (err: any) {
            toast.error(
                typeof err === 'string' ? err : 'Check your email and password and try again.'
            );
        }
    };

return (
    <div 
        className="h-screen w-screen overflow-hidden flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 relative"
        style={{ backgroundImage: `url('https://images.pexels.com/photos/27323161/pexels-photo-27323161.jpeg')` }}
    >
        {/* Soft background overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>

        <div className="relative z-10 w-full max-w-[360px] bg-white rounded-[32px] p-6 shadow-2xl">
            
            {/* Header Logo Container */}
            <div className="w-full bg-[#f8f4eb] rounded-[24px] p-6 mb-5 flex items-center justify-center h-[180px] overflow-hidden">
                <img 
                    src="/loom_logo.png" 
                    alt="Loom Logo" 
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
            </div>

            <form onSubmit={onSubmit}>
                <div className="mb-3.5">
                    <label className="block text-sm font-semibold text-[#2d2118] mb-1 ml-1">
                        Email
                    </label>
                    <input
                        type="email"
                        className={`w-full bg-white border-2 rounded-full px-5 py-3 text-gray-800 outline-none transition-all ${fieldBorder('email')}`}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                    />
                </div>

                <div className="mb-5">
                    <label className="block text-sm font-semibold text-[#2d2118] mb-1 ml-1">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className={`w-full bg-white border-2 rounded-full px-5 py-3 pr-20 text-gray-800 outline-none transition-all ${fieldBorder('password')}`}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8c431d] hover:text-[#6a3215] text-sm font-semibold"
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full bg-[#8c431d] hover:bg-[#733515] active:scale-[0.99] disabled:opacity-50 rounded-full py-3.5 text-white font-semibold text-base transition-all shadow-md disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Logging in…' : 'Log in'}
                </button>
            </form>

            <p className="text-center text-xs sm:text-sm mt-4">
                <Link to="/forgot-password" className="text-[#8c431d] hover:underline font-semibold">
                    Forgot your password?
                </Link>
            </p>

            <p className="text-center text-gray-700 text-xs sm:text-sm mt-5 font-medium">
                New here?{' '}
                <Link to="/signup" className="text-[#8c431d] hover:underline font-bold ml-1">
                    Create a shopper account
                </Link>
                <br />
                Selling on Loom?{' '}
                <Link to="/register" className="text-[#8c431d] hover:underline font-bold ml-1">
                    Open a seller account
                </Link>
            </p>
        </div>
    </div>
);
};

export default Login;