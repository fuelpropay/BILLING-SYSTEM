import React, { useState } from 'react'
import { useStore, uid, fmtDateTime } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { EscalationRule } from '../types'

export default function Escalations() {
  const { db, update, log, actor } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'high' as EscalationRule['priority'], afterMins: 240, escalateTo: 'ADMIN', notifyVia: 'sms' as EscalationRule['notifyVia'] })
  const [breachMsg, setBreachMsg] = useState('')

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const r: EscalationRule = { id: uid(), ...form, enabled: true }
    update(d => ({ ...d, escalationRules: [r, ...d.escalationRules] }))
    log('create', 'escalation-rule', `Rule "${r.name}" → ${r.escalateTo} after ${r.afterMins}m`)
    setModal(false)
  }

  const toggle = (id: string) => update(d => ({ ...d, escalationRules: d.escalationRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r) }))
  const remove = (id: string) => { if (confirm('Delete rule?')) update(d => ({ ...d, escalationRules: d.escalationRules.filter(r => r.id !== id) })) }

  // Live breach detection against open tickets
  const now = Date.now()
  const breaches = db.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').flatMap(t => {
    const ageMins = Math.floor((now - new Date(t.createdAt).getTime()) / 60000)
    return db.escalationRules.filter(r => r.enabled && t.priority === r.priority && ageMins >= r.afterMins)
      .map(r => ({ ticket: t, rule: r, ageMins }))
  })

  const escalate = (b: { ticket: { id: string; subject: string }; rule: EscalationRule }) => {
    update(d => ({
      ...d,
      tickets: d.tickets.map(t => t.id === b.ticket.id ? { ...t, assignee: b.rule.escalateTo } : t),
      audit: [{ id: uid(), actor, action: 'escalate', entity: 'ticket', detail: `Ticket "${b.ticket.subject}" escalated to ${b.rule.escalateTo}`, at: new Date().toISOString() }, ...d.audit].slice(0, 200),
    }))
    setBreachMsg(`Escalated "${b.ticket.subject}" to ${b.rule.escalateTo}`)
  }

  return (
    <div className="space-y-4">
      <Card title="Escalation Matrix" subtitle="ispman-style rules: aged tickets auto-escalate by priority" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New rule</button>}>
        {!db.escalationRules.length && <EmptyState text="No escalation rules." />}
        <div className="grid sm:grid-cols-2 gap-3">
          {db.escalationRules.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-white">{r.name}</div>
                <Badge color={r.enabled ? 'green' : 'slate'}>{r.enabled ? 'active' : 'off'}</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Priority <Badge color={r.priority === 'critical' ? 'red' : r.priority === 'high' ? 'amber' : 'blue'}>{r.priority}</Badge> ageing past <b>{r.afterMins} min</b> → <b>{r.escalateTo}</b> via {r.notifyVia}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary !py-1 text-xs" onClick={() => toggle(r.id)}>{r.enabled ? 'Disable' : 'Enable'}</button>
                <button className="btn-secondary !py-1 text-xs !text-rose-500" onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Live breaches" subtitle="Tickets currently violating an active rule">
        {breachMsg && <div className="mb-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{breachMsg}</div>}
        {!breaches.length && <p className="text-sm text-slate-500">No tickets breaching escalation rules right now.</p>}
        {breaches.map((b, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
            <div>
              <span className="font-medium">{b.ticket.subject}</span>
              <span className="text-slate-400 text-xs ml-2">opened {fmtDateTime(b.ticket.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="red">{b.rule.name}</Badge>
              <button className="btn-secondary !py-1 text-xs" onClick={() => escalate(b as any)}>Escalate to {b.rule.escalateTo}</button>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New escalation rule">
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as EscalationRule['priority'] }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="After (minutes)"><input type="number" min={5} className="input" value={form.afterMins} onChange={e => setForm(f => ({ ...f, afterMins: Number(e.target.value) }))} /></Field>
          </div>
          <Field label="Escalate to">
            <select className="input" value={form.escalateTo} onChange={e => setForm(f => ({ ...f, escalateTo: e.target.value }))}>
              {db.users.filter(u => u.role !== 'technician').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
              <option value="ADMIN">ADMIN</option>
            </select>
          </Field>
          <Field label="Notify via">
            <select className="input" value={form.notifyVia} onChange={e => setForm(f => ({ ...f, notifyVia: e.target.value as EscalationRule['notifyVia'] }))}>
              <option value="sms">SMS</option><option value="email">Email</option><option value="both">Both</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Create rule</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
