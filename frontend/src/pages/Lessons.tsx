import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type Lesson = { id: number; slug: string; level: string; category: string; title: string; summary: string; my_status?: string | null };

export default function Lessons() {
  useSeo('Moroccan Darija lessons A0–B2 — greetings, numbers, food, souk, taxi', 'Free structured Darija lessons: greetings, introductions, numbers and prices, food ordering, souk shopping, taxis and directions, family, questions, travel and culture.', '/lessons');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const p = new URLSearchParams();
      if (level) p.set('level', level);
      if (q.trim()) p.set('q', q.trim());
      const d = await api<{ lessons: Lesson[] }>('/lessons' + (p.toString() ? '?' + p : ''));
      setLessons(d.lessons); setErr(null);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHero eyebrow="Lessons A0–B2" title="Learn Moroccan Darija, step by step." lede="Greetings, introductions, numbers and prices, food, shopping, transportation, directions, family, everyday expressions, questions, negation, grammar, travel, work and culture." />
      <div className="container-x pb-12">
        <form className="flex flex-wrap gap-2 mb-4" onSubmit={e => { e.preventDefault(); load(); }}>
          <label className="sr-only" htmlFor="lvl">Level</label>
          <select id="lvl" className="input !w-auto" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">All levels</option>{['A0', 'A1', 'A2', 'B1', 'B2'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <label className="sr-only" htmlFor="lsq">Search lessons</label>
          <input id="lsq" className="input !w-64" placeholder="Search… e.g. food, taxi" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
        {err && <p role="alert" className="text-red-700 font-semibold text-sm mb-3">{err}</p>}
        <ul className="grid gap-3 md:grid-cols-2">
          {lessons.map(l => (
            <li key={l.slug} className="card">
              <div className="flex gap-2 items-center text-xs">
                <span className="badge bg-brand-100 text-brand-800">{l.level}</span>
                <span className="badge bg-stone-100 text-stone-600">{l.category}</span>
                {l.my_status === 'completed' && <span className="badge bg-green-100 text-green-800">✓ completed</span>}
              </div>
              <h2 className="mt-2 font-extrabold text-lg"><Link to={`/lessons/${l.slug}`} className="hover:underline">{l.title}</Link></h2>
              <p className="text-sm text-stone-600 mt-1">{l.summary}</p>
              <Link to={`/lessons/${l.slug}`} className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline" aria-label={`Open ${l.title}`}>Open lesson →</Link>
            </li>
          ))}
        </ul>
        {lessons.length === 0 && !err && <p className="text-stone-500 text-sm">No lessons match. Try clearing the filter.</p>}
      </div>
    </>
  );
}
