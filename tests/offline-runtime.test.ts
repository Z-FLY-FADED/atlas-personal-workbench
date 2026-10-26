import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { testDatabase } from './helpers/sqlite-d1';
import { normalizeRuntimePolicy } from '../app/contracts/runtime';
import { allowsAI, readRuntimePolicy, saveRuntimePolicy } from '../app/server/runtime/policy';
import { publicSnapshotResponse, readPublicSnapshot, savePublicSnapshot } from '../app/server/runtime/snapshots';
import { searchLocalRecords } from '../app/features/research/domain/localSearch';
import { crawlPublicSource, extractPublicPage, isSafePublicUrl } from '../app/server/workspace/webSources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the integration workflow verifies several independent API response shapes
type ApiResult = Record<string, any>;

test('defaults use rules and public sources; AI and scheduled AI need separate opt-ins', () => {
    assert.deepEqual(normalizeRuntimePolicy(null), { mode: 'public', automaticAI: false });
    assert.equal(allowsAI(normalizeRuntimePolicy(null)), false);
    assert.equal(allowsAI(normalizeRuntimePolicy({ mode: 'offline', automaticAI: true }), true), false);
    assert.equal(allowsAI({ mode: 'ai', automaticAI: false }), true);
    assert.equal(allowsAI({ mode: 'ai', automaticAI: false }, true), false);
    assert.equal(allowsAI({ mode: 'ai', automaticAI: true }, true), true);
});

test('public snapshots survive source outages and offline mode without leaking owners or current quote signals', async () => {
    const { sqlite, d1 } = testDatabase();
    try {
        const payload = { stocks: [{ price: 10, signal: 'positive', verified: true }], instruments: [{ price: 10, signal: 'positive', verified: true }], markets: { 'A股': [{ signal: 'positive' }] }, marketSummary: [{ verifiedCount: 1 }], live: true, quoteSource: 'public', updatedAt: '2026-10-12' };
        const request = new Request('http://localhost/api/market');
        await savePublicSnapshot(d1, 'owner', '/api/market', payload);
        await saveRuntimePolicy(d1, 'owner', { mode: 'offline' });
        let calls = 0;
        const loader = async () => { calls++; throw new Error('No Internet'); };
        const offline = await publicSnapshotResponse(d1, 'owner', request, loader, {});
        const data = await offline.json() as ApiResult;
        assert.equal(calls, 0); assert.equal(data.availability.state, 'offline');
        assert.equal(data.live, false); assert.equal(data.stocks[0].price, 10);
        assert.equal(data.stocks[0].signal, 'insufficient_data'); assert.equal(data.stocks[0].verified, false);
        assert.equal(data.marketSummary[0].verifiedCount, 0);
        assert.equal(data.updatedAt, '2026-10-12'); assert.ok(data.availability.savedAt);
        assert.equal((await readPublicSnapshot(d1, 'owner', '/api/market'))?.payload.live, true);
        assert.equal(await readPublicSnapshot(d1, 'other', '/api/market'), null);
        await saveRuntimePolicy(d1, 'owner', { mode: 'public' });
        const failed = await publicSnapshotResponse(d1, 'owner', new Request('http://localhost/api/market?refresh=1'), loader, {});
        assert.equal((await failed.json() as ApiResult).availability.state, 'cached'); assert.equal(calls, 1);
        for (let i = 0; i < 16; i++) await savePublicSnapshot(d1, 'owner', `/source/${i}`, { title: String(i) });
        assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM workspace_settings WHERE owner_id='owner' AND key LIKE 'public-snapshot:%'").get()?.n, 12);
        assert.equal((await readRuntimePolicy(d1, 'owner')).mode, 'public');
    } finally { sqlite.close(); }
});

test('local search returns recorded excerpts and precise keywords without making up answers', () => {
    const records = [{ kind: '知识', title: 'PMSM 电机控制', content: '永磁同步电机采用矢量控制。' }, { kind: '项目', title: '毕业论文', content: '待补充结论' }];
    assert.equal(searchLocalRecords('帮我查询 PMSM 控制', records)[0]?.title, 'PMSM 电机控制');
    assert.equal(searchLocalRecords('项目', records)[0]?.title, '毕业论文');
    assert.deepEqual(searchLocalRecords('unrelated subject', records), []);
});

