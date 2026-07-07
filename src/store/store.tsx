import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PrototypeBackend } from '../server/runtime/prototype-backend'
import { DEMO_MODERATOR_ID } from '../server/runtime/app-session'
import { MAX_LISTING_IMAGES } from '../server/domain/listings/create-listing'
import type { MediaUploadKind } from '../server/domain/media/media-upload-policy'
import { createRuntimeMutationAdapter, type AppMutationAdapter } from '../server/mutations/mutation-adapter'
import { isBirdSpecies, type BirdSpecies } from '../server/contracts/api'
import { createInquiryViewModel, mapClinicSummaryToClinic, mapListingDetailToListing } from './view-model-mappers'
import type {
  AuthIntent,
  Clinic,
  InboxView,
  Inquiry,
  Listing,
  Overlay,
  Species,
  User,
} from '../types'

const DEFAULT_MODERATOR_ID = DEMO_MODERATOR_ID

const TOAST_DURATION_MS = 2200

/**
 * In-memory app store mirroring the prototype's logic class.
 * Uses the server-backed runtime façade so UI flows now mutate the same typed
 * backend use cases the future TanStack Start app shell will call.
 */
export interface MediaDraft {
  id: string
  fileName: string
  previewUrl: string
  objectKey: string | null
  status: 'uploading' | 'ready' | 'error'
  error?: string
}

export interface ReportForm {
  kind: 'lost' | 'found'
  species: Species
  birdSpecies: BirdSpecies | ''
  area: string
  desc: string
  photo: MediaDraft | null
}

export interface AddForm {
  species: Species
  name: string
  age: string
  area: string
  breed: string
  desc: string
  tags: string[]
  images: MediaDraft[]
}

export interface ReportReceipt {
  routedTo: string
  referenceCode: string
}

export interface AppState {
  species: Species
  query: string
  tags: string[]
  saved: string[]
  applied: string[]
  overlay: Overlay
  detailId: string | null
  user: User | null
  authIntent: AuthIntent
  pendingApplyId: string | null
  inquiries: Inquiry[]
  inquiry: { listingId: string | null; message: string }
  inboxView: InboxView
  onboarded: boolean
  obStep: number
  installed: boolean
  installDismissed: boolean
  toast: string
  rep: ReportForm
  reportDone: boolean
  reportReceipt: ReportReceipt | null
  add: AddForm
  addDone: boolean
  addedName: string
}

const emptyAdd: AddForm = {
  species: 'cat',
  name: '',
  age: '',
  area: '',
  breed: 'Budgerigar',
  desc: '',
  tags: [],
  images: [],
}

const emptyRep: ReportForm = { kind: 'lost', species: 'cat', birdSpecies: '', area: '', desc: '', photo: null }

const LS_KEY = 'petbuddies.flags'
const DRAFTS_KEY = 'petbuddies.drafts'

interface PersistedDrafts {
  add?: Omit<AddForm, 'images'>
  rep?: Omit<ReportForm, 'photo'>
}

function loadFlags(): { onboarded: boolean; installed: boolean; installDismissed: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { onboarded: false, installed: false, installDismissed: false, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { onboarded: false, installed: false, installDismissed: false }
}

function loadDrafts(): { add: AddForm; rep: ReportForm } {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return { add: { ...emptyAdd }, rep: { ...emptyRep } }
    const parsed = JSON.parse(raw) as PersistedDrafts
    return {
      add: { ...emptyAdd, ...parsed.add, images: [] },
      rep: { ...emptyRep, ...parsed.rep, photo: null },
    }
  } catch {
    return { add: { ...emptyAdd }, rep: { ...emptyRep } }
  }
}

function initialState(initialSaved: string[]): AppState {
  const flags = loadFlags()
  const drafts = loadDrafts()
  return {
    species: 'cat',
    query: '',
    tags: [],
    saved: [...initialSaved],
    applied: [],
    overlay: null,
    detailId: null,
    user: null,
    authIntent: 'add',
    pendingApplyId: null,
    inquiries: [],
    inquiry: { listingId: null, message: '' },
    inboxView: 'inquiries',
    onboarded: flags.onboarded,
    obStep: 0,
    installed: flags.installed,
    installDismissed: flags.installDismissed,
    toast: '',
    rep: drafts.rep,
    reportDone: false,
    reportReceipt: null,
    add: drafts.add,
    addDone: false,
    addedName: '',
  }
}

