import type { ParsedFeedItem } from "./types";

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source", "spm", "from",
]);

export function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1" || host === "::") return false;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
    if (ipv4) {
      if (ipv4.some((part) => part < 0 || part > 255)) return false;
      const [a, b] = ipv4;
      if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
    }
    if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return false;
    return true;
  } catch {
    return false;
  }
}

export function canonicalizeUrl(value: string, base?: string) {
  try {
    const url = new URL(value, base);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function stripHtml(value: string, maxLength = 1200) {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function tagValue(block: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(":", "\\:");
    const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function atomLink(block: string) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?\s*>/gi)];
  const preferred = links.find((match) => !/rel=["'](?:self|hub)["']/i.test(match[1])) || links[0];
  return preferred?.[1].match(/href=["']([^"']+)["']/i)?.[1] || "";
}

function normalizeDate(value: string) {
  const parsed = Date.parse(stripHtml(value, 120));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

export function parseFeed(xml: string, sourceUrl: string, limit = 30): ParsedFeedItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  const items: ParsedFeedItem[] = [];
  for (const block of blocks.slice(0, Math.max(1, limit * 2))) {
    const title = stripHtml(tagValue(block, ["title"]), 260);
    const rawLink = stripHtml(tagValue(block, ["link"]), 2000) || atomLink(block);
    const url = canonicalizeUrl(rawLink, sourceUrl);
    if (!title || !isSafePublicUrl(url)) continue;
    const rawSummary = tagValue(block, ["description", "summary", "content", "content:encoded"]);
    const rawContent = tagValue(block, ["content:encoded", "content", "description", "summary"]);
    const summary = stripHtml(rawSummary, 520);
    const contentExcerpt = stripHtml(rawContent, 2400);
    const publishedAt = normalizeDate(tagValue(block, ["pubDate", "published", "updated", "dc:date"]));
    const guid = stripHtml(tagValue(block, ["guid", "id"]), 1200) || url;
    items.push({ title, url, summary, contentExcerpt, publishedAt, guid });
    if (items.length >= limit) break;
  }
  return items;
}

export async function hashText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeTitle(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .replace(/(正式)?发布|最新|重磅|官宣/g, "")
    .slice(0, 180);
}

function fnv1a64(value: string) {
  let hash = BigInt("14695981039346656037");
  const prime = BigInt("1099511628211");
  const mask = BigInt("18446744073709551615");
  for (const char of value) {
    hash ^= BigInt(char.codePointAt(0) || 0);
    hash = (hash * prime) & mask;
  }
  return hash;
}

export function simHashTitle(value: string) {
  const normalized = normalizeTitle(value);
  const tokens = normalized.length < 3
    ? [normalized]
    : Array.from({ length: normalized.length - 2 }, (_, index) => normalized.slice(index, index + 3));
  const weights = Array.from({ length: 64 }, () => 0);
  for (const token of tokens.filter(Boolean)) {
    const hash = fnv1a64(token);
    for (let bit = 0; bit < 64; bit += 1) {
      weights[bit] += (hash & (BigInt(1) << BigInt(bit))) !== BigInt(0) ? 1 : -1;
    }
  }
  let fingerprint = BigInt(0);
  for (let bit = 0; bit < 64; bit += 1) {
    if (weights[bit] >= 0) fingerprint |= BigInt(1) << BigInt(bit);
  }
  return fingerprint.toString(16).padStart(16, "0");
}

export async function fetchPublicFeed(url: string, headers: Record<string, string> = {}) {
  let current = canonicalizeUrl(url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (!isSafePublicUrl(current)) throw new Error("来源地址不安全");
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Atlas-Industry-Collector/1.0", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", ...headers },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("来源重定向缺少目标地址");
      current = canonicalizeUrl(location, current);
      continue;
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 2_000_000) throw new Error("Feed 超过 2MB 限制");
    return { response, finalUrl: current };
  }
  throw new Error("来源重定向次数过多");
}
