import { describe, expect, it } from 'vitest'

import { createInMemoryAsyncBackend } from '../../../../src/server/runtime/app-backend'
import { createDurableBackend } from '../../../../src/server/runtime/durable-backend'
import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'
import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import { DEMO_MODERATOR_USER, DEMO_VIEWER_USER } from '../../../../src/server/runtime/demo-identity'
import { useMiniflareD1 } from '../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-durable-backend-test-db')

function createBackend(db: Parameters<typeof createDurableBackend>[0]['database']) {
  return createDurableBackend({ database: db, fallback: createInMemoryAsyncBackend(createPrototypeBackend()) })
}

describe('createDurableBackend', () => {
  it('browses the seeded live listings from D1', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const cats = await backend.browseListings({ query: { species: 'cat' } })
    expect(cats.ok && cats.data.items.map((item) => item.id)).toContain('mishka')

    const detail = await backend.getListingDetail({ slugOrId: 'mishka' })
    expect(detail.ok && detail.data.item.name).toBe('Mishka')
  }, 15_000)

  it('persists a save so a fresh backend still lists it', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const toggled = await backend.toggleSavedListing({ listingId: 'mishka', viewerId: DEMO_VIEWER_USER.id })
    expect(toggled.ok && toggled.data.saved).toBe(true)

    const fresh = createBackend(db)
    const saved = await fresh.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(saved.ok && saved.data.items.map((item) => item.id)).toEqual(['mishka'])
  }, 15_000)

  it('hydrates the app shell with durable listings and seed clinics', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const shell = await backend.hydrateAppShell({ viewerId: DEMO_VIEWER_USER.id })
    expect(shell.listings.some((listing) => listing.id === 'mishka')).toBe(true)
    expect(shell.clinics.length).toBeGreaterThan(0)
  }, 15_000)

  it('persists a created listing so a fresh backend sees it in the owner read model', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const created = await createBackend(db).createListing({
      actorUserId: DEMO_VIEWER_USER.id,
      request: {
        species: 'cat',
        name: 'Nala',
        ageText: '2 years',
        sex: 'female',
        areaLabel: 'Maafannu, Malé',
        story: 'Gentle indoor cat.',
        tagIds: [],
        imageObjectKeys: [],
      },
    })
    expect(created.ok).toBe(true)

    const you = await createBackend(db).getYouReadModel({ viewerId: DEMO_VIEWER_USER.id })
    expect(you.ok && you.data.ownedListings.map((listing) => listing.name)).toContain('Nala')

    // The create fabricates a synthetic owner record from the actor id; persisting
    // it must NOT overwrite the seeded viewer's real profile.
    const nala = you.ok ? you.data.ownedListings.find((listing) => listing.name === 'Nala') : undefined
    expect(nala?.listedBy.displayName).toBe(DEMO_VIEWER_USER.displayName)
  }, 15_000)

  it('persists a moderation transition so a fresh backend reads the new status', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db }) // includes the seeded pending listing 'pending-simba'

    const result = await createBackend(db).moderateListing({
      listingId: 'pending-simba',
      actorUserId: DEMO_MODERATOR_USER.id,
      request: { action: 'approved' },
    })
    expect(result.ok).toBe(true)

    const detail = await createBackend(db).getListingDetail({ slugOrId: 'pending-simba' })
    expect(detail.ok && detail.data.item.status).toBe('live')
  }, 15_000)

  it('persists an adoption inquiry visible in the sender read model', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const sent = await createBackend(db).createInquiry({
      viewerId: DEMO_VIEWER_USER.id,
      request: { listingId: 'mishka', message: 'Could we visit Mishka this week?' },
    })
    expect(sent.ok).toBe(true)

    const you = await createBackend(db).getYouReadModel({ viewerId: DEMO_VIEWER_USER.id })
    expect(you.ok && you.data.sentAdoptionInquiries.map((inquiry) => inquiry.listingId)).toContain('mishka')
  }, 15_000)

  it('persists a lost/found report with a routed organization and reference code', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const result = await createBackend(db).createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Malé',
        description: 'Found a tame budgie near the harbour.',
      },
    })
    expect(result.ok && result.data.report.routedToOrganizationId).toBe('org-bird-rescue')
    expect(result.ok && result.data.report.referenceCode).toMatch(/^MV\d+$/)
  }, 15_000)
})
