import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAuthError, registerThunk } from '../../store/slices/authSlice';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const input =
  'w-full rounded-lg border border-warm-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent-700';

/** Customer account sign-up (sellers use /register). Continues to the shared OTP verification page. */
const SignupPage = () => {
  useDocumentTitle('Create account');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const submitting = useAppSelector((s) => s.auth.isMutating);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const valid = fullName.trim().length > 1 && email.includes('@') && password.length >= 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    dispatch(clearAuthError());
    try {
      await dispatch(
        registerThunk({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          ...(phone.trim() && { phone: phone.trim() }),
        }),
      ).unwrap();
      toast.success('Account created! Check your email for a verification code.');
      navigate('/verify-otp', { replace: true, state: { email: email.trim() } });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-warm-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-warm-gray-600">Save your cart, check out faster and track your orders.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input className={input} placeholder="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} type="tel" placeholder="Phone (optional) e.g. 254712345678" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={input} type="password" placeholder="Password (min. 8 characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            type="submit"
            disabled={!valid || submitting}
            className="w-full rounded-lg bg-accent-700 py-3 text-sm font-semibold text-white hover:bg-accent-800 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-warm-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-700 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-warm-gray-500">
          Want to sell?{' '}
          <Link to="/register" className="text-accent-700 hover:underline">
            Open a seller account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
