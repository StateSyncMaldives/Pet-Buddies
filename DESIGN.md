# Design

Visual system captured from the shipped code (`src/theme.ts`, `src/index.css`, handoff README). The prototype is high-fidelity and is the source of truth; extend it, don't reinvent it.

## Theme

Light only. Cool near-white surfaces with pastel brand accents. No dark mode in v1.

## Color

Strategy: **Restrained** on app surfaces, with brand-committed moments (Browse hero, verified badge, primary actions).

### Brand / actions
- `powderBlue #8FC7E8` — cat / primary fill
- `actionBlue #6FB8E0` — primary buttons, active states
- `deepBlue #3E89BE` — deep blue text, active nav
- `blush #F2A9C4` — birds
- `wordmarkPink #E78FB4` — wordmark, moderator badge
- `heartPink #E6A4C4`, `sand #F6C453` — logo accents

### Neutrals (cool, crisp)
- Ink `#20252C`; secondary `#6f7680` / `#828893`; faint `#8d94a0` / `#a4abb7`
- Surfaces: app bg `#F7F8FA`, tiles/chips `#EEF1F6`, page `#E9ECF1`, desktop surround `#d4d8df`, photo tint `#E6EBF2`
- Lines: `#e6e9ef` / `#eef0f5` / `#e9ecf2`

### Status pairs (text on bg)
- Pending `#C99A2E` on `#FDF6E3` · Live `#3E89BE` on `#EAF4FB` · Adopted `#3F8C50` on `#E7F4EA` · Rejected `#C5577A` on `#FBEAEF` · Approve `#5AA86A`

Contrast note: secondary/faint greys are for labels and meta only — body copy uses ink or `#6f7680` at ≥14px on `#F7F8FA` (verify ≥4.5:1 when composing new surfaces).

## Typography

- UI: `'Hanken Grotesk', system-ui, sans-serif` — one family carries headings, body, labels, data.
- Brand: `'Quicksand', system-ui, sans-serif` — wordmark and brand-display moments only, weight 500+.
- Mono: `ui-monospace, Menlo` — reference codes (report receipts), tagline.
- Fixed rem scale, ratio ≈ 1.2. Current anchors: page title 25px/700, body 13.5–15px, meta 12.5px, nav labels 10.5px/600.
- Desktop display ceiling: Browse hero display ≤ 4rem (Quicksand or Hanken Grotesk 700, tracking ≥ -0.02em, `text-wrap: balance`). No display type in labels/buttons/data.

## Spacing & Layout

- Base unit ~4px; screen gutter 20px on mobile.
- Radii: cards 13–18px, chips/pills 999, segmented pill 10.
- Mobile: single column, 390px design width, bottom pill nav, document scroll ≤440px.
- Desktop (planned): 12-col grid, max content 1200–1280px, left rail nav >900px; 441–900px = centered single column (~640px max).

## Elevation & z-index

- Shadows: `card 0 2px 10px rgba(36,48,47,.06)`, `raised 0 6px 16px rgba(62,137,190,.32)`, `sheet 0 -10px 40px rgba(0,0,0,.18)`.
- Semantic z scale in `src/theme.ts` (`z.detail 20 → z.toast 40`); never arbitrary values.

## Motion

- Product register: 150–250ms, state-conveying only. Existing idiom: `cubic-bezier(.4,0,.2,1)` for segmented pill; overlays slide-up ~12px + fade.
- Preferred curves for new work: ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)` / ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`. No bounce/elastic. No orchestrated page-load sequences.
- Every animation has a `prefers-reduced-motion: reduce` alternative (crossfade or instant).

## Components

Existing vocabulary (reuse before inventing): `ListingCard`, `Hero` (carousel), `Segmented`, `BottomNav` (pill), `StatusBar` (phone-frame cosmetic), `Toast`, status chips, filter chips, 40px circular icon buttons, full-screen store-driven overlays (Detail, Add, Auth, Inquiry, Mod, Onboarding, InstallSheet).

Component states: every interactive element ships default / hover / focus-visible / active / disabled; skeletons over spinners; empty states teach (e.g. Saved explains saving, not "nothing here").
