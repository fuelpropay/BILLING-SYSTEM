import React, { useState } from 'react'
import { useStore, fmtDate, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState, SearchInput } from '../components/ui'
import type { KbArticle } from '../types'

const CATS: KbArticle['category'][] = ['billing', 'network', 'account', 'installation', 'troubleshooting']

export default function KnowledgeBase() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [modal, setModal] = useState(false)
  const [open, setOpen] = useState<KbArticle | null>(null)
  const [form, setForm] = useState({ title: '', category: 'billing' as KbArticle['category'], body: '', public: true })

  const rows = db.kbArticles.filter(a =>
    (!cat || a.category === cat) &&
    `${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase())
  )

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const a: KbArticle = { id: uid(), ...form, views: 0, updatedAt: new Date().toISOString() }
    update(d => ({ ...d, kbArticles: [a, ...d.kbArticles] }))
    log('create', 'kb-article', `Published "${a.title}" (${a.category})`)
    setModal(false)
    setForm({ title: '', category: 'billing', body: '', public: true })
  }

  const read = (a: KbArticle) => {
    setOpen(a)
    update(d => ({ ...d, kbArticles: d.kbArticles.map(x => x.id === a.id ? { ...x, views: x.views + 1 } : x) }))
  }

  const remove = (id: string) => { if (confirm('Delete article?')) { update(d => ({ ...d, kbArticles: d.kbArticles.filter(a => a.id !== id) })); setOpen(null) } }

  return (
    <div className="space-y-4">
      <Card title="Knowledge Base" subtitle="uCRM-style help articles for staff and the customer portal" action={<button className="btn-primary !py-1.5" onClick={() => setModal(true)}>New article</button>}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search articles…" />
          <select className="input !w-44 !py-1.5" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">All categories</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {!rows.length && <EmptyState text="No articles match." />}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(a => (
            <button key={a.id} onClick={() => read(a)} className="text-left rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-brand-500 transition">
              <div className="flex items-center justify-between mb-1">
                <Badge color="blue">{a.category}</Badge>
                {a.public ? <Badge color="green">portal</Badge> : <Badge color="slate">internal</Badge>}
              </div>
              <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.body}</p>
              <div className="text-[10px] text-slate-400 mt-2">{a.views} views · updated {fmtDate(a.updatedAt)}</div>
            </button>
          ))}
        </div>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} wide>
        {open && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge color="blue">{open.category}</Badge>{open.public ? <Badge color="green">visible on portal</Badge> : <Badge color="slate">internal only</Badge>}</div>
            <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{open.body}</p>
            <div className="flex justify-end"><button className="btn-secondary !text-rose-500" onClick={() => remove(open.id)}>Delete article</button></div>
          </div>
        )}
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title="New knowledge base article" wide>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title"><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as KbArticle['category'] }))}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Body"><textarea className="input min-h-36" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.public} onChange={e => setForm(f => ({ ...f, public: e.target.checked }))} /> Show on customer portal</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Publish</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
