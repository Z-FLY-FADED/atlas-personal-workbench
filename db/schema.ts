import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  priority: text("priority").notNull().default("一般"),
  horizon: text("horizon").notNull().default("今日"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  date: text("date").notNull().default("待安排"),
  completedAt: text("completed_at").notNull().default(""),
  completedOn: text("completed_on").notNull().default(""),
  completionHistory: text("completion_history").notNull().default("[]"),
  activeOn: text("active_on").notNull().default(""),
  projectId: integer("project_id"),
}, (table) => [index("tasks_owner_idx").on(table.ownerId)]);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("规划中"),
  status: text("status").notNull().default("进行中"),
  progress: integer("progress").notNull().default(0),
  nextMilestone: text("next_milestone").notNull().default("确定下一里程碑"),
  dueDate: text("due_date").notNull().default("待安排"),
  remainingTasks: integer("remaining_tasks").notNull().default(0),
  accent: text("accent").notNull().default("#a97d30"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  index("projects_owner_status_idx").on(table.ownerId, table.status),
  index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt),
]);

export const quickNotes = sqliteTable("quick_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("待整理"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [index("quick_notes_owner_updated_idx").on(table.ownerId, table.updatedAt)]);

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  remindAt: text("remind_at").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
}, (table) => [index("reminders_owner_due_idx").on(table.ownerId, table.done, table.remindAt)]);

export const knowledge = sqliteTable("knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("未分类"),
  primaryCategory: text("primary_category").notNull().default("通用"),
  secondaryCategory: text("secondary_category").notNull().default("未分类"),
  confidence: integer("confidence").notNull().default(52),
  source: text("source").notNull().default("手动"),
  sourceType: text("source_type").notNull().default("手动输入"),
  createdAt: text("created_at").notNull().default("刚刚"),
  completeness: integer("completeness").notNull().default(0),
  enrichment: text("enrichment").notNull().default(""),
  keywords: text("keywords").notNull().default("[]"),
  relatedIds: text("related_ids").notNull().default("[]"),
  relatedTopics: text("related_topics").notNull().default("[]"),
}, (table) => [index("knowledge_owner_idx").on(table.ownerId)]);

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("已投递"),
  channel: text("channel").notNull().default("手动记录"),
  appliedAt: text("applied_at").notNull().default("今天"),
  nextAction: text("next_action").notNull().default("等待反馈"),
  notes: text("notes").notNull().default(""),
}, (table) => [index("applications_owner_idx").on(table.ownerId)]);

export const profiles = sqliteTable("profiles", {
  ownerId: text("owner_id").primaryKey(),
  displayName: text("display_name").notNull().default("用户名"),
  motto: text("motto").notNull().default("专注 · 自洽 · 成长"),
  avatarText: text("avatar_text").notNull().default("用"),
  accent: text("accent").notNull().default("gold"),
  updatedAt: text("updated_at").notNull().default(""),
});

