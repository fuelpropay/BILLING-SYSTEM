import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, downloadCSV } from '../components/ui'
import { useNames, SubSelect } from '../apiUse'
import type { FieldJob } from '../types'

const kinds: FieldJob['kind'][] = ['installation', 'maintenance', 'upgrade', 'survey', 'relocation']
const empty = { title: '', kind: 'installation' as FieldJob['kind'], subscriberId: '', assignee: '', scheduledAt: '', address: '', checklist: '', notes: '' }

export default function FieldJobs() {
  const { db, update, log } = useStore()
  const [statusF, setStatusF] = useState<'active' | 'all'>('active')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<FieldJob | null>(null)
  const [form, setForm] = useState(empty)

  const technicians = db.users.filter(u => u.role === 'technician' && u.active).map(u => u.name)
  const { name: subName } = useNames(db.fieldJobs.map(j => j.subscriberId!).filter(Boolean))

  const rows = useMemo(() => db.fieldJobs.filter(j => statusF === 'all' || j.status === 'scheduled' || j.status === 'in_progress'), [db.fieldJobs, statusF])

  const openNew = () => {
    setEditing(null)
    setForm({ ...empty, assignee: technicians[0] ?? '', scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16) })
    setModal(true)
  }
  const openEdit = (j: FieldJob) => {
    setEditing(j)
    setForm({
      title: j.title, kind: j.kind, subscriberId: j.subscriberId ?? '', assignee: j.assignee,
      scheduledAt: j.scheduledAt.slice(0, 16), address: j.address, checklist: j.checklist.map(c => c.item).join('\n'), notes: j.notes,
    })
    setModal(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const checklist = form.checklist.split('\n').map(s => s.trim()).filter(Boolean).map(item => ({ item, done: false }))
    const base = {
      title: form.title, kind: form.kind, subscriberId: form.subscriberId || null,
      ticketId: editing?.ticketId ?? null, assignee: form.assignee,
      scheduledAt: new Date(form.scheduledAt).toISOString(), address: form.address, notes: form.notes,
    }
    if (editing) {
      update(d => ({ ...d, fieldJobs: d.fieldJobs.map(j => j.id === editing.id ? { ...base, id: j.id, status: j.status, checklist: j.checklist } : j) }))
      log('update', 'field-job', `Edited job: ${form.title}`)
    } else {
      update(d => ({ ...d, fieldJobs: [{ ...base, id: uid(), status: 'scheduled', checklist }, ...d.fieldJobs] }))
      log('create', 'field-job', `Scheduled ${form.kind}: ${form.title} → ${form.assignee}`)
    }
    setModal(false)
  }

  const setStatus = (j: FieldJob, status: FieldJob['status']) => {
    update(d => ({ ...d, fieldJobs: d.fieldJobs.map(x => x.id === j.id ? { ...x, status } : x) }))
    log('update', 'field-job', `Job "${j.title}" → ${status}`)
  }

  const toggleCheck = (j: FieldJob, idx: number) => {
    update(d => ({
      ...d,
      fieldJobs: d.fieldJobs.map(x => x.id === j.id
        ? { ...x, checklist: x.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c) }
        : x),
    }))
  }

  const upcoming = db.fieldJobs.filter(j => j.status === 'scheduled').length
  const inProgress = db.fieldJobs.filter(j => j.status === 'in_progress').length
  const doneThisWeek = db.fieldJobs.filter(j => j.status === 'done' && Date.now() - new Date(j.scheduledAt).getTime() < 7 * 86400000).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Field Jobs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Technician scheduling, work orders and checklists</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('field-jobs.csv', ['Title', 'Kind', 'Customer', 'Assignee', 'Scheduled', 'Status', 'Address'],
            rows.map(j => [j.title, j.kind, subName(j.subscriberId) ?? 'Site', j.assignee, fmtDateTime(j.scheduledAt), j.status, j.address]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ Schedule job</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduled</div><div className="text-2xl font-extrabold text-amber-500 mt-1">{upcoming}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">In progress</div><div className="text-2xl font-extrabold text-brand-500 mt-1">{inProgress}</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed this week</div><div className="text-2xl font-extrabold text-emerald-500 mt-1">{doneThisWeek}</div></Card>
      </div>

      <div className="flex gap-2">
        <button className={`btn-ghost !text-xs ${statusF === 'active' ? '!bg-brand-500/15 !text-brand-500' : ''}`} onClick={() => setStatusF('active')}>Active</button>
        <button className={`btn-ghost !text-xs ${statusF === 'all' ? '!bg-brand-500/15 !text-brand-500' : ''}`} onClick={() => setStatusF('all')}>All jobs</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map(j => (
          <Card key={j.id} className="!p-0">
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge color={statusColor(j.status)}>{j.status.replace('_', ' ')}</Badge>
                  <Badge color="purple">{j.kind}</Badge>
                </div>
                <div className="text-xs text-slate-400">{fmtDateTime(j.scheduledAt)}</div>
              </div>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{j.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subName(j.subscriberId) ?? 'Site work'} · {j.address} · {j.assignee}
              </p>
              {j.ticketId && <p className="text-[10px] text-slate-400 mt-0.5">Linked ticket: {db.tickets.find(t => t.id === j.ticketId)?.subject ?? j.ticketId}</p>}
            </div>
            {j.checklist.length > 0 && (
              <div className="px-5 pb-3 space-y-1.5">
                {j.checklist.map((c, i) => (
                  <label key={i} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="accent-brand-500" checked={c.done} onChange={() => toggleCheck(j, i)} />
                    <span className={c.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>{c.item}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 px-5 pb-4">
              <button className="btn-ghost !text-xs" onClick={() => openEdit(j)}>Edit</button>
              {j.status === 'scheduled' && <button className="btn-ghost !text-xs !text-brand-500" onClick={() => setStatus(j, 'in_progress')}>Start</button>}
              {j.status !== 'done' && j.status !== 'cancelled' && <button className="btn-ghost !text-xs !text-emerald-500" onClick={() => setStatus(j, 'done')}>Complete</button>}
              {j.status === 'scheduled' && <button className="btn-ghost !text-xs !text-rose-500" onClick={() => setStatus(j, 'cancelled')}>Cancel</button>}
            </div>
          </Card>
        ))}
      </div>
      {rows.length === 0 && <EmptyState text="No jobs in this view." />}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit job' : 'Schedule job'} wide>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job title"><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Kind">
            <select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as FieldJob['kind'] })}>
              {kinds.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Customer (optional)">
            <SubSelect value={form.subscriberId} onChange={v => setForm({ ...form, subscriberId: v })} label="customer" />
          </Field>
          <Field label="Assignee">
            <select className="input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} required>
              <option value="">Select technician…</option>
              {technicians.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Scheduled for"><input className="input" type="datetime-local" required value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Checklist (one item per line)"><textarea className="input min-h-24 font-mono text-xs" value={form.checklist} onChange={e => setForm({ ...form, checklist: e.target.value })} placeholder={'Run drop cable\nInstall ONU\nSpeed test & handover'} /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes"><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Schedule'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
