import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { BarChart } from '../components/charts'
import type { Expense } from '../types'

const categories = ['Bandwidth', 'Equipment', 'Salaries', 'Rent', 'Fuel', 'Maintenance', 'Marketing', 'Other']
const catColors: Record<string, 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'slate'> = {
  Bandwidth: 'blue', Equipment: 'purple', Salaries: 'green', Rent: 'amber', Fuel: 'red', Maintenance: 'slate',
}

export default function Expenses() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [catF, setCatF] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ category: 'Bandwidth', description: '', amount: 0, date: new Date().toISOString().slice(0, 10) })

  const rows = useMemo(() => db.expenses
    .filter(e => `${e.category} ${e.description}`.toLowerCase().includes(q.toLowerCase()) && (catF === 'all' || e.category === catF))
    .sort((a, b) => b.date.localeCompare(a.date)), [db.expenses, q, catF])

  const total = rows.reduce((s, e) => s + e.amount, 0)

  const byCategory = categories
    .map(c => ({ label: c.slice(0, 6), value: db.expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter(d => d.value > 0)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const exp: Expense = { id: uid(), ...form, date: new Date(form.date).toISOString() }
    update(d => ({ ...d, expenses: [exp, ...d.expenses] }))
    log('create', 'expense', `Recorded expense: ${form.description} (${fmtMoney(form.amount)})`)
    setModal(false)
  }

  const remove = (e: Expense) => {
    if (!confirm(`Delete expense "${e.description}"?`)) return
    update(d => ({ ...d, expenses: d.expenses.filter(x => x.id !== e.id) }))
    log('delete', 'expense', `Deleted expense ${e.description}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} records · {fmtMoney(total)}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('expenses.csv', ['Category', 'Description', 'Amount', 'Date'], rows.map(e => [e.category, e.description, e.amount, fmtDate(e.date)]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={() => setModal(true)}>+ Add expense</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Spend by category" subtitle="All time">
          <BarChart data={byCategory} color="#f43f5e" format={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
        </Card>
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search description…" /></div>
              <select className="input !w-auto" value={catF} onChange={e => setCatF(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full">
                <thead><tr><th className="th pl-5">Date</th><th className="th">Category</th><th className="th">Description</th><th className="th">Amount</th><th className="th pr-5">Actions</th></tr></thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id} className="tr">
                      <td className="td pl-5 text-xs">{fmtDate(e.date)}</td>
                      <td className="td"><Badge color={catColors[e.category] ?? 'slate'}>{e.category}</Badge></td>
                      <td className="td text-slate-700 dark:text-slate-200">{e.description}</td>
                      <td className="td font-semibold text-rose-500">{fmtMoney(e.amount)}</td>
                      <td className="td pr-5"><button className="text-xs font-semibold text-rose-500 hover:underline" onClick={() => remove(e)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <EmptyState text="No expenses match your filters." />}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add expense">
        <form onSubmit={add} className="space-y-4">
          <Field label="Category">
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description"><input className="input" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Amount (KES)"><input className="input" type="number" min={1} required value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Date"><input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Add expense</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
