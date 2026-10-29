// src/pages/seller/SellerShippingAndWaybills.tsx

import { useMemo, useState } from 'react';

// ============================================
// TYPES
// ============================================

type ShipmentStatus =
  | 'pending'          // label created, not yet handed to carrier
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'returned'
  | 'cancelled';

type Carrier = 'dhl' | 'fedex' | 'ups' | 'usps' | 'g4s' | 'sendy';

type ShippingMethod = 'standard' | 'express' | 'overnight' | 'pickup';

interface TrackingEvent {
  id: string;
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  note?: string;
}

interface ShipmentItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
}

interface Shipment {
  id: string;
  waybill: string;             // carrier tracking number
  orderReference: string;
  customerName: string;
  destination: {
    city: string;
    country: string;
    postalCode?: string;
  };
  carrier: Carrier;
  method: ShippingMethod;
  status: ShipmentStatus;
  weightKg: number;
  shippingCost: number;
  insured: boolean;
  items: ShipmentItem[];
  createdAt: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  events: TrackingEvent[];
}

// ============================================
// DUMMY DATA
// ============================================

const CARRIER_LABEL: Record<Carrier, string> = {
  dhl: 'DHL Express',
  fedex: 'FedEx',
  ups: 'UPS',
  usps: 'USPS',
  g4s: 'G4S',
  sendy: 'Sendy',
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  label_created: 'Label created',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed_attempt: 'Failed attempt',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<ShipmentStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  label_created: 'bg-sky-100 text-sky-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-violet-100 text-violet-800',
  out_for_delivery: 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  failed_attempt: 'bg-orange-100 text-orange-800',
  returned: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-slate-200 text-slate-600',
};

