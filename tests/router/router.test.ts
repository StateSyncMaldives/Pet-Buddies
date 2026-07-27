import { describe, expect, it } from 'vitest'

import { validateBrowseSearch } from '../../src/router/browse-search'
import { createAppRouter } from '../../src/router'
import { queryKeys } from '../../src/query/queries'
import { createQueryClient } from '../../src/query/client'
import { createAppRuntime } from '../../src/server/runtime/app-session'

function testContext() {
  const { backend, mutations, session } = createAppRuntime()
  return {
    queryClient: createQueryClient(),
    backend,
    mutations,
    viewerId: session.viewerId,
    mockUser: session.mockUser,
    moderatorId: session.moderatorId,
  }
}

describe('createAppRouter', () => {
  it('redirects the root entry to browse', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse')
  })

  it('enables intent-based preloading for navigation links', () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse'] })

    expect(router.options.defaultPreload).toBe('intent')
  })

  it('keeps deep-link detail routes addressable', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse/listings/luna'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse/listings/luna')
  })

  it('validates browse search params with defaults and sanitized tags', () => {
    expect(
      validateBrowseSearch({
        species: 'dog',
        q: ' mishka ',
        tags: ['', 'Vaccinated', 'Vaccinated'],
      }),
    ).toEqual({
      species: 'cat',
      query: 'mishka',
      tags: ['Vaccinated'],
    })
  })

  it('validates detail route search params with the same browse filter contract', () => {
    expect(validateBrowseSearch({ species: 'bird', q: 'kiwi', tags: 'Hand-tame' })).toEqual({
      species: 'bird',
      query: 'kiwi',
      tags: ['Hand-tame'],
    })
  })

  it('keeps unknown routes addressable instead of bouncing to browse', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/definitely-not-a-route'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/definitely-not-a-route')
  })

  it('resolves the detail loader through the injected backend context', async () => {
    const context = testContext()
    const router = createAppRouter({ context, initialEntries: ['/browse/listings/luna'] })

    await router.load()

    const detailMatch = router.state.matches.find((match) => match.routeId.includes('listings'))
    expect(detailMatch?.loaderData).toMatchObject({ id: 'luna' })
  })

  it('prefetches browse results into the query cache from the route loader', async () => {
    const context = testContext()
    const router = createAppRouter({ context, initialEntries: ['/browse?species=bird&q=kiwi&tags=Hand-tame'] })

    await router.load()

    // The loader prefetches the browse read into the query cache (ADR 0009).
    const cached = context.queryClient.getQueryData(queryKeys.browse({ species: 'bird', query: 'kiwi', tags: ['Hand-tame'] }))
    expect(cached).toMatchObject({
      items: [
        {
          slug: 'kiwi',
          species: 'bird',
          name: 'Kiwi',
        },
      ],
    })
  })

  it('loads clinics through the vets route loader', async () => {
    const context = testContext()
    const router = createAppRouter({ context, initialEntries: ['/vets'] })

    await router.load()

    expect(context.queryClient.getQueryData(queryKeys.clinics)).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          name: 'Oases Vet Hospital',
        }),
      ]),
    })
  })

  it('loads saved listings through the saved route loader for the current viewer', async () => {
    const context = testContext()
    context.backend.toggleSavedListing({ listingId: 'mishka', viewerId: context.viewerId })
    const router = createAppRouter({ context, initialEntries: ['/saved'] })

    await router.load()

    expect(context.queryClient.getQueryData(queryKeys.saved)).toMatchObject({
      items: [
        expect.objectContaining({
          slug: 'mishka',
          name: 'Mishka',
          savedByViewer: true,
        }),
      ],
    })
  })

  it('validates you route view search params with an inquiries default', async () => {
    const listingsRouter = createAppRouter({ context: testContext(), initialEntries: ['/you?view=listings'] })
    await listingsRouter.load()

    const listingsMatch = listingsRouter.state.matches.find((match) => match.routeId === '/you')
    expect(listingsMatch?.search).toEqual({ view: 'listings' })

    const invalidRouter = createAppRouter({ context: testContext(), initialEntries: ['/you?view=unknown'] })
    await invalidRouter.load()

    const invalidMatch = invalidRouter.state.matches.find((match) => match.routeId === '/you')
    expect(invalidMatch?.search).toEqual({ view: 'inquiries' })
  })

  it('loads sent adoption inquiries through the you route loader for the current viewer', async () => {
    const context = testContext()
    context.backend.createInquiry({
      viewerId: context.viewerId,
      request: {
        listingId: 'mishka',
        message: 'Could we visit Mishka this week?',
      },
    })
    const router = createAppRouter({ context, initialEntries: ['/you?view=inquiries'] })

    await router.load()

    expect(context.queryClient.getQueryData(queryKeys.you)).toMatchObject({
      sentAdoptionInquiries: [
        expect.objectContaining({
          listingId: 'mishka',
          listingName: 'Mishka',
          message: 'Could we visit Mishka this week?',
          status: 'awaiting_reply',
        }),
      ],
    })
  })

  it('loads owned listings through the you route loader for the current viewer', async () => {
    const context = testContext()
    const created = await context.backend.createListing({
      actorUserId: context.viewerId,
      request: {
        species: 'cat',
        name: 'Nala',
        ageText: '2 years',
        sex: 'female',
        areaLabel: 'Maafannu, Male',
        story: 'Gentle indoor cat.',
        tagIds: [],
        imageObjectKeys: [],
      },
    })
    expect(created.ok).toBe(true)
    const router = createAppRouter({ context, initialEntries: ['/you?view=listings'] })

    await router.load()

    expect(context.queryClient.getQueryData(queryKeys.you)).toMatchObject({
      ownedListings: [
        expect.objectContaining({
          name: 'Nala',
          status: 'pending',
        }),
      ],
    })
  })

  it('loads read-model routes without projecting from app-shell hydration', async () => {
    const context = testContext()
    const backend = context.backend
    context.backend = {
      ...backend,
      hydrateAppShell() {
        throw new Error('Route loaders must use explicit read-model methods.')
      },
    }

    await createAppRouter({ context, initialEntries: ['/vets'] }).load()
    await createAppRouter({ context, initialEntries: ['/saved'] }).load()
    await createAppRouter({ context, initialEntries: ['/you'] }).load()
  })

  it('refreshes owned listing status after you route invalidation', async () => {
    const context = testContext()
    const created = await context.backend.createListing({
      actorUserId: context.viewerId,
      request: {
        species: 'cat',
        name: 'Nala',
        ageText: '2 years',
        sex: 'female',
        areaLabel: 'Maafannu, Male',
        story: 'Gentle indoor cat.',
        tagIds: [],
        imageObjectKeys: [],
      },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const listingId = created.data.listing.id
    const moderatorId = context.moderatorId ?? 'moderator-demo'
    context.backend.moderateListing({
      listingId,
      actorUserId: moderatorId,
      request: { action: 'approved' },
    })
    const router = createAppRouter({ context, initialEntries: ['/you?view=listings'] })

    await router.load()
    context.backend.moderateListing({
      listingId,
      actorUserId: moderatorId,
      request: { action: 'adopted' },
    })
    // A write invalidates the affected query; the refetch reflects durable truth
    // (ADR 0009). refetchType 'all' covers the observer-less test query.
    await context.queryClient.invalidateQueries({ queryKey: queryKeys.you, refetchType: 'all' })

    expect(context.queryClient.getQueryData(queryKeys.you)).toMatchObject({
      ownedListings: [
        expect.objectContaining({
          name: 'Nala',
          status: 'adopted',
        }),
      ],
    })
  })

  it('surfaces a not-found match when the detail loader cannot resolve the listing id', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse/listings/does-not-exist'] })

    await router.load()

    const detailMatch = router.state.matches.find((match) => match.routeId.includes('listings'))
    expect(detailMatch?.status).toBe('notFound')
  })
})
