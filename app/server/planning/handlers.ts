import { env } from 'cloudflare:workers';
import { DEFAULT_LAYOUT, normalizeLayout, safeWebUrl } from "../../features/planning/domain/planning";
import { getOwnerId, unauthorizedResponse } from '../auth';
const query = (sql: string, ...values: (string | number | null)[]) => env.DB.prepare(sql).bind(...values);
const fail = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : '保存失败' }, { status: 400 });
function str(value: unknown, max = 200) { return String(value ?? '').replaceAll('\0', '').trim().slice(0, max); }
async function parent(table: 'tasks' | 'projects', id: number, owner: string) {
    const row = await query(`SELECT id,title FROM ${table} WHERE id=? AND owner_id=?`, id, owner).first<{
        id: number;
        title: string;
    }>();
    if (!row)
        throw new Error('记录不存在，请刷新后重试');
    return row;
}
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    const url = new URL(request.url);
    try {
        if (url.searchParams.get('kind') === 'layout') {
            const row = await query("SELECT value FROM workspace_settings WHERE owner_id=? AND key='dashboard-layout'", owner).first<{
                value: string;
            }>();
            return Response.json({ layout: row ? normalizeLayout(JSON.parse(row.value)) : DEFAULT_LAYOUT });
        }
        if (url.searchParams.get('kind') === 'focus')
            return Response.json({ items: (await query('SELECT id,task_id AS taskId,task_title AS taskTitle,seconds,completed_at AS completedAt FROM focus_sessions WHERE owner_id=? ORDER BY completed_at DESC LIMIT 1000', owner).all()).results });
        if (url.searchParams.has('projectId')) {
            const id = Number(url.searchParams.get('projectId'));
            await parent('projects', id, owner);
            return Response.json({ items: (await query('SELECT id,knowledge_key AS knowledgeKey,title,source FROM project_knowledge WHERE owner_id=? AND project_id=? ORDER BY rowid', owner, id).all()).results });
        }
        const id = Number(url.searchParams.get('taskId'));
        await parent('tasks', id, owner);
        const [subtasks, focus] = await env.DB.batch([
            query('SELECT id,title,done,archived,position FROM task_subtasks WHERE owner_id=? AND task_id=? ORDER BY position', owner, id),
            query('SELECT id,task_title AS taskTitle,seconds,completed_at AS completedAt FROM focus_sessions WHERE owner_id=? AND task_id=? ORDER BY completed_at DESC', owner, id),
        ]);
        return Response.json({ subtasks: subtasks.results, focus: focus.results });
    }
    catch (error) {
        return fail(error);
    }
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const p = await request.json() as Record<string, unknown>;
        if (p.kind === 'layout') {
            const layout = normalizeLayout(p.layout);
            await query("INSERT INTO workspace_settings (id,owner_id,key,value) VALUES (?,?,'dashboard-layout',?) ON CONFLICT(owner_id,key) DO UPDATE SET value=excluded.value", crypto.randomUUID(), owner, JSON.stringify(layout)).run();
            return Response.json({ layout });
        }
        if (p.kind === 'subtask') {
            const taskId = Number(p.taskId);
            await parent('tasks', taskId, owner);
            const title = str(p.title);
            if (!title)
                throw new Error('子任务名称不能为空');
            if (p.id) {
                const result = await query('UPDATE task_subtasks SET title=?,done=?,archived=? WHERE id=? AND task_id=? AND owner_id=?', title, p.done ? 1 : 0, p.archived ? 1 : 0, str(p.id), taskId, owner).run();
                if (!result.meta.changes)
                    throw new Error('子任务不存在');
            }
            else {
                const count = await query('SELECT COUNT(*) AS n FROM task_subtasks WHERE task_id=? AND owner_id=?', taskId, owner).first<{
                    n: number;
                }>();
                if ((count?.n || 0) >= 100)
                    throw new Error('每个任务最多支持 100 个子任务');
                await query('INSERT INTO task_subtasks (id,owner_id,task_id,title,position) SELECT ?,?,?,?,COALESCE(MAX(position),-1)+1 FROM task_subtasks WHERE task_id=? AND owner_id=?', crypto.randomUUID(), owner, taskId, title, taskId, owner).run();
            }
            return Response.json({ saved: true });
        }
        if (p.kind === 'focus') {
            const id = str(p.id, 200), seconds = Number(p.seconds), completedAt = str(p.completedAt, 40);
            if (!id || !Number.isInteger(seconds) || seconds < 1 || seconds > 86400 || !Number.isFinite(Date.parse(completedAt)) || Date.parse(completedAt) > Date.now() + 60000)
                throw new Error('专注记录无效');
            const taskId = Number(p.taskId) || null;
            const task = taskId ? await query('SELECT title FROM tasks WHERE id=? AND owner_id=?', taskId, owner).first<{
                title: string;
            }>() : null;
            if (taskId && !task) {
                const recycled = await query("SELECT id FROM recycled_records WHERE owner_id=? AND entity='task' AND entity_id=?", owner, taskId).first();
                if (!recycled)
                    throw new Error('关联任务不存在');
            }
            await query('INSERT INTO focus_sessions (id,owner_id,task_id,task_title,seconds,completed_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING', id, owner, taskId, task?.title || str(p.taskTitle), seconds, new Date(completedAt).toISOString()).run();
            return Response.json({ saved: true });
        }
        if (p.kind === 'project-link') {
            const projectId = Number(p.projectId);
            await parent('projects', projectId, owner);
            if (p.remove)
                await query('DELETE FROM project_knowledge WHERE owner_id=? AND project_id=? AND id=?', owner, projectId, str(p.id)).run();
            else {
                const key = str(p.knowledgeKey, 400);
                let title = str(p.title);
                let source = safeWebUrl(str(p.source, 2048));
                if (key.startsWith('saved:')) {
                    const row = await query('SELECT title,source FROM knowledge WHERE id=? AND owner_id=?', Number(key.slice(6)), owner).first<{
                        title: string;
                        source: string;
                    }>();
                    if (!row)
                        throw new Error('资料不存在');
                    title = row.title;
                    source = safeWebUrl(row.source);
                }
                else if (!key.startsWith('builtin:'))
                    throw new Error('请选择有效资料');
                if (!title || !key)
                    throw new Error('请选择资料');
                await query('INSERT INTO project_knowledge (id,owner_id,project_id,knowledge_key,title,source) VALUES (?,?,?,?,?,?) ON CONFLICT(owner_id,project_id,knowledge_key) DO NOTHING', crypto.randomUUID(), owner, projectId, key, title, source).run();
            }
            return Response.json({ saved: true });
        }
        if (p.kind === 'capture') {
            const id = str(p.id, 80), title = str(p.title), url = safeWebUrl(str(p.url, 2048)), content = str(p.content, 30000);
            if (!id || !title || !url)
                throw new Error('请填写标题和有效的网页地址');
            const projectId = Number(p.projectId);
            if (projectId)
                await parent('projects', projectId, owner);
            const statements = [query(`INSERT INTO knowledge (owner_id,title,summary,content,source,source_type,created_at,keywords,capture_key) VALUES (?,?,?,?,?,'网页摘录',?,?,?) ON CONFLICT(owner_id,capture_key) DO NOTHING`, owner, title, content.slice(0, 220), content, url, new Date().toISOString(), JSON.stringify(str(p.tags, 500).split(/[,，]/).map(t => t.trim()).filter(Boolean)), id)];
            if (projectId)
                statements.push(query(`INSERT INTO project_knowledge (id,owner_id,project_id,knowledge_key,title,source) SELECT ?,owner_id,?,'saved:' || id,title,source FROM knowledge WHERE owner_id=? AND capture_key=? ON CONFLICT(owner_id,project_id,knowledge_key) DO NOTHING`, crypto.randomUUID(), projectId, owner, id));
            await env.DB.batch(statements);
            return Response.json({ saved: true, id: (await query('SELECT id FROM knowledge WHERE owner_id=? AND capture_key=?', owner, id).first())?.id });
        }
        throw new Error('不支持的操作');
    }
    catch (error) {
        return fail(error);
    }
}
