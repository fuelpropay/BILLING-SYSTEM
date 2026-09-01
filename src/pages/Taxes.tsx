import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { TaxRule } from '../types'

export default function Taxes() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', rate: 16, appliesTo: 'all' as TaxRule['appliesTo'] })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const t: TaxRule = { id: uid(), ...form, enabled: true }
    update(d => ({ ...d, taxRules: [...d.taxRules, t] }))
    log('create', 'tax', `Added tax rule ${form.name} (${form.rate}%)`)
    setModal(false)
  }

  const toggle = (t: TaxRule) => update(d => ({ ...d, taxRules: d.taxRules.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x) }))
  const remove = (t: TaxRule) => {
    if (!confirm(`Delete tax rule "${t.name}"?`)) return
    update(d => ({ ...d, taxRules: d.taxRules.filter(x => x.id !== t.id) }))
    log('delete', 'tax', `Deleted tax rule ${t.name}`)
  }

  const activeRate = db.taxRules.filter(t => t.enabled).reduce((s, t) => s + t.rate, 0)

  return (
    <div className="space-y-4">
      <Card title="Tax Rules" subtitle={`Composite effective rate: ${activeRate.toFixed(2)}% — applies to plan prices at invoice time`} action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Add tax rule</button>}>
        {!db.taxRules.length && <EmptyState text="No tax rules. Add VAT, excise duty, or withholding tax." />}
        {!!db.taxRules.length && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Name</th><th className="py-2 px-3">Rate</th><th className="py-2 px-3">Applies to</th><th className="py-2 px-3">Status</th><th className="py-2 px-3" /></tr></thead>
            <tbody>
              {db.taxRules.map(t => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-semibold">{t.name}</td>
                  <td className="py-2 px-3">{t.rate}%</td>
                  <td className="py-2 px-3 capitalize">{t.appliesTo}</td>
                  <td className="py-2 px-3"><Badge color={t.enabled ? 'green' : 'slate'}>{t.enabled ? 'enabled' : 'disabled'}</Badge></td>
                  <td className="py-2 px-3 text-right space-x-3">
                    <button onClick={() => toggle(t)} className="text-xs text-brand-500 hover:underline">{t.enabled ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => remove(t)} className="text-xs text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add tax rule">
        <form onSubmit={add} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VAT" required /></Field>
          <Field label="Rate (%)"><input className="input" type="number" step="0.01" min={0} value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} required /></Field>
          <Field label="Applies to"><select className="input" value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value as TaxRule['appliesTo'] })}><option value="all">All charges</option><option value="plan">Plan price only</option><option value="service">Service/add-ons only</option></select></Field>
          <button type="submit" className="btn-primary w-full">Add rule</button>
        </form>
      </Modal>
    </div>
  )
}
