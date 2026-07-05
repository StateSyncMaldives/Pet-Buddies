# PRD: Durable persistence and repository replacement

Status: In progress
Labels: ready-for-agent
Issue: Blocked from publication because `iyadhali/Pet-Buddies` has GitHub Issues disabled

## Problem Statement

Pet Buddies now has explicit route-facing reads and mutation seams for Listings, Saved listings, Sent adoption inquiries, Owned listings, Clinic data, Lost/found reports, and Listing lifecycle actions. Those seams still run on the in-memory prototype backend. That keeps tests fast and the demo coherent, but it means all user-visible data disappears with the process and the Start server-function wrappers cannot become production boundaries yet.

The next slice should replace the prototype repository internals with durable persistence seams while preserving the API contracts and route read contracts that were just stabilized.

## Solution

Introduce Cloudflare D1-compatible repository implementations behind the existing domain interfaces, using the current SQL schema as the persistence target. Use Drizzle as the typed SQL adapter layer for the persistence implementation. Keep the current in-memory backend available for tests and local demo composition until a later environment-wiring slice decides when to instantiate D1-backed runtime services.

This slice should not introduce real Google authentication, R2 uploads, production authorization, or a Cloudflare deploy. It should make persistence replaceable and testable first.

## User Stories

1. As a Viewer, I want saved Listings to survive repository replacement, so that Saved can become account-backed without changing the Saved screen.
2. As an adopter, I want Sent adoption inquiries to be persisted through a repository seam, so that inquiry history can survive navigation and runtime restarts later.
3. As a Listing owner, I want Owned listings and lifecycle status to come from persisted records, so that Listing management can later work across server requests.
4. As a moderator, I want Listing lifecycle changes to persist moderation events, so that audit history is not only in memory.
5. As a reporter, I want Lost/found reports and routing receipts to persist through a repository seam, so that report handling can become durable.
6. As a pet owner looking for care, I want Clinic directory data to come from a persistent read repository, so that seeded clinic data can move out of runtime hydration.
7. As a developer, I want the existing route loaders and mutation adapter contracts to remain stable, so that UI screens do not change while persistence changes underneath.
8. As a developer, I want D1-specific code isolated under `src/server/infra/db`, so that domain modules stay testable without Cloudflare globals.
9. As a tester, I want repository contract tests that run without a live Cloudflare account, so that persistence behavior can be verified in CI before real deployment wiring.

## Implementation Decisions

Use the existing schema file at `backend/sql/001_initial_schema.sql` as the source of truth for this slice. Schema edits are allowed only when a current domain contract cannot be represented correctly; any schema edit must include a migration test and a short implementation note.

Keep the existing domain language: Listing, Saved listing, Adoption inquiry, Sent adoption inquiry, Listing owner, Owned listings, Lost/found report, Clinic, Moderation event, Viewer, and Verified organization.

Do not change route paths, screen copy, or UI layout in this PRD. Route loaders and screens should continue consuming the same transport/read contracts.

Add or refine repository interfaces where the current in-memory implementation hides persistence responsibilities:

1. Listing repository for browse/detail/create/status/owned listing reads.
2. Saved listing repository for Viewer-scoped save state.
3. Adoption inquiry repository for create and sent-inquiry reads.
4. Lost/found report repository for create and routing receipt persistence.
5. Clinic repository for active clinic summaries and services.
6. Moderation event repository for lifecycle audit writes.

Prefer narrow repository methods that match use-case needs over generic table access. Do not expose SQL rows to route loaders or screens.

Add D1-compatible SQL adapters behind the repository interfaces. The adapters should depend on a minimal database client interface under `src/server/infra/db`, not on Cloudflare globals directly. Tests may use a fake or in-memory SQL client that exercises SQL behavior without requiring `wrangler login`.

Use Drizzle for SQL schema definitions and repository query construction. Define the full database schema in Drizzle now, covering all tables from `backend/sql/001_initial_schema.sql`, rather than a partial Listing-only schema. The production-facing adapter should target Cloudflare D1 through Drizzle's D1 driver. Do not introduce raw SQL query strings inside domain modules.

