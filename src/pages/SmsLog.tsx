import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput } from '../components/ui'
import type { SmsMessage } from '../types'

export default function SmsLog() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ to: '', message: '' })

  const rows = useMemo(() => db.sms.filter(m => `${m.to} ${m.message} ${m.kind}`.toLowerCase().includes(q.toLowerCase())), [db.sms, q])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const msg: SmsMessage = { id: uid(), to: form.to, message: form.message, status: 'queued', kind: 'broadcast', createdAt: new Date().toISOString() }
    update(d => ({ ...d, sms: [msg, ...d.sms] }))
    log('create', 'sms', `Queued SMS to ${form.to}`)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">SMS Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sender ID: {db.settings.smsSenderId} · {db.sms.filter(m => m.status === 'delivered').length} delivered</p>
        </div>
        <button className="btn-primary !text-xs" onClick={() => setModal(true)}>+ Send SMS</button>
      </div>

      <Card>
        <div className="mb-4 max-w-md"><SearchInput value={q} onChange={setQ} placeholder="Search recipient or message…" /></div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">To</th><th className="th">Message</th><th className="th">Type</th><th className="th">Status</th><th className="th pr-5">Time</th>
            </tr></thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id} className="tr">
                  <td className="td pl-5 font-mono text-xs">{m.to}</td>
                  <td className="td text-xs text-slate-600 dark:text-slate-300 max-w-md whitespace-normal">{m.message}</td>
                  <td className="td"><Badge color="blue">{m.kind}</Badge></td>
                  <td className="td"><Badge color={statusColor(m.status)}>{m.status}</Badge></td>
                  <td className="td pr-5 text-xs">{fmtDateTime(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No SMS messages found." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Send SMS">
        <form onSubmit={send} className="space-y-4">
          <Field label="Recipient"><input className="input" required value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} placeholder="+2547…" /></Field>
          <Field label="Message"><textarea className="input" rows={4} required maxLength={480} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></Field>
          <p className="text-xs text-slate-400">{form.message.length}/480 characters · Sender ID: {db.settings.smsSenderId}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Queue message</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
