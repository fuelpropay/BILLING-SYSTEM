import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, uid } from '../store'
import { Card, Badge } from '../components/ui'
import { SubSelect, useNames } from '../apiUse'

export default function Proration() {
  const { db, update, log, actor } = useStore()
  const [subscriberId, setSubscriberId] = useState('')
  const [fromPlan, setFromPlan] = useState('')
  const [toPlan, setToPlan] = useState('')
  const [changeDay, setChangeDay] = useState(new Date().getDate())
  const [applied, setApplied] = useState('')

  const subName = useNames(subscriberId ? [subscriberId] : []).name

  const calc = useMemo(() => {
    const from = db.plans.find(p => p.id === fromPlan)
    const to = db.plans.find(p => p.id === toPlan)
    if (!from || !to) return null
    const daysInCycle = Math.max(1, to.validityDays)
    const remaining = Math.max(0, daysInCycle - changeDay)
    const fromDaily = from.price / Math.max(1, from.validityDays)
    const toDaily = to.price / daysInCycle
    const unusedCredit = fromDaily * remaining
    const newCharge = toDaily * remaining
    return { remaining, unusedCredit, newCharge, net: newCharge - unusedCredit, daysInCycle }
  }, [db.plans, fromPlan, toPlan, changeDay])

  const apply = () => {
    if (!calc || !subscriberId || !toPlan) return
    const now = new Date().toISOString()
    if (calc.net > 0) {
      const inv = { id: uid(), number: `INV-P${(1000 + db.invoices.length + 1)}`, subscriberId, amount: Math.round(calc.net), paidAmount: 0, status: 'pending' as const, issuedAt: now, dueAt: now.slice(0, 10), note: `Prorated plan change to ${db.plans.find(p => p.id === toPlan)?.name}` }
      update(d => ({ ...d, invoices: [inv, ...d.invoices] }))
      log('create', 'invoice', `Proration charge ${fmtMoney(Math.round(calc.net))} for ${subName(subscriberId)}`)
    } else if (calc.net < 0) {
      const cn = { id: uid(), number: `CN-P${(1000 + db.creditNotes.length + 1)}`, invoiceId: '', subscriberId, amount: Math.round(-calc.net), reason: 'Proration credit — plan downgrade', issuedBy: actor, createdAt: now, status: 'applied' as const }
      update(d => ({ ...d, creditNotes: [cn, ...d.creditNotes] }))
      log('create', 'credit-note', `Proration credit ${fmtMoney(Math.round(-calc.net))} for ${subName(subscriberId)}`)
    }
    setApplied(`Applied ${calc.net >= 0 ? 'charge' : 'credit'} of ${fmtMoney(Math.abs(Math.round(calc.net)))}`)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card title="Proration Calculator" subtitle="Splynx-style mid-cycle plan change charges & credits">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-slate-500">Subscriber</label><SubSelect value={subscriberId} onChange={setSubscriberId} /></div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Change day (of cycle)</label>
            <input type="number" min={1} max={31} className="input mt-1" value={changeDay} onChange={e => setChangeDay(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">From plan</label>
            <select className="input mt-1" value={fromPlan} onChange={e => setFromPlan(e.target.value)}>
              <option value="">Select…</option>
              {db.plans.map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">To plan</label>
            <select className="input mt-1" value={toPlan} onChange={e => setToPlan(e.target.value)}>
              <option value="">Select…</option>
              {db.plans.map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)}</option>)}
            </select>
          </div>
        </div>

        {calc && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><div className="text-xs text-slate-400">Days remaining</div><div className="text-lg font-bold text-slate-900 dark:text-white">{calc.remaining} / {calc.daysInCycle}</div></div>
            <div><div className="text-xs text-slate-400">Unused credit</div><div className="text-lg font-bold text-emerald-500">{fmtMoney(Math.round(calc.unusedCredit))}</div></div>
            <div><div className="text-xs text-slate-400">New plan charge</div><div className="text-lg font-bold text-slate-900 dark:text-white">{fmtMoney(Math.round(calc.newCharge))}</div></div>
            <div>
              <div className="text-xs text-slate-400">Net {calc.net >= 0 ? 'charge' : 'refund credit'}</div>
              <div className={`text-lg font-bold ${calc.net >= 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{fmtMoney(Math.abs(Math.round(calc.net)))}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button className="btn-primary" disabled={!calc || !subscriberId} onClick={apply}>Apply as {calc && calc.net < 0 ? 'credit note' : 'prorated invoice'}</button>
          {applied && <Badge color="green">{applied}</Badge>}
        </div>
      </Card>
    </div>
  )
}
