import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type Billing = { live: boolean; plans: Record<string, { name: string; price: number | null; currency: string; features: string[]; note?: string }>; note: string };

export default function Pricing() {
  useSeo('Pricing — Langzio Free and Premium', 'Start free. Upgrade to Premium for all A0–B2 lessons, 200 AI messages a day, roleplays and correction mode. Secure checkout; cancel anytime.', '/pricing');
  const [billing, setBilling] = useState<Billing | null>(null);
  useEffect(() => { api<{ billing: Billing }>('/subscription').then(d => setBilling(d.billing)).catch(() => { api<Billing>('/config').then(setBilling).catch(() => {}); }); }, []);
  const free = billing?.plans?.free;
  const prem = billing?.plans?.premium;
  return (
    <>
      <PageHero eyebrow="Pricing" title="Start free. Upgrade when you're ready." lede="No hardcoded surprises: plans are configured on the server. Checkout is inactive until payments are verified end-to-end." />
      <div className="container-x pb-12 grid gap-4 md:grid-cols-2 max-w-4xl">
        <article className="card">
          <h2 className="font-extrabold text-lg">{free?.name || 'Free'} — {free && free.price === 0 ? '$0' : 'Free'}</h2>
          <ul className="mt-3 text-sm space-y-1.5 list-disc pl-5 text-stone-700">{(free?.features || ['12 starter lessons', '20 AI messages/day', 'Vocabulary trainer']).map(f => <li key={f}>{f}</li>)}</ul>
          <Link to="/register" className="btn-ghost mt-4 w-full">Start free</Link>
        </article>
        <article className="card border-2 border-brand-600">
          <h2 className="font-extrabold text-lg">{prem?.name || 'Premium'} {prem?.price ? `— $${prem.price}` : ''}</h2>
          <ul className="mt-3 text-sm space-y-1.5 list-disc pl-5 text-stone-700">{(prem?.features || ['All lessons A0–B2', '200 AI messages/day', 'Roleplays & correction mode', 'Progress & SRS']).map(f => <li key={f}>{f}</li>)}</ul>
          {billing && !billing.live && <p className="mt-3 text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">Checkout is not live yet — the team must add Stripe keys and verify a test payment. {prem?.note || billing.note}</p>}
          <Link to="/subscription" className="btn-primary mt-4 w-full">Manage subscription</Link>
        </article>
      </div>
    </>
  );
}
