# Phase 2 — Game Design Document

Full styled version: https://claude.ai/code/artifact/2d5986d7-a805-4401-aedb-c240ede4aad6

## World structure

Hub-and-spoke, not an open continent. **Emberhollow** is the permanent safe hub; each of the seven regions hangs off it independently, so a child can retreat to safety without backtracking. Each region has one waypoint (rest point + quest board), 2-3 exploration areas, a regional quest chain, and a boss fight against that region's **Keeper**. Regions unlock softly — always explorable, but a region's quests won't *complete* until the player holds its **Region Key**, earned from the previous region's Keeper.

## Core stats & the Echo resource

| Stat | Governs |
|---|---|
| HP | Heart Points. Reaching 0 returns the hero to the nearest waypoint — no XP lost, no "you died" screen. |
| POW | Power — base strength of the class's primary move. |
| ECHO | Spoken-magic resource spent by Mage/Healer moves; regenerates each turn and on Perfect results. |
| SPD | Speed — determines turn order. |
| GRD | Guard — flat % reduction of incoming enemy damage. |

## Combat system

Semi-turn-based, so the pressure is linguistic, not reflexive:

1. Encounter opens; enemy telegraphs its next move (no surprise hits).
2. Player's turn: a **Challenge** appears, themed to the active class.
3. Player answers; Pip can be tapped for a hint at any point.
4. The answer resolves to a **Result Tier**:
   - **Perfect** — correct, first try, no hint → 100% move power, small crit chance, +1 ECHO
   - **Good** — correct with a hint, or on a second try → 70% move power
   - **Practice** — incorrect or no answer in time → 35% move power; correct answer is shown/replayed
5. Enemy's turn: its telegraphed move lands, reduced by GRD.
6. Repeat until enemy HP hits 0 (victory: XP, gear roll, mastery update) or player HP hits 0 (soft return, no penalty).

**Hint rule:** requesting a hint caps that turn's result at Good, even if the answer is correct — rewards trying first without making hints feel like a wrong move.

## Classes — mechanical specs

Level-1 base stats (first-pass numbers, to be tuned in Phase 11 playtesting):

| Class | HP | POW | ECHO | SPD | GRD | Challenge type |
|---|---|---|---|---|---|---|
| Knight — Shieldspeaker | 32 | 9 | 2 | 5 | 4 | Select-Word |
| Mage — Wordweaver | 22 | 11 | 8 | 6 | 2 | Order-Words |
| Archer — Listening Eye | 24 | 8 | 4 | 8 | 3 | Listen-and-Aim |
| Healer — Kindtongue | 26 | 5 | 9 | 6 | 3 | Complete-the-Phrase |
| Rogue — Quicktongue | 24 | 8 | 3 | 10 | 2 | Flash-Match |

Per-level growth (flat, applied on level-up): Knight +4 HP/+1.5 POW/+0.5 ECHO/+0.5 SPD/+0.6 GRD · Mage +2.5/+2/+1.5/+0.6/+0.2 · Archer +3/+1.3/+0.8/+1/+0.4 · Healer +3/+0.8/+1.6/+0.6/+0.4 · Rogue +2.5/+1.3/+0.6/+1.2/+0.2.

## Progression

- **XP curve:** `xpToNextLevel = round(20 × level^1.5)`
- **Gear tiers:** Common (any quest) → Bronze (main quest reward) → Silver (50% category mastery) → Gold (100% category mastery) → Mythic (full region cleared)
- **Abilities:** unlocked by specific quest completions, not level alone
- **Companions:** unlocked via pronunciation milestones — inert until speech recognition ships

## Quests

Four types: **Main** (story, unlocks next region), **Side** (optional practice), **Echo Review** (daily quest = spaced repetition by another name), **Keeper** (regional boss capstone).

**Worked example — "The Wizard's Missing Words"** (Main, Emberhollow → Chatterdell): Orin explains (mostly in Spanish) he's forgotten the words for his light spell. Three word-orbs are hidden around the village; each triggers a Select-Image challenge from the "Everyday Objects" set. On the third correct orb, Orin casts a small light show over the square. Reward: 40 XP, 15 Glimmers, Orin's Lantern Charm (Common accessory).

## Rewards & currency

**Glimmers** are the only currency — earned from quests and battles, spend on cosmetics only (hairstyles, outfit colors, pet skins). Never buys stats, gear, or a shortcut past a challenge. No real-money purchases anywhere in the product.

## Learning integration

Every Challenge is pulled from the content pool by `region` (skill), `difficultyTier` (from the adaptive engine), and `type` (Select-Image, Select-Audio, Order-Words, Fill-Blank, Complete-the-Phrase, Flash-Match — Speak-Match once speech recognition ships). The Result Tier feeds both the combat math and a quiet mastery-score update; the child only ever sees the first one.

## Flagged for a second look

- Combat is semi-turn-based, not real-time action — trades some "epic action" feel for fairness across ages 4-12 and reading speeds.
- The hint rule caps a turn at Good, never Perfect — a deliberate lever on how often kids try first vs. reach for a hint.
