# Phase 3 — Educational Architecture

Full styled version: https://claude.ai/code/artifact/5a17dfdb-c428-4eb0-8719-38c527286e84

## Age bands & Echo Ranks

Age still picks a starting point. Internally, difficulty runs on a 1-10 `difficultyTier` scale, never shown to the child. Each of six skills (vocabulary, listening, pronunciation, reading, spelling, grammar) tracks its own tier per player, so a 7-year-old can sit at tier 6 in vocabulary and tier 3 in grammar.

| Band | Ages | Starting tier |
|---|---|---|
| Fledgling | 4-6 | 1-2 |
| Wordsmith | 7-9 | 3-5 |
| Loremaster | 10-12 | 6-8 |

Tiers 9-10 are Highspire Academy capstone content, reachable by any player regardless of age once their per-skill tier drifts there.

## Curriculum structure

Four levels: **Skill Strand** (Vocabulary, Phonics, Listening, Reading/Spelling, Grammar, Conversation, Capstone) → **Topic** (e.g. Animals, Food, Colors under Vocabulary) → **Content Item** (one word/phrase/grammar point) → **Challenge** (one graded interaction instance — the unit Phase 2's combat system consumes).

## Content schema

`ContentItem` and `Quest` are authored JSON per Phase 1 (git-tracked); `MasteryRecord` and `SkillMastery` are runtime DB tables.

```
ContentItem {
  id, skillStrand, topic, ageRange, difficultyTier,
  englishText, spanishText, audioUrl, imageUrl, phoneticHint,
  activityTypes, distractorPool, questContext, rewardTag
}

MasteryRecord {   // one row per (player, contentItem)
  playerId, contentItemId, boxLevel,
  correctStreak, totalAttempts, totalCorrect,
  lastResultTier, lastSeenAt, nextDueAt
}

SkillMastery {    // one row per (player, skillStrand)
  playerId, skillStrand, masteryScore,
  effectiveDifficultyTier, updatedAt
}
```

## Mastery model

A six-box Leitner system driven by Phase 2's Result Tiers — rule-based, not ML, on purpose.

| Box | Review interval |
|---|---|
| 0 | next encounter |
| 1 | later, same session |
| 2 | ~1 day |
| 3 | ~3 days |
| 4 | ~7 days |
| 5 | ~21 days (mastered) |

| Result tier | Box change |
|---|---|
| Perfect | +1 (max 5) |
| Good | unchanged |
| Practice | −2 (floor 0) |

Practice never slams a high-box item back to 0 — it resurfaces soon without a harsh reset.

## Adaptive selection algorithm

**Next Content Item:** from the pool tagged to the current quest's topic, due items (`nextDueAt ≤ now`) go first, weakest box first. New items are throttled — at most 3 per quest, so review always outweighs novelty.

**Tier drift, per skill:** `masteryScore` above 85 across the last 15 attempts → `effectiveDifficultyTier` +1 (capped at age-band range + 2). Below 40 across the last 15 → −1 (floored at 1). This is what lets two same-age children genuinely diverge, bounded so one bad round doesn't swing it wildly.

## Spanish fade — immersion level

**Immersion Level** (0-100) = average of the six `SkillMastery` scores. Decides how much Spanish appears in dialogue:

- **0-30** — Spanish-primary, target English word/phrase bolded inline
- **30-70** — bilingual, mixed naturally
- **70-100** — English-primary, Spanish only for a genuinely new/hard concept

Every NPC follows this curve; Pip (the tutor companion) follows it earliest and most audibly.

## Sample learning objectives

| Strand / Topic | Band | Objective |
|---|---|---|
| Vocabulary / Animals | Fledgling | Recognize and produce 8 common animal names by sound and image, no translation shown |
| Grammar / Sentence order | Wordsmith | Correctly order subject-verb-object in short statements ("I have a sword") |
| Listening / Directions | Wordsmith | Follow a two-step spoken instruction ("Touch the red one, then jump") |
| Reading / Comprehension | Loremaster | Answer a literal comprehension question about a 3-4 sentence passage, unassisted by Spanish |
| Conversation / Q&A | Loremaster | Produce a grammatically appropriate response to "Where is the castle?" without a translation prompt |

## Flagged for a second look

- Six-box Leitner model with a −2 demotion on Practice (not a full reset) — a judgment call balancing "resurface mistakes soon" against "never punish harshly."
- Tier drift thresholds (85/40 over 15 attempts) are a first-pass guess with no usage data behind them yet.
- Immersion Level averages all six skills equally — an alternative would weight listening/vocabulary higher since beginners hit those first.
