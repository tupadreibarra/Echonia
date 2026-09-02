# Echonia

A free 2D fantasy RPG that teaches English as a foreign language to Spanish-speaking children ages 4-12. English learning is the core game mechanic, not a layer on top of one: correct vocabulary, listening, and grammar answers power combat, unlock gear, and open new regions of the world.

This project is being developed in phases. Design and architecture docs are tracked in [`docs/`](docs/) as they're produced:

- **[Phase 0 - Product Definition](docs/phase-0-product-definition.md)**: game concept, core fantasy, first-session flow, classes, world, progression, adaptive difficulty, MVP scope, risks, success criteria.
- **[Phase 1 - Technical Architecture](docs/phase-1-technical-architecture.md)**: stack decisions (React + Vite, Phaser 3, Fastify + Drizzle, SQLite for local dev with a defined migration path to Postgres/Supabase), repo layout, local dev workflow.
- **[Phase 2 - Game Design Document](docs/phase-2-game-design-document.md)**: world structure, combat system, class stats, progression formulas, quest structure, rewards, learning integration.

Each doc links to a styled, illustrated version published as a Claude artifact; the markdown here is the version tracked in git.

## Status

Pre-implementation. No application code yet - Phases 0-2 (product, architecture, game design) are complete; Phase 3 (Educational Architecture) is next.

## Local development

Not yet applicable - project scaffold lands in Phase 5. This README will be updated with real setup instructions (`pnpm install`, `pnpm --filter server dev`, `pnpm --filter game dev`) once the codebase exists.

## Stack (planned)

- **Frontend**: React + TypeScript via Vite
- **Game engine**: Phaser 3
- **Backend**: Fastify (Node/TypeScript)
- **ORM / DB**: Drizzle ORM, SQLite for local dev, Postgres (Supabase) later
- **Hosting**: Vercel/Netlify (frontend), small Node host (backend)

No accounts, no cloud database, and no AI/speech-recognition dependencies are required to run this locally in its current stage.
