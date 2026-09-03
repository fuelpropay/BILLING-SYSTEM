import React, { useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { useNames } from '../apiUse'
import type { Refund } from '../types'

export default function Refunds() {
  const { db, update, log, actor } = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ paymentId: '', subscriberId: '', amount: 0, reason: '', method: 'mpesa' })

  const rows = db.refunds.filter(r => `${r.reason} ${r.method}`.toLowerCase().includes(q.toLowerCase()))
  const subName = useNames(rows.map(r => r.subscriberId)).name
  const paidPayments = db.payments.filter(p => p.status === 'confirmed')

  const pick = (paymentId: string) => {
    const p = db.payments.find(x => x.id === paymentId)
    if (p) setForm(f => ({ ...f, paymentId, subscriberId: p.subscriberId, amount: p.amount, method: p.method }))
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const r: Refund = { id: uid(), ...form, status: 'pending', issuedBy: actor, createdAt: new Date().toISOString() }
    update(d => ({ ...d, refunds: [r, ...d.refunds] }))
    log('create', 'refund', `Refund ${fmtMoney(r.amount)} for ${subName(r.subscriberId)} (${r.reason})`)
    setModal(false)
  }

  const setStatus = (id: string, status: Refund['status']) => {
    update(d => ({ ...d, refunds: d.refunds.map(r => r.id === id ? { ...r, status } : r) }))
    log('update', 'refund', `Refund ${id.slice(0, 6)} marked ${status}`)
  }

  const color = (s: string) => s === 'processed' ? 'green' : s === 'rejected' ? 'red' : 'amber'

  return (
    <div className="space-y-4">
      <Card title="Refunds Ledger" subtitle="Sonar-style refunds tied to confirmed payments" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New refund</button>}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search refunds…" />
          <button className="btn-secondary !py-1.5 text-xs" onClick={() => downloadCSV('refunds.csv', ['ID', 'Subscriber', 'Amount', 'Method', 'Reason', 'Status', 'Date'], rows.map(r => [r.id, subName(r.subscriberId), r.amount, r.method, r.reason, r.status, fmtDate(r.createdAt)]))}>Export CSV</button>
        </div>
        {!rows.length && <EmptyState text="No refunds recorded." />}
        <div className="overflow-x-auto">
          {!!rows.length && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Subscriber</th><th className="py-2 px-3">Payment</th><th className="py-2 px-3">Amount</th><th className="py-2 px-3">Method</th><th className="py-2 px-3">Reason</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Date</th><th className="py-2 px-3" /></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3">{subName(r.subscriberId)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{db.payments.find(p => p.id === r.paymentId)?.receipt ?? '—'}</td>
                    <td className="py-2 px-3 font-semibold">{fmtMoney(r.amount)}</td>
                    <td className="py-2 px-3"><Badge color="blue">{r.method}</Badge></td>
                    <td className="py-2 px-3 max-w-48 truncate">{r.reason}</td>
                    <td className="py-2 px-3"><Badge color={color(r.status)}>{r.status}</Badge></td>
                    <td className="py-2 px-3 text-slate-500">{fmtDate(r.createdAt)}</td>
                    <td className="py-2 px-3 text-right space-x-1">
                      {r.status === 'pending' && <>
                        <button className="text-xs text-emerald-500 hover:underline" onClick={() => setStatus(r.id, 'processed')}>Process</button>
                        <button className="text-xs text-rose-500 hover:underline" onClick={() => setStatus(r.id, 'rejected')}>Reject</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New refund">
        <form onSubmit={save} className="space-y-3">
          <Field label="Source payment">
            <select className="input" value={form.paymentId} onChange={e => pick(e.target.value)} required>
              <option value="">Select confirmed payment…</option>
              {paidPayments.slice(0, 50).map(p => <option key={p.id} value={p.id}>{p.receipt} — {fmtMoney(p.amount)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount"><input type="number" min={1} className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required /></Field>
            <Field label="Refund method">
              <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="cash">Cash</option><option value="bank">Bank</option>
              </select>
            </Field>
          </div>
          <Field label="Reason"><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. double charge" required /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Record refund</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
