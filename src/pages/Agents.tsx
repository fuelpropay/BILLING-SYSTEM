import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, downloadCSV } from '../components/ui'
import type { AgentAccount } from '../types'

export default function Agents() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<AgentAccount | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', commissionPct: 10 })
  const [payModal, setPayModal] = useState(false)
  const [payAgent, setPayAgent] = useState<AgentAccount | null>(null)

  const genCode = (name: string) => 'AGENT-' + name.trim().toUpperCase().slice(0, 4)

  const stats = useMemo(() => db.agents.map(a => {
    const referred = db.subscribers.filter(s => s.referredBy === a.id)
    const revenue = db.payments.filter(p => referred.some(r => r.id === p.subscriberId)).reduce((s, p) => s + p.amount, 0)
    const commission = Math.round(revenue * a.commissionPct / 100)
    const paid = db.agentPayouts.filter(p => p.agentId === a.id && p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    const pending = db.agentPayouts.filter(p => p.agentId === a.id && p.status === 'pending').reduce((s, p) => s + p.amount, 0)
    return { agent: a, referred: referred.length, revenue, commission, paid, pending }
  }), [db.agents, db.subscribers, db.payments, db.agentPayouts])

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', commissionPct: 10 }); setModal(true) }
  const openEdit = (a: AgentAccount) => { setEditing(a); setForm({ name: a.name, phone: a.phone, commissionPct: a.commissionPct }); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, agents: d.agents.map(a => a.id === editing.id ? { ...a, name: form.name, phone: form.phone, commissionPct: form.commissionPct } : a) }))
      log('update', 'agent', `Updated agent ${form.name}`)
    } else {
      const code = genCode(form.name)
      if (db.agents.some(a => a.code === code)) { alert('An agent with a similar name already exists. Edit them instead.'); return }
      update(d => ({ ...d, agents: [...d.agents, { id: uid(), name: form.name, phone: form.phone, code, commissionPct: form.commissionPct, active: true, createdAt: new Date().toISOString() }] }))
      log('create', 'agent', `Added agent ${form.name} (${code})`)
    }
    setModal(false)
  }

  const toggle = (a: AgentAccount) => {
    update(d => ({ ...d, agents: d.agents.map(x => x.id === a.id ? { ...x, active: !x.active } : x) }))
    log('update', 'agent', `${a.active ? 'Deactivated' : 'Reactivated'} agent ${a.name}`)
  }

  const recordPayout = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payAgent) return
    const s = stats.find(x => x.agent.id === payAgent.id)
    const amount = Math.max(s?.commission ?? 0, 0) - (s?.paid ?? 0) - (s?.pending ?? 0)
    if (amount <= 0) { setPayModal(false); return }
    const period = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    update(d => ({ ...d, agentPayouts: [{ id: uid(), agentId: payAgent.id, amount, period, status: 'pending', createdAt: new Date().toISOString() }, ...d.agentPayouts] }))
    log('create', 'agent-payout', `Queued payout of ${fmtMoney(amount)} to ${payAgent.name}`)
    setPayModal(false)
  }

  const settle = (p: { id: string; agentId: string; amount: number; period: string }) => {
    update(d => ({ ...d, agentPayouts: d.agentPayouts.map(x => x.id === p.id ? { ...x, status: 'paid' } : x) }))
    log('update', 'agent-payout', `Paid ${fmtMoney(p.amount)} (${p.period})`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Agents & Referrals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Commission on every payment made by referred subscribers</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('agents.csv', ['Agent', 'Code', 'Commission %', 'Referred', 'Revenue', 'Commission accrued', 'Paid', 'Pending'],
            stats.map(s => [s.agent.name, s.agent.code, s.agent.commissionPct, s.referred, s.revenue, s.commission, s.paid, s.pending]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ New agent</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.agent.id} className="!p-0">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{s.agent.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.agent.code}</div>
                </div>
                <Badge color={s.agent.active ? 'green' : 'red'}>{s.agent.active ? 'active' : 'inactive'}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Commission</span><span className="font-semibold">{s.agent.commissionPct}%</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Referred</span><span className="font-semibold">{s.referred}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="font-semibold">{fmtMoney(s.revenue)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Accrued</span><span className="font-semibold text-emerald-500">{fmtMoney(s.commission)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Paid out</span><span className="font-semibold">{fmtMoney(s.paid)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Pending</span><span className="font-semibold text-amber-500">{fmtMoney(s.pending)}</span></div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              <button className="btn-ghost !text-xs flex-1" onClick={() => openEdit(s.agent)}>Edit</button>
              <button className="btn-ghost !text-xs flex-1 !text-emerald-500" onClick={() => { setPayAgent(s.agent); setPayModal(true) }}>Queue payout</button>
              <button className="btn-ghost !text-xs flex-1 !text-amber-500" onClick={() => toggle(s.agent)}>{s.agent.active ? 'Deactivate' : 'Reactivate'}</button>
            </div>
          </Card>
        ))}
        {stats.length === 0 && <EmptyState text="No agents yet." />}
      </div>

      <Card title="Payout queue" subtitle="Commission payments queued for settlement">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr><th className="th pl-5">Agent</th><th className="th">Period</th><th className="th">Amount</th><th className="th">Status</th><th className="th pr-5">Action</th></tr></thead>
            <tbody>
              {db.agentPayouts.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td pl-5 text-xs">{db.agents.find(a => a.id === p.agentId)?.name ?? '—'}</td>
                  <td className="td text-xs">{p.period}</td>
                  <td className="td font-semibold text-xs">{fmtMoney(p.amount)}</td>
                  <td className="td"><Badge color={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge></td>
                  <td className="td pr-5">{p.status === 'pending' && <button className="text-xs font-semibold text-emerald-500 hover:underline" onClick={() => settle(p)}>Mark paid</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {db.agentPayouts.length === 0 && <EmptyState text="No payouts queued." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : 'New agent'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Commission (%)"><input className="input" type="number" min={1} max={50} required value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: Number(e.target.value) })} /></Field>
          <p className="text-xs text-slate-400">Referral link: the agent's code auto-generates. Subscribers register with the code in the portal or from the subscriber form.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create agent'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Queue commission payout">
        {payAgent && (() => {
          const s = stats.find(x => x.agent.id === payAgent.id)!
          const due = s.commission - s.paid - s.pending
          return (
            <form onSubmit={recordPayout} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Queue <strong>{fmtMoney(due > 0 ? due : 0)}</strong> for <strong>{payAgent.name}</strong> (accrued {fmtMoney(s.commission)}, paid {fmtMoney(s.paid)}, pending {fmtMoney(s.pending)}).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={due <= 0}>Queue payout</button>
              </div>
            </form>
          )
        })()}
      </Modal>
    </div>
  )
}
