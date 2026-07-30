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
import { isSignedIn, type Viewer } from '../server/auth/resolve-viewer'
import type { HydratedAppShell } from '../server/runtime/app-backend'
import { MAX_LISTING_IMAGES } from '../server/domain/listings/create-listing'
import type { MediaUploadKind } from '../server/domain/media/media-upload-policy'
import type { AppMutationAdapter } from '../server/mutations/mutation-adapter'
import { toTagSlug } from '../router/browse-search'
import { isBirdSpecies, type BirdSpecies } from '../server/contracts/api'
import { createInquiryViewModel, mapClinicSummaryToClinic, mapListingDetailToListing } from './view-model-mappers'
import type {
  Clinic,
  InboxView,
  Inquiry,
  Listing,
  Overlay,
  Species,
  User,
} from '../types'

// Lost/found reports route to one of two fixed partner organisations (see
// report-routing). Their display names for the receipt, resolved client-side
// now that the store no longer holds a synchronous backend.
const ROUTED_ORGANIZATION_NAMES: Record<string, string> = {
  'org-cat-rescue': 'Maldives Cat Rescue',
  'org-bird-rescue': 'Zoophilist Society Maldives',
}

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

// SSR-safe initial state: it must NOT read localStorage, because the server
// renders with defaults and the client's first (hydration) render must match
// byte-for-byte. Persisted flags and drafts are loaded from localStorage after
// mount (see the effect in StoreProvider) — reading them here caused a
// hydration mismatch that made React discard the SSR tree and re-render the
// whole root, which in turn dropped the precedence-managed stylesheet.
function initialState(initialSaved: string[]): AppState {
  return {
    species: 'cat',
    query: '',
    tags: [],
    saved: [...initialSaved],
    applied: [],
    overlay: null,
    detailId: null,
    user: null,
    inquiries: [],
    inquiry: { listingId: null, message: '' },
    inboxView: 'sent',
    onboarded: false,
    obStep: 0,
    installed: false,
    installDismissed: false,
    toast: '',
    rep: { ...emptyRep },
    reportDone: false,
    reportReceipt: null,
    add: { ...emptyAdd },
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
  toggleSave: (id: string) => Promise<void>
  openDetail: (id: string) => void
  closeDetail: () => void
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
  approveListing: (id: string) => Promise<void>
  rejectListing: (id: string) => Promise<void>
  markAdopted: (id: string) => Promise<void>
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
  /** Who is browsing, resolved from the real session by `__root` (ADR 0010). */
  viewer: Viewer
  /**
   * Called instead of firing a gated action when nobody is signed in. `__root`
   * points this at `/sign-in`, carrying the current path as `redirect`.
   */
  onRequireSignIn?: () => void
  /** Write seam (durable server functions on the client; in-memory in tests). */
  mutations: AppMutationAdapter
  /**
   * Durable read seam. When provided, the store reconciles listings, clinics,
   * and saved ids from this D1-backed app-shell read after
   * mount — so the store cannot drift from the data the loaders read. Omitted in
   * tests that only exercise optimistic writes. See ADR 0008 / #8.
   */
  hydrate?: (viewerId?: string) => Promise<HydratedAppShell>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children, viewer, mutations, hydrate, onRequireSignIn }: StoreProviderProps) {
  const viewerId = isSignedIn(viewer) ? viewer.id : undefined
  // Moderation writes are attributed to the acting viewer; the server re-derives
  // the actor from the session and enforces the moderate permission (B2).
  const moderatorId = viewerId
  const viewerUser = useMemo<User | null>(
    () => (isSignedIn(viewer) ? { name: viewer.displayName, email: viewer.email } : null),
    [viewer],
  )
  const [state, setState] = useState<AppState>(() => initialState([]))
  const [listings, setListings] = useState<Listing[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])

  // The signed-in user is the session viewer, not something the UI sets. Kept
  // out of the initial state so SSR and the first client render agree; the
  // viewer arrives through router context, which is resolved server-side.
  useEffect(() => {
    setState((s) => (s.user === viewerUser ? s : { ...s, user: viewerUser }))
  }, [viewerUser])

  // Load persisted flags + drafts from localStorage after mount (client-only).
  // Kept out of the initial render so SSR and the first client render match —
  // see initialState.
  useEffect(() => {
    const flags = loadFlags()
    const drafts = loadDrafts()
    setState((s) => ({
      ...s,
      onboarded: flags.onboarded,
      installed: flags.installed,
      installDismissed: flags.installDismissed,
      rep: drafts.rep,
      add: drafts.add,
    }))
  }, [])

  // Reconcile against the durable app-shell read once
  // after mount: durable listings/clinics are the source of truth, so screens
  // that read the store (Saved, You, Moderation) match the loader-read data
  // instead of static seed data. Client-only and post-hydration, so the first
  // paint stays deterministic and there is no hydration mismatch. See #8.
  useEffect(() => {
    if (!hydrate) return
    let cancelled = false

    void hydrate(viewerId)
      .then((shell) => {
        if (cancelled) return
        const durable = shell.listings.map(mapListingDetailToListing)
        setListings((current) => {
          const durableIds = new Set(durable.map((listing) => listing.id))
          // Durable rows win; keep any store-only rows (e.g. an optimistic
          // create that raced the reconcile) so nothing is dropped.
          const localOnly = current.filter((listing) => !durableIds.has(listing.id))
          return [...durable.map((listing) => ({ ...listing, tags: [...listing.tags] })), ...localOnly]
        })
        setClinics(shell.clinics.map(mapClinicSummaryToClinic).map((clinic) => ({ ...clinic, services: [...clinic.services] })))
        setState((s) => ({ ...s, saved: shell.listings.filter((listing) => listing.savedByViewer).map((listing) => listing.id) }))
      })
      .catch((error) => {
        // Surface (don't swallow) durable-read failures: the store then stays on
        // its optimistic data, which can silently drift from the server.
        console.error('Durable app-shell read failed; store not reconciled.', error)
      })

    return () => {
      cancelled = true
    }
  }, [hydrate, viewerId])

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
    async (id: string, action: 'approved' | 'rejected' | 'adopted') => {
      if (!moderatorId) {
        showToast('Sign in to moderate listings.')
        return null
      }
      const result = await mutations.updateListingLifecycle({
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
      toggleSave: async (id) => {
        // Saving is viewer-owned, so an anonymous visitor goes to sign-in
        // rather than firing a mutation the server would refuse.
        if (!viewerUser) {
          onRequireSignIn?.()
          return
        }
        // Optimistic toggle for instant feedback; reconcile / revert on the result.
        setState((s) => ({
          ...s,
          saved: s.saved.includes(id) ? s.saved.filter((savedId) => savedId !== id) : [...new Set([...s.saved, id])],
        }))
        const result = await mutations.toggleSavedListing({ listingId: id })
        if (!result.ok) {
          showToast(result.error.message)
          setState((s) => ({
            ...s,
            saved: s.saved.includes(id) ? s.saved.filter((savedId) => savedId !== id) : [...new Set([...s.saved, id])],
          }))
          return
        }
        setState((s) => ({
          ...s,
          saved: result.data.saved ? [...new Set([...s.saved, id])] : s.saved.filter((savedId) => savedId !== id),
        }))
      },
      openDetail: (id) => patch({ overlay: 'detail', detailId: id }),
      closeDetail: () => patch({ overlay: null, detailId: null }),
      applyToAdopt: (id) => {
        if (!viewerUser) {
          onRequireSignIn?.()
          return
        }
        setState((s) => {
          const listing = listings.find((item) => item.id === id)
          return { ...s, overlay: 'inquiry', inquiry: { listingId: id, message: inquiryDraft(listing?.name ?? '') } }
        })
      },
      setInquiryMessage: (msg) => setState((s) => ({ ...s, inquiry: { ...s.inquiry, message: msg } })),
      cancelInquiry: () => setState((s) => ({ ...s, overlay: s.detailId ? 'detail' : null })),
      sendInquiry: async () => {
        const listingId = state.inquiry.listingId
        const listing = listings.find((item) => item.id === listingId)
        if (!listingId || !listing || !state.user) return

        const result = await mutations.createInquiry({
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
      openAdd: () => {
        if (!viewerUser) {
          onRequireSignIn?.()
          return
        }
        setState((s) => ({ ...s, overlay: 'add', addDone: false, addedName: '', add: { ...emptyAdd } }))
      },
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
      submitListing: async () => {
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

        const result = await mutations.createListing({
          actorUserId: state.user?.name ?? null,
          request: {
            species: add.species,
            birdSpecies: add.species === 'bird' && isBirdSpecies(add.breed) ? add.breed : undefined,
            name: add.name.trim(),
            ageText: add.age.trim(),
            sex: 'unknown',
            areaLabel: add.area.trim(),
            story: add.desc.trim(),
            tagIds: add.tags.map((tag) => toTagSlug(tag)),
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
      approveListing: async (id) => {
        const listing = await transitionListing(id, 'approved')
        if (listing) showToast(`${listing.name} is now live`)
      },
      rejectListing: async (id) => {
        const listing = await transitionListing(id, 'rejected')
        if (listing) showToast(`${listing.name} rejected`)
      },
      markAdopted: async (id) => {
        const listing = await transitionListing(id, 'adopted')
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
      submitReport: async () => {
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
        const result = await mutations.createReport({
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
            routedTo: ROUTED_ORGANIZATION_NAMES[result.data.report.routedToOrganizationId] ?? 'Partner organisation',
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
  }, [viewerUser, state, listings, clinics, mutations, patch, showToast, syncListing, transitionListing])

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
