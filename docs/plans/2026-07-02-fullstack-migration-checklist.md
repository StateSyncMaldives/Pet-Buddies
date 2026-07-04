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
- Installed TanStack Start and the router plugin on the Vite 8 toolchain
- Swapped the route shell to TanStack Start SPA mode with generated file-based routes under `src/routes`
- Preserved the request-scoped demo runtime through typed router context in the Start router factory
- Replaced the old `vite-plugin-pwa` build path with an explicit `workbox-build` post-build service-worker generator
- Added a tracked web app manifest and production-only service-worker registration from the Start root route
- Added the Cloudflare Workers configuration slice with `@cloudflare/vite-plugin`, `wrangler.jsonc`, and generated Worker environment types
- Verified the Cloudflare adapter build path locally without deploying
- Added a Browse route loader boundary that derives server-backed listing results from validated URL search params
- Added the first Start server-function wrapper for browse listing data, with the route still delegating through injected runtime context for testable app composition
- Prepared the next ready-for-agent PRD for server-backed route data and mutation boundaries at `docs/prds/2026-07-03-server-backed-route-data-and-mutation-boundaries.md`
- Added Zod-validated mutation schemas, a store-facing mutation adapter seam, and Start server-function wrappers for save/unsave, Adoption inquiry submit, Lost/found report submit, Listing creation, and Listing lifecycle actions
- Added ADR 0003 to preserve request/session runtime identity across Start server-function mutation work
- Refined the next read-model PRD around Saved listings, Sent adoption inquiries, Owned listings, Clinic loaders, Router-owned loader data, and explicit mutation reconciliation
- Added explicit route-facing read models and loaders for Clinic data, Saved listings, Sent adoption inquiries, and Owned listings
- Moved the You segmented view to validated URL search params with `/you?view=inquiries|listings`
- Added loader invalidation/reconciliation for Saved remove and You owned-listing lifecycle changes

Verification:
- `pnpm test` passes (106 tests)
- `pnpm build` passes and generates `dist/client/sw.js`
- `pnpm cf-typegen` passes and writes `worker-configuration.d.ts`

Issue tracker note:
- GitHub Issue publication is currently blocked because the fork repository `iyadhali/Pet-Buddies` has Issues disabled. Keep the PRD local until Issues are enabled on the fork.

## Remaining checklist for the broader fullstack migration

### 1) Runtime -> real TanStack Start app shell
- [x] Upgrade local/runtime Node version to >= 22.12
- [x] Upgrade the plain SPA toolchain to Vite 8 + Vitest 4
- [x] Install TanStack Start + Cloudflare-compatible packages
- [x] Replace the current Vite-only entrypoint with a TanStack Start app shell
- [ ] Move route bootstrapping to Start loaders / server functions
- [x] Add the real Cloudflare deployment adapter and worker entrypoints

### 2) Replace prototype singleton runtime with request-scoped server execution
- [x] Make the React store hydrate from an injected backend/session boundary instead of a hard-coded module singleton
- [x] Convert `prototype-backend.ts` itself into request-scoped services instead of a module singleton export
- [x] Thread demo viewer/session context through the app runtime boundary instead of hard-coding it inside consumers
- [x] Replace demo in-memory ids/timestamps/reference generation with injectable implementations
- [x] Add explicit Start server function mutation seams for listings, inquiries, reports, and moderation
- [x] Add explicit loader/server query boundaries for clinics and remaining read models

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
- [x] Load browse results from server query params
- [x] Make Saved listings, Sent adoption inquiries, Owned listings, and Clinic data derive from explicit server-backed route data
- [x] Add mutation reconciliation for loader-owned route data before deciding whether TanStack Query becomes the cache owner

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
- [x] Add mutation adapter and runtime validation tests for Start server function inputs
- [ ] Add direct Start server function RPC tests once runtime identity can be preserved across real RPC calls
- [ ] Add auth-gated flow tests for add/apply resume behavior
- [ ] Add persistence tests against the eventual DB repositories
- [ ] Add end-to-end tests for browse -> detail -> inquiry, add -> moderation, and report routing

## Recommended next implementation slice

Best next move:
1. [x] Upgrade the plain SPA toolchain to Vite 8 + Vitest 4 while preserving PWA behavior.
2. [x] Scaffold the TanStack Start app shell in SPA mode.
3. [x] Replace the broken `vite-plugin-pwa` path with a manual Workbox service-worker pipeline.
4. [x] Keep this runtime facade as the compatibility layer while routes/loaders are migrated one screen at a time.
5. [x] Add the Cloudflare Workers config slice (`wrangler.jsonc` + `@cloudflare/vite-plugin`) without deploying.

Deployment note:
- No Cloudflare deploy has been run from this checklist. Actual deployment still requires `wrangler login` / account access and an explicit deploy command.

Next implementation slice:
- Replace the in-memory prototype repositories with durable persistence while keeping the explicit route read contracts stable.
- Keep the runtime mutation adapter in place until durable persistence replaces the demo in-memory backend.
- Completed read-model brief: `docs/prds/2026-07-03-server-backed-read-models-and-cache-ownership.md`
- Completed mutation slice brief: `docs/prds/2026-07-03-server-backed-route-data-and-mutation-boundaries.md`

That preserves the work already done here and avoids another big-bang rewrite.
