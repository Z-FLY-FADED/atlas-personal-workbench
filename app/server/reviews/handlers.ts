import { env } from 'cloudflare:workers';
import { taskPeriodStartKey } from "../../features/tasks/domain/dates";
import { isDateKey } from "../../features/workspace/domain/weeklyReview";
import { getOwnerId, unauthorizedResponse } from '../auth';
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    const week = new URL(request.url).searchParams.get('week') || '';
    if (!isDateKey(week))
        return Response.json({ error: '请选择有效周次' }, { status: 400 });
    try {
        const item = await env.DB.prepare('SELECT content, snapshot, revision, updated_at AS updatedAt FROM weekly_reviews WHERE owner_id = ? AND week_start = ?').bind(owner, taskPeriodStartKey('本周', week)).first();
        return Response.json({ item });
    }
    catch {
        return Response.json({ error: '周报暂时无法读取，请重试' }, { status: 503 });
    }
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const body = await request.json() as {
            week: string;
            content: string;
            snapshot: unknown;
            revision: number;
        };
        if (!isDateKey(body.week) || typeof body.content !== 'string' || body.content.length > 50000 || !Number.isInteger(body.revision) || body.revision < 0)
            return Response.json({ error: '周报内容或周次无效' }, { status: 400 });
        const week = taskPeriodStartKey('本周', body.week), updatedAt = new Date().toISOString();
        const snapshot = JSON.stringify(body.snapshot || {});
        if (snapshot.length > 100000)
            return Response.json({ error: '统计记录过大' }, { status: 400 });
        const result = body.revision === 0
            ? await env.DB.prepare('INSERT INTO weekly_reviews (id, owner_id, week_start, content, snapshot, revision, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(owner_id, week_start) DO NOTHING').bind(crypto.randomUUID(), owner, week, body.content, snapshot, updatedAt).run()
            : await env.DB.prepare('UPDATE weekly_reviews SET content = ?, snapshot = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND week_start = ? AND revision = ?').bind(body.content, snapshot, updatedAt, owner, week, body.revision).run();
        if (!result.meta.changes)
            return Response.json({ error: '这份周报已在其他页面更新。当前草稿已保留，请重新载入后合并。' }, { status: 409 });
        return Response.json({ revision: body.revision + 1, updatedAt });
    }
    catch {
        return Response.json({ error: '周报保存失败，草稿已保留' }, { status: 503 });
    }
}
