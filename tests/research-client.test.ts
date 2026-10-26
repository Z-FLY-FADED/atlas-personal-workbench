import assert from 'node:assert/strict';
import test from 'node:test';
import { readResearchJson } from "../app/shared/api/researchClient";

test('research reads recover from a temporary network or server failure', async () => {
  for (const failure of ['network', 'server']) {
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      assert.equal(init?.cache, 'no-store');
      if (++calls === 1) {
        if (failure === 'network') throw new TypeError('Failed to fetch');
        return new Response('', { status: 503 });
      }
      return Response.json({ articles: [{ id: 1 }] });
    };
    assert.deepEqual(await readResearchJson('/api/industry', '加载失败', { retryDelayMs: 0 }, fetcher), { articles: [{ id: 1 }] });
    assert.equal(calls, 2);
  }
});

test('persistent failures are surfaced and authentication failures are not retried', async () => {
  for (const status of [503, 401]) {
    let calls = 0;
    const fetcher: typeof fetch = async () => { calls += 1; return new Response('', { status }); };
    await assert.rejects(readResearchJson('/api/market', '行情加载失败', { retryDelayMs: 0 }, fetcher), /行情加载失败/);
    assert.equal(calls, status === 503 ? 2 : 1);
  }
});

test('stalled reads time out instead of leaving the page loading forever', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (_input, init) => {
    calls += 1;
    return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }));
  };
  await assert.rejects(readResearchJson('/api/market', '行情加载失败', { timeoutMs: 5, retryDelayMs: 0 }, fetcher), /行情加载失败/);
  assert.equal(calls, 2);
});

test('cancelled page reads do not retry or return late data', async () => {
  const controller = new AbortController();
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls += 1; controller.abort(); throw controller.signal.reason; };
  await assert.rejects(readResearchJson('/api/market', '行情加载失败', { signal: controller.signal, retryDelayMs: 0 }, fetcher), { name: 'AbortError' });
  assert.equal(calls, 1);
});
