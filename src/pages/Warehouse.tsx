import React, { useState } from 'react'
import { useStore, fmtDate } from '../store'
import { Card, downloadCSV } from '../components/ui'
import { useNames } from '../apiUse'
import { apiSubscribers } from '../api'

const COLLECTIONS = [
  { key: 'subscribers', label: 'Subscribers', desc: 'All customer accounts, plans, status, balances' },
  { key: 'invoices', label: 'Invoices', desc: 'Billing ledger with status' },
  { key: 'payments', label: 'Payments', desc: 'Confirmed & pending collections' },
  { key: 'expenses', label: 'Expenses', desc: 'Operational spend' },
  { key: 'tickets', label: 'Tickets', desc: 'Support history' },
  { key: 'sessions', label: 'Sessions', desc: 'Live and recent access sessions' },
  { key: 'inventory', label: 'Inventory', desc: 'Stock and serials' },
  { key: 'audit', label: 'Audit log', desc: 'Full system activity trail' },
  { key: 'agents', label: 'Agents', desc: 'Referral accounts and stakes' },
  { key: 'vouchers', label: 'Vouchers', desc: 'Hotspot/recharge vouchers' },
] as const

export default function Warehouse() {
  const { db, token } = useStore()
  const [busy, setBusy] = useState('')
  const subs = useNames(db.subscribers.map(s => s.id))

  const exportOne = async (key: string) => {
    setBusy(key)
    try {
      if (key === 'subscribers') {
        const r = await apiSubscribers<any>(token!, { pageSize: 300 })
        const rows = (r.items ?? []).map((s: any) => [s.id, s.name ?? '', s.phone ?? '', s.username ?? '', s.planId ?? '', s.status ?? '', s.balance ?? 0])
        downloadCSV('subscribers.csv', ['id', 'name', 'phone', 'username', 'plan', 'status', 'balance'], rows)
        return
      }
      const list: any[] = (db as any)[key] ?? []
      if (!list.length) return
      if (key === 'invoices') return downloadCSV('invoices.csv', ['id', 'subscriber', 'amount', 'status', 'issued', 'due'], list.map(i => [i.id, subs.name(i.subscriberId), i.amount, i.status, fmtDate(i.issuedAt), fmtDate(i.dueAt)]))
      if (key === 'payments') return downloadCSV('payments.csv', ['id', 'subscriber', 'amount', 'method', 'status', 'at'], list.map(p => [p.id, subs.name(p.subscriberId), p.amount, p.method, p.status, fmtDate(p.createdAt)]))
      if (key === 'expenses') return downloadCSV('expenses.csv', ['category', 'description', 'amount', 'date'], list.map(e => [e.category, e.description, e.amount, fmtDate(e.date)]))
      if (key === 'tickets') return downloadCSV('tickets.csv', ['id', 'subject', 'status', 'priority', 'opened'], list.map(t => [t.id, t.subject, t.status, t.priority, fmtDate(t.createdAt)]))
      if (key === 'sessions') return downloadCSV('sessions.csv', ['id', 'subscriber', 'ip', 'mac', 'uptime', 'started'], list.map(s => [s.id, subs.name(s.subscriberId), s.ip ?? '', s.mac ?? '', s.uptime ?? '', s.startedAt ? fmtDate(s.startedAt) : '']))
      if (key === 'inventory') return downloadCSV('inventory.csv', ['id', 'item', 'qty', 'router'], list.map(i => [i.id, i.item ?? i.name ?? '', i.qty ?? 0, db.routers.find(r => r.id === i.routerId)?.name ?? '']))
      if (key === 'audit') return downloadCSV('audit.csv', ['actor', 'action', 'entity', 'detail', 'at'], list.map(a => [a.actor, a.action, a.entity, a.detail, fmtDate(a.at)]))
      if (key === 'agents') return downloadCSV('agents.csv', ['id', 'name', 'commission', 'stake'], list.map(a => [a.id, a.name, a.commissionPct ?? '', a.stake ?? '']))
      if (key === 'vouchers') return downloadCSV('vouchers.csv', ['code', 'plan', 'status', 'redeemed'], list.map(v => [v.code, v.planId ?? '', v.status, v.redeemedAt ?? '']))
    } finally { setBusy('') }
  }

  const exportAll = async () => {
    for (const c of COLLECTIONS) { await exportOne(c.key) }
  }

  return (
    <div className="space-y-4">
      <Card title="Data Warehouse" subtitle="Export any collection as CSV for analytics (BigQuery, Snowflake, Looker)" action={<button className="btn-primary !py-1.5" onClick={exportAll}>Export all</button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLLECTIONS.map(c => (
            <div key={c.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="font-semibold text-slate-900 dark:text-white">{c.label}</div>
              <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
              <button onClick={() => exportOne(c.key)} disabled={busy === c.key} className="mt-3 btn-secondary !py-1 text-xs">{busy === c.key ? 'Exporting…' : 'Export CSV'}</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
