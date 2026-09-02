import React, { useState } from 'react'
import { useStore, fmtMoney } from '../store'
import { Card, Badge, Modal, Field } from '../components/ui'
import type { Currency } from '../types'

export default function Currencies() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ code: '', symbol: '', rate: 1 })
  const [sample, setSample] = useState(5000)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (db.currencies.some(c => c.code === code)) return alert('Currency already exists')
    update(d => ({ ...d, currencies: [...d.currencies, { code, symbol: form.symbol || code, rate: form.rate, isBase: false, enabled: true }] }))
    log('create', 'currency', `Added ${code} at rate ${form.rate}`)
    setModal(false)
    setForm({ code: '', symbol: '', rate: 1 })
  }

  const setRate = (code: string, rate: number) => update(d => ({ ...d, currencies: d.currencies.map(c => c.code === code ? { ...c, rate } : c) }))
  const toggle = (code: string) => update(d => ({ ...d, currencies: d.currencies.map(c => c.code === code && !c.isBase ? { ...c, enabled: !c.enabled } : c) }))
  const remove = (code: string) => { if (confirm(`Remove ${code}?`)) update(d => ({ ...d, currencies: d.currencies.filter(c => c.code !== code || c.isBase) })) }

  return (
    <div className="space-y-4">
      <Card title="Multi-Currency" subtitle="Sonar-style exchange table — plan prices shown in every enabled currency" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>Add currency</button>}>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Code</th><th className="py-2 px-3">Symbol</th><th className="py-2 px-3">Rate (1 KES =)</th><th className="py-2 px-3">Status</th><th className="py-2 px-3" /></tr></thead>
          <tbody>
            {db.currencies.map(c => (
              <tr key={c.code} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 px-3 font-mono font-bold">{c.code}{c.isBase && <Badge color="blue"> base</Badge>}</td>
                <td className="py-2 px-3">{c.symbol}</td>
                <td className="py-2 px-3">
                  {c.isBase ? <span className="text-slate-400">1.0000</span> : (
                    <input type="number" step="0.0001" className="input !w-28 !py-1 text-xs" value={c.rate} onChange={e => setRate(c.code, Number(e.target.value))} />
                  )}
                </td>
                <td className="py-2 px-3"><Badge color={c.enabled ? 'green' : 'slate'}>{c.enabled ? 'enabled' : 'disabled'}</Badge></td>
                <td className="py-2 px-3 text-right space-x-2">
                  {!c.isBase && <>
                    <button className="text-xs text-brand-500 hover:underline" onClick={() => toggle(c.code)}>{c.enabled ? 'Disable' : 'Enable'}</button>
                    <button className="text-xs text-rose-500 hover:underline" onClick={() => remove(c.code)}>Remove</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Price converter" subtitle="Preview any amount in all enabled currencies">
        <div className="flex items-center gap-3 mb-4">
          <input type="number" className="input !w-44" value={sample} onChange={e => setSample(Number(e.target.value))} />
          <span className="text-sm text-slate-500">{fmtMoney(sample)} equals…</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {db.currencies.filter(c => c.enabled).map(c => (
            <div key={c.code} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs uppercase text-slate-400">{c.code}</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{c.symbol} {(sample * c.rate).toLocaleString('en', { maximumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add currency">
        <form onSubmit={save} className="space-y-3">
          <Field label="Code"><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="USD" maxLength={3} required /></Field>
          <Field label="Symbol"><input className="input" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="$" /></Field>
          <Field label="Rate (1 KES =)"><input type="number" step="0.0001" className="input" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} required /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
