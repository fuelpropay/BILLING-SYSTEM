import React, { useState } from 'react'
import { useStore, uid } from '../store'
import { Card, Badge, Modal, Field, EmptyState } from '../components/ui'
import type { HotspotProfile } from '../types'

const emptyProfile = { name: '', routerId: '', rateLimitMbps: 5, sessionTimeoutMin: 720, idleTimeoutMin: 15, sharedUsers: 1, roaming: true }

export default function CaptivePortal() {
  const { db, update, log } = useStore()
  const s = db.settings
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<HotspotProfile | null>(null)
  const [form, setForm] = useState(emptyProfile)
  const [saved, setSaved] = useState(false)

  const setSetting = (key: keyof typeof s, value: string | boolean) => {
    update(d => ({ ...d, settings: { ...d.settings, [key]: value } }))
    setSaved(false)
  }

  const saveBranding = () => {
    log('update', 'settings', 'Updated captive portal branding')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyProfile, routerId: db.routers[0]?.id ?? '' })
    setModal(true)
  }

  const openEdit = (p: HotspotProfile) => {
    setEditing(p)
    setForm({ name: p.name, routerId: p.routerId, rateLimitMbps: p.rateLimitMbps, sessionTimeoutMin: p.sessionTimeoutMin, idleTimeoutMin: p.idleTimeoutMin, sharedUsers: p.sharedUsers, roaming: p.roaming })
    setModal(true)
  }

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      update(d => ({ ...d, hotspotProfiles: d.hotspotProfiles.map(p => p.id === editing.id ? { ...p, ...form } : p) }))
      log('update', 'hotspot-profile', `Updated hotspot profile ${form.name}`)
    } else {
      update(d => ({ ...d, hotspotProfiles: [...d.hotspotProfiles, { id: uid(), ...form }] }))
      log('create', 'hotspot-profile', `Created hotspot profile ${form.name}`)
    }
    setModal(false)
  }

  const removeProfile = (p: HotspotProfile) => {
    if (!confirm(`Delete hotspot profile ${p.name}?`)) return
    update(d => ({ ...d, hotspotProfiles: d.hotspotProfiles.filter(x => x.id !== p.id) }))
    log('delete', 'hotspot-profile', `Deleted hotspot profile ${p.name}`)
  }

  const routerName = (id: string) => db.routers.find(r => r.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Captive Portal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Brand the subscriber login page and configure hotspot profiles</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Portal branding" subtitle="Shown to customers on the hotspot login page and self-service portal">
          <div className="space-y-4">
            <Field label="Portal title"><input className="input" value={s.portalTitle} onChange={e => setSetting('portalTitle', e.target.value)} /></Field>
            <Field label="Welcome message"><textarea className="input min-h-20" value={s.portalWelcome} onChange={e => setSetting('portalWelcome', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand color">
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" value={s.portalColor} onChange={e => setSetting('portalColor', e.target.value)} />
                  <input className="input font-mono" value={s.portalColor} onChange={e => setSetting('portalColor', e.target.value)} />
                </div>
              </Field>
              <div className="space-y-2 pt-5">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" className="accent-brand-500" checked={s.portalAllowVoucher} onChange={e => setSetting('portalAllowVoucher', e.target.checked)} />
                  Voucher login
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" className="accent-brand-500" checked={s.portalAllowTopup} onChange={e => setSetting('portalAllowTopup', e.target.checked)} />
                  M-Pesa top-up
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary !text-xs" onClick={saveBranding}>Save branding</button>
              {saved && <span className="text-xs text-emerald-500 font-semibold">Saved</span>}
            </div>
          </div>
        </Card>

        <Card title="Live preview" subtitle="How customers see the captive portal">
          <div className="mx-auto w-72 rounded-3xl border-4 border-slate-700 dark:border-slate-600 overflow-hidden shadow-xl">
            <div className="p-6 text-center" style={{ background: `linear-gradient(160deg, ${s.portalColor}, ${s.portalColor}cc)` }}>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-extrabold text-xl">F</div>
              <div className="mt-3 font-bold text-white">{s.portalTitle}</div>
              <div className="mt-1 text-xs text-white/80 leading-relaxed">{s.portalWelcome}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center px-3 text-xs text-slate-400">Phone number or username</div>
              <button className="w-full h-9 rounded-lg text-white text-xs font-bold" style={{ background: s.portalColor }}>Connect to Wi-Fi</button>
              {s.portalAllowVoucher && <button className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">I have a voucher</button>}
              {s.portalAllowTopup && <button className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">Buy a package via M-Pesa</button>}
              <div className="text-center text-[10px] text-slate-400 pt-1">Support: {s.supportPhone}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Hotspot profiles" subtitle="Bandwidth shaping and session rules pushed to each hotspot router"
        action={<button className="btn-primary !text-xs" onClick={openCreate}>+ New profile</button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.hotspotProfiles.map(p => (
            <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-400">{routerName(p.routerId)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {p.roaming && <Badge color="purple">roaming</Badge>}
                  <Badge color={db.routers.find(r => r.id === p.routerId)?.status === 'online' ? 'green' : 'red'}>
                    {db.routers.find(r => r.id === p.routerId)?.status ?? 'unknown'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Rate limit</span><span className="font-semibold text-slate-700 dark:text-slate-200">{p.rateLimitMbps} Mbps</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Shared users</span><span className="font-semibold text-slate-700 dark:text-slate-200">{p.sharedUsers}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Session timeout</span><span className="font-semibold text-slate-700 dark:text-slate-200">{p.sessionTimeoutMin} min</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Idle timeout</span><span className="font-semibold text-slate-700 dark:text-slate-200">{p.idleTimeoutMin} min</span></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-ghost !text-xs flex-1" onClick={() => openEdit(p)}>Edit</button>
                <button className="btn-ghost !text-xs !text-rose-500 flex-1" onClick={() => removeProfile(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {db.hotspotProfiles.length === 0 && <EmptyState text="No hotspot profiles yet." />}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : 'New hotspot profile'}>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Profile name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cafe Standard" /></Field>
          <Field label="Hotspot router">
            <select className="input" value={form.routerId} onChange={e => setForm({ ...form, routerId: e.target.value })}>
              {db.routers.map(r => <option key={r.id} value={r.id}>{r.name} — {r.location}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate limit (Mbps)"><input className="input" type="number" min={1} required value={form.rateLimitMbps} onChange={e => setForm({ ...form, rateLimitMbps: Number(e.target.value) })} /></Field>
            <Field label="Shared users"><input className="input" type="number" min={1} max={10} required value={form.sharedUsers} onChange={e => setForm({ ...form, sharedUsers: Number(e.target.value) })} /></Field>
            <Field label="Session timeout (min)"><input className="input" type="number" min={5} required value={form.sessionTimeoutMin} onChange={e => setForm({ ...form, sessionTimeoutMin: Number(e.target.value) })} /></Field>
            <Field label="Idle timeout (min)"><input className="input" type="number" min={1} required value={form.idleTimeoutMin} onChange={e => setForm({ ...form, idleTimeoutMin: Number(e.target.value) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="accent-brand-500" checked={form.roaming} onChange={e => setForm({ ...form, roaming: e.target.checked })} />
            Allow hotspot roaming (account works on all roaming-enabled hotspots)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create profile'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
