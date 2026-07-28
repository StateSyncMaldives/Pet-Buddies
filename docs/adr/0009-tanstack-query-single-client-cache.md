# 9. TanStack Query as the single client cache for durable reads

Date: 2026-07-22

Status: Accepted. Supersedes the client-reconcile parts of [ADR 0008](0008-durable-persistence-async-backend.md) (§4 and its #8 Update).

## Context

ADR 0008 made the server/D1 the authoritative source of truth and had the client store apply optimistic updates and reconcile by calling `router.invalidate()`. In practice the store also grew a client-side mirror of durable data — a listings array and clinics array filled once, after mount, by an app-shell read (#8) and then mutated optimistically.

That produced two sources of truth on the client: the route loaders (durable, per navigation) and the store (durable-once, then optimistic). The UI read server data from the store — the Review queue derived pending Listings from `store.listings`, and Saved/You/Browse read the store too. Because the store reconciled only once and was never re-synced after a write, it drifted from durable truth. The headline symptom: approving a Listing the Review queue showed as pending failed with "Only pending listings can be approved or rejected," because the write validated against the durable Listing (already moderated) while the queue read a stale store entry. The same drift caused approved Listings to miss Browse and stale Saved/You views.

Route loaders alone cannot fix this, because the overlays that need durable data (the Review queue, Listing detail, adoption inquiry) are rendered above any route and cannot own a route loader.

## Decision

1. **TanStack Query is the single client cache for durable reads.** All server data reaches the UI through Query, keyed to the server functions that wrap the durable backend. There is no second client-side mirror of server data.

2. **Loaders prefetch into Query.** Route loaders call `queryClient.ensureQueryData(queryOptions)` for the reads their screen needs; route components and overlays alike read via `useQuery` with the same query keys. One cache, one keying scheme, populated on navigation and readable anywhere.

3. **Writes invalidate their reads.** Every mutation (toggle saved, create inquiry, create listing, moderate listing, create report) awaits its server function and then invalidates the affected query keys. The UI updates when the refetch lands. This is invalidate-and-refetch, not optimistic mutation; optimistic cache writes may be added later per-interaction if latency warrants, but are not the default.

4. **A durable Review-queue read backs the moderator queue.** The Review queue reads the durably-pending Listings through a server function and query key, not from the store.

5. **The store is UI-only.** It retains ephemeral state — the open overlay, browse filters, add-listing and report form drafts, toast, auth intent, onboarding/install flags, and the resolved Viewer identity. It no longer holds a Listings or clinics mirror and no longer performs the app-shell reconcile.

## Considered options

- **Keep the store as the server-data cache and re-sync it after every write — rejected.** It hand-rolls a client cache (dedup, keys, invalidation, refetch) that TanStack Query already provides correctly, and keeping it as a second source of truth is precisely what drifted.
- **Route loaders only, no Query — rejected.** Overlays are not routes and cannot own a loader, so the moderator Review queue and the floating detail/inquiry surfaces would have no loader-driven read.
- **A minimal hand-rolled fetch-on-open hook — rejected.** Reinvents a slice of Query with no shared cache across components and more surface area to get wrong.

## Consequences

- Server data has one client home (the Query cache); the store cannot drift from durable truth because it no longer holds server data.
- Read-after-write is correct by construction: a moderation transition invalidates the Review-queue and Browse reads, so the next read excludes the actioned Listing and (on approval) includes it in Browse.
- `@tanstack/react-query` is a new dependency and query-key conventions must be maintained.
- This reverses ADR 0008 §4's store-reconcile mechanism; that section is superseded here. The durable backend, schema, and server-function contracts from ADR 0008 are unchanged.
- The local-dev `@cloudflare/vite-plugin` behavior where reads and writes can resolve to separate local D1 instances is unaffected by this decision and remains a separate dev-tooling concern; production runs a single Worker and single D1.
