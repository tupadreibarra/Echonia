import { and, eq } from "drizzle-orm";
import { loadContent } from "@echonia/content";
import type { AgeBand, ResultTier, SkillStrand } from "@echonia/shared-types";
import { db } from "../db/client.js";
import { masteryRecords, players, skillMastery } from "../db/schema.js";

// Review intervals in milliseconds, per docs/phase-3-educational-architecture.md's
// box table. Box 0 is due immediately (the next encounter), so its interval is 0.
const BOX_INTERVALS_MS: Record<number, number> = {
  0: 0,
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 3 * 24 * 60 * 60 * 1000,
  4: 7 * 24 * 60 * 60 * 1000,
  5: 21 * 24 * 60 * 60 * 1000,
};

// Starting effectiveDifficultyTier by age band, per Phase 3's age-band table
// (the low end of each band's starting range).
const STARTING_TIER_BY_AGE_BAND: Record<AgeBand, number> = {
  fledgling: 1,
  wordsmith: 3,
  loremaster: 6,
};

// Tier-drift cap per age band: the high end of each band's starting range,
// plus 2, per Phase 3's "capped at age-band range + 2" rule.
// Fledgling 1-2 -> 4, Wordsmith 3-5 -> 7, Loremaster 6-8 -> 10.
const TIER_CAP_BY_AGE_BAND: Record<AgeBand, number> = {
  fledgling: 4,
  wordsmith: 7,
  loremaster: 10,
};

const TIER_FLOOR = 1;
const TIER_DRIFT_MIN_ATTEMPTS = 15;
const TIER_DRIFT_UP_THRESHOLD = 85;
const TIER_DRIFT_DOWN_THRESHOLD = 40;

/**
 * Phase 3's rule is "masteryScore sustained above 85 / below 40 across the
 * last 15 attempts" — a literal sliding window over individual attempt
 * events. Building that would need a per-attempt log table: MasteryRecord
 * only keeps aggregates (totalAttempts, totalCorrect, ...), not per-attempt
 * history, and adding one is disproportionate to what 3-5 content items can
 * actually exercise right now. This uses the aggregate data that already
 * exists instead: the strand's total attempts (summed across its
 * MasteryRecords) as the sample-size gate, and the already-computed rolling
 * masteryScore as the trigger metric, in place of a literal windowed
 * recompute. This is a deliberate substitution, not the literal algorithm
 * from the docs — revisit if/when a real attempt-log exists.
 */
export function computeTierDrift(
  currentTier: number,
  ageBand: AgeBand,
  masteryScore: number,
  totalAttemptsInStrand: number,
): number {
  if (totalAttemptsInStrand < TIER_DRIFT_MIN_ATTEMPTS) return currentTier;
  if (masteryScore > TIER_DRIFT_UP_THRESHOLD) {
    return Math.min(TIER_CAP_BY_AGE_BAND[ageBand], currentTier + 1);
  }
  if (masteryScore < TIER_DRIFT_DOWN_THRESHOLD) {
    return Math.max(TIER_FLOOR, currentTier - 1);
  }
  return currentTier;
}

export function nextBoxLevel(currentBox: number, resultTier: ResultTier): number {
  if (resultTier === "perfect") return Math.min(5, currentBox + 1);
  if (resultTier === "practice") return Math.max(0, currentBox - 2);
  return currentBox; // "good" — box unchanged, per Phase 3's box table
}

export function boxIntervalMs(box: number): number {
  // `box` is always one of nextBoxLevel's 0-5 outputs, but the Record's
  // index signature still reads as possibly-undefined — the fallback never
  // actually fires.
  return BOX_INTERVALS_MS[box] ?? 0;
}

export interface RecordAttemptInput {
  playerId: string;
  contentItemId: string;
  skillStrand: SkillStrand;
  resultTier: ResultTier;
}

export async function recordAttempt(input: RecordAttemptInput) {
  const { playerId, contentItemId, skillStrand, resultTier } = input;
  const now = new Date();
  const nowIso = now.toISOString();

  const [existing] = await db
    .select()
    .from(masteryRecords)
    .where(and(eq(masteryRecords.playerId, playerId), eq(masteryRecords.contentItemId, contentItemId)));

  const currentBox = existing?.boxLevel ?? 0;
  const newBox = nextBoxLevel(currentBox, resultTier);
  const nextDueAt = new Date(now.getTime() + boxIntervalMs(newBox)).toISOString();
  const wasCorrect = resultTier === "perfect" || resultTier === "good";

  const updated = {
    playerId,
    contentItemId,
    boxLevel: newBox,
    correctStreak: wasCorrect ? (existing?.correctStreak ?? 0) + 1 : 0,
    totalAttempts: (existing?.totalAttempts ?? 0) + 1,
    totalCorrect: (existing?.totalCorrect ?? 0) + (wasCorrect ? 1 : 0),
    lastResultTier: resultTier,
    lastSeenAt: nowIso,
    nextDueAt,
  };

  if (existing) {
    await db
      .update(masteryRecords)
      .set(updated)
      .where(and(eq(masteryRecords.playerId, playerId), eq(masteryRecords.contentItemId, contentItemId)));
  } else {
    await db.insert(masteryRecords).values(updated);
  }

  await refreshSkillMastery(playerId, skillStrand);

  return updated;
}

/**
 * Recomputes the player's rolling masteryScore for one skill strand as a
 * simple average of box levels (0-5) across every ContentItem they've
 * attempted in that strand, scaled to 0-100, then applies tier drift
 * (computeTierDrift above) on top of whatever tier the strand already sits
 * at (or the age-band default, the first time this strand is seen).
 */
async function refreshSkillMastery(playerId: string, skillStrand: SkillStrand): Promise<void> {
  const { contentItems } = await loadContent();
  const idsInStrand = new Set(
    contentItems.filter((item) => item.skillStrand === skillStrand).map((item) => item.id),
  );

  const allRecords = await db.select().from(masteryRecords).where(eq(masteryRecords.playerId, playerId));
  const recordsInStrand = allRecords.filter((record) => idsInStrand.has(record.contentItemId));

  const masteryScore =
    recordsInStrand.length === 0
      ? 0
      : Math.round(
          (recordsInStrand.reduce((sum, record) => sum + record.boxLevel, 0) / recordsInStrand.length / 5) * 100,
        );
  const totalAttemptsInStrand = recordsInStrand.reduce((sum, record) => sum + record.totalAttempts, 0);

  const nowIso = new Date().toISOString();

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  const ageBand = (player?.ageBand as AgeBand) ?? "wordsmith";

  const [existingSkill] = await db
    .select()
    .from(skillMastery)
    .where(and(eq(skillMastery.playerId, playerId), eq(skillMastery.skillStrand, skillStrand)));

  const baselineTier = existingSkill?.effectiveDifficultyTier ?? STARTING_TIER_BY_AGE_BAND[ageBand];
  const effectiveDifficultyTier = computeTierDrift(baselineTier, ageBand, masteryScore, totalAttemptsInStrand);

  if (existingSkill) {
    await db
      .update(skillMastery)
      .set({ masteryScore, effectiveDifficultyTier, updatedAt: nowIso })
      .where(and(eq(skillMastery.playerId, playerId), eq(skillMastery.skillStrand, skillStrand)));
    return;
  }

  await db.insert(skillMastery).values({
    playerId,
    skillStrand,
    masteryScore,
    effectiveDifficultyTier,
    updatedAt: nowIso,
  });
}
