// Shared types mirroring the content/progression schema defined in
// docs/phase-3-educational-architecture.md. Kept as plain interfaces so both
// apps/game and apps/server depend on the same shapes without depending on
// each other.

export type SkillStrand =
  | "phonics"
  | "vocabulary"
  | "listening"
  | "reading"
  | "grammar"
  | "conversation"
  | "capstone";

export type ActivityType =
  | "select-image"
  | "select-audio"
  | "order-words"
  | "fill-blank"
  | "complete-the-phrase"
  | "flash-match"
  | "speak-match"; // reserved: no implementation until speech recognition ships

export type ResultTier = "perfect" | "good" | "practice";

export type AgeBand = "fledgling" | "wordsmith" | "loremaster";

export interface ContentItem {
  id: string;
  skillStrand: SkillStrand;
  topic: string;
  ageRange: [number, number];
  difficultyTier: number; // 1-10
  englishText: string;
  spanishText: string;
  audioUrl: string;
  imageUrl?: string;
  phoneticHint: string;
  activityTypes: ActivityType[];
  distractorPool: string[] | "auto";
  questContext?: string;
  rewardTag?: string;
}

export type QuestType = "main" | "side" | "echo-review" | "keeper";

export interface Quest {
  id: string;
  regionId: string;
  type: QuestType;
  title: string;
  npcGiver: string;
  objectiveContentItemIds: string[];
  rewardXp: number;
  rewardCurrency: number;
  rewardItemId?: string;
}

export interface Region {
  id: string;
  name: string;
  description: string;
  questIds: string[];
}

export interface Player {
  id: string;
  displayName: string;
  avatarChoice: string;
  ageBand: AgeBand;
  createdAt: string; // ISO timestamp
}

export interface MasteryRecord {
  playerId: string;
  contentItemId: string;
  boxLevel: number; // 0-5
  correctStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  lastResultTier: ResultTier | null;
  lastSeenAt: string | null; // ISO timestamp
  nextDueAt: string | null; // ISO timestamp
}

export interface SkillMastery {
  playerId: string;
  skillStrand: SkillStrand;
  masteryScore: number; // 0-100
  effectiveDifficultyTier: number; // 1-10
  updatedAt: string; // ISO timestamp
}
