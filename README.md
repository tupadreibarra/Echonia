# Echonia

A free 2D fantasy RPG that teaches English as a foreign language to Spanish-speaking children ages 4-12. English learning is the core game mechanic, not a layer on top of one: correct vocabulary, listening, and grammar answers power combat, unlock gear, and open new regions of the world.

This project was developed in phases. Design and architecture docs are tracked in [`docs/`](docs/):

- **[Phase 0 - Product Definition](docs/phase-0-product-definition.md)**: game concept, core fantasy, first-session flow, classes, world, progression, adaptive difficulty, MVP scope, risks, success criteria.
- **[Phase 1 - Technical Architecture](docs/phase-1-technical-architecture.md)**: stack decisions, repo layout, local dev workflow.
- **[Phase 2 - Game Design Document](docs/phase-2-game-design-document.md)**: world structure, combat system, class stats, progression formulas, quest structure, rewards, learning integration.
- **[Phase 3 - Educational Architecture](docs/phase-3-educational-architecture.md)**: age bands, curriculum structure, content schema, the Leitner-style mastery model, adaptive difficulty algorithm, Spanish-fade immersion curve.
- **[Phase 4 - MVP Design](docs/phase-4-mvp-design.md)**: the exact Must Have / Should Have / Later feature list for v0.1, with acceptance criteria and a content inventory.
- **Phases 5-11 - Implementation & Testing**: the actual codebase, built and verified in a real browser at every phase (project scaffold, playable world, learning engine, combat, RPG progression, the complete first quest, then an adversarial testing pass). Tracked via git history, not a separate doc per phase.
- **[Phase 12 - Next Roadmap](docs/phase-12-next-roadmap.md)**: what's verified vs. still unknown, and a Now/Next/Later plan for what comes after this prototype.
- **[Playtest Protocol](docs/playtest-protocol.md)**: how to run the real-kid playtesting Phase 12 calls for - recruitment, consent, session structure, an observation guide, and debrief questions.

Each Phase 0-4 and Phase 12 doc links to a styled, illustrated version published as a Claude artifact; the markdown here is the version tracked in git.

## Status

**The full vertical slice is playable, end to end.** Character creation -> the Emberhollow hub -> Orin/Pip's introduction -> the "Wizard's Missing Words" vocabulary quest -> Puddlewump combat -> XP/level-up -> equipping the reward -> the gate opening. Every mechanical claim in Phase 0's success criteria has been verified by repeated automated browser testing, and Phase 11 added a committed automated test suite (unit tests for the XP/mastery math, an e2e smoke test) as an ongoing regression check.

**What hasn't happened yet: real kids haven't played it.** See [Phase 12](docs/phase-12-next-roadmap.md) - that's the actual next step before any further feature work.

Everything is placeholder art (colored shapes) and placeholder audio (a synthesized fallback tone) by design - see Phase 0 §29. Only the Knight class and the Emberhollow hub exist; the other four classes and seven regions are intentionally out of scope for this prototype.

## Local development

```
pnpm install
pnpm --filter server dev     # Fastify API on :4000; SQLite auto-created + migrated on first run
pnpm --filter game dev       # Vite dev server on :5173
```

Open the printed local URL (usually `http://localhost:5173`). No account, no cloud database, and no AI/speech-recognition dependencies are needed - everything runs locally against a SQLite file.

On Windows, if `pnpm` is blocked by PowerShell's script execution policy, either run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, or use `pnpm.cmd` instead of `pnpm`.

**Tests**: `pnpm --filter server test` (Vitest, the XP/mastery math) and `pnpm --filter game exec playwright test` (the e2e smoke test - first run `pnpm --filter game exec playwright install chromium` if it hasn't been installed yet).

## Stack

- **Frontend**: React + TypeScript via Vite; Phaser 3 for the game canvas
- **Backend**: Fastify (Node/TypeScript)
- **ORM / DB**: Drizzle ORM, `@libsql/client` for local SQLite (see [Phase 1](docs/phase-1-technical-architecture.md)'s implementation note - a build-toolchain substitution for the originally planned `better-sqlite3`, functionally equivalent), Postgres (Supabase) planned for later
- **Content**: versioned JSON, validated with Zod, in `packages/content`
- **Hosting**: not yet deployed - local dev only at this stage
