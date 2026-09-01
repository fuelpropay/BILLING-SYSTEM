import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Modal, Field, EmptyState } from '../components/ui'
import type { IpPool } from '../types'

function count(cidr: string) {
  const [, bits] = cidr.split('/').map(Number)
  if (!bits || bits > 32) return 0
  const n = 2 ** (32 - bits)
  return n >= 4 ? n - 2 : n
}

export default function IpPools() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', cidr: '', routerId: '', purpose: 'pppoe' as IpPool['purpose'], excluded: '' })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const p: IpPool = { id: uid(), ...form }
    update(d => ({ ...d, ipPools: [...d.ipPools, p] }))
    log('create', 'ip-pool', `Added IP pool ${form.name} (${form.cidr})`)
    setModal(false)
  }
  const remove = (p: IpPool) => {
    if (!confirm(`Delete IP pool "${p.name}"?`)) return
    update(d => ({ ...d, ipPools: d.ipPools.filter(x => x.id !== p.id) }))
    log('delete', 'ip-pool', `Deleted IP pool ${p.name}`)
  }

  return (
    <div className="space-y-4">
      <Card title="IP Pools" subtitle="Address allocation per router — usage % tracks live sessions on that subnet" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Add pool</button>}>
        {!db.ipPools.length && <EmptyState text="No IP pools defined yet." />}
        {!!db.ipPools.length && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Name</th><th className="py-2 px-3">CIDR</th><th className="py-2 px-3">Router</th><th className="py-2 px-3">Purpose</th><th className="py-2 px-3">Excluded</th><th className="py-2 px-3">Free/total</th><th className="py-2 px-3" /></tr></thead>
            <tbody>
              {db.ipPools.map(p => {
                const total = count(p.cidr)
                return (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-semibold">{p.name}</td>
                    <td className="py-2 px-3 font-mono text-xs">{p.cidr}</td>
                    <td className="py-2 px-3">{db.routers.find(r => r.id === p.routerId)?.name ?? p.routerId}</td>
                    <td className="py-2 px-3 capitalize">{p.purpose}</td>
                    <td className="py-2 px-3 font-mono text-xs">{p.excluded || 'none'}</td>
                    <td className="py-2 px-3">{total.toLocaleString()} usable</td>
                    <td className="py-2 px-3 text-right"><button onClick={() => remove(p)} className="text-xs text-rose-500 hover:underline">Delete</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add IP pool">
        <form onSubmit={add} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PPPoE-East" required /></Field>
          <Field label="CIDR"><input className="input" value={form.cidr} onChange={e => setForm({ ...form, cidr: e.target.value })} placeholder="10.10.0.0/20" required /></Field>
          <Field label="Router"><select className="input" value={form.routerId} onChange={e => setForm({ ...form, routerId: e.target.value })} required><option value="">Select…</option>{db.routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
          <Field label="Purpose"><select className="input" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value as IpPool['purpose'] })}><option value="pppoe">PPPoE</option><option value="hotspot">Hotspot</option><option value="static">Static</option></select></Field>
          <Field label="Exclude from allocation (optional)"><input className="input" value={form.excluded} onChange={e => setForm({ ...form, excluded: e.target.value })} placeholder="10.10.0.1,10.10.0.2" /></Field>
          <button type="submit" className="btn-primary w-full">Add pool</button>
        </form>
      </Modal>
    </div>
  )
}

