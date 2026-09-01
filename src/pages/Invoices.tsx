import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { useNames, SubSelect } from '../apiUse'
import { apiBulkInvoices } from '../api'
import type { Invoice } from '../types'

export default function Invoices() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ subscriberId: '', amount: 0, note: '', dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
  const { token } = useStore()

  const { name: subName } = useNames(db.invoices.map(i => i.subscriberId))
  const rows = useMemo(() => db.invoices.filter(i => {
    const text = `${i.number} ${subName(i.subscriberId)} ${i.note}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (statusF === 'all' || i.status === statusF)
  }), [db.invoices, q, statusF, subName])

  const totals = useMemo(() => ({
    paid: db.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.paidAmount, 0),
    unpaid: db.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0),
  }), [db.invoices])

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    const inv: Invoice = {
      id: uid(),
      number: `INV-${2400 + db.invoices.length + 1}`,
      subscriberId: form.subscriberId,
      amount: form.amount,
      paidAmount: 0,
      status: 'unpaid',
      issuedAt: new Date().toISOString(),
      dueAt: new Date(form.dueAt).toISOString(),
      note: form.note,
    }
    update(d => ({ ...d, invoices: [inv, ...d.invoices] }))
    log('create', 'invoice', `Created ${inv.number} for ${subName(form.subscriberId)} (${fmtMoney(form.amount)})`)
    setModal(false)
  }

  const markPaid = (inv: Invoice) => {
    update(d => ({
      ...d,
      invoices: d.invoices.map(i => i.id === inv.id ? { ...i, status: 'paid', paidAmount: i.amount } : i),
      payments: [{
        id: uid(), receipt: `RCPT-${88300 + d.payments.length + 1}`, subscriberId: inv.subscriberId, invoiceId: inv.id,
        amount: inv.amount - inv.paidAmount, method: 'cash', reference: 'MANUAL-SETTLE', createdAt: new Date().toISOString(),
      }, ...d.payments],
    }))
    log('update', 'invoice', `Marked ${inv.number} as paid`)
  }

  const remove = (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.number}?`)) return
    update(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== inv.id) }))
    log('delete', 'invoice', `Deleted invoice ${inv.number}`)
  }

  const generateMonthly = async () => {
    if (!token) return
    try {
      const r = (await apiBulkInvoices(token)) as any
      if (r?.added) alert(`Generated ${r.added} invoices for active PPPoE subscribers.`)
      else alert(r?.error ?? 'Bulk generation failed')
    } catch { alert('Bulk generation failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Collected {fmtMoney(totals.paid)} · Outstanding {fmtMoney(totals.unpaid)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('invoices.csv', ['Number', 'Subscriber', 'Amount', 'Paid', 'Status', 'Issued', 'Due'], rows.map(i => [i.number, subName(i.subscriberId), i.amount, i.paidAmount, i.status, fmtDate(i.issuedAt), fmtDate(i.dueAt)]))}>Export CSV</button>
          <button className="btn-ghost !text-xs" onClick={generateMonthly}>Generate monthly invoices</button>
          <button className="btn-primary !text-xs" onClick={() => { setForm({ ...form, subscriberId: '' }); setModal(true) }}>+ New invoice</button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search number, subscriber, note…" /></div>
          <select className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All statuses</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Number</th><th className="th">Subscriber</th><th className="th">Note</th><th className="th">Amount</th><th className="th">Balance</th><th className="th">Status</th><th className="th">Issued</th><th className="th">Due</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(i => (
                <tr key={i.id} className="tr">
                  <td className="td pl-5 font-mono text-xs font-semibold">{i.number}</td>
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{subName(i.subscriberId)}</td>
                  <td className="td text-xs text-slate-500 dark:text-slate-400 max-w-52 truncate">{i.note}</td>
                  <td className="td font-semibold">{fmtMoney(i.amount)}</td>
                  <td className={`td font-semibold ${i.amount - i.paidAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmtMoney(i.amount - i.paidAmount)}</td>
                  <td className="td"><Badge color={statusColor(i.status)}>{i.status}</Badge></td>
                  <td className="td text-xs">{fmtDate(i.issuedAt)}</td>
                  <td className="td text-xs">{fmtDate(i.dueAt)}</td>
                  <td className="td pr-5">
                    <div className="flex gap-2">
                      {i.status !== 'paid' && <button className="text-xs font-semibold text-emerald-600 hover:underline" onClick={() => markPaid(i)}>Mark paid</button>}
                      <button className="text-xs font-semibold text-rose-500 hover:underline" onClick={() => remove(i)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No invoices match your filters." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New invoice">
        <form onSubmit={create} className="space-y-4">
          <Field label="Subscriber">
            <SubSelect value={form.subscriberId} onChange={v => setForm({ ...form, subscriberId: v })} />
          </Field>
          <Field label="Amount (KES)"><input className="input" type="number" min={1} required value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Due date"><input className="input" type="date" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></Field>
          <Field label="Note"><input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Monthly subscription" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create invoice</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
