// FuelPro Billing — production API (Cloudflare Pages Functions + KV)
// Roles: admin, manager, agent (state), technician (jobs only), subscriber (portal scope)
interface Env { STATE_KV: KVNamespace }

const te = new TextEncoder()
const td = new TextDecoder()
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors } })

async function sha256(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(text)))
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('')
}
const b64url = (d: ArrayBuffer | string) => {
  const bin = typeof d === 'string' ? d : String.fromCharCode(...new Uint8Array(d))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
interface Claims { scope: string; sub: string; exp: number; name?: string }
async function sign(c: Claims, secret: string): Promise<string> {
  const payload = b64url(JSON.stringify(c))
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return `${payload}.${b64url(await crypto.subtle.sign('HMAC', key, te.encode(payload)))}`
}
async function verify(token: string, secret: string): Promise<Claims | null> {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  const check = b64url(await crypto.subtle.sign('HMAC', key, te.encode(payload)))
  if (check !== sig) return null
  try {
    const c = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Claims
    return c.exp > Date.now() ? c : null
  } catch { return null }
}

const tokenAuth = async (kv: KVNamespace, request: Request): Promise<Claims | null> =>
  verify((request.headers.get('authorization') || '').replace('Bearer ', ''), (await kv.get('db', 'text')) ?? '')

const STAFF = ['admin', 'manager', 'agent']

// Subscriber scale layer: per-sub keys subs:data:{id}, ordered index subs:idx, counters subs:stats, username map subs:uname
async function subRead(kv: KVNamespace, id: string) { return kv.get(`subs:data:${id}`, 'json') }
async function subWrite(kv: KVNamespace, sub: any, old?: any) {
  const [idx, stats, uname] = await Promise.all([
    kv.get('subs:idx', 'json'), kv.get('subs:stats', 'json'), kv.get('subs:uname', 'json'),
  ]) as any[]
  const st = stats ?? { total: 0, active: 0, suspended: 0, 'new': 0, byPlan: {}, byRouter: {}, referrals: {} }
  const map = uname ?? {}
  const exists = (idx?.ids ?? []).includes(sub.id)
  const oldRec = old ?? null
  if (!exists) {
    st.total = (st.total ?? 0) + 1
    st[sub.status] = (st[sub.status] ?? 0) + 1
    st.byPlan[sub.planId] = (st.byPlan[sub.planId] ?? 0) + 1
    st.byRouter[sub.routerId] = (st.byRouter[sub.routerId] ?? 0) + 1
    if (sub.referredBy) st.referrals[sub.referredBy] = (st.referrals[sub.referredBy] ?? 0) + 1
    idx.ids = [sub.id, ...(idx?.ids ?? [])]
  } else if (oldRec) {
    if (oldRec.status !== sub.status) {
      st[oldRec.status] = Math.max(0, (st[oldRec.status] ?? 0) - 1)
      st[sub.status] = (st[sub.status] ?? 0) + 1
    }
    if (oldRec.planId !== sub.planId) {
      st.byPlan[oldRec.planId] = Math.max(0, (st.byPlan[oldRec.planId] ?? 0) - 1)
      st.byPlan[sub.planId] = (st.byPlan[sub.planId] ?? 0) + 1
    }
    if (oldRec.routerId !== sub.routerId) {
      st.byRouter[oldRec.routerId] = Math.max(0, (st.byRouter[oldRec.routerId] ?? 0) - 1)
      st.byRouter[sub.routerId] = (st.byRouter[sub.routerId] ?? 0) + 1
    }
    if (oldRec.referredBy !== sub.referredBy) {
      if (oldRec.referredBy) st.referrals[oldRec.referredBy] = Math.max(0, (st.referrals[oldRec.referredBy] ?? 1) - 1)
      if (sub.referredBy) st.referrals[sub.referredBy] = (st.referrals[sub.referredBy] ?? 0) + 1
    }
  }
  if (sub.username) map[sub.username.toLowerCase()] = sub.id
  if (sub.phone) map[sub.phone] = sub.id
  await Promise.all([
    kv.put(`subs:data:${sub.id}`, JSON.stringify(sub)),
    kv.put('subs:idx', JSON.stringify(idx ?? { ids: [] })),
    kv.put('subs:stats', JSON.stringify(st)),
    kv.put('subs:uname', JSON.stringify(map)),
  ])
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
  const { request, env } = context
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const kv = env.STATE_KV
  const secret = (await kv.get('db', 'text')) ?? ''
  const claims = await tokenAuth(kv, request)

  // ---- auth ----
  if (path === '/login' && request.method === 'POST') {
    const { username, password } = await request.json().catch(() => ({})) as { username?: string; password?: string }
    const db = (await kv.get('db', 'json')) as any
    const users = db?.users ?? []
    const user = users.find((u: any) => u.username?.toUpperCase() === (username ?? '').trim().toUpperCase())
    if (!user || !user.active) return json({ error: 'Invalid username or password' }, 401)
    if (user.passwordHash && (await sha256(password ?? '')) !== user.passwordHash) return json({ error: 'Invalid username or password' }, 401)
    const token = await sign({ scope: user.role ?? 'admin', sub: user.username, name: user.name, exp: Date.now() + 8 * 3600e3 }, secret)
    return json({ token, role: user.role ?? 'admin', name: user.name })
  }

  // ---- subscriber portal ----
  if (path === '/portal-login' && request.method === 'POST') {
    const { username } = await request.json().catch(() => ({})) as { username?: string }
    const uname = (await kv.get('subs:uname', 'json')) as any
    const id = uname?.[(username ?? '').trim().toLowerCase()] ?? uname?.[(username ?? '').trim()]
    const sub = id ? await subRead(kv, id) as any : null
    if (!sub) return json({ error: 'Account not found' }, 404)
    const token = await sign({ scope: `sub:${sub.id}`, sub: sub.username, exp: Date.now() + 30 * 86400000 }, secret)
    return json({ token })
  }

  if (path === '/portal-read' && request.method === 'GET') {
    if (!claims?.scope.startsWith('sub:')) return json({ error: 'Unauthorized' }, 401)
    const sub = await subRead(kv, claims.scope.slice(4)) as any
    const db = (await kv.get('db', 'json')) as any
    if (!sub) return json({ error: 'Not found' }, 404)
    return json({
      subscriber: sub,
      plans: db?.plans ?? [],
      invoices: (db?.invoices ?? []).filter((i: any) => i.subscriberId === sub.id).slice(0, 20),
      payments: (db?.payments ?? []).filter((p: any) => p.subscriberId === sub.id).slice(0, 20),
      vouchers: (db?.vouchers ?? []).filter((v: any) => v.usedBy === sub.name),
      devices: (db?.devices ?? []).filter((d: any) => d.subscriberId === sub.id),
      settings: db?.settings ?? {},
    })
  }

  if (path === '/portal-transact' && request.method === 'POST') {
    if (!claims?.scope.startsWith('sub:')) return json({ error: 'Unauthorized' }, 401)
    const body = await request.json().catch(() => ({})) as any
    const db = (await kv.get('db', 'json')) as any
    const sub = await subRead(kv, claims.scope.slice(4)) as any
    if (!db || !sub) return json({ error: 'Not found' }, 404)
    const now = new Date().toISOString()
    const uid = () => (crypto as any).randomUUID()
    let plan: any, total = 0, method: string, promoUsed: string | undefined
    if (body.action === 'purchase') {
      plan = (db.plans ?? []).find((p: any) => p.id === body.planId)
      if (!plan) return json({ error: 'Plan not found' }, 400)
      total = plan.price; method = 'mpesa'
      if (body.promoCode) {
        const promo = (db.promos ?? []).find((p: any) => p.code?.toUpperCase() === body.promoCode.toUpperCase() && p.active)
        if (promo && new Date(promo.validTo) > new Date() && (promo.usedCount ?? 0) < promo.maxUses && (!promo.planId || promo.planId === plan.id)) {
          promoUsed = promo.code
          total = Math.max(0, promo.kind === 'percent' ? Math.round(total * (1 - promo.value / 100)) : total - promo.value)
          promo.usedCount = (promo.usedCount ?? 0) + 1
        }
      }
    } else if (body.action === 'redeem') {
      const voucher = (db.vouchers ?? []).find((v: any) => v.code?.toUpperCase() === body.voucher?.toUpperCase() && v.status === 'unused')
      if (!voucher) return json({ error: 'Invalid voucher' }, 400)
      voucher.status = 'used'; voucher.usedBy = sub.name
      plan = (db.plans ?? []).find((p: any) => p.id === voucher.planId)
      method = 'voucher'; total = plan?.price ?? 0
      if (plan && !body.action) { /* noop */ }
    } else return json({ error: 'Bad action' }, 400)
    const invoice = { id: uid(), number: `INV-${Math.floor(90000 + Math.random() * 9999)}`, subscriberId: sub.id, amount: total, paidAmount: total, status: 'paid', issuedAt: now, dueAt: now, note: promoUsed ? `Promo ${promoUsed}` : '' }
    const payment = { id: uid(), receipt: `RCPT-${Math.floor(90000 + Math.random() * 9999)}`, invoiceId: invoice.id, subscriberId: sub.id, amount: total, method: method!, reference: method === 'voucher' ? body.voucher : body.promoCode ?? 'MPESA', createdAt: now }
    db.invoices = [invoice, ...(db.invoices ?? [])].slice(0, 4000)
    db.payments = [payment, ...(db.payments ?? [])].slice(0, 4000)
    const days = plan?.validityDays ?? 30
    const base = Date.parse(sub.expiresAt) > Date.now() ? Date.parse(sub.expiresAt) : Date.now()
    const oldRec = { ...sub }
    sub.expiresAt = new Date(base + days * 86400000).toISOString()
    sub.balance = 0; sub.status = 'active'
    if (plan?.id) sub.planId = plan.id
    await subWrite(kv, sub, oldRec)
    await kv.put('db', JSON.stringify(db))
    return json({ invoice, payment, subscriber: sub })
  }

  // ---- subscriber bulk/pagination/stats (staff) ----
  if (path === '/subscribers') {
    if (!claims || !STAFF.concat('technician').includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    if (request.method === 'GET') {
      const idx = (await kv.get('subs:idx', 'json')) as any
      const stats = (await kv.get('subs:stats', 'json')) as any
      const q = url.searchParams.get('q')?.toLowerCase() ?? ''
      const status = url.searchParams.get('status') ?? ''
      const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
      const size = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') ?? '50')))
      let ids = idx?.ids ?? []
      if (q) {
        // reuse the uname map to search by username/phone without per-key reads
        const uname = (await kv.get('subs:uname', 'json')) as any ?? {}
        const hitIds = Object.keys(uname).filter(k => k.toLowerCase().includes(q)).map(k => uname[k])
        ids = ids.filter((id: string) => hitIds.includes(id))
      }
      const filtered: string[] = []
      let total = q ? ids.length : (stats?.total ?? ids.length)
      if (status) {
        total = stats?.[status] ?? 0
        let scanned: string[] = []
        // stop once we have the full page
        for (const id of ids) {
          const s = await subRead(kv, id) as any
          if (s?.status === status) scanned.push(id)
          if (scanned.length >= page * size) break
        }
        filtered.push(...scanned)
      } else filtered.push(...ids)
      const start = (page - 1) * size
      const items: any[] = []
      for (const id of filtered.slice(start, start + size)) items.push(await subRead(kv, id))
      return json({ items, total, page, pageSize: size, stats })
    }
    if (request.method === 'POST') {
      if (!STAFF.includes(claims.scope)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json().catch(() => ({})) as any
      const s = { ...body, id: body.id ?? (crypto as any).randomUUID(), createdAt: body.createdAt ?? new Date().toISOString() }
      await subWrite(kv, s, null)
      return json(s, 201)
    }
  }
  if (path.startsWith('/subscribers/')) {
    if (!claims || !STAFF.concat('technician').includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    const id = path.split('/subscribers/')[1]
    const sub = (await subRead(kv, id)) as any
    if (request.method === 'GET') return sub ? json(sub) : json({ error: 'Not found' }, 404)
    if (request.method === 'PATCH') {
      if (!STAFF.includes(claims.scope)) return json({ error: 'Forbidden' }, 403)
      if (!sub) return json({ error: 'Not found' }, 404)
      const patch = await request.json().catch(() => ({})) as any
      const updated = { ...sub, ...patch, id: sub.id, username: sub.username }
      await subWrite(kv, updated, sub)
      return json(updated)
    }
    if (request.method === 'DELETE') {
      if (claims.scope !== 'admin' && claims.scope !== 'manager') return json({ error: 'Forbidden' }, 403)
      const [idx, stats, uname] = await Promise.all([kv.get('subs:idx', 'json'), kv.get('subs:stats', 'json'), kv.get('subs:uname', 'json')]) as any[]
      if (idx?.ids) {
        idx.ids = idx.ids.filter((x: string) => x !== id)
        if (stats?.total) {
          stats.total--
          if (sub?.status) stats[sub.status] = Math.max(0, (stats[sub.status] ?? 1) - 1)
          if (sub?.planId) stats.byPlan[sub.planId] = Math.max(0, (stats.byPlan[sub.planId] ?? 1) - 1)
          if (sub?.routerId) stats.byRouter[sub.routerId] = Math.max(0, (stats.byRouter[sub.routerId] ?? 1) - 1)
          if (sub?.referredBy) stats.referrals[sub.referredBy] = Math.max(0, (stats.referrals[sub.referredBy] ?? 1) - 1)
        }
        if (sub?.username && uname) delete uname[sub.username.toLowerCase()]
        if (sub?.phone && uname) delete uname[sub.phone]
        await Promise.all([kv.put('subs:idx', JSON.stringify(idx)), kv.put('subs:stats', JSON.stringify(stats)), kv.put('subs:uname', JSON.stringify(uname ?? {})), kv.delete(`subs:data:${id}`)])
      }
      return json({ ok: true })
    }
  }

  if (path === '/stats' && request.method === 'GET') {
    if (!claims || !STAFF.includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    const stats = (await kv.get('subs:stats', 'json')) as any
    const db = (await kv.get('db', 'json')) as any
    return json({ subscribers: stats ?? {}, plans: db?.plans ?? [], routerCount: (db?.routers ?? []).length })
  }

  if (path === '/lookup' && request.method === 'GET') {
    if (!claims || !STAFF.includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 100)
    const out: Record<string, string> = {}
    await Promise.all(ids.map(async id => { const s = await subRead(kv, id) as any; out[id] = s?.name ?? '' }))
    return json(out)
  }

  // ---- whole-doc state (small collections; staff) ----
  if (path === '/state') {
    if (!claims || !STAFF.includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    if (request.method === 'GET') {
      const db = (await kv.get('db', 'json')) as any
      return json(db ?? {})
    }
    if (!STAFF.concat('technician').length) return json({ error: 'Forbidden' }, 403)
    if (request.method === 'PUT') {
      const db = await request.json().catch(() => null) as any
      if (!db) return json({ error: 'Bad JSON' }, 400)
      delete db.__seedCounter
      await kv.put('db', JSON.stringify(db))
      return json({ ok: true })
    }
  }

  // ---- bulk invoices — paginated server-side generation (staff). Pass start/count; loop client-side. ----
  if (path === '/bulk-invoices' && request.method === 'POST') {
    if (!claims || !STAFF.includes(claims.scope)) return json({ error: 'Unauthorized' }, 401)
    const { start = 0, count = 100 } = await request.json().catch(() => ({})) as any
    const idx = (await kv.get('subs:idx', 'json')) as any
    const ids = (idx?.ids ?? []).slice(start, start + Math.min(150, count))
    const db = (await kv.get('db', 'json')) as any
    let added = 0
    let base = 2400 + (db?.invoices?.length ?? 0)
    const invoices: any[] = [...(db?.invoices ?? [])]
    for (const id of ids) {
      const s = await subRead(kv, id) as any
      if (!s || s.serviceType !== 'pppoe' || s.status === 'expired') continue
      const plan = (db?.plans ?? []).find((p: any) => p.id === s.planId)
      invoices.unshift({
        id: (crypto as any).randomUUID(),
        number: `INV-${++base}`,
        subscriberId: s.id, amount: plan?.price ?? 0, paidAmount: 0, status: 'unpaid',
        issuedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        note: `Monthly subscription - ${plan?.name ?? 'Plan'}`,
      })
      added++
    }
    db.invoices = invoices.slice(0, 5000)
    await kv.put('db', JSON.stringify(db))
    return json({ added, next: start + ids.length, done: start + ids.length >= (idx?.ids ?? []).length })
  }

  // ---- technician field jobs (technician scope) ----
  if (path === '/my-jobs' && request.method === 'GET') {
    if (!claims) return json({ error: 'Unauthorized' }, 401)
    const db = (await kv.get('db', 'json')) as any
    const mine = (db?.fieldJobs ?? []).filter((j: any) => j.assignee === claims.name || j.assignee === claims.sub || j.assignee === (j.assignedTo ?? ''))
    return json({ jobs: mine })
  }
  if (path.startsWith('/jobs/') && request.method === 'PATCH') {
    if (!claims) return json({ error: 'Unauthorized' }, 401)
    const id = path.split('/jobs/')[1]
    const db = (await kv.get('db', 'json')) as any
    const patch = await request.json().catch(() => ({})) as any
    (db.fieldJobs ?? []).forEach((j: any) => { if (j.id === id) { j.status = patch.status ?? j.status; if (patch.notes) j.notes = patch.notes } })
    await kv.put('db', JSON.stringify(db))
    return json({ ok: true })
  }

  // ---- bulk subscriber seed (admin only) ----
  if (path === '/bulk-seed' && request.method === 'POST') {
    if (!claims || claims.scope !== 'admin') return json({ error: 'Unauthorized', scope: claims?.scope }, 401)
    const { count = 1, reset = true, start = 1000 } = await request.json().catch(() => ({})) as any
    const db = (await kv.get('db', 'json')) as any
    const plans = db?.plans ?? []
    const routers = db?.routers ?? []
    if (!plans.length || !routers.length) return json({ error: 'Seed plans/routers first' }, 400)
    const idx = (await kv.get('subs:idx', 'json')) as any ?? { ids: [] }
    const unameMap: Record<string, string> = reset ? {} : ((await kv.get('subs:uname', 'json')) ?? {}) as any
    const stats: any = reset
      ? { total: 0, active: 0, suspended: 0, 'new': 0, byPlan: {} as Record<string, number>, byRouter: {} as Record<string, number>, referrals: {} as Record<string, number> }
      : ((await kv.get('subs:stats', 'json')) as any ?? { total: 0, active: 0, suspended: 0, 'new': 0, byPlan: {} as Record<string, number>, byRouter: {} as Record<string, number>, referrals: {} as Record<string, number> })
    if (reset) idx.ids = []
    const firstNames = ['Ahmed','Grace','Jane','Peter','Mary','David','Esther','George','Caroline','Mercy','Dennis','Lucy','Faith','Samuel','Paul','Daniel','Ann','Brian','Joy','Kevin','Sarah','Eric','Naomi','Victor','Ruth','Collins','Beatrice','Felix','Olivia','Winnie','Harun','Tabitha','Irene','Stephen','Rose','Moses','Diana','Nelson','Veronica','Anthony','Brenda','Patrick','Lucia','Ronald','Wilkista','James','John']
    const lastNames = ['Mwangi','Karanja','Wanjiru','Otieno','Kiprop','Mutua','Nyakundi','Owuor','Kabiru','Njoroge','Kimani','Wambui','Achieng','Odhiambo','Kilonzo','Barasa','Cheekoi','Naliaka','Simiyu','Wafula','Omondi','Kibet','Juma','Mburu','Chesang','Kamau','Maina','Okoth','Mutiso']
    const now = Date.now()

    const puts: Promise<unknown>[] = []
    for (let i = 0; i < count; i++) {
      const n = i + start
      const fn = firstNames[n % firstNames.length], ln = lastNames[(n * 7) % lastNames.length]
      const handle = `${fn}${ln}${n}`.toLowerCase().slice(0, 28)
      const plan = plans[n % plans.length]
      const status = ['active','active','active','active','suspended','suspended','new','suspended'][n % 8]
      const id = `b${n}`
      const exp = new Date(now + ((n % plan.validityDays) + 1) * 86400000)
      const macBytes = Array.from({ length: 6 }, (_, b) => ((n * 31 + b * 17 + 90) % 248 + 8).toString(16).toUpperCase().padStart(2, '0'))
      const s = {
        id, name: `${fn} ${ln}`, phone: `+2547${String(20000000 + (n * 7919) % 60000000).slice(0, 8)}`,
        email: `${handle}@mail.com`, username: handle,
        serviceType: plan.serviceType ?? 'pppoe', planId: plan.id, routerId: routers[n % routers.length]?.id ?? 'rt1',
        status, balance: status === 'suspended' ? ((n * 137) % 5000) : 0,
        mac: macBytes.join(':'), ip: `172.30.${(n >> 8) % 240}.${n % 250 + 4}`, referredBy: null,
        createdAt: new Date(now - (n % 360000) * 8640150).toISOString(),
        expiresAt: status === 'new' ? new Date(now).toISOString() : exp.toISOString(),
      }
      idx.ids.push(id)
      unameMap[handle] = id
      unameMap[s.phone] = id
      stats.total++; ;(stats as any)[status]++; stats.byPlan[plan.id] = (stats.byPlan[plan.id] ?? 0) + 1; stats.byRouter[s.routerId] = (stats.byRouter[s.routerId] ?? 0) + 1
      puts.push(kv.put(`subs:data:${id}`, JSON.stringify(s)))
      if (puts.length > 800) await Promise.all(puts.splice(0))
    }
    await Promise.all(puts)
    await Promise.all([kv.put('subs:idx', JSON.stringify(idx)), kv.put('subs:uname', JSON.stringify(unameMap)), kv.put('subs:stats', JSON.stringify(stats))])
    return json({ added: count, total: idx.ids.length })
  }

  return json({ error: 'Not found' }, 404)
  } catch (e) {
    return json({ error: 'Internal error', detail: String(e) }, 500)
  }
}
