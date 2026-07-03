# PRD: Server-backed route data and mutation boundaries for Pet Buddies Start shell

Status: Implemented locally
Labels: ready-for-agent
Issue: Blocked from publication because `iyadhali/Pet-Buddies` has GitHub Issues disabled

## Problem Statement

Pet Buddies now runs on a TanStack Start shell with request-scoped runtime composition, URL-backed browse filters, browse/detail route loaders, and Cloudflare Workers configuration. The remaining prototype behavior still lets several user flows mutate application state through client-side store calls into the request runtime facade. That keeps the app usable, but it blurs the boundary between UI state, route data, and server-backed behavior.

This PRD defines the next implementation slice: move the remaining mutation-heavy workflows behind explicit TanStack Start server function boundaries while keeping the current in-memory prototype backend as the implementation behind those boundaries. This creates the contract surface needed before D1 persistence, authentication, uploads, and production deployment are introduced.

## Solution

Add typed server-backed boundaries for the remaining mutation workflows:

1. Save or unsave a Listing.
2. Submit an Adoption inquiry.
3. Submit a Lost/found report.
4. Create a Listing.
5. Apply moderator-only actions that create a Moderation event and update Listing state.
6. Apply Listing owner lifecycle actions, such as marking a Listing adopted, through the same server-backed Listing action boundary.

Each boundary must validate input, call the existing request-scoped runtime/backend facade, return a typed response contract, and give the UI a clear way to reconcile route/store state after the mutation succeeds. The slice should preserve current demo behavior and avoid introducing durable persistence.

## User Stories

1. As a Viewer browsing pets, I can save a Listing and see the saved state update without depending on a client-only mutation path.
2. As a Viewer browsing pets, I can unsave a Listing and see the saved state update consistently wherever that Listing is visible.
3. As an adopter, I can send an Adoption inquiry from a Listing detail view and receive the same success or validation feedback as today.
4. As a Listing owner, I can submit a new Listing through the existing form and receive a typed success response with the created Listing.
5. As a community member, I can submit a Lost/found report and receive a typed success response with the created report.
6. As a moderator, I can approve a Listing and have the UI reflect the updated Listing status and related Moderation event.
7. As a moderator, I can reject a Listing and have the UI reflect the updated Listing status and related Moderation event.
8. As a Listing owner, I can mark a Listing adopted and have that state propagate through the relevant UI with a related Moderation event for lifecycle history.
9. As a developer, I can identify all mutation entry points through named Start server functions instead of searching for direct client-store calls into the backend facade.
10. As a future persistence implementer, I can replace the in-memory backend implementation behind these boundaries without changing UI event handlers.
11. As a future authentication implementer, I can add authorization checks at server-backed action boundaries without rewriting the view components.
12. As a tester, I can exercise mutation behavior through contract-level tests that match user workflows rather than private implementation details.

## Implementation Decisions

The implementation must keep the current request-scoped runtime as the composition boundary. The in-memory prototype backend remains the source of truth for this PRD.

Preserve demo-session runtime identity across server-function mutations and UI reconciliation. A mutation must affect the same request/session-scoped runtime model that the UI reads in tests. Do not fake cross-call state with module globals; if real Start RPC cannot cleanly preserve the current SPA-mode demo-session semantics yet, add explicit adapter seams and tests before routing UI calls through those server functions.

Use TanStack Start server functions for all mutation boundaries. The server-function layer should expose domain-level operations for saved listings, adoption inquiries, lost/found reports, listing creation, moderator-only Listing actions, and Listing owner lifecycle actions.

Add a local mutation adapter seam between the store and the Start server functions. The store should call a small mutation adapter interface for save/unsave, Adoption inquiry submission, Lost/found report submission, Listing creation, moderator-only Listing actions, and Listing owner lifecycle actions. The implementation must provide at least two adapters: a real Start server-function adapter for app execution and a test/runtime adapter that preserves the current request/session runtime semantics. This keeps the store focused on UI state reconciliation while the adapter module owns transport details.

Prefer a `mutation-adapter` or `app-mutations` module naming pattern, with operations grouped by domain concept. Exact filenames are less important than keeping one clear adapter seam with the real Start server-function adapter and the test/runtime adapter behind the same interface.

The mutation adapter interface must speak backend contract shapes, not UI view models. It should accept validated request data that adapts into existing API contract request types and return existing typed response contracts where possible. The store remains responsible for mapping contract responses into current UI state until a later route-data/cache slice replaces that compatibility state.

Preserve the existing `ApiResult<T>` discriminated union as the response shape for mutation adapters and server functions. Do not throw for expected domain failures such as validation, not found, conflict, or forbidden outcomes; return typed `ApiFailure` values with existing `ApiErrorCode` values and `fieldErrors` where relevant. Reserve thrown errors for framework-level not-found integration or truly unexpected failures that are sanitized at the server-function layer.

Use explicit exported interfaces for public mutation adapter object shapes and operation inputs. Avoid `any`; use `unknown` at raw server-function trust boundaries and narrow through Zod before calling typed adapters. Keep type assertions rare and local to schema/contract adaptation code.

Infer TypeScript input types from Zod schemas for the raw server-function inputs, then prove assignability into the existing API contract request types. Existing request/response contract types in `src/server/contracts/api.ts` remain the canonical transport shapes; Zod schemas validate and normalize inputs crossing the network boundary.

