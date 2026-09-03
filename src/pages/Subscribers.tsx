import React, { useEffect, useRef, useState } from 'react'
import { useStore, fmtMoney, fmtDate } from '../store'
import { apiSubscribers, apiSubCreate, apiSubUpdate, apiSubDelete } from '../api'
import { Badge, statusColor, Modal, Field, downloadCSV } from '../components/ui'
import type { Subscriber, ServiceType, SubscriberStatus } from '../types'

const empty: Omit<Subscriber, 'id'> = {
  name: '', phone: '', email: '', username: '', serviceType: 'pppoe', planId: '', routerId: '',
  status: 'pending', balance: 0, mac: '', ip: '', referredBy: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
}
const PAGE_SIZE = 50

export default function Subscribers() {
  const { db, log, token, role } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: Subscriber[]; total: number }>({ items: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Subscriber | null>(null)
  const [form, setForm] = useState<Omit<Subscriber, 'id'>>(empty)
  const timer = useRef<number | undefined>(undefined)

  const planName = (id: string) => db.plans.find(p => p.id === id)?.name ?? '—'
  const routerName = (id: string) => db.routers.find(r => r.id === id)?.name ?? '—'
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  const load = (pageNum: number, qStr: string, status: string) => {
    if (!token) return
    setLoading(true)
    apiSubscribers<Subscriber>(token, { page: pageNum, q: qStr || undefined, status: status !== 'all' ? status : undefined })
      .then(r => setData({ items: (r as any).items, total: (r as any).total }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  const debounce = (pg: number, qStr: string, st: string) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => load(pg, qStr, st), 250)
  }
  useEffect(() => { setPage(1); debounce(1, q, statusF) }, [q, token, statusF]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page, q, statusF) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setEditing(null); setForm({ ...empty, planId: db.plans[0]?.id ?? '', routerId: db.routers[0]?.id ?? '' }); setModal(true) }
  const openEdit = (s: Subscriber) => { setEditing(s); setForm({ ...s }); setModal(true) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (editing) {
      await apiSubUpdate(token, editing.id, form)
      log('update', 'subscriber', `Updated subscriber ${form.name}`)
    } else {
      await apiSubCreate(token, { ...form, createdAt: new Date().toISOString() })
      log('create', 'subscriber', `Added subscriber ${form.name} (${form.username})`)
    }
    setModal(false)
    load(page, q, statusF)
  }

  const setStatus = async (s: Subscriber, status: SubscriberStatus) => {
    if (!token) return
    await apiSubUpdate(token, s.id, { status })
    log('update', 'subscriber', `${status === 'active' ? 'Activated' : 'Suspended'} ${s.name}`)
    load(page, q, statusF)
  }

  const remove = async (s: Subscriber) => {
    if (!token || !confirm(`Delete subscriber ${s.name}?`)) return
    try {
      await apiSubDelete(token, s.id)
      log('delete', 'subscriber', `Deleted subscriber ${s.name}`)
      load(page, q, statusF)
    } catch { alert(role === 'admin' || role === 'manager' ? '' : 'Only managers/admins can delete subscribers') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Subscribers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.total.toLocaleString()} accounts · page {page} of {pages}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" disabled={!data.items.length} onClick={() => downloadCSV('subscribers.csv', ['Name', 'Username', 'Phone', 'Type', 'Plan', 'Status', 'Balance'], data.items.map(s => [s.name, s.username, s.phone, s.serviceType, planName(s.planId), s.status, s.balance]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ Add subscriber</button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56">
            <input className="input" value={q} onChange={e => { setQ(e.target.value); }} placeholder="Search name, username, phone…" />
          </div>
          <select className="input !w-auto" value={statusF} onChange={e => { setStatusF(e.target.value); }}>
            <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="new">New</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700/60">
                <th className="px-5 py-2.5">Subscriber</th><th className="px-5 py-2.5">Contact</th><th className="px-5 py-2.5">Plan</th><th className="px-5 py-2.5">Router</th><th className="px-5 py-2.5">Status</th><th className="px-5 py-2.5 text-right">Balance</th><th className="px-5 py-2.5 text-right">Expires</th><th className="px-5 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(s => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-2.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-slate-400 font-mono">@{s.username} · <span className="uppercase">{s.serviceType}</span></div>
                  </td>
                  <td className="px-5 py-2.5 text-xs"><div>{s.phone}</div><div className="text-slate-400">{s.email}</div></td>
                  <td className="px-5 py-2.5 text-xs font-medium">{planName(s.planId)}</td>
                  <td className="px-5 py-2.5 text-xs">{routerName(s.routerId)}</td>
                  <td className="px-5 py-2.5"><Badge color={statusColor(s.status)}>{s.status}</Badge></td>
                  <td className={`px-5 py-2.5 text-xs text-right font-semibold ${s.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmtMoney(s.balance)}</td>
                  <td className="px-5 py-2.5 text-xs text-right">{fmtDate(s.expiresAt)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === 'suspended' ? (
                        <button className="btn-ghost !px-2 !py-1 !text-[11px] text-emerald-500" onClick={() => setStatus(s, 'active')}>Activate</button>
                      ) : (
                        <button className="btn-ghost !px-2 !py-1 !text-[11px] text-amber-500" onClick={() => setStatus(s, 'suspended')}>Suspend</button>
                      )}
                      <button className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn-ghost !px-2 !py-1 !text-[11px] text-rose-500" onClick={() => remove(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan={8} className="px-5 py-4 text-xs text-center text-slate-400">Loading…</td></tr>}
              {!loading && !data.items.length && <tr><td colSpan={8} className="px-5 py-4 text-xs text-center text-slate-400">No subscribers match the filters</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-xs">
          <span className="text-slate-400">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)}</span>
          <div className="flex gap-1">
            <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
            <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {[page - 2, page - 1, page, page + 1, page + 2].filter(p => p >= 1 && p <= pages).map(p => (
              <button key={p} className={`!px-2 !py-1 rounded-lg ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn-ghost !px-2 !py-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="btn-ghost !px-2 !py-1" disabled={page >= pages} onClick={() => setPage(pages)}>»</button>
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : 'Add subscriber'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className="input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username"><input className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Service type">
              <select className="input" value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value as ServiceType })}>
                <option value="pppoe">PPPoE</option><option value="hotspot">Hotspot</option><option value="static">Static IP</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
                {db.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Router">
              <select className="input" value={form.routerId} onChange={e => setForm({ ...form, routerId: e.target.value })}>
                {db.routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as SubscriberStatus })}>
                <option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option><option value="expired">Expired</option>
              </select>
            </Field>
            <Field label="Balance (KES)"><input className="input" type="number" value={form.balance} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="MAC"><input className="input" value={form.mac} onChange={e => setForm({ ...form, mac: e.target.value })} /></Field>
            <Field label="IP"><input className="input" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Add subscriber'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}