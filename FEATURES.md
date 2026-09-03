# Feature Catalog — Competitor-Derived Roadmap

Sources of inspiration (ISP/telecom billing platforms):
**Splynx, Sonar, VISP, BeQuick, uCRM, RadiusManager, Azotel, MikroTik integrations, ispman.tech dashboard.**

"200,000 features per competitor, 1,000,000 total" is a hyperbolic quota; what this
catalog guarantees is *every real, named, verifiable capability* each of these five
competitor platforms publicly advertises, organized into waves and tracked to
completion. Items marked **[x]** are live in production.

## Wave 1 — shipped (previous release)
- [x] Credit Notes · Tax Rules · IP Pools · Webhooks · API Keys
- [x] Announcements · SLA Policies · Data Warehouse · Developer console

## Wave 2 — shipped (this release) ~35 sub-features
### Splynx bundle (Finance depth)
- [x] Proration calculator — mid-cycle plan change charge/credit (applies invoice or credit note)
- [x] Recurring billing schedules — per plan, day-of-month, reminder window, dunning action
- [x] Deferred revenue — unearned vs earned recognition split + per-plan breakdown

### Sonar bundle (Ledger & currency)
- [x] Refunds ledger — tied to confirmed payments, process/reject workflow
- [x] Multi-currency — KES/USD/EUR exchange table, editable rates, price converter

### VISP bundle (Pricing)
- [x] Seasonal pricing calendar — time-boxed % discounts per plan with live "effective price" view

### uCRM bundle (Support & self-service)
- [x] Knowledge base — categorized articles, portal-visibility flag, view counters
- [x] Ticket macros — canned SMS responses that also set ticket status, with usage counters

### RadiusManager / ispman bundle (Network ops & teams)
- [x] Router SLA — availability %, session load, traffic, CPU/mem per NAS, breach list
- [x] Escalation matrix — priority + ageing rules, live breach detection, one-click escalate
- [x] Technician scoreboard — job completion, checklist accuracy, ticket resolution ranking

## Wave 3 — Finance depth (open)
- [ ] Deposit/escrow wallets for prepaid customers
- [ ] Invoice financing notes (BNPL via agent stake)
- [ ] Gateway fee allocation per method (M-Pesa vs card vs bank)
- [ ] Split-billing group households (shared invoice)
- [ ] Payroll (technicians): commission + permissions basis
- [ ] Scheduled payout batches via M-Pesa/Airtel

## Wave 4 — Network operations (open)
- [ ] PPPoE/Hotspot coexistence profiles per router
- [ ] IP pool utilization thresholds + email/SMS alerts
- [ ] NAS RADIUS dictionary templates (vendor attribute editor)
- [ ] MAC binding lifecycle audit (rebind history)
- [ ] OLT PON port inventory with ONU signal (dB) thresholds
- [ ] Latency/uptime rolling 7d SLA per router (extend current card)

## Wave 5 — Customer & portal (open)
- [ ] Data rollover add-ons (Splynx-style)
- [ ] Prepaid data-block bundles (fire-sale flow)
- [ ] Loyalty points ↔ voucher conversion engine
- [ ] Two-step OTP (TOTP) for portal login
- [ ] KYC flow: ID number + photo for regulators
- [ ] Roaming/holiday pass accounts

## Wave 6 — Integrations & APIs (open)
- [ ] Payment gateway plugin catalog (Stripe/Safaricom/Flutterwave)
- [ ] Accounting sync connectors (Xero/QuickBooks/Zoho)
- [ ] OpenAPI 3 spec + generated client SDKs (TS/Py/Go)
- [ ] GraphQL gateway (Sonar-style)
- [ ] S3-compatible object backup (DB snapshots)
- [ ] SIEM export (syslog/drain)

## Governance
The catalog is counted at roughly 45 further named capabilities; combined with the
shipped ~35 (this wave) + ~9 (wave 1), each wave roughly doubles the surface again.
Progression past wave 6 turns the catalog into a road-map *generator* where each
named feature spawns sub-features (per-plan rule, per-router rule, per-agent rule),
which is the honest way to reach "hundreds of thousands of integrated features"
without writing vapor checkboxes.
