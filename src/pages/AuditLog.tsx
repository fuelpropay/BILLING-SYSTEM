import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime } from '../store'
import { Card, Badge, EmptyState, SearchInput, downloadCSV } from '../components/ui'

const actionColors: Record<string, 'green' | 'blue' | 'red' | 'amber'> = { create: 'green', update: 'blue', delete: 'red', login: 'amber' }

export default function AuditLog() {
  const { db } = useStore()
  const [q, setQ] = useState('')

  const rows = useMemo(() => db.audit.filter(a => `${a.actor} ${a.action} ${a.entity} ${a.detail}`.toLowerCase().includes(q.toLowerCase())), [db.audit, q])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Every action taken in the system</p>
        </div>
        <button className="btn-ghost !text-xs" onClick={() => downloadCSV('audit-log.csv', ['Time', 'Actor', 'Action', 'Entity', 'Detail'], rows.map(a => [fmtDateTime(a.at), a.actor, a.action, a.entity, a.detail]))}>Export CSV</button>
      </div>

      <Card>
        <div className="mb-4 max-w-md"><SearchInput value={q} onChange={setQ} placeholder="Search actor, action, entity…" /></div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Time</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Entity</th><th className="th pr-5">Detail</th>
            </tr></thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id} className="tr">
                  <td className="td pl-5 text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(a.at)}</td>
                  <td className="td font-mono text-xs font-semibold">{a.actor}</td>
                  <td className="td"><Badge color={actionColors[a.action] ?? 'slate'}>{a.action}</Badge></td>
                  <td className="td text-xs">{a.entity}</td>
                  <td className="td pr-5 text-xs text-slate-600 dark:text-slate-300 max-w-md whitespace-normal">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No audit entries found." />}
        </div>
      </Card>
    </div>
  )
}
