# User management & RBAC with Better Auth — design

- **Date:** 2026-07-27
- **Status:** Approved (brainstorm), pending implementation plan
- **Related:** ADR 0003 (preserve runtime identity in Start server functions), ADR 0008 (durable persistence), `CONTEXT.md` (Global role, Moderator, Administrator, Listing manager, Viewer, Signed-in user)

## Summary

Replace Pet Buddies' demo-seeded identity with real authentication and role-based
access control built on **Better Auth**, running inside the existing Cloudflare
Worker over D1 + Drizzle. Sign-in is **Google OAuth + email/password** (no email
verification or password reset in v1). Global roles (`user` / `moderator` /
`admin`) are driven by Better Auth's **admin plugin** with a custom access-control
policy; organization membership roles stay in the existing custom
`organization_members` table. Deliverables cover the auth backend, RBAC
enforcement everywhere, the sign-in/account UI, and an administrator
user-management screen.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Sign-in methods | Google OAuth **and** email/password |
| RBAC engine | Better Auth **admin plugin only** for global roles; **custom** org membership (admin-curated orgs, not self-serve) |
| Scope | All four: auth backend + session wiring, RBAC enforcement everywhere, sign-in/account UI, admin user-management UI |
| First admin | **Seed an admin record** (deterministic, links to the account that signs in) |
| Email flows (reset/verify) | **Deferred** — email/password with no verification/reset in v1 |
| Schema strategy | **Adapt existing tables** (Approach A) — Better Auth maps onto the existing `users` table; no FK rework |

**Pre-launch assumption:** the app has no real user data (only demo-seeded rows),
so additive schema changes and column renames carry near-zero migration risk.

## Approach A — adapt existing tables (chosen)

Better Auth's `user` model is mapped (model + field name mapping) onto the existing
`users` table. We add one column (`email_verified`) and the three Better
Auth-owned tables (`session`, `account`, `verification`). `global_role` is exposed
to the admin plugin as an additional field so it reads/writes the column that
already exists. Every existing foreign key that points at `users.id`
(`saved_listings.user_id`, `listings.listed_by_user_id`,
`moderation_events.actor_user_id`, `adoption_inquiries.sender_user_id`, …) is
untouched. `google_sub` becomes a nullable legacy column — provider identity now
lives in `account`.

**Rejected alternatives:** (B) Better Auth owns fresh tables with `users` demoted
to a synced satellite — duplicate user table, two ids to keep in sync, dozens of
FKs reworked; pure churn. (C) full admin + organization plugin adoption — ruled
out by the "admin plugin only + custom orgs" decision.

## Architecture & the identity seam

Better Auth runs as a single request handler mounted at `/api/auth/*` inside the
existing Worker, using the Drizzle adapter over D1. The auth instance is
constructed **per request** (never module-global), consistent with ADR 0003 and
the existing `createAppRuntime` pattern — the D1 binding comes from the
request-scoped env.

The core change: **`demo-session` / `demo-identity` are replaced by a real session
resolver.** Today `createAppRuntime()` hard-codes `viewerId` / `moderatorId`.
After this work a request middleware (`resolveViewer`) calls Better Auth's
`getSession` (reading the httpOnly cookie), loads the user + `global_role`, and
produces the same `Viewer` shape the rest of the app already consumes — so
mutations, repositories, and route loaders do not need to know auth exists.
Anonymous requests yield an anonymous viewer (per the `Viewer` glossary term:
signed-in user *or* anonymous). This preserves the seam ADR 0003 deliberately kept.

```
Browser ──cookie──▶ Worker
  /api/auth/*      ──▶ Better Auth handler (Drizzle→D1)   [sign-in, callback, sign-out]
  everything else  ──▶ resolveViewer() middleware ──▶ { viewer, role } in ctx
                          │
                          ▼ existing server fns / loaders / mutation adapter (unchanged shape)
```

## Schema changes (one additive Drizzle migration)

No existing table is dropped; no FK changes.

