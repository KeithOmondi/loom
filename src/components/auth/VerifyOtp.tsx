// src/components/pages/auth/VerifyOtp.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearAuthError, resendOTPThunk, verifyOTPThunk } from '../../store/slices/authSlice';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const VerifyOtp = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const pendingVerificationEmail = useAppSelector((state) => state.auth.pendingVerificationEmail);
  const isSubmitting = useAppSelector((state) => state.auth.isMutating);

  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // No pending email means this page was reached directly (e.g. a
  // refresh, or a stale bookmark) without completing registration — bounce back.
  useEffect(() => {
    if (!pendingVerificationEmail) {
      navigate('/register', { replace: true });
    }
  }, [pendingVerificationEmail, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVerificationEmail || otp.length !== OTP_LENGTH) return;

    dispatch(clearAuthError());

    try {
      await dispatch(verifyOTPThunk({ email: pendingVerificationEmail, otp })).unwrap();
      toast.success('Email verified. You can now log in.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'That code is incorrect or expired.');
    }
  };

  const onResend = async () => {
    if (!pendingVerificationEmail || cooldown > 0) return;

    dispatch(clearAuthError());
    setResending(true);

    try {
      await dispatch(resendOTPThunk({ email: pendingVerificationEmail })).unwrap();
      toast.success('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : "Couldn't resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmGray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl px-8 py-10 shadow-sm">
        <h1 className="text-2xl font-serif text-warmGray-900 text-center mb-2">
          Verify your email
        </h1>
        <p className="text-sm text-warmGray-500 text-center mb-8">
          Enter the {OTP_LENGTH}-digit code we sent to{' '}
          <span className="font-medium text-warmGray-800">{pendingVerificationEmail}</span>
        </p>

        <form onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
            className="w-full border border-warmGray-200 rounded-2xl px-4 py-3 mb-6 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent-700 transition-colors"
            autoFocus
          />

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== OTP_LENGTH}
            className="w-full bg-accent-800 disabled:opacity-40 rounded-full py-4 text-white font-semibold text-base transition-opacity hover:opacity-90 disabled:hover:opacity-40"
          >
            {isSubmitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div className="flex items-center justify-center mt-6 text-sm">
          <span className="text-warmGray-500">Didn't get a code?</span>{' '}
          <button
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            className={`ml-1 font-medium ${
              cooldown > 0 || resending ? 'text-warmGray-400' : 'text-accent-700'
            }`}
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <p className="text-center mt-4">
          <Link to="/register" className="text-warmGray-500 text-sm">
            Use a different email
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;