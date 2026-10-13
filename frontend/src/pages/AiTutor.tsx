import { useEffect, useRef, useState } from 'react';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type Msg = { id?: number; role: 'user' | 'assistant'; content: string; created_at?: string };
type Session = { id: number; mode: string; title: string; updated_at: string };
const MODES = ['free', 'roleplay', 'guided', 'vocab', 'correction', 'culture', 'travel', 'revision'] as const;

export default function AiTutor() {
  useSeo('AI Darija tutor | Langzio', 'Chat with an AI tutor that teaches real Moroccan Darija: free conversation, roleplay, correction, travel survival and culture.', '/ai-tutor');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sid, setSid] = useState<number | null>(null);
  const [mode, setMode] = useState<string>('free');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try { const d = await api<{ sessions: Session[] }>('/tutor/sessions'); setSessions(d.sessions); } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const open = async (id: number) => {
    setSid(id); setErr(null);
    try { const d = await api<{ messages: Msg[]; quota: { used: number; limit: number } }>(`/tutor/messages?session_id=${id}`); setMsgs(d.messages); setQuota(d.quota); } catch (e: any) { setErr(e.message); }
  };
  const create = async () => {
    setErr(null);
    try {
      const d = await api<{ id: number }>('/tutor/sessions', { body: { mode, title: 'New conversation' } });
      await loadSessions(); setSid(d.id); setMsgs([]);
    } catch (e: any) { setErr(e.message); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true); setErr(null); setInput('');
    setMsgs(m => [...m, { role: 'user', content: text }]);
    try {
      const d = await api<{ reply: string; session_id: number; quota: { used: number; limit: number } }>('/tutor/messages', { body: { session_id: sid, mode, message: text } });
      if (!sid) { setSid(d.session_id); loadSessions(); }
      setMsgs(m => [...m, { role: 'assistant', content: d.reply }]);
      setQuota(d.quota);
    } catch (e: any) {
      setErr(e.message);
      if (e.data?.data?.session_id && !sid) setSid(e.data.data.session_id);
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-8 grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="card h-fit" aria-label="Conversations">
        <h1 className="font-extrabold text-lg">AI Darija tutor</h1>
        <p className="text-xs text-stone-500 mt-1">Real Moroccan Darija — Arabic script + transliteration + English.</p>
        <label className="label mt-3" htmlFor="t-mode">Mode</label>
        <select id="t-mode" className="input" value={mode} onChange={e => setMode(e.target.value)}>
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={create} className="btn-primary w-full mt-2 text-sm">+ New chat</button>
        {quota && <p className="text-xs font-bold mt-2 text-stone-600">Today: {quota.used}/{quota.limit} messages</p>}
        <ul className="mt-3 space-y-1 max-h-96 overflow-auto">
          {sessions.map(s => (
            <li key={s.id}><button onClick={() => open(s.id)} className={`w-full text-left text-sm px-3 py-2 rounded-xl ${sid === s.id ? 'bg-stone-900 text-white' : 'hover:bg-stone-100'}`}><span className="font-bold">{s.title.slice(0, 32) || 'Chat'}</span><span className="block text-xs opacity-70">{s.mode} · {new Date(s.updated_at).toLocaleDateString()}</span></button></li>
          ))}
        </ul>
        {sessions.length === 0 && <p className="text-xs text-stone-500 mt-2">No chats yet — start one above.</p>}
      </aside>
      <section className="card flex flex-col min-h-[60vh]" aria-label="Chat">
        {err && <p role="alert" className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mb-2">{err}</p>}
        <div className="flex-1 space-y-3 overflow-auto" aria-live="polite">
          {msgs.length === 0 && <div className="text-sm text-stone-500"><p className="font-bold text-stone-700">Salam! 👋 I'm your Darija tutor.</p><p className="mt-1">Try: <em>“Teach me to greet someone in the morning”</em> or <em>“Roleplay buying oranges in the souk”</em>.</p><p className="mt-1 text-xs">I teach Moroccan Darija (not Standard Arabic). Latin spelling varies — I'll show Arabic script too.</p></div>}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${m.role === 'user' ? 'ml-auto bg-brand-600 text-white' : 'bg-stone-100'}`}>
              <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-60 mb-0.5">{m.role === 'user' ? 'You' : 'Langzio tutor'}</p>
              {m.content}
            </div>
          ))}
          {busy && <p className="text-sm text-stone-500">Tutor is typing…</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="mt-3 flex gap-2">
          <label htmlFor="t-in" className="sr-only">Message the tutor</label>
          <input id="t-in" className="input" value={input} onChange={e => setInput(e.target.value)} maxLength={2000} placeholder="Write in English, French or Darija…" autoComplete="off" />
          <button className="btn-primary" disabled={busy || !input.trim()}>{busy ? '…' : 'Send'}</button>
        </form>
      </section>
    </div>
  );
}
