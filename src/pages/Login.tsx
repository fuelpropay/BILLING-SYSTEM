import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function Login() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (login(username, password)) {
        navigate('/')
      } else {
        setError('Invalid username or password. Try the demo credentials shown below.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#0b1220] p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-600 items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-brand-600/30 mb-4">F</div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">FuelPro Billing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ISP Billing & Network Management Platform</p>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Username</span>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="ADMIN" autoComplete="username" required />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Password</span>
            <div className="relative">
              <input className="input pr-10" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Show password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </div>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 px-3 py-2.5 text-xs text-brand-800 dark:text-brand-300">
            <span className="font-bold">Demo credentials</span> — Username: <code className="font-mono font-bold">ADMIN</code> · Password: <code className="font-mono font-bold">ADMIN</code>
          </div>
        </form>
        <p className="text-center text-xs text-slate-400 mt-6">FuelPro Billing System · Billing, Hotspot, PPPoE & RADIUS-ready</p>
      </div>
    </div>
  )
}
