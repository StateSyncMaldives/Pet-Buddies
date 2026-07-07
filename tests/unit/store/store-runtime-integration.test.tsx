import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiResultOk } from '../../../src/server/contracts/api'
import { MAX_LISTING_IMAGES } from '../../../src/server/domain/listings/create-listing'
import type { AppMutationAdapter } from '../../../src/server/mutations/mutation-adapter'
import { createPrototypeBackend } from '../../../src/server/runtime/prototype-backend'
import { StoreProvider, useStore, type StoreProviderProps } from '../../../src/store/store'
import type { User } from '../../../src/types'
import { jpegFile } from '../../helpers/media-fixtures'

const TEST_USER: User = {
  name: 'Test Adopter',
  email: 'test-adopter@example.com',
}

function createMutationAdapter(overrides: Partial<AppMutationAdapter> = {}): AppMutationAdapter {
  return {
    toggleSavedListing: vi.fn<AppMutationAdapter['toggleSavedListing']>(),
    createInquiry: vi.fn<AppMutationAdapter['createInquiry']>(),
    createListing: vi.fn<AppMutationAdapter['createListing']>(),
    createReport: vi.fn<AppMutationAdapter['createReport']>(),
    uploadMedia: vi.fn<AppMutationAdapter['uploadMedia']>(),
    updateListingLifecycle: vi.fn<AppMutationAdapter['updateListingLifecycle']>(),
    ...overrides,
  }
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
        birdSpecies: 'Budgerigar',
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

  it('requires report location and description instead of submitting prototype defaults', () => {
    const createReport = vi.fn<AppMutationAdapter['createReport']>()
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations: createMutationAdapter({ createReport }) }) })

    act(() => {
      result.current.submitReport()
    })

    expect(createReport).not.toHaveBeenCalled()
    expect(result.current.state.reportDone).toBe(false)
    expect(result.current.state.toast).toBe('Add a report location')

    act(() => {
      result.current.patchRep({ area: 'Maafannu, Male' })
    })
    act(() => {
      result.current.submitReport()
    })

    expect(createReport).not.toHaveBeenCalled()
    expect(result.current.state.toast).toBe('Add identifying details')
  })

  it('requires an explicit bird species for bird reports', () => {
    const createReport = vi.fn<AppMutationAdapter['createReport']>()
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations: createMutationAdapter({ createReport }) }) })

    act(() => {
      result.current.patchRep({
        kind: 'found',
        species: 'bird',
        area: 'Maafannu, Male',
        desc: 'Found a tame bird near the harbour.',
      })
    })
    act(() => {
      result.current.submitReport()
    })

    expect(createReport).not.toHaveBeenCalled()
    expect(result.current.state.toast).toBe('Choose the bird species')
  })

  it('submits the selected bird species with bird reports', () => {
    const createReport = vi.fn<AppMutationAdapter['createReport']>().mockReturnValue(
      apiResultOk({
        report: {
          id: 'report-test',
          referenceCode: 'MV1001',
          routedToOrganizationId: 'zoophilist-society-maldives',
          status: 'submitted',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      }),
    )
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations: createMutationAdapter({ createReport }) }) })

    act(() => {
      result.current.patchRep({
        kind: 'found',
        species: 'bird',
        birdSpecies: 'Cockatiel',
        area: 'Maafannu, Male',
        desc: 'Found a tame cockatiel near the harbour.',
      })
    })
    act(() => {
      result.current.submitReport()
    })

    expect(createReport).toHaveBeenCalledWith({
      request: expect.objectContaining({
        species: 'bird',
        birdSpecies: 'Cockatiel',
        areaLabel: 'Maafannu, Male',
        description: 'Found a tame cockatiel near the harbour.',
      }),
    })
    expect(result.current.state.reportDone).toBe(true)
  })

  it('requires listing age and location instead of submitting prototype defaults', () => {
    const createListing = vi.fn<AppMutationAdapter['createListing']>()
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper({ mutations: createMutationAdapter({ createListing }) }) })

    act(() => {
      result.current.patchAdd({ name: 'Sunny' })
    })
    act(() => {
      result.current.submitListing()
    })

    expect(createListing).not.toHaveBeenCalled()
    expect(result.current.state.toast).toBe('Add an age')

    act(() => {
      result.current.patchAdd({ age: '10 months' })
    })
    act(() => {
      result.current.submitListing()
    })

    expect(createListing).not.toHaveBeenCalled()
    expect(result.current.state.toast).toBe('Add a location')
  })

  it('persists add-listing and report drafts across store remounts without media drafts', () => {
    const first = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      first.result.current.patchAdd({
        species: 'bird',
        breed: 'Lovebird',
        name: 'Sky',
        age: '6 months',
        area: 'Machangolhi',
        desc: 'Needs a patient home.',
        tags: ['Needs foster'],
      })
      first.result.current.patchRep({
        kind: 'found',
        species: 'bird',
        birdSpecies: 'Cockatiel',
        area: 'Galolhu',
        desc: 'Seen near the school.',
      })
    })

    first.unmount()

    const second = renderHook(() => useStore(), { wrapper: createWrapper() })

    expect(second.result.current.state.add).toMatchObject({
      species: 'bird',
      breed: 'Lovebird',
      name: 'Sky',
      age: '6 months',
      area: 'Machangolhi',
      desc: 'Needs a patient home.',
      tags: ['Needs foster'],
      images: [],
    })
    expect(second.result.current.state.rep).toMatchObject({
      kind: 'found',
      species: 'bird',
      birdSpecies: 'Cockatiel',
      area: 'Galolhu',
      desc: 'Seen near the school.',
      photo: null,
    })
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
      result.current.patchAdd({ name: 'Sunny', age: '10 months', area: 'Maafannu, Male' })
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
      result.current.patchRep({
        kind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        area: 'Maafannu, Malé',
        desc: 'Found a tame budgie.',
      })
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

  it('drops listing images beyond the maximum and shows the limit toast', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    const files = Array.from({ length: MAX_LISTING_IMAGES + 2 }, (_, index) => jpegFile(`photo-${index}.jpg`))

    await act(async () => {
      await result.current.addListingImages(files)
    })

    expect(result.current.state.add.images).toHaveLength(MAX_LISTING_IMAGES)
    expect(result.current.state.toast).toBe(`Up to ${MAX_LISTING_IMAGES} photos per listing`)
    expect(result.current.state.add.images.every((image) => image.status === 'ready')).toBe(true)
  })

  it('removes a previously added listing image draft', async () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.addListingImages([jpegFile()])
    })

    const image = result.current.state.add.images[0]
    expect(image).toBeDefined()

    act(() => {
      result.current.removeListingImage(image.id)
    })

    expect(result.current.state.add.images).toEqual([])
  })

  it('approves then marks a pending listing adopted through the real backend', () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    expect(result.current.listings.find((listing) => listing.id === 'pending-simba')?.status).toBe('pending')

    act(() => {
      result.current.approveListing('pending-simba')
    })

    expect(result.current.listings.find((listing) => listing.id === 'pending-simba')?.status).toBe('live')
    expect(result.current.state.toast).toBe('Simba is now live')

    act(() => {
      result.current.markAdopted('pending-simba')
    })

    expect(result.current.listings.find((listing) => listing.id === 'pending-simba')?.status).toBe('adopted')
    expect(result.current.state.toast).toBe('Simba marked as adopted')
  })

  it('rejects a pending listing through the real backend', () => {
    const { result } = renderHook(() => useStore(), { wrapper: createWrapper() })

    act(() => {
      result.current.rejectListing('pending-simba')
    })

    expect(result.current.state.toast).toBe('Simba rejected')
    // KNOWN QUIRK: the public read model masks 'rejected' as 'pending'
    // (toListingSummary in src/server/domain/listings/listing-mapper.ts), so
    // the listing synced back into the store still reports 'pending' — which
    // also means it stays in the ModOverlay review queue after rejection.
    expect(result.current.listings.find((listing) => listing.id === 'pending-simba')?.status).toBe('pending')

    // The backend really did transition: a rejected listing can no longer be
    // approved, so the moderation error surfaces as the toast.
    act(() => {
      result.current.approveListing('pending-simba')
    })

    expect(result.current.state.toast).toBe('Only pending listings can be approved or rejected.')
  })
})
