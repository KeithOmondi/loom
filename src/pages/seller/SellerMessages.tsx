// src/pages/seller/SellerMessages.tsx

import { useEffect, useMemo, useState } from 'react';

// ============================================
// TYPES
// ============================================

type ThreadKind = 'customer' | 'system' | 'moderator' | 'support';

type ThreadStatus = 'open' | 'awaiting_seller' | 'awaiting_customer' | 'resolved' | 'archived';

interface Message {
  id: string;
  author: 'seller' | 'customer' | 'system' | 'moderator' | 'support';
  authorName: string;
  body: string;
  createdAt: string;
  attachments?: { id: string; name: string; url: string; sizeBytes: number }[];
  readBySeller: boolean;
}

interface Thread {
  id: string;
  kind: ThreadKind;
  status: ThreadStatus;
  subject: string;
  counterpartyName: string;
  counterpartyAvatarUrl?: string;
  orderReference?: string;
  tags: string[];
  unreadCount: number;
  lastMessageAt: string;
  messages: Message[];
}

// ============================================
// DUMMY DATA
// ============================================

const THREADS: Thread[] = [
  {
    id: 'thr_01HX3001',
    kind: 'customer',
    status: 'awaiting_seller',
    subject: 'Question about noise-cancelling headphones',
    counterpartyName: 'Amara Okafor',
    orderReference: 'ORD-2026-000142',
    tags: ['pre-sale', 'product-question'],
    unreadCount: 2,
    lastMessageAt: '2026-10-09T15:42:00Z',
    messages: [
      {
        id: 'msg_101',
        author: 'customer',
        authorName: 'Amara Okafor',
        body: 'Hi — do these come with a hard case, or is it a soft pouch?',
        createdAt: '2026-10-09T15:30:00Z',
        readBySeller: true,
      },
      {
        id: 'msg_102',
        author: 'customer',
        authorName: 'Amara Okafor',
        body: 'Also, how long does the battery last with ANC on?',
        createdAt: '2026-10-09T15:42:00Z',
        readBySeller: false,
      },
    ],
  },
  {
    id: 'thr_01HX3002',
    kind: 'customer',
    status: 'open',
    subject: 'Delivery address change — order not yet shipped',
    counterpartyName: 'Daniel Mwangi',
    orderReference: 'ORD-2026-000143',
    tags: ['pre-shipment'],
    unreadCount: 0,
    lastMessageAt: '2026-10-09T11:05:00Z',
    messages: [
      {
        id: 'msg_103',
        author: 'customer',
        authorName: 'Daniel Mwangi',
        body: 'I need to change the delivery address — I moved since placing the order.',
        createdAt: '2026-10-09T10:50:00Z',
        readBySeller: true,
      },
      {
        id: 'msg_104',
        author: 'seller',
        authorName: 'You',
        body: "No problem. Send me the new address and I'll update the label before it ships.",
        createdAt: '2026-10-09T11:05:00Z',
        readBySeller: true,
      },
    ],
  },
  {
    id: 'thr_01HX3003',
    kind: 'moderator',
    status: 'awaiting_seller',
    subject: 'Product listing flagged — missing safety documentation',
    counterpartyName: 'Moderation team',
    orderReference: undefined,
    tags: ['compliance', 'urgent'],
    unreadCount: 1,
    lastMessageAt: '2026-10-09T09:00:00Z',
    messages: [
      {
        id: 'msg_105',
        author: 'moderator',
        authorName: 'Moderation team',
        body:
          'Your listing for "Ceramic Pour-Over Coffee Set" was flagged during a routine check. ' +
          'Food-contact items require a materials safety certificate on file. ' +
          'Please upload it within 48 hours or the listing will be suspended.',
        createdAt: '2026-10-09T09:00:00Z',
        readBySeller: false,
      },
    ],
  },
  {
    id: 'thr_01HX3004',
    kind: 'customer',
    status: 'resolved',
    subject: 'Replacement received — thank you',
    counterpartyName: 'Elena Petrova',
    orderReference: 'ORD-2026-000132',
    tags: ['feedback'],
    unreadCount: 0,
    lastMessageAt: '2026-10-08T18:20:00Z',
    messages: [
      {
        id: 'msg_106',
        author: 'customer',
        authorName: 'Elena Petrova',
        body: 'The replacement arrived today and it looks great. Thanks for handling this so quickly!',
        createdAt: '2026-10-08T18:20:00Z',
        readBySeller: true,
      },
    ],
  },
  {
    id: 'thr_01HX3005',
    kind: 'system',
    status: 'archived',
    subject: 'Payout scheduled for Oct 15',
    counterpartyName: 'System',
    tags: ['payouts'],
    unreadCount: 0,
    lastMessageAt: '2026-10-08T09:00:00Z',
    messages: [
      {
        id: 'msg_107',
        author: 'system',
        authorName: 'System',
        body:
          'Your next payout of $2,743.72 is scheduled for Oct 15. ' +
          'Review the breakdown in Payouts & Settlements.',
        createdAt: '2026-10-08T09:00:00Z',
        readBySeller: true,
      },
    ],
  },
  {
    id: 'thr_01HX3006',
    kind: 'support',
    status: 'open',
    subject: 'KYC document upload failing',
    counterpartyName: 'Seller support',
    tags: ['kyc'],
    unreadCount: 1,
    lastMessageAt: '2026-10-07T14:15:00Z',
    messages: [
      {
        id: 'msg_108',
        author: 'seller',
        authorName: 'You',
        body: 'My proof of address upload keeps failing with a 500 error. Any idea why?',
        createdAt: '2026-10-07T13:50:00Z',
        readBySeller: true,
      },
      {
        id: 'msg_109',
        author: 'support',
        authorName: 'Seller support',
        body:
          'We are aware of a bug affecting PDFs over 8 MB. Please re-upload as a JPG or a smaller PDF and it should go through.',
        createdAt: '2026-10-07T14:15:00Z',
        readBySeller: false,
      },
    ],
  },
];

