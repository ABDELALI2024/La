import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type P = { completed: number; started: number; totalLessons: number; vocab: number; mastered: number; due: number; reviewsToday: number; streak: number; ai: { used: number; limit: number }; premium: boolean };

export default function Progress() {
  useSeo('My progress | Langzio', 'Lessons completed, vocabulary mastery, reviews, streak and AI usage — computed from your real learning records.', '/progress');
  const [p, setP] = useState<P | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [goals, setGoals] = useState<{ id: number; title: string; is_done: number }[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    api<P>('/progress').then(setP).catch((e: any) => setErr(e.message));
    api<{ goals: any[] }>('/goals').then(d => setGoals(d.goals)).catch(() => {});
  }, []);

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api('/goals', { body: { title: title.trim() } });
    setTitle('');
    const d = await api<{ goals: any[] }>('/goals');
    setGoals(d.goals);
  };

  const pct = p && p.totalLessons > 0 ? Math.round((p.completed / p.totalLessons) * 100) : 0;
  return (
    <>
      <PageHero eyebrow="Progress" title="Your real progress." lede="Every number below comes from your database records — lessons, vocabulary reviews, activity and AI usage." />
      <div className="container-x pb-12">
        {err && <p role="alert" className="text-sm font-bold text-red-700">{err}</p>}
        <div className="card">
          <h2 className="font-extrabold">Lessons</h2>
          <p className="text-2xl font-extrabold mt-1">{p ? `${p.completed}/${p.totalLessons}` : '…'} <span className="text-sm font-semibold text-stone-500">({pct}%)</span></p>
          <div className="mt-2 h-3 rounded-full bg-stone-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lessons completed"><div className="h-3 rounded-full bg-brand-600" style={{ width: pct + '%' }} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          {[['Vocabulary', p ? `${p.vocab} saved · ${p.mastered} mastered` : '…'], ['Reviews', p ? `${p.reviewsToday} today · ${p.due} due` : '…'], ['Streak & AI', p ? `${p.streak} day(s) · AI ${p.ai.used}/${p.ai.limit}` : '…']].map(([t, v]) => (
            <div key={t} className="card"><h2 className="font-bold text-sm text-stone-500">{t}</h2><p className="font-extrabold mt-1">{v}</p></div>
          ))}
        </div>
        <div className="card mt-3">
          <h2 className="font-extrabold">Learning goals</h2>
          <form onSubmit={addGoal} className="mt-2 flex gap-2">
            <label htmlFor="g-t" className="sr-only">New goal</label>
            <input id="g-t" className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Order food in Darija by December" />
            <button className="btn-ghost text-sm">Add</button>
          </form>
          <ul className="mt-2 text-sm space-y-1">{goals.map(g => <li key={g.id} className="flex gap-2"><span aria-hidden>{g.is_done ? '✓' : '○'}</span>{g.title}</li>)}{goals.length === 0 && <li className="text-stone-500">No goals yet — add your first above.</li>}</ul>
        </div>
        <p className="mt-4 text-sm"><Link to="/dashboard" className="font-bold text-brand-700 hover:underline">← Back to dashboard</Link></p>
      </div>
    </>
  );
}