test('public webpage extraction isolates article text and bounds redirects and response bodies', async context => {
    for (const url of ['http://[::ffff:127.0.0.1]/', 'http://service.localhost/', 'https://user:password@example.com/']) assert.equal(isSafePublicUrl(url), false);
    assert.equal(isSafePublicUrl('https://fca.example.com/'), true);
    const html = '<title>原理 &amp; 方法</title><meta content="有效摘要" name="description"><nav>广告菜单</nav><article><h1>电机原理</h1><script>bad()</script><p>有效正文 &#20013;</p></article><footer>无关页脚</footer>';
    assert.deepEqual(extractPublicPage(html), { title: '原理 & 方法', summary: '有效摘要', extracted: '电机原理 有效正文 中' });
    const mocked = context.mock.method(globalThis, 'fetch', async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    const page = await crawlPublicSource('https://example.com/article');
    assert.equal(page?.extracted, '电机原理 有效正文 中');
    mocked.mock.mockImplementation(async () => new Response('', { status: 302, headers: { Location: 'http://127.0.0.1/private' } }));
    const before = mocked.mock.callCount();
    assert.equal(await crawlPublicSource('https://example.com/redirect'), null);
    assert.equal(mocked.mock.callCount() - before, 1);
    mocked.mock.mockImplementation(async () => new Response('a'.repeat(2000001), { headers: { 'Content-Type': 'text/html' } }));
    assert.equal(await crawlPublicSource('https://example.com/too-large'), null);
});

test('basic local workflows remain writable when every external fetch fails and all AI execution is blocked by default', async context => {
    const { sqlite, d1 } = testDatabase();
    const globals = globalThis as typeof globalThis & { __offlineTestEnv?: { DB: D1Database; AI_SCHEDULER_SECRET: string } };
    globals.__offlineTestEnv = { DB: d1, AI_SCHEDULER_SECRET: 'offline-test' };
    const hook = registerHooks({ resolve(specifier, context, next) { return specifier === 'cloudflare:workers' ? { url: 'data:text/javascript,export const env=globalThis.__offlineTestEnv;', shortCircuit: true } : next(specifier, context); } });
    const external = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Internet disconnected'); });
    const req = (path: string, body?: unknown, owner?: string) => new Request('http://localhost/api/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(owner ? { 'oai-authenticated-user-id': owner } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = async (response: Response): Promise<ApiResult> => { assert.ok(response.ok, await response.clone().text()); return response.json() as Promise<ApiResult>; };
    try {
        const workspace = await import('../app/server/workspace/handlers');
        const runtime = await import('../app/server/runtime/handlers');
        const sources = await import('../app/server/runtime/publicSources');
        const research = await import('../app/server/research/handlers');
        const ai = await import('../app/server/ai/handlers');
        const industry = await import('../app/server/industry/handlers');
        assert.equal((await json(await runtime.GET(req('runtime')))).policy.mode, 'public');
        await json(await runtime.POST(req('runtime', { mode: 'offline', automaticAI: true })));
        assert.equal((await readRuntimePolicy(d1, 'atlas-local-user')).automaticAI, false);
        assert.equal((await readRuntimePolicy(d1, 'another-owner')).mode, 'public');
        const project = (await json(await workspace.POST(req('workspace', { type: 'project', title: '断网验证项目' })))).item;
        const task = (await json(await workspace.POST(req('workspace', { type: 'task', title: '断网验证任务', horizon: '今日', projectId: project.id })))).item;
        await json(await workspace.PATCH(new Request('http://localhost/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...task, type: 'task', action: 'toggle', done: true }) })));
        await json(await workspace.POST(req('workspace', { type: 'quick-note', content: '断网笔记 https://example.com 不应触发外网请求' })));
        await json(await workspace.POST(req('workspace', { type: 'reminder', title: '断网提醒', remindAt: '2026-10-13T12:00:00+08:00' })));
        await json(await workspace.POST(req('workspace', { type: 'knowledge', title: '离线电机资料', sourceType: '网址', content: 'https://example.com 永磁同步电机知识和矢量控制原理，基于本地分类规则整理。' })));
        const data = await json(await workspace.GET(req('workspace')));
        assert.equal(data.tasks[0].done, true); assert.equal(data.quickNotes.length, 1); assert.equal(data.knowledge.length, 1);
        assert.equal((await json(await sources.jobsGET(req('jobs')))).availability.state, 'offline');
        const market = await json(await sources.marketGET(req('market')));
        assert.equal(market.live, false); assert.ok(market.instruments.every((item: { price: number | null }) => item.price === null));
        assert.equal((await json(await sources.universeGET(req('market/universe')))).availability.state, 'offline');
        const answer = await json(await research.POST(req('research', { query: '断网验证任务 https://example.com' })));
        assert.match(answer.result, /断网验证任务/); assert.equal(answer.engine, 'rules');
        assert.match(answer.result, /未访问该网页/);
        const refresh = await json(await industry.POST(req('industry', { action: 'refresh', force: true })));
        assert.equal(refresh.skipped, true);
        for (const mode of ['offline', 'public']) {
            await saveRuntimePolicy(d1, 'atlas-local-user', { mode });
            assert.equal((await ai.POST(req('ai', { action: 'query', connectionId: 1, prompt: 'private local data' }))).status, 403);
        }
        sqlite.exec("INSERT INTO ai_schedules (owner_id,title,connection_id,prompt,cadence,time_of_day,weekdays,next_run_at) VALUES ('atlas-local-user','test',1,'test','daily','08:00','1','2026-01-01')");
        await saveRuntimePolicy(d1, 'atlas-local-user', { mode: 'ai', automaticAI: false });
        const scheduled = await ai.POST(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-atlas-scheduler': 'offline-test' }, body: JSON.stringify({ action: 'run-due' }) }));
        assert.equal((await json(scheduled)).results.length, 0);
        // Paused users must not occupy the scheduler's 12-item execution limit.
        for (let i = 0; i < 12; i++) sqlite.exec("INSERT INTO ai_schedules (owner_id,title,connection_id,prompt,cadence,time_of_day,weekdays,next_run_at) VALUES ('atlas-local-user','paused',1,'test','daily','08:00','1','2026-01-01')");
        await saveRuntimePolicy(d1, 'explicit-auto-owner', { mode: 'ai', automaticAI: true });
        const allowedId = sqlite.prepare("INSERT INTO ai_schedules (owner_id,title,connection_id,prompt,cadence,time_of_day,weekdays,next_run_at) VALUES ('explicit-auto-owner','allowed',999,'test','daily','08:00','1','2026-01-02')").run().lastInsertRowid;
        const runnable = await json(await ai.POST(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-atlas-scheduler': 'offline-test' }, body: JSON.stringify({ action: 'run-due' }) })));
        assert.deepEqual(runnable.results.map((item: { id: number }) => item.id), [Number(allowedId)]);
        assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ai_runs').get()?.n, 0);
        assert.equal(external.mock.callCount(), 0);
    } finally { hook.deregister(); sqlite.close(); delete globals.__offlineTestEnv; }
});
