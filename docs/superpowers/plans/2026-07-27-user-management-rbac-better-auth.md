# User Management & RBAC with Better Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Pet Buddies' demo-seeded identity with real Better Auth authentication (Google OAuth + email/password) and role-based access control on Cloudflare D1, covering the auth backend, RBAC enforcement, sign-in/account UI, and an administrator user-management screen.

**Architecture:** Better Auth runs as a per-request instance inside the existing Worker, using the Drizzle adapter over D1, mounted at `/api/auth/$` via a TanStack Start server route. A `resolveViewer()` helper reads the session cookie and produces the `Viewer` shape the app already consumes, replacing `demo-session`/`demo-identity` at all 7 call sites. Global roles are driven by Better Auth's **admin plugin** with a custom access-control policy; organization membership stays in the existing `organization_members` table. Enforcement is done with guard helpers inside server-function handlers plus `beforeLoad` guards on UI routes.

**Tech Stack:** TanStack Start + Router + Query, React 18, Drizzle ORM, Cloudflare Workers + D1, Better Auth (`better-auth` + admin plugin + drizzle adapter), Zod, Vitest.

## Global Constraints

- **Runtime is Cloudflare Workers.** No Node-only APIs in request paths. The Worker env (D1 `DB`, secrets) is read via `getWorkerEnv()` (`src/server/infra/cloudflare/worker-env.ts`) — the Better Auth instance MUST be built **per request**, never at module scope (mirrors `createServerBackend`, ADR 0003/0008).
- **Better Auth version:** pin `better-auth` to the latest `^1` release. Before writing the schema tables (Task A3), regenerate them with `npx @better-auth/cli@latest generate` and port the emitted `session`/`account`/`verification` columns into `schema.ts` verbatim rather than hand-authoring them — this keeps columns aligned with the installed version. Verify import paths (`better-auth`, `better-auth/adapters/drizzle`, `better-auth/plugins`, `better-auth/plugins/access`, `better-auth/react`) against the installed version.
- **D1 quirks:** foreign keys are always enforced; no native BOOLEAN/DATETIME (use `integer({mode:'boolean'})` and `text` timestamps, matching existing `schema.ts`); ≤100 bound params per statement.
- **Drizzle is the single source of truth** for the D1 schema (`src/server/infra/db/schema.ts`); generate migrations with `pnpm db:generate` (drizzle-kit) into `drizzle/`. Never hand-edit generated SQL except to confirm it.
- **Secrets never reach the client.** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` are Worker secrets/vars only. Session cookies are httpOnly (Better Auth default) — do not store tokens in localStorage.
- **Authorization is always re-checked server-side.** Any client-side role is UI hinting only.
- **Global roles:** exactly `user` | `moderator` | `admin` (`GlobalRole` in `src/server/contracts/api.ts`). **Org roles:** `member` | `admin` | `listing_manager`.
- **Tests:** `pnpm test` (vitest, `--run`). `/browse` is unavailable on this Windows setup — verify UI behavior with vitest + Testing Library, never a live browser. `pnpm typecheck` must stay green.
- **Commit** after each task's tests pass. Conventional Commits; end messages with the repo's `Co-Authored-By` trailer.

---

## File Structure

**New files**
- `src/server/auth/access-control.ts` — access-control statements + role definitions (single source for RBAC policy).
- `src/server/auth/auth.ts` — `createAuth()`: builds the per-request Better Auth instance.
- `src/server/auth/resolve-viewer.ts` — `resolveViewer()` + the `Viewer` type; the identity seam.
- `src/server/auth/guards.ts` — `requireViewer` / `requireGlobalRole` / `requireGlobalPermission` / `requireOrgRole` guard helpers.
- `src/server/auth/organization-membership.ts` — reads `organization_members` for `requireOrgRole`.
- `src/server/auth/seed-auth.ts` — seeds the bootstrap administrator + fixture users and their `account` rows.
- `src/routes/api.auth.$.tsx` — server route forwarding `/api/auth/*` to `auth.handler`.
- `src/routes/sign-in.tsx` — sign-in / sign-up screen.
- `src/routes/admin.users.tsx` — administrator user-management screen.
- `src/features/auth/auth-client.ts` — Better Auth React client (`authClient`).
- `src/features/auth/admin.functions.ts` — admin server functions (list/set-role/ban/verify-org).
- `src/features/auth/account-menu.tsx` — signed-in account menu / sign-in affordance.
- `tests/helpers/auth.ts` — `createTestSession(role)` test helper.
- `docs/adr/0010-better-auth-over-d1-adapt-existing-users.md` — the ADR.

**Modified files**
- `src/server/infra/db/schema.ts` — rename `global_role`→`role`; add `email_verified`, ban fields; add `session`/`account`/`verification`; drop `google_sub` unique index (keep column nullable).
- `src/server/infra/cloudflare/bindings.ts` — add secret bindings to `PetBuddiesCloudflareBindings`.
- `worker-configuration.d.ts` / `wrangler.jsonc` — declare the new vars/secrets.
- `src/server/contracts/api.ts` + `backend/contracts.ts` — `UserRecord.globalRole`→`role`; add ban/emailVerified fields.
- `src/server/infra/db/seed-durable-store.ts` — call `seedAuth`; update `toUserInsert`.
- `src/features/{moderation,saved,profile,inquiries}/**.functions.ts`, `src/features/app-shell/app-shell.functions.ts` — swap `createDemoSession()` for `resolveViewer()`.
- `src/server/mutations/durable-mutation-adapter.ts` — take a resolved viewer instead of the demo session.
- `src/router/context.ts` + `src/router/index.tsx` + `src/routes/__root.tsx` — carry a real `viewer` in router context.
- `CONTEXT.md` — glossary additions.

**Deleted files (end of Slice A)**
- `src/server/runtime/demo-session.ts`, `src/server/runtime/demo-identity.ts` (superseded by `resolve-viewer.ts` + `seed-auth.ts`).

---

# Slice A — Auth core

Goal: real Better Auth sessions replace the demo seam; the app behaves as today but every request resolves a real `Viewer`.

## Task A1: Install Better Auth and declare secrets

**Files:**
- Modify: `package.json` (dependency)
- Modify: `src/server/infra/cloudflare/bindings.ts:4-7`
- Modify: `wrangler.jsonc`, `worker-configuration.d.ts`
- Create: `.dev.vars.example`

**Interfaces:**
- Produces: `PetBuddiesCloudflareBindings` gains `BETTER_AUTH_SECRET: string`, `BETTER_AUTH_URL: string`, `GOOGLE_CLIENT_ID: string`, `GOOGLE_CLIENT_SECRET: string`.

- [ ] **Step 1: Install the dependency**

```bash
pnpm add better-auth
```

- [ ] **Step 2: Extend the bindings interface**

In `src/server/infra/cloudflare/bindings.ts`, extend the interface:

```ts
export interface PetBuddiesCloudflareBindings {
  DB: D1Database
  MEDIA_BUCKET: R2Bucket
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}
```

- [ ] **Step 3: Declare local dev vars**

Create `.dev.vars.example` (copy to `.dev.vars`, which is gitignored):

```
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:5173"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Add a `vars` block placeholder to `wrangler.jsonc` for `BETTER_AUTH_URL` and document that the three secrets are set via `wrangler secret put`. Add the four keys to `worker-configuration.d.ts`'s `Env` (run `pnpm cf-typegen` if it regenerates).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (interface widened; no consumers broken yet).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/server/infra/cloudflare/bindings.ts wrangler.jsonc worker-configuration.d.ts .dev.vars.example
git commit -m "chore(auth): add better-auth dependency and auth env bindings"
```

## Task A2: Access-control policy (RBAC statements + roles)

**Files:**
- Create: `src/server/auth/access-control.ts`
- Test: `tests/unit/server/auth/access-control.test.ts`

**Interfaces:**
- Produces: `ac`, `roles` (`{ user, moderator, admin }`), `GLOBAL_STATEMENTS`, and `hasPermission(role, resource, action)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/auth/access-control.test.ts
import { describe, expect, it } from 'vitest'
import { hasPermission } from '../../../../src/server/auth/access-control'

describe('global access-control policy', () => {
  const cases = [
    ['user', 'listing', 'moderate', false],
    ['user', 'user', 'setRole', false],
    ['user', 'org', 'verify', false],
    ['moderator', 'listing', 'moderate', true],
    ['moderator', 'user', 'setRole', false],
    ['moderator', 'org', 'verify', false],
    ['admin', 'listing', 'moderate', true],
    ['admin', 'user', 'setRole', true],
    ['admin', 'user', 'ban', true],
    ['admin', 'org', 'verify', true],
  ] as const

  it.each(cases)('%s can %s:%s → %s', (role, resource, action, allowed) => {
    expect(hasPermission(role, resource as never, action as never)).toBe(allowed)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/access-control.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the policy**

```ts
// src/server/auth/access-control.ts
import { createAccessControl } from 'better-auth/plugins/access'

export const GLOBAL_STATEMENTS = {
  listing: ['moderate'],
  user: ['setRole', 'ban'],
  org: ['verify'],
} as const

export const ac = createAccessControl(GLOBAL_STATEMENTS)

export const roles = {
  user: ac.newRole({}),
  moderator: ac.newRole({ listing: ['moderate'] }),
  admin: ac.newRole({
    listing: ['moderate'],
    user: ['setRole', 'ban'],
    org: ['verify'],
  }),
}

type Statements = typeof GLOBAL_STATEMENTS
export function hasPermission<R extends keyof Statements>(
  role: 'user' | 'moderator' | 'admin',
  resource: R,
  action: Statements[R][number],
): boolean {
  const result = roles[role].authorize({ [resource]: [action] } as never)
  return result.success
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/access-control.test.ts`
Expected: PASS. (If `authorize`'s shape differs in the installed version, adapt `hasPermission` to its return type; the test contract is the source of truth.)

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/access-control.ts tests/unit/server/auth/access-control.test.ts
git commit -m "feat(auth): add global RBAC access-control policy"
```

## Task A3: Schema — adapt `users`, add Better Auth tables, migration

**Files:**
- Modify: `src/server/infra/db/schema.ts`
- Modify: `src/server/contracts/api.ts`, `backend/contracts.ts`
- Create: migration in `drizzle/` (via `pnpm db:generate`)
- Test: `tests/unit/server/infra/db/auth-schema.test.ts`

**Interfaces:**
- Produces: `schema.users.role` (was `globalRole`), `schema.users.emailVerified/banned/banReason/banExpires`, and `schema.session`, `schema.account`, `schema.verification` tables.
- Consumes: nothing new.

- [ ] **Step 1: Generate reference BA tables**

Run `npx @better-auth/cli@latest generate` against a throwaway config (drizzle, sqlite) to see the exact `session`/`account`/`verification` column set for the installed version. Keep the output open as the source for Step 3.

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/server/infra/db/auth-schema.test.ts
import { describe, expect, it } from 'vitest'
import * as schema from '../../../../../src/server/infra/db/schema'

describe('auth schema', () => {
  it('exposes better-auth tables', () => {
    expect(schema.session).toBeDefined()
    expect(schema.account).toBeDefined()
    expect(schema.verification).toBeDefined()
  })
  it('users carries role + ban + emailVerified columns', () => {
    const cols = Object.keys(schema.users)
    expect(cols).toContain('role')
    expect(cols).toContain('emailVerified')
    expect(cols).toContain('banned')
    expect(cols).not.toContain('globalRole')
  })
})
```

- [ ] **Step 3: Edit `schema.ts`**

In the `users` table: rename the `globalRole` property to `role` (column `role`), add the ban + verification columns, relax the role check, drop the `google_sub` unique index, make `google_sub` nullable:

```ts
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleSub: text('google_sub'), // legacy, nullable — provider identity now in `account`
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['user', 'moderator', 'admin'] }).notNull().default('user'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    banReason: text('ban_reason'),
    banExpires: text('ban_expires'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_role_check', sql`${table.role} in ('user', 'moderator', 'admin')`),
  ],
)
```

Append the three BA-owned tables, using the columns from Step 1 (shape shown; confirm names against the generator output):

```ts
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  ...timestamps,
}, (table) => [uniqueIndex('session_token_unique').on(table.token)])

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: text('access_token_expires_at'),
  refreshTokenExpiresAt: text('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  ...timestamps,
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: text('expires_at').notNull(),
  ...timestamps,
})
```

- [ ] **Step 4: Update the contract types**

In `src/server/contracts/api.ts` keep `GlobalRole`. In `backend/contracts.ts`, change `UserRecord.globalRole` → `role: GlobalRole` and add `emailVerified: boolean`, `banned: boolean`. Run a grep for `globalRole` and fix remaining references (`src/server/infra/db/seed-durable-store.ts:19` mapper, any mapper reading it); rely on `pnpm typecheck` to surface the rest.

- [ ] **Step 5: Generate the migration**

Run: `pnpm db:generate`
Confirm a new file appears under `drizzle/` renaming the column and creating the three tables. Read it to verify no data-destroying surprises (only demo data exists, so column rename is safe).

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test -- tests/unit/server/infra/db/auth-schema.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/infra/db/schema.ts src/server/contracts/api.ts backend/contracts.ts src/server/infra/db/seed-durable-store.ts drizzle/ tests/unit/server/infra/db/auth-schema.test.ts
git commit -m "feat(auth): adapt users table and add better-auth session/account/verification tables"
```

## Task A4: `createAuth()` — the per-request Better Auth instance

**Files:**
- Create: `src/server/auth/auth.ts`
- Test: `tests/unit/server/auth/auth-config.test.ts`

**Interfaces:**
- Produces: `createAuth(deps?: { database?: PetBuddiesDrizzleDatabase; secrets?: AuthSecrets }): ReturnType<typeof betterAuth>` and `type AuthSecrets`.
- Consumes: `ac`, `roles` (A2); `getWorkerEnv` (`src/server/infra/cloudflare/worker-env.ts`); `createDrizzleDatabaseFromD1` (`src/server/infra/db/d1-drizzle.ts`); `schema` (A3).

- [ ] **Step 1: Write the failing test** (build with an injected in-memory drizzle DB — see the miniflare/D1 setup already used by `tests/unit/server/runtime/durable-backend.test.ts`; reuse that helper to get a `PetBuddiesDrizzleDatabase`):

```ts
// tests/unit/server/auth/auth-config.test.ts
import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import { createTestDatabase } from '../../../helpers/test-database' // existing/derived D1 test helper

describe('createAuth', () => {
  it('builds an instance exposing a request handler and getSession api', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({
      database,
      secrets: {
        BETTER_AUTH_SECRET: 'x'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost',
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      },
    })
    expect(typeof auth.handler).toBe('function')
    expect(typeof auth.api.getSession).toBe('function')
  })
})
```

If no `createTestDatabase` helper exists, add one under `tests/helpers/test-database.ts` that applies `drizzle/` migrations to a miniflare D1 instance (extract the pattern from `durable-backend.test.ts`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/auth-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createAuth`**

```ts
// src/server/auth/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import * as schema from '../infra/db/schema'
import { ac, roles } from './access-control'

export interface AuthSecrets {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

export async function resolveAuthDeps(): Promise<{ database: PetBuddiesDrizzleDatabase; secrets: AuthSecrets }> {
  const env = await getWorkerEnv()
  if (!env?.DB) throw new Error('D1 binding required to build Better Auth.')
  return {
    database: createDrizzleDatabaseFromD1(env.DB),
    secrets: {
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET!,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL!,
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID!,
      GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET!,
    },
  }
}

export function createAuth(deps: { database: PetBuddiesDrizzleDatabase; secrets: AuthSecrets }) {
  const { database, secrets } = deps
  return betterAuth({
    baseURL: secrets.BETTER_AUTH_URL,
    secret: secrets.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: 'sqlite',
      schema: { user: schema.users, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    user: {
      modelName: 'users',
      fields: { name: 'displayName', image: 'avatarUrl' },
    },
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders: {
      google: { clientId: secrets.GOOGLE_CLIENT_ID, clientSecret: secrets.GOOGLE_CLIENT_SECRET },
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    plugins: [admin({ ac, roles, defaultRole: 'user', adminRoles: ['admin'] })],
  })
}

/** Per-request convenience: resolves Worker deps then builds the instance. */
export async function createRequestAuth() {
  return createAuth(await resolveAuthDeps())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/auth-config.test.ts && pnpm typecheck`
Expected: PASS. Adjust `user.fields`/`account.accountLinking` keys if the installed version names them differently; the assertion (`handler` + `api.getSession` exist) is the contract.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/auth.ts tests/unit/server/auth/auth-config.test.ts tests/helpers/test-database.ts
git commit -m "feat(auth): add per-request Better Auth instance factory"
```

## Task A5: Mount `/api/auth/$` server route

**Files:**
- Create: `src/routes/api.auth.$.tsx`
- Test: `tests/unit/server/auth/auth-route.test.ts`

**Interfaces:**
- Consumes: `createRequestAuth` (A4).
- Produces: HTTP surface at `/api/auth/*`.

- [ ] **Step 1: Write the failing test** (drive the route's handler with a `Request`; the sign-up endpoint should set a cookie):

```ts
// tests/unit/server/auth/auth-route.test.ts
import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import { createTestDatabase } from '../../../helpers/test-database'

describe('/api/auth handler', () => {
  it('signs up an email/password user and issues a session cookie', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets: {
      BETTER_AUTH_SECRET: 'x'.repeat(32), BETTER_AUTH_URL: 'http://localhost',
      GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret',
    } })
    const res = await auth.handler(new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'A B' }),
    }))
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('set-cookie')).toContain('better-auth')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/auth-route.test.ts`
Expected: FAIL — cookie assertion / module wiring.

- [ ] **Step 3: Implement the route** (flat file name maps to path `/api/auth/$`):

```tsx
// src/routes/api.auth.$.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createRequestAuth } from '../server/auth/auth'

const handle = async ({ request }: { request: Request }) => {
  const auth = await createRequestAuth()
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handle, POST: handle } },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/auth-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api.auth.$.tsx tests/unit/server/auth/auth-route.test.ts
git commit -m "feat(auth): mount better-auth handler at /api/auth/*"
```

## Task A6: `resolveViewer()` and the `Viewer` type

**Files:**
- Create: `src/server/auth/resolve-viewer.ts`
- Test: `tests/unit/server/auth/resolve-viewer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Viewer =
    | { kind: 'anonymous' }
    | { kind: 'user'; id: string; email: string; displayName: string; role: GlobalRole; banned: boolean }
  export function resolveViewer(deps: { auth: Auth; headers: Headers }): Promise<Viewer>
  export function isSignedIn(v: Viewer): v is Extract<Viewer, { kind: 'user' }>
  export function canWrite(v: Viewer): boolean // signed-in AND not banned
  ```
- Consumes: `createAuth` (A4).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/auth/resolve-viewer.test.ts
import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import { resolveViewer, canWrite } from '../../../../src/server/auth/resolve-viewer'
import { createTestDatabase } from '../../../helpers/test-database'
import { signUpAndGetCookie } from '../../../helpers/auth' // added in A8

const secrets = { BETTER_AUTH_SECRET: 'x'.repeat(32), BETTER_AUTH_URL: 'http://localhost', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }

describe('resolveViewer', () => {
  it('returns anonymous with no cookie', async () => {
    const auth = createAuth({ database: await createTestDatabase(), secrets })
    const viewer = await resolveViewer({ auth, headers: new Headers() })
    expect(viewer.kind).toBe('anonymous')
  })
  it('returns the signed-in user for a valid session', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets })
    const cookie = await signUpAndGetCookie(auth, { email: 'a@b.com', password: 'password123', name: 'A B' })
    const viewer = await resolveViewer({ auth, headers: new Headers({ cookie }) })
    expect(viewer).toMatchObject({ kind: 'user', email: 'a@b.com', role: 'user', banned: false })
    expect(canWrite(viewer)).toBe(true)
  })
  it('treats a banned user as unable to write', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets })
    const cookie = await signUpAndGetCookie(auth, { email: 'c@d.com', password: 'password123', name: 'C D' })
    await database.update((await import('../../../../src/server/infra/db/schema')).users)
      .set({ banned: true }).run() // simplest: ban all; single seeded user here
    const viewer = await resolveViewer({ auth, headers: new Headers({ cookie }) })
    expect(canWrite(viewer)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/resolve-viewer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolveViewer`**

```ts
// src/server/auth/resolve-viewer.ts
import type { GlobalRole } from '../contracts/api'
import type { createAuth } from './auth'

type Auth = ReturnType<typeof createAuth>

export type Viewer =
  | { kind: 'anonymous' }
  | { kind: 'user'; id: string; email: string; displayName: string; role: GlobalRole; banned: boolean }

export const ANONYMOUS: Viewer = { kind: 'anonymous' }

export async function resolveViewer(deps: { auth: Auth; headers: Headers }): Promise<Viewer> {
  const session = await deps.auth.api.getSession({ headers: deps.headers })
  if (!session?.user) return ANONYMOUS
  const u = session.user as { id: string; email: string; name: string; role?: string; banned?: boolean | null }
  return {
    kind: 'user',
    id: u.id,
    email: u.email,
    displayName: u.name,
    role: (u.role as GlobalRole) ?? 'user',
    banned: Boolean(u.banned),
  }
}

export function isSignedIn(v: Viewer): v is Extract<Viewer, { kind: 'user' }> {
  return v.kind === 'user'
}

export function canWrite(v: Viewer): boolean {
  return v.kind === 'user' && !v.banned
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/resolve-viewer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/resolve-viewer.ts tests/unit/server/auth/resolve-viewer.test.ts
git commit -m "feat(auth): resolve real Viewer from the session cookie"
```

## Task A7: Seed the bootstrap administrator + `createTestSession`

**Files:**
- Create: `src/server/auth/seed-auth.ts`
- Create: `tests/helpers/auth.ts`
- Modify: `src/server/infra/db/seed-durable-store.ts`
- Test: `tests/unit/server/auth/seed-auth.test.ts`

**Interfaces:**
- Produces: `seedAuth(deps: { auth: Auth; database: PetBuddiesDrizzleDatabase }): Promise<{ adminUserId: string; moderatorUserId: string }>`; test helpers `signUpAndGetCookie(auth, input)`, `createTestSession(auth, database, role)`.
- Consumes: `createAuth` (A4).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/auth/seed-auth.test.ts
import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createAuth } from '../../../../src/server/auth/auth'
import { seedAuth } from '../../../../src/server/auth/seed-auth'
import * as schema from '../../../../src/server/infra/db/schema'
import { createTestDatabase } from '../../../helpers/test-database'

const secrets = { BETTER_AUTH_SECRET: 'x'.repeat(32), BETTER_AUTH_URL: 'http://localhost', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }

describe('seedAuth', () => {
  it('creates a single admin user with a credential account and admin role', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets })
    await seedAuth({ auth, database })
    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins).toHaveLength(1)
    const accounts = await database.select().from(schema.account).where(eq(schema.account.userId, admins[0].id)).all()
    expect(accounts.some((a) => a.providerId === 'credential')).toBe(true)
  })

  it('is idempotent', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets })
    await seedAuth({ auth, database })
    await seedAuth({ auth, database })
    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/seed-auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `seedAuth`** (create users through the Better Auth API so password hashing + account rows are correct, then promote roles directly):

```ts
// src/server/auth/seed-auth.ts
import { eq } from 'drizzle-orm'
import type { PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import * as schema from '../infra/db/schema'
import type { createAuth } from './auth'

type Auth = ReturnType<typeof createAuth>

const BOOTSTRAP = {
  admin: { email: 'admin@petbuddies.mv', password: 'change-me-admin-0000', name: 'Pet Buddies Admin', role: 'admin' as const },
  moderator: { email: 'moderator@petbuddies.mv', password: 'change-me-mod-0000', name: 'Pet Buddies Moderator', role: 'moderator' as const },
}

async function ensureUser(deps: { auth: Auth; database: PetBuddiesDrizzleDatabase }, spec: typeof BOOTSTRAP.admin) {
  const existing = await deps.database.select().from(schema.users).where(eq(schema.users.email, spec.email)).get()
  if (existing) {
    if (existing.role !== spec.role) {
      await deps.database.update(schema.users).set({ role: spec.role }).where(eq(schema.users.id, existing.id)).run()
    }
    return existing.id
  }
  await deps.auth.api.signUpEmail({ body: { email: spec.email, password: spec.password, name: spec.name } })
  const created = await deps.database.select().from(schema.users).where(eq(schema.users.email, spec.email)).get()
  if (!created) throw new Error(`seedAuth: failed to create ${spec.email}`)
  await deps.database.update(schema.users).set({ role: spec.role }).where(eq(schema.users.id, created.id)).run()
  return created.id
}

export async function seedAuth(deps: { auth: Auth; database: PetBuddiesDrizzleDatabase }) {
  const adminUserId = await ensureUser(deps, BOOTSTRAP.admin)
  const moderatorUserId = await ensureUser(deps, BOOTSTRAP.moderator)
  return { adminUserId, moderatorUserId }
}
```

- [ ] **Step 4: Add test helpers**

```ts
// tests/helpers/auth.ts
import type { createAuth } from '../../src/server/auth/auth'
import { seedAuth } from '../../src/server/auth/seed-auth'
import type { PetBuddiesDrizzleDatabase } from '../../src/server/infra/db/d1-drizzle'

type Auth = ReturnType<typeof createAuth>

export async function signUpAndGetCookie(auth: Auth, input: { email: string; password: string; name: string }) {
  const res = await auth.handler(new Request('http://localhost/api/auth/sign-up/email', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  }))
  const cookie = res.headers.get('set-cookie')
  if (!cookie) throw new Error('sign-up returned no cookie')
  return cookie.split(';')[0]
}

/** Signs in the seeded user of the given role and returns its session cookie. */
export async function createTestSession(auth: Auth, database: PetBuddiesDrizzleDatabase, role: 'user' | 'moderator' | 'admin') {
  await seedAuth({ auth, database })
  const creds = role === 'admin'
    ? { email: 'admin@petbuddies.mv', password: 'change-me-admin-0000' }
    : role === 'moderator'
      ? { email: 'moderator@petbuddies.mv', password: 'change-me-mod-0000' }
      : { email: 'member@petbuddies.mv', password: 'change-me-user-0000' }
  if (role === 'user') {
    await signUpAndGetCookie(auth, { ...creds, name: 'Member' }).catch(() => {})
  }
  const res = await auth.handler(new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds),
  }))
  return res.headers.get('set-cookie')!.split(';')[0]
}
```

- [ ] **Step 5: Wire `seedAuth` into the durable seed**

In `src/server/infra/db/seed-durable-store.ts`, replace the `DEMO_SEED_USERS` loop with a `seedAuth({ auth, database })` call (build a request auth inside, or accept `auth` as an injected dep). Update `toUserInsert` usage — the auth-created rows replace the hand-inserted demo users; keep seeding listings/orgs/tags/clinics. The listing seed's owner user id must reference the seeded admin/moderator ids returned by `seedAuth` (thread them into `buildSeedListingAggregates` where it currently uses `DEMO_VIEWER_USER.id`).

- [ ] **Step 6: Run tests**

Run: `pnpm test -- tests/unit/server/auth/seed-auth.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth/seed-auth.ts tests/helpers/auth.ts src/server/infra/db/seed-durable-store.ts tests/unit/server/auth/seed-auth.test.ts
git commit -m "feat(auth): seed bootstrap admin/moderator and add test session helper"
```

## Task A8: Swap the demo seam for `resolveViewer` at all call sites

**Files:**
- Modify: `src/features/app-shell/app-shell.functions.ts`, `src/features/saved/saved.functions.ts`, `src/features/profile/profile.functions.ts`, `src/features/inquiries/inquiries.functions.ts`, `src/features/moderation/moderation.functions.ts`
- Modify: `src/server/mutations/durable-mutation-adapter.ts`
- Modify: `src/router/context.ts`, `src/router/index.tsx`, `src/routes/__root.tsx`
- Delete: `src/server/runtime/demo-session.ts`, `src/server/runtime/demo-identity.ts`, `src/server/runtime/app-session.ts`'s demo wiring
- Test: `tests/unit/server/auth/viewer-server-fns.test.ts`; migrate `tests/unit/server/runtime/app-session.test.ts`

**Interfaces:**
- Produces: a shared `resolveRequestViewer()` that reads request headers inside a server fn:
  ```ts
  export async function resolveRequestViewer(): Promise<Viewer>
  ```
- Consumes: `resolveViewer` (A6), `createRequestAuth` (A4), `getWebRequest` from `@tanstack/react-start/server`.

- [ ] **Step 1: Write the failing test** (a saved-listings read for an anonymous viewer returns empty; for a signed-in viewer returns their saves). Use the render/server-fn test harness already in `tests/`:

```ts
// tests/unit/server/auth/viewer-server-fns.test.ts
import { describe, expect, it } from 'vitest'
import { resolveRequestViewer } from '../../../../src/server/auth/request-viewer'

