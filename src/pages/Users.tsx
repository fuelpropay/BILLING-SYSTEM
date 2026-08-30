import React, { useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, Modal, Field } from '../components/ui'
import type { StaffUser } from '../types'

const roleColors: Record<string, 'red' | 'purple' | 'blue' | 'green'> = { admin: 'red', manager: 'purple', agent: 'blue', technician: 'green' }

export default function Users() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', role: 'agent' as StaffUser['role'] })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const u: StaffUser = { id: uid(), ...form, active: true, lastLogin: 'never' }
    update(d => ({ ...d, users: [...d.users, u] }))
    log('create', 'user', `Added staff user ${form.name} (${form.role})`)
    setModal(false)
  }

  const toggle = (u: StaffUser) => {
    if (u.username === 'ADMIN') { alert('The primary ADMIN account cannot be deactivated.'); return }
    update(d => ({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, active: !x.active } : x) }))
    log('update', 'user', `${u.active ? 'Deactivated' : 'Activated'} staff user ${u.username}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Staff & Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.users.filter(u => u.active).length} active staff accounts</p>
        </div>
        <button className="btn-primary !text-xs" onClick={() => setModal(true)}>+ Add staff</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {db.users.map(u => (
          <Card key={u.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600/15 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                  {u.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                  <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                </div>
              </div>
              <Badge color={roleColors[u.role]}>{u.role}</Badge>
            </div>
            <div className="mt-4 flex justify-between text-xs">
              <span className="text-slate-400">Last login</span>
              <span>{u.lastLogin === 'never' ? 'Never' : fmtDateTime(u.lastLogin)}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className={`flex-1 ${u.active ? 'btn-ghost' : 'btn-primary'} !py-1.5 !text-xs`} onClick={() => toggle(u)}>
                {u.active ? 'Deactivate' : 'Activate'}
              </button>
              {!u.active && <Badge color="red">inactive</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add staff user">
        <form onSubmit={add} className="space-y-4">
          <Field label="Full name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Username"><input className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as StaffUser['role'] })}>
              <option value="admin">Admin</option><option value="manager">Manager</option><option value="agent">Agent</option><option value="technician">Technician</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Add staff</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
