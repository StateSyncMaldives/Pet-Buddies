# Browse Listing Menu Redesign

- **Triage label:** `needs-triage`
- **Status:** Draft — not started; not yet published to GitHub Issues.

## Problem Statement

Viewers browsing listings need the cats and birds menu to be clearer and easier to scan. The current Browse surface technically supports species switching and tags, but the controls read like utility filters instead of a listing menu that helps viewers quickly choose between cats and birds, understand which listing set is active, and then narrow by relevant traits.

The clarified menu order is literal species-first: the Cats/Birds control comes before search, and search remains part of the listing menu rather than the first control in it. This PRD assumes the intended outcome is a more prominent, species-first listing menu for the existing Browse surface rather than a new category page or a new navigation destination.

## Solution

Redesign the Browse listing menu as a compact, species-first control that sits between the hero and the listing feed. Cats and Birds should be presented as the primary row, with the active species visually obvious. Search follows the species row, then the secondary trait chips expose only the filters that apply to the selected species. Changing species should clear all active trait filters, preserve typed search, and update the Browse URL so the state remains shareable and refresh-safe.

The menu should feel native to Pet Buddies: quiet shell, soft brand moments, touch-first sizing, visible focus states, and no classifieds-style density. The pet remains the hero; the menu should improve orientation without competing with listing photos.

## User Stories

1. As a viewer, I want Cats and Birds to be visually distinct choices, so that I immediately understand what kind of listings I am browsing.
2. As a viewer, I want the active species to be obvious, so that I do not have to infer it from the listing results.
3. As a viewer, I want cat-specific filters to appear when Cats is active, so that I only see relevant ways to narrow cat listings.
4. As a viewer, I want bird-specific filters to appear when Birds is active, so that I only see relevant ways to narrow bird listings.
5. As a viewer, I want species switching to keep my search text, so that I can compare cats and birds in the same area or by the same keyword.
6. As a viewer, I want species switching to clear all active trait filters, so that stale or half-remembered filters do not silently narrow the new species feed.
7. As a viewer, I want the listing count to update with the active menu state, so that I understand whether the menu is narrowing the feed.
8. As a viewer, I want the menu to fit on mobile without horizontal confusion, so that I can browse comfortably with one hand.
9. As a desktop viewer, I want the menu to sit in the sticky filter area, so that I can refine listings without scrolling back to the top.
10. As a keyboard user, I want all menu controls to have visible focus and meaningful pressed/selected states, so that I can browse without a pointer.
11. As a screen reader user, I want the species choices and trait filters to expose their selected state, so that the listing menu is understandable non-visually.
12. As a viewer on reduced motion settings, I want state changes to be instant or near-instant, so that the menu does not animate unnecessarily.
13. As a listing owner previewing the marketplace, I want the species menu to reflect the supported listing categories, so that the product feels trustworthy and curated.
14. As a moderator, I want the Browse menu behavior to remain separate from the review queue, so that moderation workflows are not affected by consumer browsing changes.
15. As a returning viewer opening a shared Browse URL, I want the species, search text, and active filters to hydrate correctly, so that the shared state matches what the sender saw.
16. As a viewer with no matching results, I want the empty state to name the active species and suggest fewer filters, so that recovery is obvious.
17. As a product maintainer, I want the menu implementation to reuse existing Browse state and route contracts, so that the redesign does not fork behavior.
18. As a product maintainer, I want the listing menu to use Pet Buddies terminology, so that UI copy stays aligned with the domain glossary.

## Implementation Decisions

