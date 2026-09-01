CREATE TABLE IF NOT EXISTS `ai_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text DEFAULT '' NOT NULL,
	`api_key_cipher` text DEFAULT '' NOT NULL,
	`api_key_iv` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'configured' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_connections_owner` ON `ai_connections` (`owner_id`,`is_active`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_query_rate_limits` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`schedule_id` integer,
	`connection_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`started_at` text DEFAULT '' NOT NULL,
	`finished_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_runs_owner` ON `ai_runs` (`owner_id`,`started_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`connection_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`cadence` text DEFAULT 'daily' NOT NULL,
	`time_of_day` text DEFAULT '08:00' NOT NULL,
	`weekdays` text DEFAULT '1,2,3,4,5' NOT NULL,
	`use_web` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`next_run_at` text DEFAULT '' NOT NULL,
	`last_run_at` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_schedules_owner` ON `ai_schedules` (`owner_id`,`enabled`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_schedules_due` ON `ai_schedules` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT '已投递' NOT NULL,
	`channel` text DEFAULT '手动记录' NOT NULL,
	`applied_at` text DEFAULT '今天' NOT NULL,
	`next_action` text DEFAULT '等待反馈' NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `applications_owner_idx` ON `applications` (`owner_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '未分类' NOT NULL,
	`primary_category` text DEFAULT '通用' NOT NULL,
	`secondary_category` text DEFAULT '未分类' NOT NULL,
	`confidence` integer DEFAULT 52 NOT NULL,
	`source` text DEFAULT '手动' NOT NULL,
	`source_type` text DEFAULT '手动输入' NOT NULL,
	`created_at` text DEFAULT '刚刚' NOT NULL,
	`completeness` integer DEFAULT 0 NOT NULL,
	`enrichment` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`related_ids` text DEFAULT '[]' NOT NULL,
	`related_topics` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `knowledge_owner_idx` ON `knowledge` (`owner_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '访客' NOT NULL,
	`motto` text DEFAULT '专注 · 自洽 · 成长' NOT NULL,
	`avatar_text` text DEFAULT '林' NOT NULL,
	`accent` text DEFAULT 'gold' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resumes` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`file_name` text DEFAULT '个人简历' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT '一般' NOT NULL,
	`horizon` text DEFAULT '今日' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`date` text DEFAULT '待安排' NOT NULL,
	`completed_at` text DEFAULT '' NOT NULL,
	`completed_on` text DEFAULT '' NOT NULL,
	`completion_history` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tasks_owner_idx` ON `tasks` (`owner_id`);