export const resumes = sqliteTable("resumes", {
  ownerId: text("owner_id").primaryKey(),
  fileName: text("file_name").notNull().default("个人简历"),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const aiConnections = sqliteTable("ai_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url").notNull().default(""),
  apiKeyCipher: text("api_key_cipher").notNull().default(""),
  apiKeyIv: text("api_key_iv").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("configured"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [index("idx_ai_connections_owner").on(table.ownerId, table.isActive)]);

export const aiSchedules = sqliteTable("ai_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  connectionId: integer("connection_id").notNull(),
  prompt: text("prompt").notNull(),
  cadence: text("cadence").notNull().default("daily"),
  timeOfDay: text("time_of_day").notNull().default("08:00"),
  weekdays: text("weekdays").notNull().default("1,2,3,4,5"),
  useWeb: integer("use_web", { mode: "boolean" }).notNull().default(false),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  nextRunAt: text("next_run_at").notNull().default(""),
  lastRunAt: text("last_run_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  index("idx_ai_schedules_owner").on(table.ownerId, table.enabled),
  index("idx_ai_schedules_due").on(table.enabled, table.nextRunAt),
]);

export const aiRuns = sqliteTable("ai_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  scheduleId: integer("schedule_id"),
  connectionId: integer("connection_id").notNull(),
  prompt: text("prompt").notNull(),
  result: text("result").notNull().default(""),
  status: text("status").notNull().default("running"),
  error: text("error").notNull().default(""),
  startedAt: text("started_at").notNull().default(""),
  finishedAt: text("finished_at").notNull().default(""),
}, (table) => [index("idx_ai_runs_owner").on(table.ownerId, table.startedAt)]);

export const aiQueryRateLimits = sqliteTable("ai_query_rate_limits", {
  ownerId: text("owner_id").primaryKey(),
  windowStart: integer("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(0),
});

export const industrySources = sqliteTable("industry_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull().default("rss"),
  industry: text("industry").notNull().default("互联网大厂"),
  topic: text("topic").notNull().default("industry"),
  company: text("company").notNull().default(""),
  trustLevel: text("trust_level").notNull().default("media"),
  priority: integer("priority").notNull().default(50),
  pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(60),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  etag: text("etag").notNull().default(""),
  lastModified: text("last_modified").notNull().default(""),
  lastCheckedAt: text("last_checked_at").notNull().default(""),
  lastSuccessAt: text("last_success_at").notNull().default(""),
  nextCheckAt: text("next_check_at").notNull().default(""),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  lastError: text("last_error").notNull().default(""),
  parserConfig: text("parser_config").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_industry_sources_owner_url").on(table.ownerId, table.url),
  index("idx_industry_sources_owner_enabled_next").on(table.ownerId, table.enabled, table.nextCheckAt),
]);

export const industryArticles = sqliteTable("industry_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  sourceId: integer("source_id"),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  contentExcerpt: text("content_excerpt").notNull().default(""),
  sourceName: text("source_name").notNull().default(""),
  publishedAt: text("published_at").notNull().default(""),
  discoveredAt: text("discovered_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
  language: text("language").notNull().default("zh-CN"),
  industry: text("industry").notNull(),
  topic: text("topic").notNull().default("industry"),
  company: text("company").notNull().default(""),
  tags: text("tags").notNull().default("[]"),
  entities: text("entities").notNull().default("[]"),
  urlHash: text("url_hash").notNull(),
  titleFingerprint: text("title_fingerprint").notNull().default(""),
  contentFingerprint: text("content_fingerprint").notNull().default(""),
  eventGroupId: text("event_group_id").notNull().default(""),
  relevanceScore: integer("relevance_score").notNull().default(60),
  importanceScore: integer("importance_score").notNull().default(50),
  confidenceScore: integer("confidence_score").notNull().default(60),
  sourceAuthenticity: text("source_authenticity").notNull().default("reviewed"),
  contentStatus: text("content_status").notNull().default("summary_only"),
  corroborationStatus: text("corroboration_status").notNull().default("single_source"),
  aiModel: text("ai_model").notNull().default(""),
  aiProcessedAt: text("ai_processed_at").notNull().default(""),
  rawPayloadHash: text("raw_payload_hash").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_industry_articles_owner_url").on(table.ownerId, table.canonicalUrl),
  index("idx_industry_articles_owner_industry_published").on(table.ownerId, table.industry, table.publishedAt),
  index("idx_industry_articles_owner_title_fingerprint").on(table.ownerId, table.titleFingerprint),
]);

export const industryArticleActions = sqliteTable("industry_article_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  articleId: integer("article_id").notNull(),
  readAt: text("read_at").notNull().default(""),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  muted: integer("muted", { mode: "boolean" }).notNull().default(false),
  archivedAt: text("archived_at").notNull().default(""),
  knowledgeId: integer("knowledge_id"),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_industry_article_actions_owner_article").on(table.ownerId, table.articleId),
  index("idx_industry_article_actions_owner_starred").on(table.ownerId, table.starred),
]);

export const industryIngestionRuns = sqliteTable("industry_ingestion_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  sourceId: integer("source_id"),
  status: text("status").notNull().default("running"),
  discoveredCount: integer("discovered_count").notNull().default(0),
  insertedCount: integer("inserted_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  error: text("error").notNull().default(""),
  startedAt: text("started_at").notNull().default(""),
  finishedAt: text("finished_at").notNull().default(""),
}, (table) => [
  index("idx_industry_ingestion_runs_owner_started").on(table.ownerId, table.startedAt),
  index("idx_industry_ingestion_runs_source_started").on(table.sourceId, table.startedAt),
]);

export const instruments = sqliteTable("instruments", {
  id: text("id").primaryKey(),
  region: text("region").notNull(),
  exchange: text("exchange").notNull(),
  symbol: text("symbol").notNull(),
  displaySymbol: text("display_symbol").notNull(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull().default(""),
  industry: text("industry").notNull().default("未分类"),
  assetType: text("asset_type").notNull().default("stock"),
  currency: text("currency").notNull(),
  timezone: text("timezone").notNull(),
  lotSize: integer("lot_size").notNull().default(1),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_instruments_exchange_symbol").on(table.exchange, table.symbol),
  index("idx_instruments_region_exchange").on(table.region, table.exchange),
  index("idx_instruments_name_zh").on(table.nameZh),
]);

export const instrumentAliases = sqliteTable("instrument_aliases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instrumentId: text("instrument_id").notNull(),
  provider: text("provider").notNull(),
  providerSymbol: text("provider_symbol").notNull(),
}, (table) => [
  uniqueIndex("idx_instrument_aliases_provider_symbol").on(table.provider, table.providerSymbol),
  index("idx_instrument_aliases_instrument").on(table.instrumentId),
]);

export const watchlists = sqliteTable("watchlists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull().default("我的自选"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_watchlists_owner_name").on(table.ownerId, table.name),
  index("idx_watchlists_owner_default").on(table.ownerId, table.isDefault),
]);

export const watchlistItems = sqliteTable("watchlist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  watchlistId: integer("watchlist_id").notNull(),
  instrumentId: text("instrument_id").notNull(),
  note: text("note").notNull().default(""),
  addedAt: text("added_at").notNull().default(""),
}, (table) => [
  uniqueIndex("idx_watchlist_items_owner_instrument").on(table.ownerId, table.instrumentId),
  index("idx_watchlist_items_watchlist_added").on(table.watchlistId, table.addedAt),
]);
