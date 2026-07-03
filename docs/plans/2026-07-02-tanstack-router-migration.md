# Pet Buddies TanStack Router Migration Plan

## Current status

This migration plan has been executed and then extended through the TanStack Start app-shell migration.

Completed implementation:
- Route vocabulary helpers and tests were added.
- Top-level tabs now route through typed TanStack Router paths.
- Bottom navigation is route-driven.
- Browse listing detail now uses `/browse/listings/$listingId` instead of `#/pet/...`.
- Detail route loading resolves listings through router loaders with not-found handling.
- Browse filters now live in URL search params (`species`, `q`, `tags`).
- Browse listing results are now loaded by the route loader from validated URL search params.
- The router shell has been migrated to TanStack Start SPA mode with file-based routes under `src/routes`.
- Cloudflare Workers config has been added separately in the fullstack checklist slice.
- The next remaining-task PRD has been prepared locally at `docs/prds/2026-07-03-server-backed-route-data-and-mutation-boundaries.md`.

Key commits:
- `22a58ae` `feat: add typed router context and browse detail loader`
- `a746c95` `feat: sync browse filters with URL search params`
- `ea47632` `feat: migrate app shell to tanstack start`

Current verification:
- `pnpm test` passes (84 tests)
- `pnpm build` passes

Issue tracker note:
- GitHub Issue publication is currently blocked because the fork repository `iyadhali/Pet-Buddies` has Issues disabled. Do not publish to an upstream repository; keep work scoped to the fork.

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace Pet Buddies’ in-memory tab/hash navigation with typed TanStack Router routes while preserving the current mobile-first prototype UX and keeping the in-memory store intact for this migration phase.

**Architecture:** Pet Buddies began this phase as a React + Vite prototype and now runs through a TanStack Start SPA-mode app shell. Route state is the source of truth for top-level tabs, browse filters, and browse detail deep links, while overlays like auth, inquiry, onboarding, install, add-listing, and moderation remain store-driven until later slices.

**Tech Stack:** React 18, Vite 8, TypeScript 5, Vitest 4, TanStack Router, TanStack Start

---

## Product guardrail

This repo is **Pet Buddies**, a mobile-first pet adoption and lost/found PWA prototype. The router migration must preserve that product framing:
- `Browse` is the primary acquisition surface for adoptable listings
- `Report` is the lost/found intake flow
- `Vets` is the clinic directory
- `You` is the inbox/account surface
- `Saved` is the bookmark surface
- browse listing detail must stay deep-linkable and back-button-safe

This is **not** a generic dashboard router refactor.

---

## Verified current state

Checked in the repo before writing this plan:
- `src/App.tsx` renders a single `ActiveTab()` switch from store state
- `src/App.tsx` also owns a custom `useDetailRouter()` hash-sync flow using `#/pet/:id`
- `src/components/BottomNav.tsx` changes tabs via `setTab(tab)` only
- `src/components/ListingCard.tsx` opens detail via `openDetail(listing.id)` only
- `src/store/store.tsx` keeps all navigation, browse filters, auth state, overlays, draft forms, onboarding/install flags, and in-memory listings
- `tests/unit/router/paths.test.ts` was added this session to lock desired route vocabulary before implementation
- `docs/plans/2026-07-02-fullstack-framework-evaluation.md` recommends Next.js for the eventual fullstack rebuild, while `docs/architecture/data-model.md` assumes TanStack Start on Cloudflare

Implication: we currently have a **planning split** between eventual fullstack direction and immediate frontend routing direction. This plan intentionally narrows scope to **routing inside the current prototype** so we can improve navigability without prematurely committing the whole backend stack.

---

## Migration decision for this phase

### In scope now
1. Add TanStack Router to the existing Vite app
2. Move top-level tab selection from store state to URL paths
3. Move browse detail deep links from hash routing to a typed path route
4. Keep the current store and overlays working with minimal behavioral change
5. Add tests around route vocabulary/helpers before widening the migration

### Explicitly deferred
- SSR / server functions beyond the current Start SPA shell
- database/auth/backend changes
- replacing the in-memory store
- route-ifying auth, inquiry, moderation, onboarding, add-listing, or install overlays
- Cloudflare deploy execution

This gave us a low-risk first slice: **better routing without backend churn**. The app shell has since moved to TanStack Start while preserving the compatibility runtime/store boundary.

---

## Canonical route vocabulary

Top-level tabs:
- `/browse`
- `/report`
- `/vets`
- `/you`
- `/saved`

Root redirect:
- `/` -> `/browse`

Browse detail:
- `/browse/listings/$listingId`

Detail presentation rule:
- direct loads keep the current full-screen overlay presentation rather than switching to a separate page layout in this slice

Browse-filter URL strategy:
- completed: `species`, `q`, and `tags` are validated URL search params
- the store keeps a compatibility mirror for the current Browse UI

Medium-term direction:
- completed: this migration became the stepping stone into **TanStack Start on Cloudflare**

Domain-language check:
- use **Listing** for the adoptable record
- use **listingId** for route params
- avoid generic `petId` in new router-facing code because detail pages represent the domain concept of a listing, not an arbitrary pet entity

