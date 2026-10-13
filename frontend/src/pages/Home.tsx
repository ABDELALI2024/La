import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';

const phrases = [
  { ar: 'سلام، لاباس؟', tr: 'salam, labas?', en: 'Hello, how are you?' },
  { ar: 'شحال هادي؟', tr: 'shhal hadi?', en: 'How much is this?' },
  { ar: 'بغيت أتاي عفاك', tr: 'bghit atay 3afak', en: 'I want tea, please' },
  { ar: 'فين الطاكسي؟', tr: 'fin t-taxi?', en: 'Where is the taxi?' },
  { ar: 'شكرا بزاف', tr: 'shukran bzaf', en: 'Thank you very much' },
  { ar: 'بسلامة!', tr: 'bslama!', en: 'Goodbye!' },
];

export default function Home() {
  useSeo('Langzio — Learn Moroccan Darija with an AI Tutor', 'Learn real Moroccan Darija: greetings, numbers, food, souk, taxi, travel and culture. Structured lessons, SRS vocabulary and an AI tutor.', '/');
  return (
    <>
      <PageHero eyebrow="Moroccan Darija · A0–B2" title="Speak real Darija from day one." lede="Langzio teaches the Moroccan Arabic people actually speak — with Arabic script, Latin transliteration and English — through short lessons, a smart vocabulary trainer and an AI conversation tutor.">
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary">Start learning free</Link>
          <Link to="/lessons" className="btn-ghost">Browse lessons</Link>
          <Link to="/ai-tutor" className="btn-ghost">Try the AI tutor</Link>
        </div>
        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {[['12', 'starter lessons'], ['30+', 'seed expressions'], ['8', 'tutor modes'], ['5', 'levels A0–B2']].map(([n, l]) => (
            <div key={l} className="card text-center"><dt className="sr-only">{l}</dt><dd className="text-2xl font-extrabold">{n}</dd><dd className="text-xs text-stone-500 font-semibold">{l}</dd></div>
          ))}
        </dl>
      </PageHero>

      <section className="container-x py-8" aria-label="Essential phrases">
        <h2 className="text-2xl font-extrabold">Essential Darija phrases</h2>
        <p className="text-stone-600 mt-1">Real phrases you will use in the first week. Latin spelling varies — we show one common form.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phrases.map(p => (
            <li key={p.en} className="card">
              <p className="ar font-bold" lang="ar">{p.ar}</p>
              <p className="mt-1 font-mono text-sm text-brand-800">{p.tr}</p>
              <p className="text-sm text-stone-600">{p.en}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm"><Link to="/lessons" className="font-bold text-brand-700 hover:underline">Learn these in guided lessons →</Link></p>
      </section>

      <section className="container-x py-8 grid gap-4 md:grid-cols-3" aria-label="How it works">
        {[
          ['1. Learn', 'Short lessons for greetings, numbers, food, souk, taxi, family and grammar — each with objectives, examples and exercises.'],
          ['2. Remember', 'Save expressions to your vocabulary trainer. Spaced repetition schedules reviews; mastery tracks 0–5.'],
          ['3. Speak', 'Practice with the AI tutor: free chat, roleplay, correction mode, travel survival and culture explainers.'],
        ].map(([t, d]) => (
          <article key={t} className="card"><h2 className="font-extrabold text-lg">{t}</h2><p className="mt-1 text-stone-600 text-sm">{d}</p></article>
        ))}
      </section>

      <section className="container-x py-8" aria-label="Darija vs Standard Arabic">
        <div className="card">
          <h2 className="text-xl font-extrabold">Moroccan Darija vs. Standard Arabic</h2>
          <p className="mt-2 text-stone-600 text-sm max-w-3xl">Darija is Morocco's everyday spoken language. It shares roots with Standard Arabic but sounds different and uses its own words — e.g. <em>shhal?</em> (how much?), <em>bghit</em> (I want), <em>labas?</em> (how are you?). Learning MSA alone will not make you understood in a souk or taxi. Langzio teaches Darija first, and flags where usage varies by city.</p>
          <p className="mt-3 text-sm"><Link to="/faq" className="font-bold text-brand-700 hover:underline">Read the FAQ →</Link></p>
        </div>
      </section>
    </>
  );
}
