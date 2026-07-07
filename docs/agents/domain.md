# Domain docs

How the engineering skills should consume Pet Buddies domain documentation when exploring or changing this codebase.

## Layout

This repo uses a **single-context** layout.

Read these locations before architecture review, debugging, or major implementation work:

- `CONTEXT.md` at the repo root for domain language
- `docs/adr/` for architectural decisions relevant to the area being changed

There is no `CONTEXT-MAP.md` in the current layout. Skills should assume one root context unless the repo is restructured later.

## Current root domain docs

- `CONTEXT.md`
- `docs/adr/` — all ADRs, currently 0001 (backend foundation) through 0007 (hybrid media upload runtime)

## Consumer rules

- Use glossary terms from `CONTEXT.md` exactly when naming modules, issues, tests, DTOs, and refactor proposals.
- Avoid synonyms that the glossary explicitly rejects.
- If work conflicts with an ADR, surface that conflict explicitly instead of silently overriding it.
- If a needed concept is missing from the glossary, treat that as a signal to update the domain model deliberately rather than inventing new language ad hoc.
