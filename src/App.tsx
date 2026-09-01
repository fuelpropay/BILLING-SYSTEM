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
import Promos from './pages/Promos'
import Devices from './pages/Devices'
import CaptivePortal from './pages/CaptivePortal'
import Portal from './pages/Portal'
import Radius from './pages/Radius'
import Inventory from './pages/Inventory'
import FieldJobs from './pages/FieldJobs'
import Agents from './pages/Agents'
import SmsTemplates from './pages/SmsTemplates'
import Onboarding from './pages/Onboarding'
import Olts from './pages/Olts'

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
            <Route path="/promos" element={<Promos />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/captive-portal" element={<CaptivePortal />} />
            <Route path="/sms" element={<SmsLog />} />
            <Route path="/users" element={<Users />} />
            <Route path="/radius" element={<Radius />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/field-jobs" element={<FieldJobs />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/sms-templates" element={<SmsTemplates />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/olts" element={<Olts />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/portal" element={<Portal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
