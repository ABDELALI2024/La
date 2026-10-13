import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
export default function Features() {
  useSeo('Features — AI Darija tutor, lessons, vocabulary SRS, progress', 'Everything in Langzio: structured A0–B2 lessons, vocabulary trainer with spaced repetition, 8-mode AI tutor, progress dashboard, subscriptions and admin tools.', '/features');
  const feats = [
    ['Structured lessons A0–B2', 'Greetings, introductions, numbers, food, shopping, transport, directions, family, everyday expressions, questions, negation, grammar, travel, workplace and culture — with objectives, transliteration and exercises.'],
    ['Vocabulary trainer + SRS', 'Save expressions, search, favourite, review on schedule, see mastery and history. Reviews use a spaced algorithm (1/3/7/14/30 days).'],
    ['AI conversation tutor', 'Free chat, roleplay (shopkeeper, taxi driver), guided lessons, vocab practice, correction mode, culture explainers, travel mode and revision. Quotas and rate limits keep costs fair.'],
    ['Progress dashboard', 'Real stats from your database: lessons completed, vocabulary size, reviews today, streak, AI usage. No fake numbers.'],
    ['Accounts & privacy', 'Email verification, password reset, onboarding, preferences, export-friendly data, and one-click account deletion.'],
    ['Subscriptions', 'Free + Premium with secure Stripe checkout and verified webhooks. Premium is granted only by the server, never by URL tricks.'],
  ];
  return (
    <>
      <PageHero eyebrow="Features" title="Everything you need to speak Darija." />
      <div className="container-x pb-12 grid gap-4 md:grid-cols-2">
        {feats.map(([t, d]) => <article key={t} className="card"><h2 className="font-extrabold">{t}</h2><p className="text-sm text-stone-600 mt-1">{d}</p></article>)}
      </div>
      <div className="container-x pb-12 flex gap-3"><Link to="/register" className="btn-primary">Start free</Link><Link to="/how-it-works" className="btn-ghost">How it works</Link></div>
    </>
  );
}
