import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime } from '../store'
import { Card, Badge, SearchInput, EmptyState, downloadCSV } from '../components/ui'

interface AuthRow {
  id: string
  user: string
  router: string
  reply: 'Access-Accept' | 'Access-Reject'
  reason: string
  at: string
}

interface AcctRow {
  id: string
  user: string
  router: string
  ip: string
  mac: string
  octetsInMB: number
  octetsOutMB: number
  durationMin: number
  at: string
  kind: 'Start' | 'Stop' | 'Interim-Update'
}

export default function Radius() {
  const { db } = useStore()
  const [tab, setTab] = useState<'auth' | 'acct'>('auth')
  const [q, setQ] = useState('')

  const rejects = ['Wrong user name', 'Simultaneous use limit', 'MAC mismatch', 'Account suspended', 'Voucher expired', 'Shared users exceeded']

  const authLog = useMemo<AuthRow[]>(() => {
    const rows: AuthRow[] = []
    db.sessions.forEach((s, i) => {
      const rejected = i % 6 === 0
      rows.push({
        id: `ra${i}`,
        user: s.subscriber,
        router: s.router,
        reply: rejected ? 'Access-Reject' : 'Access-Accept',
        reason: rejected ? rejects[i % rejects.length] : 'OK',
        at: s.startedAt,
        kind: undefined,
      } as AuthRow)
    })
    return rows.sort((a, b) => b.at.localeCompare(a.at))
  }, [db.sessions])

  const acctLog = useMemo<AcctRow[]>(() => {
    return db.sessions.map((s, i) => ({
      id: `ac${i}`,
      user: s.subscriber,
      router: s.router,
      ip: s.ip,
      mac: s.mac,
      octetsInMB: s.downloadMB,
      octetsOutMB: s.uploadMB,
      durationMin: 15 + ((i * 47) % 4320),
      at: s.startedAt,
      kind: (s.active ? (i % 3 === 0 ? 'Interim-Update' : 'Start') : 'Stop') as 'Start' | 'Stop' | 'Interim-Update',
    })).sort((a, b) => b.at.localeCompare(a.at))
  }, [db.sessions])

  const rows = (tab === 'auth' ? authLog : acctLog).filter(r =>
    `${'user' in r ? (r as AuthRow).user : ''} ${(r as unknown as AuthRow).user ?? ''} ${(r as unknown as AcctRow).router ?? ''}`.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">RADIUS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Authentication and accounting across {db.routers.length} NAS devices</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn-ghost !text-xs ${tab === 'auth' ? '!bg-brand-500/15 !text-brand-500' : ''}`} onClick={() => setTab('auth')}>Authentication log</button>
          <button className={`btn-ghost !text-xs ${tab === 'acct' ? '!bg-brand-500/15 !text-brand-500' : ''}`} onClick={() => setTab('acct')}>Accounting</button>
          <button className="btn-ghost !text-xs" onClick={() => {
            if (tab === 'auth') downloadCSV('radius-auth.csv', ['User', 'NAS', 'Reply', 'Reason', 'Time'], authLog.map(r => [r.user, r.router, r.reply, r.reason, fmtDateTime(r.at)]))
            else downloadCSV('radius-acct.csv', ['User', 'NAS', 'IP', 'MAC', 'Down MB', 'Up MB', 'Minutes', 'Type'], acctLog.map(r => [r.user, r.router, r.ip, r.mac, r.octetsInMB, r.octetsOutMB, r.durationMin, r.kind]))
          }}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Auths (24h)</div><div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{authLog.length * 37}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Accept rate</div><div className="text-2xl font-extrabold text-emerald-500 mt-1">{Math.round((authLog.filter(r => r.reply === 'Access-Accept').length / Math.max(authLog.length, 1)) * 100)}%</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active sessions</div><div className="text-2xl font-extrabold text-brand-500 mt-1">{db.sessions.filter(s => s.active).length}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Traffic accounted</div><div className="text-2xl font-extrabold text-purple-500 mt-1">{Math.round(acctLog.reduce((s, r) => s + r.octetsInMB, 0) / 1024)} GB</div></Card>
      </div>

      <Card>
        <div className="max-w-sm mb-4"><SearchInput value={q} onChange={setQ} placeholder="Search user or NAS…" /></div>
        <div className="overflow-x-auto -mx-5">
          {tab === 'auth' ? (
            <table className="w-full">
              <thead><tr><th className="th pl-5">Username</th><th className="th">NAS</th><th className="th">Reply</th><th className="th">Reason</th><th className="th pr-5">Time</th></tr></thead>
              <tbody>
                {(rows as AuthRow[]).map(r => (
                  <tr key={r.id} className="tr">
                    <td className="td pl-5 text-xs">{r.user}</td>
                    <td className="td text-xs text-slate-500 dark:text-slate-400">{r.router}</td>
                    <td className="td"><Badge color={r.reply === 'Access-Accept' ? 'green' : 'red'}>{r.reply}</Badge></td>
                    <td className="td text-xs">{r.reason}</td>
                    <td className="td pr-5 text-xs">{fmtDateTime(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead><tr><th className="th pl-5">Username</th><th className="th">IP</th><th className="th">Download</th><th className="th">Upload</th><th className="th">Duration</th><th className="th">Type</th><th className="th pr-5">Time</th></tr></thead>
              <tbody>
                {(rows as AcctRow[]).map(r => (
                  <tr key={r.id} className="tr">
                    <td className="td pl-5 text-xs">{r.user}</td>
                    <td className="td font-mono text-xs">{r.ip}</td>
                    <td className="td text-xs font-semibold text-brand-500">{r.octetsInMB.toLocaleString()} MB</td>
                    <td className="td text-xs">{r.octetsOutMB.toLocaleString()} MB</td>
                    <td className="td text-xs">{r.durationMin >= 60 ? `${Math.floor(r.durationMin / 60)}h ${r.durationMin % 60}m` : `${r.durationMin}m`}</td>
                    <td className="td"><Badge color={r.kind === 'Start' ? 'green' : r.kind === 'Stop' ? 'slate' : 'blue'}>{r.kind}</Badge></td>
                    <td className="td pr-5 text-xs">{fmtDateTime(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length === 0 && <EmptyState text="No RADIUS records match." />}
        </div>
      </Card>
    </div>
  )
}
