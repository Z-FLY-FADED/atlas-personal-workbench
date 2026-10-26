import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { testDatabase } from './helpers/sqlite-d1';
import { addDays, summarizeWeek, dateKey } from "../app/features/workspace/domain/weeklyReview";
import { findKnowledge, knowledgeKey, knowledgePreference } from "../app/features/knowledge/domain/identity";
import { archiveChecksum, exportWorkspace, inspectArchive, recycleRecord, restoreRecycled } from "../app/server/data/archive";
import { encodeBackup, decodeBackup } from "../app/features/data/client/backup";

test('weekly statistics respect Shanghai week boundaries, unique tasks, personal records and unique focus sessions', () => {
  const summary = summarizeWeek('2026-09-15', [
    { id: 1, title: '本周', completionHistory: [{ completedOn: '2026-09-14' }, { completedOn: '2026-09-16' }] },
    { id: 2, title: '上周', completionHistory: [{ completedOn: '2026-09-13' }] },
  ], [
    { id: 1, title: '本周资料', createdAt: '2026-09-13T16:00:00Z' },
    { id: 2, title: '上周资料', createdAt: '2026-09-13T15:59:59Z' },
    { id: -1, stableKey: 'builtin:1', title: '内置', createdAt: '2026-09-15' },
    { id: 3, title: '无日期', createdAt: '刚刚' },
  ], [
    { id: 'one', minutes: 25, completedAt: '2026-09-14T02:00:00Z' },
    { id: 'one', minutes: 25, completedAt: '2026-09-14T02:00:00Z' },
    { id: 'old', minutes: 50, completedAt: '2026-09-13T02:00:00Z' },
  ]);
  assert.equal(summary.start, '2026-09-14'); assert.equal(summary.end, '2026-09-20');
  assert.deepEqual(summary.completed.map(item => item.id), [1]); assert.deepEqual(summary.added.map(item => item.id), [1]);
  assert.equal(summary.undatedKnowledge, 1); assert.equal(summary.focusMinutes, 25); assert.equal(summary.focusCount, 1);
  assert.equal(dateKey('2026/09/15 15:30'), '2026-09-15'); assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dateKey('2026-02-31'), '');
});

test('same-title knowledge has independent preferences and stable links with legacy title fallback', () => {
  const items = [{ id: 1, title: '同名' }, { id: 2, title: '同名' }, { id: -1, title: '内置', stableKey: 'builtin:1' }];
  assert.equal(knowledgeKey(items[2]), 'builtin:1'); assert.equal(findKnowledge(items, 'saved:2')?.id, 2); assert.equal(findKnowledge(items, '同名')?.id, 1);
  const preferences = [{ knowledgeKey: 'saved:2', cover: 'none' }];
  assert.equal(knowledgePreference(preferences, items[0]), undefined); assert.equal(knowledgePreference(preferences, items[1])?.cover, 'none');
});

