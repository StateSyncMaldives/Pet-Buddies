# Handoff: Pet Buddies MV — Pet adoption PWA (v1)

## Overview
Pet Buddies MV is an installable mobile web app (PWA) for cat & bird adoption, lost-&-found reporting, and a vet directory, serving Greater Malé in the Maldives. This package contains the **brand/logo system** and a **fully-interactive prototype of the v1 app** covering every screen and flow in the PRD.

The product replaces informal Facebook-group rehoming with one trustworthy place: verified rescue orgs, reviewed individual listings, saved favorites, adoption inquiries, and a seeded vet directory. Dogs are out of scope (import is prohibited in the Maldives); bird listings are restricted to legally-importable pet species.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the intended look and behavior, **not production code to ship directly**. The task is to **recreate these designs in a real codebase**. No app codebase exists yet, so choose an appropriate stack and implement the designs there.

**Recommended stack** (matches the PRD §10):
- **PWA**: React + Vite + `vite-plugin-pwa` (installable, offline, no app store). Mobile-first, single-column, ~390px design width.
- **Auth**: Google Sign-In (the chosen provider). Browsing/saving/reporting need no account; **listing creation requires sign-in**.
- **Data**: a lightweight hosted store is enough for Malé-scale v1 (managed Postgres/Supabase, or even a managed sheet to start). Revisit when volume grows.
- **Storage**: image uploads for listing/report photos are implemented — server-validated (JPEG/PNG/WebP, 5 MB, magic-byte sniffing) and stored in R2 under managed object keys (see ADR 0005–0007). Only the seed listings still use placeholder art.

The HTML prototype is built as a single "Design Component" (`.dc.html`) using a small runtime — treat its **logic class** as the spec for state & behavior, and its **template** as the spec for layout & styling. Do not depend on the `.dc.html` runtime in production.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, iconography, and interactions are all specified below and present in the files. Recreate pixel-closely using the target codebase's component library, then wire the real backend.

## Development

- `pnpm install` — install dependencies
- `pnpm dev` — run the app locally
- `pnpm test` — run the vitest suite
- `pnpm typecheck` — type-check (`tsc --noEmit`)
- Live: https://pet-buddies.statesync.dev

### Deployment

**Cloudflare Workers Builds owns deploys — do not deploy by hand.** Push the
branch and CI builds and ships it. Two deploy paths race, and the loser is
whichever ran first, so a manual deploy can silently overwrite what CI shipped.

Notes for anyone changing the build:

- `CLOUDFLARE_ENV` selects the wrangler environment at **build** time, because
  `@cloudflare/vite-plugin` resolves it while generating
  `dist/server/wrangler.json`. `wrangler deploy --env production` does nothing —
  the generated config is flat and declares no environments.
- `pnpm run build` therefore **defaults** `CLOUDFLARE_ENV` to `production`. CI
  runs a bare `pnpm run build`, and without that default it produced the local
  shape — no route, `BETTER_AUTH_URL=http://localhost:5173` — which on deploy
  would point OAuth callbacks at localhost and drop the custom domain.
  Build the local shape deliberately with `CLOUDFLARE_ENV= pnpm run build`.
- The build applies D1 migrations locally first: prerendering crawls `/` →
  `/browse`, whose loader queries D1, so a fresh checkout otherwise fails with
  `no such table: listings`.
- Secrets are per-environment and are not set by CI: `BETTER_AUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally
  `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.

---

## Brand & Logo

The logo is a **sitting cat with birds, cradled in a heart**, in a soft pastel palette ("Soft" / Palette B). Built from geometric primitives (circles, triangles, bézier paths) — fully reproducible as inline SVG.

