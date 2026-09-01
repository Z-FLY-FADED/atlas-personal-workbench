import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeUrl,
  isSafePublicUrl,
  parseFeed,
  simHashTitle,
} from "../app/industry/feed";

test("canonicalizeUrl removes tracking parameters and fragments", () => {
  assert.equal(
    canonicalizeUrl("https://Example.com/news/1/?utm_source=test&spm=abc&id=9#detail"),
    "https://example.com/news/1?id=9",
  );
});

test("public URL validation rejects local and private addresses", () => {
  assert.equal(isSafePublicUrl("https://example.com/feed.xml"), true);
  assert.equal(isSafePublicUrl("http://127.0.0.1/feed"), false);
  assert.equal(isSafePublicUrl("http://192.168.1.2/feed"), false);
  assert.equal(isSafePublicUrl("file:///etc/passwd"), false);
});

test("parseFeed supports RSS and Atom link formats", () => {
  const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[汽车 标准发布]]></title><link>https://example.com/a?utm_source=rss</link><description><![CDATA[<p>标准内容摘要</p>]]></description><pubDate>Wed, 26 Aug 2026 08:00:00 GMT</pubDate></item></channel></rss>`;
  const atom = `<feed><entry><title>Robot update</title><link rel="alternate" href="https://example.com/robot"/><summary>Deployment news</summary><updated>2026-08-26T09:00:00Z</updated></entry></feed>`;
  const rssItems = parseFeed(rss, "https://example.com/feed");
  const atomItems = parseFeed(atom, "https://example.com/atom");
  assert.equal(rssItems[0].title, "汽车 标准发布");
  assert.equal(rssItems[0].url, "https://example.com/a");
  assert.equal(rssItems[0].summary, "标准内容摘要");
  assert.equal(atomItems[0].title, "Robot update");
  assert.equal(atomItems[0].url, "https://example.com/robot");
});

test("title SimHash is stable across punctuation and spacing", () => {
  assert.equal(
    simHashTitle("英特尔发布：先进封装新进展"),
    simHashTitle("英特尔发布先进封装新进展！"),
  );
});

