import type { ModerationEventRecord } from '../../../../backend/contracts'

export interface AsyncModerationEventRepository {
  save(event: ModerationEventRecord): Promise<ModerationEventRecord>
  listByListing(listingId: string): Promise<ModerationEventRecord[]>
}

export function createInMemoryAsyncModerationEventRepository(input: {
  events?: ModerationEventRecord[]
} = {}): AsyncModerationEventRepository {
  const events = new Map<string, ModerationEventRecord>()

  for (const event of input.events ?? []) {
    events.set(event.id, { ...event })
  }

  return {
    async save(event) {
      events.set(event.id, { ...event })
      return { ...event }
    },
    async listByListing(listingId) {
      return Array.from(events.values())
        .filter((event) => event.listingId === listingId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((event) => ({ ...event }))
    },
  }
}
