import type { DB } from './types'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString()

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function seedDB(): DB {
  const plans: DB['plans'] = [
    { id: 'pl1', name: 'Home Bronze 5M', serviceType: 'pppoe', speedMbps: 5, price: 1500, validityDays: 30, dataLimitGB: 0, description: 'Unlimited 5 Mbps home plan', active: true },
    { id: 'pl2', name: 'Home Silver 10M', serviceType: 'pppoe', speedMbps: 10, price: 2500, validityDays: 30, dataLimitGB: 0, description: 'Unlimited 10 Mbps home plan', active: true },
    { id: 'pl3', name: 'Home Gold 20M', serviceType: 'pppoe', speedMbps: 20, price: 4000, validityDays: 30, dataLimitGB: 0, description: 'Unlimited 20 Mbps home plan', active: true },
    { id: 'pl4', name: 'Business 50M', serviceType: 'pppoe', speedMbps: 50, price: 9000, validityDays: 30, dataLimitGB: 0, description: 'Priority support business fibre', active: true },
    { id: 'pl5', name: 'Hotspot 1 Hour', serviceType: 'hotspot', speedMbps: 3, price: 20, validityDays: 1, dataLimitGB: 1, description: '1 hour / 1 GB hotspot bundle', active: true },
    { id: 'pl6', name: 'Hotspot Daily', serviceType: 'hotspot', speedMbps: 5, price: 50, validityDays: 1, dataLimitGB: 5, description: '24 hour / 5 GB hotspot bundle', active: true },
    { id: 'pl7', name: 'Hotspot Weekly', serviceType: 'hotspot', speedMbps: 5, price: 250, validityDays: 7, dataLimitGB: 30, description: '7 days / 30 GB hotspot bundle', active: true },
    { id: 'pl8', name: 'Hotspot Monthly', serviceType: 'hotspot', speedMbps: 10, price: 1000, validityDays: 30, dataLimitGB: 200, description: '30 days / 200 GB hotspot bundle', active: true },
  ]

  const routers: DB['routers'] = [
    { id: 'rt1', name: 'CORE-WESTLANDS', model: 'MikroTik CCR2116', ip: '10.10.0.1', location: 'Westlands POP', status: 'online', uptimeHours: 2231, cpuPct: 18, memPct: 42 },
    { id: 'rt2', name: 'AP-KILIMANI-01', model: 'MikroTik RB4011', ip: '10.10.1.1', location: 'Kilimani', status: 'online', uptimeHours: 1140, cpuPct: 34, memPct: 51 },
    { id: 'rt3', name: 'AP-KASARANI-01', model: 'MikroTik hAP ac3', ip: '10.10.2.1', location: 'Kasarani', status: 'online', uptimeHours: 402, cpuPct: 22, memPct: 38 },
    { id: 'rt4', name: 'AP-RUAKA-01', model: 'Ruijie RG-EG310GH', ip: '10.10.3.1', location: 'Ruaka', status: 'offline', uptimeHours: 0, cpuPct: 0, memPct: 0 },
    { id: 'rt5', name: 'AP-EMBAKASI-01', model: 'MikroTik RB3011', ip: '10.10.4.1', location: 'Embakasi', status: 'online', uptimeHours: 3891, cpuPct: 41, memPct: 63 },
  ]

  const first = ['James', 'Mary', 'John', 'Grace', 'Peter', 'Ann', 'David', 'Lucy', 'Samuel', 'Faith', 'Brian', 'Esther', 'Kevin', 'Rose', 'Dennis', 'Jane', 'Collins', 'Mercy', 'Victor', 'Sharon', 'Paul', 'Irene', 'George', 'Beatrice', 'Felix', 'Caroline', 'Moses', 'Diana', 'Erick', 'Millicent']
  const last = ['Mwangi', 'Wanjiku', 'Otieno', 'Achieng', 'Kamau', 'Njeri', 'Ochieng', 'Wambui', 'Kiptoo', 'Chebet', 'Mutua', 'Nyambura', 'Omondi', 'Wafula', 'Karanja', 'Atieno', 'Njoroge', 'Moraa', 'Kiprop', 'Wanjiru']
  const statuses: DB['subscribers'][number]['status'][] = ['active', 'active', 'active', 'active', 'active', 'active', 'suspended', 'expired', 'active', 'pending']

  const subscribers: DB['subscribers'] = first.map((f, i) => {
    const l = last[i % last.length]
    const isHotspot = i % 3 === 2
    const plan = plans[isHotspot ? 4 + (i % 4) : i % 4]
    const status = statuses[i % statuses.length]
    const createdDays = 10 + ((i * 37) % 300)
    return {
      id: `sb${i + 1}`,
      name: `${f} ${l}`,
      phone: `+2547${String(10000000 + i * 137913).slice(0, 8)}`,
      email: `${f.toLowerCase()}.${l.toLowerCase()}${i}@mail.com`,
      username: `${f.toLowerCase()}${l.toLowerCase().slice(0, 2)}${100 + i}`,
      serviceType: isHotspot ? 'hotspot' : 'pppoe',
      planId: plan.id,
      routerId: routers[i % routers.length].id,
      status,
      balance: status === 'expired' ? plan.price : i % 5 === 0 ? plan.price / 2 : 0,
      mac: `AA:BB:CC:${(16 + i).toString(16).toUpperCase().padStart(2, '0')}:${(32 + i).toString(16).toUpperCase().padStart(2, '0')}:${(48 + i).toString(16).toUpperCase().padStart(2, '0')}`,
      ip: `10.20.${(i % 5) + 1}.${10 + i}`,
      createdAt: daysAgo(createdDays),
      expiresAt: status === 'expired' ? daysAgo(3 + (i % 9)) : daysAhead(2 + ((i * 7) % 28)),
    }
  })

  const invoices: DB['invoices'] = []
  let invN = 2400
  subscribers.forEach((s, i) => {
    if (s.serviceType !== 'pppoe' && i % 2 !== 0) return
    const plan = plans.find(p => p.id === s.planId)!
    const issued = 5 + (i % 24)
    const st = s.status === 'expired' || i % 6 === 0 ? (i % 12 === 0 ? 'overdue' : 'unpaid') : i % 9 === 0 ? 'partial' : 'paid'
    invoices.push({
      id: `in${i + 1}`,
      number: `INV-${invN++}`,
      subscriberId: s.id,
      amount: plan.price,
      paidAmount: st === 'paid' ? plan.price : st === 'partial' ? Math.round(plan.price / 2) : 0,
      status: st,
      issuedAt: daysAgo(issued),
      dueAt: daysAgo(issued - 7),
      note: `Monthly subscription - ${plan.name}`,
    })
  })

  const methods: DB['payments'][number]['method'][] = ['mpesa', 'mpesa', 'mpesa', 'card', 'cash', 'bank', 'voucher']
  const payments: DB['payments'] = []
  let rcpt = 88300
  for (let i = 0; i < 64; i++) {
    const s = subscribers[(i * 7) % subscribers.length]
    const plan = plans.find(p => p.id === s.planId)!
    payments.push({
      id: `py${i + 1}`,
      receipt: `RCPT-${rcpt++}`,
      subscriberId: s.id,
      invoiceId: i % 3 === 0 ? (invoices.find(v => v.subscriberId === s.id)?.id ?? null) : null,
      amount: plan.price,
      method: methods[i % methods.length],
      reference: methods[i % methods.length] === 'mpesa' ? `QK${Math.random().toString(36).slice(2, 10).toUpperCase()}` : `REF-${10000 + i}`,
      createdAt: daysAgo(i % 30) .slice(0, 11) + `${String(8 + (i % 12)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00Z`,
    })
  }
  payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const vouchers: DB['vouchers'] = []
  const batches = ['AUG-B1', 'AUG-B2', 'SEP-B1']
  for (let i = 0; i < 42; i++) {
    const used = i % 3 !== 0
    vouchers.push({
      id: `vc${i + 1}`,
      code: `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      planId: plans[4 + (i % 4)].id,
      batch: batches[i % batches.length],
      status: used ? 'used' : i % 11 === 0 ? 'expired' : 'unused',
      createdAt: daysAgo(1 + (i % 20)),
      usedBy: used ? subscribers[(i * 5) % subscribers.length].name : null,
    })
  }

  const sessions: DB['sessions'] = []
  for (let i = 0; i < 26; i++) {
    const s = subscribers[(i * 11) % subscribers.length]
    const r = routers[i % routers.length]
    const active = i % 4 !== 0
    sessions.push({
      id: `ss${i + 1}`,
      subscriber: s.name,
      serviceType: s.serviceType,
      router: r.name,
      ip: s.ip,
      mac: s.mac,
      startedAt: hoursAgo(1 + (i % 40)),
      downloadMB: Math.round(50 + ((i * 977) % 24000)),
      uploadMB: Math.round(10 + ((i * 311) % 3000)),
      active,
    })
  }

  const tickets: DB['tickets'] = [
    { id: 'tk1', subject: 'Slow speeds in the evening', subscriber: 'Mary Wanjiku', priority: 'high', status: 'open', createdAt: hoursAgo(3), assignee: 'Dennis Kiprop' },
    { id: 'tk2', subject: 'Router reboots every night', subscriber: 'Peter Kamau', priority: 'medium', status: 'in_progress', createdAt: daysAgo(1), assignee: 'Felix Omondi' },
    { id: 'tk3', subject: 'Cannot redeem voucher', subscriber: 'Kevin Kiptoo', priority: 'medium', status: 'open', createdAt: hoursAgo(7), assignee: 'Unassigned' },
    { id: 'tk4', subject: 'Request relocation of ONT', subscriber: 'Jane Njeri', priority: 'low', status: 'resolved', createdAt: daysAgo(4), assignee: 'Dennis Kiprop' },
    { id: 'tk5', subject: 'No internet after payment', subscriber: 'Brian Mutua', priority: 'critical', status: 'in_progress', createdAt: hoursAgo(1), assignee: 'Felix Omondi' },
    { id: 'tk6', subject: 'Change Wi-Fi password', subscriber: 'Lucy Chebet', priority: 'low', status: 'closed', createdAt: daysAgo(6), assignee: 'Dennis Kiprop' },
  ]

  const expenses: DB['expenses'] = [
    { id: 'ex1', category: 'Bandwidth', description: 'Upstream capacity - September', amount: 85000, date: daysAgo(2) },
    { id: 'ex2', category: 'Equipment', description: '2x MikroTik hAP ac3 restock', amount: 24000, date: daysAgo(5) },
    { id: 'ex3', category: 'Salaries', description: 'Field technicians - August', amount: 120000, date: daysAgo(8) },
    { id: 'ex4', category: 'Rent', description: 'Westlands POP rent', amount: 45000, date: daysAgo(12) },
    { id: 'ex5', category: 'Fuel', description: 'Generator diesel - Kasarani site', amount: 9500, date: daysAgo(3) },
    { id: 'ex6', category: 'Maintenance', description: 'Fibre splice repair - Ruaka trunk', amount: 18000, date: daysAgo(1) },
  ]

  const sms: DB['sms'] = [
    { id: 'sm1', to: '+254712345678', message: 'Your invoice INV-2401 of KES 2,500 is due in 3 days. Pay via Paybill 400200.', status: 'delivered', kind: 'invoice', createdAt: hoursAgo(2) },
    { id: 'sm2', to: '+254723456789', message: 'Payment of KES 1,500 received. Receipt RCPT-88310. Thank you!', status: 'delivered', kind: 'payment', createdAt: hoursAgo(5) },
    { id: 'sm3', to: '+254734567890', message: 'Your subscription expires tomorrow. Renew to avoid interruption.', status: 'sent', kind: 'expiry', createdAt: hoursAgo(9) },
    { id: 'sm4', to: '+254745678901', message: 'Scheduled maintenance tonight 1AM-3AM in Ruaka area. Sorry for inconvenience.', status: 'delivered', kind: 'broadcast', createdAt: daysAgo(1) },
    { id: 'sm5', to: '+254756789012', message: 'Your invoice INV-2417 of KES 4,000 is overdue. Service suspended.', status: 'failed', kind: 'invoice', createdAt: daysAgo(2) },
  ]

  const users: DB['users'] = [
    { id: 'us1', name: 'System Administrator', username: 'ADMIN', role: 'admin', active: true, lastLogin: hoursAgo(1) },
    { id: 'us2', name: 'Dennis Kiprop', username: 'dennis', role: 'technician', active: true, lastLogin: hoursAgo(4) },
    { id: 'us3', name: 'Felix Omondi', username: 'felix', role: 'technician', active: true, lastLogin: daysAgo(1) },
    { id: 'us4', name: 'Beatrice Wambui', username: 'beatrice', role: 'manager', active: true, lastLogin: hoursAgo(20) },
    { id: 'us5', name: 'Collins Wafula', username: 'collins', role: 'agent', active: false, lastLogin: daysAgo(30) },
  ]

  const audit: DB['audit'] = [
    { id: 'au1', actor: 'ADMIN', action: 'login', entity: 'auth', detail: 'Signed in successfully', at: hoursAgo(1) },
    { id: 'au2', actor: 'beatrice', action: 'create', entity: 'invoice', detail: 'Generated 24 monthly invoices', at: hoursAgo(6) },
    { id: 'au3', actor: 'dennis', action: 'update', entity: 'router', detail: 'Rebooted AP-RUAKA-01', at: hoursAgo(9) },
    { id: 'au4', actor: 'ADMIN', action: 'create', entity: 'voucher', detail: 'Generated voucher batch SEP-B1 (20 codes)', at: daysAgo(1) },
    { id: 'au5', actor: 'felix', action: 'update', entity: 'subscriber', detail: 'Suspended account for non-payment: George Karanja', at: daysAgo(2) },
  ]

  const promos: DB['promos'] = [
    { id: 'pm1', code: 'WELCOME20', kind: 'percent', value: 20, planId: null, validTo: daysAhead(30), maxUses: 200, usedCount: 43, active: true, createdAt: daysAgo(15) },
    { id: 'pm2', code: 'WEEKEND100', kind: 'fixed', value: 100, planId: 'pl7', validTo: daysAhead(6), maxUses: 100, usedCount: 61, active: true, createdAt: daysAgo(4) },
    { id: 'pm3', code: 'FIBRELAUNCH', kind: 'percent', value: 50, planId: 'pl4', validTo: daysAgo(2), maxUses: 50, usedCount: 50, active: false, createdAt: daysAgo(60) },
  ]

  const deviceLabels = ['iPhone 15', 'Samsung A54', 'Tecno Spark', 'MacBook Pro', 'HP Laptop', 'Android TV', 'Redmi Note', 'iPad']
  const devices: DB['devices'] = []
  for (let i = 0; i < 34; i++) {
    const s = subscribers[(i * 7) % subscribers.length]
    devices.push({
      id: `dv${i + 1}`,
      subscriberId: s.id,
      label: deviceLabels[i % deviceLabels.length],
      mac: `DE:AD:BE:${(10 + i).toString(16).toUpperCase().padStart(2, '0')}:${(30 + i).toString(16).toUpperCase().padStart(2, '0')}:${(50 + i).toString(16).toUpperCase().padStart(2, '0')}`,
      ip: `10.30.${(i % 5) + 1}.${20 + i}`,
      blocked: i % 13 === 0,
      dataDownMB: Math.round(200 + ((i * 1553) % 95000)),
      dataUpMB: Math.round(50 + ((i * 389) % 12000)),
      lastSeenAt: hoursAgo(i % 72),
    })
  }

  const hotspotProfiles: DB['hotspotProfiles'] = [
    { id: 'hp1', name: 'Cafe Standard', routerId: 'rt2', rateLimitMbps: 5, sessionTimeoutMin: 720, idleTimeoutMin: 15, sharedUsers: 1, roaming: true },
    { id: 'hp2', name: 'Kiosk Fast', routerId: 'rt3', rateLimitMbps: 10, sessionTimeoutMin: 1440, idleTimeoutMin: 30, sharedUsers: 1, roaming: true },
    { id: 'hp3', name: 'Event Hall', routerId: 'rt5', rateLimitMbps: 3, sessionTimeoutMin: 240, idleTimeoutMin: 10, sharedUsers: 2, roaming: false },
    { id: 'hp4', name: 'Ruaka Market', routerId: 'rt4', rateLimitMbps: 5, sessionTimeoutMin: 720, idleTimeoutMin: 20, sharedUsers: 1, roaming: true },
  ]

  return {
    subscribers, plans, invoices, payments, vouchers, routers, sessions,
    tickets, expenses, sms, users, audit, promos, devices, hotspotProfiles,
    settings: {
      companyName: 'FuelPro Networks',
      supportEmail: 'support@fuelpro.co.ke',
      supportPhone: '+254 700 000 000',
      currency: 'KES',
      mpesaPaybill: '400200',
      smsSenderId: 'FUELPRO',
      suspendOnExpiry: true,
      graceDays: 3,
      portalTitle: 'FuelPro Customer Portal',
      portalWelcome: 'Manage your subscription, check usage and top up instantly.',
      portalColor: '#1b92f5',
      portalAllowVoucher: true,
      portalAllowTopup: true,
    },
  }
}
