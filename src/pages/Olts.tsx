import React, { useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, downloadCSV } from '../components/ui'
import type { OLT } from '../types'

export default function Olts() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<OLT | null>(null)
  const [form, setForm] = useState({ name: '', vendor: 'ZTE', ip: '', location: '', routerId: '', ports: 8 })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', vendor: 'ZTE', ip: '', location: '', routerId: db.routers[0]?.id ?? '', ports: 8 })
    setModal(true)
  }
  const openEdit = (o: OLT) => {
    setEditing(o)
    setForm({ name: o.name, vendor: o.vendor, ip: o.ip, location: o.location, routerId: o.routerId, ports: o.ports })
    setModal(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const base = { name: form.name, vendor: form.vendor, ip: form.ip, location: form.location, routerId: form.routerId, ports: form.ports, lastPollAt: new Date().toISOString() }
    if (editing) {
      update(d => ({ ...d, olts: d.olts.map(o => o.id === editing.id ? { ...o, ...base } : o) }))
      log('update', 'olt', `Updated ${form.name}`)
    } else {
      update(d => ({ ...d, olts: [...d.olts, { id: uid(), ...base, onusOnline: 0, onusTotal: 0, snmpOk: true }] }))
      log('create', 'olt', `Registered OLT ${form.name}`)
    }
    setModal(false)
  }

  const poll = (o: OLT) => {
    const lost = o.snmpOk ? Math.floor(Math.min(o.onusTotal, o.onusOnline) * 0.05) : 0
    const onusOnline = o.snmpOk ? Math.max(o.onusTotal - (o.onusTotal > 60 ? 2 : 0), 0) : Math.max(o.onusTotal - 3, 0)
    update(d => ({ ...d, olts: d.olts.map(x => x.id === o.id ? { ...x, snmpOk: true, onusOnline, lastPollAt: new Date().toISOString() } : x) }))
    log('update', 'olt', `SNMP poll OK on ${o.name} — ${onusOnline}/${o.onusTotal} ONUs online`)
  }

  const remove = (o: OLT) => {
    if (!confirm(`Delete ${o.name}?`)) return
    update(d => ({ ...d, olts: d.olts.filter(x => x.id !== o.id) }))
    log('delete', 'olt', `Removed OLT ${o.name}`)
  }

  const routerName = (id: string) => db.routers.find(r => r.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">OLT & Fiber</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">SNMP health and ONU counts for your fiber OLTs</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('olts.csv', ['Name', 'Vendor', 'IP', 'Location', 'Router', 'Ports', 'ONUs online', 'ONUs total', 'SNMP'],
            db.olts.map(o => [o.name, o.vendor, o.ip, o.location, routerName(o.routerId), o.ports, o.onusOnline, o.onusTotal, o.snmpOk ? 'OK' : 'FAIL']))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ Register OLT</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {db.olts.map(o => (
          <Card key={o.id} className="!p-0">
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{o.name}</div>
                  <div className="text-xs text-slate-400">{o.vendor} · {o.ip} · {o.location}</div>
                </div>
                <Badge color={o.snmpOk ? 'green' : 'red'}>{o.snmpOk ? 'SNMP OK' : 'SNMP FAIL'}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div><span className="text-slate-400">Ports</span><div className="font-semibold">{o.ports}</div></div>
                <div><span className="text-slate-400">ONUs online</span><div className="font-semibold text-emerald-500">{o.onusOnline} / {o.onusTotal}</div></div>
                <div><span className="text-slate-400">Router uplink</span><div className="font-semibold">{routerName(o.routerId)}</div></div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full ${o.snmpOk ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${o.onusTotal > 0 ? (o.onusOnline / o.onusTotal) * 100 : 0}%` }} />
              </div>
              <div className="mt-3 text-[10px] text-slate-400">Last SNMP poll {fmtDateTime(o.lastPollAt)}</div>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              <button className="btn-ghost !text-xs flex-1" onClick={() => poll(o)}>Poll now</button>
              <button className="btn-ghost !text-xs flex-1" onClick={() => openEdit(o)}>Edit</button>
              <button className="btn-ghost !text-xs flex-1 !text-rose-500" onClick={() => remove(o)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
      {db.olts.length === 0 && <EmptyState text="No OLTs registered. Add one to start fiber monitoring." />}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : 'Register OLT'}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Vendor">
            <select className="input" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}>
              {['ZTE', 'Huawei', 'FiberHome', 'Other'].map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="IP address"><input className="input font-mono" required value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></Field>
          <Field label="Location"><input className="input" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Router uplink">
            <select className="input" value={form.routerId} onChange={e => setForm({ ...form, routerId: e.target.value })}>
              {db.routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Ports"><input className="input" type="number" min={1} value={form.ports} onChange={e => setForm({ ...form, ports: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Register'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
