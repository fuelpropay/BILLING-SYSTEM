import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { SlaPolicy } from '../types'

const KINDS: SlaPolicy['appliesTo'][number][] = ['installs', 'faults', 'moves', 'upgrades']

export default function SlaPolicies() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'normal' as SlaPolicy['priority'], respondMins: 30, resolveMins: 240, appliesTo: ['faults'] as SlaPolicy['appliesTo'] })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const p: SlaPolicy = { id: uid(), ...form, enabled: true }
    update(d => ({ ...d, slaPolicies: [...d.slaPolicies, p] }))
    log('create', 'sla', `Added SLA policy ${form.name}`)
    setModal(false)
  }
  const toggle = (p: SlaPolicy) => update(d => ({ ...d, slaPolicies: d.slaPolicies.map(x => x.id === p.id ? { ...x, enabled: !x.enabled } : x) }))
  const remove = (p: SlaPolicy) => {
    if (!confirm(`Delete SLA policy "${p.name}"?`)) return
    update(d => ({ ...d, slaPolicies: d.slaPolicies.filter(x => x.id !== p.id) }))
  }
  const flipKind = (k: SlaPolicy['appliesTo'][number]) =>
    setForm(f => ({ ...f, appliesTo: f.appliesTo.includes(k) ? f.appliesTo.filter(x => x !== k) : [...f.appliesTo, k] }))

  return (
    <div className="space-y-4">
      <Card title="SLA Policies" subtitle="Respond/resolve targets per job and ticket category" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Add policy</button>}>
        {!db.slaPolicies.length && <EmptyState text="No SLAs defined. Field jobs and tickets will pick the broadest match." />}
        {!!db.slaPolicies.length && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Name</th><th className="py-2 px-3">Priority</th><th className="py-2 px-3">Respond in</th><th className="py-2 px-3">Resolve in</th><th className="py-2 px-3">Applies to</th><th className="py-2 px-3">Status</th><th className="py-2 px-3" /></tr></thead>
            <tbody>
              {db.slaPolicies.map(p => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-semibold">{p.name}</td>
                  <td className="py-2 px-3"><Badge color={p.priority === 'critical' ? 'red' : p.priority === 'high' ? 'amber' : 'slate'}>{p.priority}</Badge></td>
                  <td className="py-2 px-3">{p.respondMins} min</td>
                  <td className="py-2 px-3">{p.resolveMins} min</td>
                  <td className="py-2 px-3">{p.appliesTo.join(', ')}</td>
                  <td className="py-2 px-3"><Badge color={p.enabled ? 'green' : 'slate'}>{p.enabled ? 'on' : 'off'}</Badge></td>
                  <td className="py-2 px-3 text-right space-x-3">
                    <button onClick={() => toggle(p)} className="text-xs text-brand-500 hover:underline">{p.enabled ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => remove(p)} className="text-xs text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add SLA policy">
        <form onSubmit={add} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Network outage P1" required /></Field>
          <Field label="Priority"><select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as SlaPolicy['priority'] })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Respond (minutes)"><input className="input" type="number" min={1} value={form.respondMins} onChange={e => setForm({ ...form, respondMins: Number(e.target.value) })} required /></Field>
            <Field label="Resolve (minutes)"><input className="input" type="number" min={1} value={form.resolveMins} onChange={e => setForm({ ...form, resolveMins: Number(e.target.value) })} required /></Field>
          </div>
          <Field label="Applies to">
            <div className="flex gap-3 flex-wrap">
              {KINDS.map(k => (
                <label key={k} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-brand-600" checked={form.appliesTo.includes(k)} onChange={() => flipKind(k)} />{k}</label>
              ))}
            </div>
          </Field>
          <button type="submit" className="btn-primary w-full">Add policy</button>
        </form>
      </Modal>
    </div>
  )
}
