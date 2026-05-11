# CarePath Roadmap

> From scaffold (today) to category leader — a phased plan to surpass A Place for Mom on the family side and PointClickCare on the facility side.

**Current state (2026-05-11):** Scaffold deployed.
**Target state:** Best-in-class LTC marketplace + ops platform. Specifically: beat APFM on trust & speed, beat PCC on UX & data, beat both on AI integration.

---

## What we've already shipped (Phase 0 ✅)

- Vite + React 19 + TS + Tailwind v4 + shadcn/ui frontend → GitHub Pages
- Laravel 13 + Sanctum + spatie/permission + PostgreSQL backend → Railway
- 7 portal route skeletons + Airbnb-style marketplace stub
- Core data models (Facility, Bed, Resident, immutable AuditLog) + 4 migrations
- FacilityScope middleware (multi-tenant boundary)
- 7 demo accounts seeded, one-click portal entry from `/login`
- CI/CD: GH Actions → Pages, Railway redeploys on `railway up`

**Honest assessment:** ~5% complete. Pretty, navigable, but no real functionality behind any screen.

---

## The competitors we're beating

| Slice | Incumbent | What they do well | What they do badly | Our wedge |
|---|---|---|---|---|
| Family discovery | **A Place for Mom** | National coverage, brand recognition | Sells leads to 100+ facilities per submission, dated UX, "consultant" pressure tactics | Transparent pricing, no lead-selling, modern UX, real availability |
| Family discovery (content) | **Caring.com / SeniorLiving.org** | SEO content, reviews | Same lead-gen model | Real reviews tied to verified stays |
| Facility EHR/ops | **PointClickCare** | Market dominance, deep clinical | 2005-era UI, expensive ($$$/bed/month), slow | Linear-fast UX, transparent pricing, modern API |
| Facility ops (AL-only) | **MatrixCare / Eldermark** | AL-specific workflows | Same UX issues, weaker compliance | Same wedge as PCC |
| Resident-facing | **Connected Living / iN2L** | Engagement content | Walled-garden hardware tablets | Bring-your-own-device, MyChart-style portal |

**Strategic principle:** Pick a slice, ship it 10× better, expand. We're not boiling the ocean — we're starting with the facility ops portal (recurring revenue, defensible) and expanding outward.

---

## Phase 1 — Real auth + identity (2 weeks)

**Theme:** Replace the localStorage demo auth with production-grade Sanctum + RBAC + 2FA.

**Why now:** Everything downstream depends on knowing *who* is logged in and *what facility/role* they have access to. Skipping this means rebuilding every later phase.

### Backend
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- Email verification (Resend) + password reset
- TOTP 2FA via `pragmarx/google2fa` + backup codes
- spatie/laravel-permission roles: `super_admin`, `network_admin`, `facility_admin`, `facility_staff`, `referral_partner`, `family_member`, `resident`
- Policies for every model — `FacilityPolicy`, `ResidentPolicy`, `BedPolicy`, etc.
- Login throttle: 5 attempts / 15 min per IP+email
- Sanctum cookie-mode for SPA (no Bearer tokens in JS — httpOnly cookies)

### Frontend
- React Query auth hooks: `useMe`, `useLogin`, `useLogout`, `useRegister`
- `<ProtectedRoute>` wrapper that redirects to `/login` if unauthenticated
- `<RequireRole roles={['facility_admin']}>` for portal gating
- 2FA enrollment flow with QR code + verification challenge
- "Switch facility" picker in PortalShell header (for users with multi-facility access)

### Done when
- All 7 demo accounts log in with real password validation
- 2FA can be enabled and challenges on next login
- Direct-navigating to `/admin` without auth → redirect to `/login`
- A staff user at Facility A cannot read residents at Facility B (verified with policy test)

---

## Phase 2 — Master data + tenant provisioning (2 weeks)