- **Primary lockup**: mark above the wordmark; wordmark is `Pet` (blue `#6FB8E0`) + `Buddies` (pink `#E78FB4`) in **Quicksand 500**, with a letter-spaced `MALDIVES` tagline (monospace, `letter-spacing:0.44em`, `#a9a399`).
- **App icon**: full-color mark on warm-white tile `#F6F3EE` (primary). At ≤40px use the **solid white-on-blue** mark (`#6FB8E0` tile) for favicon/notification clarity.
- **Verified-org badge**: a blue (`#6FB8E0`) circular medallion with a white check — shown on org avatars, as an inline "Verified org" pill, and beside org names on listings.

The exact SVG paths for the mark, all lockups, icon sizes, the verified badge, the palette, and usage rules are in **`Pet Buddies Logo Final.dc.html`** — copy the SVG markup directly.

### Logo SVG (reference — primary mark, viewBox `0 0 260 210`)
```
heart:   path d="M130,182 C66,140 36,108 36,76 C36,50 56,34 80,34 C99,34 119,48 130,68 C141,48 161,34 180,34 C204,34 224,50 224,76 C224,108 194,140 130,182 Z"  (fill:none; stroke:#E6A4C4; stroke-width:5)
cat:     ears polygons "113,74 108,50 130,68" & "147,74 152,50 130,68"; head circle cx130 cy86 r20; body path "M118,100 C109,118 105,148 108,170 L152,170 C155,148 151,118 142,100 Z"; tail "M150,166 C176,168 190,154 190,136 C190,125 183,119 176,122 C183,127 181,138 171,142 C161,146 150,153 150,166 Z"  (fill:#8FC7E8)
cat eyes: circles cx123/137 cy86 r2.6 (fill:#fff)
bird:    body "M86,150 C72,150 64,140 64,128 C64,116 72,108 84,108 C92,108 98,112 100,120 C96,116 90,118 88,124 C92,122 96,124 96,130 C96,142 96,150 86,150 Z" (fill:#F2A9C4); beak "64,124 52,128 64,132" (fill:#F6C453)
flying:  two gull strokes "M150,70 Q158,62 166,70 Q174,62 182,70" & "M172,92 Q178,86 184,92 Q190,86 196,92" (stroke:#F2A9C4; stroke-width:3.4)
```
App-icon crop uses viewBox `38 28 184 184` (heart + cat + perched bird; flying birds omitted).

---

## Screens / Views

The app is a phone-framed single view (390×844) with a bottom tab bar (5 tabs) and several full-screen overlays. Status bar is cosmetic.

### Bottom navigation (persistent, 5 tabs)
`Browse` (grid icon) · `Report` (pin) · `Vets` (rounded-square cross) · `You` (person) · `Saved` (heart). Active color `#6FB8E0`, inactive `#B6B1A7`. Height 76px, `rgba(251,249,245,.92)` + blur, 1px top border `#efece5`. Labels 10.5px/600.

### 1. Browse (`tab: browse`)
- **Purpose**: discover adoptable cats & birds; entry to detail, add, and the moderator queue.
- **Header**: logo (mark + `PetBuddies` wordmark) on the left; on the right a row of two 40px circular buttons — a **moderator shield** (gray `#F4F1EB`, with a pink `#E78FB4` count badge of pending listings) and a **+** add button (blue `#6FB8E0`, shadow).
- **Title**: "Find a buddy" (25px/700, `#232826`), subtitle "Cats & birds looking for homes in Greater Malé." (13.5px, `#8a857c`).
- **Search**: full-width field, white, 1.5px border `#e9e5dd`, radius 13, magnifier icon; filters feed live over name/breed/area/tags.
- **Species segmented**: `Cats` / `Birds` toggle. Track `#EAE7E1`, sliding white pill (radius 10, shadow) animated `transform .25s cubic-bezier(.4,0,.2,1)`; active label `#232826`, inactive `#9a958b`. Switching species clears active tag filters.
- **Filter chips** (horizontal scroll): cats → `Vaccinated, Needs foster, Hand-tame, Kitten`; birds → `Hand-tame, Needs foster, Bonded pair`. Active chip: bg `#6FB8E0`, white text; inactive: white, `#7a766d`, border `#e3dfd7`. Multi-select, AND logic.
- **Count line**: "{n} cats/birds available" (12.5px, `#a9a399`) — hidden when empty.
- **Listing card**: white, radius 20, soft shadow. Photo area 188px tall, tinted per-listing (e.g. `#FBE3EC`), faint white animal silhouette + monospace caption ("cat · photo"). Save heart top-right (38px white circle): filled `#F2A9C4` when saved, else outline `#C9A6B6`. Body: name (18px/700) + area (12px `#a9a399`) row, meta line (13px `#8a857c`), tag pills (`#F4F1EB`/`#7a766d`, radius 7), then a top-bordered org row: org/lister name + verified check if applicable.
- **Empty state**: magnifier icon + "No cats/birds match your search yet. Try fewer filters." + **Clear filters** button.

