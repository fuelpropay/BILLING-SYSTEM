import { useEffect, useState } from 'react'
import { useStore, fmtDateTime } from '../store'
import { apiMyJobs, apiJobUpdate } from '../api'
import { Badge, statusColor } from '../components/ui'
import { useNames } from '../apiUse'
import type { FieldJob } from '../types'

export default function MyJobs() {
  const { token, role, db } = useStore()
  const [jobs, setJobs] = useState<FieldJob[]>([])
  const [loading, setLoading] = useState(true)
  const { name: subName } = useNames(jobs.map(j => j.subscriberId!).filter(Boolean))

  const load = () => {
    if (!token) return
    setLoading(true)
    apiMyJobs(token).then(r => setJobs((r as any)?.jobs ?? [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [token, db.fieldJobs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (job: FieldJob, status: FieldJob['status']) => {
    if (!token) return
    await apiJobUpdate(token, job.id, { status })
    setJobs(js => js.map(j => j.id === job.id ? { ...j, status } : j))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Field Jobs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{role === 'technician' ? 'Jobs assigned to you' : 'Your assigned field jobs'} · {jobs.length} active</p>
      </div>
      {loading && <p className="text-sm text-slate-400">Loading jobs…</p>}
      {!loading && !jobs.length && <p className="text-sm text-slate-400">No jobs assigned.</p>}
      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white">{job.title}</div>
                <div className="text-xs text-slate-400">{subName(job.subscriberId) !== '—' ? subName(job.subscriberId) : 'Site work'}{job.address ? ` · ${job.address}` : ''}</div>
              </div>
              <Badge color={statusColor(job.status)}>{job.status.replace('_', ' ')}</Badge>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="uppercase tracking-wide font-bold">{job.kind}</span> · scheduled {job.scheduledAt ? fmtDateTime(job.scheduledAt) : 'unscheduled'}
            </div>
            {job.checklist?.length > 0 && (
              <div className="text-xs border-l-2 border-slate-200 dark:border-slate-700 pl-3 space-y-1">
                {job.checklist.map((c, i) => (
                  <div key={i} className="text-slate-400">{c.done ? '☑' : '☐'} {c.item}</div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {job.status === 'scheduled' && <button className="btn-primary !text-xs" onClick={() => setStatus(job, 'in_progress')}>Start job</button>}
              {job.status === 'in_progress' && <button className="btn-primary !text-xs" onClick={() => setStatus(job, 'done')}>Mark complete</button>}
              {job.status === 'done' && <span className="text-xs text-emerald-500 font-semibold">Completed ✔</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
