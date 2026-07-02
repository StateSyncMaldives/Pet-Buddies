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

const DEFAULT_MODERATOR_ID = 'moderator-demo'

/**
 * In-memory app store mirroring the prototype's logic class.
 * Uses the server-backed runtime façade so UI flows now mutate the same typed
 * backend use cases the future TanStack Start app shell will call.
 */
export interface ReportForm {
  kind: 'lost' | 'found'
  species: Species
  area: string
  desc: string
  photo: boolean
}

export interface AddForm {
  species: Species
  name: string
  age: string
  area: string
  breed: string
  desc: string
  tags: string[]
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
}

const emptyRep: ReportForm = { kind: 'lost', species: 'cat', area: '', desc: '', photo: false }

const LS_KEY = 'petbuddies.flags'
function loadFlags(): { onboarded: boolean; installed: boolean; installDismissed: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { onboarded: false, installed: false, installDismissed: false, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { onboarded: false, installed: false, installDismissed: false }
}

function initialState(initialSaved: string[]): AppState {
  const flags = loadFlags()
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
  submitListing: () => void
  openMod: () => void
  closeMod: () => void
  approveListing: (id: string) => void
  rejectListing: (id: string) => void
  markAdopted: (id: string) => void
  patchRep: (p: Partial<ReportForm>) => void
  useMyLocation: () => void
  toggleRepPhoto: () => void
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
}: StoreProviderProps) {
  const hydration = useMemo(() => createInitialHydration(backend, viewerId), [backend, viewerId])
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

  const showToast = useCallback(
    (msg: string) => {
      patch({ toast: msg })
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => patch({ toast: '' }), 2200)
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
      const result = backend.moderateListing({
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
    [backend, moderatorId, showToast, syncListing],
  )

  const store = useMemo<Store>(() => {
    const setAdd = (p: Partial<AddForm>) => setState((s) => ({ ...s, add: { ...s.add, ...p } }))
    const setRep = (p: Partial<ReportForm>) => setState((s) => ({ ...s, rep: { ...s.rep, ...p } }))

    return {
      state,
      listings,
      clinics,
      setSpecies: (species) => patch({ species, tags: [] }),
      setQuery: (query) => patch({ query }),
      toggleTag: (tag) =>
        setState((s) => ({
          ...s,
          tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
        })),
      clearFilters: () => patch({ tags: [], query: '' }),
      toggleSave: (id) => {
        const result = backend.toggleSavedListing({ listingId: id, viewerId })
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

        const result = backend.createInquiry({
          viewerId,
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

        const result = backend.createListing({
          actorUserId: state.user?.name ?? null,
          request: {
            species: add.species,
            birdSpecies: add.species === 'bird' ? (add.breed as 'Budgerigar' | 'Cockatiel' | 'Lovebird' | 'Finch' | 'Canary') : undefined,
            name: add.name.trim(),
            ageText: add.age.trim() || 'Unknown age',
            sex: 'unknown',
            areaLabel: add.area.trim() || 'Malé',
            story: add.desc.trim(),
            tagIds: add.tags.map((tag) => backend.getTagId(tag)),
            imageObjectKeys: [],
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
      toggleRepPhoto: () => setState((s) => ({ ...s, rep: { ...s.rep, photo: true } })),
      submitReport: () => {
        const result = backend.createReport({
          request: {
            reportKind: state.rep.kind,
            species: state.rep.species,
            birdSpecies: state.rep.species === 'bird' ? 'Budgerigar' : undefined,
            reporterName: state.user?.name,
            reporterEmail: state.user?.email,
            areaLabel: state.rep.area.trim() || 'Maafannu, Malé',
            description: state.rep.desc.trim() || 'No additional description provided.',
            photoObjectKey: state.rep.photo ? 'report-photo/demo-upload.jpg' : undefined,
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
  }, [backend, viewerId, mockUser, state, listings, clinics, patch, showToast, syncListing, transitionListing])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
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
