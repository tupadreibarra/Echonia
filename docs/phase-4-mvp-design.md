# Phase 4 — MVP Design

Full styled version: https://claude.ai/code/artifact/564825bf-bed8-4303-9e5c-5462c7b9ecad

## Definition of done

A child aged roughly 5-9 goes from landing page to defeating one enemy and equipping a reward, unassisted, in about ten minutes; doesn't call it schoolwork; retains the taught words in an immediate recall check; sees combat visibly change based on how they answer; and their progress survives a page reload.

## Must have

The vertical slice fails without any one of these:

| Feature | Acceptance criteria |
|---|---|
| Character creation | Name + 2-3 appearance choices, Knight only. A child creates a hero in under 60 seconds unassisted. |
| Emberhollow hub map + movement | Single map, walk/touch controls. Stable frame rate on desktop and tablet. |
| Orin + Pip introduction | Teaches "Hello" and "My name is...". Audio plays and is replayable on tap. |
| "The Wizard's Missing Words" quest | 3 Select-Image challenges, Everyday Objects topic. Quest completes and Orin's dialogue reflects it. |
| Puddlewump combat encounter | Full Phase 2 turn flow and Result Tiers. A wrong answer still lands a Practice-tier hit — never a stall. |
| XP + one level-up | A visible, legible level-up moment, not just a silent number change. |
| One equipment reward + equip screen | Orin's Lantern Charm. Equipping it visibly changes the hero. |
| Gate-opens beat | Camera pulls back and the wider world is visibly glimpsed. |
| Local save (Fastify + SQLite) | Reloading the browser preserves name, XP, and equipped item. |
| Content as JSON (Phase 3 schema) | Editing `englishText`/`audioUrl` and restarting the server changes the game with zero code edits. |
| Mastery plumbing (real, not mocked) | A `MasteryRecord` row exists per (player, item) and its box level changes after play — inspectable directly in the SQLite file. |

## Should have

Cut first if time runs short — the slice still proves itself without these:

- A second Challenge type (Select-Audio) on at least one item
- A missed word resurfacing once, within the same session
- A second small encounter, to sell "the loop repeats"
- Basic non-verbal SFX (swing, victory chime, item-get)
- A combat HUD (visible HP/level during the fight)
- Placeholder motion (hit-flash, idle bounce)

## Later

| Group | Deferred |
|---|---|
| Classes | Mage, Archer, Healer, Rogue |
| Input & AI | Microphone/speech recognition; any AI-generated content or dialogue |
| Accounts | Supabase Auth; parent consent flow; parent/teacher dashboards |
| World | The other 7 regions; Side/Echo Review/Keeper quests; tier-drift at real scale |
| Infrastructure | Postgres/Supabase migration; multiplayer |
| Economy | Glimmers shop/spend UI; cosmetic unlocks beyond the one starter reward |

## Content inventory

1 map (hub) · 2 NPCs · 1 enemy type · 1 playable class · 3 vocabulary items · 1 quest · 1 gear reward · ~7 audio clips.

## Sign-off gate

Phase 5 is the actual codebase. Everything in Must Have is what gets built first — explicit go-ahead needed on that list before any code is written.
