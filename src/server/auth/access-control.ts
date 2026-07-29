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
