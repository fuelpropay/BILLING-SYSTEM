import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtMoney, fmtDate, fmtDateTime } from '../store'
import { Badge, statusColor } from '../components/ui'
import { apiPortalLogin, apiPortalRead, apiPortalTransact } from '../api'
import type { BoundDevice, Invoice, Payment, Plan, Subscriber, Voucher } from '../types'

const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

interface PortalPayload {
  subscriber: Subscriber
  plans: Plan[]
  invoices: Invoice[]
  payments: Payment[]
  vouchers: Voucher[]
  devices: BoundDevice[]
  settings: Record<string, any>
}

const sessKey = 'fuelpro_portal_token'

export default function Portal() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(sessKey))
  const [payload, setPayload] = useState<PortalPayload | null>(null)
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [voucher, setVoucher] = useState('')
  const [planId, setPlanId] = useState('')
  const [promo, setPromo] = useState('')

  const refresh = (t: string) => {
    apiPortalRead(t).then(p => {
      if (!p) { sessionStorage.removeItem(sessKey); setToken(null); return }
      setPayload(p)
      setPlanId(p.subscriber.planId)
    })
  }

  useEffect(() => { if (token) refresh(token) }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const sub = payload?.subscriber ?? null
  const s = payload?.settings ?? {}

  const signOut = () => { sessionStorage.removeItem(sessKey); setToken(null); setPayload(null); setMsg(''); setErr('') }

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    apiPortalLogin(username.trim()).then(r => {
      if (!r.ok || !r.token) { setErr(r.error ?? 'Account not found.'); setBusy(false); return }
      sessionStorage.setItem(sessKey, r.token)
      setToken(r.token)
      setBusy(false)
    }).catch(() => { setErr('Service unreachable'); setBusy(false) })
  }

  const redeemVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !voucher.trim()) return
    setErr(''); setMsg(''); setBusy(true)
    apiPortalTransact(token, { action: 'redeem', voucher: voucher.trim() }).then(r => {
      setBusy(false)
      if (!r.ok) { setErr(r.error ?? 'Invalid voucher'); return }
      setMsg(`Activated on ${payload?.plans.find(p => p.id === r.subscriber?.planId)?.name ?? 'package'}. Enjoy!`)
      setVoucher('')
      refresh(token)
    })
  }

  const buyPlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !planId) return
    setErr(''); setMsg(''); setBusy(true)
    apiPortalTransact(token, { action: 'purchase', planId, promoCode: promo.trim() || undefined }).then(r => {
      setBusy(false)
      if (!r.ok) { setErr(r.error ?? 'Failed'); return }
      const plan = payload?.plans.find(p => p.id === planId)
      setMsg(`Payment confirmed. You are on ${plan?.name ?? 'plan'} until ${r.subscriber ? fmtDate(r.subscriber.expiresAt) : ''}.`)
      setPromo('')
      refresh(token)
    })
  }

  const myDevices = payload?.devices ?? []
  const usedMB = myDevices.reduce((a, d) => a + d.dataDownMB + d.dataUpMB, 0)
  const plan = sub ? payload?.plans.find(p => p.id === sub.planId) : undefined
  const selectedPlan = payload?.plans.find(p => p.id === planId)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1220]">
      <header className="h-14 flex items-center justify-between px-4 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold" style={{ background: s.portalColor ?? '#4f46e5' }}>F</div>
          <span className="font-bold text-slate-900 dark:text-white">{s.portalTitle ?? s.company ?? 'Customer Portal'}</span>
        </div>
        <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-brand-500">Staff sign in →</Link>
      </header>

      {!sub ? (
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="card p-8">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-white font-extrabold text-xl" style={{ background: s.portalColor ?? '#4f46e5' }}>F</div>
            <h1 className="mt-4 text-xl font-extrabold text-center text-slate-900 dark:text-white">{s.portalTitle ?? s.company ?? 'Customer Portal'}</h1>
            <p className="mt-1 text-sm text-center text-slate-500 dark:text-slate-400">{s.portalWelcome ?? 'Enter your account username or phone to view usage and pay online.'}</p>
            {s.portalAd && <p className="mt-2 text-xs font-semibold text-center rounded-lg px-3 py-1.5" style={{ background: `${s.portalColor}1f`, color: s.portalColor }}>{s.portalAd}</p>}
            <form onSubmit={signIn} className="mt-6 space-y-4">
              {err && <div className="text-sm rounded-lg px-3 py-2 border text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20">{err}</div>}
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username or phone number" required />
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'View my account'}</button>
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
            <button className="btn-ghost !text-xs" onClick={signOut}>Sign out</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Balance due</div><div className={`text-xl font-extrabold mt-1 ${sub.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmtMoney(sub.balance)}</div></div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Data used</div><div className="text-xl font-extrabold mt-1 text-brand-500">{fmtMB(usedMB)}</div>{plan && plan.dataLimitGB > 0 && <div className="text-[10px] text-slate-400 mt-0.5">of {plan.dataLimitGB} GB</div>}</div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Speed</div><div className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">{plan?.speedMbps} Mbps</div></div>
            <div className="card p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">My devices</div><div className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">{myDevices.length}</div><div className="text-[10px] text-slate-400 mt-0.5">{myDevices.filter(d => d.blocked).length} blocked</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {s.portalAllowTopup !== false && (
              <div className="card p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Buy a package</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Pay instantly via M-Pesa to Paybill {s.mpesaPaybill ?? s.paybill}</p>
                <form onSubmit={buyPlan} className="space-y-3">
                  <select className="input" value={planId} onChange={e => setPlanId(e.target.value)}>
                    {(payload?.plans ?? []).filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)} / {p.validityDays}d</option>)}
                  </select>
                  <input className="input font-mono uppercase" value={promo} onChange={e => setPromo(e.target.value)} placeholder="Promo code (optional)" />
                  <button className="btn-primary w-full" disabled={busy}>Pay via M-Pesa</button>
                </form>
              </div>
            )}

            {s.portalAllowVoucher !== false && (
              <div className="card p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Redeem a voucher</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter your prepaid voucher code to activate instantly</p>
                <form onSubmit={redeemVoucher} className="space-y-3">
                  <input className="input font-mono uppercase" value={voucher} onChange={e => setVoucher(e.target.value)} placeholder="XXXX-XXXX" required />
                  <button className="btn-primary w-full" disabled={busy}>Redeem voucher</button>
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
              {(payload?.payments ?? []).length === 0 && <p className="text-xs text-slate-400">No payments yet.</p>}
              <div className="space-y-2">
                {(payload?.payments ?? []).slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div><span className="font-mono font-bold">{p.receipt}</span> <span className="text-slate-400">· {p.method.toUpperCase()}</span></div>
                    <div className="text-right"><div className="font-semibold">{fmtMoney(p.amount)}</div><div className="text-[10px] text-slate-400">{fmtDateTime(p.createdAt)}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Invoices</h3>
              {(payload?.invoices ?? []).length === 0 && <p className="text-xs text-slate-400">No invoices yet.</p>}
              <div className="space-y-2">
                {(payload?.invoices ?? []).slice(0, 6).map(i => (
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
                Need help? {s.supportPhone ?? s.company ?? ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
