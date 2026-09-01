import { env } from "cloudflare:workers";
import { getOwnerId, unauthorizedResponse } from "../../auth";

export const dynamic = "force-dynamic";

type WatchlistInstrument = {
  instrumentId?: unknown;
  region?: unknown;
  exchange?: unknown;
  code?: unknown;
  name?: unknown;
  industry?: unknown;
  currency?: unknown;
};

function now() {
  return new Date().toISOString();
}

function timezoneFor(region: string) {
  if (region === "US") return "America/New_York";
  if (region === "HK") return "Asia/Hong_Kong";
  return "Asia/Shanghai";
}

function lotSizeFor(region: string) {
  return region === "CN" ? 100 : 1;
}

export async function GET(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const result = await env.DB.prepare(
    "SELECT instrument_id AS instrumentId FROM watchlist_items WHERE owner_id = ? ORDER BY added_at DESC",
  ).bind(ownerId).all<{ instrumentId: string }>();
  return Response.json({ instrumentIds: result.results.map((row) => row.instrumentId) });
}

export async function POST(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const body = await request.json().catch(() => null) as WatchlistInstrument | null;
  const instrumentId = String(body?.instrumentId || "").trim();
  const region = String(body?.region || "").trim();
  const exchange = String(body?.exchange || "").trim();
  const symbol = String(body?.code || "").trim();
  const name = String(body?.name || "").trim();
  const industry = String(body?.industry || "未分类").trim();
  const currency = String(body?.currency || "").trim();
  if (!instrumentId || !region || !exchange || !symbol || !name || !currency) {
    return Response.json({ error: "invalid instrument" }, { status: 400 });
  }
  const timestamp = now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO instruments (id, region, exchange, symbol, display_symbol, name_zh, industry, asset_type, currency, timezone, lot_size, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'stock', ?, ?, ?, 'active', ?, ?) ON CONFLICT(id) DO UPDATE SET name_zh = excluded.name_zh, industry = excluded.industry, updated_at = excluded.updated_at",
    ).bind(instrumentId, region, exchange, symbol, symbol, name, industry, currency, timezoneFor(region), lotSizeFor(region), timestamp, timestamp),
    env.DB.prepare(
      "INSERT OR IGNORE INTO watchlists (owner_id, name, is_default, created_at, updated_at) VALUES (?, '我的自选', 1, ?, ?)",
    ).bind(ownerId, timestamp, timestamp),
  ]);
  const list = await env.DB.prepare(
    "SELECT id FROM watchlists WHERE owner_id = ? AND name = '我的自选' LIMIT 1",
  ).bind(ownerId).first<{ id: number }>();
  if (!list) return Response.json({ error: "watchlist unavailable" }, { status: 500 });
  await env.DB.prepare(
    "INSERT OR IGNORE INTO watchlist_items (owner_id, watchlist_id, instrument_id, note, added_at) VALUES (?, ?, ?, '', ?)",
  ).bind(ownerId, list.id, instrumentId, timestamp).run();
  return Response.json({ ok: true, instrumentId });
}

export async function DELETE(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const instrumentId = new URL(request.url).searchParams.get("instrumentId")?.trim();
  if (!instrumentId) return Response.json({ error: "instrumentId required" }, { status: 400 });
  await env.DB.prepare(
    "DELETE FROM watchlist_items WHERE owner_id = ? AND instrument_id = ?",
  ).bind(ownerId, instrumentId).run();
  return Response.json({ ok: true, instrumentId });
}
