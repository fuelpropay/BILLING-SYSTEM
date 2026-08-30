export type SubscriberStatus = 'active' | 'suspended' | 'expired' | 'pending'
export type ServiceType = 'hotspot' | 'pppoe'

export interface Subscriber {
  id: string
  name: string
  phone: string
  email: string
  username: string
  serviceType: ServiceType
  planId: string
  routerId: string
  status: SubscriberStatus
  balance: number
  mac: string
  ip: string
  createdAt: string
  expiresAt: string
}

export interface Plan {
  id: string
  name: string
  serviceType: ServiceType
  speedMbps: number
  price: number
  validityDays: number
  dataLimitGB: number // 0 = unlimited
  description: string
  active: boolean
}

export type InvoiceStatus = 'paid' | 'unpaid' | 'partial' | 'overdue'

export interface Invoice {
  id: string
  number: string
  subscriberId: string
  amount: number
  paidAmount: number
  status: InvoiceStatus
  issuedAt: string
  dueAt: string
  note: string
}

export type PaymentMethod = 'mpesa' | 'card' | 'cash' | 'voucher' | 'bank'

export interface Payment {
  id: string
  receipt: string
  subscriberId: string
  invoiceId: string | null
  amount: number
  method: PaymentMethod
  reference: string
  createdAt: string
}

export type VoucherStatus = 'unused' | 'used' | 'expired'

export interface Voucher {
  id: string
  code: string
  planId: string
  batch: string
  status: VoucherStatus
  createdAt: string
  usedBy: string | null
}

export interface Router {
  id: string
  name: string
  model: string
  ip: string
  location: string
  status: 'online' | 'offline'
  uptimeHours: number
  cpuPct: number
  memPct: number
}

export interface Session {
  id: string
  subscriber: string
  serviceType: ServiceType
  router: string
  ip: string
  mac: string
  startedAt: string
  downloadMB: number
  uploadMB: number
  active: boolean
}

export interface Ticket {
  id: string
  subject: string
  subscriber: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
  assignee: string
}

export interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
}

export interface SmsMessage {
  id: string
  to: string
  message: string
  status: 'sent' | 'delivered' | 'failed' | 'queued'
  kind: 'invoice' | 'payment' | 'expiry' | 'broadcast' | 'otp'
  createdAt: string
}

export interface StaffUser {
  id: string
  name: string
  username: string
  role: 'admin' | 'manager' | 'agent' | 'technician'
  active: boolean
  lastLogin: string
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  entity: string
  detail: string
  at: string
}

export interface Settings {
  companyName: string
  supportEmail: string
  supportPhone: string
  currency: string
  mpesaPaybill: string
  smsSenderId: string
  suspendOnExpiry: boolean
  graceDays: number
}

export interface DB {
  subscribers: Subscriber[]
  plans: Plan[]
  invoices: Invoice[]
  payments: Payment[]
  vouchers: Voucher[]
  routers: Router[]
  sessions: Session[]
  tickets: Ticket[]
  expenses: Expense[]
  sms: SmsMessage[]
  users: StaffUser[]
  audit: AuditEntry[]
  settings: Settings
}