const SHIPMENTS: Shipment[] = [
  {
    id: 'shp_01HX9K2M',
    waybill: 'DHL-8842-1193-004',
    orderReference: 'ORD-2026-000142',
    customerName: 'Amara Okafor',
    destination: { city: 'Lagos', country: 'Nigeria', postalCode: '100001' },
    carrier: 'dhl',
    method: 'express',
    status: 'delivered',
    weightKg: 1.4,
    shippingCost: 12.0,
    insured: true,
    items: [
      {
        id: 'itm_01',
        productName: 'Wireless Noise-Cancelling Headphones',
        sku: 'AUD-WNC-001',
        quantity: 1,
      },
      {
        id: 'itm_02',
        productName: 'Replacement Ear Cushions (Pair)',
        sku: 'AUD-CSH-014',
        quantity: 2,
      },
    ],
    createdAt: '2026-10-03T08:20:00Z',
    estimatedDelivery: '2026-10-07T18:00:00Z',
    deliveredAt: '2026-10-07T16:42:00Z',
    events: [
      {
        id: 'ev_01',
        timestamp: '2026-10-03T08:20:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
      {
        id: 'ev_02',
        timestamp: '2026-10-03T15:05:00Z',
        status: 'picked_up',
        location: 'Nairobi, KE',
      },
      {
        id: 'ev_03',
        timestamp: '2026-10-04T11:20:00Z',
        status: 'in_transit',
        location: 'Dubai, AE',
        note: 'Customs cleared',
      },
      {
        id: 'ev_04',
        timestamp: '2026-10-06T07:12:00Z',
        status: 'in_transit',
        location: 'Lagos, NG',
      },
      {
        id: 'ev_05',
        timestamp: '2026-10-07T09:00:00Z',
        status: 'out_for_delivery',
        location: 'Lagos, NG',
      },
      {
        id: 'ev_06',
        timestamp: '2026-10-07T16:42:00Z',
        status: 'delivered',
        location: 'Lagos, NG',
        note: 'Signed for by A. Okafor',
      },
    ],
  },
  {
    id: 'shp_01HX9M8Q',
    waybill: 'SNDY-7731-2284',
    orderReference: 'ORD-2026-000143',
    customerName: 'Daniel Mwangi',
    destination: { city: 'Nairobi', country: 'Kenya', postalCode: '00100' },
    carrier: 'sendy',
    method: 'standard',
    status: 'out_for_delivery',
    weightKg: 2.1,
    shippingCost: 6.5,
    insured: false,
    items: [
      {
        id: 'itm_03',
        productName: 'Stainless Steel Water Bottle 750ml',
        sku: 'HOM-BTL-750',
        quantity: 3,
      },
    ],
    createdAt: '2026-10-06T08:20:00Z',
    estimatedDelivery: '2026-10-10T18:00:00Z',
    deliveredAt: null,
    events: [
      {
        id: 'ev_07',
        timestamp: '2026-10-06T08:20:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
      {
        id: 'ev_08',
        timestamp: '2026-10-06T13:40:00Z',
        status: 'picked_up',
        location: 'Nairobi, KE',
      },
      {
        id: 'ev_09',
        timestamp: '2026-10-09T07:00:00Z',
        status: 'in_transit',
        location: 'Nairobi sort centre, KE',
      },
      {
        id: 'ev_10',
        timestamp: '2026-10-10T07:30:00Z',
        status: 'out_for_delivery',
        location: 'Westlands, Nairobi',
      },
    ],
  },
  {
    id: 'shp_01HXAB3T',
    waybill: 'FDX-9920-4471-8820',
    orderReference: 'ORD-2026-000144',
    customerName: 'Priya Sharma',
    destination: { city: 'Mumbai', country: 'India', postalCode: '400001' },
    carrier: 'fedex',
    method: 'overnight',
    status: 'in_transit',
    weightKg: 2.8,
    shippingCost: 0,
    insured: true,
    items: [
      {
        id: 'itm_04',
        productName: 'Mechanical Keyboard — TKL, Hot-Swap',
        sku: 'CMP-KBD-TKL',
        quantity: 1,
      },
      {
        id: 'itm_05',
        productName: 'PBT Keycap Set — Cherry Profile',
        sku: 'CMP-KCP-PBT',
        quantity: 1,
      },
    ],
    createdAt: '2026-10-08T09:10:00Z',
    estimatedDelivery: '2026-10-11T12:00:00Z',
    deliveredAt: null,
    events: [
      {
        id: 'ev_11',
        timestamp: '2026-10-08T09:10:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
      {
        id: 'ev_12',
        timestamp: '2026-10-08T18:30:00Z',
        status: 'picked_up',
        location: 'Nairobi, KE',
      },
      {
        id: 'ev_13',
        timestamp: '2026-10-09T22:15:00Z',
        status: 'in_transit',
        location: 'Paris CDG, FR',
        note: 'Transit stop',
      },
    ],
  },
  {
    id: 'shp_01HXAC5W',
    waybill: 'UPS-1Z-8842-1193-0042',
    orderReference: 'ORD-2026-000145',
    customerName: 'Lucas Almeida',
    destination: { city: 'São Paulo', country: 'Brazil', postalCode: '01310-100' },
    carrier: 'ups',
    method: 'express',
    status: 'label_created',
    weightKg: 1.6,
    shippingCost: 14.0,
    insured: true,
    items: [
      {
        id: 'itm_06',
        productName: 'Leather Messenger Bag — Tan',
        sku: 'BAG-LTH-TAN',
        quantity: 1,
      },
    ],
    createdAt: '2026-10-09T11:15:00Z',
    estimatedDelivery: '2026-10-14T18:00:00Z',
    deliveredAt: null,
    events: [
      {
        id: 'ev_14',
        timestamp: '2026-10-09T11:15:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
    ],
  },
  {
    id: 'shp_01HXAD2N',
    waybill: 'G4S-4420-8811-0007',
    orderReference: 'ORD-2026-000146',
    customerName: 'Fatima Al-Rashid',
    destination: { city: 'Dubai', country: 'UAE' },
    carrier: 'g4s',
    method: 'standard',
    status: 'failed_attempt',
    weightKg: 1.1,
    shippingCost: 8.0,
    insured: false,
    items: [
      {
        id: 'itm_07',
        productName: 'Ceramic Pour-Over Coffee Set',
        sku: 'KIT-COF-POV',
        quantity: 1,
      },
    ],
    createdAt: '2026-10-05T09:40:00Z',
    estimatedDelivery: '2026-10-09T18:00:00Z',
    deliveredAt: null,
    events: [
      {
        id: 'ev_15',
        timestamp: '2026-10-05T09:40:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
      {
        id: 'ev_16',
        timestamp: '2026-10-05T17:00:00Z',
        status: 'picked_up',
        location: 'Nairobi, KE',
      },
      {
        id: 'ev_17',
        timestamp: '2026-10-08T12:00:00Z',
        status: 'in_transit',
        location: 'Dubai, AE',
      },
      {
        id: 'ev_18',
        timestamp: '2026-10-09T14:20:00Z',
        status: 'out_for_delivery',
        location: 'Dubai Marina, AE',
      },
      {
        id: 'ev_19',
        timestamp: '2026-10-09T19:05:00Z',
        status: 'failed_attempt',
        location: 'Dubai Marina, AE',
        note: 'Recipient not available — will retry next business day',
      },
    ],
  },
  {
    id: 'shp_01HXAE9K',
    waybill: 'USPS-9400-1108-8842-1193',
    orderReference: 'ORD-2026-000147',
    customerName: 'Sophie Dubois',
    destination: { city: 'Lyon', country: 'France', postalCode: '69001' },
    carrier: 'usps',
    method: 'standard',
    status: 'returned',
    weightKg: 2.4,
    shippingCost: 6.0,
    insured: false,
    items: [
      {
        id: 'itm_08',
        productName: 'Yoga Mat — Extra Thick, Non-Slip',
        sku: 'SPT-YGA-THK',
        quantity: 1,
      },
    ],
    createdAt: '2026-09-29T08:50:00Z',
    estimatedDelivery: '2026-10-04T18:00:00Z',
    deliveredAt: null,
    events: [
      {
        id: 'ev_20',
        timestamp: '2026-09-29T08:50:00Z',
        status: 'label_created',
        location: 'Seller hub — Nairobi',
      },
      {
        id: 'ev_21',
        timestamp: '2026-09-29T16:20:00Z',
        status: 'picked_up',
        location: 'Nairobi, KE',
      },
      {
        id: 'ev_22',
        timestamp: '2026-10-02T11:00:00Z',
        status: 'in_transit',
        location: 'Paris, FR',
      },
      {
        id: 'ev_23',
        timestamp: '2026-10-04T09:15:00Z',
        status: 'failed_attempt',
        location: 'Lyon, FR',
        note: 'Address not found',
      },
      {
        id: 'ev_24',
        timestamp: '2026-10-06T10:00:00Z',
        status: 'in_transit',
        location: 'Lyon, FR',
        note: 'Returning to sender',
      },
      {
        id: 'ev_25',
        timestamp: '2026-10-08T15:30:00Z',
        status: 'returned',
        location: 'Nairobi, KE',
        note: 'Received at seller hub',
      },
    ],
  },
];

// ============================================
// HELPERS
// ============================================

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const relativeDays = (iso: string | null) => {
  if (!iso) return null;
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return 'yesterday';
  return `${Math.abs(diff)} days ago`;
};

// ============================================
// COMPONENT
// ============================================

type FilterTab = 'all' | 'active' | 'delivered' | 'issues';

const SellerShippingandWaybills = () => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    SHIPMENTS[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHIPMENTS.filter((s) => {
      if (filter === 'active') {
        if (['delivered', 'returned', 'cancelled'].includes(s.status))
          return false;
      }
      if (filter === 'delivered' && s.status !== 'delivered') return false;
      if (filter === 'issues') {
        if (
          !['failed_attempt', 'returned', 'cancelled'].includes(s.status)
        )
          return false;
      }
      if (!q) return true;
      return (
        s.waybill.toLowerCase().includes(q) ||
        s.orderReference.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.destination.city.toLowerCase().includes(q) ||
        s.destination.country.toLowerCase().includes(q)
      );
    });
  }, [filter, search]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const counts = useMemo(() => {
    const active = SHIPMENTS.filter(
      (s) => !['delivered', 'returned', 'cancelled'].includes(s.status),
    ).length;
    const delivered = SHIPMENTS.filter((s) => s.status === 'delivered').length;
    const issues = SHIPMENTS.filter((s) =>
      ['failed_attempt', 'returned', 'cancelled'].includes(s.status),
    ).length;
    return {
      all: SHIPMENTS.length,
      active,
      delivered,
      issues,
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Shipping &amp; waybills
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track fulfillment, print waybills and follow carrier events.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Bulk print waybills
        </button>
      </header>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['all', `All (${counts.all})`],
            ['active', `Active (${counts.active})`],
            ['delivered', `Delivered (${counts.delivered})`],
            ['issues', `Issues (${counts.issues})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterTab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Layout: list + detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* List */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search waybill, order, customer, or destination…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No shipments match your filters.
            </div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((s) => {
                const isSelected = selected?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`block w-full px-4 py-3 text-left transition ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {s.waybill}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                            >
                              {STATUS_LABEL[s.status]}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {CARRIER_LABEL[s.carrier]} · {s.orderReference}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {s.customerName} — {s.destination.city},{' '}
                            {s.destination.country}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">
                            {shortDate(s.createdAt)}
                          </div>
                          {s.estimatedDelivery && s.status !== 'delivered' && (
                            <div className="mt-1 text-xs text-slate-600">
                              ETA {relativeDays(s.estimatedDelivery)}
                            </div>
                          )}
                          {s.deliveredAt && (
                            <div className="mt-1 text-xs text-emerald-700">
                              Delivered {shortDate(s.deliveredAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select a shipment to view details.
            </div>
          ) : (
            <ShipmentDetail shipment={selected} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// DETAIL PANEL
// ============================================

const ShipmentDetail = ({ shipment }: { shipment: Shipment }) => {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Waybill
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {shipment.waybill}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[shipment.status]}`}
          >
            {STATUS_LABEL[shipment.status]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Detail label="Carrier" value={CARRIER_LABEL[shipment.carrier]} />
          <Detail
            label="Method"
            value={shipment.method.replace('_', ' ')}
            capitalize
          />
          <Detail label="Order" value={shipment.orderReference} mono />
          <Detail label="Weight" value={`${shipment.weightKg.toFixed(2)} kg`} />
          <Detail
            label="Shipping cost"
            value={shipment.shippingCost === 0 ? 'Free' : currency(shipment.shippingCost)}
          />
          <Detail
            label="Insured"
            value={shipment.insured ? 'Yes' : 'No'}
          />
        </div>

        <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-700">Ship to</p>
            <p className="mt-1 text-slate-600">
              {shipment.customerName}
              <br />
              {shipment.destination.city}, {shipment.destination.country}
              {shipment.destination.postalCode
                ? ` ${shipment.destination.postalCode}`
                : ''}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Estimated delivery</p>
            <p className="mt-1 text-slate-600">
              {shipment.estimatedDelivery
                ? `${shortDate(shipment.estimatedDelivery)} (${relativeDays(shipment.estimatedDelivery)})`
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Print waybill
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Track on {CARRIER_LABEL[shipment.carrier]}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Notify customer
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="border-b border-slate-100 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Items ({shipment.items.length})
        </p>
        <ul className="space-y-2">
          {shipment.items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-slate-800">{it.productName}</p>
                <p className="text-xs text-slate-500">{it.sku}</p>
              </div>
              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                ×{it.quantity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tracking timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Tracking history
        </p>
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
          {[...shipment.events].reverse().map((ev) => (
            <li key={ev.id} className="relative">
              <span
                className={`absolute -left-[26px] top-1 inline-block h-3 w-3 rounded-full ring-2 ring-white ${
                  ev.status === 'delivered'
                    ? 'bg-emerald-500'
                    : ev.status === 'failed_attempt' || ev.status === 'returned'
                      ? 'bg-rose-500'
                      : 'bg-slate-400'
                }`}
              />
              <p className="text-xs text-slate-500">
                {shortDateTime(ev.timestamp)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">
                {STATUS_LABEL[ev.status]}
              </p>
              <p className="text-xs text-slate-600">{ev.location}</p>
              {ev.note && (
                <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs italic text-slate-600">
                  {ev.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const Detail = ({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) => (
  <div>
    <p className="text-slate-500">{label}</p>
    <p
      className={`mt-0.5 font-medium text-slate-800 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}
    >
      {value}
    </p>
  </div>
);

export default SellerShippingandWaybills;