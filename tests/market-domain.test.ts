import assert from "node:assert/strict";
import test from "node:test";
import { marketIdentity, parseSignedNumber } from "../app/market-domain";

test("marketIdentity creates stable cross-market instrument ids", () => {
  assert.deepEqual(marketIdentity("A股", "600000"), {
    region: "CN",
    exchange: "SSE",
    currency: "CNY",
    instrumentId: "CN:SSE:600000",
  });
  assert.equal(marketIdentity("A股", "300750").exchange, "SZSE");
  assert.equal(marketIdentity("A股", "830799").exchange, "BSE");
  assert.equal(marketIdentity("港股", "00700").instrumentId, "HK:HKEX:00700");
  assert.equal(marketIdentity("纳斯达克", "NVDA").instrumentId, "US:NASDAQ:NVDA");
});

test("parseSignedNumber preserves negative market changes", () => {
  assert.equal(parseSignedNumber("-2.45%"), -2.45);
  assert.equal(parseSignedNumber("+1.20%"), 1.2);
  assert.equal(parseSignedNumber("$123.45"), 123.45);
  assert.equal(parseSignedNumber("not available"), null);
});
