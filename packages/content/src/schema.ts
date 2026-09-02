import { z } from "zod";

export const skillStrandSchema = z.enum([
  "phonics",
  "vocabulary",
  "listening",
  "reading",
  "grammar",
  "conversation",
  "capstone",
]);

export const activityTypeSchema = z.enum([
  "select-image",
  "select-audio",
  "order-words",
  "fill-blank",
  "complete-the-phrase",
  "flash-match",
  "speak-match",
]);

export const contentItemSchema = z.object({
  id: z.string().min(1),
  skillStrand: skillStrandSchema,
  topic: z.string().min(1),
  ageRange: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  difficultyTier: z.number().int().min(1).max(10),
  englishText: z.string().min(1),
  spanishText: z.string().min(1),
  audioUrl: z.string().min(1),
  imageUrl: z.string().min(1).optional(),
  phoneticHint: z.string().min(1),
  activityTypes: z.array(activityTypeSchema).min(1),
  distractorPool: z.union([z.array(z.string()), z.literal("auto")]),
  questContext: z.string().optional(),
  rewardTag: z.string().optional(),
});

export const questTypeSchema = z.enum(["main", "side", "echo-review", "keeper"]);

export const questSchema = z.object({
  id: z.string().min(1),
  regionId: z.string().min(1),
  type: questTypeSchema,
  title: z.string().min(1),
  npcGiver: z.string().min(1),
  objectiveContentItemIds: z.array(z.string().min(1)).min(1),
  rewardXp: z.number().int().min(0),
  rewardCurrency: z.number().int().min(0),
  rewardItemId: z.string().min(1).optional(),
});

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  questIds: z.array(z.string().min(1)),
});

// Only one slot exists in the MVP (a single accessory reward) — extend this
// enum when a second gear slot actually needs to exist, not before.
export const itemSlotSchema = z.enum(["accessory"]);

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: itemSlotSchema,
  description: z.string().min(1),
  visualTint: z.string().regex(/^#[0-9a-fA-F]{6}$/, "visualTint must be a 6-digit hex color"),
});

export type ContentItemInput = z.infer<typeof contentItemSchema>;
export type QuestInput = z.infer<typeof questSchema>;
export type RegionInput = z.infer<typeof regionSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
