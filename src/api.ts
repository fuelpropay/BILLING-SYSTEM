// Remote persistence + auth via Cloudflare Pages Functions (/api) backed by Cloudflare KV.
// Canonical API origin lives on the primary Cloudflare deployment; the Vercel mirror points there too.
const BASE = 'https://fuelpro-billing.pages.dev/api'

async function req(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, init)
}

export interface LoginResult {
  ok: boolean
  token?: string
  data?: any
  error?: string
}

export async function apiLogin(username: string, password: string): Promise<LoginResult> {
  const r = await req('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
  if (!r.ok) return { ok: false, error: (await r.json().catch(() => ({}))).error || 'Login failed' }
  const body = await r.json()
  return { ok: true, token: body.token, data: body.data ?? null }
}

export async function apiGetState(token: string): Promise<any | null> {
  const r = await req('/state', { headers: { authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  return r.json().catch(() => null)
}

export async function apiPutState(token: string, db: unknown): Promise<boolean> {
  const r = await req('/state', { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(db) })
  return r.ok
}

export interface PortalToken { ok: boolean; token?: string; error?: string }
export async function apiPortalLogin(username: string): Promise<PortalToken> {
  const r = await req('/portal-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username }) })
  if (!r.ok) return { ok: false, error: (await r.json().catch(() => ({}))).error || 'Failed' }
  const body = await r.json()
  return { ok: true, token: body.token }
}

export async function apiPortalRead(token: string): Promise<any | null> {
  const r = await req('/portal-read', { headers: { authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  return r.json().catch(() => null)
}

export interface PortalTransactResult { ok: boolean; invoice?: any; payment?: any; subscriber?: any; error?: string }
export async function apiPortalTransact(token: string, payload: { action: string; planId?: string; promoCode?: string; voucher?: string }): Promise<PortalTransactResult> {
  const r = await req('/portal-transact', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
  if (!r.ok) return { ok: false, error: (await r.json().catch(() => ({}))).error || 'Failed' }
  const body = await r.json()
  return { ok: true, invoice: body.invoice, payment: body.payment, subscriber: body.subscriber }
}
