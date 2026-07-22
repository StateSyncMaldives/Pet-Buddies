import { QueryClient } from '@tanstack/react-query'

/**
 * The single client cache for durable reads (ADR 0009). staleTime 0 keeps the
 * invalidate-and-refetch contract honest: after a write invalidates a key, the
 * next read refetches durable truth rather than serving a cached copy.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  })
}
