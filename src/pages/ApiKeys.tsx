import React, { useState } from 'react'
import { useStore, uid, fmtDateTime } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { ApiKeyRecord } from '../types'

const hash = async (s: string) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function ApiKeys() {
  const { db, update, log } = useStore()
  const [modal, setModal] = useState(false)
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState<ApiKeyRecord['scope']>('read')
  const [newKey, setNewKey] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = `fpk_${crypto.randomUUID().replace(/-/g, '')}`
    const rec: ApiKeyRecord = { id: uid(), label, keyHash: await hash(key), scope, createdAt: new Date().toISOString(), lastUsedAt: '', revoked: false }
    update(d => ({ ...d, apiKeys: [...d.apiKeys, rec] }))
    log('create', 'api-key', `Created API key "${label}" (${scope})`)
    setModal(false)
    setNewKey(key)
  }
  const revoke = (k: ApiKeyRecord) => {
    if (!confirm(`Revoke API key "${k.label}"?`)) return
    update(d => ({ ...d, apiKeys: d.apiKeys.map(x => x.id === k.id ? { ...x, revoked: true } : x) }))
    log('update', 'api-key', `Revoked API key ${k.label}`)
  }

  return (
    <div className="space-y-4">
      <Card title="API Keys" subtitle="Programmatic access for external systems — keys are stored hashed, shown once" action={<button className="btn-primary !py-1.5" onClick={() => { setLabel(''); setScope('read'); setModal(true) }}>Create key</button>}>
        {newKey && (
          <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm">
            <span className="font-semibold text-emerald-400">Copy now — shown once:</span> <code className="font-mono">{newKey}</code>
          </div>
        )}
        {!db.apiKeys.length && <EmptyState text="No API keys yet." />}
        {!!db.apiKeys.length && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700"><th className="py-2 px-3">Label</th><th className="py-2 px-3">Scope</th><th className="py-2 px-3">Created</th><th className="py-2 px-3">Last used</th><th className="py-2 px-3">Status</th><th className="py-2 px-3" /></tr></thead>
            <tbody>
              {db.apiKeys.map(k => (
                <tr key={k.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-semibold">{k.label}</td>
                  <td className="py-2 px-3 capitalize">{k.scope}</td>
                  <td className="py-2 px-3 text-xs">{fmtDateTime(k.createdAt)}</td>
                  <td className="py-2 px-3 text-xs">{k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : 'never'}</td>
                  <td className="py-2 px-3"><Badge color={k.revoked ? 'red' : 'green'}>{k.revoked ? 'revoked' : 'live'}</Badge></td>
                  <td className="py-2 px-3 text-right">{!k.revoked && <button onClick={() => revoke(k)} className="text-xs text-rose-500 hover:underline">Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create API key">
        <form onSubmit={add} className="space-y-3">
          <Field label="Label"><input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Accounting integration" required /></Field>
          <Field label="Scope"><select className="input" value={scope} onChange={e => setScope(e.target.value as ApiKeyRecord['scope'])}><option value="read">Read only</option><option value="write">Write</option><option value="full">Full</option></select></Field>
          <button type="submit" className="btn-primary w-full">Generate</button>
        </form>
      </Modal>
    </div>
  )
}
