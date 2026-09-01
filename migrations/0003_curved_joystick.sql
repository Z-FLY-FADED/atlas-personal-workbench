CREATE TABLE `industry_article_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`article_id` integer NOT NULL,
	`read_at` text DEFAULT '' NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`muted` integer DEFAULT false NOT NULL,
	`archived_at` text DEFAULT '' NOT NULL,
	`knowledge_id` integer,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_industry_article_actions_owner_article` ON `industry_article_actions` (`owner_id`,`article_id`);--> statement-breakpoint
CREATE INDEX `idx_industry_article_actions_owner_starred` ON `industry_article_actions` (`owner_id`,`starred`);--> statement-breakpoint
CREATE TABLE `industry_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`source_id` integer,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`content_excerpt` text DEFAULT '' NOT NULL,
	`source_name` text DEFAULT '' NOT NULL,
	`published_at` text DEFAULT '' NOT NULL,
	`discovered_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'zh-CN' NOT NULL,
	`industry` text NOT NULL,
	`topic` text DEFAULT 'industry' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`entities` text DEFAULT '[]' NOT NULL,
	`url_hash` text NOT NULL,
	`title_fingerprint` text DEFAULT '' NOT NULL,
	`content_fingerprint` text DEFAULT '' NOT NULL,
	`event_group_id` text DEFAULT '' NOT NULL,
	`relevance_score` integer DEFAULT 60 NOT NULL,
	`importance_score` integer DEFAULT 50 NOT NULL,
	`confidence_score` integer DEFAULT 60 NOT NULL,
	`source_authenticity` text DEFAULT 'reviewed' NOT NULL,
	`content_status` text DEFAULT 'summary_only' NOT NULL,
	`corroboration_status` text DEFAULT 'single_source' NOT NULL,
	`ai_model` text DEFAULT '' NOT NULL,
	`ai_processed_at` text DEFAULT '' NOT NULL,
	`raw_payload_hash` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_industry_articles_owner_url` ON `industry_articles` (`owner_id`,`canonical_url`);--> statement-breakpoint
CREATE INDEX `idx_industry_articles_owner_industry_published` ON `industry_articles` (`owner_id`,`industry`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_industry_articles_owner_title_fingerprint` ON `industry_articles` (`owner_id`,`title_fingerprint`);--> statement-breakpoint
CREATE TABLE `industry_ingestion_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`source_id` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`discovered_count` integer DEFAULT 0 NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`started_at` text DEFAULT '' NOT NULL,
	`finished_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_industry_ingestion_runs_owner_started` ON `industry_ingestion_runs` (`owner_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_industry_ingestion_runs_source_started` ON `industry_ingestion_runs` (`source_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `industry_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`kind` text DEFAULT 'rss' NOT NULL,
	`industry` text DEFAULT '互联网大厂' NOT NULL,
	`topic` text DEFAULT 'industry' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`trust_level` text DEFAULT 'media' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`poll_interval_minutes` integer DEFAULT 60 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`etag` text DEFAULT '' NOT NULL,
	`last_modified` text DEFAULT '' NOT NULL,
	`last_checked_at` text DEFAULT '' NOT NULL,
	`last_success_at` text DEFAULT '' NOT NULL,
	`next_check_at` text DEFAULT '' NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`parser_config` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_industry_sources_owner_url` ON `industry_sources` (`owner_id`,`url`);--> statement-breakpoint
CREATE INDEX `idx_industry_sources_owner_enabled_next` ON `industry_sources` (`owner_id`,`enabled`,`next_check_at`);