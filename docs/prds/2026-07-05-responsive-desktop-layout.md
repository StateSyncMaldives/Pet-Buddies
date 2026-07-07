# PRD: Responsive desktop layout

- **Triage label:** `ready-for-agent`
- **Status:** Implemented. (GitHub Issues are now enabled on `iyadhali/Pet-Buddies`; this PRD predates that and was delivered from this local copy.)
- **Sources:** `docs/plans/2026-07-05-responsive-desktop-layout.md`, `PRODUCT.md`, `DESIGN.md`, ADR 0002, ADR 0004, `CONTEXT.md`

## Problem Statement

Pet Buddies is a mobile-first app, and on a desktop browser it renders as a
390px phone mockup inside a cosmetic bezel. Desktop users get a novelty frame
instead of a real interface: wasted screen space, an inner scrollbar, touch-first
affordances, and full-screen takeovers for flows (sign-in, adoption inquiry,
listing creation, moderation) that desktop conventions handle better. People who
browse listings, review the moderation queue, or manage owned listings from a
laptop are second-class users of their own product.

## Solution

Replace the phone bezel with real responsive layouts built from the same
component tree (ADR 0004). Phones (≤440px) are untouched. Mid-size viewports
(441–900px) get a clean centered single column. Desktop (>900px) gets an app
shell — persistent left rail navigation, a 12-column content grid capped at
~1280px — with per-screen desktop compositions: an editorial Browse hero and
responsive listing grid, a route-rendered two-pane listing detail, dialogs
instead of full-screen takeovers for auth/inquiry/creation, a split-view Review
queue, and comfortable desktop passes for Vets, Saved, You, and Report. The
visual system stays the existing brand (cool neutrals, pastel brand accents,
Hanken Grotesk + Quicksand) per DESIGN.md, in the product register: quiet shell,
restrained state-conveying motion, the pet photography as the hero.

## User Stories

1. As a viewer on a desktop browser, I want the app to fill my screen with a real layout instead of a phone mockup, so that browsing listings feels first-class on my device.
2. As a viewer, I want a persistent left rail with Browse, Report, Vets, You, and Saved, so that I can move between sections without hunting for a floating pill nav.
3. As a viewer, I want the Browse listing grid to show multiple columns on wide screens, so that I can scan more adoptable pets at once.
4. As a viewer, I want the Browse hero to present featured listings and campaigns as a wide editorial band, so that the page feels warm and trustworthy rather than like a classifieds board.
5. As a viewer, I want the species segmented control, search, and filter chips in a sticky filter bar, so that I can refine the feed while scrolled deep into it.
6. As a viewer, I want listing search/filter state to stay in the URL on desktop exactly as on mobile, so that I can share and refresh filtered views.
7. As a viewer, I want to open a listing on desktop as a two-pane detail page (photos beside facts and actions), so that I can evaluate a pet without scrolling a narrow column.
8. As a viewer, I want the listing detail URL to be a real, refresh-safe page on desktop, so that I can share a specific pet with someone.
9. As an adopter, I want the Send adoption inquiry action visible in a sticky pane on the detail page, so that expressing interest never requires scrolling back.
10. As an adopter, I want the adoption inquiry form as a centered dialog on desktop, so that a short form doesn't take over my whole screen.
11. As a viewer, I want sign-in to appear as a centered dialog on desktop, so that authentication feels like a step, not a context switch.
12. As a listing owner, I want the create-listing form in a wide dialog on desktop, so that I can complete the form comfortably with a keyboard.
13. As a listing owner, I want my Owned listings in the You section shown as scannable rows with clear status chips (pending, live, adopted, rejected), so that I can track each listing's lifecycle at a glance.
14. As a listing owner, I want lifecycle actions (e.g. mark adopted) presented as clear designed controls on the desktop detail surface, so that managing a listing doesn't require the mobile flow.
15. As a viewer, I want my Sent adoption inquiries listed as rows in the You section, so that I can reference what I've already sent.
16. As a viewer, I want the You section's inquiries/listings views to remain URL-addressable (`?view=`), so that desktop navigation stays consistent with the existing route contract.
17. As a moderator, I want the Review queue as a desktop split view — pending listings on the left, the selected listing's preview and approve/reject actions on the right — so that I can review efficiently without opening one takeover per listing.
18. As a moderator, I want the pending-count badge visible on the rail's Review queue entry, so that I notice waiting work from any screen.
19. As a reporter, I want the Lost/found report form as a focused centered column on desktop, so that the form stays legible and unintimidating.
20. As a reporter, I want the report confirmation receipt (reference code and routed organization) as a designed confirmation state, so that I trust the report went somewhere accountable.
21. As a viewer, I want the Vets directory as a comfortable multi-column list on desktop, so that I can compare clinics without excessive scrolling.
22. As a viewer, I want Saved listings in the same responsive grid as Browse, so that comparing saved pets is effortless on a big screen.
23. As a new viewer, I want an empty Saved screen that teaches me how saving works, so that the feature invites use instead of dead-ending.
24. As a viewer, I want empty search/filter results to offer a clear-filters action, so that I can recover from an over-narrowed feed.
25. As a viewer on a tablet or small window (441–900px), I want a clean centered single-column app without the bezel, so that mid-size viewports are usable rather than mock-framed.
26. As a phone user, I want the ≤440px experience unchanged (document scroll, safe areas, bottom pill nav, install flow), so that the reference mobile UX and PWA behavior keep working.
27. As a keyboard user, I want visible focus states, dialog focus trapping, and Esc-to-close on all promoted dialogs, so that the desktop app is fully keyboard-operable.
28. As a user with reduced-motion preferences, I want every animation (including the hero carousel auto-rotate) to respect `prefers-reduced-motion`, so that the interface never causes discomfort.
29. As a user with low vision, I want all new desktop text/background pairings to meet WCAG 2.1 AA contrast, so that the airy desktop design remains readable.
30. As a viewer on a slow connection, I want skeleton loading states for the grid, detail, and directory, so that layout doesn't jump and the app feels stable (CLS ≈ 0).
31. As a desktop user, I want hover feedback on cards, rows, buttons, and nav items, so that interactive elements are discoverable with a pointer.
32. As a returning desktop user, I want onboarding folded into the Browse hero instead of a full-screen takeover, so that I land in the product immediately.
33. As a developer, I want desktop and mobile rendered from one component tree with breakpoint-driven composition, so that features never fork or drift between form factors.

