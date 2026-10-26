CREATE TABLE `learning_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`language` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`source_key` text DEFAULT '' NOT NULL,
	`card` text NOT NULL,
	`due_at` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_cards_owner_front` ON `learning_cards` (`owner_id`,`language`,`front`);--> statement-breakpoint
CREATE INDEX `learning_cards_owner_due` ON `learning_cards` (`owner_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `learning_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`card_id` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` text NOT NULL,
	`log` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learning_logs_owner_card` ON `learning_logs` (`owner_id`,`card_id`);--> statement-breakpoint
CREATE TABLE `recycled_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer NOT NULL,
	`payload` text NOT NULL,
	`deleted_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recycled_records_owner_entity` ON `recycled_records` (`owner_id`,`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`week_start` text NOT NULL,
	`content` text NOT NULL,
	`snapshot` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_reviews_owner_week` ON `weekly_reviews` (`owner_id`,`week_start`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_settings_owner_key` ON `workspace_settings` (`owner_id`,`key`);