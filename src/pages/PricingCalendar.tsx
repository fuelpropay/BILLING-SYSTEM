import React, { useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { PricingRule } from '../types'

export default function PricingCalendar() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', planId: '', startsAt: '', endsAt: '', discountPct: 10 })

  const planName = (id: string) => db.plans.find(p => p.id === id)?.name ?? 'All plans'
  const now = Date.now()
  const isLive = (r: PricingRule) => r.active && new Date(r.startsAt).getTime() <= now && new Date(r.endsAt).getTime() >= now

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const r: PricingRule = { id: uid(), ...form, active: true }
    update(d => ({ ...d, pricingRules: [r, ...d.pricingRules] }))
    log('create', 'pricing-rule', `Seasonal rule "${r.name}" −${r.discountPct}% on ${planName(r.planId)}`)
    setModal(false)
  }

  const toggle = (id: string) => update(d => ({ ...d, pricingRules: d.pricingRules.map(r => r.id === id ? { ...r, active: !r.active } : r) }))
  const remove = (id: string) => { if (confirm('Delete this pricing rule?')) update(d => ({ ...d, pricingRules: d.pricingRules.filter(r => r.id !== id) })) }

  const effective = (planId: string) => {
    const plan = db.plans.find(p => p.id === planId)
    if (!plan) return null
    const rule = db.pricingRules.find(r => (r.planId === planId || !r.planId) && isLive(r))
    return { plan, rule, price: rule ? Math.round(plan.price * (1 - rule.discountPct / 100)) : plan.price }
  }

  return (
    <div className="space-y-4">
      <Card title="Seasonal Pricing Calendar" subtitle="VISP-style time-boxed price rules per plan" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New rule</button>}>
        {!db.pricingRules.length && <EmptyState text="No seasonal rules. Create one for holidays or promos." />}
        <div className="grid sm:grid-cols-2 gap-3">
          {db.pricingRules.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-white">{r.name}</div>
                <Badge color={isLive(r) ? 'green' : r.active ? 'amber' : 'slate'}>{isLive(r) ? 'live now' : r.active ? 'scheduled' : 'off'}</Badge>
              </div>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <div>{planName(r.planId)} · <span className="font-bold text-brand-500">−{r.discountPct}%</span></div>
                <div>{fmtDate(r.startsAt)} → {fmtDate(r.endsAt)}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary !py-1 text-xs" onClick={() => toggle(r.id)}>{r.active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn-secondary !py-1 text-xs !text-rose-500" onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Effective prices right now" subtitle="What customers pay today, after live rules">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Plan</th><th className="py-2 px-3">List price</th><th className="py-2 px-3">Rule</th><th className="py-2 px-3">Effective</th></tr></thead>
            <tbody>
              {db.plans.map(p => {
                const e = effective(p.id)!
                return (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-medium">{p.name}</td>
                    <td className="py-2 px-3 text-slate-500">{fmtMoney(p.price)}</td>
                    <td className="py-2 px-3">{e.rule ? <Badge color="amber">−{e.rule.discountPct}% {e.rule.name}</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className={`py-2 px-3 font-bold ${e.rule ? 'text-emerald-500' : ''}`}>{fmtMoney(e.price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New seasonal pricing rule">
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. December holidays" required /></Field>
          <Field label="Plan (blank = all)">
            <select className="input" value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}>
              <option value="">All plans</option>
              {db.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input type="date" className="input" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required /></Field>
            <Field label="Ends"><input type="date" className="input" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required /></Field>
          </div>
          <Field label="Discount %"><input type="number" min={1} max={90} className="input" value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: Number(e.target.value) }))} required /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Create rule</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
