# PRD: Server-backed read models and cache ownership for Saved, You, and Vets

Status: Ready for agent
Labels: ready-for-agent
Issue: Blocked from publication because `iyadhali/Pet-Buddies` has GitHub Issues disabled

## Problem Statement

Pet Buddies now has a TanStack Start shell, server-backed browse/detail loaders, Zod-validated mutation seams, and a mutation adapter that keeps the current demo runtime coherent. The remaining read surfaces still derive important product state from the broad client store: Saved listings are assembled from `state.saved` plus local listings, the You surface derives Sent adoption inquiries and Owned listings from local UI state, and the Vets surface still depends on app-shell hydration instead of its own route data.

This makes the app usable, but it keeps route data and UI compatibility state entangled. Users can navigate to `/saved`, `/you`, or `/vets`, yet those routes do not have explicit server-backed read contracts. Future D1 persistence, real identity, and cache invalidation will be harder if these read models remain implicit store projections.

## Solution

Move the next read surfaces toward explicit server-backed route data while preserving the current mobile-first UI:

1. Saved listings should derive from a server-backed read model for the current Viewer.
2. The You surface should derive Sent adoption inquiries and Owned listings from server-backed read models.
3. Vets should derive Clinic data from an explicit route loader/server query instead of only app-shell hydration.
4. TanStack Router loader data should temporarily own these read models; TanStack Query should be deferred to a later cache-ownership PRD.
5. The existing mutation adapter should remain in place until durable persistence or real session-backed runtime identity replaces the in-memory prototype backend.

The implementation should keep the existing demo runtime semantics and avoid durable persistence. This is a read-model slice, not a database/auth slice.

## User Stories

1. As a Viewer, I want `/saved` to load my Saved listings from server-backed route data, so that a direct visit to Saved has an explicit data source.
2. As a Viewer, I want a Saved listing to show the same Listing details as Browse and Detail, so that saved state does not drift across screens.
3. As a Viewer, I want removing a Saved listing to update the Saved screen consistently, so that the route data and visible state stay coherent.
4. As a Viewer, I want Saved to keep its empty state when I have no Saved listings, so that the current UX remains clear.
5. As an adopter, I want `/you` to load my Sent adoption inquiries from server-backed read data, so that my submitted inquiries are not only client-memory state.
6. As an adopter, I want the You inquiry count and inquiry cards to match the server-backed read model, so that my sent-inquiry surface is reliable after navigation.
7. As an adopter, I want sent-inquiry cards to keep deep-link navigation to Listing detail, so that I can return to the Listing I asked about.
8. As a Listing owner, I want Owned listings to load from server-backed read data, so that my Listing management surface has an explicit read contract.
9. As a Listing owner, I want Owned listings to preserve existing status labels for pending, live, rejected, and adopted Listings, so that I can understand lifecycle state at a glance.
10. As a Listing owner, I want marking a live Listing adopted to reconcile with the Owned listings read model, so that the status changes without drift.
11. As a Viewer, I want the You segmented view to be reflected in the URL, so that I can link directly to either sent inquiries or owned listings.
12. As a signed-out Viewer, I want the You surface to preserve the current sign-in/list-a-pet empty state, so that the route-data migration does not imply real auth yet.
13. As a pet owner looking for care, I want `/vets` to load Clinic data through an explicit route read model, so that direct navigation has the same server-backed shape as other routes.
14. As a developer, I want Saved, You, and Vets route loaders to have typed read contracts, so that future D1 repositories can replace the in-memory runtime without changing screens first.
15. As a developer, I want this slice to avoid TanStack Query, so that Router loader data, Query cache, and store compatibility state do not become competing sources of truth.
16. As a tester, I want route-level tests for these read models, so that direct loads and navigations prove the data comes from the intended route seam.

## Implementation Decisions

Use the existing domain language: Listing, Saved listing, Adoption inquiry, Sent adoption inquiry, Listing owner, Owned listings, Viewer, and Clinic. Do not introduce new User/account/role terminology in this PRD.

Build server-backed read modules for the Saved, You, and Vets surfaces. These modules should expose small typed interfaces and return backend contract shapes, not UI view models. Screens may continue mapping contract shapes into current UI view models until a later store-decomposition slice.

Extend the current runtime/backend facade only as much as needed to read:

1. Saved listings for a Viewer.
2. Sent adoption inquiries for a Viewer.
3. Owned listings for the current demo Viewer as Listing owner.
4. Clinic summaries for Vets.

Do not implement these route loaders by calling `hydrateAppShell()` and filtering its combined result. `hydrateAppShell()` remains an app-shell compatibility bootstrap. The new route loaders must call explicit route-facing reads for Saved listings, Sent adoption inquiries, Owned listings, and Clinic summaries. Those reads may reuse existing repository and service internals, but their public contract must match the route read model they serve.

Keep the in-memory prototype backend as the implementation. Do not add D1 persistence, migrations, or real auth in this PRD.

Add TanStack Router loaders for `/saved`, `/you`, and `/vets`, or equivalent Start-compatible loader/server-query seams, so direct route loads have explicit read data. Keep route testability through typed router context.

