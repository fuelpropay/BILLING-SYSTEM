import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, fmtMoney, fmtDate, fmtDateTime, uid } from '../store'
import { Badge, statusColor } from '../components/ui'

const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

export default function Portal() {
  const { db, update, log } = useStore()
  const s = db.settings
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [subId, setSubId] = useState<string | null>(null)
  const [voucher, setVoucher] = useState('')
  const [planId, setPlanId] = useState('')
  const [promo, setPromo] = useState('')

  const sub = useMemo(() => db.subscribers.find(x => x.id === subId) ?? null, [db.subscribers, subId])
  const plan = sub ? db.plans.find(p => p.id === sub.planId) : null
  const myDevices = sub ? db.devices.filter(d => d.subscriberId === sub.id) : []
  const myPayments = sub ? db.payments.filter(p => p.subscriberId === sub.id).slice(0, 8) : []
  const myInvoices = sub ? db.invoices.filter(i => i.subscriberId === sub.id).slice(0, 6) : []
  const usedMB = myDevices.reduce((a, d) => a + d.dataDownMB + d.dataUpMB, 0)

  const promoMatch = db.promos.find(p =>
    p.code.toUpperCase() === promo.trim().toUpperCase() && p.active &&
    new Date(p.validTo) > new Date() && p.usedCount < p.maxUses &&
    (!p.planId || p.planId === planId)
  )

  const selectedPlan = db.plans.find(p => p.id === planId)
  const price = selectedPlan
    ? promoMatch
      ? Math.max(0, promoMatch.kind === 'percent' ? Math.round(selectedPlan.price * (1 - promoMatch.value / 100)) : selectedPlan.price - promoMatch.value)
      : selectedPlan.price
    : 0

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    const found = db.subscribers.find(x => x.username.toLowerCase() === username.trim().toLowerCase() || x.phone.replace(/\s/g, '') === username.trim().replace(/\s/g, ''))
    if (!found) { setErr('Account not found. Check your username or phone number.'); return }
    setErr('')
    setSubId(found.id)
    setPlanId(found.planId)
    log('login', 'portal', `Customer portal sign-in: ${found.name}`)
  }

  const redeemVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const v = db.vouchers.find(x => x.code.toUpperCase() === voucher.trim().toUpperCase())
    if (!v) { setErr('Voucher code not found.'); return }
    if (v.status !== 'unused') { setErr(`This voucher is already ${v.status}.`); return }
    const vPlan = db.plans.find(p => p.id === v.planId)
    update(d => ({
      ...d,
      vouchers: d.vouchers.map(x => x.id === v.id ? { ...x, status: 'used' as const, usedBy: sub?.name ?? 'portal' } : x),
      subscribers: d.subscribers.map(x => x.id === subId
        ? { ...x, status: 'active' as const, planId: v.planId, expiresAt: new Date(Date.now() + (vPlan?.validityDays ?? 1) * 86400000).toISOString() }
        : x),
      payments: [{ id: uid(), receipt: `RCPT-${Math.floor(90000 + Math.random() * 9999)}`, subscriberId: subId!, invoiceId: null, amount: vPlan?.price ?? 0, method: 'voucher' as const, reference: v.code, createdAt: new Date().toISOString() }, ...d.payments],
    }))
    log('update', 'portal', `Voucher ${v.code} redeemed via portal by ${sub?.name}`)
    setErr('')
    setVoucher('')
    setMsg(`Activated on ${vPlan?.name}. Enjoy!`)
  }

  const buyPlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan || !subId) return
    setMsg('')
    update(d => ({
      ...d,
      subscribers: d.subscribers.map(x => x.id === subId
        ? { ...x, status: 'active' as const, planId, expiresAt: new Date(Date.now() + selectedPlan.validityDays * 86400000).toISOString() }
        : x),
      payments: [{ id: uid(), receipt: `RCPT-${Math.floor(90000 + Math.random() * 9999)}`, subscriberId: subId, invoiceId: null, amount: price, method: 'mpesa' as const, reference: `QK${Math.random().toString(36).slice(2, 10).toUpperCase()}`, createdAt: new Date().toISOString() }, ...d.payments],
      promos: promoMatch ? d.promos.map(p => p.id === promoMatch.id ? { ...p, usedCount: p.usedCount + 1 } : p) : d.promos,
      sms: [{ id: uid(), to: sub?.phone ?? '', message: `Payment of ${fmtMoney(price)} received. You are now on ${selectedPlan.name} until ${fmtDate(new Date(Date.now() + selectedPlan.validityDays * 86400000).toISOString())}.`, status: 'sent' as const, kind: 'payment' as const, createdAt: new Date().toISOString() }, ...d.sms],
    }))
    log('create', 'portal', `Plan purchase via portal: ${sub?.name} → ${selectedPlan.name} (${fmtMoney(price)})${promoMatch ? ` with promo ${promoMatch.code}` : ''}`)
    setPromo('')
    setMsg(`Payment of ${fmtMoney(price)} confirmed via M-Pesa. You are now on ${selectedPlan.name}.`)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1220]">
      <header className="h-14 flex items-center justify-between px-4 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold" style={{ background: s.portalColor }}>F</div>
          <span className="font-bold text-slate-900 dark:text-white">{s.portalTitle}</span>
        </div>
        <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-brand-500">Staff sign in →</Link>
      </header>

      {!sub ? (
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="card p-8">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white font-extrabold text-xl" style={{ background: s.portalColor }}>F</div>
            <h1 className="mt-4 text-xl font-extrabold text-center text-slate-900 dark:text-white">{s.portalTitle}</h1>
            <p className="mt-1 text-sm text-center text-slate-500 dark:text-slate-400">{s.portalWelcome}</p>
            <form onSubmit={signIn} className="mt-6 space-y-4">
              {err && <div className="text-sm rounded-lg px-3 py-2 border text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20">{err}</div>}
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username or phone number" required />
              <button className="btn-primary w-full">View my account</button>
              <p className="text-[11px] text-center text-slate-400">Demo: try username <code className="font-mono font-bold">jamesmw100</code></p>
            </form>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
          {msg && <div className="text-sm rounded-lg px-4 py-3 border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">{msg}</div>}
          {err && <div className="text-sm rounded-lg px-4 py-3 border text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20">{err}</div>}

          <div className="card p-6 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{sub.name}</h2>
                <Badge color={statusColor(sub.status)}>{sub.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{plan?.name} · {sub.serviceType.toUpperCase()} · expires {fmtDate(sub.expiresAt)}</p>
            </div>
            <button className="btn-ghost !text-xs" onClick={() => { setSubId(null); setMsg(''); setErr('') }}>Sign out</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Balance due</div><div className={`text-xl font-extrabold mt-1 ${sub.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmtMoney(sub.balance)}</div></div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Data used</div><div className="text-xl font-extrabold mt-1 text-brand-500">{fmtMB(usedMB)}</div>{plan && plan.dataLimitGB > 0 && <div className="text-[10px] text-slate-400 mt-0.5">of {plan.dataLimitGB} GB</div>}</div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Speed</div><div className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">{plan?.speedMbps} Mbps</div></div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">My devices</div><div className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">{myDevices.length}</div><div className="text-[10px] text-slate-400 mt-0.5">{myDevices.filter(d => d.blocked).length} blocked</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {s.portalAllowTopup && (
              <div className="card p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Buy a package</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Pay instantly via M-Pesa to Paybill {s.mpesaPaybill}</p>
                <form onSubmit={buyPlan} className="space-y-3">
                  <select className="input" value={planId} onChange={e => setPlanId(e.target.value)}>
                    {db.plans.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)} / {p.validityDays}d</option>)}
                  </select>
                  <input className="input font-mono uppercase" value={promo} onChange={e => setPromo(e.target.value)} placeholder="Promo code (optional)" />
                  {promo.trim() && (
                    <div className={`text-xs font-semibold ${promoMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {promoMatch ? `Promo applied: ${promoMatch.kind === 'percent' ? promoMatch.value + '% off' : fmtMoney(promoMatch.value) + ' off'}` : 'Invalid, expired or inapplicable promo code'}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total {promoMatch && selectedPlan && <s className="text-xs mr-1">{fmtMoney(selectedPlan.price)}</s>}</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">{fmtMoney(price)}</span>
                  </div>
                  <button className="btn-primary w-full">Pay {fmtMoney(price)} via M-Pesa</button>
                </form>
              </div>
            )}

            {s.portalAllowVoucher && (
              <div className="card p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Redeem a voucher</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter your prepaid voucher code to activate instantly</p>
                <form onSubmit={redeemVoucher} className="space-y-3">
                  <input className="input font-mono uppercase" value={voucher} onChange={e => setVoucher(e.target.value)} placeholder="XXXX-XXXX" required />
                  <button className="btn-primary w-full">Redeem voucher</button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">My devices</h4>
                  {myDevices.length === 0 && <p className="text-xs text-slate-400">No devices bound to this account.</p>}
                  <div className="space-y-1.5">
                    {myDevices.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{d.label} <span className="font-mono text-[10px] text-slate-400">{d.mac}</span></span>
                        <Badge color={d.blocked ? 'red' : 'green'}>{d.blocked ? 'blocked' : 'allowed'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Payment history</h3>
              {myPayments.length === 0 && <p className="text-xs text-slate-400">No payments yet.</p>}
              <div className="space-y-2">
                {myPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div><span className="font-mono font-bold">{p.receipt}</span> <span className="text-slate-400">· {p.method.toUpperCase()}</span></div>
                    <div className="text-right"><div className="font-semibold">{fmtMoney(p.amount)}</div><div className="text-[10px] text-slate-400">{fmtDateTime(p.createdAt)}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Invoices</h3>
              {myInvoices.length === 0 && <p className="text-xs text-slate-400">No invoices yet.</p>}
              <div className="space-y-2">
                {myInvoices.map(i => (
                  <div key={i.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold">{i.number}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmtMoney(i.amount)}</span>
                      <Badge color={statusColor(i.status)}>{i.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-400">
                Need help? {s.supportEmail} · {s.supportPhone}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
