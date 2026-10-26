import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { testDatabase } from './helpers/sqlite-d1';
import { nextOccurrence, normalizeLayout, DEFAULT_LAYOUT, safeWebUrl } from "../app/features/planning/domain/planning";
import { shanghaiDateKey } from "../app/features/tasks/domain/dates";
import { exportWorkspace, inspectArchive } from "../app/server/data/archive";
import { validateAttachment } from "../app/features/career/domain/materials";
import { recurrenceStatements } from "../app/server/planning/recurrence";

test('recurrence skips weekends and missed dates, while weekly rules keep the scheduled weekday', () => {
  assert.equal(nextOccurrence('weekdays', '2026-09-18', '2026-09-18'), '2026-09-21');
  assert.equal(nextOccurrence('daily', '2026-08-01', '2026-09-15'), '2026-09-16');
  assert.equal(nextOccurrence('weekly', '2026-09-04', '2026-09-15'), '2026-09-18');
  assert.equal(nextOccurrence('weekly', '2026-09-04', '2026-09-18'), '2026-09-25');
  assert.equal(nextOccurrence('daily', '2026-12-31', '2026-12-31'), '2027-01-01');
  assert.deepEqual(normalizeLayout({ main: ['projects', 'tasks', 'tasks', 'bad'], side: ['tasks'], hidden: ['focus', 'bad'] }), { main: ['projects', 'tasks', 'knowledge'], side: DEFAULT_LAYOUT.side, hidden: ['focus'] });
  assert.equal(safeWebUrl('javascript:alert(1)'), '');
  assert.throws(() => validateAttachment('fake.pdf', btoa('not a PDF')), /不符/);
});

test('repeating a task for many cycles keeps child IDs short, distinct and editable', async () => {
  const { sqlite, d1 } = testDatabase();
  try {
    sqlite.exec("INSERT INTO tasks (id,owner_id,title,repeat_rule,active_on) VALUES (1,'owner','Daily','daily','2026-09-16'); INSERT INTO task_subtasks (id,owner_id,task_id,title,position) VALUES ('initial-child','owner',1,'Step',0)");
    let currentId = 1;
    for (let i = 0; i < 35; i++) {
      const current = sqlite.prepare('SELECT active_on FROM tasks WHERE id=?').get(currentId)!;
      await d1.batch([...recurrenceStatements(d1, 'owner', currentId, 'daily', String(current.active_on), '2026-09-16'), d1.prepare('UPDATE tasks SET done=1 WHERE id=?').bind(currentId)]);
      currentId = Number(sqlite.prepare('SELECT id FROM tasks WHERE recurrence_key=?').get(`repeat:${currentId}`)!.id);
    }
    const children = sqlite.prepare('SELECT id FROM task_subtasks').all();
    assert.equal(children.length, 36); assert.equal(new Set(children.map(c => c.id)).size, 36);
    assert.ok(children.every(c => String(c.id).length < 60));
  } finally { sqlite.close(); }
});

