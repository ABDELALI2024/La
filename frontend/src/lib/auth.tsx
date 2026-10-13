import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearCsrf } from './api';

export type User = { id: number; email: string; name: string; verified: boolean; admin: boolean; plan: 'free' | 'premium' } | null;

type Ctx = {
  user: User; loading: boolean;
  refresh(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => {}, login: async () => {}, register: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const d = await api<{ user: User }>('/auth/me');
      setUser(d.user);
    } catch { setUser(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string) => {
    const d = await api<{ user: NonNullable<User> }>('/auth/login', { body: { email, password } });
    setUser(d.user);
  };
  const register = async (name: string, email: string, password: string) => {
    const d = await api<{ user: NonNullable<User> }>('/auth/register', { body: { name, email, password } });
    setUser(d.user);
  };
  const logout = async () => {
    try { await api('/auth/logout', { body: {} }); } catch {}
    clearCsrf(); setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, refresh, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container-x py-16">Loading…</div>;
  if (!user) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return null; }
  return children;
}
