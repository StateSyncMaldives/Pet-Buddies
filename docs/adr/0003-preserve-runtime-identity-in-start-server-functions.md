# ADR 0003: Preserve runtime identity in Start server functions

- **Status:** Accepted
- **Date:** 2026-07-03
- **Note (2026-07-07):** Partially superseded by ADR 0007 for the media upload path — `uploadMedia` now goes through the Start server function to R2. Everything else here still holds.

## Context

Pet Buddies has removed the backend singleton and now composes a request/session-scoped runtime for the demo app shell. The next migration slice moves mutation workflows behind TanStack Start server functions while the in-memory prototype backend still supplies the implementation.

## Decision

TanStack Start server functions must adapt the existing request/session runtime seam instead of creating fresh demo runtimes per call or reintroducing module-global state. Mutations must preserve the same demo-session runtime identity that the UI reads in tests, until durable persistence replaces the in-memory prototype backend.

## Why

Fresh runtimes would make saves, inquiries, reports, and Listing lifecycle changes disappear across calls, while module globals would undo the earlier request-scoped runtime migration and create the wrong shape for Cloudflare Workers. Preserving runtime identity keeps the prototype honest while still creating the typed server-function interface needed for the later D1 persistence slice.