### 2. Listing detail (overlay `detail`)
- Full-screen. 320px tinted hero with large silhouette; back (‹) top-left, save heart top-right (both 40px white circles).
- Name (27px/700), meta (`age · sex · area-city` or `breed · age · area-city`), tag pills.
- **Org row** card: avatar, org/lister name + verified check, role line ("Verified partner organisation" / "Individual lister").
- "About {name}" story paragraph (14.5px, `#5f5c54`, line-height 1.65).
- **Privacy note** card (`#F4F1EB`): "General area: {area}. Exact location is shared after your inquiry." (PRD §11.)
- "⚑ Report this listing" text button (visible to all → toast).
- **Sticky footer**: "Apply to adopt" (blue, full-width) → runs the adoption-inquiry flow. After sending, becomes a static "Inquiry sent" confirmation (`#E8F3FB`/`#3E89BE`).

### 3. Adoption inquiry composer (overlay `inquiry`)
- Reached from "Apply to adopt". If signed out, sign-in runs first (intent `apply`), then this opens.
- Header: Cancel / "Adoption inquiry". Pet summary card (thumb + name + meta + "To {org/lister}"). Editable **message** textarea, prefilled: *"Hi! I'm interested in adopting {name}. Could we find a time to meet? Thank you!"* Safety note (`#F4F1EB`): name/email shared only on send; meet in public for first handover.
- Sticky **Send inquiry** (blue). On send: record inquiry, mark listing applied, toast "Inquiry sent to {recipient}", return to detail.

### 4. Add listing (overlay `add`) — requires sign-in
- Header: Cancel / "New listing". **"Posting as {name} · Sign out"** bar (`#EAF4FB`) with avatar initial.
- Fields: **Species** (Cat/Bird segmented). If **Bird**, a **species allowlist** `<select>` (Budgerigar, Cockatiel, Lovebird, Finch, Canary) + amber warning: "Only legally importable pet birds can be listed. Native & protected species are not allowed." (PRD §7/§11.) Then Name, Age + Area (2-col), Tag chips (cats vs birds sets), Description textarea, and an info note: individual listings get a quick manual review before going live.
- **Submit for review** (blue; disabled gray until Name filled). On submit: create the listing as **status `pending`**, push to data, show success screen: heart-check, "Submitted!", "{name} is in the review queue…", **Back to browse**.

### 5. Report lost & found (`tab: report`)
- Title "Report a pet", subtitle about reaching the nearest partner org.
- **Lost pet / Found-stray** segmented (selectable buttons, active `#EAF4FB`/`#3E89BE`/border `#6FB8E0`).
- **Species** Cat/Bird (same button style).
- **Photo** dashed drop zone (camera icon → "Add a photo"; tap toggles to check + "Photo added").
- **Location**: "Use my location" pill (GPS-assisted; in proto fills "Maafannu, Malé") + area text field.
- **Description** textarea.
- **Send report** (blue) → success screen: check medallion, "Report sent", "Routed to {org}" (cats → Maldives Cat Rescue, birds → Zoophilist Society Maldives), reference number, **Done** (returns to Browse).

