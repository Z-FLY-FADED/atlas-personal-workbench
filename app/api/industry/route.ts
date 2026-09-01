import { env } from "cloudflare:workers";
import { getOwnerId, unauthorizedResponse } from "../auth";
import {
  ensureIndustrySeed,
  getIndustryPayload,
  refreshIndustrySources,
  runDueIndustrySources,
  saveArticleToKnowledge,
  updateArticleAction,
} from "../../industry/storage";

export const dynamic = "force-dynamic";

type IndustryEnv = {
  DB: D1Database;
  AI_SCHEDULER_SECRET?: string;
};

const runtimeEnv = env as unknown as IndustryEnv;

function noStore(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, { ...init, headers: { "Cache-Control": "private, no-store", ...(init?.headers || {}) } });
}

export async function GET(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureIndustrySeed(runtimeEnv.DB, ownerId);
    const url = new URL(request.url);
    const payload = await getIndustryPayload(runtimeEnv.DB, ownerId, {
      industry: url.searchParams.get("industry") || undefined,
      lens: url.searchParams.get("lens") || undefined,
      query: url.searchParams.get("q") || undefined,
      cursor: Number(url.searchParams.get("cursor") || 0) || undefined,
      limit: Number(url.searchParams.get("limit") || 40),
      starredOnly: url.searchParams.get("starred") === "1",
    });
    return noStore(payload);
  } catch (error) {
    console.error("industry GET failed", error);
    return noStore({ error: "行业资讯暂不可用，请确认数据库迁移已应用" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (body.action === "run-due") {
    if (!runtimeEnv.AI_SCHEDULER_SECRET || request.headers.get("x-atlas-scheduler") !== runtimeEnv.AI_SCHEDULER_SECRET) {
      return noStore({ error: "unauthorized" }, { status: 401 });
    }
    return noStore({ results: await runDueIndustrySources(runtimeEnv.DB), checkedAt: new Date().toISOString() });
  }
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureIndustrySeed(runtimeEnv.DB, ownerId);
    if (body.action === "refresh") {
      const result = await refreshIndustrySources(runtimeEnv.DB, ownerId, {
        force: Boolean(body.force),
        sourceId: Number(body.sourceId || 0) || undefined,
      });
      return noStore({ ...result, payload: await getIndustryPayload(runtimeEnv.DB, ownerId) });
    }
    if (["read", "star", "mute"].includes(String(body.action))) {
      const articleId = Number(body.articleId || 0);
      if (!articleId) return noStore({ error: "articleId required" }, { status: 400 });
      await updateArticleAction(runtimeEnv.DB, ownerId, articleId, body.action as "read" | "star" | "mute", Boolean(body.value));
      return noStore({ ok: true });
    }
    if (body.action === "save-knowledge") {
      const articleId = Number(body.articleId || 0);
      if (!articleId) return noStore({ error: "articleId required" }, { status: 400 });
      return noStore({ ok: true, knowledgeId: await saveArticleToKnowledge(runtimeEnv.DB, ownerId, articleId) });
    }
    return noStore({ error: "unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "行业操作失败";
    console.error("industry POST failed", error);
    return noStore({ error: message }, { status: 500 });
  }
}

