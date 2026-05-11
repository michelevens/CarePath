# CarePath

> Long-term care facility marketplace + operations platform. Helps families find the right facility (SNF, assisted living, memory care, CCRC) and gives facilities a modern platform to manage census, admissions, compliance, and resident care.

---

## Positioning

**The pitch:** A Place for Mom meets PointClickCare, rebuilt for 2026.

**Why this slice:**
- Family-side incumbent (A Place for Mom) is a $200M/yr lead-gen business with dated UX
- Facility-side incumbents (PointClickCare, MatrixCare) have 2005-era interfaces
- Modern UX + integrated marketplace + facility ops is the differentiated play
- Complements ShiftPulse (home care) and InsureFlow (LTC insurance) — does NOT overlap

**Vertical:** Facility-based long-term care
- Skilled Nursing Facilities (SNF)
- Assisted Living Facilities (ALF)
- Memory Care
- Continuing Care Retirement Communities (CCRC)

**Out of scope:** Home care (ShiftPulse), LTC insurance (InsureFlow), hospice, adult day care (Phase 2+)

---

## Portals

| # | Portal | Primary users | Core jobs |
|---|---|---|---|
| 1 | **Family** | Adult children, spouses, POAs | Search, compare, tour, financial planning, ongoing visibility |
| 2 | **Resident** | Residents themselves (or POA) | Own records, communication, billing |
| 3 | **Facility Staff** | Nurses, aides, social workers | Admissions intake, care plans, MDS, shift handoffs |
| 4 | **Facility Admin** | Administrators, DONs | Census/beds, compliance, surveys, staff, billing |
| 5 | **Network / Corporate** | Multi-facility operators | Cross-facility analytics, master data, contracts |
| 6 | **Referral Partner** | Hospital case managers, discharge planners | Push placements, track outcomes, get paid |
| 7 | **Super Admin** | CarePath team | Tenant provisioning, master data, state rules |

---

## Interface models

The substrate is **shadcn/ui + Tailwind v4** (same as ShiftPulse, InsureFlow, Solarera, ClinicLink). Interaction patterns and information density are modeled per portal:

| Portal group | Modeled after | Why |
|---|---|---|
| **Family marketplace** (browse, compare, tour) | **Airbnb + Zillow** | Map + filters + photos + reviews + booking. Trust signals are the whole game. |
| **Facility ops** (admin, staff, network) | **Linear + Stripe Dashboard** | Keyboard-fast, data-dense but minimal, command-K. Beats PointClickCare on feel. |
| **Resident portal** (60–80 yr old users) | **Apple Health / MyChart** | Large touch targets, calm typography, low cognitive load. |

---

## Feature pillars (MVP through v1)

Borrowed from the three sibling projects + LTC-specific additions:

| # | Pillar | Source pattern |
|---|---|---|
| 1 | Smart matching (level of care, location, Medicaid acceptance, price, availability) | ClinicLink 7-dimension match |
| 2 | Bed/census board with real-time availability (the marketplace inventory) | NEW (LTC-specific) |
| 3 | Cost projection ("5-yr care cost" blending Medicare/Medicaid/LTC insurance/private pay) | Solarera 25-yr projection |
| 4 | Tour & admission pipeline (request → tour → assessment → admit → e-sign) | Solarera quote-to-project |
| 5 | Compliance pack (state licensure, CMS Five-Star, F-tag survey deficiencies) | InsureFlow compliance pack |
| 6 | Immutable audit log (HIPAA-grade, polymorphic) | ClinicLink AuditLog |
| 7 | MDS 3.0 assessments (federally required for SNFs) | NEW (LTC-specific) |
| 8 | Medicaid waiver / spend-down + VA Aid & Attendance eligibility | NEW (LTC-specific) |
| 9 | Referral partner Stripe Connect payouts | ClinicLink Connect marketplace |
| 10 | Embedded "find a facility" widget for hospital discharge planners | InsureFlow embedded quote widget |
| 11 | Subscription tiers (Free family / Pro facility / Enterprise network) | All three |
| 12 | CMS Nursing Home Compare data ingest (Five-Star ratings, inspection history) | NEW (LTC-specific) |

---

## Tech stack (mirror sibling projects)

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS v4 (NO arbitrary values — same constraint as ShiftPulse)
- shadcn/ui
- React Router v7, React Query, React Hook Form + Zod
- Deploy: GitHub Pages (carepath.io or similar)

**Backend**
- Laravel 12 + PHP 8.4
- PostgreSQL (Railway)
- Sanctum auth + TOTP 2FA + SAML SSO
- Stripe Connect (referral payouts) + Stripe Subscriptions (tiers)
- Resend (email)
- Cloudflare R2 (file storage — resident docs, photos)
- DomPDF (assessments, exports)
- Deploy: Railway (`railway up` after every commit)

**Patterns to copy from siblings**
- FacilityScope middleware (renamed from InsureFlow's AgencyScope)
- Master data flow: SuperAdmin creates master rows, TenantProvisioningService copies to tenant on approval (from ShiftPulse)
- MasterDataTab generic CRUD (from ShiftPulse)
- Polymorphic AuditLog with sensitive field masking (from ClinicLink)
- API Resource classes for DTO transformation (from Solarera)
- Procfile runs MasterDataSeeder --force on deploy startup (from ShiftPulse)

---

## MVP cut (recommendation — open to redirect)

**Recommended:** Start with the **facility ops portal** first, marketplace second.

**Why this order:**
1. Without facilities (inventory), the marketplace is empty — chicken-and-egg
2. Facility ops is the recurring revenue side (Pro/Enterprise subscriptions); marketplace is volatile lead-gen
3. We can launch the family marketplace as a thin search + "tour request" form in v1.1 once facilities exist

**MVP scope (~4 weeks):**
- Auth + 2FA + multi-tenant (FacilityScope)
- Facility Admin portal shell (Linear-style)
- Bed/census board
- Resident records (intake → admission → care plan)
- Compliance pack (state licensure tracking, CMS Five-Star display)
- Immutable audit log
- Stripe Pro subscription
- Super Admin master data (states, F-tags, payers, services)

**v1.1 (~3 weeks after MVP):**
- Family-facing search (Airbnb-style)
- Tour request flow
- Cost projection calculator
- Embedded discharge-planner widget

---

## Naming & branding

- Working name: **CarePath**
- Domain candidates: carepath.io, carepath.health, getcarepath.com
- Suffix pattern alignment: -Path complements -Flow / -Era / -Link in the sibling portfolio
- Brand voice: calm, trustworthy, modern — NOT clinical or salesy

---

## Constraints (carry over from sibling projects)

- Tailwind v4: NO arbitrary values (`bg-[#hex]`, `text-[11px]`, `w-[calc(...)]`). Use `style={{ }}` for custom colors/sizes.
- Always `npm run build` with zero errors before commit
- Always `railway up` after every commit/push
- Branch: `main` (direct push)
- GitHub Pages auto-deploy via `.github/workflows/deploy.yml`

---

## Status

**2026-05-11** — Planning. CLAUDE.md drafted. Folder created. No code yet.

**Next:** User to confirm:
1. Name (CarePath OK?)
2. MVP cut (facility ops first?)
3. Green-light to scaffold frontend + laravel-backend