## Implementation Decisions

- **One component tree** (ADR 0004): breakpoints at 440px (existing, unchanged)
  and 900px; no `Desktop*` component fork, no user-agent branching. The bezel,
  cosmetic StatusBar, and InstallSheet become ≤440px-only concerns; document
  scroll is used at every width (the inner-frame scroll special case is removed).
- **Shared navigation model**: extract the nav destination list (tab, label,
  icon, route) currently embedded in the bottom nav into a single navigation
  model module consumed by both the bottom pill nav (≤900px) and the new desktop
  rail (>900px). The rail additionally hosts the Create listing primary action
  and the Review queue entry with pending-count badge.
- **Responsive surface primitive**: one presentation primitive that renders a
  store-driven flow as a full-screen sheet below the desktop breakpoint and a
  centered dialog above it (native dialog semantics: scrim, focus trap, Esc,
  portal/top-layer so no clipping by scroll containers). Auth (~560px), Inquiry
  (~560px), and Add (~720px) adopt it. Overlay open/close state remains
  store-driven per ADR 0002.
- **Detail view extraction**: extract the listing detail presentation from the
  detail overlay into a view component rendered two ways — by the existing
  detail route as a two-pane page on desktop, and inside the overlay on mobile.
  The route already owns data loading; this retires one route/store
  dual-authority case flagged in ADR 0002.
- **Review queue split view**: the moderation surface becomes a master–detail
  split at >900px (pending list + selected preview with approve/reject),
  reusing the existing moderation actions and read model.
- **Design tokens**: extend the existing theme module with breakpoint constants,
  the semantic z-scale (already present) reused for dialog/scrim layers, focus
  ring and `::selection` tokens, and the fixed rem type scale with a 4rem hero
  display ceiling. Colors and fonts are the existing brand system (DESIGN.md);
  no new typefaces or palettes.
- **Layout mechanics**: desktop content grid capped ~1280px; listing grid via
  `repeat(auto-fit, minmax(280px, 1fr))` (no breakpoint proliferation); listing
  cards keep one consistent shape; hero display uses `text-wrap: balance`.
- **Motion policy** (product register): 150–250ms state-conveying transitions
  with ease-out-quart/expo curves; no page-load choreography, no scroll
  hijacking, no smooth-scroll library; content visible by default (reveals
  enhance, never gate); `prefers-reduced-motion` alternatives everywhere,
  including pausing the hero carousel auto-rotate.
- **No data-layer changes**: desktop consumes the existing route loaders and
  read models (browse listings, listing detail, clinics, saved listings, sent
  adoption inquiries, owned listings). Search-param contracts (`/browse`
  filters, `/you?view=`) are unchanged.
- **Vocabulary**: UI copy uses CONTEXT.md terms — Listing, Listing owner, Saved
  listing, Adoption inquiry, Sent adoption inquiry, Lost/found report, Clinic,
  Review queue. Never "post", "ad", "favorite", "chat", "inbox", "mod panel".

## Testing Decisions

- Good tests here assert **external behavior** — what renders and how it
  responds at a given viewport/route — not class names, inline styles, or
  internal composition.
- **Navigation model module**: unit tests that both navs derive from one
  destination list, active-state derivation from pathname, and the pending-count
  badge input (prior art: existing route/path tests around the router paths
  module).
- **Responsive surface primitive**: behavior tests for sheet-vs-dialog mode
  selection, focus trap, Esc close, and scrim dismissal, driven through a
  viewport/breakpoint seam so tests set the mode explicitly (prior art: existing
  Testing Library component tests with happy-dom).
- **Detail view extraction**: route-render test that the desktop detail route
  renders the detail surface from loader data (not a null component), and that
  unknown listing ids still produce not-found (prior art: existing route loader
  tests for the browse detail route).
- **Review queue split view**: interaction tests for select-then-approve/reject
  flows reusing the existing moderation runtime test fixtures.
- **Regression guard**: existing 112 tests must stay green; ≤440px snapshots of
  key screens unchanged.
- Visual QA (contrast, reduced motion, keyboard traversal, 60fps, CLS) is a
  manual gate in the final slice, not automated in this PRD.

## Out of Scope

- A designed tablet experience: 441–900px is deliberately a plain centered column.
- Route-ification of Auth/Add/Inquiry/Onboarding overlays (staged by ADR 0002;
  dialog promotion only in this PRD).
- A map pane on the Vets directory.
- Dark mode; new fonts or palettes; custom cursors.
- Backend, auth, persistence, uploads, or read-model changes (tracked by the
  durable-persistence PRD).
- Marketing/landing surfaces — this PRD covers the app shell only.

## Further Notes

- ADR 0004 records the one-tree decision and its rejected alternatives; ADR 0002
  explains why overlays stay store-driven for now.
- PRODUCT.md and DESIGN.md were created alongside this PRD and are the register
  and visual-system references implementers should read first.
- Suggested slice order (from the plan): shell → Browse → Detail → dialogs +
  Review queue → remaining screens → QA gate. Browse + Detail are the flagship;
  the rest are consistent, competent passes.