function inquiryDraft(name: string): string {
  return `Hi! I'm interested in adopting ${name}. Could we find a time to meet? Thank you!`
}

export interface Store {
  state: AppState
  listings: Listing[]
  clinics: Clinic[]
  setBrowseFilters: (filters: Pick<AppState, 'species' | 'query' | 'tags'>) => void
  setSpecies: (species: Species) => void
  setQuery: (query: string) => void
  toggleTag: (tag: string) => void
  clearFilters: () => void
  toggleSave: (id: string) => void
  openDetail: (id: string) => void
  closeDetail: () => void
  openAuth: (intent: AuthIntent, applyId?: string) => void
  closeAuth: () => void
  googleSignIn: () => void
  signOut: () => void
  applyToAdopt: (id: string) => void
  setInquiryMessage: (msg: string) => void
  cancelInquiry: () => void
  sendInquiry: () => void
  reportListing: () => void
  openAdd: () => void
  closeAdd: () => void
  patchAdd: (p: Partial<AddForm>) => void
  toggleAddTag: (tag: string) => void
  addListingImages: (files: File[]) => Promise<void>
  removeListingImage: (id: string) => void
  submitListing: () => void
  openMod: () => void
  closeMod: () => void
  approveListing: (id: string) => void
  rejectListing: (id: string) => void
  markAdopted: (id: string) => void
  patchRep: (p: Partial<ReportForm>) => void
  useMyLocation: () => void
  setReportPhoto: (file: File) => Promise<void>
  removeReportPhoto: () => void
  submitReport: () => void
  resetReport: () => void
  callClinic: (name: string) => void
  directionsClinic: () => void
  setInboxView: (view: InboxView) => void
  obNext: () => void
  obSkip: () => void
  installAdd: () => void
  installDismiss: () => void
  showToast: (msg: string) => void
}

export interface StoreProviderProps {
  children: ReactNode
  backend: PrototypeBackend
  viewerId: string
  mockUser: User
  moderatorId?: string
  mutations?: AppMutationAdapter
}

