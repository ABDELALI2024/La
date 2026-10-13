import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, FieldError } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Settings() {
  useSeo('Settings | Langzio', 'Update your learning level, goal, daily minutes, language and email preferences.', '/settings');
  const { user } = useAuth();
  const [f, setF] = useState({ level: 'A0', goal: 'everyday', daily_minutes: 15, ui_lang: 'en', transliteration: true, email_news: false });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => { api<any>('/preferences').then(d => { if (d?.user_id) setF({ level: d.level || 'A0', goal: d.goal || 'everyday', daily_minutes: d.daily_minutes || 15, ui_lang: d.ui_lang || 'en', transliteration: !!d.transliteration, email_news: !!d.email_news }); }).catch(() => {}); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setOk(null);
    try { await api('/preferences', { method: 'PUT', body: f }); setOk('Saved ✓'); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <PageHero eyebrow="Settings" title="Your learning settings." lede={user?.email || ''} />
      <form onSubmit={save} className="container-x pb-12 max-w-xl card space-y-3">
        <div><label className="label" htmlFor="s-lvl">Level (practical stages A0–B2)</label>
          <select id="s-lvl" className="input" value={f.level} onChange={e => setF({ ...f, level: e.target.value })}>{['A0', 'A1', 'A2', 'B1', 'B2'].map(l => <option key={l} value={l}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="s-goal">Goal</label>
          <select id="s-goal" className="input" value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })}>
            {['everyday', 'travel', 'work', 'family', 'study', 'culture'].map(g => <option key={g} value={g}>{g}</option>)}
          </select></div>
        <div><label className="label" htmlFor="s-min">Daily minutes</label><input id="s-min" className="input" type="number" min={5} max={180} value={f.daily_minutes} onChange={e => setF({ ...f, daily_minutes: Number(e.target.value) })} /></div>
        <div><label className="label" htmlFor="s-lang">Interface language</label>
          <select id="s-lang" className="input" value={f.ui_lang} onChange={e => setF({ ...f, ui_lang: e.target.value })}><option value="en">English</option><option value="fr">Français</option></select></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.transliteration} onChange={e => setF({ ...f, transliteration: e.target.checked })} /> Show Latin transliteration</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.email_news} onChange={e => setF({ ...f, email_news: e.target.checked })} /> Email me learning tips</label>
        <FieldError msg={err} />
        {ok && <p className="text-sm font-bold text-green-700">{ok}</p>}
        <button className="btn-primary w-full">Save settings</button>
        <p className="text-sm pt-2 border-t border-stone-100">Want to leave? <Link to="/delete-account" className="font-bold text-red-700 hover:underline">Delete my account</Link></p>
      </form>
    </>
  );
}
