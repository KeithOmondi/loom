// Customer ↔ vendor messaging. The same screen serves both sides (the API knows who is who).
// Phone numbers, emails and links are rejected by the server to keep deals on the platform.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Btn, Empty, ErrorBox, PageHeader, Spinner, fmtDate, inputCls } from '../../components/ui/kit';
import { request, useAction, useFetch } from '../../lib/http';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useAppSelector } from '../../store/hooks';

interface Convo { id: string; subject: string | null; store_name: string; customer_name: string; last_message: string | null; unread: number; last_message_at: string; viewer_role: 'customer' | 'seller' }
interface Msg { id: string; sender_id: string; sender_role: string; body: string; created_at: string }

export const MessagesPage = () => {
  useDocumentTitle('Messages');
  const me = useAppSelector((s) => s.auth.user?.id);
  const list = useFetch<{ data: Convo[] }>('/conversations');
  const [active, setActive] = useState<string | null>(null);
  const thread = useFetch<{ data: { messages: Msg[]; conversation: { store_name: string; subject: string | null } } }>(active ? `/conversations/${active}/messages` : null);
  const [body, setBody] = useState('');
  const { busy, run } = useAction();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [thread.data]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !active) return;
    const r = await run(() => request('post', `/conversations/${active}/messages`, { body }));
    if (!r.ok) return toast.error(r.error);
    setBody('');
    await Promise.all([thread.reload(), list.reload()]);
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="For your safety, keep conversations on Loom — phone numbers, emails and links are blocked." />
      {list.loading ? <Spinner /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : !list.data?.data.length ? <Empty title="No conversations yet" hint="Message a seller from any product page." /> : (
        <div className="grid min-h-[420px] gap-4 md:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {list.data.data.map((c) => (
              <li key={c.id}>
                <button onClick={() => setActive(c.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${active === c.id ? 'border-accent-700 bg-accent-50' : 'border-warm-gray-200 bg-white'}`}>
                  <div className="flex justify-between gap-2"><span className="font-medium">{c.viewer_role === 'customer' ? c.store_name : c.customer_name}</span>{c.unread > 0 && <span className="rounded-full bg-accent-700 px-2 text-xs text-white">{c.unread}</span>}</div>
                  <p className="mt-0.5 line-clamp-1 text-warm-gray-600">{c.last_message}</p>
                  <p className="text-xs text-warm-gray-400">{fmtDate(c.last_message_at, true)}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col rounded-xl border border-warm-gray-200 bg-white">
            {!active ? <p className="m-auto p-8 text-sm text-warm-gray-500">Choose a conversation</p> : thread.loading && !thread.data ? <Spinner /> : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 420 }}>
                  {thread.data?.data.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === me ? 'justify-end' : ''}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? 'bg-accent-700 text-white' : 'bg-warm-gray-100'}`}>
                        <p className="whitespace-pre-line">{m.body}</p><p className={`mt-1 text-[10px] ${m.sender_id === me ? 'text-accent-100' : 'text-warm-gray-400'}`}>{fmtDate(m.created_at, true)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={end} />
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-warm-gray-100 p-3">
                  <input className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" maxLength={2000} />
                  <Btn type="submit" busy={busy} disabled={!body.trim()}>Send</Btn>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
