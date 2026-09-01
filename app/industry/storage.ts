import { analyzeKnowledgeContent } from "../knowledge-intelligence";
import { canonicalizeUrl, fetchPublicFeed, hashText, parseFeed, simHashTitle } from "./feed";
import { INDUSTRY_ARTICLE_SEEDS, INDUSTRY_SOURCE_SEEDS } from "./seed";
import { INDUSTRY_CATEGORIES, type IndustryCategory, type IndustryPayload, type IndustrySource } from "./types";

type SourceRow = {
  id: number;
  owner_id: string;
  name: string;
  url: string;
  kind: string;
  industry: IndustryCategory;
  topic: string;
  company: string;
  trust_level: string;
  priority: number;
  poll_interval_minutes: number;
  enabled: number;
  etag: string;
  last_modified: string;
  last_checked_at: string;
  last_success_at: string;
  next_check_at: string;
  consecutive_failures: number;
  last_error: string;
};

function nowIso() {
  return new Date().toISOString();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function nextCheck(minutes: number, failures = 0) {
  const multiplier = failures ? Math.min(24, 2 ** Math.min(5, failures)) : 1;
  return new Date(Date.now() + Math.max(5, minutes) * multiplier * 60_000).toISOString();
}

function parseJsonArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function inferIndustry(text: string, fallback: IndustryCategory): IndustryCategory {
  if (/机器人|robot(?:ics)?|humanoid|embodied|具身|autonomous navigation|physical ai/i.test(text)) return "机器人";
  if (/汽车|automotive|vehicle|electric vehicle|battery pack|mobility/i.test(text)) return "汽车";
  if (/制造|manufactur|factory|digital twin|industrial automation|production line/i.test(text)) return "制造业";
  if (/半导体|semiconductor|chip|foundry|wafer|packaging|gpu|cuda|processor|nvlink|hbm/i.test(text)) return "半导体";
  return fallback;
}

export async function ensureIndustrySeed(db: D1Database, ownerId: string) {
  const timestamp = nowIso();
  const sourceStatements = INDUSTRY_SOURCE_SEEDS.map((source) => db.prepare(`INSERT OR IGNORE INTO industry_sources
    (owner_id, name, url, kind, industry, topic, company, trust_level, priority, poll_interval_minutes, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(ownerId, source.name, source.url, source.kind, source.industry, source.topic, source.company, source.trustLevel, source.priority, source.pollIntervalMinutes, source.enabled ? 1 : 0, timestamp, timestamp));
  await db.batch(sourceStatements);
  const seedSource = await db.prepare("SELECT id FROM industry_sources WHERE owner_id = ? AND url = ? LIMIT 1")
    .bind(ownerId, "https://atlas.local/industry-seed").first<{ id: number }>();
  const statements = [];
  for (const article of INDUSTRY_ARTICLE_SEEDS) {
    const canonicalUrl = canonicalizeUrl(article.url);
    const urlHash = await hashText(canonicalUrl);
    const rawHash = await hashText(`${article.title}\n${article.summary}`);
    statements.push(db.prepare(`INSERT OR IGNORE INTO industry_articles
      (owner_id, source_id, canonical_url, title, summary, content_excerpt, source_name, published_at, discovered_at, updated_at,
       language, industry, topic, company, tags, entities, url_hash, title_fingerprint, content_fingerprint, event_group_id,
       relevance_score, importance_score, confidence_score, source_authenticity, content_status, corroboration_status, raw_payload_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'zh-CN', ?, ?, ?, '[]', '[]', ?, ?, ?, '', 88, ?, 92, 'official', 'summary_only', 'official_primary', ?)`)
      .bind(ownerId, seedSource?.id || null, canonicalUrl, article.title, article.summary, article.summary, article.source, article.publishedAt, timestamp, timestamp,
        article.industry, article.topic, article.company || "", urlHash, simHashTitle(article.title), rawHash, article.importanceScore, rawHash));
  }
  if (statements.length) await db.batch(statements);
}

export async function listIndustrySources(db: D1Database, ownerId: string): Promise<IndustrySource[]> {
  const result = await db.prepare(`SELECT id, name, url, kind, industry, topic, company, trust_level AS trustLevel,
    priority, poll_interval_minutes AS pollIntervalMinutes, enabled, last_checked_at AS lastCheckedAt,
    last_success_at AS lastSuccessAt, next_check_at AS nextCheckAt,
    consecutive_failures AS consecutiveFailures, last_error AS lastError
    FROM industry_sources WHERE owner_id = ? ORDER BY enabled DESC, priority DESC, name`).bind(ownerId).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    ...row,
    id: Number(row.id),
    priority: Number(row.priority),
    pollIntervalMinutes: Number(row.pollIntervalMinutes),
    enabled: Boolean(row.enabled),
    consecutiveFailures: Number(row.consecutiveFailures),
  })) as IndustrySource[];
}

export async function getIndustryPayload(db: D1Database, ownerId: string, options: {
  industry?: string;
  lens?: string;
  query?: string;
  cursor?: number;
  limit?: number;
  starredOnly?: boolean;
} = {}): Promise<IndustryPayload> {
  const limit = clamp(Number(options.limit || 40), 1, 80);
  const conditions = ["a.owner_id = ?", "COALESCE(x.muted, 0) = 0"];
  const values: unknown[] = [ownerId];
  if (INDUSTRY_CATEGORIES.includes(options.industry as IndustryCategory)) {
    conditions.push("a.industry = ?");
    values.push(options.industry);
  }
  if (options.lens === "企业动态") conditions.push("a.topic = 'company'");
  if (options.lens === "行业趋势") conditions.push("a.topic != 'company'");
  if (options.query?.trim()) {
    conditions.push("(a.title LIKE ? OR a.summary LIKE ? OR a.company LIKE ? OR a.source_name LIKE ?)");
    const query = `%${options.query.trim().slice(0, 80)}%`;
    values.push(query, query, query, query);
  }
  if (options.cursor && Number.isFinite(options.cursor)) {
    conditions.push("a.id < ?");
    values.push(options.cursor);
  }
  if (options.starredOnly) conditions.push("COALESCE(x.starred, 0) = 1");
  const rows = await db.prepare(`SELECT a.id, a.source_id AS sourceId, a.industry, a.title, a.summary,
    a.source_name AS source, a.published_at AS publishedAt, a.discovered_at AS discoveredAt,
    a.canonical_url AS url, a.topic, a.company, a.importance_score AS importanceScore,
    a.relevance_score AS relevanceScore, a.confidence_score AS confidenceScore,
    a.source_authenticity AS sourceAuthenticity, a.content_status AS contentStatus,
    a.corroboration_status AS corroborationStatus, x.read_at AS readAt,
    COALESCE(x.starred, 0) AS starred, x.knowledge_id AS knowledgeId
    FROM industry_articles a LEFT JOIN industry_article_actions x ON x.article_id = a.id AND x.owner_id = a.owner_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY CASE WHEN a.published_at = '' THEN a.discovered_at ELSE a.published_at END DESC, a.id DESC LIMIT ?`)
    .bind(...values, limit + 1).all<Record<string, unknown>>();
  const hasMore = rows.results.length > limit;
  const articleRows = rows.results.slice(0, limit);
  const articles = articleRows.map((row) => ({
    ...row,
    id: Number(row.id),
    sourceId: row.sourceId === null ? null : Number(row.sourceId),
    importanceScore: Number(row.importanceScore),
    relevanceScore: Number(row.relevanceScore),
    confidenceScore: Number(row.confidenceScore),
    read: Boolean(row.readAt),
    starred: Boolean(row.starred),
    knowledgeId: row.knowledgeId === null ? null : Number(row.knowledgeId),
  })) as IndustryPayload["articles"];
  const [countResult, actionResult, sourceResult, runResult] = await db.batch([
    db.prepare("SELECT industry, COUNT(*) AS count FROM industry_articles WHERE owner_id = ? GROUP BY industry").bind(ownerId),
    db.prepare(`SELECT SUM(CASE WHEN COALESCE(x.read_at, '') = '' THEN 1 ELSE 0 END) AS unreadCount,
      SUM(CASE WHEN COALESCE(x.starred, 0) = 1 THEN 1 ELSE 0 END) AS starredCount
      FROM industry_articles a LEFT JOIN industry_article_actions x ON x.article_id = a.id AND x.owner_id = a.owner_id
      WHERE a.owner_id = ? AND COALESCE(x.muted, 0) = 0`).bind(ownerId),
    db.prepare(`SELECT COUNT(*) AS sourceCount,
      SUM(CASE WHEN enabled = 1 AND consecutive_failures >= 3 THEN 1 ELSE 0 END) AS unhealthySourceCount,
      MAX(last_success_at) AS lastSuccessfulAt FROM industry_sources WHERE owner_id = ?`).bind(ownerId),
    db.prepare("SELECT MAX(finished_at) AS updatedAt FROM industry_ingestion_runs WHERE owner_id = ? AND status = 'succeeded'").bind(ownerId),
  ]);
  const counts = Object.fromEntries(INDUSTRY_CATEGORIES.map((industry) => [industry, 0])) as Record<IndustryCategory, number>;
  for (const row of countResult.results as Array<Record<string, unknown>>) {
    if (INDUSTRY_CATEGORIES.includes(row.industry as IndustryCategory)) counts[row.industry as IndustryCategory] = Number(row.count || 0);
  }
  const actions = actionResult.results[0] as Record<string, unknown> | undefined;
  const sources = sourceResult.results[0] as Record<string, unknown> | undefined;
  const run = runResult.results[0] as Record<string, unknown> | undefined;
  return {
    articles,
    counts,
    unreadCount: Number(actions?.unreadCount || 0),
    starredCount: Number(actions?.starredCount || 0),
    sourceCount: Number(sources?.sourceCount || 0),
    unhealthySourceCount: Number(sources?.unhealthySourceCount || 0),
    updatedAt: String(run?.updatedAt || ""),
    lastSuccessfulAt: String(sources?.lastSuccessfulAt || ""),
    nextCursor: hasMore ? Number(articleRows.at(-1)?.id || 0) : null,
    methodology: "官方来源优先；Feed 使用 ETag/Last-Modified 增量采集，URL 规范化后精确去重，标题使用 64 位 SimHash 指纹辅助识别重复。来源真实性、内容完整度与交叉印证分别展示。",
  };
}

async function refreshSource(db: D1Database, source: SourceRow) {
  const startedAt = nowIso();
  const run = await db.prepare(`INSERT INTO industry_ingestion_runs (owner_id, source_id, status, started_at)
    VALUES (?, ?, 'running', ?)`)
    .bind(source.owner_id, source.id, startedAt).run();
  const runId = Number(run.meta.last_row_id || 0);
  try {
    const conditional: Record<string, string> = {};
    if (source.etag) conditional["If-None-Match"] = source.etag;
    if (source.last_modified) conditional["If-Modified-Since"] = source.last_modified;
    const { response } = await fetchPublicFeed(source.url, conditional);
    const checkedAt = nowIso();
    if (response.status === 304) {
      const next = nextCheck(source.poll_interval_minutes);
      await db.batch([
        db.prepare(`UPDATE industry_sources SET last_checked_at = ?, last_success_at = ?, next_check_at = ?, consecutive_failures = 0, last_error = '', updated_at = ? WHERE id = ?`)
          .bind(checkedAt, checkedAt, next, checkedAt, source.id),
        db.prepare(`UPDATE industry_ingestion_runs SET status = 'succeeded', finished_at = ? WHERE id = ?`).bind(checkedAt, runId),
      ]);
      return { sourceId: source.id, discovered: 0, inserted: 0, duplicates: 0, notModified: true };
    }
    if (!response.ok) throw new Error(`来源返回 HTTP ${response.status}`);
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error("Feed 超过 2MB 限制");
    const items = parseFeed(xml, source.url, 30);
    if (!items.length) throw new Error("没有识别到 RSS/Atom 条目");
    let inserted = 0;
    const discoveredAt = nowIso();
    for (const item of items) {
      const canonicalUrl = canonicalizeUrl(item.url);
      const urlHash = await hashText(canonicalUrl);
      const contentFingerprint = await hashText(item.contentExcerpt || item.summary || item.title);
      const titleFingerprint = simHashTitle(item.title);
      const publishedAt = item.publishedAt || discoveredAt;
      const ageDays = Math.max(0, (Date.now() - Date.parse(publishedAt)) / 86_400_000);
      const importance = clamp(48 + source.priority * 0.32 + (ageDays <= 3 ? 8 : ageDays <= 14 ? 4 : 0), 35, 92);
      const inferredIndustry = inferIndustry(`${item.title} ${item.summary} ${item.contentExcerpt.slice(0, 500)}`, source.industry);
      const titleDuplicate = await db.prepare(`SELECT id, source_id AS sourceId FROM industry_articles
        WHERE owner_id = ? AND title_fingerprint = ? LIMIT 1`).bind(source.owner_id, titleFingerprint).first<{ id: number; sourceId: number | null }>();
      if (titleDuplicate) {
        if (titleDuplicate.sourceId !== source.id) {
          await db.prepare(`UPDATE industry_articles SET corroboration_status = 'multiple_sources',
            confidence_score = MIN(96, confidence_score + 4), event_group_id = ? WHERE id = ? AND owner_id = ?`)
            .bind(titleFingerprint, titleDuplicate.id, source.owner_id).run();
        }
        continue;
      }
      const result = await db.prepare(`INSERT OR IGNORE INTO industry_articles
        (owner_id, source_id, canonical_url, title, summary, content_excerpt, source_name, published_at, discovered_at, updated_at,
         language, industry, topic, company, tags, entities, url_hash, title_fingerprint, content_fingerprint, event_group_id,
         relevance_score, importance_score, confidence_score, source_authenticity, content_status, corroboration_status, raw_payload_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto', ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'single_source', ?)`)
        .bind(source.owner_id, source.id, canonicalUrl, item.title, item.summary || item.contentExcerpt.slice(0, 520), item.contentExcerpt,
          source.name, publishedAt, discoveredAt, discoveredAt, inferredIndustry, source.topic, source.company,
          urlHash, titleFingerprint, contentFingerprint, titleFingerprint, clamp(62 + source.priority * 0.22, 55, 90), importance,
          source.trust_level === "official" ? 90 : source.trust_level === "institution" ? 82 : 68,
          source.trust_level === "official" ? "official" : "reviewed", item.contentExcerpt ? "excerpt" : "summary_only", contentFingerprint).run();
      inserted += Number(result.meta.changes || 0);
    }
    const finishedAt = nowIso();
    const next = nextCheck(source.poll_interval_minutes);
    await db.batch([
      db.prepare(`UPDATE industry_sources SET etag = ?, last_modified = ?, last_checked_at = ?, last_success_at = ?, next_check_at = ?,
        consecutive_failures = 0, last_error = '', updated_at = ? WHERE id = ?`)
        .bind(response.headers.get("etag") || source.etag, response.headers.get("last-modified") || source.last_modified, finishedAt, finishedAt, next, finishedAt, source.id),
      db.prepare(`UPDATE industry_ingestion_runs SET status = 'succeeded', discovered_count = ?, inserted_count = ?, duplicate_count = ?, finished_at = ? WHERE id = ?`)
        .bind(items.length, inserted, items.length - inserted, finishedAt, runId),
    ]);
    return { sourceId: source.id, discovered: items.length, inserted, duplicates: items.length - inserted, notModified: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "来源采集失败";
    const failures = source.consecutive_failures + 1;
    const finishedAt = nowIso();
    await db.batch([
      db.prepare(`UPDATE industry_sources SET last_checked_at = ?, next_check_at = ?, consecutive_failures = ?, last_error = ?, updated_at = ? WHERE id = ?`)
        .bind(finishedAt, nextCheck(source.poll_interval_minutes, failures), failures, message.slice(0, 500), finishedAt, source.id),
      db.prepare(`UPDATE industry_ingestion_runs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?`).bind(message.slice(0, 500), finishedAt, runId),
    ]);
    return { sourceId: source.id, discovered: 0, inserted: 0, duplicates: 0, error: message };
  }
}

export async function refreshIndustrySources(db: D1Database, ownerId: string, options: { force?: boolean; sourceId?: number } = {}) {
  await ensureIndustrySeed(db, ownerId);
  const conditions = ["owner_id = ?", "enabled = 1", "kind IN ('rss', 'rsshub')"];
  const values: unknown[] = [ownerId];
  if (options.sourceId) {
    conditions.push("id = ?");
    values.push(options.sourceId);
  } else if (!options.force) {
    conditions.push("(next_check_at = '' OR next_check_at <= ?)");
    values.push(nowIso());
  }
  const sourceResult = await db.prepare(`SELECT * FROM industry_sources WHERE ${conditions.join(" AND ")} ORDER BY priority DESC LIMIT 16`)
    .bind(...values).all<SourceRow>();
  const results = [];
  for (let index = 0; index < sourceResult.results.length; index += 3) {
    results.push(...await Promise.all(sourceResult.results.slice(index, index + 3).map((source) => refreshSource(db, source))));
  }
  return {
    checked: results.length,
    inserted: results.reduce((sum, item) => sum + item.inserted, 0),
    duplicates: results.reduce((sum, item) => sum + item.duplicates, 0),
    failed: results.filter((item) => "error" in item).length,
    results,
  };
}

export async function runDueIndustrySources(db: D1Database) {
  const owners = await db.prepare(`SELECT DISTINCT owner_id AS ownerId FROM industry_sources
    WHERE enabled = 1 AND kind IN ('rss', 'rsshub') AND (next_check_at = '' OR next_check_at <= ?) LIMIT 40`)
    .bind(nowIso()).all<{ ownerId: string }>();
  const results = [];
  for (const owner of owners.results) results.push({ ownerId: owner.ownerId, ...(await refreshIndustrySources(db, owner.ownerId)) });
  return results;
}

export async function updateArticleAction(db: D1Database, ownerId: string, articleId: number, action: "read" | "star" | "mute", value: boolean) {
  const article = await db.prepare("SELECT id FROM industry_articles WHERE id = ? AND owner_id = ?").bind(articleId, ownerId).first();
  if (!article) throw new Error("资讯不存在");
  const timestamp = nowIso();
  const readAt = action === "read" && value ? timestamp : "";
  await db.prepare(`INSERT INTO industry_article_actions (owner_id, article_id, read_at, starred, muted, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id, article_id) DO UPDATE SET
      read_at = CASE WHEN ? = 'read' THEN excluded.read_at ELSE industry_article_actions.read_at END,
      starred = CASE WHEN ? = 'star' THEN excluded.starred ELSE industry_article_actions.starred END,
      muted = CASE WHEN ? = 'mute' THEN excluded.muted ELSE industry_article_actions.muted END,
      updated_at = excluded.updated_at`)
    .bind(ownerId, articleId, readAt, action === "star" && value ? 1 : 0, action === "mute" && value ? 1 : 0, timestamp, action, action, action).run();
}

export async function saveArticleToKnowledge(db: D1Database, ownerId: string, articleId: number) {
  const article = await db.prepare(`SELECT a.*, x.knowledge_id AS knowledge_id FROM industry_articles a
    LEFT JOIN industry_article_actions x ON x.article_id = a.id AND x.owner_id = a.owner_id
    WHERE a.id = ? AND a.owner_id = ? LIMIT 1`).bind(articleId, ownerId).first<Record<string, unknown>>();
  if (!article) throw new Error("资讯不存在");
  if (article.knowledge_id) return Number(article.knowledge_id);
  const title = String(article.title || "行业资讯");
  const summary = String(article.summary || "");
  const url = String(article.canonical_url || "");
  const source = String(article.source_name || "行业来源");
  const content = `${summary}\n\n原文：${url}`;
  const analysis = analyzeKnowledgeContent({ title, content, summaryHint: summary, sourceType: "行业资讯" });
  const timestamp = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const result = await db.prepare(`INSERT INTO knowledge
    (owner_id, title, summary, content, category, primary_category, secondary_category, confidence, source, source_type, created_at,
     keywords, related_ids, related_topics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '行业资讯', ?, ?, '[]', ?)`)
    .bind(ownerId, title, summary, content, `${analysis.primaryCategory} · ${analysis.secondaryCategory}`, analysis.primaryCategory, analysis.secondaryCategory,
      analysis.confidence, source, timestamp, JSON.stringify(analysis.keywords), JSON.stringify(analysis.relatedTopics)).run();
  const knowledgeId = Number(result.meta.last_row_id || 0);
  await db.prepare(`INSERT INTO industry_article_actions (owner_id, article_id, read_at, starred, archived_at, knowledge_id, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(owner_id, article_id) DO UPDATE SET read_at = excluded.read_at, starred = 1,
      archived_at = excluded.archived_at, knowledge_id = excluded.knowledge_id, updated_at = excluded.updated_at`)
    .bind(ownerId, articleId, nowIso(), nowIso(), knowledgeId, nowIso()).run();
  return knowledgeId;
}

export function parseStoredTags(value: unknown) {
  return parseJsonArray(value);
}
