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

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])

function jpegFile(name = 'mango.jpg'): File {
  return new File([JPEG_BYTES], name, { type: 'image/jpeg' })
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
      })
    })

    act(() => {
      result.current.submitReport()
    })

    expect(result.current.state.reportDone).toBe(true)
    expect(result.current.state.reportReceipt?.routedTo).toBe('Zoophilist Society Maldives')
    expect(result.current.state.reportReceipt?.referenceCode).toMatch(/^MV\d+$/)
  })

  it('uploads a selected listing image and submits its object key with the listing', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      result.current.googleSignIn()
    })

    await act(async () => {
      await result.current.addListingImages([jpegFile()])
    })

    const image = result.current.state.add.images[0]
    expect(image.status).toBe('ready')
    expect(image.objectKey).toMatch(/^listing-images\/media-[a-z0-9-]+\.jpg$/)

    act(() => {
      result.current.patchAdd({ name: 'Sunny' })
    })

    act(() => {
      result.current.submitListing()
    })

    expect(result.current.state.addDone).toBe(true)
    expect(result.current.listings[0].photo).toBe(`/media/${image.objectKey}`)
  })

  it('marks an unsupported file as a failed upload draft', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.addListingImages([new File([Uint8Array.from([0x47, 0x49, 0x46])], 'clip.gif', { type: 'image/gif' })])
    })

    const image = result.current.state.add.images[0]
    expect(image.status).toBe('error')
    expect(image.objectKey).toBe(null)
  })

  it('blocks listing submission while an image upload is in flight', async () => {
    const createListing = vi.fn<AppMutationAdapter['createListing']>()
    const mutations: AppMutationAdapter = {
      toggleSavedListing: vi.fn<AppMutationAdapter['toggleSavedListing']>(),
      createInquiry: vi.fn<AppMutationAdapter['createInquiry']>(),
      createListing,
      createReport: vi.fn<AppMutationAdapter['createReport']>(),
      uploadMedia: vi.fn<AppMutationAdapter['uploadMedia']>().mockReturnValue(new Promise(() => {})),
      updateListingLifecycle: vi.fn<AppMutationAdapter['updateListingLifecycle']>(),
    }
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations }) })

    act(() => {
      result.current.patchAdd({ name: 'Sunny' })
    })

    act(() => {
      void result.current.addListingImages([jpegFile()])
    })

    act(() => {
      result.current.submitListing()
    })

    expect(createListing).not.toHaveBeenCalled()
    expect(result.current.state.addDone).toBe(false)
  })

  it('uploads a report photo and submits its object key with the report', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.setReportPhoto(jpegFile('budgie.jpg'))
    })

    expect(result.current.state.rep.photo?.status).toBe('ready')
    expect(result.current.state.rep.photo?.objectKey).toMatch(/^report-photos\/media-[a-z0-9-]+\.jpg$/)

    act(() => {
      result.current.patchRep({ kind: 'found', species: 'bird', area: 'Maafannu, Malé', desc: 'Found a tame budgie.' })
    })

    act(() => {
      result.current.submitReport()
    })

    expect(result.current.state.reportDone).toBe(true)
  })

  it('removes a report photo before submitting', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.setReportPhoto(jpegFile())
    })

    act(() => {
      result.current.removeReportPhoto()
    })

    expect(result.current.state.rep.photo).toBe(null)
  })
})
