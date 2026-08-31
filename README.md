# BILLING-SYSTEM

**FuelPro Billing** — ISP Billing & Network Management Platform. A full-featured admin dashboard for running an ISP: subscriber management, invoicing, payments, hotspot vouchers, PPPoE/hotspot plans, router (NAS) monitoring, live sessions, support tickets, expenses, SMS center, staff roles and a complete audit trail.

## Demo credentials

| Field    | Value   |
| -------- | ------- |
| Username | `ADMIN` |
| Password | `ADMIN` |

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark / light theme)
- React Router (hash routing — works on any static host)
- Client-side data layer persisted to `localStorage`, seeded with a realistic demo dataset (resets from **Settings → Danger zone**)

## Modules

- **Dashboard** — revenue KPIs, 30-day revenue chart, plan distribution, recent payments, live sessions
- **Subscribers** — full CRUD, search/filter by status & type, activate/suspend, CSV export
- **Plans & Packages** — PPPoE and hotspot plans with speed, data caps, validity, pricing
- **Invoices** — create, bulk monthly generation, mark-paid, overdue tracking, CSV export
- **Payments** — M-Pesa/card/cash/voucher/bank recording with automatic invoice settlement
- **Vouchers** — batch generation, redemption flow that activates subscribers, CSV export
- **Routers / NAS** — device inventory with uptime, CPU/memory, online/offline control
- **Live Sessions** — active hotspot/PPPoE sessions with traffic counters and disconnect
- **Reports** — revenue vs expenses, churn rate, ARPU, signups trend, MRR by plan, top data consumers
- **Promos & Offers** — promo codes with percent/fixed discounts, plan scoping, validity windows and usage tracking (redeemable in the customer portal)
- **Devices & Binding** — MAC-address binding per subscriber, block/unblock, per-device bandwidth accounting
- **Captive Portal** — brandable hotspot login page with live preview, plus hotspot profiles (rate limit, session/idle timeouts, shared users, hotspot roaming)
- **Customer Self-Service Portal** (`#/portal`) — public portal where subscribers sign in with username/phone to view balance, plan, data usage, bound devices, invoices and payment history, buy packages via M-Pesa (with promo codes) and redeem vouchers
- **Support Tickets** — priorities, assignees, status workflow
- **Expenses** — categorized spend tracking with charts
- **SMS Center** — message log and broadcast composer
- **Staff & Roles** — team accounts with admin/manager/agent/technician roles
- **Audit Log** — every action recorded and exportable
- **Settings** — company profile, M-Pesa/SMS integration config, billing automation rules

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
```

The `dist/` folder is a static site and can be deployed to Cloudflare Pages, Vercel, Netlify or any static host.
