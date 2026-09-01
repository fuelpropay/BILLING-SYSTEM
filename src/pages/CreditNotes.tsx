import React, { useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { useNames } from '../apiUse'
import type { CreditNote } from '../types'

export default function CreditNotes() {
  const { db, update, log, actor } = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ invoiceId: '', subscriberId: '', amount: 0, reason: '' })

  const rows = db.creditNotes.filter(c => `${c.number} ${c.reason}`.toLowerCase().includes(q.toLowerCase()))
  const subName = useNames(rows.map(c => c.subscriberId)).name
  const subLabel = (id: string) => { const n = subName(id); return n !== '—' ? n : id }

  const issue = (e: React.FormEvent) => {
    e.preventDefault()
    const cn: CreditNote = { id: uid(), number: `CN-${(1000 + db.creditNotes.length + 1)}`, ...form, issuedBy: actor, createdAt: new Date().toISOString(), status: 'applied' }
    update(d => ({
      ...d,
      creditNotes: [cn, ...d.creditNotes],
      invoices: d.invoices.map(i => i.id === form.invoiceId && cn.status === 'applied'
        ? { ...i, balance: Math.max(0, (i.balance ?? i.amount) - cn.amount), status: (i.balance ?? i.amount) - cn.amount <= 0 ? 'paid' : i.status } : i),
    }))
    log('create', 'credit-note', `Issued ${cn.number} for ${subLabel(form.subscriberId)} (${fmtMoney(form.amount)})`)
    setModal(false)
  }

  const voidNote = (c: CreditNote) => {
    if (!confirm(`Void credit note ${c.number}?`)) return
    update(d => ({ ...d, creditNotes: d.creditNotes.map(x => x.id === c.id ? { ...x, status: 'void' as const } : x) }))
    log('update', 'credit-note', `Voided ${c.number}`)
  }

  return (
    <div className="space-y-4">
      <Card
        title="Credit Notes"
        subtitle="Reduce invoice balances with issued credits"
        action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Issue credit note</button>}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search credit notes…" />
          <button className="btn-secondary !py-1.5 text-xs" onClick={() => downloadCSV('credit-notes.csv', ['No.', 'Subscriber', 'Invoice', 'Amount', 'Reason', 'Status', 'Issued'], rows.map(c => [c.number, subLabel(c.subscriberId), c.invoiceId, c.amount, c.reason, c.status, fmtDate(c.createdAt)]))}>Export CSV</button>
        </div>
        {!rows.length && <EmptyState text="No credit notes issued yet." />}
        <div className="overflow-x-auto">
          {!!rows.length && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Number</th><th className="py-2 px-3">Subscriber</th><th className="py-2 px-3">Invoice</th><th className="py-2 px-3">Amount</th><th className="py-2 px-3">Reason</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Issued</th><th className="py-2 px-3" /></tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-mono text-xs">{c.number}</td>
                    <td className="py-2 px-3">{subLabel(c.subscriberId)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{db.invoices.find(i => i.id === c.invoiceId)?.number ?? c.invoiceId}</td>
                    <td className="py-2 px-3">{fmtMoney(c.amount)}</td>
                    <td className="py-2 px-3">{c.reason}</td>
                    <td className="py-2 px-3"><Badge color={c.status === 'applied' ? 'green' : c.status === 'void' ? 'red' : 'slate'}>{c.status}</Badge></td>
                    <td className="py-2 px-3 text-xs">{fmtDate(c.createdAt)}</td>
                    <td className="py-2 px-3 text-right">{c.status !== 'void' && <button onClick={() => voidNote(c)} className="text-xs text-rose-500 hover:underline">Void</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Issue credit note">
        <form onSubmit={issue} className="space-y-3">
          <Field label="Subscriber ID"><input className="input" value={form.subscriberId} onChange={e => setForm({ ...form, subscriberId: e.target.value })} placeholder="b1000" required /></Field>
          <Field label="Invoice"><select className="input" value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })} required><option value="">Select invoice…</option>{db.invoices.slice(0, 100).map(i => <option key={i.id} value={i.id}>{i.number ?? i.id} · {fmtMoney(i.amount)}</option>)}</select></Field>
          <Field label="Amount (KES)"><input className="input" type="number" min={1} value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} required /></Field>
          <Field label="Reason"><input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Service outage compensation…" required /></Field>
          <button type="submit" className="btn-primary w-full">Issue</button>
        </form>
      </Modal>
    </div>
  )
}
