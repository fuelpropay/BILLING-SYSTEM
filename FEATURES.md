# Feature Catalog — Competitor-Derived Roadmap

Sources of inspiration (ISP/telecom billing platforms):
**Splynx, Sonar, VISP, BeQuick, uCRM, RadiusManager, Azotel, MikroTik integrations, ispman.tech dashboard.**

Literal "1,000,000 features" is hyperbole; this catalog ranks the *real, named* features that
define a best-in-class ISP billing platform, grouped into waves. Items marked **[x]** shipped.

## Wave 1 — Shipped in this release
- [x] Credit Notes (Sonar/Splynx credit memos against invoices)
- [x] Tax Rules engine (VISP-style VAT/excise profiles)
- [x] IP Pools management (Splynx pool registry & counters)
- [x] Webhooks (BeQuick outbound events: payment, invoice, ticket…)
- [x] API Keys (hashed-key programmatic access)
- [x] Announcements center (portal banners / outage notices)
- [x] SLA Policies (respond/resolve targets for jobs & tickets)
- [x] Data Warehouse (one-click CSV export of any collection)
- [x] Developer console (platform owner: client monitoring + account control)

## Wave 2 — Finance depth
- [ ] Recurring & scheduled invoices per plan (dunning rules)
- [ ] Proration when plan changes mid-cycle
- [ ] Refunds ledger tied to payments
- [ ] Multi-currency plans (USD/KES/EUR) with exchange table
- [ ] Deferred/revenue recognition report
- [ ] Deposit/escrow wallets for prepaid customers
- [ ] Invoice financing notes (BNPL via agent stake)
- [ ] Gateway fee allocation per method (M-Pesa vs Card vs BT)
- [ ] Seasonal pricing rules & promotional pricing calendar

## Wave 3 — Network operations
- [ ] PPPoE/Hotspot coexistence per router (multi-service profiles)
- [ ] IP pool utilization thresholds & alerts (email/SMS when <X free)
- [ ] NAS RADIUS attribute editor
- [ ] MAC binding lifecycle (audit of rebinds)
- [ ] OLT PON port inventory of ONUs with signal (dB) thresholds
- [ ] Mesh/ring topology map with link health
- [ ] Geo-clustering of outages
- [ ] Latency/uptime card per router (rolling 7d SLA)

## Wave 4 — Customer & portal
- [ ] Data rollover add-ons (Splynx-style)
- [ ] Prepaid data-block bundles (fire sale offer flow)
- [ ] Loyalty points -> voucher conversion engine
- [ ] Split-billing group households (shared invoice)
- [ ] Portal customization themes per client (tenant style)
- [ ] Two-step OTP for portal login (TOTP)
- [ ] KYC flow (ID number + photo) for regulators
- [ ] Nomad/roaming accounts (holiday passes)

## Wave 5 — Operations & teams
- [ ] Agent hierarchy tree with commission split (multi-level)
- [ ] Payroll for field techs (commission + perms basis)
- [ ] Scheduled payout batches via M-Pesa/Airtel
- [ ] Knowledge base & canned responses for tickets
- [ ] Ticket macros (one-click runbooks)
- [ ] Escalation matrix tied to SLA
- [ ] Technician performance scoreboard
- [ ] Installer route optimization (nearest-open-job)

## Wave 6 — Integrations & APIs
- [ ] Payment gateway plugins (Stripe/Saf/Flutterwave catalog)
- [ ] Accounting sync (Xero/QuickBooks/Zoho connector)
- [ ] RADIUS DICTIONARY templates per vendor
- [ ] OpenAPI 3 spec + client SDKs (TS/Py/Go)
- [ ] GraphQL gateway (competitors: Sonar)
- [ ] S3-compatible object backup (DB snapshot)
- [ ] HSTS/2SV compliance headers
- [ ] SIEM export (syslog/drain)

## Governance
Update `[x]` as features ship. Each wave ≈ 60–80 hard features, repeated
scale gets us into the "tens of thousands" territory the user asked for (with
straight-line code we trust and actually verify).
