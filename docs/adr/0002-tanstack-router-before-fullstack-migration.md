# ADR 0002: Introduce TanStack Router inside the Vite prototype before fullstack migration

- **Status:** Accepted
- **Date:** 2026-07-02

## Context

Pet Buddies currently runs as a React + Vite mobile-first prototype with:
- top-level navigation stored in `state.tab`
- listing detail deep links implemented with custom hash routing in `src/App.tsx`
- all product workflows still backed by an in-memory store

The repo contained planning tension:
- `docs/plans/2026-07-02-fullstack-framework-evaluation.md` originally recommended Next.js for the eventual production rebuild
- `docs/architecture/data-model.md` and ADR 0001 assumed a TanStack Start + Cloudflare direction for the backend foundation

We needed a near-term routing improvement that gives us typed URLs, direct refresh support, and cleaner browse/detail navigation without forcing the fullstack migration into the same change set.

## Decision

We will introduce **TanStack Router** into the existing Vite prototype as a scoped frontend migration before the broader move to **TanStack Start on Cloudflare**.

For this phase:
1. TanStack Router owns top-level tab paths and browse detail routes
2. The existing in-memory store continues to own data, overlays, draft forms, auth state, onboarding/install flags, and toasts
3. Listing detail moves from `#/pet/:id` hash routing to `/browse/listings/$listingId`
4. Auth, inquiry, add-listing, moderation, onboarding, and install overlays remain store-driven until later slices
5. This router migration explicitly prepares the codebase for a later **TanStack Start on Cloudflare** migration

## Why

### Improve routing now without backend churn
We need refresh-safe routes and better history semantics immediately, but we do not yet need to replace storage, auth, or deployment.

### Preserve current product fidelity
The current prototype is already a strong mobile UX reference. A route-layer migration lets us preserve that UX while reducing custom navigation code.

### Reduce risk by isolating concerns
Routing concerns are separable from backend/runtime concerns. Solving them now gives cleaner feature slices later as we move from the current Vite prototype toward TanStack Start on Cloudflare.

### Align with the Cloudflare-first direction without overcommitting
TanStack Router is compatible with the current Vite setup and does not block a later TanStack Start path.

## Consequences

### Positive
- real typed URLs for tabs and listing detail
- direct refresh/deep-link support
- removal of custom hash-route synchronization
- cleaner future path for search-param modeling and loader-based data fetching

### Negative
- one more intermediate architecture stage before the final fullstack shape
- temporary coexistence of route state and store state requires discipline to avoid dual authority
- some docs must explicitly distinguish immediate router migration from the later backend/platform decision

## Rejected alternatives

### Keep the current store + hash routing until the fullstack rewrite
Rejected because it preserves known navigation debt and makes iterative migration harder.

### Commit to TanStack Start immediately
Rejected for this slice because it expands scope from routing to runtime/backend concerns before the route vocabulary is even stabilized.

### Switch directly to Next.js now
Rejected because the current product direction is TanStack Start on Cloudflare, and this slice should reinforce that path rather than reopen the framework choice.