- Modify the existing Browse surface rather than creating a separate species page or desktop-only component.
- Keep one responsive component tree in line with the accepted desktop layout decision.
- Treat the listing menu as presentation around the existing Browse search contract: species, query, and tags.
- Preserve URL-backed state for species, query, and tags.
- Keep the search field independent from species selection.
- Order listing menu controls as species first, search second, trait chips third on mobile, centered-column, and desktop layouts.
- On desktop, the sticky filter area should keep that same semantic order rather than placing search before species for space efficiency.
- Continue clearing all active tags when the selected species changes. Some trait filters (Hand-tame, Needs foster) exist for both species, but a species switch always resets traits: predictability over persistence, so no filter silently carries over and narrows the new feed.
- Use a species-first control with two primary choices, Cats and Birds.
- Use species-specific trait chips as secondary controls.
- Keep listing count and empty state coupled to the active menu state. The count stays hidden at zero results; the empty state carries the message (it names the species and offers a clear-filters action), so the count never duplicates it.
- Sticky behavior stays desktop-only. On mobile the listing menu scrolls away with the hero; only the existing logo header is sticky, so stacked sticky chrome never competes with listing photos.
- Reuse existing Pet Buddies tokens, icon style, typography, and motion timing.
- Avoid introducing a new domain term for the UI widget. In product copy and docs, describe the surface as a Browse listing menu or listing filters, while keeping the domain entity as Listing.
- Interface design options considered (design-it-twice, four parallel designs):
  - Minimal interface: one `BrowseListingMenu` component with `value`/`onChange`/`resultCount` emitting complete next search states. Rejected: transition rules would only be testable through DOM interaction.
  - Flexible interface: separate `SpeciesSelector`, `ListingSearchField`, `TraitFilterChips`, and `ListingMenuSummary` components over a shared view model. Rejected: god-object view model and pressure toward duplicated breakpoint trees at a single call site.
  - Headless interface: `useListingMenu` hook with Downshift-style prop-getters over pure transitions. Rejected: prop-getter ceremony for exactly one consumer.
  - Common-case interface: pure transition functions in the Browse search helpers, JSX local to Browse. Chosen as the spine.
- Locked implementation shape (synthesis of the above):
  - Pure, DOM-free transition functions added to the Browse search helpers: `switchSpecies` (clears all tags, keeps query), `setQuery`, `toggleTag` (slug-normalized via `toTagSlug` so label/slug mismatches cannot occur), `clearFilters` (keeps species), `hasActiveFilters`, and `traitChipsFor(search)` returning `{ label, slug, active }` so filter vocabularies never leak into JSX.
  - One local listing-menu section inside Browse rendering species control, search, chips, and count in a single responsive tree; every interaction navigates with a complete next search state.
  - `FilterChip` is the only extracted presentational primitive, justified by repetition (seven chips), not speculative reuse.
  - Accessibility semantics baked in: species choices as a radiogroup with checked state, trait chips keep pressed state, and the count line announces politely as a status region.

## Framework Alignment (TanStack Router / Start)

- The route contract is already framework-aligned and stays: `validateSearch: validateBrowseSearch` on the Browse route, with the listing fetch in the route loader keyed on `loaderDeps: ({ search }) => search`.
- The menu renders from the validated route search, not the client store mirror. The current store-sync `useEffect` produces an SSR hydration flash: a shared `?species=bird` URL server-renders as Cats with empty controls, then flips after hydration. The route `search` is the single source of truth for menu state and for computing next states; the store sync remains only for surfaces that still read it.
- Query edits use a local draft input value and debounced `replace: true` navigation, so typing neither spams history nor re-runs the route loader per keystroke. Species and tag changes navigate with normal push semantics because they are meaningful history entries.
- Species and trait controls are buttons driving `useNavigate` scoped with `from` for type narrowing, not `Link` elements: they are toggle controls (radiogroup, pressed state), not navigational links.

## Testing Decisions

- Tests should assert external behavior: selected species, URL state, visible filters, listing count, and feed results. They should not assert implementation details such as internal component names or inline style structure.
- Extend router shell coverage for Browse menu behavior because existing tests already verify URL hydration and Browse search updates.
- Cover the species switch path: switching from Cats to Birds preserves query text and clears tags.
- Cover trait filtering for both species: active chips update the URL and feed results.
- Cover direct URL hydration for bird and cat states.
- Cover accessible selected state for species and trait controls where practical through roles, labels, or pressed state.
- Manual visual QA should check phone, centered-column, and desktop breakpoints because the menu participates in sticky layout on desktop.

## Out of Scope

- Adding dogs or any unsupported species.
- Changing the bird species allowlist.
- Changing listing creation, listing moderation, saved listings, adoption inquiries, or report routing.
- Reworking the listing card layout.
- Introducing a new backend filtering contract beyond the existing species, search, and tag fields.
- Creating a new top-level navigation destination for Cats or Birds.
- Replacing the Browse hero.

## Further Notes

- The exact reference visual was not available. If a screenshot or mock is provided later, implementation should preserve the behavioral decisions above while adjusting the visual treatment to match the reference.
- The menu should not feel like Facebook Marketplace categories or a classifieds board. It should stay curated, warm, and trustworthy.
- The design should keep the current product register: familiar controls, restrained color, clear selected states, and no decorative motion.
