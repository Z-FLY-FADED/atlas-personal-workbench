import { env } from 'cloudflare:workers';
import { searchLocalRecords, type ResearchRecord } from '../../features/research/domain/localSearch';
import { initialKnowledge } from '../../features/knowledge/domain/initialKnowledge';
import { getOwnerId, unauthorizedResponse } from '../auth';
import { readRuntimePolicy } from '../runtime/policy';
import { readPublicSnapshot, savePublicSnapshot } from '../runtime/snapshots';
import { crawlPublicSource } from '../workspace/webSources';
export async function POST(request: Request) {
    const owner = getOwnerId(request);
    if (!owner) return unauthorizedResponse();
    const input = await request.json().catch(() => ({})) as Record<string, unknown>;
    const query = String(input.query || '').trim().slice(0, 2000);
    if (!query) return Response.json({ error: '请输入关键词或公开网页地址' }, { status: 400 });
    const policy = await readRuntimePolicy(env.DB, owner);
    const tables = [
        ['任务', "SELECT title,detail AS content FROM tasks WHERE owner_id=? ORDER BY id DESC LIMIT 300"],
        ['项目', "SELECT title,next_milestone AS content FROM projects WHERE owner_id=? ORDER BY id DESC LIMIT 100"],
        ['笔记', "SELECT substr(content,1,70) AS title,content FROM quick_notes WHERE owner_id=? ORDER BY id DESC LIMIT 300"],
        ['知识', "SELECT title,content FROM knowledge WHERE owner_id=? ORDER BY id DESC LIMIT 300"],
        ['行业', "SELECT title,summary AS content,canonical_url AS url FROM industry_articles WHERE owner_id=? ORDER BY published_at DESC,id DESC LIMIT 300"],
    ];
    const rows = await env.DB.batch<Record<string, unknown>>(tables.map(([, sql]) => env.DB.prepare(sql).bind(owner)));
    const records: ResearchRecord[] = rows.flatMap((result, index) => result.results.map(row => ({ kind: tables[index][0], title: String(row.title), content: String(row.content || ''), url: row.url ? String(row.url) : undefined })));
    records.push(...initialKnowledge.filter(item => !records.some(record => record.kind === '知识' && record.title === item.title)).map(item => ({ kind: '知识', title: item.title, content: item.summary + '\n' + (item.content || '') })));
    const matches = searchLocalRecords(query, records);
    const firstUrl = query.match(/https?:\/\/[^\s<>"']+/)?.[0];
    let sourceMessage = '';
    if (firstUrl && policy.mode !== 'offline') {
        const saved = await readPublicSnapshot(env.DB, owner, 'web:' + firstUrl);
        const recent = saved && Date.now() - Date.parse(saved.savedAt) < 900000;
        const page = recent ? null : await crawlPublicSource(firstUrl);
        if (page?.extracted) await savePublicSnapshot(env.DB, owner, 'web:' + firstUrl, page);
        if (page?.extracted) matches.unshift({ kind: '公开网页', title: page.title || page.host, content: page.summary + '\n' + page.extracted, url: page.url });
        else if (saved) {
            matches.unshift({ kind: '网页缓存', title: String(saved.payload.title || firstUrl), content: String(saved.payload.extracted || ''), url: firstUrl });
            sourceMessage = `使用网页原文缓存，保存时间：${saved.savedAt}。`;
        }
        else sourceMessage = '公开网页未能提取正文，可粘贴原文后在知识库收录。';
    } else if (firstUrl) {
        const saved = await readPublicSnapshot(env.DB, owner, 'web:' + firstUrl);
        if (saved) matches.unshift({ kind: '网页缓存', title: String(saved.payload.title || firstUrl), content: String(saved.payload.extracted || ''), url: firstUrl });
        sourceMessage = saved ? `已使用网页原文缓存，保存时间：${saved.savedAt}，未访问外网。` : '离线模式未访问该网页；可检索已保存的资料或粘贴原文。';
    }
    const result = '本地规则检索 · 未调用 AI\n\n' + (matches.length ? matches.slice(0, 12).map((record, index) => `${index + 1}. [${record.kind}] ${record.title}\n${record.content.slice(0, 650)}${record.url ? '\n来源：' + record.url : ''}`).join('\n\n') : '未找到匹配资料。请换用具体关键词，或先收录资料。') + (sourceMessage ? '\n\n' + sourceMessage : '') + '\n\n结果为关键词匹配和原文摘录，不会推断未记录的事实。';
    return Response.json({ result, sourceCount: matches.length, engine: 'rules', mode: policy.mode }, { headers: { 'Cache-Control': 'private, no-store' } });
}
