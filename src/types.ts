export type SubscriberStatus = 'active' | 'suspended' | 'expired' | 'pending'
export type ServiceType = 'hotspot' | 'pppoe' | 'static'

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
  referredBy: string | null
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
  fupLimitGB: number // 0 = no fair-usage policy
  fupSpeedMbps: number // speed after FUP threshold; ignored when no FUP
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
  role: 'admin' | 'manager' | 'agent' | 'technician' | 'developer'
  active: boolean
  lastLogin: string
  passwordHash?: string
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
  reminderDays: number
  portalTitle: string
  portalWelcome: string
  portalColor: string
  portalAllowVoucher: boolean
  portalAllowTopup: boolean
  portalAd: string
}

export interface Promo {
  id: string
  code: string
  kind: 'percent' | 'fixed'
  value: number
  planId: string | null
  validTo: string
  maxUses: number
  usedCount: number
  active: boolean
  createdAt: string
}

export interface BoundDevice {
  id: string
  subscriberId: string
  label: string
  mac: string
  ip: string
  blocked: boolean
  dataDownMB: number
  dataUpMB: number
  lastSeenAt: string
}

export interface HotspotProfile {
  id: string
  name: string
  routerId: string
  rateLimitMbps: number
  sessionTimeoutMin: number
  idleTimeoutMin: number
  sharedUsers: number
  roaming: boolean
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  supplier: string
  cost: number
  serial: string
  status: 'in_stock' | 'deployed' | 'faulty' | 'returned'
  location: 'stockroom' | 'subscriber' | 'router'
  assignedTo: string // subscriber id or router id
  notes: string
}

export interface FieldJob {
  id: string
  title: string
  kind: 'installation' | 'maintenance' | 'upgrade' | 'survey' | 'relocation'
  subscriberId: string | null
  ticketId: string | null
  assignee: string
  scheduledAt: string
  status: 'scheduled' | 'in_progress' | 'done' | 'cancelled'
  checklist: { item: string; done: boolean }[]
  address: string
  notes: string
}

export interface AgentAccount {
  id: string
  name: string
  phone: string
  code: string
  commissionPct: number
  active: boolean
  createdAt: string
}

export interface AgentPayout {
  id: string
  agentId: string
  amount: number
  period: string
  status: 'pending' | 'paid'
  createdAt: string
}

export interface SmsTemplate {
  id: string
  name: string
  kind: SmsMessage['kind']
  channel: 'sms' | 'whatsapp'
  body: string
  active: boolean
}

export interface OLT {
  id: string
  name: string
  vendor: string
  ip: string
  location: string
  routerId: string
  ports: number
  onusOnline: number
  onusTotal: number
  snmpOk: boolean
  lastPollAt: string
}

export interface CreditNote {
  id: string
  number: string
  invoiceId: string
  subscriberId: string
  amount: number
  reason: string
  issuedBy: string
  createdAt: string
  status: 'applied' | 'draft' | 'void'
}

export interface TaxRule {
  id: string
  name: string
  rate: number
  appliesTo: 'all' | 'plan' | 'service'
  enabled: boolean
}

export interface IpPool {
  id: string
  name: string
  cidr: string
  routerId: string
  purpose: 'pppoe' | 'hotspot' | 'static'
  excluded: string
}

export interface WebhookRule {
  id: string
  event: 'payment' | 'invoice' | 'subscriber.create' | 'ticket.open' | 'session.dropped' | 'voucher.redeemed'
  url: string
  secret: string
  enabled: boolean
  lastStatus: number | null
  lastAttemptAt: string | null
}

export interface ApiKeyRecord {
  id: string
  label: string
  keyHash: string
  scope: 'read' | 'write' | 'full'
  createdAt: string
  lastUsedAt: string
  revoked: boolean
}

export interface Announcement {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  active: boolean
  createdAt: string
  expiresAt: string
}

export interface SlaPolicy {
  id: string
  name: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  respondMins: number
  resolveMins: number
  appliesTo: ('installs' | 'faults' | 'moves' | 'upgrades')[]
  enabled: boolean
}

export interface RecurringSchedule {
  id: string
  name: string
  planId: string
  dayOfMonth: number
  autoSuspend: boolean
  reminderDaysBefore: number
  dunning: 'none' | 'remind' | 'suspend' | 'escalate'
  enabled: boolean
}

export interface Refund {
  id: string
  paymentId: string
  subscriberId: string
  amount: number
  reason: string
  method: string
  status: 'pending' | 'processed' | 'rejected'
  issuedBy: string
  createdAt: string
}

export interface Currency {
  code: string
  symbol: string
  rate: number // relative to base (KES)
  isBase: boolean
  enabled: boolean
}

export interface PricingRule {
  id: string
  name: string
  planId: string
  startsAt: string
  endsAt: string
  discountPct: number
  active: boolean
}

export interface KbArticle {
  id: string
  title: string
  category: 'billing' | 'network' | 'account' | 'installation' | 'troubleshooting'
  body: string
  public: boolean
  views: number
  updatedAt: string
}

export interface TicketMacro {
  id: string
  name: string
  body: string
  setStatus: '' | 'open' | 'in_progress' | 'resolved' | 'closed'
  uses: number
}

export interface EscalationRule {
  id: string
  name: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  afterMins: number
  escalateTo: string
  notifyVia: 'sms' | 'email' | 'both'
  enabled: boolean
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
  promos: Promo[]
  devices: BoundDevice[]
  hotspotProfiles: HotspotProfile[]
  inventory: InventoryItem[]
  fieldJobs: FieldJob[]
  agents: AgentAccount[]
  agentPayouts: AgentPayout[]
  smsTemplates: SmsTemplate[]
  olts: OLT[]
  creditNotes: CreditNote[]
  taxRules: TaxRule[]
  ipPools: IpPool[]
  webhookRules: WebhookRule[]
  apiKeys: ApiKeyRecord[]
  announcements: Announcement[]
  slaPolicies: SlaPolicy[]
  recurringSchedules: RecurringSchedule[]
  refunds: Refund[]
  currencies: Currency[]
  pricingRules: PricingRule[]
  kbArticles: KbArticle[]
  macros: TicketMacro[]
  escalationRules: EscalationRule[]
}
