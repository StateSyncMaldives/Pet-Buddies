import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { colors } from '../theme'
import { useStore } from '../store/store'
import { BIRD_FILTERS, CAT_FILTERS } from '../data/seed'
import type { Listing } from '../types'
import type { ListingSummary } from '../server/contracts/api'
import type { BrowseSearch } from '../router/browse-search'
import { normalizeBrowseSearchUrl, toTagSlug } from '../router/browse-search'
import { mapListingSummaryToListing } from '../store/view-model-mappers'
import { ROUTE_PATHS } from '../router/paths'
import { LogoMark, Wordmark } from '../components/Brand'
import { ListingCard } from '../components/ListingCard'
import { Hero } from '../components/Hero'
import { Segmented } from '../components/Segmented'
import { PlusIcon, SearchIcon, ShieldIcon } from '../components/icons'

const HIDDEN: Listing['status'][] = ['pending', 'rejected', 'adopted']

export function Browse({ search, serverListings }: { search: BrowseSearch; serverListings?: ListingSummary[] }) {
  const navigate = useNavigate()
  const { state, listings, setBrowseFilters, openMod, openAdd } = useStore()
  const isCat = state.species === 'cat'
  const searchTagsKey = search.tags.join('\0')
  const serverFeed = useMemo(
    () => serverListings?.map(mapListingSummaryToListing),
    [serverListings],
  )

  useEffect(() => {
    setBrowseFilters(search)
  }, [search.species, search.query, searchTagsKey, setBrowseFilters, search])

  const updateSearch = (next: BrowseSearch) => {
    void navigate({
      to: ROUTE_PATHS.browse,
      search: normalizeBrowseSearchUrl(next),
    })
  }

  const setSpecies = (species: BrowseSearch['species']) => updateSearch({ species, query: state.query, tags: [] })
  const setQuery = (query: string) => updateSearch({ species: state.species, query, tags: state.tags })
  const toggleTag = (tag: string) =>
    updateSearch({
      species: state.species,
      query: state.query,
      tags: state.tags.includes(tag) ? state.tags.filter((item) => item !== tag) : [...state.tags, tag],
    })
  const clearFilters = () => updateSearch({ species: state.species, query: '', tags: [] })

  const pendingCount = useMemo(
    () => listings.filter((l) => l.status === 'pending').length,
    [listings],
  )

  // Feed = visible status ∧ species ∧ all active tags ∧ search (name/breed/area/tags).
  const localFeed = useMemo(() => {
    const q = state.query.trim().toLowerCase()
    const selectedTagSlugs = state.tags.map(toTagSlug)
    return listings
      .filter((l) => !HIDDEN.includes(l.status))
      .filter((l) => l.species === state.species)
      .filter((l) => selectedTagSlugs.every((tag) => l.tags.map(toTagSlug).includes(tag)))
      .filter((l) => {
        if (!q) return true
        const hay = `${l.name} ${l.breed ?? ''} ${l.area} ${l.tags.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
  }, [listings, state.species, state.tags, state.query])
  const feed = serverFeed ?? localFeed

  const filters = isCat ? CAT_FILTERS : BIRD_FILTERS
  const speciesPlural = isCat ? 'cats' : 'birds'

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

      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          background: '#fff',
          border: `1.5px solid ${colors.line}`,
          borderRadius: 13,
          padding: '11px 14px',
          marginBottom: 16,
        }}
      >
        <SearchIcon size={17} />
        <input
          value={state.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, breed, area…"
          style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: colors.ink }}
        />
      </div>

      {/* Species segmented */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={['Cats', 'Birds']}
          activeIndex={isCat ? 0 : 1}
          onSelect={(i) => setSpecies(i === 0 ? 'cat' : 'bird')}
        />
      </div>

      {/* Filter chips */}
      <div
        className="pbscroll"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px 20px', padding: '2px 20px' }}
      >
        {filters.map((label) => {
          const active = state.tags.includes(label)
          return (
            <button
              key={label}
              onClick={() => toggleTag(label)}
              style={{
                flex: 'none',
                border: `1.5px solid ${active ? colors.deepBlue : '#d8dce4'}`,
                background: active ? colors.deepBlue : '#fff',
                color: active ? '#fff' : '#6b7280',
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Count line */}
      {feed.length > 0 && (
        <div style={{ fontSize: 12.5, color: colors.faint, fontWeight: 600, marginBottom: 12 }}>
          {feed.length} {isCat ? 'cat' : 'bird'}
          {feed.length === 1 ? '' : 's'} available
        </div>
      )}

      {/* Feed — 2-up grid */}
      {feed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {feed.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {feed.length === 0 && (
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
            onClick={clearFilters}
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
      )}
    </div>
  )
}
