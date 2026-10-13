import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FieldError } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { useAuth } from '../lib/auth';

export default function Register() {
  useSeo('Create your free Langzio account', 'Register to learn Moroccan Darija with lessons, vocabulary SRS and an AI tutor. Free plan, no card required.', '/register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { register } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try { await register(name, email, password); nav('/onboarding'); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-12 max-w-md">
      <h1 className="text-3xl font-extrabold">Start speaking Darija.</h1>
      <p className="text-stone-600 mt-1 text-sm">Free plan · starter lessons · 20 AI messages/day. No card required.</p>
      <form onSubmit={submit} className="card mt-4 space-y-3">
        <div><label className="label" htmlFor="rg-n">Your name</label><input id="rg-n" className="input" value={name} onChange={e => setName(e.target.value)} required maxLength={120} autoComplete="name" placeholder="e.g. Sara" /></div>
        <div><label className="label" htmlFor="rg-e">Email</label><input id="rg-e" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div><label className="label" htmlFor="rg-p">Password (8+ characters)</label><input id="rg-p" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} /></div>
        <FieldError msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create free account'}</button>
        <p className="text-xs text-stone-500">By registering you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
        <p className="text-sm">Have an account? <Link to="/login" className="font-bold text-brand-700 hover:underline">Log in</Link></p>
      </form>
    </div>
  );
}
