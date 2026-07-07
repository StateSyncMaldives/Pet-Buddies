# ADR 0007: Hybrid media upload runtime

- **Status:** Accepted
- **Date:** 2026-07-07

## Context

The media upload flow was complete on paper — policy validation, managed object keys, the upload use case, and the `/media/$` serving route that streams from R2 (ADR 0005, ADR 0006) — but every upload landed in the per-request in-memory demo store, because ADR 0003 routes mutations through the request/session demo runtime. The serving route reads the real R2 bucket, so uploaded media vanished the moment its request ended: writes and reads disagreed about where media lives.

## Decision

The `uploadMedia` Start server function resolves the R2 bucket from the Worker bindings via `src/server/infra/cloudflare/worker-env.ts` and writes uploads durably to R2 when running in the Worker, falling back to the per-request in-memory demo store outside it (vitest, plain dev). The app routes only `uploadMedia` through the server-function RPC — uploads are stateless with respect to the demo session — while every other mutation keeps running on the in-memory prototype runtime per ADR 0003. The `cloudflare:workers` import is dynamic with the specifier held in a variable so neither vite nor vitest resolves the workerd-only module statically; `new Function`/eval indirection is not an option because the Workers runtime forbids code generation from strings.

## Why

Uploads are the one mutation with no demo-session state to preserve, so promoting them to the Worker-backed server function makes media durable without breaking ADR 0003's runtime-identity guarantee for everything else. The environment fallback keeps vitest and plain dev working with zero Cloudflare credentials, and the import indirection is what lets one code path serve both worlds: static resolution would break the non-Worker builds, while string-evaluated code would throw in production and silently disable the R2 binding.
