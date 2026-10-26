import { env } from 'cloudflare:workers';
import { createEmptyCard, fsrs, type CardInput, type Grade } from 'ts-fsrs';
import { getOwnerId, unauthorizedResponse } from '../auth';
const languages = new Set(['英语学习', '日语学习', '专业知识']);
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    const language = new URL(request.url).searchParams.get('language') || '专业知识';
    if (!languages.has(language))
        return Response.json({ error: '复习分类无效' }, { status: 400 });
    try {
        const rows = await env.DB.prepare('SELECT id, front, back, source_key AS sourceKey, due_at AS dueAt, revision, card FROM learning_cards WHERE owner_id = ? AND language = ? ORDER BY due_at, id').bind(owner, language).all();
        return Response.json({ items: rows.results, now: new Date().toISOString() });
    }
    catch {
        return Response.json({ error: '复习记录读取失败，请重试' }, { status: 503 });
    }
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const body = await request.json() as {
            action: string;
            language: string;
            items: Array<{
                front: string;
                back: string;
                sourceKey?: string;
            }>;
            id: string;
            rating: number;
            revision: number;
            operationId: string;
        };
        if (body.action === 'add') {
            if (!languages.has(body.language) || !Array.isArray(body.items) || body.items.length > 500)
                return Response.json({ error: '复习内容格式无效' }, { status: 400 });
            const now = new Date(), card = JSON.stringify(createEmptyCard(now));
            const inserts: D1PreparedStatement[] = [];
            for (const item of body.items) {
                if (typeof item.front !== 'string' || !item.front.trim() || item.front.length > 500 || typeof item.back !== 'string' || !item.back.trim() || item.back.length > 10000)
                    return Response.json({ error: '问题和答案不能为空，且不能超过长度限制' }, { status: 400 });
                inserts.push(env.DB.prepare('INSERT INTO learning_cards (id,owner_id,language,front,back,source_key,card,due_at,revision,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?) ON CONFLICT(owner_id,language,front,source_key) DO NOTHING').bind(crypto.randomUUID(), owner, body.language, item.front.trim(), item.back.trim(), String(item.sourceKey || '').slice(0, 500), card, now.toISOString(), now.toISOString()));
            }
            const results = inserts.length ? await env.DB.batch(inserts) : [];
            return Response.json({ added: results.reduce((sum, result) => sum + result.meta.changes, 0) });
        }
        if (body.action !== 'review' || ![1, 2, 3, 4].includes(body.rating) || !Number.isInteger(body.revision) || typeof body.operationId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.operationId))
            return Response.json({ error: '复习操作无效' }, { status: 400 });
        const current = await env.DB.prepare('SELECT * FROM learning_cards WHERE owner_id = ? AND id = ?').bind(owner, body.id).first<{
            card: string;
            revision: number;
        }>();
        if (!current)
            return Response.json({ error: '卡片不存在' }, { status: 404 });
        const previous = await env.DB.prepare('SELECT id FROM learning_logs WHERE id = ? AND owner_id = ? AND card_id = ?').bind(body.operationId, owner, body.id).first();
        if (previous)
            return Response.json({ reviewed: true });
        if (current.revision !== body.revision)
            return Response.json({ error: '卡片已更新，请刷新后继续复习' }, { status: 409 });
        const now = new Date();
        const next = fsrs({ enable_fuzz: false }).next(JSON.parse(current.card) as CardInput, now, body.rating as Grade);
        const result = await env.DB.batch([
            env.DB.prepare('INSERT INTO learning_logs (id,owner_id,card_id,rating,reviewed_at,log) SELECT ?,owner_id,id,?,?,? FROM learning_cards WHERE id = ? AND owner_id = ? AND revision = ?').bind(body.operationId, body.rating, now.toISOString(), JSON.stringify(next.log), body.id, owner, body.revision),
            env.DB.prepare('UPDATE learning_cards SET card=?,due_at=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?').bind(JSON.stringify(next.card), next.card.due.toISOString(), now.toISOString(), body.id, owner, body.revision),
        ]);
        if (!result[1].meta.changes)
            return Response.json({ error: '卡片已更新，请刷新后继续复习' }, { status: 409 });
        return Response.json({ reviewed: true, dueAt: next.card.due.toISOString() });
    }
    catch {
        return Response.json({ error: '复习记录保存失败，请刷新后重试' }, { status: 503 });
    }
}
