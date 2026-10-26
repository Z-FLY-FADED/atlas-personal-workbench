import { env } from 'cloudflare:workers';
import { isDateKey } from "../../features/workspace/domain/weeklyReview";
import { getOwnerId, unauthorizedResponse } from '../auth';
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const body = await request.json() as {
            action: string;
            id: number;
            date: string;
        };
        if (body.action !== 'reschedule' || !Number.isInteger(body.id) || !isDateKey(body.date))
            return Response.json({ error: '任务或日期无效' }, { status: 400 });
        const result = await env.DB.prepare("UPDATE tasks SET active_on = ?, date = ? WHERE owner_id = ? AND id = ? AND horizon = '今日' AND done = 0").bind(body.date, body.date, owner, body.id).run();
        return Response.json(result.meta.changes ? { changed: 1 } : { error: '任务不存在或已完成，请刷新' }, { status: result.meta.changes ? 200 : 404 });
    }
    catch {
        return Response.json({ error: '任务更新失败，请重试' }, { status: 503 });
    }
}
