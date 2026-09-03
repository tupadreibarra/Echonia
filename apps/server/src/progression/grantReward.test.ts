import { describe, expect, it } from "vitest";
import { grantReward, xpToNextLevel } from "./grantReward.js";

describe("xpToNextLevel", () => {
  it("matches the Phase 2 curve exactly at a few known levels", () => {
    expect(xpToNextLevel(1)).toBe(20); // round(20 * 1^1.5) = 20
    expect(xpToNextLevel(2)).toBe(57); // round(20 * 2^1.5) = round(56.568..) = 57
    expect(xpToNextLevel(3)).toBe(104); // round(20 * 3^1.5) = round(103.92..) = 104
  });
});

describe("grantReward", () => {
  it("grants XP with no level-up when the total stays under the threshold", () => {
    const result = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 10,
      glimmersGained: 5,
    });
    expect(result).toMatchObject({ xp: 10, level: 1, glimmers: 5, leveledUp: false, newLevel: 1 });
  });

  it("levels up exactly once and carries the remainder, per the documented example (40 XP at level 1)", () => {
    const result = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 40,
      glimmersGained: 15,
    });
    // Level 1 threshold is 20; 40 - 20 = 20 XP carries into level 2.
    expect(result).toMatchObject({ xp: 20, level: 2, glimmers: 15, leveledUp: true, newLevel: 2 });
  });

  it("crosses more than one level from a single large grant", () => {
    // Thresholds: level 1 = 20, level 2 = 57, level 3 = 104. A 200 XP grant
    // should walk through all three: 200 - 20 - 57 - 104 = 19 remaining at level 4.
    const result = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 200,
      glimmersGained: 0,
    });
    expect(result.level).toBe(4);
    expect(result.xp).toBe(19);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(4);
  });

  it("starts from nonzero currentXp/currentGlimmers and adds correctly", () => {
    const result = grantReward({
      currentXp: 15,
      currentLevel: 1,
      currentGlimmers: 30,
      xpGained: 10,
      glimmersGained: 5,
    });
    // 15 + 10 = 25, which crosses the level-1 threshold of 20 -> level 2 with 5 left over.
    expect(result).toMatchObject({ xp: 5, level: 2, glimmers: 35, leveledUp: true, newLevel: 2 });
  });

  it("lands exactly on a threshold and still levels up (>=, not >)", () => {
    const result = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 20,
      glimmersGained: 0,
    });
    expect(result).toMatchObject({ xp: 0, level: 2, leveledUp: true, newLevel: 2 });
  });

  it("sets equippedItemId only when an itemId is provided", () => {
    const withItem = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 0,
      glimmersGained: 0,
      itemId: "orins-lantern-charm",
    });
    expect(withItem.equippedItemId).toBe("orins-lantern-charm");

    const withoutItem = grantReward({
      currentXp: 0,
      currentLevel: 1,
      currentGlimmers: 0,
      xpGained: 0,
      glimmersGained: 0,
    });
    expect(withoutItem.equippedItemId).toBeUndefined();
  });

  it("zero-value grants change nothing and report no level-up", () => {
    const result = grantReward({
      currentXp: 12,
      currentLevel: 3,
      currentGlimmers: 8,
      xpGained: 0,
      glimmersGained: 0,
    });
    expect(result).toMatchObject({ xp: 12, level: 3, glimmers: 8, leveledUp: false, newLevel: 3 });
  });
});
