import type { PrototypeBackend } from './prototype-backend'

/**
 * Turns a backend interface into its async mirror: every synchronous method
 * returns a Promise, while already-async methods (uploadMedia) are unchanged.
 */
type Asyncify<T> = {
  // `[R] extends [...]` keeps the conditional non-distributive, so an
  // `ApiSuccess | ApiFailure` return maps to `Promise<ApiSuccess | ApiFailure>`
  // rather than `Promise<ApiSuccess> | Promise<ApiFailure>`.
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => [R] extends [Promise<unknown>] ? R : Promise<R>
    : T[K]
}

/**
 * The async application backend the router context exposes. On the server it is
 * the durable D1-backed implementation; the in-memory facade below is the
 * fallback used when no D1 binding is present (tests, local without Wrangler).
 * See ADR 0008.
 */
export type AsyncAppBackend = Asyncify<PrototypeBackend>

/** Wraps the synchronous in-memory prototype backend behind the async interface. */
export function createInMemoryAsyncBackend(backend: PrototypeBackend): AsyncAppBackend {
  return {
    async hydrateAppShell(input) {
      return backend.hydrateAppShell(input)
    },
    async listClinics() {
      return backend.listClinics()
    },
    async listSavedListings(input) {
      return backend.listSavedListings(input)
    },
    async getYouReadModel(input) {
      return backend.getYouReadModel(input)
    },
    async browseListings(input) {
      return backend.browseListings(input)
    },
    async getListingDetail(input) {
      return backend.getListingDetail(input)
    },
    async toggleSavedListing(input) {
      return backend.toggleSavedListing(input)
    },
    async createInquiry(input) {
      return backend.createInquiry(input)
    },
    async createListing(input) {
      return backend.createListing(input)
    },
    async moderateListing(input) {
      return backend.moderateListing(input)
    },
    async createReport(input) {
      return backend.createReport(input)
    },
    uploadMedia(input) {
      return backend.uploadMedia(input)
    },
    async getMediaObject(objectKey) {
      return backend.getMediaObject(objectKey)
    },
    async getOrganizationName(id) {
      return backend.getOrganizationName(id)
    },
    async getTagId(label) {
      return backend.getTagId(label)
    },
  }
}
