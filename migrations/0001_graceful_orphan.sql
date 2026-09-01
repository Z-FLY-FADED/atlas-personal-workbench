CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`stage` text DEFAULT '规划中' NOT NULL,
	`status` text DEFAULT '进行中' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`next_milestone` text DEFAULT '确定下一里程碑' NOT NULL,
	`due_date` text DEFAULT '待安排' NOT NULL,
	`remaining_tasks` integer DEFAULT 0 NOT NULL,
	`accent` text DEFAULT '#a97d30' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_status_idx` ON `projects` (`owner_id`,`status`);--> statement-breakpoint
CREATE INDEX `projects_owner_updated_idx` ON `projects` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `quick_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT '待整理' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quick_notes_owner_updated_idx` ON `quick_notes` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`remind_at` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_owner_due_idx` ON `reminders` (`owner_id`,`done`,`remind_at`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` integer;