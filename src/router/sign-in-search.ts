export interface SignInSearch {
  /** Where to land after a successful sign-in. */
  redirect?: string
}

/**
 * Only same-site paths are safe to follow. An absolute or protocol-relative
 * `redirect` would let a crafted link carry the user off-site the moment they
 * authenticate, so anything that isn't a plain `/path` is dropped.
 *
 * Applied both here and at the point of use in the sign-in screen: the router
 * retains unrecognised search params, so the component must not assume the
 * value it reads has been through this function.
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  return value
}

export function validateSignInSearch(search: Record<string, unknown>): SignInSearch {
  const redirect = safeRedirect(search.redirect)
  return redirect ? { redirect } : {}
}
