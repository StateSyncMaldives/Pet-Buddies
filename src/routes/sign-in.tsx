import { createFileRoute } from '@tanstack/react-router'

import { SignIn } from '../features/auth/SignIn'
import { validateSignInSearch } from '../router/sign-in-search'

export const Route = createFileRoute('/sign-in')({
  validateSearch: validateSignInSearch,
  component: SignInRoute,
})

function SignInRoute() {
  const { redirect } = Route.useSearch()
  return <SignIn redirect={redirect} />
}
