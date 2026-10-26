-- Additive only: preserve existing project, task, note and knowledge rows.
ALTER TABLE projects ADD COLUMN start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN milestone_date TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN progress_mode TEXT NOT NULL DEFAULT 'manual';
CREATE TABLE IF NOT EXISTS knowledge_preferences (
  owner_id TEXT NOT NULL,
  knowledge_key TEXT NOT NULL,
  primary_category TEXT NOT NULL DEFAULT '',
  secondary_category TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT 'auto',
  PRIMARY KEY (owner_id, knowledge_key)
);
