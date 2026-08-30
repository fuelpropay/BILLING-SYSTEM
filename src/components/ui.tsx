import React, { useEffect } from 'react'

export function Card({ title, subtitle, action, children, className = '' }: {
  title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            {title && <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

const badgeColors: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  blue: 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  slate: 'bg-slate-200 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
}

export function Badge({ color = 'slate', children }: { color?: keyof typeof badgeColors; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColors[color]}`}>{children}</span>
}

export const statusColor = (s: string): keyof typeof badgeColors =>
  ({ active: 'green', online: 'green', paid: 'green', used: 'green', resolved: 'green', delivered: 'green', sent: 'blue', closed: 'slate',
     suspended: 'red', offline: 'red', overdue: 'red', failed: 'red', critical: 'red', expired: 'red',
     pending: 'amber', unpaid: 'amber', partial: 'amber', in_progress: 'blue', unused: 'blue', queued: 'amber', open: 'amber',
     high: 'amber', medium: 'blue', low: 'slate' } as Record<string, keyof typeof badgeColors>)[s] ?? 'slate'

export function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
      <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      {text}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input className="input pl-9" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
