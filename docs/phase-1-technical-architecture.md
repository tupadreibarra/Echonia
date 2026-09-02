# Phase 1 — Technical Architecture

Full styled version: https://claude.ai/code/artifact/0c26ab10-d10a-4f13-a840-528c986ac474

## Stack at a glance

| Layer | Choice |
|---|---|
| App shell | React + TypeScript via Vite (not Next.js) |
| Game engine | Phaser 3 |
| Backend | Fastify (Node/TypeScript) — a thin API, not a framework |
| ORM | Drizzle — dual SQLite/Postgres dialect |
| Database | SQLite file today → Postgres/Supabase later |
| Content | Versioned JSON + Zod validation, not DB rows yet |
| Auth | None — local, no-PII browser profile only |
| Hosting | Vercel/Netlify (frontend) + a small Node host (backend), later |
| Audio | Static clips via Phaser's sound manager |
| Speech / AI | None in MVP — interface defined, no implementation |

## Frontend — React + Vite, confirmed

Next.js's value (SSR, file routing, API routes) doesn't serve a single-page, canvas-hosted game. `apps/game` is Vite + React 18 + TypeScript. A future marketing site or parent/teacher dashboard becomes its own Next.js app in the same monorepo — additive, not a migration.

## Game engine — Phaser 3, confirmed

Phaser owns the canvas (scenes, tilemaps, physics, animation, input, audio); React owns everything outside it (forms, dialogue chrome, inventory/equip screens). One `<GameCanvas>` component mounts a `Phaser.Game` instance; the two sides talk only through a typed event bus. Rejected: PixiJS (too low-level for MVP speed), Godot Web export (large WASM payload hurts load time on school Chromebooks; UI system doesn't mix cleanly with future React dashboards).

## Backend & ORM — Drizzle over Prisma (new decision)

Drizzle's schema is plain TypeScript with near-zero runtime overhead, and its SQLite/Postgres dialects stay close enough that almost all schema/query code is identical. A small `apps/server` Fastify API sits between the game and the database — the game never talks to the DB directly — which is what makes "SQLite now, Supabase later" a config change instead of a rewrite.

```
apps/game → fetch() → apps/server (Fastify + Drizzle) → SQLite file (dev) / Postgres (later)
```

## Database & content shape (new decision)

- **Progression data** (player profile, XP, inventory, mastery scores, activity log) is genuinely relational — real tables via Drizzle.
- **Content** (vocabulary, quests, dialogue, region definitions) is authored data, not runtime state. For the MVP it lives as JSON files in `packages/content`, validated against a Zod schema at server startup — diffable in git, no CMS needed yet. Designed to match the eventual DB table shape column-for-column, so the future move is an import script, not a redesign.

## Authentication — confirmed, detailed

MVP: a `Player` record (client-generated UUID, display name, avatar, age band) referenced via an opaque ID in `localStorage`. No email, password, or parent contact info anywhere. Later: Supabase Auth magic-link for the *parent*, child profiles scoped under the parent via row-level security, still holding no direct PII.

## Hosting

Frontend on Vercel/Netlify. `apps/server` runs on one small always-on Node host (Railway/Render) once it leaves localhost — likely shrinking or being replaced by Supabase edge functions over time, not scaled up.

## Asset system

`packages/content/assets/` (sprites/, audio/, icons/), referenced by relative path from the content JSON. Placeholder art occupies the exact paths final art will use later — swapping is a file replacement, never a code change.

## Audio — confirmed

Static files via Phaser's sound manager. No streaming, no live synthesis, in the MVP.

## Speech recognition — deferred, plug-in point defined

A `SpeechInputProvider` interface (`start()`, `onResult()`, `onError()`) exists with zero real implementations. When built, Web Speech API is the first provider; no combat/activity code changes when it lands.

## AI architecture — none in MVP, attachment point defined

Future AI attaches as an optional service `apps/server` calls out to, gated per-feature behind a flag — never inline in the core loop's request path, so gameplay degrades gracefully if that service is unavailable.

## Repo structure

```
echonia/
  apps/
    game/           # Vite + React + TypeScript + Phaser
      src/scenes/ ui/ bridge/
    server/         # Fastify + Drizzle API
      src/routes/ db/
  packages/
    content/        # JSON lesson/quest/vocab data + assets/
    shared-types/   # Player, MasteryScore, ContentItem, ...
  pnpm-workspace.yaml
  package.json
```

## Local dev workflow

```
git clone <repo>
pnpm install
pnpm --filter server dev     # Fastify API; SQLite auto-created + migrated on first run
pnpm --filter game dev       # Vite dev server
```

Committed: all source, Drizzle schema/migrations, content JSON + placeholder assets, a `seed.ts` script. **Not committed:** the SQLite file itself (`*.db` in `.gitignore`) — regenerated via migrations + seed.

## Migration path: SQLite → Postgres/Supabase

**Changes:** Drizzle's driver/connection string, a few column-type declarations, local file → `DATABASE_URL`. **Stays the same:** schema shape, table relationships, every query written against Drizzle's query builder, all business logic. Realistic effort: a few hours, done once, triggered by an actual need rather than a calendar date.

## Flagged for sign-off

- Drizzle over Prisma (less common, but better dual-dialect fit)
- A separate `apps/server` process (two dev processes to run, not one)
- Content as JSON files, not DB rows, for the MVP (partially — not fully — delivers the "non-engineer edits content" goal; full authoring tool is Phase 3+)
