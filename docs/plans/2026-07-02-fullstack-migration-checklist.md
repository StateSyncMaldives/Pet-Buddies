# 2026-07-02 Fullstack migration checklist

## What was completed in this slice

This pass moved the prototype one step closer to the eventual TanStack Start + Cloudflare fullstack app shell without forcing a risky framework swap on Node 18.

Completed now:
- Added a server-backed runtime façade at `src/server/runtime/prototype-backend.ts`
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

Verification:
- `npx tsc --noEmit` ✅
- `npm test` ✅ (65 tests passing)

## Remaining checklist for the broader fullstack migration

### 1) Runtime → real TanStack Start app shell
- [ ] Upgrade local/runtime Node version to >= 22.12
- [ ] Install TanStack Start + Cloudflare-compatible packages
- [ ] Replace the current Vite-only entrypoint with a TanStack Start app shell
- [ ] Move route bootstrapping to Start loaders / server functions
- [ ] Add the real Cloudflare deployment adapter and worker entrypoints

### 2) Replace prototype singleton runtime with request-scoped server execution
- [x] Make the React store hydrate from an injected backend/session boundary instead of a hard-coded module singleton
- [ ] Convert `prototype-backend.ts` itself into request-scoped services instead of a module singleton export
- [ ] Thread authenticated viewer/session context from the server layer instead of hard-coded demo viewer ids
- [ ] Replace demo in-memory ids/timestamps/reference generation with real infra implementations
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
- [ ] Move detail route data to route loaders instead of relying on shared in-memory store state
- [ ] Load browse filters/results from server query params
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
- [ ] Add route loader/action tests once the Start shell exists
- [ ] Add auth-gated flow tests for add/apply resume behavior
- [ ] Add persistence tests against the eventual DB repositories
- [ ] Add end-to-end tests for browse → detail → inquiry, add → moderation, and report routing

## Recommended next implementation slice

Best next move:
1. upgrade Node/runtime to the TanStack Start minimum,
2. scaffold the actual Start/Cloudflare app shell,
3. keep this runtime façade as the compatibility layer while routes/loaders are migrated one screen at a time.

That preserves the work already done here and avoids another big-bang rewrite.
