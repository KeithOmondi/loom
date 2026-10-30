import { useMemo, useState } from 'react';
import { Btn, Field, inputCls } from '../ui/kit';
import { KENYA_COUNTIES } from '../../lib/kenya';
import { useAppSelector } from '../../store/hooks';
import { useFetch } from '../../lib/http';

// Counties where delivery is priced by neighbourhood (areas come from the delivery zones in the back office).
const METRO_COUNTIES = ['Nairobi', 'Kiambu', 'Kajiado', 'Machakos'];

export interface AddressValues {
  label?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  instructions?: string;
  is_default?: boolean;
}

export const AddressForm = ({
  initial, submitLabel = 'Save address', busy, onSubmit, onCancel,
}: {
  initial?: Partial<AddressValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (v: AddressValues) => unknown;
  onCancel?: () => void;
}) => {
  const user = useAppSelector((s) => s.auth.user);
  const [v, setV] = useState<AddressValues>({
    first_name: user?.full_name?.split(' ')[0] ?? '',
    last_name: user?.full_name?.split(' ').slice(1).join(' ') ?? '',
    email: user?.email ?? '',
    phone: '',
    address_line1: '',
    city: '',
    state: 'Nairobi',
    postal_code: '00100',
    country: 'KE',
    ...initial,
  });
  const [err, setErr] = useState<string | null>(null);
  const [typeArea, setTypeArea] = useState(false);
  const zones = useFetch<{ data: { areas?: string[] }[] }>('/shipping/zones');
  const knownAreas = useMemo(
    () => [...new Set((zones.data?.data ?? []).flatMap((z) => z.areas ?? []))].sort((a, b) => a.localeCompare(b)),
    [zones.data],
  );
  const showAreaList = METRO_COUNTIES.includes(v.state) && knownAreas.length > 0 && !typeArea;
  const areaSelected = knownAreas.some((a) => a.toLowerCase() === v.city.trim().toLowerCase()) ? v.city : '';
  const set = (k: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.first_name || !v.last_name || !v.phone || v.phone.replace(/\D/g, '').length < 9 || !v.address_line1 || !v.city) {
      setErr('Please fill in your name, phone number, street address and town.');
      return;
    }
    setErr(null);
    void onSubmit(v);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="First name"><input className={inputCls} value={v.first_name} onChange={set('first_name')} autoComplete="given-name" /></Field>
      <Field label="Last name"><input className={inputCls} value={v.last_name} onChange={set('last_name')} autoComplete="family-name" /></Field>
      <Field label="Phone" hint="The courier will call this number"><input className={inputCls} type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" placeholder="0712 345 678" /></Field>
      <Field label="Email"><input className={inputCls} type="email" value={v.email} onChange={set('email')} autoComplete="email" /></Field>
      <div className="sm:col-span-2">
        <Field label="Street address / building"><input className={inputCls} value={v.address_line1} onChange={set('address_line1')} autoComplete="address-line1" /></Field>
      </div>
      <Field label="County">
        <select className={inputCls} value={v.state} onChange={(e) => { setTypeArea(false); setV((s) => ({ ...s, state: e.target.value, city: '' })); }}>
          {KENYA_COUNTIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      {showAreaList ? (
        <Field label="Area" hint="Delivery cost depends on your area">
          <select
            className={inputCls}
            value={areaSelected}
            onChange={(e) => (e.target.value === '__other' ? (setTypeArea(true), setV((s) => ({ ...s, city: '' }))) : setV((s) => ({ ...s, city: e.target.value })))}
          >
            <option value="">Choose your area…</option>
            {knownAreas.map((a) => <option key={a} value={a}>{a}</option>)}
            <option value="__other">My area isn&apos;t listed</option>
          </select>
        </Field>
      ) : (
        <Field label="Town / area"><input className={inputCls} value={v.city} onChange={set('city')} autoComplete="address-level2" /></Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Delivery instructions (optional)"><textarea className={inputCls} rows={2} value={v.instructions ?? ''} onChange={set('instructions')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={!!v.is_default} onChange={(e) => setV((s) => ({ ...s, is_default: e.target.checked }))} className="h-4 w-4 accent-[#B85A38]" />
        Make this my default address
      </label>
      {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Btn type="submit" busy={busy}>{submitLabel}</Btn>
        {onCancel && <Btn type="button" variant="secondary" onClick={onCancel}>Cancel</Btn>}
      </div>
    </form>
  );
};
