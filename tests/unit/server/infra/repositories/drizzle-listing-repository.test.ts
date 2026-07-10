import { describe, expect, it } from 'vitest'

import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'
import { seedDurableStore } from '../../../../../src/server/infra/db/seed-durable-store'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-drizzle-listing-repo-test-db')

describe('createDrizzleListingRepository.browse', () => {
  it('pushes tag-set AND-matching into SQL (returns only listings having every requested tag)', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    const repository = createDrizzleListingRepository({ db })

    // Among live cats: mishka has [vaccinated, hand-tame, needs-foster], coco has
    // [vaccinated, neutered], biscuit has [kitten, needs-foster, hand-tame].
    // Only mishka has BOTH vaccinated AND hand-tame.
    const aggregates = await repository.browse({ species: 'cat', tagSlugs: ['vaccinated', 'hand-tame'] })

    expect(aggregates.map((aggregate) => aggregate.listing.id)).toEqual(['mishka'])
  }, 15_000)

  it('returns every live cat that has a single requested tag', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    const repository = createDrizzleListingRepository({ db })

    const aggregates = await repository.browse({ species: 'cat', tagSlugs: ['vaccinated'] })
    const ids = aggregates.map((aggregate) => aggregate.listing.id).sort()

    // mishka, coco, luna are live cats tagged vaccinated; biscuit is not.
    expect(ids).toEqual(['coco', 'luna', 'mishka'])
  }, 15_000)

  it('excludes non-live listings from browse (pending stays out)', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    const repository = createDrizzleListingRepository({ db })

    const aggregates = await repository.browse({ species: 'cat' })
    const ids = aggregates.map((aggregate) => aggregate.listing.id)

    expect(ids).toContain('mishka')
    expect(ids).not.toContain('pending-simba')
  }, 15_000)

  it('assembles full aggregates (images, tags, owner) from batched reads', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    const repository = createDrizzleListingRepository({ db })

    const aggregates = await repository.browse({ species: 'cat' })
    const mishka = aggregates.find((aggregate) => aggregate.listing.id === 'mishka')

    expect(mishka).toBeDefined()
    expect(mishka!.tags.map((tag) => tag.slug).sort()).toEqual(['hand-tame', 'needs-foster', 'vaccinated'])
    expect(mishka!.images.length).toBeGreaterThan(0)
    expect(mishka!.images).toEqual([...mishka!.images].sort((a, b) => a.sortOrder - b.sortOrder))
    // Seed listings carry an ownership linkage (an organization and/or a user).
    expect(mishka!.organization ?? mishka!.listedByUser).not.toBeNull()
  }, 15_000)
})
