import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
export default function About() {
  useSeo('About Langzio — Darija for real life in Morocco', 'Langzio helps tourists, residents, students, diaspora and professionals speak real Moroccan Darija with lessons, vocabulary SRS and an AI tutor.', '/about');
  return (
    <>
      <PageHero eyebrow="About" title="Darija for real life in Morocco." lede="Langzio exists for one reason: help you speak with Moroccans — in taxis, souks, cafés, offices and family homes — not just pass a quiz." />
      <div className="container-x pb-12 grid gap-4 md:grid-cols-2">
        <article className="card"><h2 className="font-extrabold text-lg">Who it is for</h2>
          <ul className="mt-2 text-sm text-stone-600 list-disc pl-5 space-y-1">
            <li>Tourists who want greetings, numbers, food and directions that actually work.</li>
            <li>Foreign residents and professionals handling everyday and workplace Darija.</li>
            <li>Students of language and culture.</li>
            <li>Moroccan diaspora reconnecting with family language.</li>
          </ul>
        </article>
        <article className="card"><h2 className="font-extrabold text-lg">How we teach</h2>
          <p className="mt-2 text-sm text-stone-600">Every expression comes with <strong>Arabic script</strong>, <strong>Latin transliteration</strong> and <strong>English</strong>, plus examples and cultural notes. Latin spelling of Darija varies (shukran/choukran, 3ayn as “3”) — we say so openly instead of pretending one spelling is official. Levels A0–B2 are our own practical stages, not an official CEFR certificate.</p>
        </article>
      </div>
    </>
  );
}
