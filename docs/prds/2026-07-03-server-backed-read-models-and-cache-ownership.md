# PRD: Server-backed read models and cache ownership for Saved, You, and Vets

Status: Ready for agent
Labels: ready-for-agent
Issue: Blocked from publication because `iyadhali/Pet-Buddies` has GitHub Issues disabled

## Problem Statement

Pet Buddies now has a TanStack Start shell, server-backed browse/detail loaders, Zod-validated mutation seams, and a mutation adapter that keeps the current demo runtime coherent. The remaining read surfaces still derive important product state from the broad client store: Saved listings are assembled from `state.saved` plus local listings, the You surface derives Adoption inquiries and My listings from local UI state, and the Vets surface still depends on app-shell hydration instead of its own route data.

This makes the app usable, but it keeps route data and UI compatibility state entangled. Users can navigate to `/saved`, `/you`, or `/vets`, yet those routes do not have explicit server-backed read contracts. Future D1 persistence, real identity, and cache invalidation will be harder if these read models remain implicit store projections.

## Solution

Move the next read surfaces toward explicit server-backed route data while preserving the current mobile-first UI:

1. Saved listings should derive from a server-backed read model for the current Viewer.
2. The You surface should derive Adoption inquiries and My listings from server-backed read models.
3. Vets should derive Clinic data from an explicit route loader/server query instead of only app-shell hydration.
4. Cache ownership for these read models should be decided and documented before introducing TanStack Query broadly.
5. The existing mutation adapter should remain in place until durable persistence or real session-backed runtime identity replaces the in-memory prototype backend.

The implementation should keep the existing demo runtime semantics and avoid durable persistence. This is a read-model slice, not a database/auth slice.

## User Stories

1. As a Viewer, I want `/saved` to load my Saved listings from server-backed route data, so that a direct visit to Saved has an explicit data source.
2. As a Viewer, I want a Saved listing to show the same Listing details as Browse and Detail, so that saved state does not drift across screens.
3. As a Viewer, I want removing a Saved listing to update the Saved screen consistently, so that the route data and visible state stay coherent.
4. As a Viewer, I want Saved to keep its empty state when I have no Saved listings, so that the current UX remains clear.
5. As an adopter, I want `/you` to load my Adoption inquiries from server-backed read data, so that my inquiry history is not only client-memory state.
6. As an adopter, I want the You inquiry count and inquiry cards to match the server-backed read model, so that the inbox surface is reliable after navigation.
7. As an adopter, I want inquiry cards to keep deep-link navigation to Listing detail, so that I can return to the Listing I asked about.
8. As a Listing owner, I want My listings to load from server-backed read data, so that my Listing management surface has an explicit read contract.
9. As a Listing owner, I want My listings to preserve existing status labels for pending, live, rejected, and adopted Listings, so that I can understand lifecycle state at a glance.
10. As a Listing owner, I want marking a live Listing adopted to reconcile with the My listings read model, so that the status changes without drift.
11. As a signed-out Viewer, I want the You surface to preserve the current sign-in/list-a-pet empty state, so that the route-data migration does not imply real auth yet.
12. As a pet owner looking for care, I want `/vets` to load Clinic data through an explicit route read model, so that direct navigation has the same server-backed shape as other routes.
13. As a developer, I want Saved, You, and Vets route loaders to have typed read contracts, so that future D1 repositories can replace the in-memory runtime without changing screens first.
14. As a developer, I want cache ownership documented before Query is introduced, so that Router cache, Query cache, and store compatibility state do not become competing sources of truth.
15. As a tester, I want route-level tests for these read models, so that direct loads and navigations prove the data comes from the intended route seam.

## Implementation Decisions

Use the existing domain language: Listing, Saved listing, Adoption inquiry, Listing owner, Viewer, and Clinic. Do not introduce new User/account/role terminology in this PRD.

Build server-backed read modules for the Saved, You, and Vets surfaces. These modules should expose small typed interfaces and return backend contract shapes, not UI view models. Screens may continue mapping contract shapes into current UI view models until a later store-decomposition slice.

