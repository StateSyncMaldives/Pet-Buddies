# ADR 0004: Desktop layouts from one responsive component tree

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

Pet Buddies is a mobile-first PWA designed at ~390px. On desktop it currently
renders inside a cosmetic phone bezel (`.pb-stage` / `.pb-phone`), with a single
`max-width: 440px` breakpoint separating "real phone" from "desktop mock".

We are adding full desktop layouts (plan:
`docs/plans/2026-07-05-responsive-desktop-layout.md`). Two structural questions
had genuine alternatives:

1. Do desktop layouts come from the **same component tree** responding to
   breakpoints, or from **separate desktop routes/components**?
2. What happens to the store-driven full-screen overlays (ADR 0002 kept them
   store-driven) when full-screen takeovers stop making sense on desktop?

## Decision

1. **One component tree, breakpoint-driven.** The phone bezel is retired above
   440px. Breakpoints: ≤440px phone (unchanged), 441–900px centered single
   column, >900px desktop shell (left rail nav + 12-column content grid).
   Screens re-compose the same components; no `Desktop*` component fork and no
   user-agent branching.
2. **Overlays are promoted per breakpoint, not rewritten.** Listing detail —
   whose route `/browse/listings/$listingId` already owns data loading — renders
   as a route surface on desktop while mobile keeps the overlay presentation.
   Auth/Inquiry/Add become dialogs at >900px; the Review queue becomes a split
   view. Overlay open/close state stays store-driven (per ADR 0002) until the
   later route-ification slices.
3. **Document scroll everywhere.** The desktop inner-frame scroll
   (`.pb-scroll`) special case is removed along with the bezel.

## Why

- **The mobile prototype is the product reference.** A separate desktop tree
  would immediately drift from it and double every future feature's UI cost.
- **The data layer is already presentation-agnostic.** Route loaders and read
  models (browse, detail, clinics, saved, inquiries, owned listings) serve any
  layout; only presentation needs to respond to width.
- **Route-rendered detail resolves known debt.** ADR 0002 flagged route/store
  dual authority as a temporary risk; desktop detail rendering from the route
  is the first step out rather than a new divergence.

## Consequences

### Positive
- One implementation per feature; desktop and mobile cannot diverge in behavior.
- Deleting the bezel simplifies scroll/sticky handling (one scrolling model).
- Detail becomes refresh-safe and shareable as a real page on desktop.

### Negative
- Components must tolerate two compositions; some need container-aware styling.
- The 441–900px band is a deliberately plain centered column, not a designed
  tablet experience.
- Mobile keeps the overlay presentation for detail short-term, so the
  route-vs-overlay seam still exists below 900px until a later slice.

## Rejected alternatives

### Separate desktop routes/components ("adaptive" two-tree)
Rejected: doubles feature cost, invites behavioral drift, and contradicts the
migration strategy of preserving the prototype's fidelity while replacing
infrastructure underneath.

### Keep the phone bezel as the permanent desktop experience
Rejected by product decision: desktop users get a real layout. The bezel was a
presentation stopgap, not a design goal.

### Rewrite overlays as routes for all breakpoints now
Rejected for this slice: expands scope into the store/router boundary that
ADR 0002 deliberately staged; dialog promotion achieves the desktop UX without
destabilizing mobile.
