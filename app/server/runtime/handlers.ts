import { env } from 'cloudflare:workers';
import { getOwnerId, unauthorizedResponse } from '../auth';
import { readRuntimePolicy, saveRuntimePolicy } from './policy';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner) return unauthorizedResponse();
    return json({ policy: await readRuntimePolicy(env.DB, owner) });
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner) return unauthorizedResponse();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !['offline', 'public', 'ai'].includes(String(body.mode))) return json({ error: '请选择有效的运行模式' }, 400);
    return json({ policy: await saveRuntimePolicy(env.DB, owner, body) });
}
