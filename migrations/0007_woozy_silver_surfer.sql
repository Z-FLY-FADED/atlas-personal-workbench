DROP INDEX `learning_cards_owner_front`;--> statement-breakpoint
CREATE UNIQUE INDEX `learning_cards_owner_front_source` ON `learning_cards` (`owner_id`,`language`,`front`,`source_key`);