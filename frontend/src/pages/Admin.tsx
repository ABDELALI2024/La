import { useEffect, useState } from 'react';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Admin() {
  useSeo('Admin | Langzio', 'Admin dashboard.', '/admin');
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [support, setSupport] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setStats(await api<Record<string, number>>('/admin/stats'));
      setUsers((await api<{ users: any[] }>('/admin/users')).users);
      setSupport((await api<{ messages: any[] }>('/admin/support')).messages);
      setErr(null);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { if (user?.admin) load(); }, [user]);

  if (!user?.admin) return <div className="container-x py-12"><h1 className="font-extrabold text-2xl">Admin</h1><p className="text-sm text-stone-600 mt-1">Your account is not an administrator. Admin checks run on the server for every request.</p></div>;

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Admin dashboard</h1>
      {err && <p role="alert" className="text-sm font-bold text-red-700 mt-2">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-4 mt-4">
        {stats && Object.entries(stats).map(([k, v]) => <div key={k} className="card"><p className="text-xs font-bold text-stone-500">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <section className="card">
          <h2 className="font-extrabold">Users</h2>
          <form className="flex gap-2 mt-2" onSubmit={async e => { e.preventDefault(); try { setUsers((await api<{ users: any[] }>(`/admin/users?q=${encodeURIComponent(q)}`)).users); } catch (e: any) { setErr(e.message); } }}>
            <input className="input" placeholder="Search email/name…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search users" />
            <button className="btn-ghost text-sm">Search</button>
          </form>
          <ul className="mt-2 text-xs space-y-1 max-h-96 overflow-auto">{users.map(u => <li key={u.id} className="flex justify-between gap-2 border-b border-stone-100 py-1"><span>{u.email} · {u.plan}{u.is_admin ? ' · admin' : ''}</span><span className="text-stone-400">{new Date(u.created_at).toLocaleDateString()}</span></li>)}</ul>
        </section>
        <section className="card">
          <h2 className="font-extrabold">Support inbox</h2>
          <ul className="mt-2 text-sm space-y-2 max-h-96 overflow-auto">
            {support.map(m => (
              <li key={m.id} className="border border-stone-200 rounded-xl p-3">
                <p className="font-bold">{m.subject || '(no subject)'} <span className="badge bg-stone-100 ml-1">{m.status}</span></p>
                <p className="text-xs text-stone-500">{m.name} · {m.email}</p>
                <p className="text-sm mt-1 whitespace-pre-line">{m.message.slice(0, 300)}</p>
                <div className="mt-2 flex gap-1.5">
                  {(['open', 'answered', 'closed'] as const).map(s => (
                    <button key={s} className="text-xs px-2 py-1 rounded-lg border border-stone-300" onClick={async () => { await api('/admin/support', { body: { id: m.id, status: s } }); load(); }}>{s}</button>
                  ))}
                </div>
              </li>
            ))}
            {support.length === 0 && <li className="text-stone-500 text-sm">Inbox empty.</li>}
          </ul>
        </section>
      </div>
      <p className="text-xs text-stone-500 mt-4">Lesson publishing: use <code>POST /api/admin/lessons</code> (slug, level, category, title, summary, is_published) — server checks admin role every call. Usage limits and plans live in <code>private/config.php</code>.</p>
    </div>
  );
}
