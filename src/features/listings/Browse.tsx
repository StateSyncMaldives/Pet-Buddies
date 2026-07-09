import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { colors, font } from '../../theme'
import { useViewportMode } from '../../layout/viewport-mode'
import { useStore } from '../../store/store'
import type { Listing, Species } from '../../types'
import type { ListingSummary } from '../../server/contracts/api'
import type { BrowseSearch } from '../../router/browse-search'
import {
  clearFilters,
  filterListings,
  normalizeBrowseSearchUrl,
  setQuery,
  switchSpecies,
  toggleTag,
  traitChipsFor,
} from '../../router/browse-search'
import { mapListingSummaryToListing } from '../../store/view-model-mappers'
import { ROUTE_PATHS } from '../../router/paths'
import { LogoMark, Wordmark } from '../../components/Brand'
import { ListingCard } from './ListingCard'
import { Hero } from '../../components/Hero'
import { FilterChip } from '../../components/FilterChip'
import { BirdIcon, CatIcon, PlusIcon, SearchIcon, ShieldIcon } from '../../components/icons'

// Light pastel washes of the two brand species colors (powderBlue #8FC7E8, blush
// #F2A9C4) — the active species tints the segmented thumb without a saturated fill.
const SPECIES_OPTIONS = [
  { value: 'cat' as const, label: 'Cats', Icon: CatIcon, thumb: '#E9F3FB', accent: colors.deepBlue },
  { value: 'bird' as const, label: 'Birds', Icon: BirdIcon, thumb: '#FBEBF1', accent: colors.wordmarkPink },
]

