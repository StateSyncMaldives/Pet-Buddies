# PRD: Server-backed route data and mutation boundaries for Pet Buddies Start shell

Status: Ready for agent
Labels: ready-for-agent
Issue: Blocked from publication because `iyadhali/Pet-Buddies` has GitHub Issues disabled

## Problem Statement

Pet Buddies now runs on a TanStack Start shell with request-scoped runtime composition, URL-backed browse filters, browse/detail route loaders, and Cloudflare Workers configuration. The remaining prototype behavior still lets several user flows mutate application state through client-side store calls into the request runtime facade. That keeps the app usable, but it blurs the boundary between UI state, route data, and server-backed behavior.

This PRD defines the next implementation slice: move the remaining mutation-heavy workflows behind explicit TanStack Start server-function/action boundaries while keeping the current in-memory prototype backend as the implementation behind those boundaries. This creates the contract surface needed before D1 persistence, authentication, uploads, and production deployment are introduced.

## Solution

Add typed server-backed boundaries for the remaining mutation workflows:

1. Save or unsave a Listing.
2. Submit an Adoption inquiry.
3. Submit a Lost/found report.
4. Create a Listing.
5. Apply moderation actions that create a Moderation event and update Listing state.

Each boundary must validate input, call the existing request-scoped runtime/backend facade, return a typed response contract, and give the UI a clear way to reconcile route/store state after the mutation succeeds. The slice should preserve current demo behavior and avoid introducing durable persistence.

## User Stories

1. As a visitor browsing pets, I can save a Listing and see the saved state update without depending on a client-only mutation path.
2. As a visitor browsing pets, I can unsave a Listing and see the saved state update consistently wherever that Listing is visible.
3. As an adopter, I can send an Adoption inquiry from a Listing detail view and receive the same success or validation feedback as today.
4. As a Listing owner, I can submit a new Listing through the existing form and receive a typed success response with the created Listing.
5. As a community member, I can submit a Lost/found report and receive a typed success response with the created report.
6. As a moderator, I can approve a Listing and have the UI reflect the updated Listing status and related Moderation event.
7. As a moderator, I can reject a Listing and have the UI reflect the updated Listing status and related Moderation event.
8. As a moderator or Listing owner, I can mark a Listing adopted and have that state propagate through the relevant UI.
9. As a developer, I can identify all mutation entry points through named Start server functions/actions instead of searching for direct client-store calls into the backend facade.
10. As a future persistence implementer, I can replace the in-memory backend implementation behind these boundaries without changing UI event handlers.
11. As a future authentication implementer, I can add authorization checks at server-backed action boundaries without rewriting the view components.
12. As a tester, I can exercise mutation behavior through contract-level tests that match user workflows rather than private implementation details.

## Implementation Decisions

The implementation must keep the current request-scoped runtime as the composition boundary. The in-memory prototype backend remains the source of truth for this PRD.

Use TanStack Start server functions/actions for all mutation boundaries. The action layer should expose domain-level operations for saved listings, adoption inquiries, lost/found reports, listing creation, and moderation.

Reuse existing API contracts where they already describe request and response shapes. Add narrowly scoped contract types only when a mutation currently lacks a stable typed request or response shape.

Preserve route testability. Existing route loaders should continue to receive typed runtime context in tests, and new server boundaries should be testable without a browser.

Keep UI reconciliation explicit. After a mutation succeeds, the UI must update or invalidate the relevant route/store state so users see the result immediately and consistently. Do not introduce a full TanStack Query migration in this slice unless the local code already has the required pattern in place.

Do not introduce durable storage, authentication, upload handling, or Cloudflare deployment changes in this PRD.

## Testing Decisions

Add focused tests for each new server-backed mutation boundary:

1. Save and unsave Listing success cases.
2. Adoption inquiry validation and success cases.
3. Lost/found report validation and success cases.
4. Listing creation validation and success cases.
5. Moderation status transitions and response shape.

Update existing UI/store tests so mutation flows prove they use the new boundaries and reconcile visible state correctly. Keep assertions behavior-focused.

Preserve the current full-suite checks:

1. `pnpm test`
2. `pnpm build`
3. `pnpm cf-typegen`

## Out of Scope

D1 persistence, schema migrations, and repository replacement are out of scope.

Google authentication, role enforcement, and production authorization are out of scope.

R2 uploads, media scanning, and file validation are out of scope.

Cloudflare deployment is out of scope.

Replacing all view state with TanStack Query is out of scope.

Redesigning the listing, inquiry, report, or moderation UI is out of scope.

## Further Notes

This PRD follows the migration checklist next slice after the completed Start shell, Cloudflare config, browse/detail loaders, URL-backed browse filters, and first server-function wrapper for browse listing data.

The next PRD after this should cover durable persistence and repository replacement for Listings, Saved listings, Adoption inquiries, Lost/found reports, and Moderation events.
