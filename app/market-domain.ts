import type { LegacyMarketKey } from "./market-types";

export function parseSignedNumber(value: unknown) {
  const normalized = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!/\d/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function marketIdentity(market: LegacyMarketKey, quoteCode: string) {
  const region = market === "A股" ? "CN" as const : market === "港股" ? "HK" as const : "US" as const;
  const exchange = market === "A股"
    ? quoteCode.startsWith("6") ? "SSE" : /^[48]/.test(quoteCode) ? "BSE" : "SZSE"
    : market === "港股" ? "HKEX" : "NASDAQ";
  const currency = region === "CN" ? "CNY" as const : region === "HK" ? "HKD" as const : "USD" as const;
  return { region, exchange, currency, instrumentId: `${region}:${exchange}:${quoteCode}` };
}