Use literal unions and exhaustive `switch` handling for Listing lifecycle actions such as approve, reject, adopt, and restore. If a new action is added, missing handling should fail at compile time with a `never` exhaustiveness check.

Do not broadly decompose the store in this PRD. The required architecture change is to reduce direct backend coupling by introducing the mutation adapter seam. Splitting product workflow modules from local UI flags, overlays, onboarding, install state, and toasts should be handled in a later architecture slice after server-backed route data is in place.

Treat Start server functions as transport adapters, not a new business-logic layer. They should use `createServerFn`, choose mutation-safe `POST` semantics for state changes, validate all network-boundary input, adapt the validated data into the existing runtime/backend facade and domain/http handlers, and return the existing typed response contracts where possible.

Reuse existing API contracts where they already describe request and response shapes. Add narrowly scoped contract types only when a mutation currently lacks a stable typed request or response shape.

Add shared runtime validation schemas for every Start mutation input. These schemas must be safe to import from client and server code, must validate data crossing the server-function boundary, and must adapt into the existing API contract request types rather than replacing those contract types as the source of truth.

Use Zod for the shared runtime validation schemas in this slice. If Zod is not already installed, add it as the validation dependency for Start mutation inputs and document the dependency addition in the implementation report.

Use one shared validation location/pattern for the new mutation schemas. If the existing browse server function is touched nearby, move its input validation into the same shared validation pattern; otherwise, do not force a browse validation refactor as part of this PRD.

Keep existing domain rules inside the backend use cases and thin HTTP-style handlers. Do not duplicate listing lifecycle, report routing, saved-listing, or inquiry rules in Start function handlers.

Return structured, user-safe errors from server functions. Not-found cases should map to the router-compatible not-found behavior where applicable, validation errors should remain field/action specific, and internal failures should not leak implementation details to the client.

Keep UI error presentation within existing toast and form-message patterns. This PRD requires typed validation/error results and tests for those results; it does not require a redesigned error UX.

Preserve route testability. Existing route loaders should continue to receive typed runtime context in tests, and new server boundaries should be testable without a browser.

Keep UI reconciliation explicit. After a mutation succeeds, the UI must update the existing store/router compatibility state so users see the result immediately and consistently. Do not introduce TanStack Query in this mutation-boundary slice; Query/cache ownership should be handled in a later route-data slice for saved listings, inbox, and my listings.

Do not introduce durable storage, authentication, upload handling, or Cloudflare deployment changes in this PRD.

Do not move Clinic route loading in this PRD. The existing Vets screen must continue to render runtime-hydrated Clinic data, and a later read-model slice should move `/vets` to an explicit loader/server query boundary.

## Testing Decisions

Add focused tests for each new server-backed mutation boundary:

1. Save and unsave Listing success cases.
2. Adoption inquiry validation and success cases.
3. Lost/found report validation and success cases.
4. Listing creation validation and success cases.
5. Moderator-only status transitions and response shape.
6. Listing owner lifecycle status transitions and response shape.
7. No regression for the existing Vets screen rendering runtime-hydrated Clinic data.
8. Runtime validation failures for each Start mutation input.
9. Typed, user-safe server-function error results without introducing a new error presentation system.
10. Demo-session runtime identity across server-function mutation calls and UI state reconciliation.
11. Store tests that exercise mutation flows through the mutation adapter interface rather than direct backend calls.
12. Type-level tests, using Vitest `expectTypeOf`, that lock mutation adapter inputs and outputs to the existing API contract request/response shapes.
13. Exhaustiveness tests or compile-time checks for Listing lifecycle action handling.

Update existing UI/store tests so mutation flows prove they use the new boundaries and reconcile visible state correctly. Keep assertions behavior-focused.

Preserve the current full-suite checks:

1. `pnpm test`
2. `pnpm build`
3. `pnpm cf-typegen`

## Out of Scope

D1 persistence, schema migrations, and repository replacement are out of scope.

Real identity modeling, Google authentication, role enforcement, anonymous local saves, and production authorization are out of scope. This slice may continue to pass the demo session Viewer through server-function boundaries, but it must not define the final User, account, or role model.

R2 uploads, media scanning, and file validation are out of scope.

Cloudflare deployment is out of scope.

Introducing TanStack Query, replacing view state with Query, or splitting cache ownership between Query and the existing store/router compatibility state is out of scope.

Broad store decomposition beyond the mutation adapter seam is out of scope.

Redesigning the listing, inquiry, report, or moderation UI is out of scope.

Moving Clinic data for `/vets` into a route loader or server query is out of scope.

## Further Notes

This PRD follows the migration checklist next slice after the completed Start shell, Cloudflare config, browse/detail loaders, URL-backed browse filters, and first server-function wrapper for browse listing data.

Implementation note: the slice now has Zod schemas, a mutation adapter seam, a runtime adapter used by the store to preserve demo-session identity, and Start server-function wrappers. The UI intentionally remains on the runtime adapter until durable persistence or a real session-backed runtime can preserve mutation identity across real RPC calls without module-global state.

The next PRD after this should cover durable persistence and repository replacement for Listings, Saved listings, Adoption inquiries, Lost/found reports, and Moderation events.
