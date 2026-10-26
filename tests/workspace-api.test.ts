import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { testDatabase } from './helpers/sqlite-d1';

test('workspace API persists project dates, linked task history, editable notes and reminders in an isolated database', async () => {
  const { sqlite, d1 } = testDatabase();
  const testGlobal = globalThis as typeof globalThis & { __workspaceTestEnv?: { DB: D1Database } };
  testGlobal.__workspaceTestEnv = { DB: d1 };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) { return specifier === 'cloudflare:workers' ? { url: 'data:text/javascript,export const env = globalThis.__workspaceTestEnv;', shortCircuit: true } : nextResolve(specifier, context); } });
  try {
    const api = await import("../app/server/workspace/handlers");
    const send = async (method: 'POST' | 'PATCH', payload: Record<string, unknown>) => {
      const response = await api[method](new Request('http://localhost/api/workspace', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      const body = await response.json() as { item: Record<string, unknown>; error?: string };
      assert.ok(response.ok, body.error); return body.item;
    };
    const project = await send('POST', { type: 'project', title: '测试项目', progress: 22, remainingTasks: 3, startDate: '2026-09-14', dueDate: '2026-09-30', milestoneDate: '2026-09-20', progressMode: 'auto' });
    assert.equal(project.startDate, '2026-09-14');
    assert.equal(project.progressMode, 'auto');
    const task = await send('POST', { type: 'task', title: '本周验证', horizon: '本周', projectId: project.id });
    assert.equal(task.horizon, '本周'); assert.equal(task.projectId, project.id);
    const done = await send('PATCH', { ...task, type: 'task', action: 'toggle', done: true });
    assert.equal((done.completionHistory as unknown[]).length, 1);
    const reopened = await send('PATCH', { ...done, type: 'task', action: 'toggle', done: false });
    assert.deepEqual(reopened.completionHistory, []);
    const note = await send('POST', { type: 'quick-note', content: '保留笔记原文' });
    await send('PATCH', { ...note, type: 'quick-note', content: '编辑后的笔记', status: '已归档' });
    await send('PATCH', { ...note, type: 'quick-note', content: '编辑后的笔记', status: '待整理' });
    const reminder = await send('POST', { type: 'reminder', title: '测试提醒', remindAt: '2026-09-30T09:00' });
    await send('PATCH', { ...reminder, type: 'reminder', done: true });
    await send('PATCH', { type: 'knowledge-preference', knowledgeKey: '内置资料', primaryCategory: '机械', secondaryCategory: '机械设计', cover: 'none' });
    const result = await api.GET(new Request('http://localhost/api/workspace'));
    const data = await result.json() as { tasks: Array<Record<string, unknown>>; projects: Array<Record<string, unknown>>; quickNotes: Array<Record<string, unknown>>; reminders: Array<Record<string, unknown>>; knowledgePreferences: unknown[] };
    assert.equal(data.tasks[0].horizon, '本周'); assert.equal(data.tasks[0].done, false);
    assert.equal(data.projects[0].milestoneDate, '2026-09-20');
    assert.equal(data.quickNotes[0].content, '编辑后的笔记'); assert.equal(data.quickNotes[0].status, '待整理');
    assert.equal(data.reminders[0].done, true); assert.equal(data.knowledgePreferences.length, 1);
    const invalid = await api.POST(new Request('http://localhost/api/workspace', { method: 'POST', body: JSON.stringify({ type: 'task', horizon: '[object Object]' }) }));
    assert.equal(invalid.status, 400);
    const unauthorized = await api.GET(new Request('https://workspace.example/api/workspace'));
    assert.equal(unauthorized.status, 401);
    assert.equal(sqlite.prepare('PRAGMA quick_check').get()?.quick_check, 'ok');
  } finally { hooks.deregister(); delete testGlobal.__workspaceTestEnv; sqlite.close(); }
});
