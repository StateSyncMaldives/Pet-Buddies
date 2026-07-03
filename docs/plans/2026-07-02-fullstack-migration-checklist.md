# 2026-07-02 Fullstack migration checklist

## What has been completed so far

This migration has moved the prototype closer to the eventual TanStack Start + Cloudflare fullstack app shell while keeping the current mobile-first SPA usable.

Completed:
- Added a server-backed runtime facade at `src/server/runtime/prototype-backend.ts`
- Seeded the runtime from the existing prototype listings/clinics and routed UI mutations through typed backend use cases
- Replaced direct in-store data mutation for these flows:
  - save / unsave listing
  - send adoption inquiry
  - create listing
  - approve / reject / mark adopted
  - submit lost/found report
- Added view-model mappers so the current UI consumes backend contract shapes cleanly
- Switched the Vets screen to render runtime-hydrated clinic data instead of importing seed data directly
- Switched report success UI to use the backend-generated routing + reference receipt
- Added runtime tests covering hydration, save persistence, create listing, report routing, and moderation
- Removed the backend module singleton from app composition by introducing `createAppRuntime()` / `createDemoSession()`
- Replaced demo-only id/timestamp/reference fallbacks with injectable runtime implementations for tests and app sessions
- Added TanStack Router context carrying the per-app backend/session boundary
- Moved listing detail resolution into the browse detail route loader with not-found handling for unknown listing ids
- Moved browse filters (`species`, `q`, `tags`) into validated URL search params while keeping the current SPA/store compatibility layer
- Upgraded the plain SPA toolchain to Vite 8.1.3, Vitest 4.1.9, `@vitejs/plugin-react` 6.0.3, and `vite-plugin-pwa` 1.3.0

Verification:
- `pnpm test` passes (83 tests)
- `pnpm build` passes

## Remaining checklist for the broader fullstack migration

### 1) Runtime -> real TanStack Start app shell
- [x] Upgrade local/runtime Node version to >= 22.12
- [x] Upgrade the plain SPA toolchain to Vite 8 + Vitest 4
- [ ] Install TanStack Start + Cloudflare-compatible packages
- [ ] Replace the current Vite-only entrypoint with a TanStack Start app shell
- [ ] Move route bootstrapping to Start loaders / server functions
- [ ] Add the real Cloudflare deployment adapter and worker entrypoints

### 2) Replace prototype singleton runtime with request-scoped server execution
- [x] Make the React store hydrate from an injected backend/session boundary instead of a hard-coded module singleton
- [x] Convert `prototype-backend.ts` itself into request-scoped services instead of a module singleton export
- [x] Thread demo viewer/session context through the app runtime boundary instead of hard-coding it inside consumers
- [x] Replace demo in-memory ids/timestamps/reference generation with injectable implementations
- [ ] Add explicit loader/action boundaries for listings, inquiries, reports, moderation, and clinics

### 3) Connect to persistent storage
- [ ] Implement a real database repository for listings
- [ ] Persist saved listings by user
- [ ] Persist inquiries
- [ ] Persist moderation events
- [ ] Persist reports and routing history
- [ ] Add migrations / schema wiring for organizations, users, listings, tags, images, inquiries, and reports

### 4) Real auth and authorization
- [ ] Replace `MOCK_USER` sign-in with Google auth
- [ ] Enforce listing creation permissions server-side
- [ ] Enforce moderator-only moderation actions server-side
- [ ] Associate inquiries/reports/listings with real user identities
- [ ] Handle signed-out browse/save/report behavior explicitly in the backend contract

### 5) Route-level data loading and invalidation
- [x] Move detail route data to route loaders instead of relying on shared in-memory store state
- [x] Load browse filters from URL search params
- [ ] Load browse results from server query params
- [ ] Make saved, inbox, and my listings derive from server-backed route data
- [ ] Add mutation invalidation / optimistic update strategy for Start + Query integration

### 6) Uploads and media
- [ ] Replace fake image object keys with real upload flow
- [ ] Add listing image upload + preview pipeline
- [ ] Add report photo upload pipeline
- [ ] Validate media size/type server-side
- [ ] Add Cloudflare-compatible object storage integration

### 7) Production UX/state cleanup
- [ ] Remove remaining hard-coded location/report defaults used only for the prototype
- [ ] Replace demo toasts/messages with responses driven by server outcomes everywhere
- [ ] Normalize bird species selection for the report flow UI instead of defaulting to Budgerigar internally
- [ ] Decide whether anonymous saves are local-only or account-backed and reflect that consistently in UX
- [ ] Ensure onboarding/install/report/add state is durable in the right layer

### 8) Test coverage to add next
- [x] Add integration tests for store + runtime mutation flows
- [x] Add route loader tests for the current TanStack Router shell
- [ ] Add route action tests once the Start shell exists
- [ ] Add auth-gated flow tests for add/apply resume behavior
- [ ] Add persistence tests against the eventual DB repositories
- [ ] Add end-to-end tests for browse -> detail -> inquiry, add -> moderation, and report routing

## Recommended next implementation slice

Best next move:
1. Upgrade the plain SPA toolchain to Vite 8 + Vitest 4 while preserving PWA behavior.
2. Scaffold the TanStack Start app shell in SPA mode.
3. Replace the broken `vite-plugin-pwa` path with a manual Workbox service-worker pipeline.
4. Keep this runtime facade as the compatibility layer while routes/loaders are migrated one screen at a time.

That preserves the work already done here and avoids another big-bang rewrite.
