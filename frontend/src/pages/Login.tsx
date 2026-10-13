import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FieldError } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Login() {
  useSeo('Log in to Langzio', 'Log in to continue your Moroccan Darija lessons, vocabulary and AI tutor.', '/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [info, setInfo] = useState<string | null>(null);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await login(email, password);
      nav(sp.get('next') || '/dashboard');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await api('/auth/forgot', { body: { email } }); setInfo('If an account exists, a reset link was sent. Check your inbox.'); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-12 max-w-md">
      <h1 className="text-3xl font-extrabold">{mode === 'forgot' ? 'Reset password' : 'Welcome back.'}</h1>
      <p className="text-stone-600 mt-1 text-sm">Learn real Moroccan Darija — greetings, souk, taxi, food and more.</p>
      {sp.get('verify') && <p className="mt-3 text-sm bg-blue-50 border border-blue-200 rounded-xl p-3">Verifying… <VerifyToken token={sp.get('verify')!} /></p>}
      {mode === 'login' ? (
        <form onSubmit={doLogin} className="card mt-4 space-y-3">
          <div><label className="label" htmlFor="li-e">Email</label><input id="li-e" className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="label" htmlFor="li-p">Password</label><input id="li-p" className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <FieldError msg={err} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <div className="flex justify-between text-sm">
            <button type="button" className="font-bold text-brand-700 hover:underline" onClick={() => { setMode('forgot'); setErr(null); }}>Forgot password?</button>
            <Link to="/register" className="font-bold text-brand-700 hover:underline">Create account</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={doForgot} className="card mt-4 space-y-3">
          <div><label className="label" htmlFor="li-fe">Email</label><input id="li-fe" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <FieldError msg={err} />
          {info && <p className="text-sm font-semibold text-green-700">{info}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" className="text-sm font-bold" onClick={() => setMode('login')}>← Back to login</button>
        </form>
      )}
    </div>
  );
}

function VerifyToken({ token }: { token: string }) {
  const [msg, setMsg] = useState('…');
  useState(() => { api('/auth/verify', { body: { token } }).then(() => setMsg('verified ✓ You can now log in.')).catch(() => setMsg('invalid or expired.')); });
  return <span>{msg}</span>;
}