**Theme:** SuperAdmin can define master data (states, payers, F-tags, level-of-care codes), and provisioning a new facility tenant copies the master rows into facility-scoped tables.

**Why now:** This is the foundation that lets every later phase be configurable instead of hardcoded. Pattern is proven in ShiftPulse — copy that.

### Master data types to seed
1. **States** (50 + DC + territories) with regulatory contact info
2. **State licensure types** per state (SNF, ALF, RCFE, etc.)
3. **CMS F-tags** (~200 federal survey deficiency codes)
4. **Payers** (Medicare A/B/C, state Medicaid programs, top 50 LTC insurers, private pay, VA)
5. **Level of care** (ADL-based: independent, assisted, skilled, memory care, hospice)
6. **Service codes** (HCPCS subset for billable services)
7. **Diagnosis codes** (ICD-10 subset — top 200 LTC diagnoses)
8. **Credential templates** (RN, LPN, CNA, MA, etc. with renewal cycles by state)
9. **Medication templates** (top 500 LTC drugs, with class, route, schedule)
10. **Doc presets** (admission packet, plan of care, MDS, advance directive)

### Backend
- `MasterDataSeeder` (idempotent, `--force` flag like ShiftPulse) running on every release
- `TenantProvisioningService` — copies master rows into facility-scoped tables when a facility is approved
- `source` column on every tenant-scoped row (`master` | `custom`) — master rows are read-only except `is_active` toggle
- Audit log entry on every master/tenant data change

### Frontend
- `/superadmin/master-data` page with a `MasterDataTab` generic CRUD component (copied from ShiftPulse pattern)
- Config-driven via `MASTER_DATA_CONFIGS` object — adding a new master data type is a config entry, not a new page

### Done when
- SuperAdmin can add a new state, F-tag, or payer in <10 seconds
- New facility tenant gets the full master dataset on provisioning
- Facility admin sees master rows as read-only + can add their own custom rows

---

## Phase 3 — Facility ops MVP (4 weeks)

**Theme:** Replace the visual stubs in the Admin/Staff portal with working bed management, admissions pipeline, and care plans.

**The bar to clear:** A facility administrator does their morning census check entirely in CarePath without opening Excel.

### Bed board (Week 1)
- Real-time bed grid (the stub in `AdminDashboard.tsx` becomes functional)
- Drag-to-move resident between beds
- Bed status: available, reserved, occupied, offline (maintenance), isolation
- Color-coded by level of care + payer type
- Hover card with resident summary
- Filter: floor, unit, level of care, payer
- "Discharge" / "Admit" / "Transfer" actions inline
- Audit-logged: every bed state change writes an AuditLog row

**Beats PCC by:** keyboard shortcuts (j/k to move, / to search), instant filters, no page reloads.

### Admissions pipeline (Week 2)
- Kanban: Inquiry → Tour scheduled → Toured → Assessment → Approved → Admitted → (or) Declined/Withdrew
- Each card carries: inquirer name, prospective resident, payer source, target admit date, assigned admin
- Bulk actions, saved views per user
- Email/SMS notifications on stage transitions (Resend + Twilio)
- Auto-create resident record + bed reservation on "Approved" stage
- Admissions packet generator (PDF via DomPDF) — pulls state-specific forms from master data

**Beats PCC by:** kanban with drag (PCC is forms-and-tables). Beats APFM by: it's a real pipeline, not a "lead handoff."

### Care plans + assessments (Week 3)
- Care plan templates per level of care (master data driven)
- Per-resident care plan with goals + interventions + responsible role + due dates
- E-signature workflow (resident or POA) — sign on iPad or remote link
- MDS 3.0 assessment scaffold (Section A through Z) — start with sections most-used: A (demographics), C (cognitive), G (functional), I (active diagnoses), K (swallowing/nutrition)
- 5-day, 14-day, 30-day, 60-day, 90-day, quarterly, significant change schedules
- Auto-prompt at scheduled intervals