For the persistence setup, use Miniflare to test the D1-compatible database locally. Repository tests should exercise real D1-compatible SQL through Miniflare without requiring Cloudflare credentials. Keep production D1 binding/runtime wiring deferred until the Miniflare-backed Drizzle repositories pass the same repository contract behaviors as the in-memory repositories.

Keep the current `createPrototypeBackend()` path working. Add a separate persistence-backed runtime factory only when the repository adapters are ready enough to compose without breaking the demo runtime.

Do not wire production D1 bindings into the app runtime in this PRD unless the repository tests and local build remain deterministic without Cloudflare credentials.

Preserve ADR 0003 until a real request/session identity strategy exists. Do not use module globals to simulate durable persistence.

Use Zod only at network/user-input boundaries. Repository methods should rely on typed inputs and domain policy validation.

## Implementation Order

1. Strengthen the DB seam: full Drizzle schema definitions, Miniflare-backed D1 test setup, migration discovery/execution tests, and D1-compatible adapter boundaries. Status: completed for setup; repository adapters remain next.
2. Implement a narrow Listing persistence tracer bullet first, because every other workflow depends on Listing aggregates. Status: completed as an async Drizzle D1 adapter behind a durable repository contract.
3. Keep the tracer bullet behind the existing `ListingRepository` interface and do not make it the default runtime repository yet. Status: completed; the prototype runtime still uses the in-memory repository.
4. Add repository contract tests that can run against the existing in-memory Listing repository and the new Miniflare-backed Drizzle Listing repository where practical. Status: completed for browse/get/create/save/status/toggle behavior.
5. Implement Saved listing persistence second, because it is small and exercises Viewer-scoped join data. Status: completed as a dedicated async repository with in-memory and Drizzle D1 contract coverage.
6. Implement Adoption inquiry persistence third, including sent-inquiry reads. Status: completed as a dedicated async repository with in-memory and Drizzle D1 contract coverage.
7. Implement Moderation event and lifecycle persistence fourth, preserving lifecycle status and audit event creation. Status: completed for moderation event persistence with in-memory and Drizzle D1 contract coverage; lifecycle runtime wiring remains deferred.
8. Implement Lost/found report persistence fifth, preserving reference code and routed organization receipt behavior.
9. Implement Clinic persistence last, because it is read-only and can be seeded independently.
10. Add a persistence-backed runtime composition seam, but keep the existing demo runtime as the default until environment binding is explicitly configured.

## Testing Decisions

Tests should verify behavior through public repository, runtime, route, and mutation interfaces. Avoid asserting private SQL string formatting unless testing migration discovery or adapter boundary behavior.

Add repository contract tests for:

1. Listing browse/detail/create/status reads and writes.
2. Viewer-scoped Saved listings.
3. Sent adoption inquiries.
4. Owned listings.
5. Lost/found report creation and routing receipts.
6. Clinic summaries with grouped services.
7. Moderation events written during lifecycle changes.

Add migration tests proving `backend/sql/001_initial_schema.sql` is discoverable and contains the tables required by the repositories. Add Miniflare D1 setup tests proving the full Drizzle schema can be created locally and queried without Cloudflare credentials.

Add runtime composition tests proving the persistence-backed runtime can satisfy the same public read and mutation contracts as the in-memory runtime for the covered workflows.

Preserve the full-suite checks:

1. `pnpm exec tsc --noEmit`
2. `pnpm test`
3. `pnpm build`
4. `pnpm cf-typegen`

## Out of Scope

Real Google authentication and production authorization are out of scope.

Cloudflare D1 database creation, `wrangler d1 create`, remote migrations, and deploy execution are out of scope.

R2 uploads, media validation, and object storage are out of scope.

TanStack Query adoption is out of scope.

Replacing visible UI workflows or redesigning screens is out of scope.

Organization membership management and Verified organization-owned Listing creation are out of scope except for preserving existing seeded organization data.

## Further Notes

This PRD follows the completed mutation-boundary and read-model-loader slices. The goal is to replace volatile in-memory repository internals without changing the route and mutation contracts that now exist.

The next PRD after this should cover real identity and authorization, because durable persistence without real auth still relies on demo Viewer identity.
