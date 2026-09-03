import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput } from '../components/ui'
import type { Ticket } from '../types'

export default function Tickets() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ subject: '', subscriber: '', priority: 'medium' as Ticket['priority'], assignee: '' })

  const rows = useMemo(() => db.tickets.filter(t => {
    const text = `${t.subject} ${t.subscriber} ${t.assignee}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (statusF === 'all' || t.status === statusF)
  }), [db.tickets, q, statusF])

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    const t: Ticket = { id: uid(), ...form, status: 'open', createdAt: new Date().toISOString() }
    update(d => ({ ...d, tickets: [t, ...d.tickets] }))
    log('create', 'ticket', `Opened ticket: ${form.subject}`)
    setModal(false)
  }

  const setStatus = (t: Ticket, status: Ticket['status']) => {
    update(d => ({ ...d, tickets: d.tickets.map(x => x.id === t.id ? { ...x, status } : x) }))
    log('update', 'ticket', `Ticket "${t.subject}" → ${status}`)
  }

  const counts = {
    open: db.tickets.filter(t => t.status === 'open').length,
    in_progress: db.tickets.filter(t => t.status === 'in_progress').length,
    resolved: db.tickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Support Tickets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved</p>
        </div>
        <button className="btn-primary !text-xs" onClick={() => setModal(true)}>+ New ticket</button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search subject, subscriber, assignee…" /></div>
          <select className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Subject</th><th className="th">Subscriber</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Assignee</th><th className="th">Opened</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id} className="tr">
                  <td className="td pl-5 font-medium text-slate-800 dark:text-slate-100 max-w-64 truncate">{t.subject}</td>
                  <td className="td">{t.subscriber}</td>
                  <td className="td"><Badge color={statusColor(t.priority)}>{t.priority}</Badge></td>
                  <td className="td"><Badge color={statusColor(t.status)}>{t.status.replace('_', ' ')}</Badge></td>
                  <td className="td text-xs">{t.assignee}</td>
                  <td className="td text-xs">{fmtDateTime(t.createdAt)}</td>
                  <td className="td pr-5">
                    <div className="flex gap-2">
                      {t.status === 'open' && <button className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline" onClick={() => setStatus(t, 'in_progress')}>Start</button>}
                      {(t.status === 'open' || t.status === 'in_progress') && <button className="text-xs font-semibold text-emerald-600 hover:underline" onClick={() => setStatus(t, 'resolved')}>Resolve</button>}
                      {t.status === 'resolved' && <button className="text-xs font-semibold text-slate-500 hover:underline" onClick={() => setStatus(t, 'closed')}>Close</button>}
                      {(t.status === 'resolved' || t.status === 'closed') && <button className="text-xs font-semibold text-amber-600 hover:underline" onClick={() => setStatus(t, 'open')}>Reopen</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No tickets match your filters." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New ticket">
        <form onSubmit={create} className="space-y-4">
          <Field label="Subject"><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Subscriber"><input className="input" required value={form.subscriber} onChange={e => setForm({ ...form, subscriber: e.target.value })} placeholder="Customer name" /></Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Ticket['priority'] })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Assignee">
            <select className="input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
              <option value="">Unassigned</option>
              {db.users.filter(u => u.active).map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create ticket</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