**Beats PCC by:** MDS feels like Linear, not 1998-era Java applets. Sections auto-save, branch logic skips irrelevant questions, AI auto-fills from chart (Phase 8).

### eMAR + shift handoff (Week 4)
- Electronic Medication Administration Record (eMAR) — scheduled meds, PRN, refusals, missed doses
- Barcode scan support (browser camera or hardware)
- Shift report: at-a-glance per-resident status (vitals, BMs, intake, falls, behaviors)
- "SBAR" structured handoff (Situation, Background, Assessment, Recommendation)
- Print or send-to-tablet handoff packet at shift change

### Done when
- A real facility (or staged pilot) can run a full day of admin work in CarePath
- Census, admissions, care plans, eMAR, handoff all functional end-to-end
- Sub-1-second page transitions, sub-100ms keyboard interactions

---

## Phase 4 — Family marketplace (3 weeks)

**Theme:** The Airbnb of long-term care. Beat APFM on trust + UX.

**The bar to clear:** A family member can search → compare → request a tour → schedule a call without ever talking to a "senior living consultant."

### Search + map (Week 1)
- Geocoded search (Mapbox or Google Maps) with split-pane: list on left, map on right
- Filters: level of care, price range, Medicaid acceptance, CMS Five-Star, specialty, language, pet-friendly, religious affiliation
- "Save search" + email digest on new matches
- Mobile-first responsive layout (Airbnb's mobile experience is the bar)

### Facility profile (Week 1)
- Photo gallery (hosted on Cloudflare R2)
- Virtual tour (3D walkthrough embed via Matterport or Cupix)
- Verified reviews — only from confirmed residents/families (audit-trail link to actual stay)
- Real-time bed availability (pulled from facility's bed board)
- Transparent pricing — base rate + level-of-care adders + ancillary fees, NOT "call for pricing"
- Compliance scorecard: CMS Five-Star breakdown, F-tag history, deficiencies cured/uncured, last inspection
- Staff disclosure: licensed nurse hours per resident per day, RN coverage, staff turnover

### Tour request flow (Week 2)
- Calendar-based tour booking (FullCalendar like ClinicLink)
- Tour types: in-person, virtual (Zoom), self-guided
- Pre-tour intake form: prospective resident's needs, payer source, target admit date
- SMS reminders (Twilio) 24h + 2h before
- Post-tour follow-up email automation
- Family sees confirmation immediately — no "we'll call you" hand-off

### Cost projection calculator (Week 3)
- 5-year care cost projection blending Medicare A/B, Medicaid waiver, LTC insurance benefits, private pay
- VA Aid & Attendance eligibility check
- Medicaid spend-down calculator
- Comparison view: 3 facilities side-by-side with cost projections

### Done when
- Family member can complete a full search → tour booking flow in <5 min on mobile
- No phone number required to use the platform (privacy-first)
- Real facility data for ≥1 pilot market (Phoenix or Houston)

---

## Phase 5 — Compliance backbone (3 weeks)

**Theme:** Compliance becomes a competitive moat, not a chore.

### CMS Nursing Home Compare ingest (Week 1)
- Daily download of CMS Provider Information dataset (public API)
- Daily download of Five-Star ratings, health inspection deficiencies, staffing data
- Match by CCN (CMS Certification Number) to our facility records
- Auto-populate compliance scorecard on facility profile
- Diff alerts: "Your Five-Star rating dropped from 5 to 4 today"

### F-tag tracking (Week 2)
- Survey scheduling + reminders
- F-tag deficiency board: open vs. cured, due dates for plans of correction
- POC (Plan of Correction) template generator per F-tag
- Mock survey mode: facility admin runs internal audits
- State surveyor portal (lightweight) — surveyors can view our compliance pack with permission

### State-specific rules (Week 3)
- Per-state regulatory requirements engine (modeled on InsureFlow's compliance pack)
- Required notices (e.g., 30-day discharge notice template per state)
- Staffing ratio rules per state per level of care
- Required disclosures at admission per state
- Auto-validate: "California requires X disclosure at admission — has this been e-signed?"

### Done when
- Every facility profile shows live CMS data
- F-tag deficiencies auto-import from CMS surveys
- State-specific compliance auto-checks on admission

**This is the moat.** Competitors either (a) require facilities to manually maintain compliance docs (PCC) or (b) don't surface compliance at all (APFM). We're doing both, automatically.

---

## Phase 6 — Payments + referrals (2 weeks)

**Theme:** Make money. Three revenue streams.

### Subscriptions (Week 1)
- Stripe Subscriptions with 4 tiers:
  - **Free family** — search, save, basic tour requests
  - **Pro family** ($29/mo) — premium support, document vault, advisor calls
  - **Pro facility** ($299/facility/mo) — full ops portal
  - **Enterprise network** (custom) — multi-facility, white-label, SAML SSO
- Stripe Embedded Checkout (Solarera pattern)
- Trial: 30 days for facility tier, no credit card required
- Annual discount: 20% off

### Referral payouts via Stripe Connect (Week 1)
- Hospital case manager refers a patient → CarePath places them → facility pays a placement fee → CarePath takes 15% → 85% to referral partner
- Stripe Connect Express accounts for referral partners (KYC handled by Stripe)
- Placement attribution: tracking pixel + referral code + manual override
- Payout dashboard for referral partners with 1099 generation at year-end

### Family marketplace economics (Week 2)
- **No lead-selling** — this is our brand differentiator vs. APFM
- Instead: facilities pay a flat "verified listing" subscription
- Optional: facilities can boost listings (Sponsored, marked clearly per FTC guidelines)
- Family pays $0 — always

### Done when
- 3 paying facility customers (pilot)
- Referral payouts flow end-to-end (Stripe Connect → payout to bank)
- Family flow remains free

---

## Phase 7 — Resident + family ongoing portal (3 weeks)

**Theme:** After admission, the family doesn't disappear. Apple Health / MyChart-grade portal.

### Resident portal (Week 1)
- Large-type, calm UI (already prototyped — flesh it out)
- Today's schedule: meds, activities, meals, appointments
- Photo-based contacts (family, care team) — tap to call/message
- Mood tracking (3-tap daily check-in)
- "Help" button → routed to assigned staff
- Voice-input messaging for residents with motor issues

### Family portal (Week 2)
- Care updates from facility (chronological feed)
- Photos shared by staff (with consent)
- Billing + payments visible
- Care plan + recent assessments
- Messaging with care team (24h SLA)
- Video calls with resident (Daily.co or Twilio Video)

### Discharge planning + transitions (Week 3)
- Discharge checklist (federally required)
- 30-day discharge notice templates
- Transfer summary to next provider
- "Continue care" path: home health, hospice, hospital, family home

### Done when
- 80% of pilot families log into the family portal weekly
- Average response time to family message <4h

---

## Phase 8 — AI layer (4 weeks)

**Theme:** This is where we leapfrog every incumbent. None of them have meaningful AI yet.

### Clinical scribe (Week 1)
- Voice-to-text capture of nurse rounds (mobile-first)
- Transcript → structured progress note (SOAP format)
- Auto-tag: vitals, behaviors, falls, skin changes
- Direct write into MDS-relevant sections with citation
- Powered by Claude 4.7 via the Claude API (skill: `claude-api`)

### Family Q&A assistant (Week 2)
- Trained on the facility's compliance pack, care plans, schedules, billing
- Answers family questions ("What were my mom's vitals today?", "When is her next doctor visit?") via chat
- Escalates to human staff on sensitive topics
- 24/7 availability without 24/7 staff

### Intake automation (Week 3)
- Family fills a single intake form
- AI extracts: diagnoses (ICD-10), meds (RxNorm matching), allergies, ADL deficits, preferences
- Auto-populates assessment + care plan drafts
- Human reviews + signs off (assistive, not autonomous)

### Predictive analytics (Week 4)
- Fall risk score per resident (updated daily, based on meds, gait, history)
- 30-day rehospitalization risk
- Pressure injury risk (Braden scale auto-calc)
- Staffing demand forecast (per shift, per unit, 7 days out)

### Done when
- Clinical scribe reduces documentation time by 50% (measured)
- Family Q&A handles 60%+ of routine questions without staff
- Fall risk scores correlate with actual incidents (validated on pilot data)

---

## Phase 9 — Integrations (4 weeks)

**Theme:** Don't be a walled garden. Win by being the most-connected hub.

### Hospital EHR (Week 1)
- Epic, Cerner, Meditech integration via SMART-on-FHIR
- Receive discharge summaries automatically
- Send back transfer-of-care updates
- HL7 v2 fallback for older systems

### Payer integrations (Week 2)
- Medicare eligibility check (CMS HETS API)
- Medicaid lookup per state (state-specific portals)
- LTC insurance benefits check (manual upload + AI extraction for now)
- VA enrollment verification

### Provider directory + credentialing (Week 3)
- Pull NPI data from NPPES
- License verification per state board
- Background check integrations (Sterling, Checkr)
- Auto-flag expired credentials (with master data renewal cycles from Phase 2)

### Operational (Week 4)
- Payroll: Gusto, ADP, Rippling for staff hours export
- E-sign: DocuSign, Dropbox Sign for admission packets
- Pharmacy: Omnicare, PharMerica e-prescribe + delivery
- Lab: Labcorp, Quest results pull

### Done when
- 4+ hospital systems sending us discharge data
- Medicare eligibility check in <3 seconds
- Credentials auto-expire and alert with no manual upkeep

---

## Phase 10 — Launch readiness (2 weeks)

**Theme:** From "works for pilots" to "ready for thousands of facilities."

### Performance (Week 1)
- p95 page load <800ms
- Database query budget per page (<50ms for ops dashboards)
- React Query cache strategy + prefetch on hover
- Image CDN + responsive variants
- Lighthouse 95+ on all public pages

### Security audit (Week 1)
- SOC 2 Type I readiness (formal audit Phase 11)
- HIPAA risk assessment with `/security-review` skill
- Penetration test (engage Cure53 or similar)
- Bug bounty program (HackerOne)
- BAAs with all subprocessors (Stripe, Resend, Twilio, Cloudflare, Anthropic)

### Disaster recovery (Week 2)
- Daily Postgres snapshots → S3 (Railway → R2 + S3)
- Point-in-time recovery tested
- Multi-region read replica
- Runbook for: data loss, breach, vendor outage
- Status page at status.carepath.io

### Launch readiness (Week 2)
- 10 paying facility customers
- 100+ verified family users
- One state's full facility data loaded (start with Arizona — smaller market, manageable)
- PR push (TechCrunch, Healthcare Dive, McKnight's)

---

## Out of scope (intentionally)

- **Home care** — ShiftPulse owns this
- **Hospice as standalone** — Phase 11+
- **Adult day care** — Phase 11+
- **Independent living (55+ communities)** — not regulated as LTC, different model
- **LTC insurance sales** — InsureFlow owns this; we partner
- **Acute care, hospitals, primary care** — wrong scope
- **EU/international** — US-only through Phase 10

---

## Build vs. buy decisions

| Need | Build or buy | Why |
|---|---|---|
| Auth | Build (Sanctum) | Need fine-grained policies + 2FA, standard |
| Email | Buy (Resend) | Solved problem, $0.10/1k cheap |
| SMS | Buy (Twilio) | Telephony is a swamp, don't build |
| Video | Buy (Daily.co or Twilio Video) | WebRTC is hard |
| Maps | Buy (Mapbox) | Better than Google for embedded UX |
| Payments | Buy (Stripe + Connect) | Compliance + global is years of work |
| E-sign | Buy (Dropbox Sign or DocuSign) | Legal weight requires audit trail compliance |
| File storage | Buy (Cloudflare R2) | S3-compat, no egress fees |
| Search | Buy (Algolia or Typesense) | Postgres FTS won't scale to map+filters |
| Background jobs | Build (Laravel queues + Redis) | Standard, no need for SQS yet |
| Observability | Buy (Sentry + Posthog) | Solved problem |
| LLM | Buy (Anthropic Claude API) | Best model + caching, use `claude-api` skill |
| OCR for intake docs | Buy (Google Document AI or Mathpix) | Last-mile, hard to build |
| 3D virtual tours | Buy (Matterport embed) | Hardware-coupled, partner |
| EHR integrations | Buy (Particle Health, Health Gorilla, or Redox) | One vendor → 1000 EHRs, vs. 1000 custom integrations |

---

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| HIPAA breach | Existential | SOC 2, encryption at rest + in transit, polymorphic AuditLog (already in place), least-privilege RBAC, annual pen test |
| State regulation surprise | High | Per-state rules engine (Phase 5), legal review by state, modular |
| Empty marketplace (no facilities listed) | High | Start facility-ops-first (we're already doing this), pilot in 1 city before expanding |
| Empty marketplace (no families) | Medium | SEO + paid acquisition + hospital referral partnerships drive families |
| Incumbent moves fast (PCC adds modern UX) | Low | Their codebase is decades old, they can't move fast — and 5 years of work in is a moat |
| AI hallucination in clinical context | High | Always assistive (not autonomous), human sign-off required, audit trail on all AI outputs |
| Stripe deplatforming | Medium | Have backup processor (Adyen or Paddle) ready, BAA in place |

---

## Success metrics by phase

| Phase | Metric | Target |
|---|---|---|
| 1 | Auth + 2FA shipped | All 7 demo accounts functional |
| 2 | Master data types | 10 types, all tenant-syncable |
| 3 | Time to admit a resident | <10 min in CarePath vs. 30 min in PCC |
| 4 | Time from search to tour booking | <5 min on mobile |
| 5 | F-tags auto-imported | 100% from CMS |
| 6 | Paying facilities | 3 (pilot) → 10 (launch) |
| 7 | Weekly active family users | 80% of pilot families |
| 8 | Documentation time reduction | -50% |
| 9 | EHR integrations live | 4 hospital systems |
| 10 | Launch readiness | SOC 2 ready + 10 paying customers |

---

## Honest timeline

Solo developer, weekends + nights: **9–12 months to Phase 10**.
With 1 contractor for clinical workflows + 1 for design: **6 months**.
With a small team (3 engineers + 1 designer + 1 clinical advisor): **4 months**.

The longest phases are 3 (facility ops MVP, 4 wks) and 8 (AI, 4 wks) and 9 (integrations, 4 wks). Phases 1–2 and 6 are tight, well-bounded, and can run in parallel with later work.

---

## Where we go after Phase 10

- **Phase 11** — Hospice + adult day care expansion (additional verticals share 80% of ops platform)
- **Phase 12** — White-label for state ombudsman programs (compliance-as-a-service to state agencies)
- **Phase 13** — International (Canada first — similar regulatory structure)
- **Phase 14** — Insurance underwriting partnership with InsureFlow (sister project) — bundle LTC insurance + placement
- **Phase 15** — Family caregiving app (the "Care.com" of family-managed care, for when families want to age in place — handoff path back to ShiftPulse)

The vision: CarePath becomes the operating system of post-acute and long-term care in the US. Every facility, every family, every transition, every payer interaction flows through us. Surpassing APFM and PCC is the table-stakes goal — the real goal is owning the category they should have owned but didn't.

---

**Last updated:** 2026-05-11
**Owner:** Evens Michel
**Status:** Phase 0 complete. Phase 1 ready to start.
