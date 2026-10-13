import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Progress = {
  completed: number; started: number; totalLessons: number; vocab: number; mastered: number;
  due: number; reviewsToday: number; streak: number; premium: boolean;
  ai: { used: number; limit: number };
  recent: { kind: string; ref_type: string; ref_id: number | null; created_at: string }[];
};

export default function Dashboard() {
  useSeo('Dashboard | Langzio', 'Your personal Darija learning dashboard: lessons, vocabulary, reviews, streak and AI usage.', '/dashboard');
  const { user } = useAuth();
  const [p, setP] = useState<Progress | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<Progress>('/progress').then(setP).catch((e: any) => setErr(e.message)); }, []);

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Salam, {user?.name || 'friend'} 👋</h1>
      <p className="text-stone-600 mt-1">Your plan: <strong>{p?.premium ? 'Premium' : 'Free'}</strong> · AI today: <strong>{p ? `${p.ai.used}/${p.ai.limit}` : '…'}</strong></p>
      {err && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{err}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Lessons completed', p ? `${p.completed}/${p.totalLessons}` : '…', '/lessons', 'Continue lessons'],
          ['Vocabulary saved', p ? `${p.vocab} (${p.mastered} mastered)` : '…', '/vocabulary', 'Open trainer'],
          ['Due for review', p ? String(p.due) : '…', '/vocabulary', 'Review now'],
          ['Day streak', p ? String(p.streak) : '…', '/progress', 'Details'],
        ].map(([t, v, to, cta]) => (
          <article key={t as string} className="card">
            <h2 className="text-sm font-bold text-stone-500">{t}</h2>
            <p className="text-3xl font-extrabold mt-1">{v}</p>
            <Link to={to as string} className="mt-2 inline-block text-sm font-bold text-brand-700 hover:underline">{cta} →</Link>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="card">
          <h2 className="font-extrabold">Keep going</h2>
          <ul className="mt-2 text-sm space-y-2">
            <li><Link to="/ai-tutor" className="font-bold text-brand-700 hover:underline">Practise with the AI tutor →</Link><p className="text-stone-500">Roleplay a souk, correct your sentences, or revise.</p></li>
            <li><Link to="/lessons" className="font-bold text-brand-700 hover:underline">Next lesson →</Link><p className="text-stone-500">{p ? `${p.started} started, ${p.completed} completed.` : ''} Short lessons, real phrases.</p></li>
            {!p?.premium && <li><Link to="/subscription" className="font-bold text-brand-700 hover:underline">Go Premium →</Link><p className="text-stone-500">All lessons + 200 AI messages/day.</p></li>}
          </ul>
        </article>
        <article className="card">
          <h2 className="font-extrabold">Recent activity</h2>
          {!p ? <p className="text-sm text-stone-500 mt-2">Loading…</p> : p.recent.length === 0 ? <p className="text-sm text-stone-500 mt-2">No activity yet — complete a lesson or save a word.</p> : (
            <ul className="mt-2 text-sm space-y-1.5">{p.recent.map((r, i) => <li key={i} className="flex justify-between gap-2"><span>{label(r.kind, r.ref_type)}</span><time className="text-stone-400 text-xs">{new Date(r.created_at).toLocaleString()}</time></li>)}</ul>
          )}
        </article>
      </div>
    </div>
  );
}

function label(kind: string, ref: string) {
  if (kind === 'lesson_complete') return '✓ Completed a lesson';
  if (kind === 'lesson_start') return '▶ Started a lesson';
  if (kind === 'vocab_review') return '↻ Reviewed vocabulary';
  if (kind === 'login') return '• Logged in';
  return `• ${kind}${ref ? ` (${ref})` : ''}`;
}