// ============================================
// HELPERS
// ============================================

const shortDateTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const KIND_TONE: Record<ThreadKind, string> = {
  customer: 'bg-sky-100 text-sky-800',
  system: 'bg-slate-100 text-slate-600',
  moderator: 'bg-violet-100 text-violet-800',
  support: 'bg-emerald-100 text-emerald-800',
};

const KIND_LABEL: Record<ThreadKind, string> = {
  customer: 'Customer',
  system: 'System',
  moderator: 'Moderation',
  support: 'Support',
};

const STATUS_TONE: Record<ThreadStatus, string> = {
  open: 'bg-slate-100 text-slate-700',
  awaiting_seller: 'bg-amber-100 text-amber-800',
  awaiting_customer: 'bg-sky-100 text-sky-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-200 text-slate-500',
};

const STATUS_LABEL: Record<ThreadStatus, string> = {
  open: 'Open',
  awaiting_seller: 'Awaiting you',
  awaiting_customer: 'Awaiting customer',
  resolved: 'Resolved',
  archived: 'Archived',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

// ============================================
// COMPONENT
// ============================================

type FilterTab = 'inbox' | 'unread' | 'action' | 'customer' | 'system' | 'archived';

const SellerMessages = () => {
  const [filter, setFilter] = useState<FilterTab>('inbox');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(THREADS[0]?.id ?? null);
  const [reply, setReply] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  // ------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------

  const counts = useMemo(
    () => ({
      inbox: THREADS.filter((t) => t.status !== 'archived').length,
      unread: THREADS.reduce((sum, t) => sum + (t.unreadCount > 0 ? 1 : 0), 0),
      action: THREADS.filter((t) => t.status === 'awaiting_seller').length,
      customer: THREADS.filter((t) => t.kind === 'customer').length,
      system: THREADS.filter((t) => t.kind === 'system' || t.kind === 'support').length,
      archived: THREADS.filter((t) => t.status === 'archived').length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return THREADS.filter((t) => {
      if (filter === 'inbox' && t.status === 'archived') return false;
      if (filter === 'unread' && t.unreadCount === 0) return false;
      if (filter === 'action' && t.status !== 'awaiting_seller') return false;
      if (filter === 'customer' && t.kind !== 'customer') return false;
      if (filter === 'system' && t.kind !== 'system' && t.kind !== 'support') return false;
      if (filter === 'archived' && t.status !== 'archived') return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.counterpartyName.toLowerCase().includes(q) ||
        (t.orderReference?.toLowerCase().includes(q) ?? false) ||
        t.messages.some((m) => m.body.toLowerCase().includes(q))
      );
    }).sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }, [filter, search]);

  const selected = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  // Clear composer when switching threads
  useEffect(() => {
    setReply('');
    setComposerOpen(false);
  }, [selected?.id]);

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------

  const handleSend = () => {
    const text = reply.trim();
    if (!text) return;
    // TODO: wire to API
    setReply('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customer conversations, moderation notices, and platform updates.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            ['inbox', `Inbox (${counts.inbox})`],
            ['unread', `Unread (${counts.unread})`],
            ['action', `Needs reply (${counts.action})`],
            ['customer', `Customers (${counts.customer})`],
            ['system', `System (${counts.system})`],
            ['archived', `Archived (${counts.archived})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as FilterTab)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Thread list */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, customer, order…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No messages match this filter.
            </div>
          ) : (
            <ul className="max-h-[680px] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((t) => {
                const isSelected = selected?.id === t.id;
                const hasUnread = t.unreadCount > 0;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`block w-full px-4 py-3 text-left transition ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={t.counterpartyName} kind={t.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-sm ${
                                hasUnread
                                  ? 'font-semibold text-slate-900'
                                  : 'font-medium text-slate-800'
                              }`}
                            >
                              {t.counterpartyName}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {shortDateTime(t.lastMessageAt)}
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_TONE[t.kind]}`}
                            >
                              {KIND_LABEL[t.kind]}
                            </span>
                            {t.status === 'awaiting_seller' && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                Reply
                              </span>
                            )}
                          </div>

                          <p
                            className={`mt-1 truncate text-sm ${
                              hasUnread
                                ? 'font-medium text-slate-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {t.subject}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {t.messages[t.messages.length - 1]?.body ?? ''}
                          </p>

                          {t.orderReference && (
                            <p className="mt-1 font-mono text-[11px] text-slate-400">
                              {t.orderReference}
                            </p>
                          )}
                        </div>

                        {hasUnread && (
                          <span className="ml-1 mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Thread detail */}
        <div className="flex h-[680px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Select a conversation to view.
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {selected.subject}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[selected.status]}`}
                      >
                        {STATUS_LABEL[selected.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {KIND_LABEL[selected.kind]} · {selected.counterpartyName}
                      {selected.orderReference && ` · ${selected.orderReference}`}
                    </p>
                    {selected.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selected.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {selected.kind === 'customer' && selected.orderReference && (
                      <a
                        href="/seller/orders"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View order
                      </a>
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                <ol className="space-y-3">
                  {selected.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </ol>
              </div>

              {/* Composer */}
              <div className="border-t border-slate-100 bg-white p-4">
                {selected.kind === 'system' ? (
                  <p className="text-center text-xs text-slate-500">
                    This is a system notification. Replies are not monitored.
                  </p>
                ) : (
                  <>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setComposerOpen(true)}
                      rows={composerOpen ? 4 : 2}
                      placeholder="Write a reply… (⌘/Ctrl + Enter to send)"
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Attach
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Insert template
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!reply.trim()}
                        className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const Avatar = ({ name, kind }: { name: string; kind: ThreadKind }) => {
  const tone: Record<ThreadKind, string> = {
    customer: 'bg-sky-600',
    system: 'bg-slate-500',
    moderator: 'bg-violet-600',
    support: 'bg-emerald-600',
  };
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tone[kind]}`}
    >
      {initials(name)}
    </div>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isSeller = message.author === 'seller';
  const isSystem = message.author === 'system';
  const isModerator = message.author === 'moderator';
  const isSupport = message.author === 'support';

  if (isSystem) {
    return (
      <li className="text-center">
        <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">
          {message.body} · {fullDateTime(message.createdAt)}
        </span>
      </li>
    );
  }

  let bubbleClass = 'border-slate-200 bg-white text-slate-800';
  if (isSeller) bubbleClass = 'border-slate-900/10 bg-slate-900 text-white';
  else if (isModerator) bubbleClass = 'border-violet-200 bg-violet-50 text-violet-900';
  else if (isSupport) bubbleClass = 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <li className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl border px-4 py-2.5 ${bubbleClass}`}>
        <div
          className={`mb-1 flex items-center justify-between gap-3 text-xs ${
            isSeller ? 'text-white/70' : 'text-slate-500'
          }`}
        >
          <span className="font-medium">{message.authorName}</span>
          <span>{fullDateTime(message.createdAt)}</span>
        </div>
        <p className={`whitespace-pre-wrap text-sm ${isSeller ? 'text-white' : ''}`}>
          {message.body}
        </p>

        {message.attachments && message.attachments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {message.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs underline ${
                    isSeller ? 'text-white/90' : 'text-slate-700'
                  }`}
                >
                  📎 {a.name}
                </a>
              </li>
            ))}
          </ul>
        )}

        {isSeller && message.readBySeller && (
          <p className="mt-1 text-right text-[10px] text-white/50">Sent</p>
        )}
      </div>
    </li>
  );
};

export default SellerMessages;