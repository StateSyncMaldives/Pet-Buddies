# Pet Buddies backend implementation plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn Pet Buddies from a Vite prototype with in-memory workflows into a Cloudflare-ready fullstack application with a typed backend foundation for listings, saved listings, adoption inquiries, lost/found reports, clinics, and moderation.

**Architecture:** Keep the current prototype as the product reference while moving backend behavior into deep domain modules behind shallow transport adapters. Treat persistence records, transport DTOs, and frontend query models as separate seams. Enforce strict TDD: every production change starts with a failing test, then minimal code, then refactor.

**Tech Stack:** React prototype reference, TypeScript, Vitest, TanStack/Cloudflare-oriented backend seams, D1-compatible SQL, R2 adapter seam, shared contracts.

---

## Product identity guardrail

This repo is the product codebase for **Pet Buddies**, not a generic pet marketplace demo.

The backend plan must preserve these product workflows:
- adoptable cat and bird listings
- verified rescue organizations
- saved listings
- adoption inquiries
- lost/found report routing
- clinic directory
- moderation lifecycle
- bird species allowlist

---

## Migration stance

- The current `src/` app is the **legacy prototype reference** for product behavior and screen expectations.
- New backend code should be added in new server-oriented paths rather than stuffing more workflow logic into `src/store/store.tsx`.
- Do not deepen the monolithic store further. New business rules go into backend/domain modules first.

---

## Architecture review summary

### What is already good
- `CONTEXT.md` gives stable product vocabulary.
- `docs/adr/0001-backend-foundation.md` makes the backend direction explicit.
- `backend/contracts.ts` already separates many persistence records from public DTOs.
- `backend/sql/001_initial_schema.sql` is a strong first pass at the relational core.

### Main friction found in the current codebase
1. **The app store is a shallow module**
   - `src/store/store.tsx` currently owns listing filtering, status changes, inquiry creation, add-listing behavior, report submission behavior, auth flow, and toast side effects.
   - That gives low locality and a weak test surface.

2. **There are two type vocabularies in play**
   - `src/types.ts` still reflects prototype field names like `age`, `area`, `breed`, and free-form inquiry status strings.
   - `backend/contracts.ts` uses backend-oriented names like `ageText`, `areaLabel`, `birdSpecies`, and typed status unions.
   - Without an explicit adapter seam, the migration will leak naming drift everywhere.

3. **No test harness exists yet**
   - `package.json` has no `test` script.
   - There is no `tests/` directory.
   - TDD cannot be followed until the harness exists.

### Deepening opportunities to act on
- Create a **listing module** as the first deep module.
- Create **policy modules** for listing lifecycle and lost/found routing.
- Create a **contract seam** so records, transport DTOs, and frontend query models are not conflated.

### Top recommendation
Implement the first backend slice by combining:
- a deep **listing module**
- a clean **transport contract seam**
- explicit **policy modules** for invariants

That combination gives the best leverage and the cleanest TDD surface.

Architecture review report saved at:
- `/tmp/architecture-review-1782977270.html`

---

## TDD rule for this plan

**Iron law:** no production code without a failing test first.

Every code-producing task below must follow this cycle:
1. write one failing test
2. run only that test and confirm the expected failure
3. write the minimum code to pass
4. rerun the focused test and confirm pass
5. rerun the relevant suite to catch regressions
6. refactor only while tests stay green

### Standard test commands

Use these commands once the harness is created:
- focused test: `npm run test -- --run tests/unit/<path>.test.ts -t "<test name>"`
- file: `npm run test -- --run tests/unit/<path>.test.ts`
- full suite: `npm run test -- --run`
- typecheck: `npm run build`

---

## Target backend shape

```text
backend/
  contracts.ts                  # temporary bridge until moved into src/server/contracts/
  sql/
    001_initial_schema.sql

src/
  server/
    contracts/
      api.ts
    http/
      listings/
      inquiries/
      reports/
      clinics/
      moderation/
    domain/
      listings/
        listing-service.ts
        listing-policy.ts
        listing-repository.ts
        listing-mapper.ts
        create-listing.ts
        moderate-listing.ts
        toggle-saved-listing.ts
      inquiries/
        create-inquiry.ts
      reports/
        create-report.ts
        report-routing.ts
      clinics/
        list-clinics.ts
      organizations/
    infra/
      db/
        client.ts
        migrate.ts
        types.ts
      storage/
      auth/
      ids/
      clock/

tests/
  unit/
    server/
      domain/
      http/
```

