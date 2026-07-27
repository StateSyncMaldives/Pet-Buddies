# Remaining tracker issues — User Management & RBAC (Better Auth)

Draft issues for the remaining plan tasks (A4–D3). **Not yet published** — `gh` needs
re-auth (`gh auth login`) and network to api.github.com. Once authenticated, publish
in dependency order with the `ready-for-agent` triage label, then close each as its
SDD task lands (record the commit range).

Status legend: ☐ not started · ▶ in progress · ✅ done (commit range) · 🔎 in review

Slice A tasks A1–A3 are already complete (0d346bb..fcf1658). Acceptance criteria below
are the behavioral tests each task must pass (from the plan); implementation detail
lives in `docs/superpowers/plans/2026-07-27-user-management-rbac-better-auth.md`.

---

## A4 — Per-request Better Auth instance (`createAuth`)  ☐
**What:** A factory that builds the Better Auth instance from an injected D1/Drizzle db + secrets (Google + email/password + admin plugin), plus a `createTestDatabase` helper that applies migrations to a miniflare D1.
**Acceptance criteria:**
- [ ] `createAuth({database, secrets})` returns an instance where `auth.handler` and `auth.api.getSession` are functions
- [ ] Google social + email/password providers enabled; admin plugin wired with the A2 `ac`/`roles`
- [ ] `user.fields` maps `name→displayName`, `image→avatarUrl`; verified-email account linking for Google enabled
- [ ] `tests/helpers/test-database.ts` builds a migrated D1 test database
**Blocked by:** A3 (done)

## A5 — Mount `/api/auth/$` server route  ☐
**What:** A TanStack Start server route forwarding all `/api/auth/*` GET/POST to `auth.handler`.
**Acceptance criteria:**
- [ ] `POST /api/auth/sign-up/email` returns status < 400 and issues a Better Auth session cookie (`set-cookie` contains `better-auth`)
- [ ] Route forwards both GET and POST to a per-request auth instance
**Blocked by:** A4

## A7 — Seed bootstrap admin + test session helpers  ☐  *(runs before A6)*
**What:** Seed the bootstrap administrator + moderator through the Better Auth API (real credential accounts) and promote roles; add `signUpAndGetCookie` and `createTestSession(role)` test helpers.
**Acceptance criteria:**
- [ ] `seedAuth` creates exactly one admin user with a `credential` account and `role='admin'`
- [ ] `seedAuth` is idempotent (second run does not duplicate)
- [ ] `createTestSession(role)` returns a valid session cookie for user/moderator/admin
- [ ] Existing demo seed users are RETAINED (removed later in A8) so the suite stays green
**Blocked by:** A4

## A6 — `resolveViewer()` identity seam  ☐
**What:** Resolve the `Viewer` (anonymous | signed-in user with role + banned) from a session cookie.
**Acceptance criteria:**
- [ ] Returns `{kind:'anonymous'}` with no cookie
- [ ] Returns the signed-in user (id, email, displayName, role, banned) for a valid session
- [ ] `canWrite` is false for a banned (unexpired) user
- [ ] **Gate for the d1-schema date-column watch-item:** the "valid session resolves a user" case passing confirms Better Auth round-trips `session.expires_at` correctly through the `text` column
**Blocked by:** A4, A7

## A8 — Replace the demo seam everywhere  ☐
**What:** Swap `demo-session`/`demo-identity` for `resolveRequestViewer()` across all server functions, the mutation adapter, and router context; delete the demo modules.
**Acceptance criteria:**
- [ ] `resolveRequestViewer()` returns anonymous when the request has no session cookie
- [ ] app-shell, saved, profile, inquiry, moderation server fns + `durable-mutation-adapter` resolve the real viewer (anonymous reads return empty; writes require a viewer)
- [ ] Router context carries `viewer: Viewer`; `__root` beforeLoad populates it
- [ ] `demo-session.ts`/`demo-identity.ts` deleted; `app-session.test.ts` migrated; full suite green
**Blocked by:** A6, A7

