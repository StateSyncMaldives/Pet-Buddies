# Claude Code — Starter Prompt & Build Plan

Paste the **Kickoff prompt** below into Claude Code (run from the unzipped project folder). The build phases and backend tasks follow it as a checklist.

---

## Kickoff prompt (paste this)

> I'm building **Pet Buddies MV**, an installable pet-adoption PWA for Greater Malé (Maldives). The folder `design_handoff_pet_buddies/` contains a full spec (`README.md`) and HTML prototypes (`*.dc.html`) that define the look, copy, flows, and state. The `.dc.html` files are **design references**, not code to ship — recreate them in a real codebase.
>
> Set up a **React + Vite PWA** (TypeScript, `vite-plugin-pwa`), mobile-first at a 390px design width, using the exact design tokens, copy, and SVG logo from the spec. Build it screen-by-screen in the order below, keeping data in a typed in-memory store first (mirroring the prototype's seed data and `status` lifecycle), so the UI is fully clickable before any backend exists. Then we'll wire Google auth, a database, and image uploads.
>
> Start with **Phase 1** and show me the Browse + Listing detail screens before moving on.

---

## Build phases (UI first, mock data)

**Phase 1 — Shell & Browse**
- App shell: phone-agnostic responsive layout, bottom tab bar (Browse / Report / Vets / You / Saved), overlay/route system for detail/add/inquiry/auth/mod.
- Typed `Listing`, `Org`, `Clinic`, `Inquiry`, `User` models + seed data from the prototype.
- Browse: header (logo, moderator shield w/ pending badge, + add), search, species segmented, filter chips, listing cards (tinted placeholder photo, save heart, verified check), empty state.
- Save → Saved tab. Filtering = status∉{pending,rejected,adopted} ∧ species ∧ all active tags ∧ search.

**Phase 2 — Listing detail + Saved**
- Detail overlay (hero, tags, org row, story, privacy note, report-listing, sticky Apply footer).
- Saved tab list with remove.

**Phase 3 — Auth gating + Add listing**
- Sign-in overlay ("Continue with Google", mock user for now) with **intent** (apply/add) resume.
- Add listing overlay: species + **bird allowlist** with protected-species warning, fields, tag chips, manual-review note → creates `pending` listing → success screen.

**Phase 4 — Adoption inquiry + You**
- Inquiry composer (prefilled message, safety note) → records inquiry, marks applied.
- "You" tab: Inquiries / My listings segmented; status chips (pending/live/adopted/rejected); Mark as adopted.

**Phase 5 — Report + Vets**
- Report form (lost/found, species, photo, GPS location, description) → routed-to-org success.
- Vets directory (seeded Oases + Erika, call/directions, "good to know" note).

**Phase 6 — Moderator queue**
- Shield-gated review queue: approve (→ live) / reject (→ rejected); banner explaining verified-org auto-publish.

**Phase 7 — Onboarding + Install**
- 3-slide onboarding (first launch, persisted in localStorage).
- PWA manifest + icons from the logo; real `beforeinstallprompt` wiring behind the install sheet.

## Backend wiring (after UI is solid)

1. **Google Sign-In** — real OAuth; replace the mock `user`. Gate Add + Apply only.
2. **Database** — Supabase/Postgres (or a managed store to start). Tables per the data model: `listings, users, organizations, reports, clinics, inquiries`. Move seed data into it.
3. **Listing lifecycle** — server-side `status`; verified-org listings insert as `live` (auto-publish), individual ones as `pending`. Moderator actions update status.
4. **Image uploads** — listing & report photos to object storage; replace the placeholder tiles. (Only outstanding asset gap.)
5. **Report routing** — route to nearest partner org by area/species; decide the notification channel (email/shared inbox — PRD open question §13).
6. **Moderator role** — restrict the queue to moderator accounts.
7. **Privacy** — show only general area publicly; reveal exact location/contact after an inquiry is sent (PRD §11).

## Guardrails from the PRD
- **No dogs.** Cats + legally-importable pet birds only. Bird form is an allowlist (Budgerigar, Cockatiel, Lovebird, Finch, Canary).
- **Trust model**: individual listings → manual review; verified orgs → auto-publish. "Report listing" on every detail page.
- **Scope**: Greater Malé v1. No payments/donations, no telehealth, no general marketplace. Vet directory is informational.

## Definition of done (v1)
All 10 screens from the spec implemented and navigable; auth gates listing + inquiry; full listing lifecycle works end-to-end; installable PWA with offline shell; seeded vet directory and partner orgs; real photo uploads.
