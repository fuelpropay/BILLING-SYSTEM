import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field } from '../components/ui'
import { useStats } from '../apiUse'
import type { Router } from '../types'

const empty: Omit<Router, 'id'> = { name: '', model: 'MikroTik RB4011', ip: '', location: '', status: 'online', uptimeHours: 0, cpuPct: 5, memPct: 20 }

export default function Routers() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Router | null>(null)
  const [form, setForm] = useState<Omit<Router, 'id'>>(empty)
  const subStats = (useStats<any>() as any)?.subscribers ?? { byRouter: {} }

  const openNew = () => { setEditing(null); setForm(empty); setModal(true) }
  const openEdit = (r: Router) => { setEditing(r); setForm({ ...r }); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, routers: d.routers.map(r => r.id === editing.id ? { ...form, id: editing.id } : r) }))
      log('update', 'router', `Updated router ${form.name}`)
    } else {
      update(d => ({ ...d, routers: [...d.routers, { ...form, id: uid() }] }))
      log('create', 'router', `Added router ${form.name} (${form.ip})`)
    }
    setModal(false)
  }

  const toggle = (r: Router) => {
    const status = r.status === 'online' ? 'offline' : 'online'
    update(d => ({ ...d, routers: d.routers.map(x => x.id === r.id ? { ...x, status, cpuPct: status === 'offline' ? 0 : 12, memPct: status === 'offline' ? 0 : 30 } : x) }))
    log('update', 'router', `${status === 'online' ? 'Brought online' : 'Took offline'} ${r.name}`)
  }

  const remove = (r: Router) => {
    const inUse = subStats.byRouter?.[r.id] ?? 0
    if (inUse > 0) { alert(`Cannot delete: ${inUse} subscriber(s) are attached to this router.`); return }
    if (!confirm(`Delete router ${r.name}?`)) return
    update(d => ({ ...d, routers: d.routers.filter(x => x.id !== r.id) }))
    log('delete', 'router', `Deleted router ${r.name}`)
  }

  const subCount = (id: string) => subStats.byRouter?.[id] ?? 0
  const activeSessions = (name: string) => db.sessions.filter(s => s.router === name && s.active).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Routers / NAS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.routers.filter(r => r.status === 'online').length} online · {db.routers.filter(r => r.status === 'offline').length} offline</p>
        </div>
        <button className="btn-primary !text-xs" onClick={openNew}>+ Add router</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {db.routers.map(r => (
          <Card key={r.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-mono text-sm">{r.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.model}</p>
              </div>
              <Badge color={r.status === 'online' ? 'green' : 'red'}>{r.status}</Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-xs"><span className="text-slate-400">IP address</span><span className="font-mono">{r.ip}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Location</span><span>{r.location}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Uptime</span><span>{r.status === 'online' ? `${Math.floor(r.uptimeHours / 24)}d ${r.uptimeHours % 24}h` : '—'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Subscribers</span><span className="font-semibold">{subCount(r.id)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Live sessions</span><span className="font-semibold">{activeSessions(r.name)}</span></div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">CPU</span><span>{r.cpuPct}%</span></div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${r.cpuPct}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Memory</span><span>{r.memPct}%</span></div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-1.5 rounded-full ${r.memPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${r.memPct}%` }} /></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-ghost !py-1.5 !text-xs flex-1" onClick={() => openEdit(r)}>Edit</button>
              <button className="btn-ghost !py-1.5 !text-xs" onClick={() => toggle(r)}>{r.status === 'online' ? 'Take offline' : 'Bring online'}</button>
              <button className="btn-danger !py-1.5 !text-xs" onClick={() => remove(r)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit router' : 'Add router'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name"><input className="input font-mono" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AP-SITE-01" /></Field>
          <Field label="Model"><input className="input" required value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="MikroTik RB4011" /></Field>
          <Field label="IP address"><input className="input font-mono" required value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="10.10.5.1" /></Field>
          <Field label="Location"><input className="input" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Site name" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Add router'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
