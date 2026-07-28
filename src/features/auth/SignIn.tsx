import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { LogoMark } from '../../components/Brand'
import { safeRedirect } from '../../router/sign-in-search'
import { colors, shadow } from '../../theme'
import { authClient } from './auth-client'
import { GoogleGlyph } from './GoogleGlyph'

type Mode = 'sign-in' | 'sign-up'

const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 12,
  border: `1.5px solid ${colors.line}`,
  background: '#fff',
  fontSize: 15,
  color: colors.ink,
} as const

function messageFor(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Something went wrong. Please try again.'
}

export function SignIn({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Re-validated here: the router retains unrecognised search params, so an
  // off-site `redirect` can still reach this component.
  const destination = safeRedirect(redirect) ?? '/browse'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result =
        mode === 'sign-in'
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name })

      if (result?.error) {
        setError(messageFor(result.error))
        return
      }
      // A full navigation, not a client-side one: the session cookie must be on
      // the next document request for the root beforeLoad to resolve the viewer.
      await navigate({ to: destination, reloadDocument: true })
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setPending(false)
    }
  }

  const continueWithGoogle = async () => {
    setError(null)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: destination })
    } catch (caught) {
      setError(messageFor(caught))
    }
  }

  return (
    <section style={{ padding: '40px 24px 140px', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <LogoMark width={54} height={44} />
        <h1 style={{ fontSize: 23, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '20px 0 10px' }}>
          {mode === 'sign-in' ? 'Sign in to Pet Buddies' : 'Create your account'}
        </h1>
        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.55, margin: 0 }}>
          Browsing and searching never need an account. Sign in to save pets, send adoption
          inquiries, and list a pet.
        </p>
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 11,
          padding: '15px 0',
          borderRadius: 14,
          border: '1.5px solid #d8dce4',
          background: '#fff',
          fontSize: 15,
          fontWeight: 600,
          color: colors.ink,
          cursor: 'pointer',
          boxShadow: shadow.card,
          marginTop: 28,
        }}
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '22px 0',
          color: colors.faintAlt,
          fontSize: 12,
        }}
      >
        <span style={{ flex: 1, height: 1, background: colors.line }} />
        or
        <span style={{ flex: 1, height: 1, background: colors.line }} />
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mode === 'sign-up' && (
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>
        )}

        <label style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <label style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: colors.rejectText }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            width: '100%',
            padding: '15px 0',
            borderRadius: 14,
            border: 'none',
            background: colors.actionBlue,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: pending ? 'progress' : 'pointer',
            marginTop: 4,
          }}
        >
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p style={{ fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', margin: '20px 0 0' }}>
        {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
          }}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            color: colors.deepBlue,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {mode === 'sign-in' ? 'Create one' : 'Sign in'}
        </button>
      </p>

      <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
        {/* Via `/`, which redirects to browse with its default search params. */}
        <Link to="/" style={{ fontSize: 13, color: colors.faint }}>
          Keep browsing without an account
        </Link>
      </p>
    </section>
  )
}
