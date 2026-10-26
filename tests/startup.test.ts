import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { registerHooks } from 'node:module';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { isWorkbenchReady, isWorkbenchURL } from '../desktop/workbench-health.cjs';
import { testDatabase } from './helpers/sqlite-d1';

test('startup rejects unrelated pages, errors and a database that is not ready', async () => {
  let status = 200, body = '';
  const server = createServer((request, response) => {
    assert.equal(request.url, '/api/health');
    response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(body);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/`;
  try {
    for (const data of ['<html>Another app</html>', JSON.stringify({ ready: true }), JSON.stringify({ service: 'atlas-workspace', ready: false })]) {
      body = data; assert.equal(await isWorkbenchReady(url), false);
    }
    body = JSON.stringify({ service: 'atlas-workspace', ready: true }); status = 503;
    assert.equal(await isWorkbenchReady(url), false);
    status = 200; assert.equal(await isWorkbenchReady(url), true);
  } finally { server.close(); await once(server, 'close'); }
});

test('a stalled startup probe has a bounded deadline', async () => {
  const server = createServer((_request, response) => { response.writeHead(200); response.write('{'); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { assert.equal(await isWorkbenchReady(`http://127.0.0.1:${address.port}/`, 20), false); }
  finally { server.closeAllConnections(); server.close(); await once(server, 'close'); }
});

test('desktop internal links require an exact origin', () => {
  const origin = 'http://localhost:3002';
  assert.equal(isWorkbenchURL(`${origin}/api/career-materials?kind=print`, origin), true);
  for (const url of ['http://localhost:30021/', 'http://localhost:3002@other.example/', 'https://localhost:3002/', 'data:text/html,print', 'invalid']) assert.equal(isWorkbenchURL(url, origin), false);
});

test('desktop printing opens an isolated child window and keeps the workspace in place', async () => {
  type Handler = (...args: unknown[]) => unknown;
  const windows: FakeWindow[] = [], external: string[] = [];
  class FakeWindow {
    urls: string[] = [];
    handlers = new Map<string, Handler>();
    openHandler?: (details: { url: string }) => { action: string; overrideBrowserWindowOptions?: { webPreferences: Record<string, unknown> } };
    webContents = {
      setWindowOpenHandler: (handler: FakeWindow['openHandler']) => { this.openHandler = handler; },
      on: (event: string, handler: Handler) => { this.handlers.set(event, handler); },
    };
    constructor() { windows.push(this); }
    static getAllWindows() { return windows; }
    setMenu() {} loadFile() {} once() {} on() {} show() {}
    async loadURL(url: string) { this.urls.push(url); }
  }
  const require = createRequire(import.meta.url);
  runInNewContext(fs.readFileSync('desktop/main.cjs', 'utf8'), {
    require: (name: string) => {
      if (name === 'electron') return {
        app: { isPackaged: false, requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), on() {}, setAppUserModelId() {} },
        BrowserWindow: FakeWindow, shell: { openExternal: (url: string) => { external.push(url); } }, dialog: {},
      };
      if (name === './workbench-health.cjs') return { isWorkbenchReady: async () => true, isWorkbenchURL };
      if (name === 'node:fs') return { ...fs, mkdirSync() {}, appendFileSync() {} };
      return require(name);
    },
    __dirname: resolve('desktop'), URL, setTimeout,
    process: { env: {}, resourcesPath: resolve('release/win-unpacked/resources'), cwd: () => process.cwd(), on() {} },
  });
  await new Promise<void>(resolve => setImmediate(resolve));
  const main = windows[0];
  assert.deepEqual(main.urls, ['http://localhost:3002/']);
  const result = main.openHandler?.({ url: 'http://localhost:3002/api/career-materials?kind=print' });
  assert.equal(result?.action, 'allow');
  assert.deepEqual(main.urls, ['http://localhost:3002/']);
  assert.equal(result?.overrideBrowserWindowOptions?.webPreferences.nodeIntegration, false);
  assert.equal(result?.overrideBrowserWindowOptions?.webPreferences.sandbox, true);
  const child = new FakeWindow(); main.handlers.get('did-create-window')?.(child);
  assert.equal(child.openHandler?.({ url: 'https://example.com/attachment' }).action, 'deny');
  assert.deepEqual(external, ['https://example.com/attachment']);
});

test('health probes are read-only, local-only and fail for a missing schema', async () => {
  const { sqlite, d1 } = testDatabase();
  const testGlobal = globalThis as typeof globalThis & { __startupTestEnv?: { DB: D1Database } };
  testGlobal.__startupTestEnv = { DB: d1 };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) { return specifier === 'cloudflare:workers' ? { url: 'data:text/javascript,export const env = globalThis.__startupTestEnv;', shortCircuit: true } : nextResolve(specifier, context); } });
  try {
    const api = await import("../app/server/health/handlers");
    const ready = await api.GET(new Request('http://localhost/api/health'));
    assert.equal(ready.status, 200); assert.deepEqual(await ready.json(), { service: 'atlas-workspace', ready: true });
    assert.equal(ready.headers.get('Cache-Control'), 'no-store');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get()?.count, 0);
    assert.equal((await api.GET(new Request('https://atlas.example/api/health'))).status, 401);
    sqlite.exec('DROP TABLE tasks');
    assert.equal((await api.GET(new Request('http://[::1]/api/health'))).status, 503);
  } finally { hooks.deregister(); delete testGlobal.__startupTestEnv; sqlite.close(); }
});
