# Remaining tracker issues — User Management & RBAC (Better Auth)

Tracker for the plan tasks A4–D3. **All complete** — each task's landing commit is
recorded beside it below. The GitHub issues (#28–#43) still need closing with these
commit references; `gh` was unauthenticated during the run (`gh auth login`).

Status legend: ☐ not started · ▶ in progress · ✅ done (commit range) · 🔎 in review

**Published to StateSyncMaldives/Pet-Buddies:** A4 #28 · A5 #29 · A7 #30 · A6 #31 · A8 #32 · A9 #33 · B1 #34 · B2 #35 · B3 #36 · C1 #37 · C2 #38 · C3 #39 · C4 #40 · D1 #41 · D2 #42 · D3 #43. Close each with its commit range as the SDD task lands.

Slice A tasks A1–A3 are already complete (0d346bb..fcf1658). Acceptance criteria below
are the behavioral tests each task must pass (from the plan); implementation detail
lives in `docs/superpowers/plans/2026-07-27-user-management-rbac-better-auth.md`.

---

## A4 — Per-request Better Auth instance (`createAuth`)  ✅ 12b1ab3
**What:** A factory that builds the Better Auth instance from an injected D1/Drizzle db + secrets (Google + email/password + admin plugin), plus a `createTestDatabase` helper that applies migrations to a miniflare D1.
**Acceptance criteria:**
- [x] `createAuth({database, secrets})` returns an instance where `auth.handler` and `auth.api.getSession` are functions
- [x] Google social + email/password providers enabled; admin plugin wired with the A2 `ac`/`roles`
- [x] `user.fields` maps `name→displayName`, `image→avatarUrl`; verified-email account linking for Google enabled
- [x] `tests/helpers/test-database.ts` builds a migrated D1 test database
**Blocked by:** A3 (done)

## A5 — Mount `/api/auth/$` server route  ✅ 982327c
**What:** A TanStack Start server route forwarding all `/api/auth/*` GET/POST to `auth.handler`.
**Acceptance criteria:**
- [x] `POST /api/auth/sign-up/email` returns status < 400 and issues a Better Auth session cookie (`set-cookie` contains `better-auth`)
- [x] Route forwards both GET and POST to a per-request auth instance
**Blocked by:** A4

## A7 — Seed bootstrap admin + test session helpers  ✅ 65d2f77  *(runs before A6)*
**What:** Seed the bootstrap administrator + moderator through the Better Auth API (real credential accounts) and promote roles; add `signUpAndGetCookie` and `createTestSession(role)` test helpers.
**Acceptance criteria:**
- [x] `seedAuth` creates exactly one admin user with a `credential` account and `role='admin'`
- [x] `seedAuth` is idempotent (second run does not duplicate)
- [x] `createTestSession(role)` returns a valid session cookie for user/moderator/admin
- [x] Existing demo seed users are RETAINED (removed later in A8) so the suite stays green
**Blocked by:** A4

## A6 — `resolveViewer()` identity seam  ✅ d7620c8
**What:** Resolve the `Viewer` (anonymous | signed-in user with role + banned) from a session cookie.
**Acceptance criteria:**
- [x] Returns `{kind:'anonymous'}` with no cookie
- [x] Returns the signed-in user (id, email, displayName, role, banned) for a valid session
- [x] `canWrite` is false for a banned (unexpired) user
- [x] **Gate for the d1-schema date-column watch-item:** the "valid session resolves a user" case passing confirms Better Auth round-trips `session.expires_at` correctly through the `text` column
**Blocked by:** A4, A7

## A8 — Replace the demo seam everywhere  ✅ 0bae8a7
**What:** Swap `demo-session`/`demo-identity` for `resolveRequestViewer()` across all server functions, the mutation adapter, and router context; delete the demo modules.
**Acceptance criteria:**
- [x] `resolveRequestViewer()` returns anonymous when the request has no session cookie
- [x] app-shell, saved, profile, inquiry, moderation server fns + `durable-mutation-adapter` resolve the real viewer (anonymous reads return empty; writes require a viewer)
- [x] Router context carries `viewer: Viewer`; `__root` beforeLoad populates it
- [x] `demo-session.ts`/`demo-identity.ts` deleted; `app-session.test.ts` migrated; full suite green
**Blocked by:** A6, A7

## A9 — ADR 0010 + domain vocabulary  ✅ (this docs commit)
**What:** Record the architecture decision and update domain docs.
**Acceptance criteria:**
- [x] `docs/adr/0010-*.md` records Approach A + admin-plugin + custom orgs + deferred email/impersonation
- [x] `CONTEXT.md` gains Session, Account, Global permission, Ban, Bootstrap administrator; `google_sub` marked legacy; Global role now in `users.role`
- [x] `docs/architecture/data-model.md` `global_role` → `role` (carried over from A3 doc-drift)
**Blocked by:** A3 (author after A8)

## B1 — Authorization guard helpers  ✅ 03d67a9
**What:** `requireViewer` / `requireGlobalRole` / `requireGlobalPermission` / `requireOrgRole` + `AuthzError{code}`.
**Acceptance criteria:**
- [x] `requireViewer` throws `UNAUTHORIZED` for anonymous, `FORBIDDEN` for banned
- [x] `requireGlobalPermission` allows moderator `listing:moderate`, denies plain user; `requireGlobalRole` enforces the ordering
- [x] `requireOrgRole` reads `organization_members` and denies non-members / insufficient org role
**Blocked by:** A2, A6

## B2 — Enforce moderation authorization  ✅ f17df76
**What:** Guard the moderation server functions; add a `run-server-fn` test harness that invokes a server fn under a given session.
**Acceptance criteria:**
- [x] `fetchReviewQueue` / `updateListingLifecycle` reject a plain user with `FORBIDDEN`
- [x] A moderator is allowed
**Blocked by:** B1, A8

## B3 — Enforce write authorization  ✅ afbdc6c
**What:** Require a signed-in viewer for saved/inquiry/create-listing; require `listing_manager` for org-owned listings.
**Acceptance criteria:**
- [x] Anonymous `toggleSavedListing` / `createInquiry` reject with `UNAUTHORIZED`
- [x] Signed-in user succeeds
- [x] `createListing` under an org the viewer doesn't manage rejects with `FORBIDDEN`
**Blocked by:** B1, A8

## C1 — Better Auth React client  ✅ faa15a3
**Acceptance criteria:**
- [x] `authClient` exposes `signIn.email`, `signIn.social`, `signOut`, `useSession`, `admin`
**Blocked by:** A5

## C2 — Sign-in / sign-up route  ✅ 9b41e52
**Acceptance criteria:**
- [x] `/sign-in` renders a Google button and email/password fields; submitting calls `authClient.signIn.email`
- [x] `redirect` search param preserved and navigated to on success
**Blocked by:** C1

## C3 — Account menu + real identity in shell  ✅ e9f09b8
**Acceptance criteria:**
- [x] Signed-in state shows display name + working sign-out
- [x] Anonymous state shows a sign-in link to `/sign-in`
- [x] `you` route reads the real viewer (not the mock user)
**Blocked by:** C1, A8

## C4 — Gate anonymous actions through sign-in  ✅ b1866c6
**Acceptance criteria:**
- [x] Clicking Save/Inquiry while anonymous navigates to `/sign-in?redirect=…` instead of firing the mutation
- [x] Signed-in users fire the mutation as before
**Blocked by:** A8, C2

## D1 — Admin user-management server functions  ✅ 7f73278
**Acceptance criteria:**
- [x] A moderator calling `setUserRole` is rejected `FORBIDDEN`
- [x] An admin can promote a user to moderator
- [x] Demoting the last admin throws `CONFLICT`
- [x] `listUsers` / `banUser` / `unbanUser` present and admin-guarded
**Blocked by:** B1, A8

## D2 — Verify / unverify organization  ✅ b9f6c8e
**Acceptance criteria:**
- [x] An admin sets `is_verified=true` + `verified_at`
- [x] A moderator is rejected `FORBIDDEN`
**Blocked by:** B1, A8

## D3 — `/admin/users` guarded screen  ✅ 2f7d65c
**Acceptance criteria:**
- [x] `beforeLoad` redirects a non-admin (moderator, user, anonymous) away
- [x] An admin sees the user list and can trigger set-role
**Blocked by:** D1, D2
