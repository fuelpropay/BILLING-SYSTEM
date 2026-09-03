import { useStore, fmtMoney, fmtDate } from '../store'
import { Card, downloadCSV } from '../components/ui'
import { useNames } from '../apiUse'

export default function DeferredRevenue() {
  const { db } = useStore()
  const now = new Date()

  // Deferred = paid invoices whose service period extends past today
  const deferred = db.invoices.filter(i => i.status === 'paid' && new Date(i.dueAt) > now)
  const deferredTotal = deferred.reduce((s, i) => s + i.amount, 0)
  const subName = useNames(deferred.map(i => i.subscriberId)).name

  const byPlan = db.plans.map(p => {
    const planInv = deferred.filter(i => {
      const sub = (db as any).subscriberIndex?.[i.subscriberId]
      return sub?.planId === p.id
    })
    return { name: p.name, total: planInv.reduce((s, i) => s + i.amount, 0) }
  }).filter(b => b.total > 0)

  const recognized = db.invoices.filter(i => i.status === 'paid' && new Date(i.dueAt) <= now)
  const recognizedTotal = recognized.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-4">
      <Card title="Deferred Revenue" subtitle="Splynx-style: prepayments for service periods extending past today">
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs uppercase text-slate-400">Deferred (unearned)</div>
            <div className="text-xl font-extrabold text-amber-500">{fmtMoney(deferredTotal)}</div>
            <div className="text-xs text-slate-500">{deferred.length} invoices</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs uppercase text-slate-400">Recognized (earned)</div>
            <div className="text-xl font-extrabold text-emerald-500">{fmtMoney(recognizedTotal)}</div>
            <div className="text-xs text-slate-500">{recognized.length} invoices</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs uppercase text-slate-400">Recognition by plan</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
              {byPlan.map(b => <div key={b.name} className="flex justify-between"><span>{b.name}</span><span className="font-semibold">{fmtMoney(b.total)}</span></div>)}
              {!byPlan.length && <span className="text-slate-400">No deferred amounts.</span>}
            </div>
          </div>
        </div>
        <button className="btn-secondary !py-1.5 text-xs" onClick={() => downloadCSV('deferred-revenue.csv', ['Invoice', 'Subscriber', 'Amount', 'Service ends'], deferred.map(i => [i.number, subName(i.subscriberId), i.amount, fmtDate(i.dueAt)]))}>Export CSV</button>
      </Card>

      <Card title="Unearned invoices" subtitle="Paid but service period not yet complete">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Invoice</th><th className="py-2 px-3">Subscriber</th><th className="py-2 px-3">Amount</th><th className="py-2 px-3">Service ends</th><th className="py-2 px-3">Days left</th></tr></thead>
            <tbody>
              {deferred.map(i => {
                const daysLeft = Math.max(1, Math.ceil((new Date(i.dueAt).getTime() - now.getTime()) / 86400000))
                return (
                  <tr key={i.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-mono text-xs">{i.number}</td>
                    <td className="py-2 px-3">{subName(i.subscriberId)}</td>
                    <td className="py-2 px-3 font-semibold">{fmtMoney(i.amount)}</td>
                    <td className="py-2 px-3">{fmtDate(i.dueAt)}</td>
                    <td className="py-2 px-3"><span className={daysLeft > 7 ? 'text-emerald-500' : 'text-amber-500'}>{daysLeft} days</span></td>
                  </tr>
                )
              })}
              {!deferred.length && <tr><td colSpan={5} className="py-4 px-3 text-slate-400">Nothing deferred — all paid invoices are fully earned.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
