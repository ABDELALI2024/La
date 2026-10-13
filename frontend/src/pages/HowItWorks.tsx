import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
export default function HowItWorks() {
  useSeo('How Langzio works — lessons, vocabulary, AI tutor', 'Onboard in 2 minutes, follow A0–B2 lessons, save vocabulary with spaced repetition, and practise with the AI Darija tutor.', '/how-it-works');
  const steps = [
    ['Create your account', 'Register, verify your email, and tell us your level (A0–B2), goal and daily minutes. Your plan is stored securely on the server.'],
    ['Follow structured lessons', 'Greetings → introductions → numbers & prices → food → souk → taxi → family → questions & negation → travel → work → culture. Each lesson has objectives, examples and completion tracking.'],
    ['Save vocabulary', 'One tap saves any phrase. Search, favourite, and review on a spaced schedule. Mastery 0–5 shows what is solid and what is due.'],
    ['Speak with the AI tutor', 'Eight modes: free chat, roleplay, guided lessons, vocabulary practice, correction, culture, travel survival and revision. Free plan: 20 messages/day; Premium: 200/day.'],
    ['Track progress', 'Dashboard shows completed lessons, vocabulary size, reviews, streak and AI usage — all computed from your real database records.'],
  ];
  return (
    <>
      <PageHero eyebrow="How it works" title="From zero to everyday conversations." lede="Five steps. Fifteen minutes a day is enough to start." />
      <ol className="container-x pb-12 space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="card"><h2 className="font-extrabold">{i + 1}. {t}</h2><p className="text-sm text-stone-600 mt-1">{d}</p></li>
        ))}
        <li className="flex gap-3"><Link to="/register" className="btn-primary">Get started</Link><Link to="/pricing" className="btn-ghost">See pricing</Link></li>
      </ol>
    </>
  );
}
