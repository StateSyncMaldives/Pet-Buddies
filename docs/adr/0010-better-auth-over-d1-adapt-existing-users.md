# 10. Better Auth over D1, adapting the existing `users` table

Date: 2026-07-28

Status: Accepted. Supersedes the demo-identity seam of [ADR 0008](0008-durable-persistence-async-backend.md) (§5) and the store's "resolved Viewer identity" role in [ADR 0009](0009-tanstack-query-single-client-cache.md) (§5).

## Context

Until now Pet Buddies had no authentication. `demo-session.ts` / `demo-identity.ts` synthesized a fixed Viewer and moderator id at module scope, and every server function resolved the same two seeded users. That was enough to build the durable write paths (ADR 0008) but it meant three things were untrue in production: anyone could save, inquire, list and moderate; every write was attributed to the same identity; and the moderator role existed only as a hard-coded id.

The app needs real sign-in (Google plus email/password), real per-request identity, and role-based access control that distinguishes a plain user from a moderator from an administrator — on Cloudflare Workers and D1, without introducing a second datastore.

The existing schema already had a `users` table carrying `google_sub`, `email`, `display_name` and `global_role`, referenced by foreign key from listings, saved listings, adoption inquiries and moderation events. Any auth solution had to keep those references intact.

## Decision

1. **Better Auth over D1 through the Drizzle adapter**, running inside the existing Worker and mounted at `/api/auth/$`. Providers are Google OAuth and email/password, with `requireEmailVerification: false` — there is no transactional email yet, so demanding verification would lock people out.

2. **Approach A: adapt the existing `users` table rather than adding a parallel one.** Better Auth's `user` model is mapped onto `users` (`name → display_name`, `image → avatar_url`), `global_role` is renamed to `role`, and the `session` / `account` / `verification` tables are added alongside. Every existing foreign key keeps pointing at the same table. `google_sub` stays as a nullable legacy column; provider identity now lives in `account`.

3. **Global roles come from Better Auth's admin plugin with a custom access-control policy.** `src/server/auth/access-control.ts` declares the statements (`listing:moderate`, `user:setRole`, `user:ban`, `org:verify`) and the three roles that carry them. Authorization checks ask the policy for a permission, not for a role name, so adding a role does not mean auditing every call site.

4. **Organization membership stays in the app's own `organization_members` table.** Better Auth's organization plugin models something different from what Pet Buddies means by an organization (a rescue or NGO that owns listings, with a verification state adopters can see), and adopting it would have meant migrating the existing table for no gain.

5. **The Better Auth instance is built per request, never at module scope** — the same rule the backend and the Drizzle handle follow (ADR 0003 / 0008), because Worker bindings are per-request.

6. **`resolveViewer()` is the single identity seam.** It turns a session cookie into a `Viewer` (anonymous, or a signed-in user with a global role and banned flag). Server functions, the mutation adapter and the router context all consume `Viewer`; nothing outside `src/server/auth/` talks to Better Auth directly. `demo-session.ts` and `demo-identity.ts` are deleted.

7. **Authorization is enforced server-side, always.** Guard helpers (`requireViewer`, `requireGlobalRole`, `requireGlobalPermission`, `requireOrgRole`) run inside server-function handlers. Route `beforeLoad` guards and client-side role checks exist only to keep the UI honest; they are never what protects the data.

8. **A bootstrap administrator is seeded** through the Better Auth API (so the password is hashed and the `credential` account row is correct), then promoted directly. This resolves the chicken-and-egg problem that granting the admin role itself requires an admin.

9. **Email verification, password reset and admin impersonation are deferred.** The `session.impersonated_by` column is provisioned so impersonation can be enabled later without a schema change.

## Considered options

- **A separate `auth_users` table joined to `users` (Approach B) — rejected.** It leaves two identity tables to keep in sync and every existing foreign key pointing at the non-authoritative one.
- **Hand-rolled sessions (signed cookie + a `sessions` table) — rejected.** Google OAuth, account linking, password hashing and session rotation are exactly the things worth not writing by hand, and getting any of them subtly wrong is a security bug rather than a defect.
- **An external identity provider (Auth0, Clerk, WorkOS) — rejected.** It adds a network hop and a vendor to every request on a Workers runtime whose value is being close to the data, for a Maldives-scale app with modest identity needs.
- **Better Auth's organization plugin instead of `organization_members` — rejected**, see §4.
- **Checking role names at call sites instead of permissions — rejected.** It scatters the policy across the codebase, so adding a role means finding every comparison.

## Consequences

- Saving, inquiring, listing and moderating now require sign-in; anonymous visitors can still browse, search, view detail and report, which stays deliberately account-free.
- Viewer-scoped reads answer empty for an anonymous caller rather than erroring — they are reads, and the signed-out shell is a legitimate state.
- Writes are attributed to the session viewer, so a client-supplied actor id can no longer decide who created or moderated something.
- Two invariants live in the server functions rather than the UI: the last administrator cannot be demoted, and an administrator cannot ban themselves.
- Existing tests that leaned on `DEMO_VIEWER_USER` now use explicit fixtures (`tests/helpers/seed-users.ts`) or real minted sessions (`tests/helpers/run-server-fn.ts`).
- Server functions can only execute inside the Start server runtime, and the vitest config deliberately does not load the Start vite plugin. Each guarded server function is therefore a thin wrapper over an exported handler taking `{ viewer, backend }`, and the tests drive those handlers with a real session cookie resolved through `resolveViewer` — covering cookie → session → viewer → guard → backend, with only the framework transport untested.
- `better-auth` is a new dependency, and four new secrets/vars (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) must be provisioned per environment.
- The bootstrap administrator ships with a placeholder password that must be rotated immediately after the first deploy.
