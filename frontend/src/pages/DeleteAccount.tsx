import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHero, FieldError } from '../components/Layout';
import { useSeo } from '../lib/seo';
import { api, clearCsrf } from '../lib/api';

export default function DeleteAccount() {
  useSeo('Delete my account | Langzio', 'Permanently delete your Langzio account, progress, vocabulary and conversations.', '/delete-account');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (confirmText !== 'DELETE') { setErr('Type DELETE in the confirmation box.'); return; }
    if (!window.confirm('This is permanent. Delete everything?')) return;
    setBusy(true);
    try {
      await api('/auth/delete', { body: { confirm: confirmText, password } });
      clearCsrf();
      nav('/?deleted=1');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHero eyebrow="Privacy" title="Delete my account." lede="This permanently deletes your profile, preferences, progress, vocabulary, conversations and goals. This cannot be undone." />
      <form onSubmit={submit} className="container-x pb-12 max-w-md card space-y-3 border-2 border-red-200">
        <div><label className="label" htmlFor="da-p">Current password</label><input id="da-p" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></div>
        <div><label className="label" htmlFor="da-c">Type DELETE to confirm</label><input id="da-c" className="input" value={confirmText} onChange={e => setConfirmText(e.target.value)} required placeholder="DELETE" /></div>
        <FieldError msg={err} />
        <button className="btn w-full bg-red-700 text-white hover:bg-red-800 font-semibold rounded-xl px-4 py-2.5" disabled={busy}>{busy ? 'Deleting…' : 'Permanently delete my account'}</button>
      </form>
    </>
  );
}
