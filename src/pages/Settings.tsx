import React, { useState } from 'react'
import { useStore } from '../store'
import { Card, Field } from '../components/ui'
import type { Settings as SettingsType } from '../types'

export default function Settings() {
  const { db, update, log, resetData } = useStore()
  const [form, setForm] = useState<SettingsType>({ ...db.settings })
  const [saved, setSaved] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    update(d => ({ ...d, settings: { ...form, graceDays: Number(form.graceDays) } }))
    log('update', 'settings', 'Updated company settings')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Company profile, billing rules and integrations</p>
      </div>

      <form onSubmit={save}>
        <Card title="Company profile" subtitle="Shown on invoices, receipts and the captive portal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company name"><input className="input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} /></Field>
            <Field label="Currency"><input className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></Field>
            <Field label="Support email"><input className="input" type="email" value={form.supportEmail} onChange={e => setForm({ ...form, supportEmail: e.target.value })} /></Field>
            <Field label="Support phone"><input className="input" value={form.supportPhone} onChange={e => setForm({ ...form, supportPhone: e.target.value })} /></Field>
          </div>
        </Card>

        <Card title="Integrations" subtitle="Payment and messaging gateways" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="M-Pesa Paybill / Till"><input className="input" value={form.mpesaPaybill} onChange={e => setForm({ ...form, mpesaPaybill: e.target.value })} /></Field>
            <Field label="SMS Sender ID"><input className="input" value={form.smsSenderId} onChange={e => setForm({ ...form, smsSenderId: e.target.value })} /></Field>
          </div>
        </Card>

        <Card title="Billing rules" subtitle="Automation behaviour" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <Field label="Grace period (days)"><input className="input" type="number" min={0} value={form.graceDays} onChange={e => setForm({ ...form, graceDays: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-3 pb-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={form.suspendOnExpiry} onChange={e => setForm({ ...form, suspendOnExpiry: e.target.checked })} />
              <span className="text-sm">Auto-suspend subscribers on expiry</span>
            </label>
          </div>
        </Card>

        <div className="flex items-center gap-3 mt-5">
          <button type="submit" className="btn-primary">Save settings</button>
          {saved && <span className="text-sm font-semibold text-emerald-500">Saved ✓</span>}
        </div>
      </form>

      <Card title="Danger zone" className="!border-rose-300 dark:!border-rose-500/30">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Reset all data back to the demo dataset. This wipes every change you have made in this browser.</p>
        <button className="btn-danger !text-xs" onClick={() => { if (confirm('Reset ALL data to the demo dataset?')) { resetData(); log('update', 'settings', 'Reset demo data') } }}>Reset demo data</button>
      </Card>
    </div>
  )
}
