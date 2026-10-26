import { env } from 'cloudflare:workers';
import { getOwnerId, unauthorizedResponse } from '../auth';
import { exportWorkspace, inspectArchive, MAX_ARCHIVE_BYTES, restoreRecycled } from "./archive";
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        if (new URL(request.url).searchParams.get('view') === 'trash') {
            const rows = await env.DB.prepare('SELECT id, entity, payload, deleted_at AS deletedAt FROM recycled_records WHERE owner_id = ? ORDER BY deleted_at DESC').bind(owner).all<{
                id: string;
                entity: string;
                payload: string;
                deletedAt: string;
            }>();
            return Response.json({ items: rows.results.map(({ payload, ...row }) => { const item = JSON.parse(payload); return { ...row, title: item.title || item.company || String(item.content || '').slice(0, 60) || '未命名记录' }; }) }, { headers: { 'Cache-Control': 'no-store' } });
        }
        return Response.json(await exportWorkspace(env.DB, owner), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.json({ error: '数据读取失败，请重试' }, { status: 503 });
    }
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const text = await request.text();
        if (text.length > MAX_ARCHIVE_BYTES)
            return Response.json({ error: '文件超过 50 MB' }, { status: 413 });
        const body = JSON.parse(text);
        if (body.action === 'restore-trash') {
            await restoreRecycled(env.DB, owner, String(body.id));
            return Response.json({ restored: true });
        }
        if (!['preview', 'restore'].includes(body.action))
            return Response.json({ error: '无效操作' }, { status: 400 });
        const inspected = await inspectArchive(env.DB, owner, body.archive);
        if (body.action === 'restore') {
            // Revalidate on the writing request and commit all missing records atomically.
            if (inspected.statements.length)
                await env.DB.batch(inspected.statements);
        }
        return Response.json({ summary: inspected.summary, added: inspected.statements.length, restored: body.action === 'restore' });
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : '恢复失败，未覆盖现有记录' }, { status: 400 });
    }
}
