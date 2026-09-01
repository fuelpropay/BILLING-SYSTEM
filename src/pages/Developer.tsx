import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore, fmtMoney, fmtDateTime } from '../store'
import { apiDeveloperOverview, apiDeveloperUserPatch } from '../api'
import type { AuditEntry } from '../types'

interface ClientRow { id: string; name: string; username: string; role: string; phone: string | null; email: string | null; active: boolean; lastLogin: string | null }
interface Overview {
  clients: ClientRow[]
  subscribers: { total?: number; active?: number; suspended?: number; new?: number } & Record<string, unknown>
  plans: number
  routers: number
  billing: { invoices: number; invoicedTotal: number; paidTotal: number; payments: number; billingRuns: number }
  ops: { fieldJobs: { total: number; open: number }; tickets: { total: number; open: number } }
  audit: AuditEntry[]
  settings: { companyName: string; currency: string }
  generatedAt: string
}

export default function Developer() {
  const { token, role, logout } = useStore()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pwUser, setPwUser] = useState<ClientRow | null>(null)
  const [pw, setPw] = useState('')

  if (role !== 'developer') return <Navigate to="/developer-login" replace />

  const load = () => {
    if (!token) return
    setLoading(true)
    apiDeveloperOverview(token)
      .then(r => { if (r?.error) setError(r.error); else setData(r as Overview) })
      .catch(() => setError('Unreachable'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = window.setInterval(load, 30_000); return () => window.clearInterval(t) }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (c: ClientRow) => {
    if (!token) return
    apiDeveloperUserPatch(token, { id: c.id, active: !c.active }).then(load)
  }
  const resetPw = () => {
    if (!token || !pwUser || pw.length < 4) return
    apiDeveloperUserPatch(token, { id: pwUser.id, password: pw }).then(() => { setPwUser(null); setPw('') })
  }

  const stats = [
    { label: 'Subscribers', value: data?.subscribers.total ?? 0 },
    { label: 'Active', value: data?.subscribers.active ?? 0 },
    { label: 'Suspended', value: data?.subscribers.suspended ?? 0 },
    { label: 'Plans', value: data?.plans ?? 0 },
    { label: 'Routers', value: data?.routers ?? 0 },
    { label: 'Open tickets', value: data?.ops.tickets.open ?? 0 },
    { label: 'Open field jobs', value: data?.ops.fieldJobs.open ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-extrabold">&lt;/&gt;</div>
              <div>
                <h1 className="text-xl font-extrabold text-white">Developer Console</h1>
                <p className="text-xs text-slate-400">{data?.settings.companyName || 'FuelPro Billing'} · live production data</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700">Refresh</button>
            <button onClick={logout} className="text-xs px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30">Sign out</button>
          </div>
        </header>

        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">{error}</div>}
        {loading && !data && <p className="text-sm text-slate-400">Loading live data…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {stats.map(s => (
                <div key={s.label} className="rounded-xl bg-slate-900/80 border border-slate-700 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</div>
                  <div className="text-lg font-extrabold text-white mt-1">{Number(s.value).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Invoiced total</div>
                <div className="text-lg font-extrabold text-white mt-1">{fmtMoney(data.billing.invoicedTotal)}</div>
                <div className="text-xs text-slate-400 mt-1">{data.billing.invoices} invoices · {data.billing.billingRuns} bulk runs</div>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Collected</div>
                <div className="text-lg font-extrabold text-emerald-400 mt-1">{fmtMoney(data.billing.paidTotal)}</div>
                <div className="text-xs text-slate-400 mt-1">{data.billing.payments} payments</div>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Snapshot</div>
                <div className="text-xs text-slate-400 mt-1">Generated {fmtDateTime(data.generatedAt)} · auto-refresh 30s</div>
              </div>
            </div>

            <section className="rounded-xl bg-slate-900/80 border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-bold text-white text-sm">Clients (staff accounts)</h2>
                <span className="text-xs text-slate-400">{data.clients.length} accounts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-700">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Username</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Last login</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clients.map(c => (
                      <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-semibold text-white">{c.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{c.username}</td>
                        <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[11px]">{c.role}</span></td>
                        <td className="px-4 py-2.5 text-slate-400">{c.lastLogin ? fmtDateTime(c.lastLogin) : 'never'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{c.active ? 'active' : 'disabled'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-2">
                          {c.role !== 'developer' && (
                            <>
                              <button onClick={() => toggle(c)} className={`text-[11px] px-2.5 py-1 rounded-md border ${c.active ? 'border-rose-500/30 text-rose-300 hover:bg-rose-600/20' : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20'}`}>{c.active ? 'Disable' : 'Enable'}</button>
                              <button onClick={() => setPwUser(c)} className="text-[11px] px-2.5 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700">Reset password</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl bg-slate-900/80 border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="font-bold text-white text-sm">Recent activity</h2>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {data.audit.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No audit entries.</p>}
                {data.audit.map(a => (
                  <div key={a.id} className="px-4 py-2 border-b border-slate-800 flex items-baseline gap-3 text-sm">
                    <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(a.at)}</span>
                    <span className="font-semibold text-slate-200">{a.actor}</span>
                    <span className="text-slate-400">{a.action} · {a.entity}</span>
                    <span className="text-slate-500 truncate">{a.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {pwUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setPwUser(null)}>
            <div className="rounded-xl bg-slate-900 border border-slate-700 p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-white mb-1">Reset password</h3>
              <p className="text-xs text-slate-400 mb-3">{pwUser.name} ({pwUser.username})</p>
              <input className="input !bg-slate-800 !border-slate-600 !text-white" placeholder="New password (min 4 chars)" value={pw} onChange={e => setPw(e.target.value)} />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setPwUser(null)} className="text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">Cancel</button>
                <button onClick={resetPw} disabled={pw.length < 4} className="text-xs px-3 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-40">Set password</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
