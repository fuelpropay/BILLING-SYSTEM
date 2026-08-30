import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, fmtDateTime, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { Donut } from '../components/charts'
import type { PaymentMethod } from '../types'

const methodColor: Record<string, 'green' | 'purple' | 'blue' | 'amber' | 'slate'> = {
  mpesa: 'green', card: 'purple', cash: 'blue', voucher: 'amber', bank: 'slate',
}

export default function Payments() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [methodF, setMethodF] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ subscriberId: '', amount: 0, method: 'mpesa' as PaymentMethod, reference: '' })

  const subName = (id: string) => db.subscribers.find(s => s.id === id)?.name ?? '—'

  const rows = useMemo(() => db.payments.filter(p => {
    const text = `${p.receipt} ${p.reference} ${subName(p.subscriberId)}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (methodF === 'all' || p.method === methodF)
  }), [db.payments, q, methodF, db.subscribers])

  const total = rows.reduce((s, p) => s + p.amount, 0)

  const byMethod = (['mpesa', 'card', 'cash', 'voucher', 'bank'] as PaymentMethod[]).map(m => ({
    label: m.toUpperCase(),
    value: db.payments.filter(p => p.method === m).reduce((s, p) => s + p.amount, 0),
  })).filter(d => d.value > 0)

  const record = (e: React.FormEvent) => {
    e.preventDefault()
    const payment = {
      id: uid(),
      receipt: `RCPT-${88300 + db.payments.length + 1}`,
      subscriberId: form.subscriberId,
      invoiceId: null as string | null,
      amount: form.amount,
      method: form.method,
      reference: form.reference || `${form.method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    }
    update(d => {
      // auto-settle the oldest unpaid invoice for this subscriber
      const open = d.invoices.filter(i => i.subscriberId === form.subscriberId && i.status !== 'paid').sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))
      let remaining = form.amount
      const invoices = d.invoices.map(i => {
        if (!open.find(o => o.id === i.id) || remaining <= 0) return i
        const due = i.amount - i.paidAmount
        const applied = Math.min(due, remaining)
        remaining -= applied
        const paidAmount = i.paidAmount + applied
        return { ...i, paidAmount, status: (paidAmount >= i.amount ? 'paid' : 'partial') as 'paid' | 'partial' }
      })
      if (open[0] && payment.amount >= open[0].amount - open[0].paidAmount) payment.invoiceId = open[0].id
      const subscribers = d.subscribers.map(s => s.id === form.subscriberId
        ? { ...s, balance: Math.max(0, s.balance - form.amount), status: s.balance - form.amount <= 0 && s.status === 'expired' ? 'active' as const : s.status }
        : s)
      return { ...d, payments: [payment, ...d.payments], invoices, subscribers }
    })
    log('create', 'payment', `Recorded ${fmtMoney(form.amount)} via ${form.method.toUpperCase()} for ${subName(form.subscriberId)}`)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} transactions · {fmtMoney(total)}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('payments.csv', ['Receipt', 'Subscriber', 'Amount', 'Method', 'Reference', 'Date'], rows.map(p => [p.receipt, subName(p.subscriberId), p.amount, p.method, p.reference, fmtDateTime(p.createdAt)]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={() => { setForm({ subscriberId: db.subscribers[0]?.id ?? '', amount: 0, method: 'mpesa', reference: '' }); setModal(true) }}>+ Record payment</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Revenue by method" subtitle="All time">
          <Donut data={byMethod} />
        </Card>
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search receipt, reference, subscriber…" /></div>
              <select className="input !w-auto" value={methodF} onChange={e => setMethodF(e.target.value)}>
                <option value="all">All methods</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="cash">Cash</option><option value="voucher">Voucher</option><option value="bank">Bank</option>
              </select>
            </div>
            <div className="overflow-x-auto -mx-5 max-h-[520px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-900"><tr>
                  <th className="th pl-5">Receipt</th><th className="th">Subscriber</th><th className="th">Method</th><th className="th">Reference</th><th className="th">Amount</th><th className="th pr-5">Date</th>
                </tr></thead>
                <tbody>
                  {rows.map(p => (
                    <tr key={p.id} className="tr">
                      <td className="td pl-5 font-mono text-xs font-semibold">{p.receipt}</td>
                      <td className="td font-medium text-slate-800 dark:text-slate-100">{subName(p.subscriberId)}</td>
                      <td className="td"><Badge color={methodColor[p.method]}>{p.method.toUpperCase()}</Badge></td>
                      <td className="td font-mono text-xs text-slate-500 dark:text-slate-400">{p.reference}</td>
                      <td className="td font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(p.amount)}</td>
                      <td className="td pr-5 text-xs">{fmtDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <EmptyState text="No payments match your filters." />}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record payment">
        <form onSubmit={record} className="space-y-4">
          <Field label="Subscriber">
            <select className="input" value={form.subscriberId} onChange={e => setForm({ ...form, subscriberId: e.target.value })}>
              {db.subscribers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
            </select>
          </Field>
          <Field label="Amount (KES)"><input className="input" type="number" min={1} required value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Method">
            <select className="input" value={form.method} onChange={e => setForm({ ...form, method: e.target.value as PaymentMethod })}>
              <option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="cash">Cash</option><option value="voucher">Voucher</option><option value="bank">Bank transfer</option>
            </select>
          </Field>
          <Field label="Reference (optional)"><input className="input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. QK12345XYZ" /></Field>
          <p className="text-xs text-slate-400">Payments automatically settle the subscriber's oldest unpaid invoice and clear their balance.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Record payment</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
