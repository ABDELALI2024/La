import { useEffect, useState } from 'react';
import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

type Sub = { premium: boolean; subscription: { plan: string; status: string; current_period_end: string | null; cancel_at_period_end: number } | null; history: { id: number; type: string; created_at: string }[]; billing: { live: boolean; note: string } };

export default function Subscription() {
  useSeo('Subscription | Langzio', 'Manage your Langzio Free or Premium subscription: checkout, status, cancellation and payment history.', '/subscription');
  const [s, setS] = useState<Sub | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setS(await api<Sub>('/subscription')); } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const checkout = async (plan: string) => {
    setBusy(true); setErr(null);
    try {
      const d = await api<{ url: string }>('/subscription/checkout', { body: { plan } });
      window.location.href = d.url;
    } catch (e: any) { setErr(e.message + (e.data?.data?.billing?.note ? ' ' + e.data.data.billing.note : '')); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Cancel Premium at the end of the billing period?')) return;
    try { await api('/subscription/cancel', { body: {} }); load(); } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <PageHero eyebrow="Subscription" title={s?.premium ? 'You have Premium ✓' : 'Your subscription.'} lede={s?.subscription ? `${s.subscription.plan} · ${s.subscription.status}` : 'Free plan — upgrade when ready.'} />
      <div className="container-x pb-12 max-w-2xl space-y-3">
        {err && <p role="alert" className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{err}</p>}
        {s && !s.billing.live && <p className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">Payments are not live yet: {s.billing.note} Premium is granted only by verified server webhooks — never by URL parameters.</p>}
        <div className="card">
          <h2 className="font-extrabold">Change plan</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => checkout('premium_monthly')} className="btn-primary text-sm">Premium monthly</button>
            <button disabled={busy} onClick={() => checkout('premium_yearly')} className="btn-ghost text-sm">Premium yearly</button>
            {s?.premium && <button onClick={cancel} className="text-sm font-bold text-red-700 hover:underline ml-auto">Cancel Premium</button>}
          </div>
          {new URLSearchParams(window.location.search).get('status') === 'cancelled' && <p className="text-sm mt-2">Checkout was cancelled — no charge was made.</p>}
        </div>
        <div className="card">
          <h2 className="font-extrabold">Payment history</h2>
          {!s ? <p className="text-sm text-stone-500">Loading…</p> : s.history.length === 0 ? <p className="text-sm text-stone-500">No payments yet.</p> : (
            <ul className="text-sm mt-1 space-y-1">{s.history.map(h => <li key={h.id} className="flex justify-between"><span>{h.type}</span><time className="text-stone-400 text-xs">{new Date(h.created_at).toLocaleString()}</time></li>)}</ul>
          )}
        </div>
      </div>
    </>
  );
}
