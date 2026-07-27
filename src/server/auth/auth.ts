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
      // Better Auth rewrites the canonical model id `user` to the configured
      // `modelName` ('users') BEFORE the adapter does a literal
      // `config.schema[model]` lookup, so this map must be keyed by the
      // *renamed* model id, not the canonical one. session/account/
      // verification keep their canonical (unrenamed) ids.
      schema: { users: schema.users, session: schema.session, account: schema.account, verification: schema.verification },
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
