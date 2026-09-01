import React, { useMemo, useState } from 'react'
import { useStore, fmtDateTime, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { useNames, SubSelect } from '../apiUse'
import type { BoundDevice } from '../types'

const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

export default function Devices() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ subscriberId: '', label: '', mac: '' })
  const { name: subName } = useNames(db.devices.map(d => d.subscriberId))

  const rows = useMemo(() => db.devices.filter(dv => {
    const text = `${dv.label} ${dv.mac} ${dv.ip} ${subName(dv.subscriberId)}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (filter === 'all' || (filter === 'blocked' ? dv.blocked : !dv.blocked))
  }), [db.devices, subName, q, filter])

  const totalDown = db.devices.reduce((s, d) => s + d.dataDownMB, 0)
  const totalUp = db.devices.reduce((s, d) => s + d.dataUpMB, 0)
  const blocked = db.devices.filter(d => d.blocked).length

  const toggleBlock = (dv: BoundDevice) => {
    update(d => ({ ...d, devices: d.devices.map(x => x.id === dv.id ? { ...x, blocked: !x.blocked } : x) }))
    log('update', 'device', `${dv.blocked ? 'Unblocked' : 'Blocked'} device ${dv.mac} (${subName(dv.subscriberId)})`)
  }

  const remove = (dv: BoundDevice) => {
    if (!confirm(`Unbind ${dv.label} (${dv.mac}) from ${subName(dv.subscriberId)}?`)) return
    update(d => ({ ...d, devices: d.devices.filter(x => x.id !== dv.id) }))
    log('delete', 'device', `Unbound device ${dv.mac} from ${subName(dv.subscriberId)}`)
  }

  const bind = (e: React.FormEvent) => {
    e.preventDefault()
    const mac = form.mac.trim().toUpperCase()
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) { alert('Enter a valid MAC address, e.g. DE:AD:BE:EF:00:11'); return }
    if (db.devices.some(d => d.mac === mac)) { alert('This MAC address is already bound to an account.'); return }
    const subNameStr = form.subscriberId ? subName(form.subscriberId) : '—'
    const device: BoundDevice = {
      id: uid(), subscriberId: form.subscriberId, label: form.label || 'Unknown device', mac,
      ip: `10.30.9.${10 + (db.devices.length % 200)}`, blocked: false, dataDownMB: 0, dataUpMB: 0, lastSeenAt: new Date().toISOString(),
    }
    update(d => ({ ...d, devices: [device, ...d.devices] }))
    log('create', 'device', `Bound ${mac} (${device.label}) to ${subNameStr}`)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Devices & Binding</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">MAC-bound subscriber devices with live bandwidth accounting</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('devices.csv', ['Subscriber', 'Device', 'MAC', 'IP', 'Down MB', 'Up MB', 'Blocked', 'Last seen'],
            rows.map(dv => [subName(dv.subscriberId), dv.label, dv.mac, dv.ip, dv.dataDownMB, dv.dataUpMB, dv.blocked ? 'yes' : 'no', fmtDateTime(dv.lastSeenAt)]))}>
            Export CSV
          </button>
          <button className="btn-primary !text-xs" onClick={() => { setForm({ subscriberId: '', label: '', mac: '' }); setModal(true) }}>+ Bind device</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bound devices</div><div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{db.devices.length}</div><div className="text-xs text-slate-400 mt-1">{blocked} blocked</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total download</div><div className="text-2xl font-extrabold text-brand-500 mt-1">{fmtMB(totalDown)}</div><div className="text-xs text-slate-400 mt-1">across all devices</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total upload</div><div className="text-2xl font-extrabold text-emerald-500 mt-1">{fmtMB(totalUp)}</div><div className="text-xs text-slate-400 mt-1">across all devices</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search device, MAC, IP, subscriber…" /></div>
          <select className="input !w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All devices</option><option value="allowed">Allowed</option><option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Device</th><th className="th">Subscriber</th><th className="th">MAC / IP</th><th className="th">Download</th><th className="th">Upload</th><th className="th">Last seen</th><th className="th">Status</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 100).map(dv => (
                <tr key={dv.id} className="tr">
                  <td className="td pl-5 font-semibold">{dv.label}</td>
                  <td className="td text-xs">{subName(dv.subscriberId)}</td>
                  <td className="td"><div className="font-mono text-xs">{dv.mac}</div><div className="font-mono text-[10px] text-slate-400">{dv.ip}</div></td>
                  <td className="td text-xs font-semibold text-brand-500">{fmtMB(dv.dataDownMB)}</td>
                  <td className="td text-xs text-slate-500 dark:text-slate-400">{fmtMB(dv.dataUpMB)}</td>
                  <td className="td text-xs">{fmtDateTime(dv.lastSeenAt)}</td>
                  <td className="td"><Badge color={dv.blocked ? 'red' : 'green'}>{dv.blocked ? 'blocked' : 'allowed'}</Badge></td>
                  <td className="td pr-5">
                    <div className="flex gap-2 text-xs font-semibold">
                      <button className={`${dv.blocked ? 'text-emerald-500' : 'text-amber-500'} hover:underline`} onClick={() => toggleBlock(dv)}>{dv.blocked ? 'Unblock' : 'Block'}</button>
                      <button className="text-rose-500 hover:underline" onClick={() => remove(dv)}>Unbind</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No devices match your filters." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Bind device to subscriber">
        <form onSubmit={bind} className="space-y-4">
          <Field label="Subscriber">
            <SubSelect value={form.subscriberId} onChange={v => setForm({ ...form, subscriberId: v })} />
          </Field>
          <Field label="Device label"><input className="input" required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. iPhone 15" /></Field>
          <Field label="MAC address"><input className="input font-mono uppercase" required value={form.mac} onChange={e => setForm({ ...form, mac: e.target.value })} placeholder="DE:AD:BE:EF:00:11" /></Field>
          <p className="text-xs text-slate-400">Only bound devices can authenticate on this subscriber's account. Duplicate MAC addresses are rejected.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Bind device</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
