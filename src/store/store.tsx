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
import { SEED_LISTINGS } from '../data/seed'
import type {
  AuthIntent,
  InboxView,
  Inquiry,
  Listing,
  Overlay,
  Species,
  User,
} from '../types'

/**
 * In-memory app store mirroring the prototype's logic class.
 * Replaces in-memory arrays with backend reads/writes in production; `user`
 * would come from Google auth.
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
  // Report form + its success screen
  rep: ReportForm
  reportDone: boolean
  // Add form + its success screen
  add: AddForm
  addDone: boolean
  addedName: string
}

const MOCK_USER: User = { name: 'Aishath Ali', email: 'aishath.ali@gmail.com' }

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

// First-launch flags persist across reloads (README §Onboarding / §Install).
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

function initialState(): AppState {
  const flags = loadFlags()
  return {
    species: 'cat',
    query: '',
    tags: [],
    saved: [],
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
  // browse
  setSpecies: (species: Species) => void
  setQuery: (query: string) => void
  toggleTag: (tag: string) => void
  clearFilters: () => void
  toggleSave: (id: string) => void
  openDetail: (id: string) => void
  closeDetail: () => void
  // auth
  openAuth: (intent: AuthIntent, applyId?: string) => void
  closeAuth: () => void
  googleSignIn: () => void
  signOut: () => void
  // apply / inquiry
  applyToAdopt: (id: string) => void
  setInquiryMessage: (msg: string) => void
  cancelInquiry: () => void
  sendInquiry: () => void
  reportListing: () => void
  // add listing
  openAdd: () => void
  closeAdd: () => void
  patchAdd: (p: Partial<AddForm>) => void
  toggleAddTag: (tag: string) => void
  submitListing: () => void
  // moderator
  openMod: () => void
  closeMod: () => void
  approveListing: (id: string) => void
  rejectListing: (id: string) => void
  // my listings
  markAdopted: (id: string) => void
  // report
  patchRep: (p: Partial<ReportForm>) => void
  useMyLocation: () => void
  toggleRepPhoto: () => void
  submitReport: () => void
  resetReport: () => void
  // vets
  callClinic: (name: string) => void
  directionsClinic: () => void
  // inbox
  setInboxView: (view: InboxView) => void
  // onboarding
  obNext: () => void
  obSkip: () => void
  // install
  installAdd: () => void
  installDismiss: () => void
  // misc
  showToast: (msg: string) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  // Listings are stateful so status changes (approve / mark-adopted / add) re-render.
  const [listings, setListings] = useState<Listing[]>(() => SEED_LISTINGS.map((l) => ({ ...l })))

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), [])

  // Persist first-launch flags.
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

  const setStatus = useCallback((id: string, status: NonNullable<Listing['status']>) => {
    setListings((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)))
  }, [])

  const store = useMemo<Store>(() => {
    const setAdd = (p: Partial<AddForm>) => setState((s) => ({ ...s, add: { ...s.add, ...p } }))
    const setRep = (p: Partial<ReportForm>) => setState((s) => ({ ...s, rep: { ...s.rep, ...p } }))

    return {
      state,
      listings,
      setSpecies: (species) => patch({ species, tags: [] }),
      setQuery: (query) => patch({ query }),
      toggleTag: (tag) =>
        setState((s) => ({
          ...s,
          tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
        })),
      clearFilters: () => patch({ tags: [], query: '' }),
      toggleSave: (id) =>
        setState((s) => ({
          ...s,
          saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
        })),
      openDetail: (id) => patch({ overlay: 'detail', detailId: id }),
      closeDetail: () => patch({ overlay: null, detailId: null }),

      openAuth: (intent, applyId) =>
        patch({ overlay: 'auth', authIntent: intent, pendingApplyId: applyId ?? null }),
      closeAuth: () => patch({ overlay: null }),
      googleSignIn: () =>
        setState((s) => {
          if (s.authIntent === 'apply' && s.pendingApplyId) {
            const d = listings.find((l) => l.id === s.pendingApplyId)
            return {
              ...s,
              user: MOCK_USER,
              overlay: 'inquiry',
              inquiry: { listingId: s.pendingApplyId, message: inquiryDraft(d?.name ?? '') },
              pendingApplyId: null,
              authIntent: 'add',
            }
          }
          return {
            ...s,
            user: MOCK_USER,
            overlay: 'add',
            addDone: false,
            addedName: '',
            add: { ...emptyAdd },
          }
        }),
      signOut: () => patch({ user: null, overlay: null }),

      // Auth-gated: signed-in opens the inquiry composer; otherwise sign-in runs first.
      applyToAdopt: (id) =>
        setState((s) => {
          const d = listings.find((l) => l.id === id)
          if (s.user) {
            return { ...s, overlay: 'inquiry', inquiry: { listingId: id, message: inquiryDraft(d?.name ?? '') } }
          }
          return { ...s, overlay: 'auth', authIntent: 'apply', pendingApplyId: id }
        }),
      setInquiryMessage: (msg) => setState((s) => ({ ...s, inquiry: { ...s.inquiry, message: msg } })),
      cancelInquiry: () => setState((s) => ({ ...s, overlay: s.detailId ? 'detail' : null })),
      sendInquiry: () =>
        setState((s) => {
          const id = s.inquiry.listingId
          const d = listings.find((l) => l.id === id)
          if (!d || !id) return s
          const who = d.org ?? d.lister ?? 'the lister'
          const entry: Inquiry = {
            key: 'q' + Date.now(),
            listingId: id,
            name: d.name,
            to: d.org ? d.org : `Listed by ${d.lister}`,
            verified: d.verified,
            message: s.inquiry.message,
            isCat: d.species === 'cat',
            isBird: d.species === 'bird',
            tint: d.tint,
            status: 'Awaiting reply',
          }
          showToast('Inquiry sent to ' + who)
          return {
            ...s,
            inquiries: [entry, ...s.inquiries],
            applied: [...new Set([...s.applied, id])],
            overlay: 'detail',
          }
        }),
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
            tags: s.add.tags.includes(tag)
              ? s.add.tags.filter((t) => t !== tag)
              : [...s.add.tags, tag],
          },
        })),
      submitListing: () =>
        setState((s) => {
          const a = s.add
          if (!a.name.trim()) {
            showToast('Add a name first')
            return s
          }
          const item: Listing = {
            id: 'u' + Date.now(),
            species: a.species,
            name: a.name,
            age: a.age || 'Unknown age',
            sex: 'Unknown',
            area: a.area || 'Malé',
            tags: a.tags.slice(),
            org: null,
            lister: s.user?.name ?? 'You',
            verified: false,
            tint: a.species === 'cat' ? '#EFEAF7' : '#E3F3EC',
            status: 'pending',
            story: a.desc || '',
            breed: a.species === 'bird' ? a.breed : undefined,
          }
          setListings((ls) => [...ls, item])
          return { ...s, addDone: true, addedName: a.name }
        }),

      openMod: () => patch({ overlay: 'mod' }),
      closeMod: () => patch({ overlay: null }),
      approveListing: (id) => {
        const d = listings.find((l) => l.id === id)
        setStatus(id, 'live')
        showToast((d?.name ?? 'Listing') + ' is now live')
      },
      rejectListing: (id) => {
        const d = listings.find((l) => l.id === id)
        setStatus(id, 'rejected')
        showToast((d?.name ?? 'Listing') + ' rejected')
      },

      markAdopted: (id) => {
        const d = listings.find((l) => l.id === id)
        setStatus(id, 'adopted')
        showToast((d?.name ?? 'Listing') + ' marked as adopted')
      },

      patchRep: setRep,
      useMyLocation: () => setRep({ area: 'Maafannu, Malé' }),
      toggleRepPhoto: () => setState((s) => ({ ...s, rep: { ...s.rep, photo: true } })),
      submitReport: () => patch({ reportDone: true }),
      resetReport: () => patch({ reportDone: false, rep: { ...emptyRep } }),

      callClinic: (name) => showToast(`Calling ${name}…`),
      directionsClinic: () => showToast('Opening directions…'),

      setInboxView: (view) => patch({ inboxView: view }),

      obNext: () =>
        setState((s) => (s.obStep >= 2 ? { ...s, onboarded: true } : { ...s, obStep: s.obStep + 1 })),
      obSkip: () => patch({ onboarded: true }),

      installAdd: () => {
        patch({ installed: true })
        showToast('Added to your Home Screen')
      },
      installDismiss: () => patch({ installDismissed: true }),

      showToast,
    }
  }, [state, listings, patch, showToast, setStatus])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

/** Display meta line for a listing: cats → "age · sex", birds → "breed · age". */
export function listMeta(l: Listing): string {
  return l.species === 'cat' ? `${l.age} · ${l.sex}` : `${l.breed} · ${l.age}`
}

/** Detail meta line: includes the area's city. */
export function detailMeta(l: Listing): string {
  const city = l.area.split(',')[0]
  return l.species === 'cat'
    ? `${l.age} · ${l.sex} · ${city}`
    : `${l.breed} · ${l.age} · ${city}`
}

export function orgLine(l: Listing): string {
  return l.org ? l.org : `Listed by ${l.lister}`
}
