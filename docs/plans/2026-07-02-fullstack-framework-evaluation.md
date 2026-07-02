# Pet Buddies Fullstack Framework Evaluation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after stack approval.

**Goal:** Choose the right framework to turn the current Pet Buddies mobile-first PWA prototype into a production fullstack application.

**Architecture:** The current repo is a React + Vite prototype with a single in-memory store, overlay-driven navigation, and seed data. The production build needs real routing, auth, persistence, uploads, moderation workflows, deep links, and PWA support. The migration should preserve the mobile-first UX while replacing local-only state with server-backed domain modules.

**Tech Stack Recommendation:** TanStack Start + TypeScript + Cloudflare Workers + D1-compatible relational SQL + Google auth + R2 object storage.

---

## What exists today

Verified from the current codebase:
- `package.json` uses `react`, `vite`, `typescript`, and `vite-plugin-pwa`
- `src/App.tsx` renders a single-tab shell with stacked overlays instead of route files
- `src/store/store.tsx` keeps the full product state in memory:
  - listings
  - auth state
  - inquiries
  - onboarding/install flags
  - report/add forms
  - moderation actions
- `vite.config.ts` already defines a mobile PWA manifest
- `README.md` explicitly says this is a prototype/reference to be recreated as a real app

Implication: this is not yet a true app shell with real backend boundaries. It is a polished interactive prototype already encoded in React.

---

## Framework options considered

## Option A — TanStack Router / TanStack Start

### Pros
- Best-in-class typed routing and URL state
- Excellent fit for rich client-side app flows
- Strong loader/search-param model for deep-linkable filters and tabs
- Natural migration path from the current Vite prototype
- Strong fit for the chosen Cloudflare deployment direction
- Lets us evolve from route cleanup into a real fullstack runtime without a framework reset

### Cons for this project
- TanStack Start is still earlier-stage than Next.js in ecosystem maturity
- Smaller batteries-included ecosystem for auth/content/app-hosting patterns compared with Next.js
- More architecture choices to make up front
- Requires discipline so we do not overfit to router sophistication before landing backend primitives

### Best case for choosing it
Choose TanStack if Pet Buddies wants:
- typed routes and incremental migration from the current prototype
- Cloudflare-first deployment
- a continuous path from router cleanup -> fullstack app shell -> server-backed domain modules

This now matches Pet Buddies.

---

## Option B — Next.js App Router

### Pros
- Mature fullstack default for public consumer apps
- Strong ecosystem for auth, uploads, server actions, API routes, edge/runtime options, deployment, and SEO/social metadata
- Good fit for:
  - public browse pages
  - pet detail deep links
  - authenticated listing creation
  - moderation queue
  - inquiry submission
  - image uploads
  - transactional/server-side data mutations
- Easier to hire for / onboard developers into

### Cons
- Heavier framework reset from the current Vite prototype
- More opinionated conventions than we need for the chosen Cloudflare path
- PWA support requires different setup from the current repo shape
- Reopens a framework choice the product direction has now settled

### Best case for choosing it
Choose Next if the priority is adopting the most mainstream fullstack React framework regardless of current repo direction.

That is no longer the chosen path for Pet Buddies.

---

## Recommendation

## Choose **TanStack Start on Cloudflare**

Why it is more suitable for Pet Buddies:
1. **The current app already lives in a Vite-shaped frontend codebase.**
2. **Cloudflare is the intended deployment target.**
3. **The product still needs real backend/product primitives** — auth, DB, uploads, moderation, inquiry handling, and operations — but those can be added without abandoning the current stack direction.
4. **TanStack Router gives us an immediate migration path** from store/hash navigation to typed routes.
5. **TanStack Start keeps the path from prototype to production more continuous** for this repo than a framework reset.

Short version:
- **TanStack Router is the immediate navigation upgrade**
- **TanStack Start on Cloudflare is the chosen product-delivery path for this repo**

---

## Proposed migration shape

### Frontend
- route tree rooted in TanStack Start
- `/browse`
- `/report`
- `/vets`
- `/you`
- `/saved`
- `/browse/listings/$listingId`
- overlay-style presentation for listing detail while preserving direct-load support

### Backend
- server functions or route handlers for:
  - listing creation
  - inquiry submission
  - report submission
  - moderator approve/reject
  - mark adopted
- shared domain modules for:
  - listings
  - inquiries
  - reports
  - moderation
  - vets
  - auth/session policies

### Data model
- users
- organisations
- listings
- listing_images
- inquiries
- reports
- clinics
- moderation_events
- saved_listings

### Auth
- Google sign-in only, matching the README/product framing

### Storage
- R2 bucket for listing/report photos

### Database
- D1-compatible relational SQL, preserving the current domain model direction

### PWA
- preserve installability and manifest behavior after migration

---

## Suggested first implementation phase

### Task 1: Freeze the current prototype as UX reference
**Objective:** Keep this codebase usable as a fidelity reference during migration.

### Task 2: Introduce TanStack Router in the current Vite prototype
**Objective:** Replace in-memory tab/hash navigation with typed routes before the full TanStack Start move.

### Task 3: Migrate the current Vite prototype into TanStack Start
**Objective:** Preserve the phone-frame/mobile-first UI system while gaining the chosen fullstack runtime.

### Task 4: Model the database and auth flows
**Objective:** Replace in-memory store assumptions with durable backend contracts.

### Task 5: Port browse + detail first
**Objective:** Get the main acquisition loop live before secondary flows.

### Task 6: Add listing, inquiry, report, moderation workflows
**Objective:** Deliver the core product loops end-to-end.

---

## Immediate next move

If proceeding with TanStack Start, start by:
1. preserving this prototype branch as reference
2. landing the TanStack Router route vocabulary in the current prototype
3. moving into TanStack Start on Cloudflare once the route shell is stable
4. then wiring the database/auth contracts before feature-by-feature migration

---

## Decision

**Recommended framework:** `TanStack Start on Cloudflare`

**Confidence:** High

**Reason:** Pet Buddies needs a real fullstack consumer workflow with auth, uploads, moderation, and persistence, and the chosen path is to evolve the current Vite/TanStack direction into TanStack Start on Cloudflare rather than reset onto Next.js.