function createInitialHydration(backend: PrototypeBackend, viewerId: string) {
  const hydration = backend.hydrateAppShell({ viewerId })
  return {
    listings: hydration.listings.map(mapListingDetailToListing),
    clinics: hydration.clinics.map(mapClinicSummaryToClinic),
    saved: hydration.listings.filter((listing) => listing.savedByViewer).map((listing) => listing.id),
  }
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({
  children,
  backend,
  viewerId,
  mockUser,
  moderatorId = DEFAULT_MODERATOR_ID,
  mutations: injectedMutations,
}: StoreProviderProps) {
  const hydration = useMemo(() => createInitialHydration(backend, viewerId), [backend, viewerId])
  const mutations = useMemo(
    () => injectedMutations ?? createRuntimeMutationAdapter({ backend, viewerId, moderatorId }),
    [backend, injectedMutations, moderatorId, viewerId],
  )
  const [state, setState] = useState<AppState>(() => initialState(hydration.saved))
  const [listings, setListings] = useState<Listing[]>(() => hydration.listings.map((listing) => ({ ...listing, tags: [...listing.tags] })))
  const [clinics] = useState<Clinic[]>(() => hydration.clinics.map((clinic) => ({ ...clinic, services: [...clinic.services] })))

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), [])

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          onboarded: state.onboarded,
          installed: state.installed,
          installDismissed: state.installDismissed,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [state.onboarded, state.installed, state.installDismissed])

  useEffect(() => {
    const { images: _images, ...addDraft } = state.add
    const { photo: _photo, ...reportDraft } = state.rep
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify({ add: addDraft, rep: reportDraft }))
    } catch {
      /* ignore */
    }
  }, [state.add, state.rep])

  const showToast = useCallback(
    (msg: string) => {
      patch({ toast: msg })
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => patch({ toast: '' }), TOAST_DURATION_MS)
    },
    [patch],
  )

  const syncListing = useCallback((listing: Listing) => {
    setListings((current) => {
      const index = current.findIndex((item) => item.id === listing.id)
      if (index === -1) return [listing, ...current]
      return current.map((item) => (item.id === listing.id ? listing : item))
    })
  }, [])

  const transitionListing = useCallback(
    (id: string, action: 'approved' | 'rejected' | 'adopted') => {
      const result = mutations.updateListingLifecycle({
        listingId: id,
        actorUserId: moderatorId,
        request: { action },
      })
      if (!result.ok) {
        showToast(result.error.message)
        return null
      }
      const listing = mapListingDetailToListing(result.data.listing)
      syncListing(listing)
      return listing
    },
    [moderatorId, mutations, showToast, syncListing],
  )

  const store = useMemo<Store>(() => {
    const setAdd = (p: Partial<AddForm>) => setState((s) => ({ ...s, add: { ...s.add, ...p } }))
    const setRep = (p: Partial<ReportForm>) => setState((s) => ({ ...s, rep: { ...s.rep, ...p } }))

    const uploadDraft = async (draft: MediaDraft, file: File, kind: MediaUploadKind): Promise<MediaDraft> => {
      try {
        const result = await mutations.uploadMedia({
          kind,
          contentType: file.type,
          sizeBytes: file.size,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })
        if (!result.ok) {
          return { ...draft, status: 'error', error: result.error.message }
        }
        return { ...draft, status: 'ready', objectKey: result.data.objectKey }
      } catch {
        return { ...draft, status: 'error', error: 'Upload failed. Try again.' }
      }
    }

    const patchListingImage = (updated: MediaDraft) =>
      setState((s) => ({
        ...s,
        add: { ...s.add, images: s.add.images.map((image) => (image.id === updated.id ? updated : image)) },
      }))

    return {
      state,
      listings,
      clinics,
      setBrowseFilters: (filters) =>
        setState((s) => {
          const sameTags = s.tags.length === filters.tags.length && s.tags.every((tag, index) => tag === filters.tags[index])
          if (s.species === filters.species && s.query === filters.query && sameTags) return s
          return { ...s, species: filters.species, query: filters.query, tags: [...filters.tags] }
        }),
      setSpecies: (species) => patch({ species, tags: [] }),
      setQuery: (query) => patch({ query }),
      toggleTag: (tag) =>
        setState((s) => ({
          ...s,
          tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
        })),
      clearFilters: () => patch({ tags: [], query: '' }),
      toggleSave: (id) => {
        const result = mutations.toggleSavedListing({ listingId: id })
        if (!result.ok) {
          showToast(result.error.message)
          return
        }
        setState((s) => ({
          ...s,
          saved: result.data.saved ? [...new Set([...s.saved, id])] : s.saved.filter((savedId) => savedId !== id),
        }))
      },
      openDetail: (id) => patch({ overlay: 'detail', detailId: id }),
      closeDetail: () => patch({ overlay: null, detailId: null }),
      openAuth: (intent, applyId) => patch({ overlay: 'auth', authIntent: intent, pendingApplyId: applyId ?? null }),
      closeAuth: () => patch({ overlay: null }),
      googleSignIn: () =>
        setState((s) => {
          if (s.authIntent === 'apply' && s.pendingApplyId) {
            const listing = listings.find((item) => item.id === s.pendingApplyId)
            return {
              ...s,
              user: mockUser,
              overlay: 'inquiry',
              inquiry: { listingId: s.pendingApplyId, message: inquiryDraft(listing?.name ?? '') },
              pendingApplyId: null,
              authIntent: 'add',
            }
          }
          return {
            ...s,
            user: mockUser,
            overlay: 'add',
            addDone: false,
            addedName: '',
            add: { ...emptyAdd },
          }
        }),
      signOut: () => patch({ user: null, overlay: null }),
      applyToAdopt: (id) =>
        setState((s) => {
          const listing = listings.find((item) => item.id === id)
          if (s.user) {
            return { ...s, overlay: 'inquiry', inquiry: { listingId: id, message: inquiryDraft(listing?.name ?? '') } }
          }
          return { ...s, overlay: 'auth', authIntent: 'apply', pendingApplyId: id }
        }),
      setInquiryMessage: (msg) => setState((s) => ({ ...s, inquiry: { ...s.inquiry, message: msg } })),
      cancelInquiry: () => setState((s) => ({ ...s, overlay: s.detailId ? 'detail' : null })),
      sendInquiry: () => {
        const listingId = state.inquiry.listingId
        const listing = listings.find((item) => item.id === listingId)
        if (!listingId || !listing || !state.user) return

        const result = mutations.createInquiry({
          request: {
            listingId,
            message: state.inquiry.message,
          },
        })
        if (!result.ok) {
          showToast(result.error.message)
          return
        }

        const recipient = listing.org ?? listing.lister ?? 'the lister'
        const inquiryEntry = createInquiryViewModel({
          key: result.data.inquiry.id,
          listing,
          message: state.inquiry.message,
          recipient,
          verified: listing.verified,
        })

        setState((s) => ({
          ...s,
          inquiries: [inquiryEntry, ...s.inquiries],
          applied: [...new Set([...s.applied, listingId])],
          overlay: 'detail',
        }))
        showToast(`Inquiry sent to ${recipient}`)
      },
      reportListing: () => showToast('Listing reported — thank you'),
      openAdd: () =>
        setState((s) =>
          s.user
            ? { ...s, overlay: 'add', addDone: false, addedName: '', add: { ...emptyAdd } }
            : { ...s, overlay: 'auth', authIntent: 'add' },
        ),
      closeAdd: () => patch({ overlay: null, addDone: false }),
      patchAdd: setAdd,
      addListingImages: async (files) => {
        const remaining = MAX_LISTING_IMAGES - state.add.images.length
        const accepted = files.slice(0, Math.max(0, remaining))
        if (accepted.length < files.length) {
          showToast(`Up to ${MAX_LISTING_IMAGES} photos per listing`)
        }
        if (accepted.length === 0) return

        const drafts = accepted.map((file) => createMediaDraft(file))
        setState((s) => ({ ...s, add: { ...s.add, images: [...s.add.images, ...drafts] } }))

        await Promise.all(
          drafts.map(async (draft, index) => {
            patchListingImage(await uploadDraft(draft, accepted[index], 'listing-image'))
          }),
        )
      },
      removeListingImage: (id) =>
        setState((s) => {
          const image = s.add.images.find((item) => item.id === id)
          if (image) revokePreviewUrl(image.previewUrl)
          return { ...s, add: { ...s.add, images: s.add.images.filter((item) => item.id !== id) } }
        }),
      toggleAddTag: (tag) =>
        setState((s) => ({
          ...s,
          add: {
            ...s.add,
            tags: s.add.tags.includes(tag) ? s.add.tags.filter((t) => t !== tag) : [...s.add.tags, tag],
          },
        })),
      submitListing: () => {
        const add = state.add
        if (!add.name.trim()) {
          showToast('Add a name first')
          return
        }
        if (!add.age.trim()) {
          showToast('Add an age')
          return
        }
        if (!add.area.trim()) {
          showToast('Add a location')
          return
        }
        if (add.images.some((image) => image.status === 'uploading')) {
          showToast('Photos are still uploading')
          return
        }

        const result = mutations.createListing({
          actorUserId: state.user?.name ?? null,
          request: {
            species: add.species,
            birdSpecies: add.species === 'bird' && isBirdSpecies(add.breed) ? add.breed : undefined,
            name: add.name.trim(),
            ageText: add.age.trim(),
            sex: 'unknown',
            areaLabel: add.area.trim(),
            story: add.desc.trim(),
            tagIds: add.tags.map((tag) => backend.getTagId(tag)),
            imageObjectKeys: add.images
              .filter(
                (image): image is MediaDraft & { objectKey: string } =>
                  image.status === 'ready' && image.objectKey !== null,
              )
              .map((image) => image.objectKey),
          },
        })
        if (!result.ok) {
          showToast(result.error.message)
          return
        }

        syncListing(mapListingDetailToListing(result.data.listing))
        patch({ addDone: true, addedName: result.data.listing.name })
      },
      openMod: () => patch({ overlay: 'mod' }),
      closeMod: () => patch({ overlay: null }),
      approveListing: (id) => {
        const listing = transitionListing(id, 'approved')
        if (listing) showToast(`${listing.name} is now live`)
      },
      rejectListing: (id) => {
        const listing = transitionListing(id, 'rejected')
        if (listing) showToast(`${listing.name} rejected`)
      },
      markAdopted: (id) => {
        const listing = transitionListing(id, 'adopted')
        if (listing) showToast(`${listing.name} marked as adopted`)
      },
      patchRep: setRep,
      useMyLocation: () => setRep({ area: 'Maafannu, Malé' }),
      setReportPhoto: async (file) => {
        const draft = createMediaDraft(file)
        setRep({ photo: draft })
        const uploaded = await uploadDraft(draft, file, 'report-photo')
        setState((s) => (s.rep.photo?.id === draft.id ? { ...s, rep: { ...s.rep, photo: uploaded } } : s))
      },
      removeReportPhoto: () =>
        setState((s) => {
          if (s.rep.photo) revokePreviewUrl(s.rep.photo.previewUrl)
          return { ...s, rep: { ...s.rep, photo: null } }
        }),
      submitReport: () => {
        const report = state.rep
        if (report.photo?.status === 'uploading') {
          showToast('Photo is still uploading')
          return
        }
        if (!report.area.trim()) {
          showToast('Add a report location')
          return
        }
        if (!report.desc.trim()) {
          showToast('Add identifying details')
          return
        }
        if (report.species === 'bird' && !report.birdSpecies) {
          showToast('Choose the bird species')
          return
        }
        const birdSpecies: BirdSpecies | undefined =
          report.species === 'bird' && report.birdSpecies !== '' ? report.birdSpecies : undefined
        const result = mutations.createReport({
          request: {
            reportKind: report.kind,
            species: report.species,
            birdSpecies,
            reporterName: state.user?.name,
            reporterEmail: state.user?.email,
            areaLabel: report.area.trim(),
            description: report.desc.trim(),
            photoObjectKey: report.photo?.objectKey ?? undefined,
          },
        })
        if (!result.ok) {
          showToast(result.error.message)
          return
        }
        patch({
          reportDone: true,
          reportReceipt: {
            routedTo: backend.getOrganizationName(result.data.report.routedToOrganizationId) ?? 'Partner organisation',
            referenceCode: result.data.report.referenceCode,
          },
        })
      },
      resetReport: () => patch({ reportDone: false, reportReceipt: null, rep: { ...emptyRep } }),
      callClinic: (name) => showToast(`Calling ${name}…`),
      directionsClinic: () => showToast('Opening directions…'),
      setInboxView: (view) => patch({ inboxView: view }),
      obNext: () => setState((s) => (s.obStep >= 2 ? { ...s, onboarded: true } : { ...s, obStep: s.obStep + 1 })),
      obSkip: () => patch({ onboarded: true }),
      installAdd: () => {
        patch({ installed: true })
        showToast('Added to your Home Screen')
      },
      installDismiss: () => patch({ installDismissed: true }),
      showToast,
    }
  }, [backend, mockUser, state, listings, clinics, mutations, patch, showToast, syncListing, transitionListing])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

function createMediaDraft(file: File): MediaDraft {
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    previewUrl: toPreviewUrl(file),
    objectKey: null,
    status: 'uploading',
  }
}

function toPreviewUrl(file: File): string {
  try {
    return URL.createObjectURL(file)
  } catch {
    return ''
  }
}

function revokePreviewUrl(previewUrl: string): void {
  if (!previewUrl) return
  try {
    URL.revokeObjectURL(previewUrl)
  } catch {
    /* ignore */
  }
}

export function listMeta(l: Listing): string {
  return l.species === 'cat' ? `${l.age} · ${l.sex}` : `${l.breed} · ${l.age}`
}

export function detailMeta(l: Listing): string {
  const city = l.area.split(',')[0]
  return l.species === 'cat' ? `${l.age} · ${l.sex} · ${city}` : `${l.breed} · ${l.age} · ${city}`
}

export function orgLine(l: Listing): string {
  return l.org ? l.org : `Listed by ${l.lister}`
}
