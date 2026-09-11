# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/adr/`** — read ADRs that touch the area you're about to work in

Also see monorepo specs at `../tech-specs.md`, `../ui-guidelines.md`, `../frontend-plan.md` when relevant.

If any of these files don't exist, **proceed silently**. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context (this sub-project):

```
wxapp-frontend/
├── CONTEXT.md
└── docs/adr/
```

System-wide context map for the full monorepo: `../CONTEXT-MAP.md`.

## Use the glossary's vocabulary

When your output names a domain concept, use the term as defined in `CONTEXT.md`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.
