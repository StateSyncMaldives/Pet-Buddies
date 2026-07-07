# PRD: Real media uploads for listing images and report photos on R2

- **Triage label:** `ready-for-agent`
- **Status:** Implemented — published as [issue #2](https://github.com/iyadhali/Pet-Buddies/issues/2) on `iyadhali/Pet-Buddies`.
- **Decisions:** ADR 0005 (derive media URLs at read time), ADR 0006 (prefix-only object-key admission), ADR 0007 (hybrid media upload runtime)

## Problem Statement

People using Pet Buddies cannot attach real photos anywhere in the product. A listing owner creating a listing has no way to add pictures of the pet, so every listing created through the app ships with zero images and adopters browse blind. A reporter filing a lost/found report sees an "Add a photo" control that is a cosmetic toggle — no file is ever selected, uploaded, or stored. The R2 media storage layer exists and the contracts already carry `imageObjectKeys` and `photoObjectKey`, but nothing populates them, and there is no server-side validation to stop oversized or non-image files if an upload path were opened.

## Solution

Build the real upload flows on top of the existing R2 media object store. When a listing owner picks photos in the listing creation flow, each file uploads immediately (on select) with a preview and progress state; submitting the listing passes the returned object keys. The lost/found report flow gets the same treatment for its single photo. Every upload is validated on the server — content type allowlist, per-kind size ceiling, and magic-byte sniffing — before anything touches R2. The create-listing and create-report mutations admit only object keys that this upload flow produced, and media is servable both through a configured public bucket URL and a local fallback route.

## User Stories

1. As a listing owner, I want to attach photos while creating a listing, so that adopters can see the pet they are considering.
2. As a listing owner, I want each photo to start uploading as soon as I select it, so that submitting the listing is fast and doesn't stall on a big transfer.
3. As a listing owner, I want to see a preview thumbnail of each selected photo, so that I know exactly which images will appear on the listing.
4. As a listing owner, I want to see per-photo upload progress or a pending state, so that I know the upload is working on a slow connection.
5. As a listing owner, I want to remove a photo I selected before submitting, so that a bad shot never appears on the listing.
6. As a listing owner, I want a clear inline error when a file is too large or an unsupported format, so that I can pick a different file instead of failing at submit time.
7. As a listing owner, I want to know the photo limit and accepted formats up front, so that I don't waste time selecting files that will be rejected.
8. As a listing owner, I want a failed upload to be retryable for that one photo, so that a network blip doesn't force me to redo the whole form.
9. As a listing owner, I want the submit action blocked while photos are still uploading, so that my listing is never created with missing images.
10. As a listing owner, I want the first photo I selected to become the listing's lead image, so that the ordering I chose is what adopters see.
11. As a viewer, I want listing images to load from a stable public URL, so that browsing stays fast and images don't break.
12. As a viewer, I want listings without photos to keep working with the existing placeholder treatment, so that older listings don't render broken.
13. As a reporter, I want to attach one photo to a lost/found report, so that the routed organization can actually identify the animal.
14. As a reporter, I want to replace or remove the report photo before submitting, so that I can correct a mistaken selection.
15. As a reporter, I want the photo to upload without needing an account, so that filing an anonymous report stays frictionless.
16. As a reporter, I want the same clear size/format errors as the listing flow, so that rejection is understandable rather than a silent failure.
17. As a verified organization receiving a routed report, I want to see the attached photo with the report, so that I can act on it.
18. As a moderator, I want listings in the review queue to show the actual uploaded photos, so that I can moderate the images as well as the text.
19. As a platform operator, I want every upload validated server-side for size and type, so that client-side checks can't be bypassed.
20. As a platform operator, I want file contents sniffed against magic bytes, so that a renamed executable with a spoofed image content type is rejected.
21. As a platform operator, I want listing images and report photos stored under distinct key prefixes with generated ids, so that objects can't collide and keys can't be guessed or swapped across kinds.
22. As a platform operator, I want the create-listing and create-report mutations to reject object keys that don't match the expected kind prefix and key shape, so that clients can't attach garbage keys or swap a report photo onto a listing.
23. As a developer, I want uploaded media servable in local development without a public bucket domain, so that the flows are testable end to end on a laptop.

## Implementation Decisions

- **Media upload policy (new deep domain module).** A pure function that takes the upload kind (`listing-image` | `report-photo`), declared content type, byte size, and the leading bytes of the file, and returns an ok/error result. It encodes: content-type allowlist (JPEG, PNG, WebP), per-kind size ceiling (5 MB per file for both kinds), and magic-byte verification that the bytes match the declared type. No I/O, no dependencies — the single place the validation rules live.
- **Upload media use case (new domain module).** Follows the existing use-case factory pattern with injected dependencies (`generateId`, the media object store). It runs the policy, generates a namespaced object key (`listing-images/<id>` / `report-photos/<id>` with the original extension normalized from the detected type), puts the object with its content type, and returns `{ objectKey, publicUrl }`.
- **Upload server function (new HTTP surface).** A TanStack Start server function accepting `FormData` (file + kind). It adapts the request to the upload use case through the same runtime seam the other server functions use — per ADR 0003, no fresh runtimes and no module-global state. Errors surface through the existing `ApiResult` shape.
- **Upload timing: on file select.** The UI uploads each file immediately when picked and holds the returned object keys in form state; the create mutations stay small and never carry file bytes. Submit is disabled while any upload is in flight.
- **Object-key admission is prefix-only and synchronous (ADR 0006).** The create-listing and create-report use cases validate key shape only: expected kind prefix plus a well-formed generated id. They never query R2 — an existence check would force the synchronous use-case seam async while proving nothing about ownership, since public URLs expose keys by construction. Existence and ownership verification are deliberately deferred until real authentication can bind uploads to an actor. Listing images are capped at 6 keys per listing; a report carries at most one photo key.
- **Media URLs derive from object keys at read time (ADR 0005).** The object key is the source of truth. Read paths derive the serving URL on every read — the public bucket base URL when configured, a local media serving route otherwise (a server route streaming the object from R2 with its stored content type). The persisted `public_url` column remains in the schema but is no longer load-bearing.
- **No schema changes.** `CreateListingRequest.imageObjectKeys`, report `photoObjectKey`, and the listing image records (objectKey, publicUrl, sortOrder) already exist in the contracts and D1 schema. The only contract addition is the upload server function's own input/output.
- **Orphaned objects are accepted.** An uploaded object whose form is abandoned simply remains in the bucket; no garbage collection in this slice.
- **UI wiring.** The listing creation overlay gets a multi-file picker with previews, per-file status, remove, and retry; sort order is selection order. The report screen's fake photo toggle is replaced with a real single-file picker with the same states.

## Testing Decisions

- A good test exercises external behavior through the module's public interface — inputs in, observable results out — never internal implementation details.
- **R2 integration via miniflare** is the tested surface for this slice (per developer decision). The existing miniflare-based Cloudflare bindings tests are the prior art and extension point: they already construct the infrastructure against a real R2 stub. New cases cover the upload path end to end — a valid image is stored and yields the expected key prefix, derived URL, and content type; an oversized file and a spoofed content type are rejected before anything is written; admission rejects a wrong-prefix key and accepts a freshly uploaded one.
- The policy and use-case modules are deliberately shaped to be testable in isolation (pure function; injected fakes), but dedicated unit tests for them are deferred by developer decision — the miniflare suite covers their behavior through the integrated path.

## Out of Scope

- Image resizing, thumbnail generation, or format conversion.
- EXIF/metadata stripping.
- Drag-and-drop upload or photo reordering after selection.
- Adding, removing, or editing photos on an existing listing.
- Garbage collection of orphaned R2 objects.
- Rate limiting and abuse controls on the upload surface; the validation ceilings are the only throttle until real authentication lands.
- Ownership binding of uploads to an actor (requires real authentication; see ADR 0006).
- Virus/malware scanning beyond magic-byte type verification.
- Video or any non-image media.
- CDN configuration and cache-control tuning for the public bucket.

## Further Notes

- Refined in a grill session against the domain docs on 2026-07-06: **Listing image** and **Report photo** are now canonical glossary terms in CONTEXT.md, and the two load-bearing decisions are recorded as ADR 0005 (derive media URLs at read time) and ADR 0006 (prefix-only object-key admission).
- Since implementation, ADR 0007 records the hybrid upload runtime: the `uploadMedia` server function writes durably to R2 when running in the Worker and falls back to the per-request in-memory demo store elsewhere.
- Uploads are open to the pre-auth Viewer identity — required because lost/found reports are anonymous — with the validation ceilings as the only throttle for now.
- The contracts were built ahead of this feature, so the create mutations don't change shape — this slice makes the already-present fields real.
- The bird species allowlist and report routing are untouched; uploads compose with the existing create flows rather than modifying their policy logic.
- Magic-byte sniffing needs only the first handful of bytes (JPEG `FF D8 FF`, PNG signature, WebP RIFF header), so validation can run before buffering the full file if streaming is ever needed — though at a 5 MB ceiling, buffering is acceptable.
