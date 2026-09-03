import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { apiLookup, apiStats, apiSubscribers } from './api'
import type { Subscriber } from './types'

const nameCache = new Map<string, string>()

export function useStats<T = any>() {
  const { token } = useStore()
  const [stats, setStats] = useState<T | null>(null)
  useEffect(() => {
    if (!token) return
    apiStats(token).then(setStats).catch(() => {})
  }, [token])
  return stats
}

export function useNames(ids: string[]) {
  const { token } = useStore()
  const [names, setNames] = useState<Record<string, string>>({})
  const key = ids.join('|')
  useEffect(() => {
    if (!token || !ids.length) return
    const missing = ids.filter(id => !nameCache.has(id))
    if (missing.length) {
      apiLookup(token, missing.slice(0, 100)).then(map => {
        Object.assign(nameCache, map)
        const snap: Record<string, string> = {}
        ids.forEach(id => { if (nameCache.has(id)) snap[id] = nameCache.get(id)! })
        setNames(snap)
      }).catch(() => {})
    } else {
      const snap: Record<string, string> = {}
      ids.forEach(id => { if (nameCache.has(id)) snap[id] = nameCache.get(id)! })
      setNames(snap)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key])
  const name = (id: string | null | undefined) => (id && names[id]) || '—'
  return { names, name }
}

export interface SubOption { id: string; name: string; username: string; phone: string; status: string }

export function useSubSearch() {
  const { token } = useStore()
  const [options, setOptions] = useState<SubOption[]>([])
  const timer = useRef<number | undefined>(undefined)
  const search = useCallback((q: string) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (!token) return
      apiSubscribers<SubOption>(token, { q, pageSize: 12 }).then(r => setOptions((r as any).items ?? [])).catch(() => {})
    }, 250)
  }, [token])
  useEffect(() => {
    apiSubscribers<SubOption>(token!, { pageSize: 12 }).then(r => setOptions((r as any).items ?? [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
  return { options, search }
}

export function SubSelect({ value, onChange, label = 'Subscriber' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const { options, search } = useSubSearch()
  const { name } = useNames(value ? [value] : [])
  const [q, setQ] = useState('')
  const current = options.find(o => o.id === value)
  return (
    <div>
      <input className="input" placeholder={current ? `${label}: ${current.name}` : name(value) !== '—' ? `${label}: ${name(value)}` : `Search ${label}…`} value={q} onChange={e => { setQ(e.target.value); search(e.target.value) }} />
      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 mt-1">
        {options.map(o => (
          <button type="button" key={o.id} onClick={() => { onChange(o.id); setQ('') }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 ${o.id === value ? 'bg-brand-500/10' : ''}`}>
            <span className="font-semibold">{o.name}</span> <span className="text-slate-400 font-mono">@{o.username}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
