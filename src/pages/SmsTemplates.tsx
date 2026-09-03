import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { SmsTemplate, SmsMessage } from '../types'

const variables: { key: string; label: string; sample: string }[] = [
  { key: '$NAME', label: 'Subscriber name', sample: 'James Mwangi' },
  { key: '$USERNAME', label: 'Username', sample: 'jamesmw100' },
  { key: '$INVOICE', label: 'Invoice no.', sample: 'INV-2401' },
  { key: '$AMOUNT', label: 'Amount', sample: 'KES 1,500' },
  { key: '$DATE', label: 'Date', sample: '05 Sept 2026' },
  { key: '$PAYBILL', label: 'Paybill', sample: '400200' },
  { key: '$RECEIPT', label: 'Receipt no.', sample: 'RCPT-88310' },
  { key: '$COMPANY', label: 'Company', sample: 'FuelPro Networks' },
  { key: '$PHONE', label: 'Support phone', sample: '+254 700 000 000' },
]

const render = (body: string, s?: { replaceAll: (a: string, b: string) => string }) => {
  let out = body
  for (const v of variables) out = out.split(v.key).join(v.sample)
  return out
}

export default function SmsTemplates() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<SmsTemplate | null>(null)
  const [form, setForm] = useState({ name: '', kind: 'invoice' as SmsMessage['kind'], channel: 'sms' as 'sms' | 'whatsapp', body: '' })

  const openNew = () => { setEditing(null); setForm({ name: '', kind: 'invoice', channel: 'sms', body: '' }); setModal(true) }
  const openEdit = (t: SmsTemplate) => { setEditing(t); setForm({ name: t.name, kind: t.kind, channel: t.channel, body: t.body }); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, smsTemplates: d.smsTemplates.map(t => t.id === editing.id ? { ...t, ...form } : t) }))
      log('update', 'sms-template', `Updated template "${form.name}"`)
    } else {
      update(d => ({ ...d, smsTemplates: [...d.smsTemplates, { id: uid(), ...form, active: true }] }))
      log('create', 'sms-template', `Created template "${form.name}"`)
    }
    setModal(false)
  }

  const toggle = (t: SmsTemplate) => {
    update(d => ({ ...d, smsTemplates: d.smsTemplates.map(x => x.id === t.id ? { ...x, active: !x.active } : x) }))
    log('update', 'sms-template', `${t.active ? 'Disabled' : 'Enabled'} template "${t.name}"`)
  }

  const remove = (t: SmsTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return
    update(d => ({ ...d, smsTemplates: d.smsTemplates.filter(x => x.id !== t.id) }))
    log('delete', 'sms-template', `Deleted template "${t.name}"`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Message Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">SMS &amp; WhatsApp templates — variables render per subscriber at send time</p>
        </div>
        <button className="btn-primary !text-xs" onClick={openNew}>+ New template</button>
      </div>

      <Card title="Available variables" subtitle="Paste into a template body — resolved per recipient">
        <div className="flex flex-wrap gap-2">
          {variables.map(v => <Badge key={v.key} color="blue"><span className="font-mono">{v.key}</span> = {v.label}</Badge>)}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {db.smsTemplates.map(t => (
          <Card key={t.id} className="!p-0">
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge color={t.channel === 'whatsapp' ? 'green' : 'blue'}>{t.channel}</Badge>
                  <Badge color="purple">{t.kind}</Badge>
                  {!t.active && <Badge color="red">disabled</Badge>}
                </div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">{t.name}</span>
              </div>
              <p className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 rounded-lg p-3">{t.body}</p>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3">
                <span className="font-semibold">Preview: </span>{render(t.body)}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              <button className="btn-ghost !text-xs flex-1" onClick={() => openEdit(t)}>Edit</button>
              <button className="btn-ghost !text-xs flex-1 !text-amber-500" onClick={() => toggle(t)}>{t.active ? 'Disable' : 'Enable'}</button>
              <button className="btn-ghost !text-xs flex-1 !text-rose-500" onClick={() => remove(t)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
      {db.smsTemplates.length === 0 && <EmptyState text="No templates yet. Create one for automated messaging." />}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit template' : 'New template'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Template name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purpose">
              <select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as SmsMessage['kind'] })}>
                {['invoice', 'payment', 'expiry', 'broadcast', 'otp'].map(k => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Channel">
              <select className="input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as 'sms' | 'whatsapp' })}>
                <option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
          </div>
          <Field label="Body (variables allowed)">
            <textarea className="input min-h-24 font-mono text-xs" required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Dear $NAME, invoice $INVOICE of $AMOUNT is due $DATE." />
          </Field>
          {form.body && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3">
              <span className="font-semibold">Preview: </span>{render(form.body)}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create template'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
