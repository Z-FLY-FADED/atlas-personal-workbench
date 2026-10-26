import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from "../app/server/market/universe/handlers";

test('a directory outage is not reported as a successful empty result', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 502 }));
  const response = await GET(new Request('http://localhost/api/market/universe?scope=ALL'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('available markets still load when another market is unavailable', async context => {
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    if (new URL(input).searchParams.get('fs')?.includes('m:128')) return new Response('', { status: 502 });
    return Response.json({ data: { total: 1, diff: [{ f12: '000001', f14: '平安银行', f2: 10, f3: 0 }] } });
  });
  const response = await GET(new Request('http://localhost/api/market/universe?scope=ALL'));
  assert.equal(response.status, 200);
  const data = await response.json() as { instruments: unknown[] };
  assert.equal(data.instruments.length, 2);
});

test('search distinguishes an outage from a genuine empty match', async context => {
  const mocked = context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 502 }));
  const request = new Request('http://localhost/api/market/universe?q=missing');
  assert.equal((await GET(request)).status, 503);
  mocked.mock.mockImplementation(async () => Response.json({ QuotationCodeTable: { Data: [] } }));
  const response = await GET(request);
  assert.equal(response.status, 200);
  const data = await response.json() as { instruments: unknown[] };
  assert.equal(data.instruments.length, 0);
});
