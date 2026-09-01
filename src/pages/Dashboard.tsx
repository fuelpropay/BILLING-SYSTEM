import React from 'react'
import { Link } from 'react-router-dom'
import { useStore, fmtMoney, fmtDateTime } from '../store'
import { Card, Badge, statusColor } from '../components/ui'
import { LineChart, Donut } from '../components/charts'
import { useStats, useNames } from '../apiUse'
import type { SubscriberStats } from '../stats'

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${tone}`} />
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const { db } = useStore()
  const stats = (useStats<{ subscribers: SubscriberStats }>() as any)?.subscribers ?? { total: 0, active: 0, suspended: 0, 'new': 0, byPlan: {} }
  const today = new Date().toISOString().slice(0, 10)
  const revenueToday = db.payments.filter(p => p.createdAt.startsWith(today)).reduce((s, p) => s + p.amount, 0)
  const monthPrefix = today.slice(0, 7)
  const revenueMonth = db.payments.filter(p => p.createdAt.startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0)
  const onlineSessions = db.sessions.filter(s => s.active).length
  const outstanding = db.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0)
  const monthExpenses = db.expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0)

  const revenueSeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    const value = db.payments.filter(p => p.createdAt.startsWith(key)).reduce((s, p) => s + p.amount, 0)
    return { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value }
  })

  const byPlan = db.plans.map(p => ({ label: p.name, value: stats.byPlan?.[p.id] ?? 0 })).filter(d => d.value > 0)
  const recentPayments = db.payments.slice(0, 7)
  const { name: subName } = useNames(recentPayments.map(p => p.subscriberId))
  const liveSessions = db.sessions.filter(s => s.active).slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Network and revenue at a glance</p>
        </div>
        <div className="flex gap-2">
          <Link to="/invoices" className="btn-ghost !text-xs">Generate invoices</Link>
          <Link to="/vouchers" className="btn-primary !text-xs">New voucher batch</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Revenue today" value={fmtMoney(revenueToday)} sub={`${fmtMoney(revenueMonth)} this month`} tone="bg-emerald-500" />
        <Stat label="Active subscribers" value={(stats.active ?? '…').toString()} sub={`of ${(stats.total ?? '…').toString()} total accounts`} tone="bg-brand-500" />
        <Stat label="Online sessions" value={String(onlineSessions)} sub={`${db.routers.filter(r => r.status === 'online').length}/${db.routers.length} routers online`} tone="bg-violet-500" />
        <Stat label="Outstanding balance" value={fmtMoney(outstanding)} sub={`${db.invoices.filter(i => i.status !== 'paid').length} unpaid invoices`} tone="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Revenue — last 30 days" subtitle="All payment methods" className="xl:col-span-2">
          <LineChart data={revenueSeries} format={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
        </Card>
        <Card title="Subscribers by plan" subtitle="Distribution across packages">
          <Donut data={byPlan} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Recent payments" subtitle="Latest transactions" className="xl:col-span-2"
          action={<Link to="/payments" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">View all</Link>}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full">
              <thead><tr><th className="th pl-5">Receipt</th><th className="th">Subscriber</th><th className="th">Method</th><th className="th">Amount</th><th className="th pr-5">Date</th></tr></thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id} className="tr">
                    <td className="td pl-5 font-mono text-xs">{p.receipt}</td>
                    <td className="td font-medium text-slate-800 dark:text-slate-100">{subName(p.subscriberId)}</td>
                    <td className="td"><Badge color={p.method === 'mpesa' ? 'green' : p.method === 'card' ? 'purple' : 'blue'}>{p.method.toUpperCase()}</Badge></td>
                    <td className="td font-semibold">{fmtMoney(p.amount)}</td>
                    <td className="td pr-5 text-slate-500 dark:text-slate-400">{fmtDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Live sessions" subtitle="Currently connected"
          action={<Link to="/sessions" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">All sessions</Link>}>
          <div className="space-y-3">
            {liveSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{s.subscriber}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.router} · {s.ip}</div>
                </div>
                <Badge color={statusColor(s.serviceType === 'pppoe' ? 'active' : 'pending')}>{s.serviceType.toUpperCase()}</Badge>
              </div>
            ))}
            {liveSessions.length === 0 && <p className="text-sm text-slate-400">No active sessions.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Month expenses" value={fmtMoney(monthExpenses)} sub={`Net: ${fmtMoney(revenueMonth - monthExpenses)}`} tone="bg-rose-500" />
        <Stat label="Open tickets" value={String(db.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length)} sub={`${db.tickets.length} total tickets`} tone="bg-amber-500" />
        <Stat label="Unused vouchers" value={String(db.vouchers.filter(v => v.status === 'unused').length)} sub={`${db.vouchers.length} generated overall`} tone="bg-brand-500" />
      </div>
    </div>
  )
}
