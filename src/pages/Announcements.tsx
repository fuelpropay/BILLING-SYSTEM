import React, { useState } from 'react'
import { useStore, uid, fmtDateTime } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { Announcement } from '../types'

const sevColor: Record<Announcement['severity'], string> = { info: 'bg-blue-500', warning: 'bg-amber-500', critical: 'bg-rose-600' }

export default function Announcements() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', severity: 'info' as Announcement['severity'], expiresAt: '' })

  const publish = (e: React.FormEvent) => {
    e.preventDefault()
    const a: Announcement = { id: uid(), ...form, active: true, createdAt: new Date().toISOString() }
    update(d => ({ ...d, announcements: [a, ...d.announcements] }))
    log('create', 'announcement', `Published announcement "${form.title}"`)
    setModal(false)
  }
  const toggle = (a: Announcement) => update(d => ({ ...d, announcements: d.announcements.map(x => x.id === a.id ? { ...x, active: !x.active } : x) }))
  const remove = (a: Announcement) => {
    if (!confirm(`Delete announcement "${a.title}"?`)) return
    update(d => ({ ...d, announcements: d.announcements.filter(x => x.id !== a.id) }))
    log('delete', 'announcement', `Deleted announcement ${a.title}`)
  }

  return (
    <div className="space-y-4">
      <Card title="Announcements" subtitle="Portal banners & outage notices shown to subscribers" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New announcement</button>}>
        {!db.announcements.length && <EmptyState text="No announcements published." />}
        <div className="space-y-3">
          {db.announcements.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-4">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${sevColor[a.severity]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{a.title}</span>
                  <Badge color={a.active ? 'green' : 'slate'}>{a.active ? 'live' : 'paused'}</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1">Posted {fmtDateTime(a.createdAt)}{a.expiresAt && ` · expires ${a.expiresAt}`}</p>
              </div>
              <div className="flex gap-3 items-start">
                <button onClick={() => toggle(a)} className="text-xs text-brand-500 hover:underline">{a.active ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => remove(a)} className="text-xs text-rose-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New announcement">
        <form onSubmit={publish} className="space-y-3">
          <Field label="Title"><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Message"><textarea className="input" rows={3} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity"><select className="input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as Announcement['severity'] })}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical (outage)</option></select></Field>
            <Field label="Expires (optional)"><input className="input" type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></Field>
          </div>
          <button type="submit" className="btn-primary w-full">Publish</button>
        </form>
      </Modal>
    </div>
  )
}
