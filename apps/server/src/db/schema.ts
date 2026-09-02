import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// Field lists match docs/phase-3-educational-architecture.md's Content Schema section.

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatarChoice: text("avatar_choice").notNull(),
  ageBand: text("age_band").notNull(), // "fledgling" | "wordsmith" | "loremaster"
  createdAt: text("created_at").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  glimmers: integer("glimmers").notNull().default(0),
  equippedItemId: text("equipped_item_id"),
});

export const masteryRecords = sqliteTable("mastery_records", {
  playerId: text("player_id").notNull(),
  contentItemId: text("content_item_id").notNull(),
  boxLevel: integer("box_level").notNull().default(0), // 0-5
  correctStreak: integer("correct_streak").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  lastResultTier: text("last_result_tier"), // "perfect" | "good" | "practice" | null
  lastSeenAt: text("last_seen_at"),
  nextDueAt: text("next_due_at"),
}, (table) => ({
  // Composite primary key: one row per (player, contentItem), per Phase 3.
  pk: primaryKey({ columns: [table.playerId, table.contentItemId] }),
}));

export const skillMastery = sqliteTable("skill_mastery", {
  playerId: text("player_id").notNull(),
  skillStrand: text("skill_strand").notNull(),
  masteryScore: integer("mastery_score").notNull().default(0), // 0-100
  effectiveDifficultyTier: integer("effective_difficulty_tier").notNull().default(1), // 1-10
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.skillStrand] }),
}));
