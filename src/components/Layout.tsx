import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const icons: Record<string, React.ReactNode> = {
  dashboard: <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />,
  subscribers: <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.7 0-8 1.3-8 4v3h9v-3a5.2 5.2 0 0 1 2-4Zm8 0c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4Z" />,
  plans: <path d="M12 2 2 7l10 5 10-5-10-5Zm-10 9 10 5 10-5M2 15l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  invoices: <path d="M6 2h12a1 1 0 0 1 1 1v19l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1Zm3 6h6M9 12h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  payments: <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 3h20M6 15h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  vouchers: <path d="M4 5h16a1 1 0 0 1 1 1v4a2 2 0 1 0 0 4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a2 2 0 1 0 0-4V6a1 1 0 0 1 1-1Zm9 3v2m0 4v2m0 4v.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  routers: <path d="M4 13h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm3 3h2m8-8-3-5m1 5 3-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  sessions: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  reports: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  tickets: <path d="M21 12a8 8 0 1 0-3.5 6.6L21 20l-1-3.6A8 8 0 0 0 21 12ZM8 11h8m-8 4h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  expenses: <path d="M12 2v20m5-17H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  sms: <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-5 4V5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  users: <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-9 2-9 6v2h18v-2c0-4-5-6-9-6Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  audit: <path d="M12 8v4l3 3m6-3a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.6 3H9.4L9 5.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5.2l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  promos: <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8ZM7 7h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  devices: <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm5 14h6m-3-4v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  portal: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-8 10h16M12 2c2.5 2.7 3.9 6.2 3.9 10S14.5 19.3 12 22c-2.5-2.7-3.9-6.2-3.9-10S9.5 4.7 12 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  radius: <path d="M12 22a2 2 0 0 1 0-4c2.8 0 5-2.2 5-5h4a9 9 0 0 1-9 9ZM3 11a9 9 0 0 1 9-9v4a5 5 0 0 0-5 5H3Zm9-9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  inventory: <path d="M20 8 12 3 4 8v8l8 5 8-5V8Zm-8-5v6m8-1-8 5-8-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  jobs: <path d="M14 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2H3v13h18V7h-7Zm-4 0V5h4v2h-4Zm0 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  agents: <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M14 4a5 5 0 1 1-7.5 7M13 11h2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  template: <path d="M4 4h16v12H8l-4 4V4Zm4 6h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  onboarding: <path d="M12 3v6m0 0c-3 0-5 2-5 4s2 4 5 4 5-2 5-4-2-4-5-4Zm7-5 2 2-2 2m-12 4 2-2m7 12h8l-4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  olts: <path d="M3 12h4l2-4 2 8 2-4h8M3 20h4m10 0h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
}

const nav: { to: string; label: string; icon: string; section?: string }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', section: 'Overview' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/subscribers', label: 'Subscribers', icon: 'subscribers', section: 'Customers' },
  { to: '/plans', label: 'Plans & Packages', icon: 'plans' },
  { to: '/vouchers', label: 'Vouchers', icon: 'vouchers' },
  { to: '/tickets', label: 'Support Tickets', icon: 'tickets' },
  { to: '/invoices', label: 'Invoices', icon: 'invoices', section: 'Billing' },
  { to: '/payments', label: 'Payments', icon: 'payments' },
  { to: '/expenses', label: 'Expenses', icon: 'expenses' },
  { to: '/promos', label: 'Promos & Offers', icon: 'promos' },
  { to: '/agents', label: 'Agents & Referrals', icon: 'agents' },
  { to: '/routers', label: 'Routers / NAS', icon: 'routers', section: 'Network' },
  { to: '/sessions', label: 'Live Sessions', icon: 'sessions' },
  { to: '/radius', label: 'RADIUS', icon: 'radius' },
  { to: '/devices', label: 'Devices & Binding', icon: 'devices' },
  { to: '/olts', label: 'OLT & Fiber', icon: 'olts' },
  { to: '/onboarding', label: 'MikroTik Onboarding', icon: 'onboarding' },
  { to: '/captive-portal', label: 'Captive Portal', icon: 'portal' },
  { to: '/sms', label: 'SMS Center', icon: 'sms', section: 'Communication' },
  { to: '/sms-templates', label: 'Message Templates', icon: 'template' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory', section: 'Administration' },
  { to: '/field-jobs', label: 'Field Jobs', icon: 'jobs' },
  { to: '/users', label: 'Staff & Roles', icon: 'users' },
  { to: '/audit', label: 'Audit Log', icon: 'audit' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      {icons[name]}
    </svg>
  )
}

export default function Layout() {
  const { theme, toggleTheme, logout, db } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const onlineRouters = db.routers.filter(r => r.status === 'online').length
  const openTickets = db.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length

  return (
    <div className="min-h-screen flex">
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white dark:bg-[#0e1626] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-lg">F</div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white leading-tight">FuelPro Billing</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">ISP Manager</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map(item => (
            <React.Fragment key={item.to}>
              {item.section && <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.section}</div>}
              <NavLink to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.to === '/tickets' && openTickets > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">{openTickets}</span>
                )}
              </NavLink>
            </React.Fragment>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-2 h-2 rounded-full ${onlineRouters === db.routers.length ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {onlineRouters}/{db.routers.length} routers online
          </div>
          <NavLink to="/portal" className="flex items-center gap-2 text-xs font-semibold text-brand-500 hover:underline" onClick={() => setOpen(false)}>
            <Icon name="portal" />
            Customer self-service portal
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 lg:px-6">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(true)} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="font-semibold text-slate-900 dark:text-white hidden sm:block">{db.settings.companyName}</div>
          <div className="flex-1" />
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" aria-label="Toggle theme">
            {theme === 'dark'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600/15 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">AD</div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">ADMIN</div>
              <div className="text-[10px] text-slate-400">Administrator</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="btn-ghost !px-3 !py-1.5 text-xs">
            Sign out
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