**`users` (Better Auth `user` model maps here):**
- Add `email_verified integer` (boolean) `not null default false` — required by BA core.
- Field mapping: `display_name` → BA `name`; `avatar_url` → BA `image`;
  `global_role` → admin-plugin role field.
- `google_sub` becomes nullable legacy; drop its unique index (new users won't populate it).
- Relax `users_global_role_check` so it permits the admin plugin's writes while
  the app config constrains values to `user` / `moderator` / `admin`.
- Add admin-plugin ban fields: `banned integer` (boolean), `ban_reason text`,
  `ban_expires text` (all nullable) — back the administrator "ban" capability.

**New Better Auth-owned tables** (generated from BA's Drizzle schema, committed as a normal migration):
- `session` — id, `user_id` → `users.id` (cascade), token, expires_at, ip_address,
  user_agent, `impersonated_by` (admin plugin; provisioned but unused in v1).
- `account` — id, `user_id`, provider_id (`google` | `credential`), account_id,
  password hash (email/password), OAuth tokens.
- `verification` — id, identifier, value, expires_at (BA housekeeping).

**Untouched:** `organizations`, `organization_members` remain the custom,
admin-curated model.

## RBAC policy & enforcement

Two authorization layers, unified at the enforcement point:

1. **Global role** (`users.global_role`) — driven by the Better Auth **admin
   plugin** with a custom access-control policy. Statements map to product
   capabilities: `listing:moderate`, `user:setRole`, `user:ban`, `org:verify`.
   Roles: `user` (none), `moderator` (`listing:moderate`), `admin` (all). Source
   of truth for the moderation queue and the admin screen.
2. **Organization role** (`organization_members.role` = member / admin /
   listing_manager) — plain repository reads, enforced in custom middleware.
   Governs publishing a listing under the org's identity (the *listing manager*
   term).

**Enforcement pattern:** one set of TanStack Start server-fn / route middlewares —
`requireViewer` (signed-in), `requireGlobalRole('moderator')`,
`requireGlobalPermission('org:verify')`, `requireOrgRole(orgId,
'listing_manager')`. Every site that currently trusts `demo-session` (moderation
functions, owned-listings, saved, inquiry create, plus the new admin actions)
switches to these. Authorization is always re-checked server-side; any client-side
role is UI hinting only.

**Ban check:** `resolveViewer` treats a banned (unexpired) user as signed-out for
write purposes and surfaces a "your account is suspended" state.

## Auth flows & sign-in / account UI

- **Client:** a Better Auth React client (`authClient`) exposing
  `signIn.social({provider:'google'})`, `signIn.email`, `signUp.email`,
  `signOut`, `useSession()`.
- **Sign-in route** (`/sign-in`): Google button + email/password form (toggle to
  sign-up). On success redirect to the intended route (preserve a `redirect`
  search param). No verification/reset in v1.
- **Account menu:** the existing profile/you area gains a real signed-in state
  (avatar, display name, sign-out); anonymous viewers see "Sign in". Wires the
  existing `profile` route to real identity instead of the mock user.
- **Gated actions** (save a listing, send an adoption inquiry): when anonymous,
  open the sign-in flow — matching the glossary ("Anonymous viewers cannot save;
  the attempt opens the sign-in flow"). Point the existing behavior at the real flow.
- **Account linking:** verified-email linking enabled so a user (including the
  seeded admin) signing in with Google resolves to the existing `users` row by
  email rather than creating a duplicate.

## Admin user-management UI

A new administrator-only route (`/admin/users`), guarded by
`requireGlobalPermission('user:setRole')`, backed by admin-plugin operations:
- **List/search users** (`admin.listUsers`) — email, name, global role, banned status.
- **Assign global role** — promote/demote `moderator` / `admin`
  (`admin.setRole`). Guard against removing the last admin and against an admin
  demoting themselves into lockout.
- **Ban / unban** (`admin.banUser` / `admin.unbanUser`) with reason.
- **Verify organization** — flips `organizations.is_verified` (+ `verified_at`);
  custom action (orgs aren't a BA plugin), on the same admin screen.
- Moderators do **not** see this screen (review queue only) — per `CONTEXT.md`.

**Out of scope for v1:** impersonation (admin plugin offers it; the
`session.impersonated_by` column is provisioned so it can be enabled later without
a schema change).

## Testing & migration of the demo seam

Implementation follows **test-first (TDD) red-green-refactor** — each slice below
lists its tests as the first task, written and failing before the implementation
that makes them pass. `pnpm test` (vitest) is the loop; `/browse` is unavailable on
this Windows setup, so UI behavior is verified via vitest integration tests, not a
live browser.

- **Seed rewrite:** replace `demo-identity` / `demo-session` with a real seed that
  inserts an admin user + `account` row (deterministic credential so the seeded
  administrator can sign in immediately), plus fixture user + moderator. Provide a
  `createTestSession(role)` helper that mints a real Better Auth session instead of
  hard-coded demo ids.
- **Test plan by slice (write these first):**
  - *Auth core* — `resolveViewer` returns anonymous with no cookie, the signed-in
    user for a valid session, and signed-out-for-writes for a banned/unexpired
    user; a valid `/api/auth/*` sign-in sets an httpOnly cookie; the seed's admin
    account links (no duplicate `users` row) when the same email signs in via Google.
  - *RBAC enforcement* — access-control policy table test (each role × each of
    `listing:moderate`, `user:setRole`, `user:ban`, `org:verify`); each middleware
    (`requireViewer`, `requireGlobalRole`, `requireGlobalPermission`,
    `requireOrgRole`) allows/denies correctly; a moderation server-fn rejects a
    plain user and accepts a moderator.
  - *Sign-in / account UI* — anonymous save/inquiry opens the sign-in flow and
    resumes after auth (`redirect` param honored); account menu shows signed-in
    identity and sign-out.
  - *Admin user-management UI* — admin can list/set-role/ban/verify-org; moderator
    and user are denied the route; last-admin demotion is blocked.
  - Migrate existing tests off `DEMO_VIEWER_USER` to `createTestSession`.

## Domain vocabulary additions (`CONTEXT.md` + ADR)

This feature adds durable domain concepts, so the domain model is updated as part
of the work (this repo's `/domain-model` equivalent — `CONTEXT.md` glossary +
`docs/adr/`). New/clarified glossary terms:

- **Session** — an authenticated Better Auth session backing a signed-in user,
  carried in an httpOnly cookie; the durable form of what the demo seam faked.
  _Avoid_: token, login.
- **Account** — the link between a signed-in user and a sign-in provider (`google`
  or `credential`); where provider identity and the password hash live. _Avoid_:
  login, credentials row.
- **Global permission** — a capability granted by a global role via the
  access-control policy (`listing:moderate`, `user:setRole`, `user:ban`,
  `org:verify`); the enforceable unit behind a global role. _Avoid_: scope, claim.
- **Ban** — an administrator action suspending a signed-in user's write access,
  recorded on the user record with an optional reason and expiry. _Avoid_: block, mute.
- **Bootstrap administrator** — the seeded administrator whose `account` links
  deterministically to the first real sign-in, resolving the "no admin can grant
  admin yet" chicken-and-egg. _Avoid_: root, superuser.
- **Legacy `google_sub`** — clarify the existing term as a nullable legacy column;
  provider identity now lives in **Account**.

A new ADR (next number, `0010`) records: "Better Auth over D1 with the existing
`users` table adapted (Approach A); admin plugin for global roles, custom
`organization_members` retained." The ADR is authored in the auth-core slice.

## Implementation slices (each lands independently)

1. **Auth core** — Better Auth + Drizzle/D1, migration, `/api/auth/*`,
   `resolveViewer`, seed rewrite. App behaves as today but on real sessions.
2. **RBAC enforcement** — access-control policy + middlewares; swap every
   demo-identity check.
3. **Sign-in / account UI** — sign-in route, account menu, gated-action redirects.
4. **Admin user-management UI** — `/admin/users`, role/ban/verify actions.

## Open follow-ups (explicitly deferred)

- Transactional email → password reset + address verification.
- Admin impersonation.
- Self-serve organization signup (stays admin-curated for now).
