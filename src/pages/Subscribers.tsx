import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import type { Subscriber, ServiceType, SubscriberStatus } from '../types'

const empty: Omit<Subscriber, 'id'> = {
  name: '', phone: '', email: '', username: '', serviceType: 'pppoe', planId: '', routerId: '',
  status: 'pending', balance: 0, mac: '', ip: '', referredBy: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
}

export default function Subscribers() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [typeF, setTypeF] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Subscriber | null>(null)
  const [form, setForm] = useState<Omit<Subscriber, 'id'>>(empty)

  const planName = (id: string) => db.plans.find(p => p.id === id)?.name ?? '—'
  const routerName = (id: string) => db.routers.find(r => r.id === id)?.name ?? '—'

  const rows = useMemo(() => db.subscribers.filter(s => {
    const text = `${s.name} ${s.username} ${s.phone} ${s.email} ${s.ip} ${s.mac}`.toLowerCase()
    return text.includes(q.toLowerCase())
      && (statusF === 'all' || s.status === statusF)
      && (typeF === 'all' || s.serviceType === typeF)
  }), [db.subscribers, q, statusF, typeF])

  const openNew = () => { setEditing(null); setForm({ ...empty, planId: db.plans[0]?.id ?? '', routerId: db.routers[0]?.id ?? '' }); setModal(true) }
  const openEdit = (s: Subscriber) => { setEditing(s); setForm({ ...s }); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, subscribers: d.subscribers.map(s => s.id === editing.id ? { ...form, id: editing.id } : s) }))
      log('update', 'subscriber', `Updated subscriber ${form.name}`)
    } else {
      update(d => ({ ...d, subscribers: [{ ...form, id: uid() }, ...d.subscribers] }))
      log('create', 'subscriber', `Added subscriber ${form.name} (${form.username})`)
    }
    setModal(false)
  }

  const setStatus = (s: Subscriber, status: SubscriberStatus) => {
    update(d => ({ ...d, subscribers: d.subscribers.map(x => x.id === s.id ? { ...x, status } : x) }))
    log('update', 'subscriber', `${status === 'active' ? 'Activated' : status === 'suspended' ? 'Suspended' : 'Updated'} ${s.name}`)
  }

  const remove = (s: Subscriber) => {
    if (!confirm(`Delete subscriber ${s.name}? This cannot be undone.`)) return
    update(d => ({ ...d, subscribers: d.subscribers.filter(x => x.id !== s.id) }))
    log('delete', 'subscriber', `Deleted subscriber ${s.name}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Subscribers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} of {db.subscribers.length} accounts</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('subscribers.csv', ['Name', 'Username', 'Phone', 'Type', 'Plan', 'Status', 'Balance'], rows.map(s => [s.name, s.username, s.phone, s.serviceType, planName(s.planId), s.status, s.balance]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ Add subscriber</button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search name, username, phone, IP, MAC…" /></div>
          <select className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="expired">Expired</option><option value="pending">Pending</option>
          </select>
          <select className="input !w-auto" value={typeF} onChange={e => setTypeF(e.target.value)}>
            <option value="all">All types</option><option value="pppoe">PPPoE</option><option value="hotspot">Hotspot</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Subscriber</th><th className="th">Username</th><th className="th">Type</th><th className="th">Plan</th><th className="th">Router</th><th className="th">Balance</th><th className="th">Status</th><th className="th">Expires</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} className="tr">
                  <td className="td pl-5">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.phone}</div>
                  </td>
                  <td className="td font-mono text-xs">{s.username}</td>
                  <td className="td"><Badge color={s.serviceType === 'pppoe' ? 'purple' : 'blue'}>{s.serviceType.toUpperCase()}</Badge></td>
                  <td className="td">{planName(s.planId)}</td>
                  <td className="td text-xs text-slate-500 dark:text-slate-400">{routerName(s.routerId)}</td>
                  <td className={`td font-semibold ${s.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmtMoney(s.balance)}</td>
                  <td className="td"><Badge color={statusColor(s.status)}>{s.status}</Badge></td>
                  <td className="td text-xs">{fmtDate(s.expiresAt)}</td>
                  <td className="td pr-5">
                    <div className="flex gap-1.5">
                      {s.status !== 'active' && <button className="text-xs font-semibold text-emerald-600 hover:underline" onClick={() => setStatus(s, 'active')}>Activate</button>}
                      {s.status === 'active' && <button className="text-xs font-semibold text-amber-600 hover:underline" onClick={() => setStatus(s, 'suspended')}>Suspend</button>}
                      <button className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline" onClick={() => openEdit(s)}>Edit</button>
                      <button className="text-xs font-semibold text-rose-500 hover:underline" onClick={() => remove(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No subscribers match your filters." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit subscriber' : 'Add subscriber'} wide>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Username"><input className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+2547…" /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Service type">
            <select className="input" value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value as ServiceType })}>
              <option value="pppoe">PPPoE</option><option value="hotspot">Hotspot</option><option value="static">Static IP</option>
            </select>
          </Field>
          <Field label="Plan">
            <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
              {db.plans.filter(p => p.serviceType === form.serviceType).map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)}</option>)}
            </select>
          </Field>
          <Field label="Router / NAS">
            <select className="input" value={form.routerId} onChange={e => setForm({ ...form, routerId: e.target.value })}>
              {db.routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.location})</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as SubscriberStatus })}>
              <option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="expired">Expired</option>
            </select>
          </Field>
          <Field label="Referred by agent">
            <select className="input" value={form.referredBy ?? ''} onChange={e => setForm({ ...form, referredBy: e.target.value || null })}>
              <option value="">Direct / none</option>
              {db.agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
          </Field>
          <Field label="IP address"><input className="input" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="10.20.1.40" /></Field>
          <Field label="MAC address"><input className="input" value={form.mac} onChange={e => setForm({ ...form, mac: e.target.value })} placeholder="AA:BB:CC:…" /></Field>
          <Field label="Balance (KES)"><input className="input" type="number" min={0} value={form.balance} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} /></Field>
          <Field label="Expiry date"><input className="input" type="date" value={form.expiresAt.slice(0, 10)} onChange={e => setForm({ ...form, expiresAt: new Date(e.target.value).toISOString() })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Add subscriber'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
