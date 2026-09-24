# Non-Functional Requirements

Status: v0.1 (Playbook step A2). Targets are ASSUMPTIONS sized for a small pilot. Revisit before public launch.

| ID | Area | Requirement | How it's verified |
|---|---|---|---|
| N1 | Performance | Largest Contentful Paint ≤ 2,5 s and Interaction to Next Paint ≤ 200 ms at the 75th percentile on a mid-range Android phone on 4G | Lighthouse (mobile profile) in CI on key routes; field data after launch |
| N2 | Performance | Dashboard server response ≤ 500 ms p95 for a household with 24 months of data (~2 000 transactions) | Load test with synthetic seed |
| N3 | Performance | PDF export generated in ≤ 5 s p95 | Timed integration test |
| N4 | Availability | 99,5% monthly for app and API (ASSUMPTION, bounded by provider SLAs) | Uptime monitor |
| N5 | Accessibility | WCAG 2.2 AA; keyboard-only completion of every journey; screen reader labels on all controls and charts; 44 px touch targets | axe-core in CI (zero serious or critical), manual screen reader pass per release |
| N6 | Responsiveness | Usable from 320 px width; no horizontal page scroll; phone, tablet and desktop layouts per `docs/l3/screens.md` | Playwright screenshots at 320, 390, 820 and 1280 px |
| N7 | Browsers | Last 2 versions of Chrome, Safari (iOS and macOS), Edge, Firefox and Samsung Internet | Playwright on Chromium, WebKit and Firefox |
| N8 | Correctness | All L4 vectors pass in the app library; money only as integer cents end to end | Unit tests in CI; type rules forbid `number` for money outside the library boundary (A3 decision) |
| N9 | Security | Per `threat-model.md`; RLS on every household table; secrets only server-side; dependency audit clean of high or critical | CI checks, RLS tests, `npm audit` |
| N10 | Privacy | POPIA: purpose limitation, minimality, access and deletion rights, Information Officer named, operator agreements with processors | Privacy review before launch (`release-checklist.md`) |
| N11 | Data retention | Deleted accounts: data removed from the live database immediately and from backups within the provider's backup rotation (to be stated in the privacy notice, ASSUMPTION ≤ 30 days). Audit events kept 12 months without financial amounts | Deletion test; documented backup rotation |
| N12 | Backups | Daily automated backups; point-in-time recovery if the Supabase plan allows. **RPO ≤ 24 h, RTO ≤ 8 h** | A restore to a scratch project is rehearsed before launch and quarterly |
| N13 | Observability | Structured server logs with request ID; errors to an error tracker; **no amounts, descriptions or notes in logs** | Log review; redaction test |
| N14 | Localisation | en-ZA; money per L4 §7; dates `24 Sep 2026`; time zone Africa/Johannesburg | Unit tests on formatters |
| N15 | Maintainability | TypeScript strict; lint and format in CI; each feature slice has tests; docs updated per operating plan rules | CI |
| N16 | Portability | Export gives the user all their data in open formats (CSV, PDF) | Export test compares record counts |
