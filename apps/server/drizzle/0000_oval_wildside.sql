CREATE TABLE `mastery_records` (
	`player_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`box_level` integer DEFAULT 0 NOT NULL,
	`correct_streak` integer DEFAULT 0 NOT NULL,
	`total_attempts` integer DEFAULT 0 NOT NULL,
	`total_correct` integer DEFAULT 0 NOT NULL,
	`last_result_tier` text,
	`last_seen_at` text,
	`next_due_at` text,
	PRIMARY KEY(`player_id`, `content_item_id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_choice` text NOT NULL,
	`age_band` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_mastery` (
	`player_id` text NOT NULL,
	`skill_strand` text NOT NULL,
	`mastery_score` integer DEFAULT 0 NOT NULL,
	`effective_difficulty_tier` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`player_id`, `skill_strand`)
);
