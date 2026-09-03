ALTER TABLE `tasks` ADD `active_on` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `tasks`
SET `active_on` = CASE
	WHEN `horizon` = '今日' THEN COALESCE(NULLIF(`completed_on`, ''), date('now', '+8 hours'))
	ELSE ''
END
WHERE `active_on` = '';