### Layer rule
- **HTTP layer:** parse request, authorize, call one use case, serialize typed result
- **Domain layer:** own invariants, routing rules, lifecycle transitions, save logic, tag rules
- **Infra layer:** D1, R2, auth provider integration, ids, timestamps

---

## Contract and naming rules

### Records vs transport vs screen models
- `*Record` = persistence row shape only
- `*Request` / `*Response` = HTTP seam only
- `*Summary` / `*Detail` = read models for public consumers
- If the frontend needs different view-shaping later, add explicit frontend mappers instead of leaking record fields

### Product-language rules
- Use `listing`, not ad/post/card
- Use `adoption inquiry`, not chat/thread
- Use `lost/found report`, not listing
- Use `verified organization`, not vendor/clinic
- Use `bird species allowlist`, not free-form bird breed text

### Request rules
- requests model user intent, not DB patch columns
- never accept DB-managed fields like `createdAt`, `updatedAt`, `publishedAt`, `rejectedAt`
- public ids remain opaque strings
- dates crossing the HTTP seam are ISO strings

---

## Execution order

### Task 1: Create the TDD harness first

**Objective:** Make strict TDD possible before any backend implementation work begins.

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tests/unit/smoke.test.ts`
- Modify: `.gitignore` if Vitest artifacts need ignoring

**Steps:**
1. Add a `test` script to `package.json`.
2. Add Vitest as the unit-test runner.
3. Create `vitest.config.ts` with a focused include on `tests/unit/**/*.test.ts`.
4. Expand `tsconfig.json` include paths so tests and new server files are typechecked.
5. Write `tests/unit/smoke.test.ts` first.
6. Run it and confirm failure because the test harness is not wired yet.
7. Finish the minimum config until the smoke test passes.
8. Run the full test suite and `npm run build`.

**Verification:**
- `npm run test -- --run tests/unit/smoke.test.ts` passes
- `npm run test -- --run` passes
- `npm run build` passes

### Task 2: Create the backend folder seams

**Objective:** Create the target directories so transport, domain, and infra do not collapse into one module.

**Files:**
- Create: `src/server/contracts/api.ts`
- Create: `src/server/http/.gitkeep`
- Create: `src/server/domain/.gitkeep`
- Create: `src/server/infra/.gitkeep`
- Create: `src/server/domain/listings/.gitkeep`
- Create: `src/server/domain/inquiries/.gitkeep`
- Create: `src/server/domain/reports/.gitkeep`
- Create: `src/server/domain/clinics/.gitkeep`
- Create: `tests/unit/server/seams.test.ts`

**TDD cycle:**
1. Write a failing seam test that asserts the contract module exports a placeholder `ApiResult` type helper or runtime constant used only to prove import paths are valid.
2. Run the focused test and confirm failure.
3. Create the minimum folder/files and export stub.
4. Rerun focused test and confirm pass.
5. Run the suite.

**Verification:**
- server paths exist
- tests can import from `src/server/...`
- no route handlers contain business rules yet

### Task 3: Split backend transport contracts from persistence records

**Objective:** Make `src/server/contracts/api.ts` the public transport seam while leaving `backend/contracts.ts` as the persistence bridge until migration is complete.

**Files:**
- Modify: `backend/contracts.ts`
- Create: `src/server/contracts/api.ts`
- Create: `tests/unit/server/contracts/api-contracts.test.ts`

**TDD cycle:**
1. Write a failing test that imports public request/response types and asserts representative sample objects typecheck through helper functions.
2. Confirm failure because `src/server/contracts/api.ts` does not exist or exports are incomplete.
3. Move or copy only transport-facing types into `src/server/contracts/api.ts`.
4. Keep `*Record` types in `backend/contracts.ts`.
5. Add `ApiResult<T>` and explicit error codes to the transport contract file.
6. Rerun the focused test and then the suite.

**Verification:**
- no public request type includes DB-managed fields
- no public response is just a `*Record`
- `ApiResult<T>` is the common envelope everywhere

### Task 4: Add listing policy tests before listing implementation

**Objective:** Lock the most important listing invariants before adding repositories or handlers.

**Files:**
- Create: `src/server/domain/listings/listing-policy.ts`
- Create: `tests/unit/server/domain/listings/listing-policy.test.ts`

**Red tests to write first:**
- cats reject `birdSpecies`
- birds require allowlisted `birdSpecies`
- a listing owner must be either a user or a verified organization
- new listings default to `pending`

**Verification:**
- focused policy tests pass
- policy can be used without HTTP or database imports

### Task 5: Build the listing mapper seam

**Objective:** Isolate translation between persistence rows and public listing DTOs.

**Files:**
- Create: `src/server/domain/listings/listing-mapper.ts`
- Create: `tests/unit/server/domain/listings/listing-mapper.test.ts`

**Red tests to write first:**
- maps `ListingRecord` + images + tags + organization into `ListingSummary`
- maps full aggregate into `ListingDetail`
- never exposes storage-only fields in public DTOs

**Verification:**
- mapper tests cover summary and detail
- callers no longer need to know record field names

### Task 6: Build the listing repository seam

**Objective:** Define one repository interface for listing reads/writes before wiring real D1 access.

**Files:**
- Create: `src/server/domain/listings/listing-repository.ts`
- Create: `tests/unit/server/domain/listings/listing-repository.test.ts`

**TDD approach:**
- start with an in-memory fake repository used only by tests
- define methods for browse, get by slug/id, create, update status, and save toggle support
- prove callers can work against the interface without importing D1-specific code

**Verification:**
- listing domain tests can run using a fake adapter
- D1 remains an infra concern, not a domain dependency

### Task 7: Implement listing browse and detail as the first deep module

**Objective:** Ship the first real public backend read path with the best leverage.

**Files:**
- Create: `src/server/domain/listings/listing-service.ts`
- Create: `src/server/http/listings/get-listings.ts`
- Create: `src/server/http/listings/get-listing-detail.ts`
- Create: `tests/unit/server/domain/listings/listing-service.test.ts`
- Create: `tests/unit/server/http/listings/get-listings.test.ts`
- Create: `tests/unit/server/http/listings/get-listing-detail.test.ts`

**Red tests to write first:**
- browse filters live listings by species
- browse applies tag filters
- browse supports text search against listing name, area label, and tags
- detail lookup returns a typed `ListingDetail`
- missing slug/id returns `NOT_FOUND`

**Verification:**
- browse returns `ApiResult<BrowseListingsResponse>`
- detail returns `ApiResult<GetListingDetailResponse>`
- HTTP tests prove handlers stay thin and delegate to the listing module

### Task 8: Build the DB seam after the domain interface is clear

**Objective:** Add one place responsible for D1 access and migration execution.

**Files:**
- Create: `src/server/infra/db/client.ts`
- Create: `src/server/infra/db/migrate.ts`
- Create: `src/server/infra/db/types.ts`
- Use existing: `backend/sql/001_initial_schema.sql`
- Create: `tests/unit/server/infra/db/migrate.test.ts`

**TDD cycle:**
1. Write a failing test around migration orchestration behavior.
2. Implement the minimum seam to load and expose the SQL migration list.
3. Keep D1-specific integration narrow.

**Verification:**
- local migration seam can discover `001_initial_schema.sql`
- repositories depend on the DB client seam, not raw global access

### Task 9: Implement listing creation through policy + repository

**Objective:** Support authenticated listing creation without leaking lifecycle logic into handlers.

**Files:**
- Create: `src/server/domain/listings/create-listing.ts`
- Create: `src/server/http/listings/post-listing.ts`
- Create: `tests/unit/server/domain/listings/create-listing.test.ts`
- Create: `tests/unit/server/http/listings/post-listing.test.ts`

**Red tests to write first:**
- valid listing creation returns `CreateListingResponse`
- invalid bird/cat combinations return `VALIDATION_ERROR`
- every new listing is `pending`
- organization-owned listings still produce correct owner shape

**Verification:**
- handler is transport-thin
- creation path reuses `listing-policy.ts`
- success response returns mapped DTO, not raw record

### Task 10: Implement saved listings and adoption inquiries

**Objective:** Support the first signed-in engagement workflows.

**Files:**
- Create: `src/server/domain/listings/toggle-saved-listing.ts`
- Create: `src/server/domain/inquiries/create-inquiry.ts`
- Create: `src/server/http/listings/post-save-listing.ts`
- Create: `src/server/http/inquiries/post-inquiry.ts`
- Create: `tests/unit/server/domain/listings/toggle-saved-listing.test.ts`
- Create: `tests/unit/server/domain/inquiries/create-inquiry.test.ts`

**Red tests to write first:**
- save toggling is idempotent from the client perspective
- cannot inquire on non-live listings
- inquiry snapshots recipient display data correctly
- inquiry response returns only the intended transport shape

**Verification:**
- save endpoint returns `ApiResult<ToggleSavedListingResponse>`
- inquiry endpoint returns `ApiResult<CreateInquiryResponse>`

### Task 11: Implement lost/found routing as a policy-backed module

**Objective:** Keep report-routing rules deep and testable.

**Files:**
- Create: `src/server/domain/reports/report-routing.ts`
- Create: `src/server/domain/reports/create-report.ts`
- Create: `src/server/http/reports/post-report.ts`
- Create: `tests/unit/server/domain/reports/report-routing.test.ts`
- Create: `tests/unit/server/domain/reports/create-report.test.ts`

**Red tests to write first:**
- cat reports route to the cat rescue organization
- bird reports route to the bird rescue organization
- bird reports require allowlisted `birdSpecies`
- report response returns reference code and routed organization id

**Verification:**
- report rules live in a policy module, not in the handler
- report endpoint returns `ApiResult<CreateLostFoundReportResponse>`

### Task 12: Implement clinic directory read models

**Objective:** Deliver a simple read-only module for clinics without mixing it into other workflows.

**Files:**
- Create: `src/server/domain/clinics/list-clinics.ts`
- Create: `src/server/http/clinics/get-clinics.ts`
- Create: `tests/unit/server/domain/clinics/list-clinics.test.ts`

**Red tests to write first:**
- groups services per clinic
- returns only active clinics
- emits `ListClinicsResponse` shape

**Verification:**
- clinic reads remain isolated from listing/report modules

### Task 13: Implement moderation transitions as a dedicated deep module

**Objective:** Keep moderation transitions, audit logging, and lifecycle rules concentrated in one module.

**Files:**
- Create: `src/server/domain/listings/moderate-listing.ts`
- Create: `src/server/http/moderation/post-listing-action.ts`
- Create: `tests/unit/server/domain/listings/moderate-listing.test.ts`
- Create: `tests/unit/server/http/moderation/post-listing-action.test.ts`

**Red tests to write first:**
- only pending listings can be approved or rejected
- only live listings can be adopted
- restored listings follow explicit allowed transitions
- every moderation action records a moderation event id

**Verification:**
- moderation endpoint returns `ApiResult<UpdateListingModerationResponse>`
- lifecycle rules are not duplicated in handlers or screens

---

## Verification checklist

- [ ] Vitest harness exists before backend code work begins
- [ ] Every new production module has a failing test first
- [ ] Records are separate from transport DTOs
- [ ] HTTP handlers stay thin
- [ ] Listing lifecycle rules live in `listing-policy.ts` / `moderate-listing.ts`
- [ ] Lost/found routing lives in `report-routing.ts`
- [ ] D1 access is isolated behind `src/server/infra/db/`
- [ ] The first public backend slice is listing browse/detail
- [ ] Frontend migration can consume stable DTOs without learning persistence details

---

## Recommended next implementation slice

Execute **Task 1 → Task 7** first:
1. create the TDD harness
2. create folder seams
3. split transport contracts
4. lock listing policy rules with tests
5. add mapper seam
6. add repository seam
7. ship listing browse/detail

That yields the first real backend read path with a clean test surface before write flows and moderation are layered in.