/** Species-first control: a radiogroup styled as the app's sliding segmented pill. */
function SpeciesRadioGroup({ value, onChange }: { value: Species; onChange: (species: Species) => void }) {
  const activeIndex = value === 'cat' ? 0 : 1
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    if (!forward && !backward) return
    event.preventDefault()
    const next = (activeIndex + (forward ? 1 : -1) + SPECIES_OPTIONS.length) % SPECIES_OPTIONS.length
    optionRefs.current[next]?.focus()
    onChange(SPECIES_OPTIONS[next].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Species"
      style={{ position: 'relative', display: 'flex', background: '#E4E7ED', borderRadius: 13, padding: 4 }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: 'calc(50% - 4px)',
          background: SPECIES_OPTIONS[activeIndex].thumb,
          borderRadius: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,.08)',
          transition: 'transform .25s var(--pb-ease-out), background-color .25s var(--pb-ease-out)',
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 8}px))`,
        }}
      />
      {SPECIES_OPTIONS.map((option, index) => {
        const active = index === activeIndex
        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              border: 'none',
              background: 'none',
              padding: '12px 0',
              fontSize: 14.5,
              fontWeight: 700,
              color: active ? colors.ink : colors.textSecondaryAlt,
              cursor: 'pointer',
            }}
          >
            <option.Icon size={17} stroke={active ? option.accent : colors.faint} strokeWidth={2} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Browse({ search, serverListings }: { search: BrowseSearch; serverListings?: ListingSummary[] }) {
  const navigate = useNavigate()
  const { listings, setBrowseFilters, openMod, openAdd } = useStore()
  const isCat = search.species === 'cat'
  const serverFeed = useMemo(() => serverListings?.map(mapListingSummaryToListing), [serverListings])

  // Keep the store mirror fresh for other surfaces; the menu itself renders from `search`.
  useEffect(() => {
    setBrowseFilters(search)
  }, [search, setBrowseFilters])

  // Live-typed value; the committed query lives in the URL. Debounced so typing
  // neither spams history nor re-runs the route loader per keystroke.
  const [draft, setDraft] = useState(search.query)
  const lastSent = useRef(search.query)
  const searchRef = useRef(search)
  searchRef.current = search
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Resync only on external URL changes (shared link, back/forward), not our own echoes.
    if (search.query !== lastSent.current) {
      setDraft(search.query)
      lastSent.current = search.query
    }
  }, [search.query])

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current) }, [])

  const updateSearch = (next: BrowseSearch, replace = false) =>
    void navigate({ to: ROUTE_PATHS.browse, search: normalizeBrowseSearchUrl(next), replace })

  const onSpecies = (species: Species) => updateSearch(switchSpecies(search, species))
  const onToggleTag = (tag: string) => updateSearch(toggleTag(search, tag))
  const onClearFilters = () => {
    if (debounce.current) clearTimeout(debounce.current)
    setDraft('')
    lastSent.current = ''
    updateSearch(clearFilters(search))
  }
  const onSearchInput = (value: string) => {
    setDraft(value)
    lastSent.current = value
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => updateSearch(setQuery(searchRef.current, value), true), 220)
  }

  const pendingCount = useMemo(() => listings.filter((l) => l.status === 'pending').length, [listings])

  const localFeed = useMemo(() => filterListings(listings, search), [listings, search])
  const feed = serverFeed ?? localFeed

  const chips = useMemo(() => traitChipsFor(search), [search])
  const speciesPlural = isCat ? 'cats' : 'birds'
  const desktop = useViewportMode() === 'desktop'

  const searchField = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: '#fff',
        border: `1.5px solid ${colors.line}`,
        borderRadius: 13,
        padding: '11px 14px',
      }}
    >
      <SearchIcon size={17} />
      <input
        type="search"
        value={draft}
        onChange={(e) => onSearchInput(e.target.value)}
        placeholder="Search name, breed, area…"
        aria-label="Search listings"
        style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: colors.ink }}
      />
    </div>
  )

  const speciesControl = <SpeciesRadioGroup value={search.species} onChange={onSpecies} />

  const filterChips = (
    <div
      className="pbscroll"
      role="group"
      aria-label={`${isCat ? 'Cat' : 'Bird'} trait filters`}
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        margin: desktop ? '12px 0 0' : '0 -20px 20px',
        padding: desktop ? 0 : '2px 20px',
      }}
    >
      {chips.map((chip) => (
        <FilterChip key={chip.slug} label={chip.label} active={chip.active} onToggle={() => onToggleTag(chip.label)} />
      ))}
    </div>
  )

  const countLine =
    feed.length > 0 ? (
      <div
        role="status"
        aria-live="polite"
        style={{ fontSize: 12.5, color: colors.faint, fontWeight: 600, margin: desktop ? '12px 0 0' : '0 0 12px' }}
      >
        {feed.length} {feed.length === 1 ? (isCat ? 'cat' : 'bird') : speciesPlural} available
      </div>
    ) : null

  if (desktop) {
    return (
      <div style={{ padding: '18px 0 90px' }}>
        <h1
          style={{
            fontFamily: font.brand,
            fontSize: 52,
            fontWeight: 700,
            color: colors.ink,
            letterSpacing: '-0.02em',
            textWrap: 'balance',
            margin: '18px 0 6px',
          }}
        >
          Find a buddy
        </h1>
        <p style={{ fontSize: 16, color: colors.textSecondary, margin: '0 0 24px' }}>
          Cats &amp; birds looking for homes in Greater Malé.
        </p>

        {/* Rotating hero: featured pets + promo / sponsor slides */}
        <Hero />

        {/* Sticky listing menu: species row first, then search, then trait chips. */}
        <div className="pb-filterbar">
          {speciesControl}
          <div style={{ marginTop: 12 }}>{searchField}</div>
          {filterChips}
        </div>
        {countLine}

        <BrowseFeed feed={feed} desktop speciesPlural={speciesPlural} onClearFilters={onClearFilters} />
      </div>
    )
  }

  return (
    <div style={{ padding: '6px 20px 110px' }}>
      {/* Header: logo + moderator shield + add — sticky so it stays while the feed scrolls */}
      <div
        style={{
          position: 'sticky',
          top: 'var(--pb-sticky-top, 0px)',
          zIndex: 10,
          margin: '0 -20px 14px',
          padding: '8px 20px 12px',
          background: 'rgba(247,248,250,.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <LogoMark width={38} height={31} />
          <Wordmark size={19} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={openMod}
            aria-label="Review queue"
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.paper,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ShieldIcon size={18} stroke={colors.textSecondary} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  borderRadius: 9,
                  background: colors.wordmarkPink,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #F7F8FA',
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={openAdd}
            aria-label="Add a listing"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.deepBlue,
              border: 'none',
              boxShadow: '0 4px 12px rgba(62,137,190,.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={18} />
          </button>
        </div>
      </div>

      {/* Rotating hero: featured pets + promo / sponsor slides */}
      <Hero />

      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
        Find a buddy
      </h1>
      <p style={{ fontSize: 13.5, color: colors.textSecondary, margin: '0 0 14px' }}>
        Cats &amp; birds looking for homes in Greater Malé.
      </p>

      {/* Listing menu (species-first): species, then search, then trait chips. */}
      <div style={{ marginBottom: 12 }}>{speciesControl}</div>
      <div style={{ marginBottom: 16 }}>{searchField}</div>
      {filterChips}
      {countLine}

      <BrowseFeed feed={feed} speciesPlural={speciesPlural} onClearFilters={onClearFilters} />
    </div>
  )
}

function BrowseFeed({
  feed,
  speciesPlural,
  onClearFilters,
  desktop = false,
}: {
  feed: Listing[]
  speciesPlural: string
  onClearFilters: () => void
  desktop?: boolean
}) {
  if (feed.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '46px 20px 0',
        }}
      >
        <SearchIcon size={44} stroke="#cfd4dc" strokeWidth={1.8} />
        <p style={{ fontSize: 14, color: colors.faint, lineHeight: 1.55, maxWidth: 230, margin: '18px 0 16px' }}>
          No {speciesPlural} match your search yet. Try fewer filters.
        </p>
        <button
          onClick={onClearFilters}
          style={{
            padding: '10px 20px',
            borderRadius: 11,
            border: '1.5px solid #d8dce4',
            background: '#fff',
            color: colors.ink,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr 1fr',
        gap: desktop ? 18 : 12,
        marginTop: desktop ? 22 : 0,
      }}
    >
      {feed.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  )
}
