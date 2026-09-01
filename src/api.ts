// Production client API — thin fetch wrappers around the canonical Cloudflare backend.
const BASE = 'https://fuelpro-billing.pages.dev/api'

async function req(path: string, init?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, init)
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Unauthorized'), { status: r.status })
  return r.json().catch(() => null)
}
const auth = (token: string): RequestInit => ({ headers: { authorization: `Bearer ${token}` } })
const jsonReq = (token: string, body: unknown, method: string): RequestInit => ({ method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })

export interface LoginResult { ok: boolean; token?: string; role?: string; name?: string; error?: string }
export async function apiLogin(username: string, password: string): Promise<LoginResult> {
  try {
    const r = await fetch(`${BASE}/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.token) return { ok: false, error: d.error ?? `HTTP ${r.status}` }
    return { ok: true, token: d.token, role: d.role, name: d.name }
  } catch { return { ok: false, error: 'Unreachable' } }
}

export async function apiState(token: string) { return req('/state', auth(token)) }
export async function apiStatePut(token: string, db: unknown) { return req('/state', jsonReq(token, db, 'PUT')) }

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export async function apiSubscribers<T = any>(token: string, opts: { page?: number; pageSize?: number; q?: string; status?: string } = {}): Promise<Page<T>> {
  const qs = new URLSearchParams()
  if (opts.page) qs.set('page', String(opts.page))
  if (opts.pageSize) qs.set('pageSize', String(opts.pageSize))
  if (opts.q) qs.set('q', opts.q)
  if (opts.status) qs.set('status', opts.status)
  return req(`/subscribers?${qs}`, auth(token))
}
export async function apiSubCreate(token: string, s: unknown) { return req('/subscribers', jsonReq(token, s, 'POST')) }
export async function apiSubUpdate(token: string, id: string, patch: unknown) { return req(`/subscribers/${id}`, jsonReq(token, patch, 'PATCH')) }
export async function apiSubDelete(token: string, id: string) { return req(`/subscribers/${id}`, jsonReq(token, {}, 'DELETE')) }
export async function apiStats(token: string) { return req('/stats', auth(token)) }
export async function apiBulkInvoices(token: string) { return req('/bulk-invoices', jsonReq(token, {}, 'POST')) }
export async function apiLookup(token: string, ids: string[]) { return req(`/lookup?ids=${ids.join(',')}`, auth(token)) }
export async function apiMyJobs(token: string) { return req('/my-jobs', auth(token)) }
export async function apiJobUpdate(token: string, id: string, patch: unknown) { return req(`/jobs/${id}`, jsonReq(token, patch, 'PATCH')) }

export interface PortalResult { ok: boolean; token?: string; error?: string }
export async function apiPortalLogin(username: string): Promise<PortalResult> {
  try {
    const r = await fetch(`${BASE}/portal-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, error: d.error ?? `HTTP ${r.status}` }
    return { ok: true, token: d.token }
  } catch { return { ok: false, error: 'Unreachable' } }
}
export async function apiPortalRead(token: string) { return req('/portal-read', auth(token)) }
export async function apiPortalTransact(token: string, body: { action: 'purchase' | 'redeem'; planId?: string; promoCode?: string; voucher?: string }) {
  return req('/portal-transact', jsonReq(token, body, 'POST'))
}
