import React, { useMemo, useState } from 'react'
import { useStore, fmtDate, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import type { Voucher } from '../types'

const genCode = () => `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

export default function Vouchers() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [modal, setModal] = useState(false)
  const [redeemModal, setRedeemModal] = useState(false)
  const [form, setForm] = useState({ planId: '', count: 10, batch: '' })
  const [redeem, setRedeem] = useState({ code: '', subscriberId: '' })
  const [redeemMsg, setRedeemMsg] = useState('')

  const planName = (id: string) => db.plans.find(p => p.id === id)?.name ?? '—'

  const rows = useMemo(() => db.vouchers.filter(v => {
    const text = `${v.code} ${v.batch} ${planName(v.planId)} ${v.usedBy ?? ''}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (statusF === 'all' || v.status === statusF)
  }), [db.vouchers, q, statusF, db.plans])

  const stats = {
    unused: db.vouchers.filter(v => v.status === 'unused').length,
    used: db.vouchers.filter(v => v.status === 'used').length,
    expired: db.vouchers.filter(v => v.status === 'expired').length,
  }

  const generate = (e: React.FormEvent) => {
    e.preventDefault()
    const batch = form.batch || `BATCH-${new Date().toISOString().slice(0, 10)}`
    const batch_: Voucher[] = Array.from({ length: form.count }, () => ({
      id: uid(), code: genCode(), planId: form.planId, batch, status: 'unused', createdAt: new Date().toISOString(), usedBy: null,
    }))
    update(d => ({ ...d, vouchers: [...batch_, ...d.vouchers] }))
    log('create', 'voucher', `Generated ${form.count} vouchers in batch ${batch}`)
    setModal(false)
  }

  const doRedeem = (e: React.FormEvent) => {
    e.preventDefault()
    const v = db.vouchers.find(x => x.code.toUpperCase() === redeem.code.trim().toUpperCase())
    if (!v) { setRedeemMsg('Voucher code not found.'); return }
    if (v.status !== 'unused') { setRedeemMsg(`Voucher is already ${v.status}.`); return }
    const sub = db.subscribers.find(s => s.id === redeem.subscriberId)
    const plan = db.plans.find(p => p.id === v.planId)
    update(d => ({
      ...d,
      vouchers: d.vouchers.map(x => x.id === v.id ? { ...x, status: 'used', usedBy: sub?.name ?? 'unknown' } : x),
      subscribers: d.subscribers.map(s => s.id === redeem.subscriberId
        ? { ...s, status: 'active', planId: v.planId, expiresAt: new Date(Date.now() + (plan?.validityDays ?? 1) * 86400000).toISOString() }
        : s),
    }))
    log('update', 'voucher', `Redeemed ${v.code} for ${sub?.name}`)
    setRedeemMsg(`Success! ${sub?.name} activated on ${plan?.name} for ${plan?.validityDays} day(s).`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Vouchers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{stats.unused} unused · {stats.used} used · {stats.expired} expired</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('vouchers.csv', ['Code', 'Plan', 'Batch', 'Status', 'Created', 'Used by'], rows.map(v => [v.code, planName(v.planId), v.batch, v.status, fmtDate(v.createdAt), v.usedBy ?? '']))}>Export CSV</button>
          <button className="btn-ghost !text-xs" onClick={() => { setRedeem({ code: '', subscriberId: db.subscribers[0]?.id ?? '' }); setRedeemMsg(''); setRedeemModal(true) }}>Redeem voucher</button>
          <button className="btn-primary !text-xs" onClick={() => { setForm({ planId: db.plans.find(p => p.serviceType === 'hotspot')?.id ?? db.plans[0]?.id ?? '', count: 10, batch: '' }); setModal(true) }}>+ Generate batch</button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search code, batch, plan, user…" /></div>
          <select className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All statuses</option><option value="unused">Unused</option><option value="used">Used</option><option value="expired">Expired</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Code</th><th className="th">Plan</th><th className="th">Batch</th><th className="th">Status</th><th className="th">Created</th><th className="th pr-5">Used by</th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 100).map(v => (
                <tr key={v.id} className="tr">
                  <td className="td pl-5 font-mono text-xs font-bold tracking-wider">{v.code}</td>
                  <td className="td">{planName(v.planId)}</td>
                  <td className="td text-xs text-slate-500 dark:text-slate-400">{v.batch}</td>
                  <td className="td"><Badge color={statusColor(v.status)}>{v.status}</Badge></td>
                  <td className="td text-xs">{fmtDate(v.createdAt)}</td>
                  <td className="td pr-5 text-xs">{v.usedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No vouchers match your filters." />}
          {rows.length > 100 && <p className="text-xs text-slate-400 text-center py-3">Showing first 100 of {rows.length} — refine your search.</p>}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate voucher batch">
        <form onSubmit={generate} className="space-y-4">
          <Field label="Plan">
            <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
              {db.plans.filter(p => p.serviceType === 'hotspot').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Number of vouchers"><input className="input" type="number" min={1} max={500} required value={form.count} onChange={e => setForm({ ...form, count: Number(e.target.value) })} /></Field>
          <Field label="Batch name (optional)"><input className="input" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} placeholder="e.g. OCT-KIOSK-A" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Generate</button>
          </div>
        </form>
      </Modal>

      <Modal open={redeemModal} onClose={() => setRedeemModal(false)} title="Redeem voucher">
        <form onSubmit={doRedeem} className="space-y-4">
          {redeemMsg && <div className={`text-sm rounded-lg px-3 py-2 border ${redeemMsg.startsWith('Success') ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'}`}>{redeemMsg}</div>}
          <Field label="Voucher code"><input className="input font-mono" required value={redeem.code} onChange={e => setRedeem({ ...redeem, code: e.target.value })} placeholder="XXXX-XXXX" /></Field>
          <Field label="Subscriber">
            <select className="input" value={redeem.subscriberId} onChange={e => setRedeem({ ...redeem, subscriberId: e.target.value })}>
              {db.subscribers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setRedeemModal(false)}>Close</button>
            <button type="submit" className="btn-primary">Redeem</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