---

## Target file changes

### New router files
- Create: `src/router/paths.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/browse.tsx`
- Create: `src/routes/browse.listings.$listingId.tsx`
- Create: `src/routes/report.tsx`
- Create: `src/routes/vets.tsx`
- Create: `src/routes/you.tsx`
- Create: `src/routes/saved.tsx`
- Create: `src/router/index.tsx` if needed for router instance composition
- Create: `src/router/context.ts`
- Generate: `src/routeTree.gen.ts`

### App shell wiring
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/ListingCard.tsx`
- Modify: `src/screens/DetailOverlay.tsx`
- Modify: `src/store/store.tsx` (only if we need thin compatibility helpers or to stop duplicated tab authority)

### Tests
- Create/extend: `tests/unit/router/paths.test.ts`
- Create: `tests/unit/router/router-shell.test.tsx`
- Create: `tests/unit/router/browse-detail-route.test.tsx`

---

## Route/state boundary

### Router owns
- active top-level tab
- active browse detail route
- browser history semantics for tab changes and listing detail open/close

### Store still owns
- listing seed data
- filters and search query
- saved state
- auth state
- inquiry draft/submission state
- add/report draft forms
- onboarding/install/moderation overlays
- toast state

### Synchronization rule

Do **not** keep dual sources of truth for tabs.
- Current state: `state.tab` drives rendering
- Target state: route path drives which screen renders

If `state.tab` remains temporarily for compatibility, it must become a derived mirror updated from pathname until it can be removed, never a competing authority.

---

## Implementation tasks

### Task 1: Lock route vocabulary with pure tests

**Objective:** Prevent naming drift before router code lands.

**Files:**
- Test: `tests/unit/router/paths.test.ts`
- Create: `src/router/paths.ts`

**Step 1: Write/keep failing tests**
The session already added `tests/unit/router/paths.test.ts` for:
- stable top-level paths
- browse detail path builder
- pathname-to-tab mapping

**Step 2: Run test to verify failure**
Run: `pnpm test -- paths.test.ts`
Expected: FAIL — missing `src/router/paths` exports.

**Step 3: Write minimal implementation**
Add:
- `ROUTE_PATHS`
- `getDetailPath(listingId)`
- `isDetailPath(pathname)`
- `getTabFromPathname(pathname)`

**Step 4: Run test to verify pass**
Run: `pnpm test -- paths.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/router/paths.ts tests/unit/router/paths.test.ts
git commit -m "test: lock pet buddies route vocabulary"
```

### Task 2: Install TanStack Router and create router shell

**Objective:** Introduce the router without changing feature behavior yet.

**Files:**
- Modify: `package.json`
- Modify: `src/main.tsx`
- Create: `src/router/root.tsx`
- Create: `src/router/index.tsx`

**Step 1: Add dependency**
Install `@tanstack/react-router`.

**Step 2: Wrap app with RouterProvider**
Move mounting responsibility from direct `<App />` render to router provider composition.

**Step 3: Keep the current visual shell in a root layout**
The phone frame, status bar, scroll shell, bottom nav, overlays, and toast should remain centralized in the root route layout.

**Step 4: Verify build compiles**
Run: `pnpm build`
Expected: PASS

**Step 5: Commit**
```bash
git add package.json pnpm-lock.yaml src/main.tsx src/router/
git commit -m "feat: add tanstack router shell"
```

### Task 3: Convert top-level tabs into route files

**Objective:** Replace `ActiveTab()` switching with route rendering.

**Files:**
- Modify: `src/App.tsx`
- Create: `src/router/routes/browse.tsx`
- Create: `src/router/routes/report.tsx`
- Create: `src/router/routes/vets.tsx`
- Create: `src/router/routes/you.tsx`
- Create: `src/router/routes/saved.tsx`

**Step 1: Create route components that render existing screens unchanged**
- browse route renders `<Browse />`
- report route renders `<Report />`
- vets route renders `<Vets />`
- you route renders `<Inbox />`
- saved route renders `<Saved />`

**Step 2: Remove `ActiveTab()` as the primary renderer**
The router outlet should become the main content region.

**Step 3: Keep overlays and nav outside the outlet**
The shell should still render:
- `BottomNav`
- `DetailOverlay`
- `AddOverlay`
- `AuthOverlay`
- `InquiryOverlay`
- `ModOverlay`
- `InstallSheet`
- `Onboarding`
- `Toast`

**Step 4: Verify tab URLs work directly**
Manual verification:
- open `/browse`
- open `/report`
- open `/vets`
- open `/you`
- open `/saved`
Expected: each loads the correct screen on refresh.

**Step 5: Commit**
```bash
git add src/App.tsx src/router/routes/
git commit -m "feat: route pet buddies top-level tabs"
```

### Task 4: Make BottomNav route-driven

**Objective:** Bottom navigation should navigate by URL instead of mutating store tab state.

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Test: `tests/unit/router/router-shell.test.tsx`

**Step 1: Write failing nav test**
Test that active nav state reflects pathname and clicking a tab navigates to its path.

**Step 2: Replace `setTab(tab)` with router navigation**
Use link/navigation primitives from TanStack Router.

**Step 3: Derive active state from location**
Use pathname matching, not store state.

**Step 4: Run targeted tests**
Run: `pnpm test -- router-shell.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/BottomNav.tsx tests/unit/router/router-shell.test.tsx
git commit -m "feat: make bottom nav route driven"
```

### Task 5: Migrate browse detail deep links from hash to typed path route

**Objective:** Listing detail opens as a real route with correct back-button behavior.

**Files:**
- Modify: `src/components/ListingCard.tsx`
- Modify: `src/screens/DetailOverlay.tsx`
- Modify: `src/App.tsx`
- Create: `src/router/routes/browse.listings.$listingId.tsx`
- Test: `tests/unit/router/browse-detail-route.test.tsx`

**Step 1: Write failing route test**
Cover:
- clicking a listing navigates to `/browse/listings/$listingId`
- direct load of the detail path opens the detail overlay/state
- closing detail returns to `/browse`

**Step 2: Replace hash sync with route sync**
Delete custom `useDetailRouter()` hash/history logic from `src/App.tsx`.

**Step 3: Make listing cards navigate**
Use `getDetailPath(listing.id)` and router navigation.

**Step 4: Keep the overlay UX, but let the route open it**
The route should ensure the correct listing detail is shown while preserving the current overlay visuals.

**Step 5: Verify browser history semantics**
Manual verification:
- open `/browse`
- tap listing card -> detail path opens
- press browser back -> returns to `/browse`
- paste direct detail URL -> correct listing opens

**Step 6: Commit**
```bash
git add src/App.tsx src/components/ListingCard.tsx src/screens/DetailOverlay.tsx src/router/routes/ tests/unit/router/browse-detail-route.test.tsx
git commit -m "feat: route browse detail overlays"
```

### Task 6: Remove dead hash-routing code and document the new boundary

**Objective:** Finish the slice cleanly and make future phases easier.

**Files:**
- Modify: `src/petLink.ts` or remove if obsolete
- Modify: `README.md`
- Modify: `docs/plans/2026-07-02-fullstack-framework-evaluation.md`
- Modify: `docs/architecture/data-model.md`

**Step 1: Remove obsolete hash-route helpers**
Delete dead code only after detail route tests pass.

**Step 2: Document the scope distinction**
Update docs so they clearly distinguish:
- immediate router migration in current Vite prototype
- later fullstack framework decision

**Step 3: Run full verification**
Run:
```bash
pnpm test
pnpm build
```
Expected: PASS

**Step 4: Commit**
```bash
git add README.md docs/ src/
git commit -m "docs: align pet buddies routing migration docs"
```

---

## Risks and pitfalls

### Risk 1: Dual authority between router and store
If `state.tab` continues to decide rendering while the router also navigates, refresh and back-button behavior will drift.

**Mitigation:** router owns rendering immediately once top-level tab routes land.

### Risk 2: Detail overlay assumes imperative open/close only
The current detail flow is store-driven and hash-synchronized.

**Mitigation:** keep the overlay component, but open it from route context and close it by navigating back to `/browse`.

### Risk 3: Overlays accidentally become route-coupled too early
Auth/inquiry/add/install/onboarding/moderation are not yet worth route files in this slice.

**Mitigation:** preserve them as store-driven overlays until the browse/detail slice is stable.

### Risk 4: Planning contradictions across docs
The repo already contains a Next.js recommendation and a TanStack Start assumption.

**Mitigation:** use this plan to separate **immediate router migration** from **eventual fullstack platform decision**.

---

## Verification checklist

Before calling this migration slice done:
- [x] `/browse` is the default route
- [x] all bottom-nav tabs work by URL
- [x] refresh on any top-level route preserves the correct screen
- [x] clicking a listing navigates to `/browse/listings/$listingId`
- [x] direct detail URL opens the correct listing
- [x] browser Back closes detail correctly
- [x] no `#/pet/...` hash routing remains
- [x] browse filters are URL search params
- [x] browse listing results are loaded from server query params
- [x] listing detail resolution uses a route loader with not-found handling
- [x] TanStack Start SPA-mode route shell is in place
- [x] `pnpm test` passes
- [x] `pnpm build` passes

---

## Refinement decisions captured

These decisions are now locked for the next slice:
1. Keep the `You` tab route as `/you`
2. Keep listing detail as a full-screen overlay presentation, including direct loads
3. Model browse filters in URL search params while keeping the current store compatibility mirror
4. Treat this router migration as the completed stepping stone into **TanStack Start on Cloudflare**
5. Redirect `/` to `/browse`

---

## Execution handoff

Plan executed in small slices:
1. [x] route vocabulary helpers/tests
2. [x] router shell
3. [x] tab routes
4. [x] route-driven bottom nav
5. [x] browse detail route
6. [x] browse URL search params
7. [x] TanStack Start SPA-mode shell
8. [x] doc cleanup
