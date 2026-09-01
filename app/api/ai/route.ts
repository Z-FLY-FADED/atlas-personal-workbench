import { env } from "cloudflare:workers";
import { getOwnerId, unauthorizedResponse } from "../auth";

export const dynamic = "force-dynamic";

type AIEnv = {
  DB: D1Database;
  AI_KEY_ENCRYPTION_SECRET?: string;
  AI_SCHEDULER_SECRET?: string;
  AI_QUERY_RATE_LIMIT_PER_MINUTE?: string;
};

type ConnectionRow = {
  id: number;
  owner_id: string;
  name: string;
  provider: string;
  model: string;
  base_url: string;
  api_key_cipher: string;
  api_key_iv: string;
  is_active: number;
  status: string;
  updated_at: string;
};

type ScheduleRow = {
  id: number;
  owner_id: string;
  title: string;
  connection_id: number;
  prompt: string;
  cadence: string;
  time_of_day: string;
  weekdays: string;
  use_web: number;
  enabled: number;
  next_run_at: string;
  last_run_at: string;
};

const runtimeEnv = env as unknown as AIEnv;

function nowIso() {
  return new Date().toISOString();
}

async function checkQueryRateLimit(ownerId: string) {
  const configured = Number.parseInt(runtimeEnv.AI_QUERY_RATE_LIMIT_PER_MINUTE || "10", 10);
  const limit = Number.isFinite(configured) ? Math.min(60, Math.max(1, configured)) : 10;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / 60) * 60;
  await runtimeEnv.DB.prepare(`INSERT INTO ai_query_rate_limits (owner_id, window_start, request_count)
    VALUES (?, ?, 1)
    ON CONFLICT(owner_id) DO UPDATE SET
      window_start = CASE WHEN ai_query_rate_limits.window_start = excluded.window_start THEN ai_query_rate_limits.window_start ELSE excluded.window_start END,
      request_count = CASE WHEN ai_query_rate_limits.window_start = excluded.window_start THEN ai_query_rate_limits.request_count + 1 ELSE 1 END`)
    .bind(ownerId, windowStart).run();
  const state = await runtimeEnv.DB.prepare("SELECT request_count AS requestCount FROM ai_query_rate_limits WHERE owner_id = ?")
    .bind(ownerId).first<{ requestCount: number }>();
  return { allowed: Number(state?.requestCount || 0) <= limit, retryAfter: Math.max(1, windowStart + 60 - nowSeconds), limit };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  const secret = runtimeEnv.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("服务器尚未配置模型密钥加密服务");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  return { cipher: bytesToBase64(new Uint8Array(cipher)), iv: bytesToBase64(iv) };
}

async function decryptApiKey(cipher: string, iv: string) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await encryptionKey(), base64ToBytes(cipher));
  return new TextDecoder().decode(plain);
}

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("自定义接口必须使用 HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local")) throw new Error("不能连接本地或内网接口");
  return value.replace(/\/$/, "");
}

function extractOpenAIText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    const content = typeof item === "object" && item && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    return content.map((entry) => typeof entry === "object" && entry && typeof (entry as { text?: unknown }).text === "string" ? String((entry as { text: string }).text) : "");
  }).filter(Boolean).join("\n");
}

async function callProvider(connection: ConnectionRow, apiKey: string, prompt: string, useWeb = false) {
  const provider = connection.provider;
  let response: Response;
  if (provider === "openai") {
    const base = safeBaseUrl(connection.base_url || "https://api.openai.com/v1");
    response = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: connection.model, input: prompt, ...(useWeb ? { tools: [{ type: "web_search" }] } : {}) }),
      signal: AbortSignal.timeout(90000),
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(String((payload.error as { message?: string } | undefined)?.message || `OpenAI 请求失败 ${response.status}`));
    return extractOpenAIText(payload) || "模型已完成处理，但没有返回文本内容。";
  }
  if (provider === "anthropic") {
    const base = safeBaseUrl(connection.base_url || "https://api.anthropic.com/v1");
    response = await fetch(`${base}/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: connection.model, max_tokens: 2400, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(90000),
    });
    const payload = await response.json() as { content?: Array<{ text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Claude 请求失败 ${response.status}`);
    return payload.content?.map((item) => item.text || "").filter(Boolean).join("\n") || "模型没有返回文本内容。";
  }
  if (provider === "gemini") {
    const base = safeBaseUrl(connection.base_url || "https://generativelanguage.googleapis.com/v1beta");
    response = await fetch(`${base}/models/${encodeURIComponent(connection.model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(90000),
    });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Gemini 请求失败 ${response.status}`);
    return payload.candidates?.flatMap((item) => item.content?.parts || []).map((part) => part.text || "").filter(Boolean).join("\n") || "模型没有返回文本内容。";
  }
  const defaultBase = provider === "deepseek" ? "https://api.deepseek.com" : connection.base_url;
  const base = safeBaseUrl(defaultBase);
  response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: connection.model, messages: [{ role: "user", content: prompt }], stream: false }),
    signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || `模型请求失败 ${response.status}`);
  return payload.choices?.[0]?.message?.content || "模型没有返回文本内容。";
}

