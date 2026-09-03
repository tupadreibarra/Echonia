# Phase 12 — Next Roadmap

Full styled version: https://claude.ai/code/artifact/5c57ec56-0820-4312-8c70-ad42ce26c6a2

## What's actually verified

Every mechanical claim in Phase 0's success criteria has been checked, repeatedly, by automated browser testing across Phases 6-11:

- The full ten-minute loop runs start to finish: character creation -> village -> dialogue -> three vocabulary challenges -> combat -> XP/level-up -> equip -> gate opens.
- Combat visibly changes based on answer quality - a wrong answer still lands a hit, never a stall.
- Progress genuinely persists: mastery, XP, level, Glimmers, equipped item, and gate state all survive a reload.
- Content is data-driven: editing the JSON vocabulary/quest files changes the game with zero code edits.
- Runs cleanly on desktop and, after Phase 11's fix, actually fits phone and tablet screens.

## What's still unknown

**No child has played this game yet.** Every check so far has been Playwright driving a browser - real evidence the machinery works, not evidence of what Phase 0 actually set out to prove:

- Does a 5-9 year old get through the loop without adult help?
- Do they describe it as fun, or as schoolwork with extra steps?
- Do they actually retain "apple / dog / book" afterward?
- Does turn-based combat feel exciting to a young child, or slow?
- Do placeholder colored-circle sprites read as charming-and-unfinished, or as "this looks broken" - killing engagement before the mechanic gets a fair chance?

None of this is answerable by more engineering. It needs real kids in front of the actual build.

## The real next step: playtesting

Before adding any new class, region, or system: sit down with 5-10 Spanish-speaking kids spanning both the Fledgling (4-6) and Wordsmith (7-9) bands, on the actual build, on an actual tablet where possible. Watch, don't help unless they're truly stuck. Afterward, ask them (in Spanish) to name the three objects - that's the whole "did learning happen" check for this slice.

Their answers to the five questions above should decide the shape of everything in **Next** below - if combat reads as slow, the fix is a combat change, not a content expansion; if the placeholder art actively repels engagement, art becomes the priority over new mechanics.

## Roadmap

### Now
1. **Playtest with real kids.** Everything else is downstream of this.
2. **Fix whatever that surfaces**, before writing anything new.

### Next
3. **Real audio for the 5 existing content items** - likely the single highest-leverage investment. The synthesized-tone fallback is a development convenience, not a teaching tool, and gates the core "hear it, learn it" loop directly.
4. **A real art pass, scoped to only what exists** - hero, Orin, Pip, Puddlewump, three objects. Enough to re-test with a fair visual bar, without committing to full-game art production yet.
5. **More content depth in the existing systems** - three vocabulary items is too thin to meaningfully exercise spaced repetition or tier drift. Add items to Everyday Objects and 1-2 new topics before adding new systems.
6. **Close the known gaps below** - cheap, already-scoped fixes with no design risk.

### Later
7. **A second class - Mage recommended first.** Most mechanically distinct from Knight (word-order vs. word-recognition); tests whether "different classes need genuinely different challenge types" actually holds up.
8. **A second region** - tests whether the hub-and-spoke structure and gate-unlock pattern generalize past one hand-built example.
9. **Speech recognition (Web Speech API first)** - high risk per Phase 0's own reliability warnings; prototype in isolation before wiring into the main game.
10. **Real accounts + parent dashboard** - wait for an actual reason a parent needs to log in (e.g. multi-device play) rather than building it speculatively.
11. **AI-assisted content generation** - only once content production is a proven bottleneck. Phase 0 §18 is explicit: don't reach for AI because it's available.

## Known technical debt

Deliberate, documented simplifications from Phases 8-10 - nothing urgent, but nothing to forget either.

| Item | Detail |
|---|---|
| Puddlewump farming | Defeat state isn't persisted, so a player can re-fight and re-grant the quest reward repeatedly in one session. No anti-farming logic exists. |
| Tier drift is a stub | Phase 3's 85/40-over-15-attempts algorithm was never implemented - `effectiveDifficultyTier` is set once from age band and never moves. Needs more content (item 5 above) before it can mean anything anyway. |
| Single-item inventory | Only one equippable item exists; there's no general inventory UI. Fine until a second item exists. |
| Local SQLite driver | `@libsql/client`, not `better-sqlite3` as Phase 1 originally specified - a build-toolchain workaround, functionally equivalent, documented in Phase 1's docs. |

---

This closes the 12-phase process from the original master prompt.
