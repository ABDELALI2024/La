import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Sec = { id: number; kind: string; heading: string; body_md: string };
type Lesson = { id: number; slug: string; level: string; category: string; title: string; summary: string; objectives: string[]; sections: Sec[]; my_status: { status: string } | null };

export default function LessonDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useSeo(lesson ? `${lesson.title} — Darija lesson ${lesson.level} | Langzio` : 'Darija lesson | Langzio', lesson?.summary || 'Learn Moroccan Darija with structured lessons.', `/lessons/${slug || ''}`);

  useEffect(() => {
    (async () => {
      try { const d = await api<{ lesson: Lesson }>(`/lessons/${encodeURIComponent(slug || '')}`); setLesson(d.lesson); }
      catch (e: any) { setErr(e.status === 404 ? 'Lesson not found.' : e.message); }
    })();
  }, [slug]);

  const mark = async (status: 'started' | 'completed') => {
    if (!user) { window.location.href = '/login?next=' + encodeURIComponent('/lessons/' + slug); return; }
    setSaving(true);
    try {
      await api('/lessons/progress', { body: { lesson_id: lesson!.id, status } });
      const d = await api<{ lesson: Lesson }>(`/lessons/${encodeURIComponent(slug || '')}`);
      setLesson(d.lesson);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  if (err) return <div className="container-x py-12"><p role="alert" className="font-bold text-red-700">{err}</p><p className="mt-2"><Link to="/lessons" className="text-brand-700 font-bold hover:underline">← All lessons</Link></p></div>;
  if (!lesson) return <div className="container-x py-12">Loading lesson…</div>;

  return (
    <article className="container-x py-10 max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-xs text-stone-500"><Link to="/" className="hover:underline">Home</Link> / <Link to="/lessons" className="hover:underline">Lessons</Link> / <span aria-current="page">{lesson.title}</span></nav>
      <p className="mt-4 text-xs font-extrabold tracking-widest uppercase text-brand-700">{lesson.level} · {lesson.category}</p>
      <h1 className="text-3xl font-extrabold mt-1">{lesson.title}</h1>
      <p className="text-stone-600 mt-2">{lesson.summary}</p>
      {lesson.objectives?.length > 0 && (
        <section className="card mt-4" aria-label="Objectives"><h2 className="font-bold">In this lesson you will</h2>
          <ul className="list-disc pl-5 mt-1 text-sm text-stone-700">{lesson.objectives.map(o => <li key={o}>{o}</li>)}</ul></section>
      )}
      {lesson.sections.map(s => (
        <section key={s.id} className="card mt-4" aria-label={s.heading || s.kind}>
          {s.heading && <h2 className="font-bold text-lg">{s.heading}</h2>}
          <p className="mt-2 text-sm text-stone-700 whitespace-pre-line">{s.body_md}</p>
        </section>
      ))}
      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} onClick={() => mark('completed')}>{lesson.my_status?.status === 'completed' ? '✓ Completed — review again' : 'Mark as completed'}</button>
        <Link to="/vocabulary" className="btn-ghost">Open vocabulary trainer</Link>
        <Link to="/ai-tutor" className="btn-ghost">Practise with AI tutor</Link>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'LearningResource', name: lesson.title, description: lesson.summary, teaches: 'Moroccan Darija', educationalLevel: lesson.level, url: `https://langzio.com/lessons/${lesson.slug}` }) }} />
    </article>
  );
}
