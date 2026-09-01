import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { DB } from './types'
import { seedDB, uid } from './seed'
import { apiLogin, apiGetState, apiPutState } from './api'

const DB_KEY = 'fuelpro_billing_db_v1'
const TOKEN_KEY = 'fuelpro_billing_token'

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
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  remoteSynced: boolean
}

const Ctx = createContext<StoreCtx | null>(null)

function normalize(db: Partial<DB>): DB {
  const fresh = seedDB()
  return {
    ...fresh,
    ...db,
    plans: (db.plans ?? fresh.plans).map(p => ({ ...p, fupLimitGB: p.fupLimitGB ?? 0, fupSpeedMbps: p.fupSpeedMbps ?? 0 })),
    subscribers: (db.subscribers ?? fresh.subscribers).map(s => ({ ...s, referredBy: s.referredBy ?? null })),
    settings: { ...fresh.settings, ...db.settings },
  } as DB
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return normalize(JSON.parse(raw) as Partial<DB>)
  } catch { /* corrupted storage falls through to seed */ }
  const db = seedDB()
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [authed, setAuthed] = useState(() => Boolean(token))
  const [actor, setActor] = useState(localStorage.getItem('fuelpro_billing_user') || 'ADMIN')
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('fuelpro_theme') as 'dark' | 'light') || 'dark')
  const [remoteSynced, setRemoteSynced] = useState(false)
  const pushTimer = useRef<number | undefined>(undefined)

  useEffect(() => { localStorage.setItem(DB_KEY, JSON.stringify(db)) }, [db])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fuelpro_theme', theme)
  }, [theme])

  // hydrate from remote on (re)login; on first boot, push local seed up
  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiGetState(token).then(remote => {
      if (cancelled) return
      if (remote && Object.keys(remote).length) {
        setDb(normalize(remote))
        setRemoteSynced(true)
      } else {
        apiPutState(token, db).then(ok => { if (!cancelled) setRemoteSynced(ok) })
      }
    }).catch(() => setRemoteSynced(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // write-through to remote (debounced)
  const update = useCallback((fn: (db: DB) => DB) => {
    setDb(prev => {
      const next = fn(prev)
      if (token) {
        window.clearTimeout(pushTimer.current)
        pushTimer.current = window.setTimeout(() => { apiPutState(token, next).catch(() => {}) }, 400)
      }
      return next
    })
  }, [token])

  const log = useCallback((action: string, entity: string, detail: string) => {
    update(prev => ({
      ...prev,
      audit: [{ id: uid(), actor, action, entity, detail, at: new Date().toISOString() }, ...prev.audit].slice(0, 200),
    }))
  }, [actor, update])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await apiLogin(username, password)
    if (!res.ok || !res.token) return false
    const usr = username.trim().toUpperCase()
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem('fuelpro_billing_user', usr)
    setToken(res.token)
    setActor(usr)
    setAuthed(true)
    if (res.data && Object.keys(res.data).length) {
      setDb(normalize({ ...res.data, users: (res.data as any).users?.map((u: any) => u.username === usr ? { ...u, lastLogin: new Date().toISOString() } : u) }))
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setAuthed(false)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('fuelpro_billing_user')
  }, [])

  const resetData = useCallback(() => {
    const fresh = seedDB()
    setDb(fresh)
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    if (token) apiPutState(token, fresh).catch(() => {})
  }, [token])

  const value = useMemo(
    () => ({ db, update, log, resetData, authed, actor, login, logout, theme, toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')), remoteSynced }),
    [db, update, log, resetData, authed, actor, login, logout, theme, remoteSynced]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
