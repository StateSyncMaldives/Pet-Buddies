# ADR 0001: Backend foundation for Pet Buddies

- **Status:** Accepted
- **Date:** 2026-07-02

## Context

Pet Buddies is moving from a frontend prototype to a fullstack product. The repo is currently Vite + React with PWA support already present, and the user wants the production direction optimized for Cloudflare deployment.

The backend has to support:
- adoption listings
- verified organizations
- saved listings
- adoption inquiries
- lost/found reporting
- moderation history
- clinic directory data

The first backend pass should stay small, type-safe, and easy to migrate without committing to heavyweight infrastructure prematurely.

## Decision

We will use the following backend foundation:

1. **Framework/runtime:** TanStack Start targeting Cloudflare Workers
2. **Primary database:** Cloudflare D1 with SQL designed to stay SQLite-compatible
3. **Object storage:** Cloudflare R2 for uploaded listing and report media
4. **Auth direction:** Google sign-in, normalized into a first-party `users` table
5. **API shape:** thin transport handlers with shared TypeScript request/response contracts
6. **Domain structure:** deep modules behind shallow route interfaces

## Why

### TanStack Start over Next.js
- The current app is already Vite-based.
- PWA support is already part of the current project shape.
- Cloudflare Workers deployment is more direct and less adapter-heavy.

### D1 over external Postgres for MVP
- Fits the Cloudflare-first deployment target.
- Keeps operations simple for the first production slice.
- The current domain is relational and can be modeled clearly in SQLite-compatible SQL.

### Contract-first TypeScript interfaces
- The frontend and backend will evolve together during the migration.
- Shared DTOs reduce drift between route handlers, server modules, and UI consumers.
- Request and response types can stay stable even if persistence internals change.

### Thin handlers, deep modules
- Route files should validate input, authorize access, call one domain module, and serialize a typed response.
- Business rules should live in deeper modules so they are reusable and testable without going through HTTP transport.

## Consequences

### Positive
- Good fit for Cloudflare + PWA constraints
- Lower migration risk from the current Vite prototype
- Backend contracts can be shared with future client data hooks
- Domain rules stay concentrated in testable modules

### Negative
- D1 requires discipline around SQL features and migration style
- We should avoid ORM-first design until access patterns are clearer
- Some future advanced querying may eventually push us toward a different persistence layer

## Rejected alternatives

### Next.js + OpenNext on Cloudflare
Rejected for now because it adds more deployment indirection than we need for this app's current stage.

### Document database / NoSQL-first modeling
Rejected because listings, saves, inquiries, organization membership, and moderation history are strongly relational.

### DB records as API responses
Rejected because database records contain persistence details and will couple the client too tightly to storage layout.
