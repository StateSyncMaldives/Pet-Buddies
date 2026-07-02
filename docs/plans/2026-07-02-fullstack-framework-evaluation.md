# Pet Buddies Fullstack Framework Evaluation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after stack approval.

**Goal:** Choose the right framework to turn the current Pet Buddies mobile-first PWA prototype into a production fullstack application.

**Architecture:** The current repo is a React + Vite prototype with a single in-memory store, overlay-driven navigation, and seed data. The production build needs real routing, auth, persistence, uploads, moderation workflows, deep links, and PWA support. The migration should preserve the mobile-first UX while replacing local-only state with server-backed domain modules.

**Tech Stack Recommendation:** Next.js App Router + TypeScript + PostgreSQL/Supabase + NextAuth/Google auth + object storage for listing/report images.

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
- Fast/lightweight dev loop
- Flexible deployment model

### Cons for this project
- TanStack Start is still in RC according to its docs
- Smaller ecosystem for batteries-included auth/content/app-hosting patterns compared with Next.js
- More architecture choices to make up front
- Less advantage here because this product needs boring production primitives more than router sophistication

### Best case for choosing it
Choose TanStack if Pet Buddies were primarily:
- an internal tool
- a highly interactive dashboard
- a URL-state-heavy SPA where typed search params are the main complexity

That is not this app’s main risk.

---

## Option B — Next.js App Router

### Pros
- More mature fullstack default for public consumer apps
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
- Better “boring default” for a mobile-first consumer product that must become production-ready quickly

### Cons
- Heavier dev/runtime footprint than the TanStack stack
- More opinionated framework conventions
- Less elegant typed URL-state story than TanStack Router
- PWA support requires plugin/config work rather than the current Vite setup

### Best case for choosing it
Choose Next if the app needs:
- reliable fullstack primitives
- public/private mixed routes
- auth + uploads + DB + moderation workflows
- production deployment with fewer custom decisions

This matches Pet Buddies.

---

## Recommendation

## Choose **Next.js App Router**

Why it is more suitable for Pet Buddies:
1. **This is becoming a real consumer product, not just a client-heavy prototype.**
2. **The biggest missing pieces are backend/product primitives** — auth, DB, uploads, moderation, inquiry handling, and operations.
3. **The current app has simple navigation complexity but meaningful server workflow complexity.**
4. **The README already frames the current code as a design reference to be recreated as a real app.**
5. **Next reduces architecture risk** while preserving the ability to keep the UI very app-like and mobile-first.

Short version:
- **TanStack Router is the better router story**
- **Next is the better product-delivery story for this repo**

---

## Proposed migration shape

### Frontend
- `app/(marketing)` if needed later
- `app/(app)/browse/page.tsx`
- `app/(app)/report/page.tsx`
- `app/(app)/vets/page.tsx`
- `app/(app)/you/page.tsx`
- `app/(app)/saved/page.tsx`
- `app/pet/[id]/page.tsx`
- modal/overlay interception only where it materially improves UX

### Backend
- server actions or route handlers for:
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
- object storage bucket for listing/report photos

### PWA
- preserve installability and manifest behavior after migration

---

## Suggested first implementation phase

### Task 1: Freeze the current prototype as UX reference
**Objective:** Keep this codebase usable as a fidelity reference during migration.

### Task 2: Scaffold Next.js app in parallel or migrate in-place
**Objective:** Establish the production app shell with App Router.

### Task 3: Port shared design tokens and base shell
**Objective:** Recreate phone-frame/mobile-first UI system.

### Task 4: Model the database and auth flows
**Objective:** Replace in-memory store assumptions with durable backend contracts.

### Task 5: Port browse + detail first
**Objective:** Get the main acquisition loop live before secondary flows.

### Task 6: Add listing, inquiry, report, moderation workflows
**Objective:** Deliver the core product loops end-to-end.

---

## Immediate next move

If proceeding with Next, start by:
1. preserving this prototype branch as reference
2. scaffolding the Next app shell
3. porting design tokens/components first
4. then wiring the database/auth contracts before feature-by-feature migration

---

## Decision

**Recommended framework:** `Next.js`

**Confidence:** High

**Reason:** Pet Buddies’ core challenge is shipping a reliable fullstack consumer workflow with auth, uploads, moderation, and persistence — not maximizing router sophistication.
