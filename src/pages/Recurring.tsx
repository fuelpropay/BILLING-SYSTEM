import React, { useState } from 'react'
import { useStore, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { RecurringSchedule } from '../types'

export default function Recurring() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', planId: '', dayOfMonth: 1, autoSuspend: true, reminderDaysBefore: 3, dunning: 'suspend' as RecurringSchedule['dunning'] })

  const planName = (id: string) => db.plans.find(p => p.id === id)?.name ?? 'All plans'

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const s: RecurringSchedule = { id: uid(), ...form, enabled: true }
    update(d => ({ ...d, recurringSchedules: [s, ...d.recurringSchedules] }))
    log('create', 'recurring-schedule', `Created "${s.name}" (day ${s.dayOfMonth}, dunning: ${s.dunning})`)
    setModal(false)
  }

  const toggle = (id: string) => update(d => ({ ...d, recurringSchedules: d.recurringSchedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s) }))
  const remove = (id: string) => { if (confirm('Delete this schedule?')) update(d => ({ ...d, recurringSchedules: d.recurringSchedules.filter(s => s.id !== id) })) }

  return (
    <div className="space-y-4">
      <Card title="Recurring Billing Schedules" subtitle="Splynx-style recurring invoice runs with dunning rules" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New schedule</button>}>
        {!db.recurringSchedules.length && <EmptyState text="No recurring schedules. Monthly billing runs appear here." />}
        <div className="grid sm:grid-cols-2 gap-3">
          {db.recurringSchedules.map(s => (
            <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                <Badge color={s.enabled ? 'green' : 'slate'}>{s.enabled ? 'enabled' : 'disabled'}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Scope</span><span className="text-right font-medium text-slate-700 dark:text-slate-300">{planName(s.planId)}</span>
                <span>Run day</span><span className="text-right font-medium text-slate-700 dark:text-slate-300">{s.dayOfMonth} of month</span>
                <span>Reminder</span><span className="text-right font-medium text-slate-700 dark:text-slate-300">{s.reminderDaysBefore} days before</span>
                <span>Auto-suspend</span><span className="text-right font-medium text-slate-700 dark:text-slate-300">{s.autoSuspend ? 'yes' : 'no'}</span>
                <span>Dunning</span><span className="text-right"><Badge color={s.dunning === 'suspend' ? 'red' : s.dunning === 'escalate' ? 'amber' : 'blue'}>{s.dunning}</Badge></span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary !py-1 text-xs" onClick={() => toggle(s.id)}>{s.enabled ? 'Disable' : 'Enable'}</button>
                <button className="btn-secondary !py-1 text-xs !text-rose-500" onClick={() => remove(s.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New recurring schedule">
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly billing run" required /></Field>
          <Field label="Scope plan (blank = all)">
            <select className="input" value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}>
              <option value="">All plans</option>
              {db.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Run day of month"><input type="number" min={1} max={28} className="input" value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))} /></Field>
            <Field label="Reminder days before"><input type="number" min={0} max={14} className="input" value={form.reminderDaysBefore} onChange={e => setForm(f => ({ ...f, reminderDaysBefore: Number(e.target.value) }))} /></Field>
          </div>
          <Field label="Dunning action">
            <select className="input" value={form.dunning} onChange={e => setForm(f => ({ ...f, dunning: e.target.value as RecurringSchedule['dunning'] }))}>
              <option value="none">None</option><option value="remind">Remind only</option><option value="suspend">Suspend on expiry</option><option value="escalate">Escalate to manager</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoSuspend} onChange={e => setForm(f => ({ ...f, autoSuspend: e.target.checked }))} /> Auto-suspend expired accounts</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Create schedule</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