### 6. Vets (`tab: vets`)
- Title "Vet clinics", subtitle "For cats & birds in Greater Malé."
- **Clinic cards** (seeded): **Oases Vet Hospital** — Abadhah Fehi Magu, Malé; services Surgery, Diagnostics, Grooming, Pet shop. **Erika Vet Hospital** — Malé; Medical care, Grooming. Each: 52px tinted icon tile (cross), name, area, note, service chips, **Call** (blue) + **Directions** (outline) buttons (→ toasts).
- **"Good to know"** card (`#F4F1EB`): public Villimalé clinic closed 2022; private neutering ~$71–143 with wait times — book early (PRD §8).

### 7. You (`tab: inbox`) — personal hub
- Title "You" + a **segmented toggle**: **Inquiries** / **My listings** (same sliding-pill pattern as species).
- **Inquiries**: list of adoption inquiries you've sent — pet thumb, name, "Awaiting reply" amber status chip, "To {recipient}" + verified check, quoted message. Empty state: envelope icon + copy. Tapping opens the listing detail.
- **My listings**: signed-out → person icon + "Sign in to list a pet…" + **List a pet** button. Signed-in & empty → grid icon + copy + **List a pet**. Signed-in with listings → cards showing the pet, meta, and a **status chip**: `Pending review` (amber), `Live` (blue), `Adopted` (green), `Rejected` (pink). **Live** listings show a **Mark as adopted** button (`#F1F8F2`/`#3F8C50`) → flips to Adopted and removes from Browse.

### 8. Moderator review queue (overlay `mod`)
- Reached from the Browse header **shield**. Header: Done / "Review queue" / pending count.
- Banner (`#EAF4FB`): "Individual listings need a quick check before going live. Verified-org listings publish automatically." (PRD §7.)
- **Pending card** per listing: thumb, name, "Pending" chip, species · area, "Listed by {lister}", description, tags, and **Reject** (outline pink) / **Approve & publish** (green, check). Approve → status `live` (appears in Browse) + toast; Reject → status `rejected` (excluded) + toast. Empty → check medallion + "All caught up".

### 9. Onboarding (overlay, first launch)
- 3 slides, Skip top-right, dot indicator, **Next** → **Get started**.
  1. Big logo mark + `PetBuddies` wordmark + "Adopt cats & birds, report strays, and find a vet — all in one place, made for Greater Malé."
  2. Two tiles (pink cat `#F2A9C4`, blue bird `#8FC7E8`, white silhouettes) + "Give a pet a home" + browse/save/apply copy.
  3. Big blue check medallion + "Safe & accountable" + verified-orgs / review / report copy.

### 10. Install prompt (PWA)
- Bottom sheet (scrim + rounded-top sheet) shown once after onboarding, on Browse. App icon tile + "Install Pet Buddies" + "petbuddies.mv" + offline/no-app-store pitch + **Add to Home Screen** (blue, download icon) / **Not now**. Wire to the real `beforeinstallprompt` event + manifest in production.

---

## Interactions & Behavior
- **Navigation**: bottom tabs switch the primary view; detail/add/inquiry/auth/mod/onboarding/install are stacked full-screen overlays (z-index order: tabs < detail/add(20) < auth(22) < inquiry(23) < mod(24) < install(28) < onboarding(30)).
- **Auth gating**: `Apply to adopt` and `+ Add listing` require sign-in. Sign-in carries an **intent** (`apply` vs `add`) so it resumes the right action afterward. Everything else is open.
- **Save**: heart toggles on cards/detail; populates the Saved tab. Stop propagation on card hearts so they don't open detail.
- **Filtering**: feed = items with status not in {pending, rejected, adopted}, matching species, containing ALL active tags, and matching the search query (name/breed/area/tags).
- **Listing lifecycle**: submit → `pending` → moderator `approve` → `live` (in Browse) → owner `mark adopted` → `adopted` (out of Browse). `reject` → `rejected`. Verified-org listings would be created `live` directly (auto-publish).
- **Toasts**: transient pill (`#232826`) bottom-center, ~2.2s.
- **Transitions**: segmented pills animate `transform .25s cubic-bezier(.4,0,.2,1)`.

