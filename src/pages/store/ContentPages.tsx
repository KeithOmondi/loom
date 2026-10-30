import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Markdown } from '../../lib/markdown';
import { Btn, Card, ErrorBox, Field, Spinner, fmtDate, inputCls } from '../../components/ui/kit';
import { request, useAction, useFetch } from '../../lib/http';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

/** Renders a CMS page by slug — from the route param (/pages/:slug) or the URL path (/about, /terms…). */
export const CmsPage = ({ slug: fixed }: { slug?: string }) => {
  const params = useParams();
  const slug = fixed ?? params.slug ?? '';
  const { data, loading, error, reload } = useFetch<{ data: { title: string; body: string; updated_at: string } }>(`/pages/${slug}`);
  useDocumentTitle(data?.data.title ?? '');
  if (loading) return <Spinner />;
  if (error || !data) return <div className="mx-auto max-w-2xl px-4 py-16"><ErrorBox message="We couldn't find that page." onRetry={reload} /></div>;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Markdown source={data.data.body} />
      <p className="mt-10 text-xs text-warm-gray-500">Last updated {fmtDate(data.data.updated_at)}</p>
      <p className="mt-2 text-sm"><Link to="/help" className="text-accent-700 hover:underline">Help Centre</Link> · <Link to="/contact" className="text-accent-700 hover:underline">Contact us</Link></p>
    </article>
  );
};

export const ForgotPasswordPage = () => {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, run } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('post', '/auth/forgot-password', { email: email.trim() }));
    if (!r.ok) return toast.error(r.error);
    setSent(true); // never reveal whether the address exists
  };
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Card className="w-full" title="Reset your password">
        {sent ? (
          <p className="text-sm text-warm-gray-700">If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password. It expires soon, so use it right away.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <Btn type="submit" busy={busy} className="w-full">Send reset link</Btn>
          </form>
        )}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-accent-700 hover:underline">Back to sign in</Link></p>
      </Card>
    </div>
  );
};

export const ResetPasswordPage = () => {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, run } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("Passwords don't match.");
    const r = await run(() => request('post', '/auth/reset-password', { token, newPassword: pw, confirmPassword: confirm }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Password updated. Please sign in.');
    navigate('/login', { replace: true });
  };
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Card className="w-full" title="Choose a new password">
        {!token ? <p className="text-sm text-red-700">This reset link is missing its token. Request a new link from the sign-in page.</p> : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="New password" hint="At least 8 characters, with letters and numbers"><input className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field label="Confirm password"><input className={inputCls} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
            <Btn type="submit" busy={busy} disabled={pw.length < 8} className="w-full">Update password</Btn>
          </form>
        )}
      </Card>
    </div>
  );
};

/** Used by the router to map friendly URLs (/about, /terms…) to CMS slugs. */
export const useCmsSlugFromPath = () => useLocation().pathname.replace(/^\//, '');