Move the `/you` segmented view state out of the broad store and into a validated search param: `/you?view=inquiries` or `/you?view=listings`. Default invalid or missing values to `inquiries`. Keep visible UI labels as `Inquiries` and `My listings`; keep implementation and docs terminology aligned to Sent adoption inquiries and Owned listings.

Preserve ADR 0003. Do not use module globals to make read data appear persistent. The current request/session runtime identity must remain explicit and testable until durable persistence replaces the demo backend.

Do not route UI mutations through real Start RPC in this PRD. The existing mutation adapter remains the compatibility layer for save/unsave, Adoption inquiry creation, Listing creation, Lost/found report submission, and Listing lifecycle actions.

Do not introduce TanStack Query in this PRD. TanStack Router loader data is the temporary owner for the `/saved`, `/you`, and `/vets` read models.

After a successful mutation that changes data shown by one of these loader-owned routes, explicitly reconcile with the route loader. Save/unsave must invalidate or reload the `/saved` loader, and marking a Listing adopted must invalidate or reload the `/you` Owned listings loader. Optimistic store updates are allowed for responsiveness, but loader refresh is the source-of-truth reconciliation step.

Loaders should return data directly, and the store should consume or mirror that data only for current UI compatibility. Document the remaining migration path toward a later dedicated Query/cache ownership PRD in the implementation report.

Prefer direct route-data consumption in the route or screen over mirroring loader data into the store. Store mirroring is allowed only as a temporary compatibility bridge when direct consumption would trigger broad store decomposition. Any mirrored route data must be treated as read-only route data, not as an independently mutated store source of truth.

Use explicit exported interfaces for public read-model inputs and outputs. Avoid `any`; use existing API contract types wherever possible. Add narrowly scoped response contracts only where the current contract layer cannot express the read model.

Use Zod for runtime validation if a new network-boundary input is added. If a route has no user-controlled input beyond typed route context, do not add unnecessary schemas.

Keep screens visually and behaviorally stable. This PRD should not redesign Saved, You, or Vets.

Implement in this order:

1. `/vets` Clinic loader/read seam first, because Clinic data is read-only and not Viewer-scoped.
2. `/saved` Saved listing loader/read seam second, because it is Viewer-scoped but has a simpler card list and empty state.
3. `/you` Sent adoption inquiries and Owned listings last, because it combines Viewer-scoped reads, Listing owner state, and mutation reconciliation.

## Testing Decisions

Tests should verify external behavior through public route, runtime, and read-model interfaces. Do not test private implementation details or assert on internal module wiring.

Add route-loader tests for direct loads of `/saved`, `/you`, and `/vets`. Follow the existing route loader tests for Browse and Detail.

Add route search-param tests proving `/you` defaults to the Sent adoption inquiries view, accepts `view=inquiries` and `view=listings`, and normalizes invalid view values without relying on store state.

Add runtime/read-model tests proving:

1. Saved listings are scoped to the Viewer.
2. Sent adoption inquiries returned for You match inquiries created through the existing mutation adapter/runtime flow.
3. Owned listings include Listings owned by the demo Viewer and preserve lifecycle status.
4. Clinic data is loaded through the explicit read seam.
5. Route loaders call explicit read-model methods rather than `hydrateAppShell()` projections.

Add store/screen integration tests only where needed to prove UI reconciliation remains correct after the route-data migration.

Add mutation-reconciliation tests proving save/unsave refreshes or invalidates the `/saved` loader data and marking a Listing adopted refreshes or invalidates the `/you` Owned listings data.

Add type-level tests with Vitest `expectTypeOf` for any new read response contracts and adapter interfaces.

Preserve the full-suite checks:

1. `pnpm exec tsc --noEmit`
2. `pnpm test`
3. `pnpm build`
4. `pnpm cf-typegen`

## Out of Scope

D1 persistence, schema migrations, and repository replacement are out of scope.

Real identity modeling, Google authentication, role enforcement, Verified organization ownership, and production authorization are out of scope.

Replacing the mutation adapter or routing UI mutations through real Start RPC is out of scope.

R2 uploads, media validation, and object storage integration are out of scope.

Redesigning Saved, You, Vets, or bottom navigation is out of scope.

Broad store decomposition is out of scope except for the minimum compatibility changes needed to consume route data.

Introducing TanStack Query is out of scope. A later dedicated Query/cache ownership PRD should decide whether Query becomes the single cache owner for these read models.

Cloudflare deploy execution is out of scope.

## Further Notes

This PRD follows the completed mutation-boundary slice. The key decision is to make `/saved`, `/you`, and `/vets` read seams explicit with Router loader data first, then decide whether TanStack Query should become the single cache owner in a separate PRD. Verified organization-owned Listings should wait for the auth and organization membership PRD.

The next PRD after this should cover durable persistence and repository replacement for Listings, Saved listings, Adoption inquiries, Sent adoption inquiries, Lost/found reports, Moderation events, and Clinic data.
