import type { SourceAvailability } from '../../contracts/runtime';
import { readRuntimePolicy } from './policy';
type Snapshot = { savedAt: string; payload: Record<string, unknown> };
async function snapshotKey(key: string) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    return 'public-snapshot:' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function savePublicSnapshot(db: D1Database, owner: string, key: string, payload: Record<string, unknown>) {
    const savedAt = new Date().toISOString();
    const value = JSON.stringify({ savedAt, payload });
    if (new TextEncoder().encode(value).length > 500000) return;
    await db.batch([
        db.prepare('DELETE FROM workspace_settings WHERE owner_id=? AND key=?').bind(owner, await snapshotKey(key)),
        db.prepare('INSERT INTO workspace_settings (id,owner_id,key,value) VALUES (?,?,?,?)').bind(crypto.randomUUID(), owner, await snapshotKey(key), value),
        db.prepare("DELETE FROM workspace_settings WHERE owner_id=? AND key LIKE 'public-snapshot:%' AND rowid NOT IN (SELECT rowid FROM workspace_settings WHERE owner_id=? AND key LIKE 'public-snapshot:%' ORDER BY rowid DESC LIMIT 12)").bind(owner, owner),
    ]);
}
export async function readPublicSnapshot(db: D1Database, owner: string, key: string): Promise<Snapshot | null> {
    const row = await db.prepare('SELECT value FROM workspace_settings WHERE owner_id=? AND key=?').bind(owner, await snapshotKey(key)).first<{ value: string }>();
    try {
        const data = row ? JSON.parse(row.value) : null;
        return data && typeof data.savedAt === 'string' && data.payload && typeof data.payload === 'object' ? data : null;
    } catch { return null; }
}
function historical(payload: Record<string, unknown>) {
    const result = { ...payload };
    // A saved quote is a historical observation; never keep a current trading signal.
    const downgrade = (value: unknown): unknown => Array.isArray(value) ? value.map(downgrade) : value && typeof value === 'object'
        ? { ...value, signal: 'insufficient_data', verified: false, quoteQuality: 'stale' } : value;
    if ('quoteSource' in result) {
        result.live = false;
        result.quoteSource = '历史行情缓存（非实时）';
        result.stocks = downgrade(result.stocks);
        result.instruments = downgrade(result.instruments);
        if (result.markets && typeof result.markets === 'object') result.markets = Object.fromEntries(Object.entries(result.markets).map(([k, v]) => [k, downgrade(v)]));
        result.verifiedCount = 0;
        if (Array.isArray(result.marketSummary)) result.marketSummary = result.marketSummary.map(item => ({ ...item, verifiedCount: 0 }));
    } else if (Array.isArray(result.instruments)) result.instruments = downgrade(result.instruments);
    return result;
}
const json = (payload: Record<string, unknown>, availability: SourceAvailability) => Response.json({ ...payload, availability }, { headers: { 'Cache-Control': 'private, no-store' } });
export async function publicSnapshotResponse(db: D1Database, owner: string | null, request: Request, loader: () => Promise<Response>, fallback: Record<string, unknown>, ttlMs = 300000) {
    const policy = await readRuntimePolicy(db, owner);
    const url = new URL(request.url);
    const force = url.searchParams.has('refresh');
    url.searchParams.delete('refresh');
    url.searchParams.sort();
    const key = url.pathname + url.search;
    const saved = owner ? await readPublicSnapshot(db, owner, key) : null;
    const fromSaved = (offline: boolean) => json(saved ? historical(saved.payload) : fallback, {
        state: offline ? 'offline' : saved ? 'cached' : 'unavailable', savedAt: saved?.savedAt || '',
        message: offline ? '离线模式：展示已保存的公开资料或本机目录，最新信息需联网更新。' : saved ? '来源暂不可访问，展示上次保存的资料。' : '公开来源暂不可访问，当前展示本机目录，在线状态待核验。',
    });
    if (policy.mode === 'offline') return fromSaved(true);
    if (saved && !force && Date.now() - Date.parse(saved.savedAt) < ttlMs) return json(saved.payload, { state: 'cached', savedAt: saved.savedAt, message: '使用近期公开来源缓存，刷新可重新采集。' });
    try {
        const response = await loader();
        if (!response.ok) return saved ? fromSaved(false) : response;
        const payload = await response.json() as Record<string, unknown>;
        if (payload.live === false || (typeof payload.verifiedCount === 'number' && payload.verifiedCount === 0)) {
            if (saved) return fromSaved(false);
            return json(payload, { state: 'unavailable', savedAt: '', message: '尚未获取有效的公开来源信息，当前内容待核验。' });
        }
        if (owner) await savePublicSnapshot(db, owner, key, payload);
        return json(payload, { state: 'fresh', savedAt: new Date().toISOString(), message: '来自公开来源，使用规则解析，未调用 AI。' });
    } catch (error) {
        if (saved) return fromSaved(false);
        if (Object.keys(fallback).length) return fromSaved(false);
        throw error;
    }
}
