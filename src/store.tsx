import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { DB, StaffUser } from './types'
import { seedDB, uid } from './seed'
import { apiLogin, apiState, apiStatePut } from './api'

const DB_KEY = 'fuelpro_billing_db_v1'
const TOKEN_KEY = 'fuelpro_billing_token'
const ROLE_KEY = 'fuelpro_billing_role'
const USER_KEY = 'fuelpro_billing_user'
const NAME_KEY = 'fuelpro_billing_name'

export const fmtMoney = (n: number) => `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export { uid }

interface StoreCtx {
  db: DB
  update: (fn: (db: DB) => DB) => void
  log: (action: string, entity: string, detail: string) => void
  resetData: () => void
  token: string | null
  authed: boolean
  actor: string
  role: string
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  remoteSynced: boolean
}

const Ctx = createContext<StoreCtx | null>(null)

function normalize(db: Partial<DB>): DB {
  const fresh = seedDB()
  const d: any = { ...fresh, ...db }
  d.subscribers = [] // subscribers live in paginated KV, not in doc
  return d as DB
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return normalize(JSON.parse(raw) as Partial<DB>)
  } catch { /* seed fallback */ }
  const db = normalize({})
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY) || 'admin')
  const [actor, setActor] = useState(localStorage.getItem(USER_KEY) || 'ADMIN')
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('fuelpro_theme') as 'dark' | 'light') || 'dark')
  const [remoteSynced, setRemoteSynced] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => { localStorage.setItem(DB_KEY, JSON.stringify(db)) }, [db])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fuelpro_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiState(token).then(remote => {
      if (cancelled) return
      if (remote && Object.keys(remote).length) { setDb(normalize(remote)); setRemoteSynced(true) }
      else { apiStatePut(token, db).then(() => !cancelled && setRemoteSynced(true)) }
    }).catch(() => setRemoteSynced(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const update = useCallback((fn: (db: DB) => DB) => {
    setDb(prev => {
      const next = fn(prev)
      if (token && role !== 'technician') {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => { apiStatePut(token, next).catch(() => {}) }, 400)
      }
      return next
    })
  }, [token, role])

  const log = useCallback((action: string, entity: string, detail: string) => {
    update(prev => ({ ...prev, audit: [{ id: uid(), actor, action, entity, detail, at: new Date().toISOString() }, ...prev.audit].slice(0, 200) }))
  }, [actor, update])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await apiLogin(username, password)
    if (!res.ok || !res.token) return false
    const usr = username.trim().toUpperCase()
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(ROLE_KEY, res.role ?? 'admin')
    localStorage.setItem(USER_KEY, usr)
    localStorage.setItem(NAME_KEY, res.name ?? usr)
    setToken(res.token)
    setRole(res.role ?? 'admin')
    setActor(usr)
    return true
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(NAME_KEY)
  }, [])

  const resetData = useCallback(() => {
    const fresh = normalize({})
    if (token && role !== 'technician') apiStatePut(token, fresh).catch(() => {})
    setDb(fresh)
  }, [token, role])

  const value = useMemo(
    () => ({ db, update, log, resetData, token, authed: Boolean(token), actor, role, login, logout, theme, toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')), remoteSynced }),
    [db, update, log, resetData, token, actor, role, login, logout, theme, remoteSynced]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
