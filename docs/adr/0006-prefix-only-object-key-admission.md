# ADR 0006: Prefix-only object-key admission in create mutations

- **Status:** Accepted
- **Date:** 2026-07-06

## Context

The create-listing and create-report use cases accept client-submitted object keys (`imageObjectKeys`, `photoObjectKey`) produced by the media upload flow. The use cases are synchronous by design: the prototype backend seam returns `ApiResult` directly, and an R2 `head()` existence check inside them would force the whole seam async. Public media URLs expose object keys by construction, so an existence check would prove only that a key exists, not that the submitter uploaded it.

## Decision

Object-key admission validates key shape only, synchronously: the key must carry the expected kind prefix (Listing images vs Report photos) and a well-formed generated id. Create mutations never query R2. Existence verification and ownership binding are deliberately deferred until real authentication exists to bind uploads to an actor.

## Why

Prefix validation blocks the failure modes that matter now: cross-kind key swaps and garbage keys, without breaking the synchronous use-case seam that the prototype backend and its tests depend on. Going async for a `head()` check would ripple through every create path while adding no ownership guarantee, because keys are public knowledge. When authentication lands, upload records can bind keys to actors and admission can check ownership properly; that is the meaningful upgrade, and it needs no groundwork here.
