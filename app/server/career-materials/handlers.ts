import { env } from 'cloudflare:workers';
import { resumePrintHtml, validateAttachment } from "../../features/career/domain/materials";
import { getOwnerId, unauthorizedResponse } from '../auth';
const q = (sql: string, ...values: (string | number | null)[]) => env.DB.prepare(sql).bind(...values);
const txt = (value: unknown, max = 200) => String(value ?? '').replaceAll('\0', '').trim().slice(0, max);
const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : '保存失败' }, { status: 400 });
type Version = {
    id: string;
    title: string;
    company: string;
    role: string;
    content: string;
    sourceContent: string;
    changeNote: string;
    revision: number;
    archived: number;
    createdAt: string;
    updatedAt: string;
};
async function version(owner: string, id: string) {
    const row = await q('SELECT id,title,company,role,content,source_content AS sourceContent,change_note AS changeNote,revision,archived,created_at AS createdAt,updated_at AS updatedAt FROM resume_versions WHERE owner_id=? AND id=?', owner, id).first<Version>();
    if (!row)
        throw new Error('简历版本不存在');
    return row;
}
function downloadName(name: string) { return `attachment; filename="atlas-download"; filename*=UTF-8''${encodeURIComponent(name).replaceAll("'", '%27')}`; }
export async function GET(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    const u = new URL(request.url), id = u.searchParams.get('id') || '', kind = u.searchParams.get('kind');
    try {
        if (kind === 'attachment') {
            const row = await q('SELECT file_name AS name,mime_type AS mime,data_base64 AS data FROM career_attachments WHERE id=? AND owner_id=?', id, owner).first<{
                name: string;
                mime: string;
                data: string;
            }>();
            if (!row)
                return Response.json({ error: '附件不存在' }, { status: 404 });
            return new Response(Uint8Array.from(atob(row.data), c => c.charCodeAt(0)), { headers: { 'Content-Type': row.mime, 'Content-Disposition': downloadName(row.name), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
        }
        if (kind === 'print' || kind === 'export') {
            const applicationId = Number(u.searchParams.get('applicationId'));
            const row = applicationId ? await q('SELECT title,content_snapshot AS content FROM application_resume_links WHERE owner_id=? AND application_id=?', owner, applicationId).first<{
                title: string;
                content: string;
            }>() : await version(owner, id);
            if (!row)
                throw new Error('投递快照不存在');
            return kind === 'print'
                ? new Response(resumePrintHtml(row.title, row.content), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } })
                : new Response(JSON.stringify(row, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': downloadName(`${row.title}.json`) } });
        }
        if (id)
            return Response.json({ item: await version(owner, id), attachments: (await q('SELECT id,file_name AS fileName,mime_type AS mimeType,size,archived,created_at AS createdAt FROM career_attachments WHERE owner_id=? AND version_id=? ORDER BY created_at DESC', owner, id).all()).results });
        const [versions, links] = await env.DB.batch([
            q('SELECT id,title,company,role,revision,archived,created_at AS createdAt,updated_at AS updatedAt FROM resume_versions WHERE owner_id=? ORDER BY updated_at DESC', owner),
            q('SELECT id,application_id AS applicationId,version_id AS versionId,version_revision AS versionRevision,title,linked_at AS linkedAt FROM application_resume_links WHERE owner_id=?', owner),
        ]);
        return Response.json({ versions: versions.results, links: links.results });
    }
    catch (e) {
        return fail(e);
    }
}
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner)
        return unauthorizedResponse();
    try {
        const raw = await request.text();
        if (raw.length > 1500000)
            throw new Error('文件超过大小限制');
        const p = JSON.parse(raw) as Record<string, unknown>, id = txt(p.id, 100), now = new Date().toISOString();
        if (p.kind === 'create') {
            if (!id || !txt(p.title))
                throw new Error('请输入版本名称');
            const existing = await q('SELECT owner_id FROM resume_versions WHERE id=?', id).first<{
                owner_id: string;
            }>();
            if (existing) {
                if (existing.owner_id !== owner)
                    throw new Error('版本编号冲突');
                return Response.json({ id });
            }
            const source = p.sourceId ? await version(owner, txt(p.sourceId)) : await q('SELECT content FROM resumes WHERE owner_id=?', owner).first<{
                content: string;
            }>();
            if (!source?.content)
                throw new Error('请先导入主简历');
            await q('INSERT INTO resume_versions (id,owner_id,title,company,role,content,source_content,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', id, owner, txt(p.title), txt(p.company), txt(p.role), source.content, source.content, now, now).run();
            return Response.json({ id });
        }
        if (p.kind === 'save' || p.kind === 'archive') {
            const current = await version(owner, id);
            const content = txt(p.content, 100000), title = txt(p.title);
            if (p.kind === 'save' && (!content || !title))
                throw new Error('版本名称和正文不能为空');
            const result = p.kind === 'archive'
                ? await q('UPDATE resume_versions SET archived=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?', p.archived ? 1 : 0, now, id, owner, Number(p.revision)).run()
                : await q('UPDATE resume_versions SET title=?,company=?,role=?,content=?,change_note=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?', title, txt(p.company), txt(p.role), content, txt(p.changeNote, 2000), now, id, owner, Number(p.revision)).run();
            if (!result.meta.changes)
                return Response.json({ error: `版本已被更新（当前修订 ${current.revision}），请先复制本机正文，再重新打开最新版本` }, { status: 409 });
            return Response.json({ saved: true });
        }
        if (p.kind === 'bind') {
            const current = await version(owner, txt(p.versionId));
            if (current.archived)
                throw new Error('请先恢复已归档的版本');
            const app = await q('SELECT id FROM applications WHERE owner_id=? AND id=?', owner, Number(p.applicationId)).first();
            if (!app)
                throw new Error('投递记录不存在');
            if (Number(p.revision) !== current.revision)
                return Response.json({ error: '简历版本已更新，请刷新版本后再关联' }, { status: 409 });
            await q(`INSERT INTO application_resume_links (id,owner_id,application_id,version_id,version_revision,title,content_snapshot,linked_at) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(owner_id,application_id) DO UPDATE SET version_id=excluded.version_id,version_revision=excluded.version_revision,title=excluded.title,content_snapshot=excluded.content_snapshot,linked_at=excluded.linked_at`, crypto.randomUUID(), owner, Number(p.applicationId), current.id, current.revision, current.title, current.content, now).run();
            return Response.json({ saved: true });
        }
        if (p.kind === 'upload') {
            const current = await version(owner, txt(p.versionId));
            if (current.archived)
                throw new Error('请先恢复简历版本');
            const name = txt(p.fileName, 180).replace(/[\\/\r\n]/g, '_'), base64 = String(p.data || ''), file = validateAttachment(name, base64);
            if (!id)
                throw new Error('附件编号无效');
            const exists = await q('SELECT id FROM career_attachments WHERE id=? AND owner_id=?', id, owner).first();
            if (exists)
                return Response.json({ saved: true });
            const total = await q('SELECT COALESCE(SUM(size),0) AS size FROM career_attachments WHERE owner_id=?', owner).first<{
                size: number;
            }>();
            if ((total?.size || 0) + file.size > 10 * 1024 * 1024)
                throw new Error('当前附件总容量上限为 10 MB');
            await q('INSERT INTO career_attachments (id,owner_id,version_id,file_name,mime_type,size,data_base64,created_at) VALUES (?,?,?,?,?,?,?,?)', id, owner, current.id, name, file.mime, file.size, base64, now).run();
            return Response.json({ saved: true });
        }
        if (p.kind === 'attachment-archive') {
            const result = await q('UPDATE career_attachments SET archived=? WHERE id=? AND owner_id=?', p.archived ? 1 : 0, id, owner).run();
            if (!result.meta.changes)
                throw new Error('附件不存在');
            return Response.json({ saved: true });
        }
        throw new Error('不支持的操作');
    }
    catch (e) {
        return fail(e);
    }
}
