import assert from 'node:assert/strict';
import test from 'node:test';
import { checkedFetch, requestJson } from "../app/shared/api/httpClient";

test('a stalled write times out and is never submitted twice', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (_input, init) => {
    calls += 1;
    return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }));
  };
  await assert.rejects(checkedFetch('/api/planning', { method: 'POST', timeoutMs: 10 }, fetcher), /请求超时/);
  assert.equal(calls, 1);
});

test('JSON body consumption stays inside the request deadline', async () => {
  const fetcher: typeof fetch = async (_input, init) => {
    const response = Response.json({});
    response.json = () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }));
    return response;
  };
  await assert.rejects(requestJson('/api/planning', { timeoutMs: 10 }, fetcher), /请求超时/);
});

test('caller cancellation is preserved and already cancelled requests never start', async () => {
  const controller = new AbortController();
  const fetcher: typeof fetch = async () => { controller.abort(); throw controller.signal.reason; };
  await assert.rejects(requestJson('/api/planning', { signal: controller.signal }, fetcher), { name: 'AbortError' });
  await assert.rejects(requestJson('/api/planning', { signal: controller.signal }, async () => { assert.fail('Cancelled request was sent'); }), { name: 'AbortError' });
});

test('API errors and invalid JSON are distinguishable from empty data', async () => {
  await assert.rejects(requestJson('/api/planning', {}, async () => Response.json({ error: '保存冲突' }, { status: 409 })), /保存冲突/);
  await assert.rejects(requestJson('/api/planning', {}, async () => new Response('<html>error</html>')), /响应格式异常/);
  assert.deepEqual(await requestJson('/api/planning', {}, async () => Response.json({ items: [] })), { items: [] });
});
