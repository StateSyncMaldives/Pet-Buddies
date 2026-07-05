# 2026-07-05 Responsive desktop layout plan

Status: refined via grill-with-docs (CONTEXT.md + ADRs) and impeccable (product register).
Companion docs: `PRODUCT.md`, `DESIGN.md`, ADR 0004.

## Intent

Give Pet Buddies a real desktop experience while keeping the mobile-first app intact.
Today every screen renders at ~390px inside a cosmetic phone bezel on desktop
(`.pb-stage` / `.pb-phone` in `src/index.css`, single `max-width: 440px` breakpoint).
This plan replaces the bezel with full responsive desktop layouts, per screen,
without forking the component tree (ADR 0004).

## Design direction (register: product)

Pet Buddies app surfaces follow the **product register**: quiet, trustworthy shell;
the tool disappears into the task. The Browse hero is the one **brand-committed
moment**. This deliberately tempers the earlier top-design draft:

- **Typography**: no new typeface. Hanken Grotesk carries all UI; Quicksand is
  reserved for the wordmark and the Browse hero display line. Fixed rem scale
  (ratio ≈ 1.2); hero display ceiling 4rem, tracking ≥ -0.02em, `text-wrap: balance`.
- **Color**: existing cool-neutral system + pastel brand tokens from `src/theme.ts`
  (identity preservation — the earlier "warm neutrals / new premium font" idea is
  rejected as off-brand). Restrained: `actionBlue` for primary actions, selection,
  and state only. All new text pairings verified ≥ 4.5:1.
- **Motion**: 150–250ms, state-conveying only; ease-out-quart/expo custom curves;
  no orchestrated page-load choreography, no scroll hijacking, no Lenis. One
  subtle stagger on the Browse grid's first paint is the ceiling, and content must
  be visible by default (reveals enhance, never gate). `prefers-reduced-motion`
  alternative for everything, including the existing hero carousel auto-rotate.
- **Craft details**: semantic z-scale (extend `z` in theme.ts), branded
  `::selection`, designed `focus-visible` rings, skeletons over spinners,
  teaching empty states. No custom cursor. No side-stripe borders, no gradient
  text, no eyebrow-kicker scaffolding.

## Layout architecture

Breakpoints: **≤440px** phone (untouched — document scroll, safe areas, PWA);
**441–900px** centered single column (~640px max, no bezel, no cosmetic StatusBar);
**>900px** desktop shell.

1. **Retire the bezel >440px.** `.pb-phone` desktop mock, cosmetic `StatusBar`,
   and `InstallSheet` become phone/mobile-only. Document scroll everywhere
   (removes the inner `.pb-scroll` special case and simplifies `--pb-sticky-top`).
2. **Desktop shell (>900px)**: fixed left rail + content. 12-column content grid,
   max width 1200–1280px. The rail carries all five nav destinations from
   `BottomNav` — Browse, Report, Vets, You, Saved — plus the primary
   **Create listing** action and the **Review queue** shield with its pending
   count badge (grill fix: the draft omitted Report and the Review queue).
   `BottomNav` pill remains ≤900px.
3. **Overlay promotion (grill-checked against ADR 0002/0004):**
   - **Listing detail** — the route `/browse/listings/$listingId` already loads
     detail data but renders `null` and drives the store overlay. Desktop renders
     the detail surface **from the route** (two-pane); mobile keeps the overlay
     presentation. This retires one route/store dual-authority case flagged in
     ADR 0002.
   - **AuthOverlay, InquiryOverlay** — centered dialogs (~560px) with scrim at
     >900px; full-screen sheets below. Native `<dialog>`/portal semantics so
     they escape stacking contexts; focus trapped, Esc closes.
   - **AddOverlay** (create listing, larger form) — wide dialog (~720px) at
     >900px in this slice; candidate for a routed page in a later slice,
     consistent with ADR 0002's "overlays remain store-driven until later".
   - **ModOverlay (Review queue)** — desktop split view: pending listings list
     left, selected listing preview + approve/reject actions right. Utilitarian
     register is correct here.
   - **Onboarding** — not shown as a takeover at >900px; its value proposition
     lives in the Browse hero. First-run onboarding remains a mobile flow.

## Per-screen desktop layouts (>900px)

- **Browse**: brand hero — display line (≤4rem) with subtitle, integrated species
  segmented control, and the existing hero carousel recomposed as a wide
  editorial band (pet photography leads). Sticky filter bar (search, filter
  chips, count line) under the hero. Listing grid: `repeat(auto-fit,
  minmax(280px, 1fr))` (3 cols at 1280px, 2 at ~900px); listing cards keep one
  consistent shape (product register: no artificial size variation).
- **Listing detail** (route-rendered): media left ~7 cols; right ~5 cols sticky —
  name, species/breed/area, tags, listing owner with verified-organization
  badge, status chip, and the **Send adoption inquiry** primary action. Owner
  lifecycle actions (mark adopted, restore) as designed banners, not buried menus.
- **Vets**: clinic directory as a comfortable two-column row list (name, area,
  hours, contact); dense is fine. Map pane explicitly out of scope.
- **Saved**: same grid as Browse minus hero; teaching empty state ("Save
  listings to compare them here" + link to Browse).
- **You**: `/you?view=inquiries|listings` (already URL-driven) becomes vertical
  side-tabs left, content right. Sent adoption inquiries and Owned listings as
  scannable rows with status chips; Owned listings expose lifecycle state
  clearly (pending / live / adopted / rejected).
- **Report (lost/found)**: focused single column (~640px) centered; species
  allowlist selection explicit; the routing receipt (reference code, routed
  organization) as a designed confirmation state in mono for the code.

## Key states (all screens)

Default / hover / focus-visible / active / disabled on every interactive element;
loading skeletons for grid, detail, and directory; teaching empty states
(Browse-no-results with "clear filters", Saved, You inquiries, You listings,
Review queue empty); error states surfaced from loader/mutation failures; the
existing Toast stays viewport-anchored bottom-center at all sizes.

## Constraints & non-goals

- ≤440px behavior is untouched (document scroll, safe areas, PWA install flow).
- No new data requirements: desktop consumes the existing route loaders/read
  models (browse listings, listing detail, clinics, saved listings, sent
  adoption inquiries, owned listings). No backend, auth, or upload changes.
- Domain vocabulary from CONTEXT.md is binding in UI copy: Listing, Listing
  owner, Saved listing, Adoption inquiry, Lost/found report, Clinic, Review
  queue — never "post", "ad", "favorite", "chat", "inbox".
- Ship with restraint: Browse + Listing detail are the flagship; Vets / Saved /
  You / Report get competent, consistent desktop passes in the first slice.

## Sequencing

1. **Shell slice**: breakpoint tokens, retire bezel >440px, document scroll,
   441–900px centered column, rail nav >900px, z-scale/focus/selection tokens.
2. **Browse desktop**: hero band, sticky filters, responsive grid, skeletons,
   empty states.
3. **Listing detail desktop**: route-rendered two-pane surface (mobile keeps overlay).
4. **Dialog promotion**: Auth + Inquiry dialogs, Add wide dialog, Review queue
   split view.
5. **Saved / You / Vets / Report** desktop passes.
6. **QA gate**: reduced-motion pass, keyboard traversal + focus-visible audit,
   contrast checks on all new pairings, 60fps scroll/interaction profile, CLS ≈ 0
   (reserve image space with `aspect-ratio`), verify ≤440px unchanged.
