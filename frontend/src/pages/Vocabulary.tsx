import { useEffect, useState } from 'react';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type Item = { id: number; darija_ar: string; transliteration: string; english: string; example_darija: string; example_en: string; is_favorite: number; mastery: number; next_review_at: string | null };

export default function Vocabulary() {
  useSeo('My vocabulary trainer — spaced repetition for Darija', 'Save Darija expressions, favourite them, and review on a spaced schedule. Mastery 0–5, due queue and history — saved in your account.', '/vocabulary');
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'fav'>('all');
  const [form, setForm] = useState({ darija_ar: '', transliteration: '', english: '' });
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (filter === 'fav') p.set('favorites', '1');
      if (filter === 'due') p.set('due', '1');
      const d = await api<{ items: Item[] }>('/vocab' + (p.toString() ? '?' + p : ''));
      setItems(d.items);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [filter]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    try {
      await api('/vocab', { method: 'POST', body: form });
      setForm({ darija_ar: '', transliteration: '', english: '' });
      setMsg('Saved. Review is scheduled for tomorrow.');
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const review = async (id: number, quality: number) => {
    try { await api('/vocab/review', { body: { id, quality } }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const fav = async (it: Item) => {
    try { await api(`/vocab/${it.id}`, { method: 'PUT', body: { is_favorite: !it.is_favorite, mastery: it.mastery } }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const del = async (id: number) => {
    if (!confirm('Delete this expression?')) return;
    try { await api(`/vocab/${id}`, { method: 'DELETE', body: {} }); load(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <PageHero eyebrow="Vocabulary" title="Your Darija vocabulary." lede="Save expressions from lessons or the tutor. Reviews are scheduled 1 → 3 → 7 → 14 → 30 days as you score higher." />
      <div className="container-x pb-12 grid gap-4 lg:grid-cols-[320px_1fr]">
        <form onSubmit={add} className="card h-fit space-y-2">
          <h2 className="font-extrabold">Save an expression</h2>
          <div><label className="label" htmlFor="v-ar">Darija (Arabic script)</label><input id="v-ar" className="input ar" lang="ar" value={form.darija_ar} onChange={e => setForm({ ...form, darija_ar: e.target.value })} required maxLength={255} placeholder="مثال: لاباس" /></div>
          <div><label className="label" htmlFor="v-tr">Transliteration</label><input id="v-tr" className="input" value={form.transliteration} onChange={e => setForm({ ...form, transliteration: e.target.value })} maxLength={255} placeholder="labas" /></div>
          <div><label className="label" htmlFor="v-en">English</label><input id="v-en" className="input" value={form.english} onChange={e => setForm({ ...form, english: e.target.value })} required maxLength={255} placeholder="I'm fine" /></div>
          <button className="btn-primary w-full">Save</button>
          {msg && <p className="text-sm text-green-700 font-semibold">{msg}</p>}
        </form>
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <input className="input !w-56" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search vocabulary" />
            <button className="btn-ghost text-sm" onClick={load}>Search</button>
            {(['all', 'due', 'fav'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-sm px-3 py-2 rounded-xl font-bold ${filter === f ? 'bg-stone-900 text-white' : 'bg-white border border-stone-300'}`} aria-pressed={filter === f}>{f === 'all' ? 'All' : f === 'due' ? 'Due for review' : '★ Favorites'}</button>
            ))}
          </div>
          {err && <p role="alert" className="text-sm font-bold text-red-700 mb-2">{err}</p>}
          <ul className="space-y-2">
            {items.map(it => (
              <li key={it.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="ar font-bold" lang="ar">{it.darija_ar}</p>
                    {it.transliteration && <p className="font-mono text-sm text-brand-800">{it.transliteration}</p>}
                    <p className="text-sm text-stone-600">{it.english}</p>
                    <p className="text-xs text-stone-500 mt-1">Mastery {it.mastery}/5 {it.next_review_at ? `· next: ${new Date(it.next_review_at).toLocaleDateString()}` : ''}</p>
                  </div>
                  <button onClick={() => fav(it)} className="text-xl" aria-label={it.is_favorite ? 'Unfavourite' : 'Favourite'}>{it.is_favorite ? '★' : '☆'}</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-bold text-stone-500 mr-1">Review:</span>
                  {[0, 2, 3, 4, 5].map(s => <button key={s} onClick={() => review(it.id, s)} className="text-xs px-2 py-1 rounded-lg border border-stone-300 hover:bg-stone-100" title={s <= 1 ? 'Again' : s === 5 ? 'Perfect' : `Score ${s}`}>{s <= 1 ? '↻ again' : s}</button>)}
                  <button onClick={() => del(it.id)} className="ml-auto text-xs font-bold text-red-700 hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="text-sm text-stone-500">Nothing here yet — save your first expression above, or open a lesson.</p>}
        </div>
      </div>
    </>
  );
}
