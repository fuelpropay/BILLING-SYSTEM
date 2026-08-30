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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Revenue, growth and network analytics</p>
        </div>
        <button className="btn-ghost !text-xs" onClick={() => downloadCSV('revenue-30d.csv', ['Date', 'Revenue (KES)'], revenueSeries.map(r => [r.label, r.value]))}>Export revenue CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue this month</div><div className="text-2xl font-extrabold text-emerald-500 mt-1">{fmtMoney(revenueMonth)}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expenses this month</div><div className="text-2xl font-extrabold text-rose-500 mt-1">{fmtMoney(expenseMonth)}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net profit this month</div><div className={`text-2xl font-extrabold mt-1 ${revenueMonth - expenseMonth >= 0 ? 'text-brand-500' : 'text-rose-500'}`}>{fmtMoney(revenueMonth - expenseMonth)}</div></Card>
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
      </div>
    </div>
  )
}
