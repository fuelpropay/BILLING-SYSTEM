import React, { useState } from 'react'
import { useStore, uid, fmtDateTime } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { WebhookRule } from '../types'

const EVENTS: WebhookRule['event'][] = ['payment', 'invoice', 'subscriber.create', 'ticket.open', 'session.dropped', 'voucher.redeemed']

export default function Webhooks() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ event: 'payment' as WebhookRule['event'], url: '', secret: '' })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const w: WebhookRule = { id: uid(), ...form, enabled: true, lastStatus: null, lastAttemptAt: null }
    update(d => ({ ...d, webhookRules: [...d.webhookRules, w] }))
    log('create', 'webhook', `Registered webhook ${form.url} on ${form.event}`)
    setModal(false)
  }
  const toggle = (w: WebhookRule) => update(d => ({ ...d, webhookRules: d.webhookRules.map(x => x.id === w.id ? { ...x, enabled: !x.enabled } : x) }))
  const remove = (w: WebhookRule) => {
    if (!confirm(`Delete webhook for ${w.event}?`)) return
    update(d => ({ ...d, webhookRules: d.webhookRules.filter(x => x.id !== w.id) }))
    log('delete', 'webhook', `Deleted webhook ${w.url}`)
  }

  return (
    <div className="space-y-4">
      <Card title="Webhooks" subtitle="Outbound event notifications for integrations (Slack, accounting, RADIUS)" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Add webhook</button>}>
        {!db.webhookRules.length && <EmptyState text="No webhooks configured." />}
        {!!db.webhookRules.length && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Event</th><th className="py-2 px-3">URL</th><th className="py-2 px-3">Secret</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Last result</th><th className="py-2 px-3" /></tr></thead>
            <tbody>
              {db.webhookRules.map(w => (
                <tr key={w.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-mono text-xs">{w.event}</td>
                  <td className="py-2 px-3 truncate max-w-xs">{w.url}</td>
                  <td className="py-2 px-3 font-mono text-xs">{w.secret ? '••••' : '—'}</td>
                  <td className="py-2 px-3"><Badge color={w.enabled ? 'green' : 'slate'}>{w.enabled ? 'on' : 'off'}</Badge></td>
                  <td className="py-2 px-3 text-xs">{w.lastStatus ? `${w.lastStatus} @ ${fmtDateTime(w.lastAttemptAt!)}` : 'never fired'}</td>
                  <td className="py-2 px-3 text-right space-x-3">
                    <button onClick={() => toggle(w)} className="text-xs text-brand-500 hover:underline">{w.enabled ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => remove(w)} className="text-xs text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add webhook">
        <form onSubmit={add} className="space-y-3">
          <Field label="Event"><select className="input" value={form.event} onChange={e => setForm({ ...form, event: e.target.value as WebhookRule['event'] })}>{EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}</select></Field>
          <Field label="Target URL"><input className="input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.example.com/…" required /></Field>
          <Field label="Signing secret (optional)"><input className="input" value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder="whsec_…" /></Field>
          <button type="submit" className="btn-primary w-full">Register</button>
        </form>
      </Modal>
    </div>
  )
}
