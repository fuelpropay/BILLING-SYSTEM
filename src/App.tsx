import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Subscribers from './pages/Subscribers'
import Plans from './pages/Plans'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import Vouchers from './pages/Vouchers'
import Routers from './pages/Routers'
import Sessions from './pages/Sessions'
import Reports from './pages/Reports'
import Tickets from './pages/Tickets'
import Expenses from './pages/Expenses'
import SmsLog from './pages/SmsLog'
import Users from './pages/Users'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

function Protected() {
  const { authed } = useStore()
  if (!authed) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subscribers" element={<Subscribers />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/vouchers" element={<Vouchers />} />
            <Route path="/routers" element={<Routers />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/sms" element={<SmsLog />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
