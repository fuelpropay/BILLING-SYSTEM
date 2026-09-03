import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { TicketMacro } from '../types'

export default function Macros() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [applyTo, setApplyTo] = useState<TicketMacro | null>(null)
  const [ticketId, setTicketId] = useState('')
  const [done, setDone] = useState('')
  const [form, setForm] = useState({ name: '', body: '', setStatus: '' as TicketMacro['setStatus'] })

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const m: TicketMacro = { id: uid(), ...form, uses: 0 }
    update(d => ({ ...d, macros: [m, ...d.macros] }))
    log('create', 'macro', `Created macro "${m.name}"`)
    setModal(false)
    setForm({ name: '', body: '', setStatus: '' })
  }

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyTo || !ticketId) return
    const ticket = db.tickets.find(t => t.id === ticketId)
    if (!ticket) return alert('Ticket not found')
    update(d => ({
      ...d,
      tickets: d.tickets.map(t => t.id === ticketId ? { ...t, status: (applyTo.setStatus || t.status) as typeof t.status } : t),
      macros: d.macros.map(m => m.id === applyTo.id ? { ...m, uses: m.uses + 1 } : m),
      sms: [{ id: uid(), to: ticket.subscriber, body: applyTo.body.replace('{{name}}', ticket.subscriber), status: 'queued' as const, createdAt: new Date().toISOString() }, ...d.sms],
    }))
    log('apply', 'macro', `Macro "${applyTo.name}" applied to ticket ${ticketId}`)
    setDone(`Applied to ticket "${ticket.subject}" — SMS queued to ${ticket.subscriber}`)
    setApplyTo(null)
    setTicketId('')
  }

  const remove = (id: string) => { if (confirm('Delete macro?')) update(d => ({ ...d, macros: d.macros.filter(m => m.id !== id) })) }
  const openTickets = db.tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved')

  return (
    <div className="space-y-4">
      <Card title="Ticket Macros" subtitle="uCRM-style canned responses — one click sends SMS + sets ticket status" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New macro</button>}>
        {done && <div className="mb-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{done}</div>}
        {!db.macros.length && <EmptyState text="No macros yet." />}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {db.macros.map(m => (
            <div key={m.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                <Badge color="slate">{m.uses} uses</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex-1">{m.body}</p>
              <div className="text-[10px] text-slate-400 mt-2">Sets status: {m.setStatus || 'unchanged'} · variables: {'{{name}} {{amount}}'}</div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary !py-1 text-xs" onClick={() => setApplyTo(m)}>Apply to ticket</button>
                <button className="btn-secondary !py-1 text-xs !text-rose-500" onClick={() => remove(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!applyTo} onClose={() => setApplyTo(null)} title={`Apply macro: ${applyTo?.name ?? ''}`}>
        <form onSubmit={apply} className="space-y-3">
          <Field label="Open ticket">
            <select className="input" value={ticketId} onChange={e => setTicketId(e.target.value)} required>
              <option value="">Select ticket…</option>
              {openTickets.map(t => <option key={t.id} value={t.id}>{t.subject} — {t.subscriber}</option>)}
            </select>
          </Field>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{applyTo?.body}</div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setApplyTo(null)}>Cancel</button>
            <button className="btn-primary">Apply & queue SMS</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title="New macro" wide>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Payment confirmation" required /></Field>
          <Field label="Message body"><textarea className="input min-h-28" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Hi {{name}}, …" required /></Field>
          <Field label="Also set ticket status">
            <select className="input" value={form.setStatus} onChange={e => setForm(f => ({ ...f, setStatus: e.target.value as TicketMacro['setStatus'] }))}>
              <option value="">Leave unchanged</option>
              <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Save macro</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
