import assert from 'node:assert/strict';
import test from 'node:test';
import { searchWorkspace, projectMetrics, projectTimeline, focusSeconds, EMPTY_FOCUS, conciseSummary, type SearchEntry } from "../app/features/workspace/domain/workspace";
import { checkedFetch, workspaceOperationKey } from "../app/shared/hooks/useWorkspaceIO";

test('global search finds all four record types and matches note or knowledge content', () => {
  const entries: SearchEntry[] = [
    { id: 1, kind: '任务', title: '轨迹调试', detail: '机器人' },
    { id: 2, kind: '项目', title: '机器人', detail: '轨迹验证' },
    { id: 3, kind: '笔记', title: '调试记录', detail: '待整理', content: '机器人轨迹参数' },
    { id: 4, kind: '资料', title: '控制理论', detail: '模型', content: '机器人轨迹规划' },
    { id: 5, kind: '资料', title: '电路', detail: '其他内容' },
  ];
  assert.deepEqual(searchWorkspace(entries, ' 机器人 轨迹 ').map(item => item.kind).sort(), ['任务', '资料', '笔记', '项目'].sort());
  assert.equal(searchWorkspace(entries, '机器人')[0].kind, '项目');
  assert.deepEqual(searchWorkspace(entries, '   '), []);
  assert.equal(searchWorkspace([{ id: 1, kind: '资料', title: 'PID', detail: 'Control' }], 'pid control').length, 1);
});

test('project timeline never fabricates a schedule for legacy records', () => {
  const today = '2026-09-14';
  assert.equal(projectTimeline({ dueDate: '27年2月' }, today).state, 'unscheduled');
  assert.equal(projectTimeline({ startDate: '2026-09-20', dueDate: '2026-09-15' }, today).state, 'invalid');
  assert.equal(projectTimeline({ startDate: '2026-09-01', dueDate: '2026-09-13' }, today).state, 'overdue');
  assert.equal(projectTimeline({ startDate: '2026-10-01', dueDate: '2026-10-02' }, today).state, 'future');
  assert.deepEqual(projectTimeline({ startDate: '2026-09-12', dueDate: '2026-09-16' }, today), { state: 'scheduled', start: 0, span: 3 });
  assert.deepEqual(projectTimeline({ startDate: '2026-09-27', dueDate: '2026-10-01' }, today), { state: 'scheduled', start: 13, span: 1 });
});

test('automatic project progress follows linked tasks while manual history is retained', () => {
  const project = { id: 10, progress: 71, remainingTasks: 8, progressMode: 'manual' };
  const tasks = [{ projectId: 10, done: true }, { projectId: 10, done: false }, { projectId: 11, done: true }];
  assert.equal(projectMetrics(project, tasks).progress, 71);
  assert.equal(projectMetrics(project, tasks).remainingTasks, 1);
  assert.deepEqual(projectMetrics(project, []), project);
  assert.equal(projectMetrics({ ...project, progressMode: 'auto' }, tasks).progress, 50);
  assert.equal(projectMetrics({ ...project, progressMode: 'auto' }, []).progress, 0);
});

test('focus timer recovers elapsed wall time after navigation, pause and a suspended tab', () => {
  const session = { ...EMPTY_FOCUS, endsAt: 100000, sessionId: 'test' };
  assert.equal(focusSeconds(session, 90001), 10);
  assert.equal(focusSeconds(session, 120000), 0);
  assert.equal(focusSeconds({ ...session, endsAt: null, remaining: 323 }, 999999), 323);
});

test('failed saves reject with a useful error; successful responses are returned intact', async () => {
  await assert.rejects(checkedFetch('/api/workspace', { method: 'POST' }, async () => Response.json({ error: '数据库暂不可用' }, { status: 503 })), /数据库暂不可用/);
  await assert.rejects(checkedFetch('/api/workspace', {}, async () => new Response('offline', { status: 500 })), /500/);
  await assert.rejects(checkedFetch('/api/workspace', {}, async () => { throw new TypeError('Failed to fetch'); }), /Failed to fetch/);
  const response = Response.json({ item: { id: 7 } });
  assert.equal(await checkedFetch('/api/workspace', {}, async () => response), response);
});

test('knowledge summaries remove title duplication and repeated sentences', () => {
  assert.equal(conciseSummary('PID', 'PID 调整参数。调整参数。验证响应。'), '调整参数。验证响应。');
});

test('a retried create clears its failed operation even if the temporary id changes', () => {
  const key = (method: string, id: number) => workspaceOperationKey('/api/workspace', { method, body: JSON.stringify({ type: 'task', id }) });
  assert.equal(key('POST', 123), key('POST', 456));
  assert.notEqual(key('PATCH', 123), key('PATCH', 456));
});
