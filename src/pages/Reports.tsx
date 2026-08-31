import React, { useMemo } from 'react'
import { useStore, fmtMoney } from '../store'
import { Card, downloadCSV } from '../components/ui'
import { LineChart, BarChart, Donut } from '../components/charts'

export default function Reports() {
  const { db } = useStore()
  const monthPrefix = new Date().toISOString().slice(0, 7)

  const revenueMonth = db.payments.filter(p => p.createdAt.startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0)
  const expenseMonth = db.expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0)

  const revenueSeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    return { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value: db.payments.filter(p => p.createdAt.startsWith(key)).reduce((s, p) => s + p.amount, 0) }
  })

  const signups = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = d.toISOString().slice(0, 7)
    return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value: db.subscribers.filter(s => s.createdAt.startsWith(key)).length }
  })

  const planRevenue = db.plans.map(p => ({
    label: p.name,
    value: db.subscribers.filter(s => s.planId === p.id && s.status === 'active').length * p.price,
  })).filter(d => d.value > 0)

  const statusDist = (['active', 'suspended', 'expired', 'pending'] as const).map(st => ({
    label: st, value: db.subscribers.filter(s => s.status === st).length,
  })).filter(d => d.value > 0)

  const totalSubs = db.subscribers.length || 1
  const churned = db.subscribers.filter(s => s.status === 'expired' || s.status === 'suspended').length
  const churnRate = (churned / totalSubs) * 100
  const activeSubs = db.subscribers.filter(s => s.status === 'active').length || 1
  const arpu = Math.round(revenueMonth / activeSubs)

  const usageBySub = db.devices.reduce<Record<string, number>>((acc, d) => {
    acc[d.subscriberId] = (acc[d.subscriberId] ?? 0) + d.dataDownMB + d.dataUpMB
    return acc
  }, {})
  const topConsumers = Object.entries(usageBySub)
    .map(([id, mb]) => ({ name: db.subscribers.find(s => s.id === id)?.name ?? id, mb }))
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 8)
  const maxMB = topConsumers[0]?.mb ?? 1
  const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Revenue, growth and network analytics</p>
        </div>
        <button className="btn-ghost !text-xs" onClick={() => downloadCSV('revenue-30d.csv', ['Date', 'Revenue (KES)'], revenueSeries.map(r => [r.label, r.value]))}>Export revenue CSV</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue this month</div><div className="text-xl font-extrabold text-emerald-500 mt-1">{fmtMoney(revenueMonth)}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expenses this month</div><div className="text-xl font-extrabold text-rose-500 mt-1">{fmtMoney(expenseMonth)}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net profit</div><div className={`text-xl font-extrabold mt-1 ${revenueMonth - expenseMonth >= 0 ? 'text-brand-500' : 'text-rose-500'}`}>{fmtMoney(revenueMonth - expenseMonth)}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Churn rate</div><div className="text-xl font-extrabold text-amber-500 mt-1">{churnRate.toFixed(1)}%</div><div className="text-[10px] text-slate-400 mt-0.5">{churned} of {totalSubs} accounts</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">ARPU</div><div className="text-xl font-extrabold text-purple-500 mt-1">{fmtMoney(arpu)}</div><div className="text-[10px] text-slate-400 mt-0.5">per active subscriber / month</div></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Daily revenue — 30 days">
          <LineChart data={revenueSeries} format={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
        </Card>
        <Card title="New signups — 6 months">
          <BarChart data={signups} color="#1b92f5" />
        </Card>
        <Card title="Monthly recurring revenue by plan">
          <Donut data={planRevenue.map(d => ({ ...d, value: Math.round(d.value / 1000) }))} />
          <p className="text-[10px] text-slate-400 mt-2">Values in thousands of KES (active subscribers × plan price)</p>
        </Card>
        <Card title="Subscriber status distribution">
          <Donut data={statusDist} />
        </Card>
        <Card title="Top data consumers" subtitle="Total traffic per subscriber across bound devices"
          action={<button className="btn-ghost !text-xs" onClick={() => downloadCSV('top-consumers.csv', ['Subscriber', 'Total MB'], topConsumers.map(c => [c.name, c.mb]))}>Export CSV</button>}>
          <div className="space-y-2.5">
            {topConsumers.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-32 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{c.name}</div>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((c.mb / maxMB) * 100)}%` }} />
                </div>
                <div className="w-16 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{fmtMB(c.mb)}</div>
              </div>
            ))}
            {topConsumers.length === 0 && <p className="text-xs text-slate-400">No usage data yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
