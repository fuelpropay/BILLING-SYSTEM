// Production backend: Cloudflare Pages Functions + KV (fuelpro-billing-kv)
// Routes: POST /api/login, GET|PUT /api/state, POST /api/portal-login, GET /api/portal-read, POST /api/portal-transact

interface Env {
  STATE_KV: KVNamespace
}

const enc = new TextEncoder()
async function sha256Hex(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('')
}

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlFromBytes(input: Uint8Array): string {
  let s = ''
  for (const b of input) s += String.fromCharCode(b)
  return b64url(s)
}
function fromB64url(s: string): Uint8Array {
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getSecret(kv: KVNamespace): Promise<CryptoKey> {
  let secret = await kv.get('app_secret')
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    secret = b64url(s)
    await kv.put('app_secret', secret)
  }
  return crypto.subtle.importKey('raw', fromB64url(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function makeToken(kv: KVNamespace, scope: string, sub: string): Promise<string> {
  const payload = { scope, sub, exp: Date.now() + 12 * 3600 * 1000 }
  const key = await getSecret(kv)
  const body = b64url(JSON.stringify(payload))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)))
  return `${body}.${b64urlFromBytes(sig)}`
}

async function verifyToken(kv: KVNamespace, token: string): Promise<{ scope: string; sub: string } | null> {
  try {
    const [body, sig] = token.split('.')
    const key = await getSecret(kv)
    const ok = await crypto.subtle.verify('HMAC', key, fromB64url(sig), enc.encode(body))
    if (!ok) return null
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const kv = env.STATE_KV

  // --- admin auth ---
  if (path === '/login' && request.method === 'POST') {
    const body = await request.json<any>().catch(() => ({}))
    const { username = '', password = '' } = body as { username?: string; password?: string }
    const hash = await sha256Hex(password)
    const raw = (await kv.get('db', 'json')) as any
    const users = raw?.users ?? []
    const match = (users as any[]).find((u: any) => u.active && u.passwordHash ? u.username.toUpperCase() === username.trim().toUpperCase() && u.passwordHash === hash : false)
    if (!users.length || !(users as any[]).some((u: any) => u.passwordHash)) {
      // first boot: ADMIN/ADMIN only
      const adminHash = await sha256Hex('ADMIN')
      if (username.trim().toUpperCase() !== 'ADMIN' || hash !== adminHash) return json({ error: 'Invalid username or password' }, 401)
      return json({ data: raw, token: await makeToken(kv, 'admin', 'ADMIN') })
    }
    if (!match) return json({ error: 'Invalid username or password' }, 401)
    return json({ data: raw, token: await makeToken(kv, 'admin', match.username) })
  }

  // --- portal auth (username lookup, no password) ---
  if (path === '/portal-login' && request.method === 'POST') {
    const body = await request.json<any>().catch(() => ({}))
    const raw = (await kv.get('db', 'json')) as any
    if (!raw) return json({ error: 'No data' }, 404)
    const sub = (raw.subscribers as any[]).find((s: any) => s.username.toUpperCase() === (body.username ?? '').trim().toUpperCase())
    if (!sub) return json({ error: 'Subscriber not found' }, 404)
    return json({ token: await makeToken(kv, 'portal', sub.id) })
  }

  // --- portal scoped payload ---
  if (path === '/portal-read' && request.method === 'GET') {
    const t = await verifyToken(kv, (request.headers.get('authorization') || '').replace('Bearer ', ''))
    if (!t || t.scope !== 'portal') return json({ error: 'Unauthorized' }, 401)
    const raw = (await kv.get('db', 'json')) as any
    if (!raw) return json({ error: 'No data' }, 404)
    const sub = (raw.subscribers as any[]).find((s: any) => s.id === t.sub)
    if (!sub) return json({ error: 'Not found' }, 404)
    return json({
      subscriber: sub,
      plans: (raw.plans ?? []).filter((p: any) => p.serviceType === sub.serviceType),
      invoices: (raw.invoices ?? []).filter((i: any) => i.subscriberId === sub.id),
      payments: (raw.payments ?? []).filter((p: any) => p.subscriberId === sub.id),
      vouchers: (raw.vouchers ?? []).filter((v: any) => v.status === 'unused'),
      devices: (raw.devices ?? []).filter((d: any) => d.subscriberId === sub.id),
      settings: (() => {
        const s = raw.settings ?? {}
        return { company: s.company, paybill: s.paybill, supportPhone: s.supportPhone, portalTitle: s.portalTitle, portalWelcome: s.portalWelcome, portalColor: s.portalColor, portalAd: s.portalAd, portalAllowVoucher: s.portalAllowVoucher, portalAllowTopup: s.portalAllowTopup }
      })(),
    })
  }

  // --- portal transactions (purchase or redeem) ---
  if (path === '/portal-transact' && request.method === 'POST') {
    const t = await verifyToken(kv, (request.headers.get('authorization') || '').replace('Bearer ', ''))
    if (!t || t.scope !== 'portal') return json({ error: 'Unauthorized' }, 401)
    const body = await request.json<any>().catch(() => ({}))
    const raw = (await kv.get('db', 'json')) as any
    if (!raw) return json({ error: 'No data' }, 404)
    const sub = (raw.subscribers as any[]).find((s: any) => s.id === t.sub)
    if (!sub) return json({ error: 'Not found' }, 404)
    const now = new Date().toISOString()
    const nextId = () => (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    let plan: any
    let total = 0
    let method: string
    let promoUsed: string | undefined
    if (body.action === 'purchase') {
      plan = (raw.plans as any[]).find((p: any) => p.id === body.planId)
      if (!plan) return json({ error: 'Plan not found' }, 400)
      total = plan.price
      method = 'mpesa'
      if (body.promoCode) {
        const promo = (raw.promos as any[]).find((p: any) => p.code?.toUpperCase() === body.promoCode.toUpperCase() && p.active)
        if (promo && new Date(promo.validTo) > new Date() && (promo.usedCount ?? 0) < promo.maxUses && (!promo.planId || promo.planId === plan.id)) {
          promoUsed = promo.code
          total = Math.max(0, promo.kind === 'percent' ? Math.round(total * (1 - promo.value / 100)) : total - promo.value)
          promo.usedCount = (promo.usedCount ?? 0) + 1
        }
      }
    } else if (body.action === 'redeem') {
      const voucher = (raw.vouchers as any[]).find((v: any) => v.code?.toUpperCase() === body.voucher?.toUpperCase() && v.status === 'unused')
      if (!voucher) return json({ error: 'Invalid voucher' }, 400)
      voucher.status = 'used'
      voucher.usedBy = sub.name
      plan = (raw.plans as any[]).find((p: any) => p.id === voucher.planId)
      method = 'voucher'
      total = plan?.price ?? 0
    } else {
      return json({ error: 'Bad action' }, 400)
    }
    const invoice = { id: nextId(), number: `INV-${Math.floor(90000 + Math.random() * 9999)}`, subscriberId: sub.id, amount: total, paidAmount: total, status: 'paid', issuedAt: now, dueAt: now, note: promoUsed ? `Promo ${promoUsed}` : '' }
    const payment = { id: nextId(), receipt: `RCPT-${Math.floor(90000 + Math.random() * 9999)}`, invoiceId: invoice.id, subscriberId: sub.id, amount: total, method, reference: method === 'voucher' ? body.voucher : (body.promoCode ?? 'MPESA'), createdAt: now }
    raw.invoices = [invoice, ...(raw.invoices ?? [])]
    raw.payments = [payment, ...(raw.payments ?? [])]
    const days = plan?.validityDays ?? 30
    const base = Date.now() > Date.parse(sub.expiresAt) ? Date.now() : Date.parse(sub.expiresAt)
    sub.expiresAt = new Date(base + days * 86400000).toISOString()
    sub.balance = 0
    sub.status = 'active'
    sub.planId = plan?.id ?? sub.planId
    await kv.put('db', JSON.stringify(raw))
    return json({ invoice, payment, subscriber: sub })
  }

  // --- admin whole-doc state ---
  if (path === '/state') {
    const t = await verifyToken(kv, (request.headers.get('authorization') || '').replace('Bearer ', ''))
    if (!t || t.scope !== 'admin') return json({ error: 'Unauthorized' }, 401)
    if (request.method === 'GET') {
      const raw = await kv.get('db')
      if (!raw) return json({}, 404)
      return new Response(raw, { headers: { 'content-type': 'application/json' } })
    }
    if (request.method === 'PUT') {
      await kv.put('db', await request.text())
      return json({ ok: true })
    }
  }

  return json({ error: 'Not found' }, 404)
}
