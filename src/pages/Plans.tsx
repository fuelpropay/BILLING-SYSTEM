import React, { useState } from 'react'
import { useStore, fmtMoney, uid } from '../store'
import { Card, Badge, Modal, Field } from '../components/ui'
import type { Plan, ServiceType } from '../types'

const empty: Omit<Plan, 'id'> = { name: '', serviceType: 'pppoe', speedMbps: 10, price: 1000, validityDays: 30, dataLimitGB: 0, description: '', active: true }

export default function Plans() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<Omit<Plan, 'id'>>(empty)

  const openNew = () => { setEditing(null); setForm(empty); setModal(true) }
  const openEdit = (p: Plan) => { setEditing(p); setForm({ ...p }); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, plans: d.plans.map(p => p.id === editing.id ? { ...form, id: editing.id } : p) }))
      log('update', 'plan', `Updated plan ${form.name}`)
    } else {
      update(d => ({ ...d, plans: [...d.plans, { ...form, id: uid() }] }))
      log('create', 'plan', `Created plan ${form.name} (${fmtMoney(form.price)})`)
    }
    setModal(false)
  }

  const remove = (p: Plan) => {
    const inUse = db.subscribers.filter(s => s.planId === p.id).length
    if (inUse > 0) { alert(`Cannot delete: ${inUse} subscriber(s) are on this plan.`); return }
    if (!confirm(`Delete plan ${p.name}?`)) return
    update(d => ({ ...d, plans: d.plans.filter(x => x.id !== p.id) }))
    log('delete', 'plan', `Deleted plan ${p.name}`)
  }

  const renderGroup = (type: ServiceType, title: string) => (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {db.plans.filter(p => p.serviceType === type).map(p => {
          const count = db.subscribers.filter(s => s.planId === p.id).length
          return (
            <div key={p.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <Badge color={type === 'pppoe' ? 'purple' : 'blue'}>{type.toUpperCase()}</Badge>
                {!p.active && <Badge color="red">disabled</Badge>}
              </div>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <div className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400">{fmtMoney(p.price)}<span className="text-xs font-medium text-slate-400"> / {p.validityDays}d</span></div>
              <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 flex-1">
                <li>Speed: {p.speedMbps} Mbps</li>
                <li>Data: {p.dataLimitGB === 0 ? 'Unlimited' : `${p.dataLimitGB} GB`}</li>
                <li>{p.description}</li>
                <li className="font-semibold text-slate-600 dark:text-slate-300">{count} subscriber{count === 1 ? '' : 's'}</li>
              </ul>
              <div className="flex gap-2 mt-4">
                <button className="btn-ghost !py-1.5 !text-xs flex-1" onClick={() => openEdit(p)}>Edit</button>
                <button className="btn-ghost !py-1.5 !text-xs" onClick={() => update(d => ({ ...d, plans: d.plans.map(x => x.id === p.id ? { ...x, active: !x.active } : x) }))}>{p.active ? 'Disable' : 'Enable'}</button>
                <button className="btn-danger !py-1.5 !text-xs" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Plans & Packages</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.plans.length} plans configured</p>
        </div>
        <button className="btn-primary !text-xs" onClick={openNew}>+ New plan</button>
      </div>
      {renderGroup('pppoe', 'PPPoE plans')}
      {renderGroup('hotspot', 'Hotspot plans')}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit plan' : 'New plan'} wide>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Plan name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Service type">
            <select className="input" value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value as ServiceType })}>
              <option value="pppoe">PPPoE</option><option value="hotspot">Hotspot</option>
            </select>
          </Field>
          <Field label="Speed (Mbps)"><input className="input" type="number" min={1} required value={form.speedMbps} onChange={e => setForm({ ...form, speedMbps: Number(e.target.value) })} /></Field>
          <Field label="Price (KES)"><input className="input" type="number" min={0} required value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label="Validity (days)"><input className="input" type="number" min={1} required value={form.validityDays} onChange={e => setForm({ ...form, validityDays: Number(e.target.value) })} /></Field>
          <Field label="Data limit (GB, 0 = unlimited)"><input className="input" type="number" min={0} value={form.dataLimitGB} onChange={e => setForm({ ...form, dataLimitGB: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create plan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
