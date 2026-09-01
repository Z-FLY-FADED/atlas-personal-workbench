import { env } from "cloudflare:workers";
import { getOwnerId, unauthorizedResponse } from "../../auth";
import { canonicalizeUrl, isSafePublicUrl } from "../../../industry/feed";
import { ensureIndustrySeed, listIndustrySources, refreshIndustrySources } from "../../../industry/storage";
import { INDUSTRY_CATEGORIES, type IndustryCategory } from "../../../industry/types";

export const dynamic = "force-dynamic";

type IndustryEnv = { DB: D1Database };
const runtimeEnv = env as unknown as IndustryEnv;
const allowedKinds = new Set(["rss", "rsshub"]);
const allowedTrust = new Set(["official", "institution", "media", "community"]);

function json(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, { ...init, headers: { "Cache-Control": "private, no-store", ...(init?.headers || {}) } });
}

export async function GET(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  await ensureIndustrySeed(runtimeEnv.DB, ownerId);
  return json({ sources: await listIndustrySources(runtimeEnv.DB, ownerId) });
}

export async function POST(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as Record<string, unknown>;
    const url = canonicalizeUrl(String(body.url || "").trim());
    if (!isSafePublicUrl(url)) return json({ error: "请输入安全的公开 HTTP/HTTPS Feed 地址" }, { status: 400 });
    const kind = allowedKinds.has(String(body.kind)) ? String(body.kind) : "rss";
    const industry = INDUSTRY_CATEGORIES.includes(body.industry as IndustryCategory) ? String(body.industry) : "互联网大厂";
    const topic = body.topic === "company" ? "company" : "industry";
    const trustLevel = allowedTrust.has(String(body.trustLevel)) ? String(body.trustLevel) : "media";
    const name = String(body.name || new URL(url).hostname).trim().slice(0, 100);
    const company = String(body.company || "").trim().slice(0, 80);
    const interval = Math.max(15, Math.min(1440, Math.round(Number(body.pollIntervalMinutes) || 60)));
    const timestamp = new Date().toISOString();
    const result = await runtimeEnv.DB.prepare(`INSERT INTO industry_sources
      (owner_id, name, url, kind, industry, topic, company, trust_level, priority, poll_interval_minutes, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 60, ?, 1, ?, ?)
      ON CONFLICT(owner_id, url) DO UPDATE SET name = excluded.name, kind = excluded.kind, industry = excluded.industry,
        topic = excluded.topic, company = excluded.company, trust_level = excluded.trust_level,
        poll_interval_minutes = excluded.poll_interval_minutes, enabled = 1, updated_at = excluded.updated_at`)
      .bind(ownerId, name, url, kind, industry, topic, company, trustLevel, interval, timestamp, timestamp).run();
    const row = await runtimeEnv.DB.prepare("SELECT id FROM industry_sources WHERE owner_id = ? AND url = ? LIMIT 1").bind(ownerId, url).first<{ id: number }>();
    const refresh = await refreshIndustrySources(runtimeEnv.DB, ownerId, { force: true, sourceId: row?.id || Number(result.meta.last_row_id || 0) });
    return json({ ok: true, refresh, sources: await listIndustrySources(runtimeEnv.DB, ownerId) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "来源保存失败";
    return json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const body = await request.json() as Record<string, unknown>;
  const id = Number(body.id || 0);
  if (!id) return json({ error: "id required" }, { status: 400 });
  const enabled = body.enabled === undefined ? null : Boolean(body.enabled);
  const interval = body.pollIntervalMinutes === undefined ? null : Math.max(15, Math.min(1440, Math.round(Number(body.pollIntervalMinutes) || 60)));
  const timestamp = new Date().toISOString();
  await runtimeEnv.DB.prepare(`UPDATE industry_sources SET
    enabled = CASE WHEN ? IS NULL THEN enabled ELSE ? END,
    poll_interval_minutes = CASE WHEN ? IS NULL THEN poll_interval_minutes ELSE ? END,
    next_check_at = CASE WHEN ? = 1 THEN '' ELSE next_check_at END,
    updated_at = ? WHERE id = ? AND owner_id = ? AND kind != 'seed'`)
    .bind(enabled === null ? null : enabled ? 1 : 0, enabled ? 1 : 0, interval, interval, enabled ? 1 : 0, timestamp, id, ownerId).run();
  return json({ ok: true, sources: await listIndustrySources(runtimeEnv.DB, ownerId) });
}

export async function DELETE(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return json({ error: "id required" }, { status: 400 });
  const source = await runtimeEnv.DB.prepare("SELECT kind FROM industry_sources WHERE id = ? AND owner_id = ?").bind(id, ownerId).first<{ kind: string }>();
  if (!source || source.kind === "seed") return json({ error: "内置种子来源不能删除" }, { status: 400 });
  await runtimeEnv.DB.prepare("DELETE FROM industry_sources WHERE id = ? AND owner_id = ?").bind(id, ownerId).run();
  return json({ ok: true, sources: await listIndustrySources(runtimeEnv.DB, ownerId) });
}

