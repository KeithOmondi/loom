import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, Trash2 } from 'lucide-react';
import { AddressForm, type AddressValues } from '../../components/store/AddressForm';
import { Badge, Btn, Card, Empty, ErrorBox, Field, Money, PageHeader, Spinner, Table, fmtDate, inputCls } from '../../components/ui/kit';
import { NO_IMAGE, formatKES, imageAt } from '../../lib/format';
import { request, useAction, useFetch } from '../../lib/http';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { checkAuthStatusThunk } from '../../store/slices/authSlice';

// ----------------------------- Wallet -----------------------------
export const WalletPage = () => {
  useDocumentTitle('Wallet');
  const { data, loading, error, reload } = useFetch<{ data: { balance: number; history: { created_at: string; direction: string; amount: number; type: string; description: string }[] } }>('/wallet');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load wallet'} onRetry={reload} />;
  const w = data.data;
  return (
    <div className="space-y-5">
      <PageHeader title="Wallet" subtitle="Refunds you choose to keep as store credit appear here." />
      <Card><p className="text-sm text-warm-gray-500">Available balance</p><p className="text-3xl font-bold text-accent-800">{formatKES(w.balance)}</p><p className="mt-1 text-xs text-warm-gray-500">Use it at checkout on your next order.</p></Card>
      <Card title="History">
        {w.history.length === 0 ? <p className="text-sm text-warm-gray-500">No wallet activity yet.</p> : (
          <ul className="divide-y divide-warm-gray-100 text-sm">
            {w.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-3 py-2.5">
                <div><p className="capitalize">{h.type.replace(/_/g, ' ')}</p><p className="text-xs text-warm-gray-500">{h.description} · {fmtDate(h.created_at, true)}</p></div>
                <span className={h.direction === 'credit' ? 'font-medium text-green-700' : 'font-medium text-warm-gray-800'}>{h.direction === 'credit' ? '+' : '−'}{formatKES(Number(h.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

// ----------------------------- Addresses -----------------------------
interface Addr extends AddressValues { id: string; is_default?: boolean }
export const AddressesPage = () => {
  useDocumentTitle('Addresses');
  const { data, loading, error, reload } = useFetch<{ data: Addr[] }>('/addresses');
  const [editing, setEditing] = useState<Addr | 'new' | null>(null);
  const { busy, run } = useAction();

  const save = async (v: AddressValues) => {
    const r = await run(() => (editing && editing !== 'new' ? request('patch', `/addresses/${editing.id}`, v) : request('post', '/addresses', v)));
    if (!r.ok) return toast.error(r.error);
    toast.success('Address saved');
    setEditing(null);
    await reload();
  };

  return (
    <div>
      <PageHeader title="Addresses" actions={!editing && <Btn onClick={() => setEditing('new')}>Add address</Btn>} />
      {editing ? (
        <Card title={editing === 'new' ? 'New address' : 'Edit address'}><AddressForm initial={editing === 'new' ? undefined : editing} busy={busy} onSubmit={save} onCancel={() => setEditing(null)} /></Card>
      ) : loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.data.length ? <Empty title="No saved addresses" hint="Add one to check out faster." /> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.data.map((a) => (
            <li key={a.id} className="rounded-xl border border-warm-gray-200 bg-white p-4 text-sm">
              <p className="font-medium">{a.first_name} {a.last_name} {a.is_default && <Badge tone="green">Default</Badge>}</p>
              <p className="mt-1 text-warm-gray-600">{a.address_line1}<br />{a.city}, {a.state}<br />{a.phone}</p>
              <div className="mt-3 flex gap-3 text-xs">
                <button className="text-accent-700 hover:underline" onClick={() => setEditing(a)}>Edit</button>
                {!a.is_default && <button className="text-accent-700 hover:underline" onClick={async () => { await run(() => request('patch', `/addresses/${a.id}/default`, {})); await reload(); }}>Make default</button>}
                <button className="text-red-600 hover:underline" onClick={async () => { if (!confirm('Delete this address?')) return; const r = await run(() => request('delete', `/addresses/${a.id}`)); if (!r.ok) toast.error(r.error); await reload(); }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ----------------------------- Wishlist -----------------------------
interface WishRow { id: string; product: { id: string; name: string; slug: string; price: number; compare_at_price: number | null; stock_quantity: number; image: { url: string } | null } }
export const WishlistPage = () => {
  useDocumentTitle('Wishlist');
  const { data, loading, error, reload } = useFetch<{ data: { wishlist: { items: WishRow[] } } }>('/wishlist');
  const rows = data?.data?.wishlist?.items ?? [];
  const remove = async (productId: string) => { await request('delete', `/wishlist/${productId}`); await reload(); };
  return (
    <div>
      <PageHeader title="Wishlist" />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty title="Your wishlist is empty" hint="Tap the heart on a product to save it for later." action={<Link to="/shop" className="rounded-lg bg-accent-700 px-4 py-2 text-sm text-white">Browse products</Link>} /> : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-xl border border-warm-gray-200 bg-white">
              <Link to={`/product/${r.product.slug}`}><img src={imageAt(r.product.image?.url, 400) || NO_IMAGE} alt="" className="aspect-square w-full object-cover" /></Link>
              <div className="p-3 text-sm"><Link to={`/product/${r.product.slug}`} className="line-clamp-2 hover:text-accent-700">{r.product.name}</Link><p className="mt-1 font-semibold"><Money value={r.product.price} /></p>
                <button onClick={() => remove(r.product.id)} className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 size={12} /> Remove</button></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Heart toggle used on product pages. */
export const WishlistHeart = ({ productId }: { productId: string }) => {
  const isAuthed = useAppSelector((s) => s.auth.isAuthenticated);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!isAuthed) return;
    request<{ data: { wishlisted: boolean } }>('get', `/wishlist/check/${productId}`).then((r) => setOn(r.data.wishlisted)).catch(() => {});
  }, [productId, isAuthed]);
  const toggle = async () => {
    if (!isAuthed) return toast('Sign in to save items to your wishlist');
    try {
      if (on) await request('delete', `/wishlist/${productId}`); else await request('post', '/wishlist', { product_id: productId });
      setOn(!on);
    } catch { toast.error('Could not update wishlist'); }
  };
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'} className="rounded-full border border-warm-gray-300 p-2.5 hover:bg-warm-gray-50">
      <Heart size={18} className={on ? 'fill-red-500 text-red-500' : 'text-warm-gray-600'} />
    </button>
  );
};

// ----------------------------- Notifications (all roles) -----------------------------
interface Notif { id: string; title: string; body: string | null; data: { link?: string }; read_at: string | null; created_at: string }
export const NotificationsPage = () => {
  useDocumentTitle('Notifications');
  const { data, loading, error, reload } = useFetch<{ data: Notif[]; unread: number }>('/notifications');
  const markAll = async () => { await request('post', '/notifications/read', {}); await reload(); };
  return (
    <div>
      <PageHeader title="Notifications" actions={!!data?.unread && <Btn variant="secondary" onClick={markAll}>Mark all as read</Btn>} />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.data.length ? <Empty title="You're all caught up" /> : (
        <ul className="space-y-2">
          {data.data.map((n) => {
            const inner = (<><div className="flex items-start justify-between gap-3"><p className={`text-sm ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</p><span className="shrink-0 text-xs text-warm-gray-500">{fmtDate(n.created_at, true)}</span></div>{n.body && <p className="mt-1 whitespace-pre-line text-sm text-warm-gray-600">{n.body}</p>}</>);
            const cls = `block rounded-xl border bg-white p-4 ${n.read_at ? 'border-warm-gray-200' : 'border-accent-300 bg-accent-50/40'}`;
            return <li key={n.id}>{n.data?.link ? <Link to={n.data.link} onClick={() => request('post', '/notifications/read', { ids: [n.id] })} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>
      )}
    </div>
  );
};

// ----------------------------- Profile -----------------------------
export const ProfilePage = () => {
  useDocumentTitle('Profile');
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [name, setName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const { busy, run } = useAction();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('patch', '/users/me', { full_name: name, ...(phone ? { phone } : {}) }));
    if (!r.ok) return toast.error(r.error);
    toast.success('Profile updated');
    await dispatch(checkAuthStatusThunk());
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => request('patch', '/users/me/password', pw));
    if (!r.ok) return toast.error(r.error);
    toast.success('Password changed');
    setPw({ current_password: '', new_password: '', confirm_password: '' });
  };

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Profile" />
      <Card title="Your details">
        <form onSubmit={saveProfile} className="space-y-3">
          <Field label="Full name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input className={inputCls} value={user?.email ?? ''} disabled /></Field>
          <Field label="Phone"><input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" /></Field>
          <Btn type="submit" busy={busy}>Save changes</Btn>
        </form>
      </Card>
      <Card title="Change password">
        <form onSubmit={changePw} className="space-y-3">
          <Field label="Current password"><input className={inputCls} type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters"><input className={inputCls} type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
          <Field label="Confirm new password"><input className={inputCls} type="password" autoComplete="new-password" value={pw.confirm_password} onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} /></Field>
          <Btn type="submit" busy={busy} disabled={!pw.current_password || pw.new_password.length < 8}>Change password</Btn>
        </form>
      </Card>
    </div>
  );
};

export { Table };
