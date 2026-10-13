// Tiny fetch wrapper: same-origin PHP API, CSRF header, honest errors.
let csrf: string | null = null;

export async function getCsrf(): Promise<string> {
  if (csrf) return csrf;
  const r = await fetch('/api/csrf', { credentials: 'same-origin' });
  const j = await r.json();
  csrf = j?.data?.token ?? '';
  return csrf || '';
}

type Opts = { method?: string; body?: unknown; auth?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const method = opts.method || (opts.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrf();
    body = JSON.stringify(opts.body);
  }
  const res = await fetch('/api' + path, { method, headers, body, credentials: 'same-origin' });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { throw new Error('Unexpected server response.'); }
  if (!res.ok || !json?.ok) {
    const msg = json?.error || `Request failed (${res.status}).`;
    const err = new Error(msg) as Error & { status?: number; data?: unknown };
    err.status = res.status; err.data = json;
    throw err;
  }
  return json.data as T;
}

export function clearCsrf() { csrf = null; }