Extend the current runtime/backend facade only as much as needed to read:

1. Saved listings for a Viewer.
2. Adoption inquiries for a Viewer.
3. My listings for a Listing owner or demo Viewer.
4. Clinic summaries for Vets.

Keep the in-memory prototype backend as the implementation. Do not add D1 persistence, migrations, or real auth in this PRD.

Add TanStack Router loaders for `/saved`, `/you`, and `/vets`, or equivalent Start-compatible loader/server-query seams, so direct route loads have explicit read data. Keep route testability through typed router context.

Preserve ADR 0003. Do not use module globals to make read data appear persistent. The current request/session runtime identity must remain explicit and testable until durable persistence replaces the demo backend.

Do not route UI mutations through real Start RPC in this PRD. The existing mutation adapter remains the compatibility layer for save/unsave, Adoption inquiry creation, Listing creation, Lost/found report submission, and Listing lifecycle actions.

Decide cache ownership for the touched read models before implementing Query. Recommended decision for this PRD: keep TanStack Query out unless the implementer also moves the full touched read model to Query as the single cache owner. If Query is introduced, Router loaders must use Query as the single authoritative cache for those read models and the mutation adapter must invalidate the relevant query keys after successful mutations. Avoid split ownership between Router loader data, Query cache, and store compatibility state.

If Query is not introduced, loaders should return data directly and the store should consume or mirror that data only for current UI compatibility. Document the remaining migration path toward Query/cache ownership in the implementation report.

Use explicit exported interfaces for public read-model inputs and outputs. Avoid `any`; use existing API contract types wherever possible. Add narrowly scoped response contracts only where the current contract layer cannot express the read model.

Use Zod for runtime validation if a new network-boundary input is added. If a route has no user-controlled input beyond typed route context, do not add unnecessary schemas.

Keep screens visually and behaviorally stable. This PRD should not redesign Saved, You, or Vets.

## Testing Decisions

Tests should verify external behavior through public route, runtime, and read-model interfaces. Do not test private implementation details or assert on internal module wiring.

Add route-loader tests for direct loads of `/saved`, `/you`, and `/vets`. Follow the existing route loader tests for Browse and Detail.

Add runtime/read-model tests proving:

1. Saved listings are scoped to the Viewer.
2. Adoption inquiries returned for You match inquiries created through the existing mutation adapter/runtime flow.
3. My listings include Listings owned by the demo Viewer and preserve lifecycle status.
4. Clinic data is loaded through the explicit read seam.

Add store/screen integration tests only where needed to prove UI reconciliation remains correct after the route-data migration.

Add type-level tests with Vitest `expectTypeOf` for any new read response contracts and adapter interfaces.

Preserve the full-suite checks:

1. `pnpm exec tsc --noEmit`
2. `pnpm test`
3. `pnpm build`
4. `pnpm cf-typegen`

## Out of Scope

D1 persistence, schema migrations, and repository replacement are out of scope.

Real identity modeling, Google authentication, role enforcement, and production authorization are out of scope.

Replacing the mutation adapter or routing UI mutations through real Start RPC is out of scope.

R2 uploads, media validation, and object storage integration are out of scope.

Redesigning Saved, You, Vets, or bottom navigation is out of scope.

Broad store decomposition is out of scope except for the minimum compatibility changes needed to consume route data.

Introducing TanStack Query is optional only if the touched read model uses Query as the single cache owner. A partial Query adoption that creates competing cache sources is out of scope.

Cloudflare deploy execution is out of scope.

## Further Notes

This PRD follows the completed mutation-boundary slice. The key deferred decision is cache ownership for read models. The safest next implementation is to make `/saved`, `/you`, and `/vets` read seams explicit first, then decide whether TanStack Query should become the single cache owner for those surfaces in the same slice or the following slice.

The next PRD after this should cover durable persistence and repository replacement for Listings, Saved listings, Adoption inquiries, Lost/found reports, Moderation events, and Clinic data.
