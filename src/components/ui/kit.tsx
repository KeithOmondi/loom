// Small shared UI kit so the account, seller and admin screens look and behave consistently.
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { formatKES } from '../../lib/format';

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-warm-gray-500" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-warm-gray-300 border-t-accent-700" />
    {label}
  </div>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-3 rounded-lg bg-red-700 px-4 py-1.5 text-white">
        Try again
      </button>
    )}
  </div>
);

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-warm-gray-300 bg-white p-10 text-center">
    <p className="font-medium text-warm-gray-800">{title}</p>
    {hint && <p className="mt-1 text-sm text-warm-gray-500">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Card = ({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) => (
  <section className={`rounded-xl border border-warm-gray-200 bg-white ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between border-b border-warm-gray-100 px-5 py-3">
        <h2 className="font-semibold text-warm-gray-900">{title}</h2>
        {actions}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-warm-gray-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-warm-gray-500">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-700 text-white hover:bg-accent-800',
  secondary: 'border border-warm-gray-300 bg-white text-warm-gray-800 hover:bg-warm-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-accent-700 hover:bg-accent-50',
};

export const Btn = ({
  variant = 'primary', busy, className = '', children, ...rest
}: { variant?: Variant; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...rest}
    disabled={rest.disabled || busy}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
  >
    {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    {children}
  </button>
);

const TONES: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-warm-gray-100 text-warm-gray-700',
  purple: 'bg-purple-100 text-purple-800',
};

export const Badge = ({ tone = 'gray', children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONES[tone]}`}>{children}</span>
);

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  pending: 'amber', payment_pending: 'amber', requested: 'amber', awaiting_vendor: 'amber', awaiting_customer: 'amber', processing: 'blue', approved: 'blue',
  paid: 'blue', shipped: 'purple', delivered: 'green', completed: 'green', processed: 'green', resolved: 'green', released: 'green', refunded: 'gray',
  cancelled: 'red', failed: 'red', rejected: 'red', under_review: 'purple', held: 'amber', escalated: 'purple', received: 'blue', draft: 'gray', active: 'green',
  closed: 'gray', partially_refunded: 'gray',
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? 'gray'}>{status.replace(/_/g, ' ')}</Badge>;

export const Money = ({ value, className = '' }: { value: number | string; className?: string }) => (
  <span className={`tabular-nums ${className}`}>{formatKES(Number(value))}</span>
);

export const Stat = ({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'warn' | 'good' }) => (
  <div className="rounded-xl border border-warm-gray-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-warm-gray-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-green-700' : 'text-warm-gray-900'}`}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-warm-gray-500">{hint}</p>}
  </div>
);

export const Field = ({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-warm-gray-800">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-warm-gray-500">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export const inputCls =
  'w-full rounded-lg border border-warm-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-700 focus:ring-1 focus:ring-accent-700 disabled:bg-warm-gray-50';

export const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full ${width} overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-warm-gray-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function Table<T extends { id?: string | number }>({ rows, columns, empty = 'Nothing here yet.' }: { rows: T[]; columns: Column<T>[]; empty?: string }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-warm-gray-200 bg-white">
      <table className="min-w-full divide-y divide-warm-gray-100 text-sm">
        <thead className="bg-warm-gray-50 text-left text-xs uppercase tracking-wide text-warm-gray-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-2.5 font-medium ${c.className ?? ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-gray-100">
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="hover:bg-warm-gray-50/60">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 align-top ${c.className ?? ''}`}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const fmtDate = (d?: string | null, withTime = false) =>
  d ? new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) }) : '—';
