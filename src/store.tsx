import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { DB } from './types'
import { seedDB, uid } from './seed'

const DB_KEY = 'fuelpro_billing_db_v1'
const AUTH_KEY = 'fuelpro_billing_auth_v1'

export const fmtMoney = (n: number) => `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export { uid }

interface StoreCtx {
  db: DB
  update: (fn: (db: DB) => DB) => void
  log: (action: string, entity: string, detail: string) => void
  resetData: () => void
  authed: boolean
  actor: string
  login: (username: string, password: string) => boolean
  logout: () => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const Ctx = createContext<StoreCtx | null>(null)

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<DB>
      const fresh = seedDB()
      return {
        ...fresh,
        ...stored,
        plans: (stored.plans ?? fresh.plans).map(p => ({ ...p, fupLimitGB: p.fupLimitGB ?? 0, fupSpeedMbps: p.fupSpeedMbps ?? 0 })),
        subscribers: (stored.subscribers ?? fresh.subscribers).map(s => ({ ...s, referredBy: s.referredBy ?? null })),
        promos: stored.promos ?? fresh.promos,
        devices: stored.devices ?? fresh.devices,
        hotspotProfiles: stored.hotspotProfiles ?? fresh.hotspotProfiles,
        inventory: stored.inventory ?? fresh.inventory,
        fieldJobs: stored.fieldJobs ?? fresh.fieldJobs,
        agents: stored.agents ?? fresh.agents,
        agentPayouts: stored.agentPayouts ?? fresh.agentPayouts,
        smsTemplates: stored.smsTemplates ?? fresh.smsTemplates,
        olts: stored.olts ?? fresh.olts,
        settings: { ...fresh.settings, ...stored.settings },
      } as DB
    }
  } catch { /* corrupted storage falls through to seed */ }
  const db = seedDB()
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1')
  const [actor, setActor] = useState(() => localStorage.getItem(AUTH_KEY + '_user') || 'ADMIN')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('fuelpro_theme') as 'dark' | 'light') || 'dark')

  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  }, [db])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fuelpro_theme', theme)
  }, [theme])

  const update = useCallback((fn: (db: DB) => DB) => setDb(prev => fn(prev)), [])

  const log = useCallback((action: string, entity: string, detail: string) => {
    setDb(prev => ({
      ...prev,
      audit: [{ id: uid(), actor, action, entity, detail, at: new Date().toISOString() }, ...prev.audit].slice(0, 200),
    }))
  }, [actor])

  const login = useCallback((username: string, password: string) => {
    const okUser = username.trim().toUpperCase() === 'ADMIN' && password === 'ADMIN'
    if (okUser) {
      setAuthed(true)
      setActor('ADMIN')
      localStorage.setItem(AUTH_KEY, '1')
      localStorage.setItem(AUTH_KEY + '_user', 'ADMIN')
      setDb(prev => ({
        ...prev,
        audit: [{ id: uid(), actor: 'ADMIN', action: 'login', entity: 'auth', detail: 'Signed in successfully', at: new Date().toISOString() }, ...prev.audit],
        users: prev.users.map(u => u.username === 'ADMIN' ? { ...u, lastLogin: new Date().toISOString() } : u),
      }))
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setAuthed(false)
    localStorage.removeItem(AUTH_KEY)
  }, [])

  const resetData = useCallback(() => {
    const fresh = seedDB()
    setDb(fresh)
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
  }, [])

  const value = useMemo(
    () => ({ db, update, log, resetData, authed, actor, login, logout, theme, toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) }),
    [db, update, log, resetData, authed, actor, login, logout, theme]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
