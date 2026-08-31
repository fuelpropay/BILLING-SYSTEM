import React, { useMemo, useState } from 'react'
import { useStore, fmtDate, fmtMoney, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import type { Promo } from '../types'

const emptyForm = { code: '', kind: 'percent' as Promo['kind'], value: 10, planId: '', validTo: '', maxUses: 100 }

export default function Promos() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Promo | null>(null)
  const [form, setForm] = useState(emptyForm)

  const isLive = (p: Promo) => p.active && new Date(p.validTo) > new Date() && p.usedCount < p.maxUses

  const rows = useMemo(() => db.promos.filter(p =>
    `${p.code} ${db.plans.find(pl => pl.id === p.planId)?.name ?? 'all plans'}`.toLowerCase().includes(q.toLowerCase())
  ), [db.promos, db.plans, q])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, validTo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) })
    setModal(true)
  }

  const openEdit = (p: Promo) => {
    setEditing(p)
    setForm({ code: p.code, kind: p.kind, value: p.value, planId: p.planId ?? '', validTo: p.validTo.slice(0, 10), maxUses: p.maxUses })
    setModal(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({
        ...d,
        promos: d.promos.map(p => p.id === editing.id
          ? { ...p, code: form.code.toUpperCase(), kind: form.kind, value: form.value, planId: form.planId || null, validTo: new Date(form.validTo).toISOString(), maxUses: form.maxUses }
          : p),
      }))
      log('update', 'promo', `Edited promo code ${form.code.toUpperCase()}`)
    } else {
      const promo: Promo = {
        id: uid(), code: form.code.toUpperCase(), kind: form.kind, value: form.value,
        planId: form.planId || null, validTo: new Date(form.validTo).toISOString(),
        maxUses: form.maxUses, usedCount: 0, active: true, createdAt: new Date().toISOString(),
      }
      update(d => ({ ...d, promos: [promo, ...d.promos] }))
      log('create', 'promo', `Created promo code ${promo.code} (${promo.kind === 'percent' ? promo.value + '%' : fmtMoney(promo.value)} off)`)
    }
    setModal(false)
  }

  const toggle = (p: Promo) => {
    update(d => ({ ...d, promos: d.promos.map(x => x.id === p.id ? { ...x, active: !x.active } : x) }))
    log('update', 'promo', `${p.active ? 'Disabled' : 'Enabled'} promo code ${p.code}`)
  }

  const remove = (p: Promo) => {
    if (!confirm(`Delete promo code ${p.code}?`)) return
    update(d => ({ ...d, promos: d.promos.filter(x => x.id !== p.id) }))
    log('delete', 'promo', `Deleted promo code ${p.code}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Promos & Offers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {db.promos.filter(isLive).length} live · {db.promos.reduce((s, p) => s + p.usedCount, 0)} total redemptions
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('promos.csv', ['Code', 'Type', 'Value', 'Plan', 'Valid to', 'Uses', 'Max', 'Active'],
            rows.map(p => [p.code, p.kind, p.value, p.planId ? db.plans.find(pl => pl.id === p.planId)?.name ?? '' : 'All plans', fmtDate(p.validTo), p.usedCount, p.maxUses, p.active ? 'yes' : 'no']))}>
            Export CSV
          </button>
          <button className="btn-primary !text-xs" onClick={openCreate}>+ New promo code</button>
        </div>
      </div>

      <Card>
        <div className="mb-4 max-w-sm"><SearchInput value={q} onChange={setQ} placeholder="Search code or plan…" /></div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Code</th><th className="th">Discount</th><th className="th">Applies to</th><th className="th">Valid until</th><th className="th">Usage</th><th className="th">Status</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(p => {
                const pct = p.maxUses > 0 ? Math.min(100, Math.round((p.usedCount / p.maxUses) * 100)) : 0
                return (
                  <tr key={p.id} className="tr">
                    <td className="td pl-5 font-mono text-xs font-bold tracking-wider">{p.code}</td>
                    <td className="td font-semibold">{p.kind === 'percent' ? `${p.value}% off` : `${fmtMoney(p.value)} off`}</td>
                    <td className="td text-xs">{p.planId ? db.plans.find(pl => pl.id === p.planId)?.name : <span className="text-slate-400">All plans</span>}</td>
                    <td className="td text-xs">{fmtDate(p.validTo)}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{p.usedCount}/{p.maxUses}</span>
                      </div>
                    </td>
                    <td className="td"><Badge color={isLive(p) ? 'green' : p.active ? 'amber' : 'slate'}>{isLive(p) ? 'live' : p.active ? 'exhausted/expired' : 'disabled'}</Badge></td>
                    <td className="td pr-5">
                      <div className="flex gap-2 text-xs font-semibold">
                        <button className="text-brand-500 hover:underline" onClick={() => openEdit(p)}>Edit</button>
                        <button className="text-amber-500 hover:underline" onClick={() => toggle(p)}>{p.active ? 'Disable' : 'Enable'}</button>
                        <button className="text-rose-500 hover:underline" onClick={() => remove(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No promo codes yet. Create your first offer." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.code}` : 'New promo code'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Promo code"><input className="input font-mono uppercase" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. WELCOME20" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount type">
              <select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as Promo['kind'] })}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (KES)</option>
              </select>
            </Field>
            <Field label="Value"><input className="input" type="number" min={1} required value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Applies to plan">
            <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
              <option value="">All plans</option>
              {db.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valid until"><input className="input" type="date" required value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} /></Field>
            <Field label="Max redemptions"><input className="input" type="number" min={1} required value={form.maxUses} onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create promo'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
