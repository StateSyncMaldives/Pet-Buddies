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
4. **Writes go through Start server functions; the client reconciles by revalidation.** The client store applies an optimistic update, awaits the server function, then calls `router.invalidate()` so the affected loaders re-read durable truth; failures show a toast and invalidate to roll back. The store is demoted to UI/ephemeral state and optimistic mirrors, not the authoritative record set.
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