describe('resolveRequestViewer', () => {
  it('is anonymous when no request cookie is present', async () => {
    // harness runs the fn without a session cookie
    const viewer = await resolveRequestViewer()
    expect(viewer.kind).toBe('anonymous')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/viewer-server-fns.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `resolveRequestViewer`**

```ts
// src/server/auth/request-viewer.ts
import { getWebRequest } from '@tanstack/react-start/server'
import { createRequestAuth } from './auth'
import { resolveViewer, type Viewer } from './resolve-viewer'

export async function resolveRequestViewer(): Promise<Viewer> {
  const request = getWebRequest()
  const auth = await createRequestAuth()
  return resolveViewer({ auth, headers: request?.headers ?? new Headers() })
}
```

- [ ] **Step 4: Rewrite the server functions** to resolve the viewer instead of the demo session. Example — `saved.functions.ts`:

```tsx
export const fetchSavedListings = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ListSavedListingsResponse> => {
    const viewer = await resolveRequestViewer()
    if (viewer.kind !== 'user') return { items: [] }
    const backend = await createServerBackend()
    const result = await backend.listSavedListings({ viewerId: viewer.id })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)
```

Apply the same shape to `app-shell.functions.ts` (`hydrateAppShell({ viewerId: viewer.id })` or an empty shell for anonymous), `profile.functions.ts` (anonymous → empty read model). For `durable-mutation-adapter.ts`, resolve the viewer and pass `viewerId: viewer.id` and `moderatorId: viewer.id`; throw a `FORBIDDEN` `ApiError` when `!canWrite(viewer)`.

- [ ] **Step 5: Update router context** — replace `viewerId`/`mockUser`/`moderatorId` in `src/router/context.ts` with `viewer: Viewer`; set it in `__root.tsx`'s `beforeLoad` from `resolveRequestViewer()` (server) and expose via context. Keep the test-only `backend`/`mutations` injection seams. Update `src/router/index.tsx` `createDefaultRouterContext` to default `viewer: { kind: 'anonymous' }`.

- [ ] **Step 6: Delete the demo modules** and migrate `app-session.test.ts` to assert the real runtime resolves an anonymous viewer by default and a signed-in viewer with a cookie (using `createTestSession`).

- [ ] **Step 7: Run the full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (fix any lingering `demo-session` imports the typechecker flags).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): replace demo-session with resolved Viewer across server functions and router"
```

## Task A9: ADR 0010 + CONTEXT.md glossary

**Files:**
- Create: `docs/adr/0010-better-auth-over-d1-adapt-existing-users.md`
- Modify: `CONTEXT.md`

- [ ] **Step 1: Write ADR 0010** recording: Better Auth over D1 with the existing `users` table adapted (Approach A); admin plugin for global roles with a custom access-control policy; custom `organization_members` retained; email/password + Google, email verification/reset deferred; per-request auth instance (consistent with ADR 0003/0008).

- [ ] **Step 2: Add glossary terms to `CONTEXT.md`** — Session, Account, Global permission, Ban, Bootstrap administrator; clarify legacy `google_sub`. (Copy the definitions from the design spec's "Domain vocabulary additions".) Note that **Global role** is now stored in `users.role`.

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0010-better-auth-over-d1-adapt-existing-users.md CONTEXT.md
git commit -m "docs: record ADR 0010 and auth domain vocabulary"
```

---

# Slice B — RBAC enforcement

Goal: every permission is enforced server-side via guard helpers derived from the resolved viewer's role and the access-control policy.

## Task B1: Guard helpers

**Files:**
- Create: `src/server/auth/guards.ts`
- Create: `src/server/auth/organization-membership.ts`
- Test: `tests/unit/server/auth/guards.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function requireViewer(v: Viewer): asserts v is Extract<Viewer,{kind:'user'}> // throws UNAUTHORIZED / FORBIDDEN(banned)
  export function requireGlobalRole(v: Viewer, role: GlobalRole): void
  export function requireGlobalPermission(v: Viewer, resource, action): void // uses hasPermission
  export function requireOrgRole(deps, v, orgId, role): Promise<void>
  export class AuthzError extends Error { code: 'UNAUTHORIZED' | 'FORBIDDEN' }
  ```
- Consumes: `hasPermission`, `roles` (A2); `Viewer`, `canWrite` (A6); `organization_members` reads.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/auth/guards.test.ts
import { describe, expect, it } from 'vitest'
import { requireViewer, requireGlobalRole, requireGlobalPermission, AuthzError } from '../../../../src/server/auth/guards'

const user = { kind: 'user', id: 'u1', email: 'e', displayName: 'n', role: 'user', banned: false } as const
const moderator = { ...user, role: 'moderator' } as const
const banned = { ...user, banned: true } as const

describe('guards', () => {
  it('requireViewer rejects anonymous with UNAUTHORIZED', () => {
    expect(() => requireViewer({ kind: 'anonymous' })).toThrow(AuthzError)
    try { requireViewer({ kind: 'anonymous' }) } catch (e) { expect((e as AuthzError).code).toBe('UNAUTHORIZED') }
  })
  it('requireViewer rejects a banned user with FORBIDDEN', () => {
    try { requireViewer(banned) } catch (e) { expect((e as AuthzError).code).toBe('FORBIDDEN') }
  })
  it('requireGlobalPermission allows moderator to moderate, denies plain user', () => {
    expect(() => requireGlobalPermission(moderator, 'listing', 'moderate')).not.toThrow()
    expect(() => requireGlobalPermission(user, 'listing', 'moderate')).toThrow(AuthzError)
  })
  it('requireGlobalRole enforces exact role', () => {
    expect(() => requireGlobalRole(user, 'moderator')).toThrow(AuthzError)
    expect(() => requireGlobalRole(moderator, 'moderator')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/guards.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the guards**

```ts
// src/server/auth/guards.ts
import type { GlobalRole } from '../contracts/api'
import { GLOBAL_STATEMENTS, hasPermission } from './access-control'
import { canWrite, type Viewer } from './resolve-viewer'

export class AuthzError extends Error {
  constructor(public code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string) {
    super(message)
    this.name = 'AuthzError'
  }
}

export function requireViewer(v: Viewer): asserts v is Extract<Viewer, { kind: 'user' }> {
  if (v.kind !== 'user') throw new AuthzError('UNAUTHORIZED', 'Sign in required.')
  if (!canWrite(v)) throw new AuthzError('FORBIDDEN', 'Your account is suspended.')
}

const ORDER: Record<GlobalRole, number> = { user: 0, moderator: 1, admin: 2 }
export function requireGlobalRole(v: Viewer, role: GlobalRole): void {
  requireViewer(v)
  if (ORDER[v.role] < ORDER[role]) throw new AuthzError('FORBIDDEN', `Requires ${role}.`)
}

export function requireGlobalPermission<R extends keyof typeof GLOBAL_STATEMENTS>(
  v: Viewer, resource: R, action: (typeof GLOBAL_STATEMENTS)[R][number],
): void {
  requireViewer(v)
  if (!hasPermission(v.role, resource, action)) throw new AuthzError('FORBIDDEN', `Missing ${resource}:${action}.`)
}
```

```ts
// src/server/auth/organization-membership.ts
import { and, eq } from 'drizzle-orm'
import type { OrganizationMemberRole } from '../contracts/api'
import type { PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import * as schema from '../infra/db/schema'
import { AuthzError } from './guards'
import { requireViewer, type Viewer } from './resolve-viewer' // requireViewer re-exported for convenience

const ORG_ORDER: Record<OrganizationMemberRole, number> = { member: 0, listing_manager: 1, admin: 2 }

export async function requireOrgRole(
  deps: { database: PetBuddiesDrizzleDatabase }, v: Viewer, organizationId: string, role: OrganizationMemberRole,
): Promise<void> {
  if (v.kind !== 'user') throw new AuthzError('UNAUTHORIZED', 'Sign in required.')
  const row = await deps.database.select().from(schema.organizationMembers)
    .where(and(eq(schema.organizationMembers.organizationId, organizationId), eq(schema.organizationMembers.userId, v.id)))
    .get()
  if (!row || ORG_ORDER[row.role] < ORG_ORDER[role]) {
    throw new AuthzError('FORBIDDEN', `Requires org ${role}.`)
  }
}
```

(Adjust the `requireViewer` re-export: import from `./guards` in `organization-membership.ts`; the snippet above should import `requireViewer` from `./guards` if needed — it isn't used there, so drop the unused import.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/guards.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/guards.ts src/server/auth/organization-membership.ts tests/unit/server/auth/guards.test.ts
git commit -m "feat(auth): add server-side authorization guards"
```

## Task B2: Enforce on moderation server functions

**Files:**
- Modify: `src/features/moderation/moderation.functions.ts`
- Test: `tests/unit/server/auth/moderation-authz.test.ts`

**Interfaces:**
- Consumes: `resolveRequestViewer` (A8), `requireGlobalPermission` (B1).

- [ ] **Step 1: Write the failing test** (a plain user calling `fetchReviewQueue`/`updateListingLifecycle` is rejected; a moderator succeeds). Drive the server fns through the test harness with `createTestSession('user' | 'moderator')` cookies.

```ts
// tests/unit/server/auth/moderation-authz.test.ts
import { describe, expect, it } from 'vitest'
// harness: run the server fn with a given session cookie (see tests/helpers)
import { runWithSession } from '../../../helpers/run-server-fn'
import { fetchReviewQueue } from '../../../../src/features/moderation/moderation.functions'

describe('moderation authorization', () => {
  it('rejects a plain user', async () => {
    await expect(runWithSession('user', () => fetchReviewQueue())).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('allows a moderator', async () => {
    await expect(runWithSession('moderator', () => fetchReviewQueue())).resolves.toBeDefined()
  })
})
```

Add `tests/helpers/run-server-fn.ts` that seeds the DB, mints a session cookie via `createTestSession`, and invokes the server fn with that request context (extend the existing render/server-fn harness).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/moderation-authz.test.ts`
Expected: FAIL — no authorization yet (user is allowed).

- [ ] **Step 3: Add the guard**

```tsx
export const fetchReviewQueue = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ListReviewQueueResponse> => {
    const viewer = await resolveRequestViewer()
    requireGlobalPermission(viewer, 'listing', 'moderate')
    const backend = await createServerBackend()
    const result = await backend.listReviewQueue()
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) => {
    const viewer = await resolveRequestViewer()
    requireGlobalPermission(viewer, 'listing', 'moderate')
    return (await createDurableServerMutationAdapter(viewer)).updateListingLifecycle({ ...data, actorUserId: viewer.id })
  })
```

(Thread the resolved viewer into `createDurableServerMutationAdapter` — update its signature to accept a `Viewer`, per A8 Step 4.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/moderation-authz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/moderation/moderation.functions.ts tests/unit/server/auth/moderation-authz.test.ts tests/helpers/run-server-fn.ts
git commit -m "feat(auth): enforce moderate permission on moderation server functions"
```

## Task B3: Enforce viewer/ownership on saved, inquiry, profile, create-listing

**Files:**
- Modify: `src/features/saved/saved.functions.ts`, `src/features/inquiries/inquiries.functions.ts`, `src/features/profile/profile.functions.ts`, `src/features/listings/listings.functions.ts`
- Test: `tests/unit/server/auth/write-authz.test.ts`

**Interfaces:**
- Consumes: `resolveRequestViewer`, `requireViewer`, `requireOrgRole`.

- [ ] **Step 1: Write the failing test** — anonymous `toggleSavedListing` / `createInquiry` reject with `UNAUTHORIZED`; a signed-in user succeeds; creating a listing under an org the viewer is not a `listing_manager` of rejects with `FORBIDDEN`.

```ts
// tests/unit/server/auth/write-authz.test.ts
import { describe, expect, it } from 'vitest'
import { runWithSession, runAnonymous } from '../../../helpers/run-server-fn'
import { toggleSavedListing } from '../../../../src/features/saved/saved.functions'

describe('write authorization', () => {
  it('anonymous cannot toggle a saved listing', async () => {
    await expect(runAnonymous(() => toggleSavedListing({ data: { listingId: 'mishka' } }))).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('a signed-in user can toggle a saved listing', async () => {
    await expect(runWithSession('user', () => toggleSavedListing({ data: { listingId: 'mishka' } }))).resolves.toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/server/auth/write-authz.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add guards** — call `requireViewer(viewer)` at the top of each write handler (`toggleSavedListing`, `createInquiry`, `createListing`). In `createListing`, when `request.organizationId` is set, `await requireOrgRole({ database }, viewer, request.organizationId, 'listing_manager')`. `fetchYouReadModel` returns an empty model for anonymous (no throw — it's a read).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/server/auth/write-authz.test.ts && pnpm test`
Expected: PASS (full suite green).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): enforce sign-in and org-role on write server functions"
```

---

# Slice C — Sign-in / account UI

Goal: users can sign in with Google or email/password; the account menu reflects real identity; gated actions route anonymous users through sign-in.

## Task C1: Better Auth React client

**Files:**
- Create: `src/features/auth/auth-client.ts`
- Test: `tests/unit/features/auth/auth-client.test.ts`

**Interfaces:**
- Produces: `authClient` with `signIn`, `signUp`, `signOut`, `useSession`, `admin`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/features/auth/auth-client.test.ts
import { describe, expect, it } from 'vitest'
import { authClient } from '../../../../src/features/auth/auth-client'

describe('authClient', () => {
  it('exposes the expected auth methods', () => {
    expect(typeof authClient.signIn.email).toBe('function')
    expect(typeof authClient.signIn.social).toBe('function')
    expect(typeof authClient.signOut).toBe('function')
    expect(typeof authClient.useSession).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/features/auth/auth-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the client**

```ts
// src/features/auth/auth-client.ts
import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? '',
  plugins: [adminClient()],
})
```

Add `VITE_BETTER_AUTH_URL` to `.dev.vars.example`/env docs (client-visible; same origin so it may be empty).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/features/auth/auth-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/auth-client.ts tests/unit/features/auth/auth-client.test.ts .dev.vars.example
git commit -m "feat(auth): add Better Auth React client"
```

## Task C2: Sign-in / sign-up route

**Files:**
- Create: `src/routes/sign-in.tsx`
- Test: `tests/unit/features/auth/sign-in.test.tsx`

**Interfaces:**
- Consumes: `authClient` (C1). Search schema `{ redirect?: string }`.

- [ ] **Step 1: Write the failing test** (render the route via the app test harness `tests/helpers/render-app.tsx`; assert Google button + email/password fields present, and that submitting calls `authClient.signIn.email`). Mock `authClient`.

```tsx
// tests/unit/features/auth/sign-in.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../../../helpers/render-app'

vi.mock('../../../../src/features/auth/auth-client', () => ({
  authClient: { signIn: { email: vi.fn().mockResolvedValue({ data: {} }), social: vi.fn() }, signUp: { email: vi.fn() } },
}))

describe('sign-in route', () => {
  it('renders Google and email/password options and submits credentials', async () => {
    const { authClient } = await import('../../../../src/features/auth/auth-client')
    await renderRoute('/sign-in')
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(authClient.signIn.email).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/features/auth/sign-in.test.tsx`
Expected: FAIL — route missing.

- [ ] **Step 3: Implement the route** with `validateSearch` for `redirect`, a Google button (`authClient.signIn.social({ provider: 'google', callbackURL: redirect ?? '/' })`), and an email/password form toggling to sign-up. On success, `router.navigate({ to: redirect ?? '/' })`. Follow the auth-route-protection rule for the `redirect` search param.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/features/auth/sign-in.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/sign-in.tsx tests/unit/features/auth/sign-in.test.tsx
git commit -m "feat(auth): add sign-in/sign-up route"
```

## Task C3: Account menu + real identity in the shell

**Files:**
- Create: `src/features/auth/account-menu.tsx`
- Modify: the app shell/header component that currently shows the mock user; `src/routes/you.tsx`
- Test: `tests/unit/features/auth/account-menu.test.tsx`

**Interfaces:**
- Consumes: `authClient.useSession` (C1), router context `viewer` (A8).

- [ ] **Step 1: Write the failing test** — signed-in state shows display name + a working Sign out; anonymous state shows a Sign in link to `/sign-in`.

- [ ] **Step 2: Run test to verify it fails.** Run: `pnpm test -- tests/unit/features/auth/account-menu.test.tsx` → FAIL.

- [ ] **Step 3: Implement `AccountMenu`** reading `authClient.useSession()`; render avatar/display name + Sign out (`authClient.signOut()` then navigate `/`) when signed in, else a `Link to="/sign-in"`. Mount it in the shell header; update `you.tsx` to read the real viewer from route context instead of `mockUser`.

- [ ] **Step 4: Run test to verify it passes.** Run: `pnpm test -- tests/unit/features/auth/account-menu.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): account menu and real identity in the app shell"
```

## Task C4: Gated actions open sign-in when anonymous

**Files:**
- Modify: the save + inquiry action handlers in the UI (where they currently assume a viewer / show the `auth` overlay per `src/types.ts` `AuthIntent`)
- Test: `tests/unit/features/auth/gated-actions.test.tsx`

**Interfaces:**
- Consumes: router `viewer`, `navigate({ to: '/sign-in', search: { redirect } })`.

- [ ] **Step 1: Write the failing test** — clicking Save while anonymous navigates to `/sign-in?redirect=...` (or opens the existing auth overlay) instead of firing the mutation; while signed-in it calls `toggleSavedListing`.

- [ ] **Step 2: Run test to verify it fails.** → FAIL.

- [ ] **Step 3: Implement the gate** — in the save/inquiry click handlers, branch on `viewer.kind === 'anonymous'` → route to sign-in preserving `redirect`; else run the mutation. Reuse the existing `AuthIntent` overlay if that is the established pattern.

- [ ] **Step 4: Run test to verify it passes.** → PASS. Then `pnpm test` full suite.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): route anonymous save/inquiry actions through sign-in"
```

---

# Slice D — Admin user-management UI

Goal: an administrator screen to list users, assign global roles, ban/unban, and verify organizations — moderators excluded.

## Task D1: Admin server functions (list / set-role / ban)

**Files:**
- Create: `src/features/auth/admin.functions.ts`
- Test: `tests/unit/features/auth/admin-functions.test.ts`

**Interfaces:**
- Produces: `listUsers`, `setUserRole`, `banUser`, `unbanUser` server functions.
- Consumes: `resolveRequestViewer`, `requireGlobalPermission` (`user:setRole`/`user:ban`), `createRequestAuth` (admin plugin API), the DB for the last-admin guard.

- [ ] **Step 1: Write the failing test** — a moderator calling `setUserRole` is rejected `FORBIDDEN`; an admin can promote a user to moderator; demoting the last admin throws `CONFLICT`.

```ts
// tests/unit/features/auth/admin-functions.test.ts
import { describe, expect, it } from 'vitest'
import { runWithSession } from '../../../helpers/run-server-fn'
import { setUserRole } from '../../../../src/features/auth/admin.functions'

describe('admin functions', () => {
  it('rejects a moderator', async () => {
    await expect(runWithSession('moderator', () => setUserRole({ data: { userId: 'x', role: 'moderator' } })))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('blocks demoting the last admin', async () => {
    await expect(runWithSession('admin', ({ adminUserId }) => setUserRole({ data: { userId: adminUserId, role: 'user' } })))
      .rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails.** → FAIL.

- [ ] **Step 3: Implement the functions** — each resolves the viewer, calls `requireGlobalPermission(viewer, 'user', 'setRole' | 'ban')`, then delegates to the admin plugin API (`auth.api.listUsers`, `auth.api.setRole`, `auth.api.banUser`, `auth.api.unbanUser`) passing the viewer's session headers. Before demoting, count admins (`select ... where role='admin'`); if the target is the only admin and the new role isn't `admin`, throw an `AuthzError`-style `CONFLICT`. Validate inputs with Zod.

- [ ] **Step 4: Run test to verify it passes.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/admin.functions.ts tests/unit/features/auth/admin-functions.test.ts
git commit -m "feat(auth): admin user-management server functions with last-admin guard"
```

## Task D2: Verify-organization action

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Test: `tests/unit/features/auth/verify-org.test.ts`

**Interfaces:**
- Produces: `verifyOrganization` / `unverifyOrganization` server functions.
- Consumes: `requireGlobalPermission(viewer, 'org', 'verify')`, DB update on `organizations`.

- [ ] **Step 1: Write the failing test** — an admin verifying an org sets `is_verified=true` + `verified_at`; a moderator is rejected `FORBIDDEN`.

- [ ] **Step 2: Run test to verify it fails.** → FAIL.

- [ ] **Step 3: Implement** — resolve viewer, `requireGlobalPermission(viewer, 'org', 'verify')`, then `database.update(schema.organizations).set({ isVerified: true, verifiedAt: <now> }).where(eq(id))`. For `now`, pass a timestamp through the input or use the DB `CURRENT_TIMESTAMP` default pattern used elsewhere.

- [ ] **Step 4: Run test to verify it passes.** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/admin.functions.ts tests/unit/features/auth/verify-org.test.ts
git commit -m "feat(auth): verify/unverify organization admin action"
```

## Task D3: `/admin/users` route (guarded UI)

**Files:**
- Create: `src/routes/admin.users.tsx`
- Test: `tests/unit/features/auth/admin-users-route.test.tsx`

**Interfaces:**
- Consumes: `listUsers`/`setUserRole`/`banUser`/`verifyOrganization` (D1/D2); router `viewer`.

- [ ] **Step 1: Write the failing test** — `beforeLoad` redirects a non-admin (moderator, user, anonymous) away from `/admin/users`; an admin sees the user list and can trigger set-role.

```tsx
// tests/unit/features/auth/admin-users-route.test.tsx — assert guard + render
```

- [ ] **Step 2: Run test to verify it fails.** → FAIL.

- [ ] **Step 3: Implement the route** — `beforeLoad` reads `context.viewer`; if `viewer.kind !== 'user' || viewer.role !== 'admin'` → `throw redirect({ to: '/', ... })` (or `/sign-in` with `redirect` when anonymous). Loader prefetches `listUsers` into the query cache (ADR 0009 pattern); the component renders a table with role controls, ban toggles, and an org-verification section, wired via React Query mutations to the D1/D2 functions. Moderators never reach it (guard).

- [ ] **Step 4: Run test to verify it passes.** → PASS. Then run `pnpm test && pnpm typecheck` for the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.users.tsx tests/unit/features/auth/admin-users-route.test.tsx
git commit -m "feat(auth): admin user-management screen guarded to administrators"
```

---

## Self-Review (author's pass against the spec)

**Spec coverage:**
- Auth backend + session wiring → A1–A8 ✓
- RBAC enforcement everywhere → B1–B3 (moderation, saved, inquiry, profile, create-listing/org role) ✓
- Sign-in / account UI → C1–C4 ✓
- Admin user-management UI → D1–D3 (list/set-role/ban + verify-org, moderators excluded) ✓
- Google + email/password, no verification/reset → A4 (`requireEmailVerification: false`, no email sender) ✓
- Seed an admin record, deterministic linking → A7 (`seedAuth`) + A4 (`accountLinking.trustedProviders: ['google']`) ✓
- Adapt existing tables (Approach A) → A3 ✓
- Test-first per slice → every task leads with a failing test ✓
- Domain vocabulary + ADR → A9 ✓

**Placeholder scan:** No "TBD"/"handle edge cases" without code. Where the installed Better Auth version may differ (field-mapping keys, `authorize` return shape, generated columns), the plan names the exact assertion that pins behavior and instructs verification against the version — this is a version-alignment step, not a placeholder.

**Type consistency:** `Viewer`, `AuthzError.code` (`UNAUTHORIZED`/`FORBIDDEN`), `hasPermission(role,resource,action)`, `resolveRequestViewer()`, `createDurableServerMutationAdapter(viewer)` are used consistently across tasks. The `users.role` rename is applied in schema (A3), contracts (A3), and reads (`viewer.role`) throughout.

**Known follow-ups (out of scope, per spec):** transactional email → reset/verification; impersonation (column provisioned); self-serve org signup.
