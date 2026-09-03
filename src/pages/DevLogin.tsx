import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function DevLogin() {
  const { login, logout } = useStore()
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
    login(username, password).then(ok => {
      if (!ok) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }
      const r = localStorage.getItem('fuelpro_billing_role')
      if (r !== 'developer') {
        logout()
        setError('This account is not a developer account.')
        setLoading(false)
        return
      }
      navigate('/developer')
    }).catch(() => {
      setError('Authentication service unreachable.')
      setLoading(false)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-violet-600 items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-violet-600/30 mb-4">&lt;/&gt;</div>
          <h1 className="text-2xl font-extrabold text-white">Developer Console</h1>
          <p className="text-sm text-slate-400 mt-1">Platform owner access · client monitoring</p>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4 !bg-slate-900/80 !border-slate-700">
          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>
          )}
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Developer username</span>
            <input className="input !bg-slate-800 !border-slate-600 !text-white" value={username} onChange={e => setUsername(e.target.value)} placeholder="DEVELOPER" autoComplete="username" required />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Password</span>
            <div className="relative">
              <input className="input pr-10 !bg-slate-800 !border-slate-600 !text-white" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" aria-label="Show password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </div>
          </label>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg font-semibold text-white bg-violet-600 hover:bg-violet-500 transition disabled:opacity-50">
            {loading ? 'Signing in…' : 'Enter console'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-6">Restricted area · all actions are audited</p>
      </div>
    </div>
  )
}
