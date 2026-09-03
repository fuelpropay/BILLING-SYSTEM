import { useStore, fmtMoney } from '../store'
import { Card, Badge } from '../components/ui'

export default function Scoreboard() {
  const { db } = useStore()

  const techs = db.users.filter(u => u.role === 'technician')
  const stats = techs.map(t => {
    const jobs = db.fieldJobs.filter(j => j.assignee === t.name || j.assignee === t.username)
    const done = jobs.filter(j => j.status === 'done')
    const tickets = db.tickets.filter(x => x.assignee === t.name || x.assignee === t.username)
    const resolved = tickets.filter(x => x.status === 'resolved' || x.status === 'closed')
    const checklistTotal = done.reduce((s, j) => s + (j.checklist?.length ?? 0), 0)
    const checklistDone = done.reduce((s, j) => s + j.checklist.filter(c => c.done).length, 0)
    const score = done.length ? Math.round((checklistDone / Math.max(1, checklistTotal)) * 100) : 0
    return { t, jobsTotal: jobs.length, jobsDone: done.length, ticketsTotal: tickets.length, resolved: resolved.length, score }
  }).sort((a, b) => b.score - a.score)

  const payouts = db.agentPayouts.filter(p => techs.some(t => t.id === p.agentId || t.name === (p as any).agentId))

  return (
    <div className="space-y-4">
      <Card title="Technician Scoreboard" subtitle="ispman-style performance: job completion, checklist accuracy, ticket resolution">
        {!stats.length && <p className="text-sm text-slate-500">No technician accounts.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">#</th><th className="py-2 px-3">Technician</th><th className="py-2 px-3">Jobs done</th><th className="py-2 px-3">Tickets resolved</th><th className="py-2 px-3">Checklist score</th><th className="py-2 px-3">Rank</th></tr></thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.t.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                  <td className="py-2 px-3 font-medium">{s.t.name}</td>
                  <td className="py-2 px-3">{s.jobsDone}/{s.jobsTotal}</td>
                  <td className="py-2 px-3">{s.resolved}/{s.ticketsTotal}</td>
                  <td className="py-2 px-3">
                    <div className="w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full ${s.score >= 80 ? 'bg-emerald-500' : s.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.score}%` }} />
                    </div>
                    <span className="text-xs font-bold">{s.score}%</span>
                  </td>
                  <td className="py-2 px-3">
                    {i === 0 && <Badge color="green">top performer</Badge>}
                    {i === stats.length - 1 && stats.length > 1 && <Badge color="amber">needs coaching</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Commission payouts to technicians" subtitle="From agents & referrals ledger">
        {!payouts.length && <p className="text-sm text-slate-500">No payouts recorded.</p>}
        {payouts.map(p => {
          const t = techs.find(x => x.id === p.agentId)
          if (!t) return null
          return (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
              <span className="font-medium">{t.name}</span>
              <span>{fmtMoney(p.amount)}</span>
              <Badge color={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
