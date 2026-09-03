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
// (the low end of each band's starting range). Tier drift off of this
// baseline is explicitly a later phase — see recordAttempt below.
const STARTING_TIER_BY_AGE_BAND: Record<AgeBand, number> = {
  fledgling: 1,
  wordsmith: 3,
  loremaster: 6,
};

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
 * attempted in that strand, scaled to 0-100. `effectiveDifficultyTier` is
 * left untouched here — the 85/40-over-15-attempts tier-drift rule needs
 * more content and usage than exists yet (docs/phase-4-mvp-design.md's
 * Later list), so it's only ever set once, from the player's age band, the
 * first time a strand is seen.
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

  const nowIso = new Date().toISOString();

  const [existingSkill] = await db
    .select()
    .from(skillMastery)
    .where(and(eq(skillMastery.playerId, playerId), eq(skillMastery.skillStrand, skillStrand)));

  if (existingSkill) {
    await db
      .update(skillMastery)
      .set({ masteryScore, updatedAt: nowIso })
      .where(and(eq(skillMastery.playerId, playerId), eq(skillMastery.skillStrand, skillStrand)));
    return;
  }

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  const effectiveDifficultyTier = STARTING_TIER_BY_AGE_BAND[(player?.ageBand as AgeBand) ?? "wordsmith"];

  await db.insert(skillMastery).values({
    playerId,
    skillStrand,
    masteryScore,
    effectiveDifficultyTier,
    updatedAt: nowIso,
  });
}