## A9 — ADR 0010 + domain vocabulary  ☐
**What:** Record the architecture decision and update domain docs.
**Acceptance criteria:**
- [ ] `docs/adr/0010-*.md` records Approach A + admin-plugin + custom orgs + deferred email/impersonation
- [ ] `CONTEXT.md` gains Session, Account, Global permission, Ban, Bootstrap administrator; `google_sub` marked legacy; Global role now in `users.role`
- [ ] `docs/architecture/data-model.md` `global_role` → `role` (carried over from A3 doc-drift)
**Blocked by:** A3 (author after A8)

## B1 — Authorization guard helpers  ☐
**What:** `requireViewer` / `requireGlobalRole` / `requireGlobalPermission` / `requireOrgRole` + `AuthzError{code}`.
**Acceptance criteria:**
- [ ] `requireViewer` throws `UNAUTHORIZED` for anonymous, `FORBIDDEN` for banned
- [ ] `requireGlobalPermission` allows moderator `listing:moderate`, denies plain user; `requireGlobalRole` enforces the ordering
- [ ] `requireOrgRole` reads `organization_members` and denies non-members / insufficient org role
**Blocked by:** A2, A6

## B2 — Enforce moderation authorization  ☐
**What:** Guard the moderation server functions; add a `run-server-fn` test harness that invokes a server fn under a given session.
**Acceptance criteria:**
- [ ] `fetchReviewQueue` / `updateListingLifecycle` reject a plain user with `FORBIDDEN`
- [ ] A moderator is allowed
**Blocked by:** B1, A8

## B3 — Enforce write authorization  ☐
**What:** Require a signed-in viewer for saved/inquiry/create-listing; require `listing_manager` for org-owned listings.
**Acceptance criteria:**
- [ ] Anonymous `toggleSavedListing` / `createInquiry` reject with `UNAUTHORIZED`
- [ ] Signed-in user succeeds
- [ ] `createListing` under an org the viewer doesn't manage rejects with `FORBIDDEN`
**Blocked by:** B1, A8

## C1 — Better Auth React client  ☐
**Acceptance criteria:**
- [ ] `authClient` exposes `signIn.email`, `signIn.social`, `signOut`, `useSession`, `admin`
**Blocked by:** A5

## C2 — Sign-in / sign-up route  ☐
**Acceptance criteria:**
- [ ] `/sign-in` renders a Google button and email/password fields; submitting calls `authClient.signIn.email`
- [ ] `redirect` search param preserved and navigated to on success
**Blocked by:** C1

## C3 — Account menu + real identity in shell  ☐
**Acceptance criteria:**
- [ ] Signed-in state shows display name + working sign-out
- [ ] Anonymous state shows a sign-in link to `/sign-in`
- [ ] `you` route reads the real viewer (not the mock user)
**Blocked by:** C1, A8

## C4 — Gate anonymous actions through sign-in  ☐
**Acceptance criteria:**
- [ ] Clicking Save/Inquiry while anonymous navigates to `/sign-in?redirect=…` instead of firing the mutation
- [ ] Signed-in users fire the mutation as before
**Blocked by:** A8, C2

## D1 — Admin user-management server functions  ☐
**Acceptance criteria:**
- [ ] A moderator calling `setUserRole` is rejected `FORBIDDEN`
- [ ] An admin can promote a user to moderator
- [ ] Demoting the last admin throws `CONFLICT`
- [ ] `listUsers` / `banUser` / `unbanUser` present and admin-guarded
**Blocked by:** B1, A8

## D2 — Verify / unverify organization  ☐
**Acceptance criteria:**
- [ ] An admin sets `is_verified=true` + `verified_at`
- [ ] A moderator is rejected `FORBIDDEN`
**Blocked by:** B1, A8

## D3 — `/admin/users` guarded screen  ☐
**Acceptance criteria:**
- [ ] `beforeLoad` redirects a non-admin (moderator, user, anonymous) away
- [ ] An admin sees the user list and can trigger set-role
**Blocked by:** D1, D2
