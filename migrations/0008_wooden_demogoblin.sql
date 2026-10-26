CREATE TABLE `application_resume_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`application_id` integer NOT NULL,
	`version_id` text NOT NULL,
	`version_revision` integer NOT NULL,
	`title` text NOT NULL,
	`content_snapshot` text NOT NULL,
	`linked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_resume_owner_idx` ON `application_resume_links` (`owner_id`,`application_id`);--> statement-breakpoint
CREATE TABLE `career_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`version_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`data_base64` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `career_attachments_owner_idx` ON `career_attachments` (`owner_id`,`version_id`);--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` integer,
	`task_title` text DEFAULT '' NOT NULL,
	`seconds` integer NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `focus_owner_task_idx` ON `focus_sessions` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `project_knowledge` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`project_id` integer NOT NULL,
	`knowledge_key` text NOT NULL,
	`title` text NOT NULL,
	`source` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_knowledge_owner_key_idx` ON `project_knowledge` (`owner_id`,`project_id`,`knowledge_key`);--> statement-breakpoint
CREATE TABLE `resume_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`source_content` text DEFAULT '' NOT NULL,
	`change_note` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resume_versions_owner_idx` ON `resume_versions` (`owner_id`);--> statement-breakpoint
CREATE TABLE `task_subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` integer NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subtasks_owner_task_position_idx` ON `task_subtasks` (`owner_id`,`task_id`,`position`);--> statement-breakpoint
ALTER TABLE `knowledge` ADD `capture_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_owner_capture_idx` ON `knowledge` (`owner_id`,`capture_key`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `repeat_rule` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_owner_recurrence_idx` ON `tasks` (`owner_id`,`recurrence_key`);