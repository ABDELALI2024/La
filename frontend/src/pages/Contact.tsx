import { useState } from 'react';
import { PageHero, FieldError } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';

export default function Contact() {
  useSeo('Contact Langzio', 'Ask a question, report a problem or request help with Moroccan Darija. We answer support messages from the admin dashboard.', '/contact');
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await api('/contact', { body: f }); setDone(true); }
    catch (er: any) { setErr(er.message); } finally { setBusy(false); }
  };
  if (done) return <div className="container-x py-12"><div className="card max-w-xl"><h1 className="font-extrabold text-xl">Message sent ✓</h1><p className="text-sm text-stone-600 mt-1">Thank you — we will reply by email.</p></div></div>;
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to us." lede="Support, feedback, partnerships and press." />
      <form onSubmit={submit} className="container-x pb-12 max-w-xl card space-y-3">
        <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required maxLength={160} autoComplete="name" /></div>
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" className="input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required autoComplete="email" /></div>
        <div><label className="label" htmlFor="c-sub">Subject</label><input id="c-sub" className="input" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} maxLength={220} placeholder="e.g. Help with lesson 3" /></div>
        <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" className="input" rows={5} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} required maxLength={5000} /></div>
        <FieldError msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
      </form>
    </>
  );
}