test('backup preview is read-only; restore fills missing rows, keeps newer records, excludes credentials and rolls back invalid batches', async () => {
  const { sqlite, d1 } = testDatabase();
  try {
    sqlite.exec("INSERT INTO projects(id,owner_id,title) VALUES (1,'owner-a','项目'); INSERT INTO tasks(id,owner_id,title,project_id) VALUES (1,'owner-a','原任务',1); INSERT INTO quick_notes(id,owner_id,content) VALUES (1,'owner-a','原笔记'); INSERT INTO ai_connections(owner_id,name,provider,model,api_key_cipher) VALUES ('owner-a','test','test','test','TEST_SECRET_EXCLUDED');");
    const backup = await exportWorkspace(d1, 'owner-a');
    assert.equal(JSON.stringify(backup).includes('TEST_SECRET_EXCLUDED'), false); assert.equal(backup.tables.ai_connections, undefined);
    sqlite.exec("DELETE FROM quick_notes WHERE id=1; UPDATE tasks SET title='用户的新修改' WHERE id=1;");
    const preview = await inspectArchive(d1, 'owner-a', backup);
    assert.equal(preview.summary.find(row => row.table === 'quick_notes')?.missing, 1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM quick_notes').get()?.n, 0);
    await d1.batch(preview.statements);
    assert.equal(sqlite.prepare('SELECT title FROM tasks WHERE id=1').get()?.title, '用户的新修改');
    assert.equal(sqlite.prepare('SELECT content FROM quick_notes WHERE id=1').get()?.content, '原笔记');
    assert.equal((await inspectArchive(d1, 'owner-a', backup)).statements.length, 0);
    const corrupt = structuredClone(backup); corrupt.tables.tasks[0].title = '损坏'; await assert.rejects(() => inspectArchive(d1, 'owner-a', corrupt), /校验失败/);
    const badColumn = structuredClone(backup); badColumn.tables.tasks[0]['unknown; DROP TABLE tasks'] = 'bad'; badColumn.checksum = await archiveChecksum(badColumn.tables); await assert.rejects(() => inspectArchive(d1, 'owner-a', badColumn), /无效字段/);
    const identity = structuredClone(backup); identity.tables.workspace_settings.push({ id: 'bad-setting', key: 'workspace-id', value: 'other' }); identity.checksum = await archiveChecksum(identity.tables); await assert.rejects(() => inspectArchive(d1, 'owner-a', identity), /身份字段/);
    const invalidTrash = structuredClone(backup); invalidTrash.tables.recycled_records.push({ id: 'bad-trash', entity: 'task', entity_id: 20, payload: '{broken', deleted_at: backup.createdAt }); invalidTrash.checksum = await archiveChecksum(invalidTrash.tables); await assert.rejects(() => inspectArchive(d1, 'owner-a', invalidTrash), /回收记录/);
    sqlite.exec("INSERT INTO reminders(owner_id,title,remind_at) VALUES ('owner-c','已有提醒','2026-09-16T08:00:00');");
    await assert.rejects(() => inspectArchive(d1, 'owner-c', backup), /另一工作台/);
    await assert.rejects(() => inspectArchive(d1, 'owner-b', backup), /另一账户冲突/);
    const invalidBatch = [d1.prepare("INSERT INTO quick_notes(owner_id,content) VALUES ('owner-a','不应保存')"), d1.prepare('INSERT INTO no_such_table(value) VALUES (1)')];
    await assert.rejects(() => d1.batch(invalidBatch)); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM quick_notes').get()?.n, 1);
    const encrypted = await encodeBackup(backup, 'test-password'); assert.equal(encrypted.includes('原笔记'), false);
    assert.deepEqual(await decodeBackup(encrypted, 'test-password'), backup); await assert.rejects(() => decodeBackup(encrypted, 'wrong-password'), /密码/);
  } finally { sqlite.close(); }
});

test('recycle and restore preserve task ID, project link and completion history without crossing account boundaries', async () => {
  const { sqlite, d1 } = testDatabase();
  try {
    const history = JSON.stringify([{ completedOn: '2026-09-14' }]);
    sqlite.prepare("INSERT INTO tasks(id,owner_id,title,project_id,completion_history) VALUES (7,'owner-a','待恢复任务',3,?)").run(history);
    assert.equal(await recycleRecord(d1, 'owner-b', 'task', 7), false);
    assert.equal(await recycleRecord(d1, 'owner-a', 'task', 7), true);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tasks').get()?.n, 0);
    const id = sqlite.prepare('SELECT id FROM recycled_records').get()?.id as string;
    await assert.rejects(() => restoreRecycled(d1, 'owner-b', id), /不存在/);
    await restoreRecycled(d1, 'owner-a', id);
    const row = sqlite.prepare('SELECT * FROM tasks').get(); assert.equal(row?.id, 7); assert.equal(row?.project_id, 3); assert.equal(row?.completion_history, history);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM recycled_records').get()?.n, 0);
  } finally { sqlite.close(); }
});

test('weekly saves detect conflicts; rescheduling preserves history; FSRS reviews are durable and idempotent', async () => {
  const { sqlite, d1 } = testDatabase();
  const globals = globalThis as typeof globalThis & { __round2env?: { DB: D1Database } }; globals.__round2env = { DB: d1 };
  const hooks = registerHooks({ resolve(specifier, context, next) { return specifier === 'cloudflare:workers' ? { url: 'data:text/javascript,export const env=globalThis.__round2env;', shortCircuit: true } : next(specifier, context); } });
  const request = (body: unknown, owner = 'owner-a') => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'oai-authenticated-user-id': owner }, body: JSON.stringify(body) });
  try {
    const reviews = await import("../app/server/reviews/handlers"), tasks = await import("../app/server/task-actions/handlers"), learning = await import("../app/server/learning/handlers");
    const review = { week: '2026-09-15', content: '真实草稿', revision: 0, snapshot: {} };
    assert.equal((await reviews.POST(request(review))).status, 200);
    assert.equal((await reviews.POST(request(review))).status, 409);
    assert.equal((await reviews.POST(request({ ...review, revision: 1, content: '已更新' }))).status, 200);
    assert.equal((await reviews.POST(request({ ...review, revision: 1, content: '旧草稿' }))).status, 409);
    assert.equal(sqlite.prepare('SELECT content FROM weekly_reviews').get()?.content, '已更新');
    sqlite.exec("INSERT INTO tasks(id,owner_id,title,horizon,active_on,completion_history) VALUES (1,'owner-a','旧任务','今日','2026-09-14','[{\"completedOn\":\"2026-09-13\"}]');");
    assert.equal((await tasks.POST(request({ action: 'reschedule', id: 1, date: '2026-09-18' }))).status, 200);
    assert.equal((await tasks.POST(request({ action: 'reschedule', id: 1, date: '2026-02-31' }))).status, 400);
    assert.equal((await tasks.POST(request({ action: 'reschedule', id: 1, date: '2026-09-20' }, 'owner-b'))).status, 404);
    const task = sqlite.prepare('SELECT * FROM tasks').get(); assert.equal(task?.active_on, '2026-09-18'); assert.equal(task?.completion_history, '[{"completedOn":"2026-09-13"}]');
    const add = { action: 'add', language: '英语学习', items: [{ front: 'evidence', back: '证据' }] };
    assert.equal((await learning.POST(request(add))).status, 200); await learning.POST(request(add));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM learning_cards').get()?.n, 1);
    const card = sqlite.prepare('SELECT * FROM learning_cards').get()!; const operationId = crypto.randomUUID();
    const rate = { action: 'review', id: card.id, rating: 4, revision: 0, operationId };
    const reviewed = await learning.POST(request(rate)); assert.equal(reviewed.status, 200);
    assert.ok(Date.parse(sqlite.prepare('SELECT due_at FROM learning_cards').get()?.due_at as string) > Date.now());
    assert.equal((await learning.POST(request(rate))).status, 200); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM learning_logs').get()?.n, 1);
    assert.equal((await learning.POST(request({ ...rate, operationId: crypto.randomUUID() }))).status, 409);
    assert.equal((await learning.POST(request(rate, 'owner-b'))).status, 404);
    const sources = { action: 'add', language: '专业知识', items: [{ front: '同名资料', back: '第一条', sourceKey: 'saved:1' }, { front: '同名资料', back: '第二条', sourceKey: 'saved:2' }] };
    assert.equal((await learning.POST(request(sources))).status, 200);
    await learning.POST(request(sources));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM learning_cards WHERE language='专业知识'").get()?.n, 2);
    const archive = await exportWorkspace(d1, 'owner-a');
    assert.equal((await inspectArchive(d1, 'owner-a', archive)).statements.length, 0);
    archive.tables.learning_cards[0].card = '{}'; archive.checksum = await archiveChecksum(archive.tables);
    await assert.rejects(() => inspectArchive(d1, 'owner-a', archive), /复习卡片状态/);
  } finally { hooks.deregister(); delete globals.__round2env; sqlite.close(); }
});
