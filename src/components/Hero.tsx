import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { colors } from '../theme'
import { useStore } from '../store/store'
import { useViewportMode } from '../layout/viewport-mode'
import { listMeta } from '../store/store'
import { browseQuery } from '../query/queries'
import { mapListingSummaryToListing } from '../store/view-model-mappers'
import { getDetailPath } from '../router/paths'
import type { BrowseSearchUrl } from '../router/browse-search'

const HERO_H = 188
const INTERVAL = 4500

/** A promo / advertising slide (campaign, sponsor, donation drive). */
type Promo = {
  id: string
  kicker: string
  title: string
  subtitle: string
  cta: string
  gradient: string
}

const PROMOS: Promo[] = [
  {
    id: 'promo-spay',
    kicker: 'Campaign',
    title: 'Spay & Neuter Week',
    subtitle: 'Subsidised clinics across Malé — book early.',
    cta: 'Learn more',
    gradient: 'linear-gradient(135deg, #3E89BE 0%, #6FB8E0 100%)',
  },
  {
    id: 'promo-foster',
    kicker: 'Get involved',
    title: 'Become a foster',
    subtitle: 'Give a rescue a safe home while they wait.',
    cta: 'Sign up',
    gradient: 'linear-gradient(135deg, #E78FB4 0%, #F2A9C4 100%)',
  },
]

/**
 * Auto-rotating hero carousel for the Browse page. Mixes featured pets (tap →
 * detail) with promo / sponsor slides. Swipeable; pauses while the user touches.
 */
export function Hero() {
  const navigate = useNavigate()
  const { backend } = useRouteContext({ from: '__root__' })
  const { showToast } = useStore()
  const desktop = useViewportMode() === 'desktop'

  // Featured = first few live listings (cross-species, unfiltered) that have a
  // real photo — a showcase independent of the current search. Reads durable
  // truth from the query cache (ADR 0009), not the store mirror.
  const catFeed = useQuery(browseQuery(backend, { species: 'cat', query: '', tags: [] }))
  const birdFeed = useQuery(browseQuery(backend, { species: 'bird', query: '', tags: [] }))
  const featured = [...(catFeed.data?.items ?? []), ...(birdFeed.data?.items ?? [])]
    .map(mapListingSummaryToListing)
    .filter((l) => (l.status ?? 'live') === 'live' && l.photo)
    .slice(0, 3)

  // Interleave: pet, promo, pet, promo, pet …
  const slides: Array<{ kind: 'pet'; id: string } | { kind: 'promo'; id: string }> = []
  featured.forEach((l, i) => {
    slides.push({ kind: 'pet', id: l.id })
    const p = PROMOS[i]
    if (p) slides.push({ kind: 'promo', id: p.id })
  })

  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const paused = useRef(false)

  // Auto-advance — never when the user prefers reduced motion.
  useEffect(() => {
    if (slides.length <= 1) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      if (paused.current) return
      const el = trackRef.current
      if (!el) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, INTERVAL)
    return () => clearInterval(t)
  }, [slides.length])

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  if (slides.length === 0) return null

  // Desktop: taller band, capped width — a full-bleed 188px strip letterboxes
  // the photography the product is supposed to celebrate.
  const heroH = desktop ? 300 : HERO_H

  const goTo = (index: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ margin: desktop ? '0 0 18px' : '0 -20px 18px', maxWidth: desktop ? 780 : undefined }}>
      <div
        ref={trackRef}
        className="pbscroll"
        onScroll={onScroll}
        onPointerDown={() => (paused.current = true)}
        onPointerUp={() => (paused.current = false)}
        onPointerCancel={() => (paused.current = false)}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: 0,
          padding: desktop ? 0 : '0 20px',
          scrollPadding: desktop ? 0 : '0 20px',
        }}
      >
        {slides.map((s) => {
          const l = s.kind === 'pet' ? featured.find((f) => f.id === s.id)! : null
          const promo = s.kind === 'promo' ? PROMOS.find((p) => p.id === s.id)! : null
          return (
            <div
              key={s.id}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'center',
                paddingRight: 10,
                boxSizing: 'border-box',
              }}
            >
              {l ? (
                <button
                  onClick={() => navigate({ to: getDetailPath(l.id), search: (prev: BrowseSearchUrl) => prev })}
                  aria-label={`Featured: ${l.name}`}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: heroH,
                    border: 'none',
                    padding: 0,
                    borderRadius: 20,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: colors.photoTint,
                    display: 'block',
                    textAlign: 'left',
                  }}
                >
                  <img
                    src={l.photo}
                    alt={l.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(20,28,38,.72) 0%, rgba(20,28,38,.1) 45%, transparent 70%)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(255,255,255,.92)',
                      color: colors.deepBlue,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    Featured
                  </span>
                  <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                    <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                      {l.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.88)', marginTop: 2 }}>
                      {listMeta(l)} · {l.area}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => showToast(`${promo!.title} — coming soon`)}
                  aria-label={promo!.title}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: heroH,
                    border: 'none',
                    borderRadius: 20,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: promo!.gradient,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '0 22px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,.85)',
                      marginBottom: 8,
                    }}
                  >
                    {promo!.kicker}
                  </span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', maxWidth: 230 }}>
                    {promo!.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', marginTop: 5, maxWidth: 250, lineHeight: 1.4 }}>
                    {promo!.subtitle}
                  </div>
                  <span
                    style={{
                      marginTop: 14,
                      background: '#fff',
                      color: colors.ink,
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '8px 16px',
                      borderRadius: 999,
                    }}
                  >
                    {promo!.cta}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Dot indicators — real buttons so mouse/keyboard users can drive the carousel. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1} of ${slides.length}`}
            aria-current={i === active || undefined}
            style={{
              border: 'none',
              background: 'none',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === active ? colors.deepBlue : '#cdd3dc',
                transition: 'width .25s var(--pb-ease-out), background-color .25s var(--pb-ease-out)',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
