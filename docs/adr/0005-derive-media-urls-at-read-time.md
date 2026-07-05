# ADR 0005: Derive media URLs from object keys at read time

- **Status:** Accepted
- **Date:** 2026-07-06

## Context

Listing image records carry a persisted `public_url` column that is baked in at creation time from the configured public bucket base URL. With no base URL configured in local development, the stored value is null and the mapper renders an empty string. If the bucket domain ever changes, every stored URL is frozen on the old domain. The media uploads slice makes Listing images and Report photos real, so the URL strategy has to be settled before rows accumulate.

## Decision

The object key is the source of truth for where media lives. Read paths derive the serving URL from the object key on every read: the public bucket base URL when configured, the local media serving route otherwise. The persisted `public_url` column remains in the schema but is not load-bearing; nothing should trust it when rendering.

## Why

Persisted URLs couple every stored row to the bucket domain at write time and break silently in environments without a public domain. Deriving at read time makes a domain change a config change instead of a data migration, and gives local development working images through the serving route with no special-case data. The column is kept rather than dropped to avoid a destructive migration while the D1 schema is still young.
