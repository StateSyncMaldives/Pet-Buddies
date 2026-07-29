export type AuthzErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'CONFLICT'

/**
 * The single error type every authorization refusal throws. `code` is what
 * callers branch on — `UNAUTHORIZED` means "sign in", `FORBIDDEN` means "signed
 * in but not allowed", `CONFLICT` means the request would break an invariant
 * (e.g. demoting the last administrator).
 */
export class AuthzError extends Error {
  readonly code: AuthzErrorCode

  constructor(code: AuthzErrorCode, message: string) {
    super(message)
    this.name = 'AuthzError'
    this.code = code
  }
}