## State Management
Core state (see the logic class in `Pet Buddies App.dc.html` for the exact shape):
`tab`, `species`, `query`, `tags[]`, `saved[]`, `applied[]`, `overlay` (null|detail|add|inquiry|auth|mod), `detailId`, `user` ({name,email}|null), `authIntent` (add|apply), `pendingApplyId`, `inquiries[]`, `inquiry` {listingId,message}, `inboxView` (inquiries|listings), `onboarded`, `obStep`, `installed`, `installDismissed`, `toast`.
Listings carry a `status` of live | pending | rejected | adopted. In production, replace in-memory arrays with backend reads/writes; `user` comes from Google auth.

## Design Tokens
**Colors**
- Powder Blue (cat / primary action) `#8FC7E8`; primary button/active blue `#6FB8E0`; deep blue text `#3E89BE`
- Blush (birds) `#F2A9C4`; wordmark pink `#E78FB4`; heart-outline pink `#E6A4C4`
- Sand Yellow (beak accent) `#F6C453`
- Ink (text) `#232826`; secondary text `#8a857c` / `#9a958b`; faint `#a9a399` / `#b3aea4`
- Paper / tiles `#F6F3EE`; app bg `#FBF9F5`; page bg behind phone `#ECEAE4`/`#d9d6cf`
- Lines/borders `#e9e5dd` / `#f0ede7` / `#efece5`
- Status: pending amber text `#C99A2E` on `#FDF6E3`; live blue `#3E89BE` on `#EAF4FB`; adopted green `#3F8C50` on `#E7F4EA`; reject pink `#C5577A` on `#FBEAEF`; approve green button `#5AA86A`
**Type**: Quicksand (500/600 — logo, wordmarks, onboarding wordmark); Hanken Grotesk (400–700 — all UI); monospace (ui-monospace/Menlo — labels, tagline). Title 25px/700; H2 22–24px/700; body 14–15.5px; small 11.5–13px.
**Radius**: cards 16–20; tiles/inputs 11–15; buttons 11–16; app icon 28–35 (squircle); pills/chips 7–999.
**Shadow**: cards `0 2px 10px rgba(36,48,47,.06)`; raised buttons `0 6–8px 16–20px rgba(111,184,224,.35–.4)`; sheets `0 -10px 40px rgba(0,0,0,.18)`.
**Spacing**: screen padding 20px; card padding 13–16px; section gaps 18–22px.

## Assets
- **Logo / app icon / verified badge**: all inline SVG (geometric) — copy from `Pet Buddies Logo Final.dc.html`. No raster assets needed for the brand.
- **Animal silhouettes** (card/onboarding placeholders): simple white SVG cat & bird — in the app file. Real photo uploads are implemented for listings and reports; the silhouettes remain only for the **seed listings**, which ship without uploaded photos.
- **Fonts**: Google Fonts — Quicksand, Hanken Grotesk.
- **Icons**: simple stroked SVGs inline (search, heart, pin, cross, person, grid, shield, check, camera, share). Swap for the codebase's icon set if preferred.
- **Seed data**: 7 live listings + 2 pending, 3 partner orgs (Maldives Cat Rescue, Feline Welfare Organization, Zoophilist Society Maldives), 2 clinics — all in the app's logic class.

## Files
- `Pet Buddies App.dc.html` — the full interactive app prototype (all screens, flows, seed data, state logic). **Primary reference.**
- `Pet Buddies Logo Final.dc.html` — locked brand sheet: lockups, app-icon sizes, verified badge, palette, usage rules, and all SVG source.
- `support.js` — the `.dc.html` runtime (needed only to open the prototypes in a browser; **not** part of the production app).
