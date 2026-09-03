import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime } from '../store'
import { Card, Badge, EmptyState, SearchInput, downloadCSV } from '../components/ui'

const fmtMB = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`)

export default function Sessions() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => db.sessions.filter(s => {
    const text = `${s.subscriber} ${s.router} ${s.ip} ${s.mac}`.toLowerCase()
    return text.includes(q.toLowerCase())
      && (filter === 'all' || (filter === 'active' ? s.active : !s.active))
  }), [db.sessions, q, filter])

  const disconnect = (id: string, subscriber: string) => {
    update(d => ({ ...d, sessions: d.sessions.map(s => s.id === id ? { ...s, active: false } : s) }))
    log('update', 'session', `Disconnected session for ${subscriber}`)
  }

  const duration = (startedAt: string) => {
    const mins = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Live Sessions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.sessions.filter(s => s.active).length} active · {db.sessions.length} recent</p>
        </div>
        <button className="btn-ghost !text-xs" onClick={() => downloadCSV('sessions.csv', ['Subscriber', 'Type', 'Router', 'IP', 'MAC', 'Started', 'Download MB', 'Upload MB', 'Active'], rows.map(s => [s.subscriber, s.serviceType, s.router, s.ip, s.mac, fmtDateTime(s.startedAt), s.downloadMB, s.uploadMB, s.active ? 'yes' : 'no']))}>Export CSV</button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search subscriber, router, IP, MAC…" /></div>
          <select className="input !w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All sessions</option><option value="active">Active only</option><option value="closed">Closed only</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Subscriber</th><th className="th">Type</th><th className="th">Router</th><th className="th">IP / MAC</th><th className="th">Uptime</th><th className="th">Download</th><th className="th">Upload</th><th className="th">Status</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} className="tr">
                  <td className="td pl-5 font-medium text-slate-800 dark:text-slate-100">{s.subscriber}</td>
                  <td className="td"><Badge color={s.serviceType === 'pppoe' ? 'purple' : 'blue'}>{s.serviceType.toUpperCase()}</Badge></td>
                  <td className="td font-mono text-xs">{s.router}</td>
                  <td className="td">
                    <div className="font-mono text-xs">{s.ip}</div>
                    <div className="font-mono text-[10px] text-slate-400">{s.mac}</div>
                  </td>
                  <td className="td text-xs">{duration(s.startedAt)}</td>
                  <td className="td text-xs font-semibold">{fmtMB(s.downloadMB)}</td>
                  <td className="td text-xs">{fmtMB(s.uploadMB)}</td>
                  <td className="td">
                    {s.active
                      ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />live</span>
                      : <Badge color="slate">closed</Badge>}
                  </td>
                  <td className="td pr-5">
                    {s.active && <button className="text-xs font-semibold text-rose-500 hover:underline" onClick={() => disconnect(s.id, s.subscriber)}>Disconnect</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No sessions match your filters." />}
        </div>
      </Card>
    </div>
  )
}
