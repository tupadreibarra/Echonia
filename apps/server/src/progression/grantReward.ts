// XP curve per docs/phase-2-game-design-document.md's Progression section,
// exactly: xpToNextLevel = round(20 * level^1.5).
export function xpToNextLevel(level: number): number {
  return Math.round(20 * level ** 1.5);
}

export interface GrantRewardInput {
  currentXp: number;
  currentLevel: number;
  currentGlimmers: number;
  xpGained: number;
  glimmersGained: number;
  itemId?: string;
}

export interface GrantRewardResult {
  xp: number;
  level: number;
  glimmers: number;
  /** Only set when the input carried an itemId — callers should fall back to the player's existing equipped item otherwise. */
  equippedItemId?: string;
  leveledUp: boolean;
  newLevel: number;
}

/**
 * Applies one reward grant. XP carries over within the current level (the
 * remainder after crossing a threshold rolls into the next level's bar,
 * rather than resetting to 0) and the loop below deliberately keeps
 * levelling up as long as the accumulated total clears each successive
 * threshold — a single large reward can cross more than one level at low
 * levels, e.g. level 1's threshold is only 20 XP.
 */
export function grantReward(input: GrantRewardInput): GrantRewardResult {
  let xp = input.currentXp + input.xpGained;
  let level = input.currentLevel;
  const startingLevel = level;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
  }

  return {
    xp,
    level,
    glimmers: input.currentGlimmers + input.glimmersGained,
    equippedItemId: input.itemId,
    leveledUp: level > startingLevel,
    newLevel: level,
  };
}