function nextRun(cadence: string, timeOfDay: string, weekdays: string, from = new Date()) {
  if (cadence === "hourly") {
    const next = new Date(from);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next.toISOString();
  }
  const [hour, minute] = timeOfDay.split(":").map(Number);
  const shanghai = new Date(from.getTime() + 8 * 3600000);
  const base = new Date(Date.UTC(shanghai.getUTCFullYear(), shanghai.getUTCMonth(), shanghai.getUTCDate(), hour || 0, minute || 0) - 8 * 3600000);
  if (cadence === "daily") {
    if (base <= from) base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString();
  }
  const allowed = weekdays.split(",").map(Number).filter((day) => day >= 0 && day <= 6);
  const days = allowed.length ? allowed : [1];
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(base);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const localDay = new Date(candidate.getTime() + 8 * 3600000).getUTCDay();
    if (days.includes(localDay) && candidate > from) return candidate.toISOString();
  }
  base.setUTCDate(base.getUTCDate() + 7);
  return base.toISOString();
}

async function runConnection(ownerId: string, connectionId: number, prompt: string, scheduleId: number | null, useWeb: boolean) {
  const connection = await runtimeEnv.DB.prepare("SELECT * FROM ai_connections WHERE id = ? AND owner_id = ? LIMIT 1").bind(connectionId, ownerId).first<ConnectionRow>();
  if (!connection) throw new Error("模型连接不存在或无权访问");
  const startedAt = nowIso();
  const inserted = await runtimeEnv.DB.prepare("INSERT INTO ai_runs (owner_id, schedule_id, connection_id, prompt, status, started_at) VALUES (?, ?, ?, ?, 'running', ?)")
    .bind(ownerId, scheduleId, connectionId, prompt, startedAt).run();
  const runId = Number(inserted.meta.last_row_id);
  try {
    const result = await callProvider(connection, await decryptApiKey(connection.api_key_cipher, connection.api_key_iv), prompt, useWeb);
    const finishedAt = nowIso();
    await runtimeEnv.DB.prepare("UPDATE ai_runs SET result = ?, status = 'succeeded', finished_at = ? WHERE id = ?").bind(result, finishedAt, runId).run();
    await runtimeEnv.DB.prepare("UPDATE ai_connections SET status = 'connected', updated_at = ? WHERE id = ?").bind(finishedAt, connectionId).run();
    return { id: runId, result, status: "succeeded", startedAt, finishedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "模型调用失败";
    const finishedAt = nowIso();
    await runtimeEnv.DB.prepare("UPDATE ai_runs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?").bind(message.slice(0, 1000), finishedAt, runId).run();
    await runtimeEnv.DB.prepare("UPDATE ai_connections SET status = 'error', updated_at = ? WHERE id = ?").bind(finishedAt, connectionId).run();
    throw new Error(message);
  }
}

async function runDueSchedules() {
  const due = await runtimeEnv.DB.prepare("SELECT * FROM ai_schedules WHERE enabled = 1 AND next_run_at != '' AND next_run_at <= ? ORDER BY next_run_at LIMIT 12").bind(nowIso()).all<ScheduleRow>();
  const results: Array<{ id: number; ok: boolean; error?: string }> = [];
  for (const schedule of due.results) {
    try {
      await runConnection(schedule.owner_id, schedule.connection_id, schedule.prompt, schedule.id, Boolean(schedule.use_web));
      results.push({ id: schedule.id, ok: true });
    } catch (error) {
      results.push({ id: schedule.id, ok: false, error: error instanceof Error ? error.message : "执行失败" });
    }
    const finished = nowIso();
    const next = nextRun(schedule.cadence, schedule.time_of_day, schedule.weekdays, new Date());
    await runtimeEnv.DB.prepare("UPDATE ai_schedules SET last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?").bind(finished, next, finished, schedule.id).run();
  }
  return results;
}

export async function GET(request: Request) {
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  const [connections, schedules, runs] = await runtimeEnv.DB.batch([
    runtimeEnv.DB.prepare("SELECT id, name, provider, model, base_url AS baseUrl, is_active AS isActive, status, updated_at AS updatedAt, CASE WHEN api_key_cipher != '' THEN 1 ELSE 0 END AS hasKey FROM ai_connections WHERE owner_id = ? ORDER BY is_active DESC, id DESC").bind(userId),
    runtimeEnv.DB.prepare(`SELECT s.id, s.title, s.connection_id AS connectionId, c.name AS connectionName, c.model, s.prompt, s.cadence, s.time_of_day AS timeOfDay, s.weekdays, s.use_web AS useWeb, s.enabled, s.next_run_at AS nextRunAt, s.last_run_at AS lastRunAt
      FROM ai_schedules s LEFT JOIN ai_connections c ON c.id = s.connection_id WHERE s.owner_id = ? ORDER BY s.enabled DESC, s.next_run_at`).bind(userId),
    runtimeEnv.DB.prepare(`SELECT r.id, r.schedule_id AS scheduleId, r.connection_id AS connectionId, c.name AS connectionName, c.model, r.prompt, r.result, r.status, r.error, r.started_at AS startedAt, r.finished_at AS finishedAt
      FROM ai_runs r LEFT JOIN ai_connections c ON c.id = r.connection_id WHERE r.owner_id = ? ORDER BY r.id DESC LIMIT 30`).bind(userId),
  ]);
  return Response.json({
    connections: connections.results.map((item: Record<string, unknown>) => ({ ...item, isActive: Boolean(item.isActive), hasKey: Boolean(item.hasKey) })),
    schedules: schedules.results.map((item: Record<string, unknown>) => ({ ...item, enabled: Boolean(item.enabled), useWeb: Boolean(item.useWeb) })),
    runs: runs.results,
    account: { authenticated: Boolean(request.headers.get("oai-authenticated-user-id")), email: request.headers.get("oai-authenticated-user-email") || "本地模式" },
    scheduler: { interval: "5分钟", timezone: "Asia/Shanghai" },
  });
}

export async function POST(request: Request) {
  const payload = await request.json() as Record<string, unknown>;
  if (payload.action === "run-due") {
    if (!runtimeEnv.AI_SCHEDULER_SECRET || request.headers.get("x-atlas-scheduler") !== runtimeEnv.AI_SCHEDULER_SECRET) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ results: await runDueSchedules(), checkedAt: nowIso() });
  }
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  try {
    if (payload.action === "save-connection") {
      const id = Number(payload.id || 0);
      const provider = String(payload.provider || "openai");
      const allowed = new Set(["openai", "deepseek", "anthropic", "gemini", "custom"]);
      if (!allowed.has(provider)) throw new Error("不支持的模型厂商");
      const name = String(payload.name || "新模型").trim().slice(0, 40);
      const model = String(payload.model || "").trim().slice(0, 100);
      if (!model) throw new Error("请填写模型 ID");
      const baseUrl = String(payload.baseUrl || "").trim().slice(0, 300);
      if (baseUrl) safeBaseUrl(baseUrl);
      const apiKey = String(payload.apiKey || "").trim();
      const updatedAt = nowIso();
      if (id) {
        if (apiKey) {
          const encrypted = await encryptApiKey(apiKey);
          await runtimeEnv.DB.prepare("UPDATE ai_connections SET name = ?, provider = ?, model = ?, base_url = ?, api_key_cipher = ?, api_key_iv = ?, status = 'configured', updated_at = ? WHERE id = ? AND owner_id = ?")
            .bind(name, provider, model, baseUrl, encrypted.cipher, encrypted.iv, updatedAt, id, userId).run();
        } else {
          await runtimeEnv.DB.prepare("UPDATE ai_connections SET name = ?, provider = ?, model = ?, base_url = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
            .bind(name, provider, model, baseUrl, updatedAt, id, userId).run();
        }
        return Response.json({ saved: true, id });
      }
      if (!apiKey) throw new Error("首次连接需要填写 API Key");
      const encrypted = await encryptApiKey(apiKey);
      const existing = await runtimeEnv.DB.prepare("SELECT COUNT(*) AS count FROM ai_connections WHERE owner_id = ?").bind(userId).first<{ count: number }>();
      const inserted = await runtimeEnv.DB.prepare("INSERT INTO ai_connections (owner_id, name, provider, model, base_url, api_key_cipher, api_key_iv, is_active, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'configured', ?, ?)")
        .bind(userId, name, provider, model, baseUrl, encrypted.cipher, encrypted.iv, existing?.count ? 0 : 1, updatedAt, updatedAt).run();
      return Response.json({ saved: true, id: inserted.meta.last_row_id });
    }
    if (payload.action === "set-active") {
      const id = Number(payload.id);
      await runtimeEnv.DB.batch([
        runtimeEnv.DB.prepare("UPDATE ai_connections SET is_active = 0 WHERE owner_id = ?").bind(userId),
        runtimeEnv.DB.prepare("UPDATE ai_connections SET is_active = 1 WHERE id = ? AND owner_id = ?").bind(id, userId),
      ]);
      return Response.json({ active: true, id });
    }
    if (payload.action === "delete-connection") {
      const id = Number(payload.id);
      await runtimeEnv.DB.batch([
        runtimeEnv.DB.prepare("DELETE FROM ai_schedules WHERE connection_id = ? AND owner_id = ?").bind(id, userId),
        runtimeEnv.DB.prepare("DELETE FROM ai_connections WHERE id = ? AND owner_id = ?").bind(id, userId),
      ]);
      return Response.json({ deleted: true });
    }
    if (payload.action === "query") {
      const rateLimit = await checkQueryRateLimit(userId);
      if (!rateLimit.allowed) {
        return Response.json(
          { error: `请求过于频繁，请在 ${rateLimit.retryAfter} 秒后重试` },
          { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter), "X-RateLimit-Limit": String(rateLimit.limit) } },
        );
      }
      const prompt = String(payload.prompt || "").trim().slice(0, 20000);
      if (!prompt) throw new Error("请输入查询内容");
      return Response.json({ run: await runConnection(userId, Number(payload.connectionId), prompt, null, Boolean(payload.useWeb)) });
    }
    if (payload.action === "save-schedule") {
      const id = Number(payload.id || 0);
      const connectionId = Number(payload.connectionId);
      const title = String(payload.title || "定时查询").trim().slice(0, 80);
      const prompt = String(payload.prompt || "").trim().slice(0, 20000);
      const cadence = ["hourly", "daily", "weekly"].includes(String(payload.cadence)) ? String(payload.cadence) : "daily";
      const timeOfDay = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(payload.timeOfDay)) ? String(payload.timeOfDay) : "08:00";
      const weekdays = String(payload.weekdays || "1,2,3,4,5");
      const enabled = payload.enabled === false ? 0 : 1;
      if (!connectionId || !prompt) throw new Error("请选择模型并填写查询指令");
      const nextRunAt = enabled ? nextRun(cadence, timeOfDay, weekdays) : "";
      const updatedAt = nowIso();
      if (id) {
        await runtimeEnv.DB.prepare("UPDATE ai_schedules SET title = ?, connection_id = ?, prompt = ?, cadence = ?, time_of_day = ?, weekdays = ?, use_web = ?, enabled = ?, next_run_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
          .bind(title, connectionId, prompt, cadence, timeOfDay, weekdays, payload.useWeb ? 1 : 0, enabled, nextRunAt, updatedAt, id, userId).run();
        return Response.json({ saved: true, id });
      }
      const inserted = await runtimeEnv.DB.prepare("INSERT INTO ai_schedules (owner_id, title, connection_id, prompt, cadence, time_of_day, weekdays, use_web, enabled, next_run_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, title, connectionId, prompt, cadence, timeOfDay, weekdays, payload.useWeb ? 1 : 0, enabled, nextRunAt, updatedAt, updatedAt).run();
      return Response.json({ saved: true, id: inserted.meta.last_row_id });
    }
    if (payload.action === "toggle-schedule") {
      const id = Number(payload.id);
      const schedule = await runtimeEnv.DB.prepare("SELECT * FROM ai_schedules WHERE id = ? AND owner_id = ?").bind(id, userId).first<ScheduleRow>();
      if (!schedule) throw new Error("定时任务不存在");
      const enabled = payload.enabled ? 1 : 0;
      await runtimeEnv.DB.prepare("UPDATE ai_schedules SET enabled = ?, next_run_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
        .bind(enabled, enabled ? nextRun(schedule.cadence, schedule.time_of_day, schedule.weekdays) : "", nowIso(), id, userId).run();
      return Response.json({ updated: true });
    }
    if (payload.action === "run-schedule") {
      const schedule = await runtimeEnv.DB.prepare("SELECT * FROM ai_schedules WHERE id = ? AND owner_id = ?").bind(Number(payload.id), userId).first<ScheduleRow>();
      if (!schedule) throw new Error("定时任务不存在");
      const run = await runConnection(userId, schedule.connection_id, schedule.prompt, schedule.id, Boolean(schedule.use_web));
      await runtimeEnv.DB.prepare("UPDATE ai_schedules SET last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?").bind(nowIso(), nextRun(schedule.cadence, schedule.time_of_day, schedule.weekdays), nowIso(), schedule.id).run();
      return Response.json({ run });
    }
    if (payload.action === "delete-schedule") {
      await runtimeEnv.DB.prepare("DELETE FROM ai_schedules WHERE id = ? AND owner_id = ?").bind(Number(payload.id), userId).run();
      return Response.json({ deleted: true });
    }
    return Response.json({ error: "unsupported action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "操作失败" }, { status: 500 });
  }
}
