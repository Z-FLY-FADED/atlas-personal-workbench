import assert from "node:assert/strict";
import test from "node:test";
import { getOwnerId, isLocalRequest } from "../app/server/auth";

test("local development receives an isolated fallback owner", () => {
  const request = new Request("http://localhost:3000/api/workspace");
  assert.equal(isLocalRequest(request), true);
  assert.equal(getOwnerId(request), "atlas-local-user");
});

test('IPv6 loopback receives the same local owner without accepting lookalike hosts', () => {
  assert.equal(getOwnerId(new Request('http://[::1]:3002/api/workspace')), 'atlas-local-user');
  assert.equal(getOwnerId(new Request('http://localhost.example/api/workspace')), null);
  assert.equal(getOwnerId(new Request('http://192.168.1.2/api/workspace')), null);
});

test("production requests require the authenticated user header", () => {
  const anonymous = new Request("https://atlas.example/api/workspace");
  assert.equal(getOwnerId(anonymous), null);

  const authenticated = new Request("https://atlas.example/api/workspace", {
    headers: { "oai-authenticated-user-id": "user-123" },
  });
  assert.equal(getOwnerId(authenticated), "user-123");
});
