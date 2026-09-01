CREATE TABLE `instrument_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instrument_aliases_provider_symbol` ON `instrument_aliases` (`provider`,`provider_symbol`);--> statement-breakpoint
CREATE INDEX `idx_instrument_aliases_instrument` ON `instrument_aliases` (`instrument_id`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`region` text NOT NULL,
	`exchange` text NOT NULL,
	`symbol` text NOT NULL,
	`display_symbol` text NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text DEFAULT '' NOT NULL,
	`industry` text DEFAULT '未分类' NOT NULL,
	`asset_type` text DEFAULT 'stock' NOT NULL,
	`currency` text NOT NULL,
	`timezone` text NOT NULL,
	`lot_size` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instruments_exchange_symbol` ON `instruments` (`exchange`,`symbol`);--> statement-breakpoint
CREATE INDEX `idx_instruments_region_exchange` ON `instruments` (`region`,`exchange`);--> statement-breakpoint
CREATE INDEX `idx_instruments_name_zh` ON `instruments` (`name_zh`);--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`watchlist_id` integer NOT NULL,
	`instrument_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`added_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watchlist_items_owner_instrument` ON `watchlist_items` (`owner_id`,`instrument_id`);--> statement-breakpoint
CREATE INDEX `idx_watchlist_items_watchlist_added` ON `watchlist_items` (`watchlist_id`,`added_at`);--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text DEFAULT '我的自选' NOT NULL,
	`is_default` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watchlists_owner_name` ON `watchlists` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_watchlists_owner_default` ON `watchlists` (`owner_id`,`is_default`);