# ADR 0008: Durable persistence via an async backend, server-function writes, and loader revalidation

- **Status:** Accepted
- **Date:** 2026-07-08
- **Supersedes:** the "in-memory prototype backend supplies the implementation" clause of ADR 0003. Runtime identity is still preserved (ADR 0003), but it now resolves to durable, seeded User rows rather than an in-memory demo runtime.

## Context

Mutations (saved listings, adoption inquiries, published listings, moderation events, lost/found reports) were applied to a browser-tab-local in-memory prototype backend and never crossed the network. Every page load rebuilt a fresh in-memory backend seeded from static data, so a full refresh re-ran the SSR loaders against re-seeded state and showed the original data. The D1/R2 durable layer from ADR 0001 existed in the tree but was unwired. This ADR records how the server/D1 becomes the authoritative source of truth for reads and writes.

## Decision

1. **The server (D1) is authoritative.** Route loaders read the durable store; all data-mutating operations execute on the server and write to D1.
2. **Backend proxy facade.** The router context carries a single async `AppBackend` interface. On the server it is the durable D1-backed backend built from per-request Cloudflare bindings; on the client it is a proxy that implements the same interface by calling read server functions. This keeps loaders calling `context.backend.*` unchanged while making isomorphic (client-side) navigation reads go through the Worker, which alone can reach D1.
3. **Async all the way down.** Domain read services and write use-cases are promoted to natively async over the async repository interfaces. The in-memory fallback backend (used when no D1 binding is present — unit tests, local dev without Wrangler) wraps its synchronous repositories with the existing sync→async adapter.
4. **Writes go through Start server functions; the client reconciles by revalidation.** The client store applies an optimistic update, awaits the server function, then calls `router.invalidate()` so the affected loaders re-read durable truth; failures show a toast and invalidate to roll back. The store is demoted to UI/ephemeral state and optimistic mirrors, not the authoritative record set. **(Superseded by [ADR 0009](0009-tanstack-query-single-client-cache.md): the store-mirror + `router.invalidate` reconcile drifted from durable truth; TanStack Query is now the single client cache, loaders prefetch via `ensureQueryData`, writes invalidate query keys, and the store holds no server data.)**
5. **Demo identity is durable.** The demo Viewer and moderator resolve to stable, idempotently-seeded `users` rows (stable ids, display name as a column), so writes satisfy the `users.id` foreign keys.
6. **Schema at deploy, data by idempotent seed.** Schema migrations run at deploy/admin time (never on the request path); initial data is loaded by an idempotent upsert-based seed keyed on stable ids.

## Considered options

- **TanStack Query as the fix — rejected.** Query orchestrates client cache (invalidation, refetch, optimistic UI) but does not make writes durable; over a browser-local backend it would cache and refetch the same non-persistent source. It is a possible later client-data layer *after* the server is authoritative, not the persistence mechanism.
- **Loaders call server functions directly (no backend seam) — rejected** in favor of the proxy facade, to preserve one `AppBackend` abstraction and minimize loader churn.
- **Server-only loaders — rejected** because forcing a server round-trip for every client navigation diverges from the app's isomorphic model.

## Consequences

- Reads and writes share one async backend abstraction; the client never touches D1 directly.
- Primary read access patterns (key lookups, browse by status + species) push into SQL using existing indexes; tag-set and free-text search filtering stay in application code for now, with a noted follow-up.
- Constraint integrity: the raw `backend/sql` schema is the canonical source of truth (migrations are not generated from the Drizzle schema); `updated_at` is domain-owned via the injected clock; R2 blobs are garbage-collected when their listing/report rows are deleted; owner `ON DELETE` semantics are a documented known limitation (no owner-deletion path exists in the demo).

## Update (2026-07-10)

Follow-up work changed several of the decisions above; recorded here rather than rewriting the original text:

- **Schema source of truth flipped to Drizzle.** `src/server/infra/db/schema.ts` (with `check()` constraint parity) is now canonical; migrations are generated from it via drizzle-kit into `drizzle/` and applied with `wrangler d1 migrations apply`. This supersedes the "raw `backend/sql` is canonical" clause in Consequences.
- **Tag-set filtering pushed into SQL** (relational-division subquery), alongside status and species; free-text search still runs in the listing-service because its joined-haystack semantics have no strict SQL equivalent (preserves exact parity). Repository `browse` now means "live listings of the species carrying every requested tag."
- **R2 GC is a scheduled orphan sweep**, not only reclamation on row deletion: a daily cron (`triggers.crons`) runs `runMediaGarbageCollection`, which deletes managed blobs no durable row references and older than a grace window.
- **The async backend is an explicit `AsyncAppBackend` port** (the reads/writes actually consumed), no longer derived from the full in-memory `PrototypeBackend` surface.
- **Actor identity is server-owned.** The mutation adapter substitutes the server-resolved viewer id for the actor on create; the client-supplied display name is never persisted as an identity (reinforces decision 5).