test('phase two workflow preserves task history, idempotent focus/capture, version snapshots, attachment bytes, ownership and backups', async () => {
  const { sqlite, d1 } = testDatabase(); const restored = testDatabase();
  const g = globalThis as typeof globalThis & { __phase2Env?: { DB: D1Database } }; g.__phase2Env = { DB: d1 };
  const hooks = registerHooks({ resolve(specifier, context, next) { return specifier === 'cloudflare:workers' ? { url: 'data:text/javascript,export const env=globalThis.__phase2Env;', shortCircuit: true } : next(specifier, context); } });
  try {
    const workspace = await import("../app/server/workspace/handlers"), planning = await import("../app/server/planning/handlers"), career = await import("../app/server/career-materials/handlers");
    const req = (body?: unknown, owner?: string, url = '') => new Request(`http://localhost/api/${url}`, { method: body ? 'POST' : 'GET', headers: { ...(owner ? { 'oai-authenticated-user-id': owner } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed API response shapes in this integration workflow
    const json = async (response: Response) => { const data = await response.json() as Record<string, any>; assert.ok(response.ok, JSON.stringify(data)); return data; };
    const project = (await json(await workspace.POST(req({ type: 'project', title: '验证项目' })))).item;
    const task = (await json(await workspace.POST(req({ type: 'task', action: 'create', title: '重复任务', horizon: '今日', repeatRule: 'weekdays', projectId: project.id, subtasks: '资料整理\n编写结论' })))).item;
    assert.equal(task.action, undefined); assert.equal(task.type, undefined);
    const edited = (await json(await workspace.PATCH(req({ ...task, type: 'task', action: 'edit' })))).item;
    assert.equal(edited.action, undefined);
    const detail = await json(await planning.GET(req(undefined, undefined, `?taskId=${task.id}`)));
    assert.equal(detail.subtasks.length, 2);
    await json(await planning.POST(req({ kind: 'subtask', taskId: task.id, ...detail.subtasks[0], done: true })));
    const toggle = () => workspace.PATCH(req({ ...task, type: 'task', action: 'toggle', done: true }));
    await json(await toggle()); await json(await toggle());
    const allTasks = sqlite.prepare('SELECT * FROM tasks ORDER BY id').all();
    assert.equal(allTasks.length, 2); assert.equal(JSON.parse(String(allTasks[0].completion_history)).length, 1);
    assert.equal(allTasks[1].active_on, nextOccurrence('weekdays', shanghaiDateKey(), shanghaiDateKey()));
    const cloned = sqlite.prepare('SELECT * FROM task_subtasks WHERE task_id=?').all(allTasks[1].id);
    assert.equal(cloned.length, 2); assert.equal(cloned[0].done, 0);
    await json(await workspace.PATCH(req({ ...task, type: 'task', action: 'toggle', done: false })));
    await json(await toggle()); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tasks').get()?.n, 2);
    const focus = { kind: 'focus', id: 'focus-test', taskId: task.id, seconds: 75, completedAt: new Date().toISOString() };
    await json(await planning.POST(req(focus))); await json(await planning.POST(req(focus)));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM focus_sessions').get()?.n, 1);
    const inaccessibleTask = await planning.POST(req({ kind: 'subtask', taskId: task.id, title: '越权' }, 'other'));
    assert.equal(inaccessibleTask.status, 400);
    await json(await planning.POST(req({ kind: 'layout', layout: { main: ['knowledge', 'projects', 'tasks'], hidden: ['focus'] } })));
    assert.equal((await json(await planning.GET(req(undefined, undefined, '?kind=layout')))).layout.main[0], 'knowledge');
    const clip = { kind: 'capture', id: 'clip-test', title: '原文摘录', url: 'https://example.com/paper', content: '用户选中的原文，不自动生成扩充正文。', projectId: project.id };
    await json(await planning.POST(req(clip))); await json(await planning.POST(req(clip)));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM knowledge').get()?.n, 1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM project_knowledge').get()?.n, 1);
    const owner = 'atlas-local-user', source = '真实经历：参与机器人控制项目，负责控制算法仿真、参数记录、实验文档整理与结果复核。仅保留本人完成的实际内容。';
    await json(await workspace.POST(req({ type: 'resume', content: source, fileName: '主简历' })));
    const app = (await json(await workspace.POST(req({ type: 'application', company: '验证公司', role: '控制工程师' })))).item;
    await json(await career.POST(req({ kind: 'create', id: 'version-test', title: '岗位版本' })));
    await json(await career.POST(req({ kind: 'create', id: 'version-test', title: '岗位版本' })));
    let v = (await json(await career.GET(req(undefined, undefined, '?id=version-test')))).item;
    await json(await career.POST(req({ kind: 'bind', versionId: v.id, revision: v.revision, applicationId: app.id })));
    const changed = source + '\n<script>unsafe()</script>';
    await json(await career.POST(req({ kind: 'save', ...v, content: changed, changeNote: '补充验证记录' })));
    assert.equal((await career.POST(req({ kind: 'save', ...v, content: '旧版本覆盖' }))).status, 409);
    assert.equal(sqlite.prepare('SELECT content_snapshot FROM application_resume_links').get()?.content_snapshot, source);
    assert.equal(sqlite.prepare('SELECT content FROM resumes').get()?.content, source);
    const printable = await career.GET(req(undefined, undefined, '?id=version-test&kind=print'));
    const html = await printable.text(); assert.ok(html.includes('&lt;script&gt;unsafe()&lt;/script&gt;')); assert.ok(!html.includes('<script>unsafe'));
    const data = btoa('%PDF-1.4\nphase two test');
    await json(await career.POST(req({ kind: 'upload', id: 'attachment-test', versionId: v.id, fileName: '验证.pdf', data })));
    const file = await career.GET(req(undefined, undefined, '?kind=attachment&id=attachment-test')); assert.equal(await file.text(), atob(data));
    assert.equal((await career.GET(req(undefined, 'other', '?kind=attachment&id=attachment-test'))).status, 404);
    v = (await json(await career.GET(req(undefined, undefined, '?id=version-test')))).item;
    await json(await career.POST(req({ kind: 'archive', id: v.id, revision: v.revision, archived: true })));
    v = (await json(await career.GET(req(undefined, undefined, '?id=version-test')))).item;
    await json(await career.POST(req({ kind: 'archive', id: v.id, revision: v.revision, archived: false })));
    const backup = await exportWorkspace(d1, owner);
    for (const table of ['task_subtasks', 'focus_sessions', 'project_knowledge', 'resume_versions', 'application_resume_links', 'career_attachments']) assert.ok(backup.tables[table].length > 0);
    const preview = await inspectArchive(restored.d1, owner, backup); await restored.d1.batch(preview.statements);
    assert.equal(restored.sqlite.prepare('SELECT data_base64 FROM career_attachments').get()?.data_base64, data);
    assert.equal(restored.sqlite.prepare('SELECT content_snapshot FROM application_resume_links').get()?.content_snapshot, source);
    assert.equal(sqlite.prepare('PRAGMA quick_check').get()?.quick_check, 'ok');
    assert.equal((await planning.GET(new Request('https://example.com/api/planning?kind=layout'))).status, 401);
    // A failure at the final state update rolls back the generated task and its copied subtasks together.
    const failure = (await json(await workspace.POST(req({ type: 'task', title: 'rollback', repeatRule: 'daily', subtasks: '子步骤' })))).item;
    sqlite.exec(`CREATE TRIGGER reject_completion BEFORE UPDATE OF done ON tasks WHEN OLD.title='rollback' BEGIN SELECT RAISE(ABORT, 'forced rollback'); END`);
    assert.equal((await workspace.PATCH(req({ ...failure, type: 'task', action: 'toggle', done: true }))).status, 500);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tasks WHERE recurrence_key=?').get(`repeat:${failure.id}`)?.n, 0);
  } finally { hooks.deregister(); delete g.__phase2Env; sqlite.close(); restored.sqlite.close(); }
});
