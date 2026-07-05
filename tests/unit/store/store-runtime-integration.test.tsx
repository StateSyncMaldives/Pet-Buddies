// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiResultOk } from '../../../src/server/contracts/api'
import type { AppMutationAdapter } from '../../../src/server/mutations/mutation-adapter'
import { createPrototypeBackend } from '../../../src/server/runtime/prototype-backend'
import { StoreProvider, useStore, type StoreProviderProps } from '../../../src/store/store'
import type { User } from '../../../src/types'

const TEST_USER: User = {
  name: 'Test Adopter',
  email: 'test-adopter@example.com',
}

function createWrapper(props: Partial<StoreProviderProps> = {}) {
  const backend = props.backend ?? createPrototypeBackend()
  const viewerId = props.viewerId ?? 'viewer-test'
  const mockUser = props.mockUser ?? TEST_USER
  const moderatorId = props.moderatorId ?? 'moderator-test'

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StoreProvider backend={backend} viewerId={viewerId} mockUser={mockUser} moderatorId={moderatorId} mutations={props.mutations}>
        {children}
      </StoreProvider>
    )
  }
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('StoreProvider runtime integration', () => {
  it('uses the injected mutation adapter for Saved listing changes', () => {
    const toggleSavedListing = vi.fn<AppMutationAdapter['toggleSavedListing']>().mockReturnValue(apiResultOk({ listingId: 'mishka', saved: true }))
    const mutations: AppMutationAdapter = {
      toggleSavedListing,
      createInquiry: vi.fn<AppMutationAdapter['createInquiry']>(),
      createListing: vi.fn<AppMutationAdapter['createListing']>(),
      createReport: vi.fn<AppMutationAdapter['createReport']>(),
      uploadMedia: vi.fn<AppMutationAdapter['uploadMedia']>(),
      updateListingLifecycle: vi.fn<AppMutationAdapter['updateListingLifecycle']>(),
    }
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations }) })

    act(() => {
      result.current.toggleSave('mishka')
    })

    expect(toggleSavedListing).toHaveBeenCalledWith({ listingId: 'mishka' })
    expect(result.current.state.saved).toContain('mishka')
  })

  it('keeps save state isolated per injected backend session', () => {
    const firstWrapper = createWrapper({ backend: createPrototypeBackend(), viewerId: 'viewer-a' })
    const secondWrapper = createWrapper({ backend: createPrototypeBackend(), viewerId: 'viewer-b' })

    const firstStore = renderHook(() => useStore(), { wrapper: firstWrapper })
    const secondStore = renderHook(() => useStore(), { wrapper: secondWrapper })

    act(() => {
      firstStore.result.current.toggleSave('mishka')
    })

    expect(firstStore.result.current.state.saved).toContain('mishka')
    expect(secondStore.result.current.state.saved).not.toContain('mishka')
  })

  it('creates a pending listing through the injected backend facade', () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      result.current.googleSignIn()
    })

    act(() => {
      result.current.patchAdd({
        species: 'bird',
        breed: 'Cockatiel',
        name: 'Sunny',
        age: '10 months',
        area: 'Hulhumalé',
        desc: 'Friendly bird ready for a new home.',
        tags: ['Hand-tame'],
      })
    })

    act(() => {
      result.current.submitListing()
    })

    expect(result.current.state.addDone).toBe(true)
    expect(result.current.state.addedName).toBe('Sunny')
    expect(result.current.listings[0]).toMatchObject({
      name: 'Sunny',
      species: 'bird',
      status: 'pending',
      breed: 'Cockatiel',
    })
  })

  it('creates inquiries through the injected backend facade after sign-in', () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      result.current.googleSignIn()
    })

    act(() => {
      result.current.applyToAdopt('mishka')
    })

    act(() => {
      result.current.setInquiryMessage('Could we arrange a visit this weekend?')
    })

    act(() => {
      result.current.sendInquiry()
    })

    expect(result.current.state.applied).toContain('mishka')
    expect(result.current.state.overlay).toBe('detail')
    expect(result.current.state.inquiries[0]).toMatchObject({
      listingId: 'mishka',
      name: 'Mishka',
      message: 'Could we arrange a visit this weekend?',
      status: 'Awaiting reply',
    })
  })

  it('returns backend-generated report receipts through the store flow', () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      result.current.patchRep({
        kind: 'found',
        species: 'bird',
        area: 'Maafannu, Malé',
        desc: 'Found a tame budgie near the harbour.',
        photo: true,
      })
    })

    act(() => {
      result.current.submitReport()
    })

    expect(result.current.state.reportDone).toBe(true)
    expect(result.current.state.reportReceipt?.routedTo).toBe('Zoophilist Society Maldives')
    expect(result.current.state.reportReceipt?.referenceCode).toMatch(/^MV\d+$/)
  })
})
