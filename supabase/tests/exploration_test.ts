import { canonical, parseSource } from "../functions/_shared/source_parser.ts";
import { cryptKey } from "../functions/_shared/credentials.ts";
import {
  checkedUrl,
  publicAddress,
  publicFetch,
  sourceError,
} from "../functions/_shared/http.ts";
Deno.test("Source failures are concise and keep certificate checks intact", () => {
  const certificate = sourceError(
    new Error("invalid peer certificate: " + "internal-details".repeat(500)),
  );
  if (!certificate.includes("证书校验失败") || certificate.length > 100) {
    throw new Error("Unbounded certificate error");
  }
  if (!sourceError(new Error("Signal timed out.")).includes("连接超时")) {
    throw new Error("Unclear timeout");
  }
});
function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}
Deno.test("Jin10 parses JSON assignment without executing source code", () => {
  const rows = parseSource(
    'var newest = [{"id":"202610280001","time":"2026-10-28 09:00:00","data":{"content":"<b>测试财经快讯</b>"}}];',
    "https://www.jin10.com/flash_newest.js",
    "jin10",
    "market",
  );
  assert(rows.length === 1 && rows[0].summary === "测试财经快讯");
  assert(rows[0].published_at === "2026-10-28T09:00:00+08:00");
  assert(
    rows[0].canonical_url === "https://flash.jin10.com/detail/202610280001",
  );
  let rejected = false;
  try {
    parseSource(
      "var newest = []; globalThis.infected=true",
      "https://www.jin10.com/",
      "jin10",
      "market",
    );
  } catch {
    rejected = true;
  }
  assert(rejected);
});
Deno.test("RSS and Atom resolve relative URLs and remove tracking duplicates", () => {
  const rss =
    "<rss><channel><item><title>招聘公告</title><link>/jobs/1?utm_source=x</link><description>研发职位</description></item><item><title>重复</title><link>/jobs/1</link></item></channel></rss>";
  const rows = parseSource(rss, "https://example.com/feed", "feed", "career");
  assert(rows.length === 1);
  assert(rows[0].record_type === "announcement");
  const atom =
    '<feed><entry><title>行业趋势</title><link rel="alternate" href="/news/2"/><summary>技术进展</summary></entry></feed>';
  assert(
    parseSource(atom, "https://example.com/feed", "feed", "industry")[0]
      .canonical_url === "https://example.com/news/2",
  );
});
Deno.test("JobPosting structured schema carries actual company and deadline", () => {
  const html =
    '<script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"研发工程师","hiringOrganization":{"name":"测试公司"},"validThrough":"2026-11-01","url":"/jobs/1","description":"<p>机械研发</p>"}]}</script>';
  const r = parseSource(html, "https://example.com/", "html", "career")[0];
  assert(
    r.company === "测试公司" && r.deadline === "2026-11-01" &&
      r.record_type === "job",
  );
  const notice = parseSource(
    '<nav><a href="/login">登录招聘平台</a></nav><a href="/announcement">事业单位招聘公告</a>',
    "https://example.com/",
    "html",
    "career",
  );
  assert(notice.length === 1 && notice[0].record_type === "announcement");
  assert(
    parseSource("<h1>登录后查看</h1>", "https://example.com/", "html", "career")
      .length === 0,
  );
  let rejected = false;
  try {
    canonical("javascript:alert(1)", "https://example.com/");
  } catch {
    rejected = true;
  }
  assert(rejected);
});
Deno.test("API secrets use random IVs and authenticated owner binding", async () => {
  Deno.env.set(
    "ATLAS_CREDENTIAL_SECRET",
    "test-only-master-secret-32-characters-minimum",
  );
  const a = await cryptKey("private-api-key", "owner-a"),
    b = await cryptKey("private-api-key", "owner-a");
  assert(a !== b && !a.includes("private-api-key"));
  assert(await cryptKey(a, "owner-a", true) === "private-api-key");
  let denied = false;
  try {
    await cryptKey(a, "owner-b", true);
  } catch {
    denied = true;
  }
  assert(denied);
  Deno.env.delete("ATLAS_CREDENTIAL_SECRET");
  let missing = false;
  try {
    await cryptKey("key", "owner");
  } catch {
    missing = true;
  }
  assert(missing);
});
Deno.test("SSRF rejects private IPv4, mapped IPv6, credentials and non-HTTPS", async () => {
  for (
    const ip of [
      "127.0.0.1",
      "10.1.1.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ]
  ) assert(!publicAddress(ip), ip);
  assert(publicAddress("8.8.8.8"));
  assert(publicAddress("2606:4700::1111"));
  for (
    const url of [
      "http://example.com",
      "https://user:pass@example.com",
      "https://example.com:8443",
    ]
  ) {
    let rejected = false;
    try {
      await checkedUrl(url);
    } catch {
      rejected = true;
    }
    assert(rejected);
  }
});
Deno.test("Model redirects never forward API credentials", async () => {
  const oldFetch = globalThis.fetch, oldDns = Deno.resolveDns;
  let requests = 0;
  Deno.resolveDns =
    (() => Promise.resolve(["8.8.8.8"])) as unknown as typeof Deno.resolveDns;
  globalThis.fetch = (() => {
    requests++;
    return Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: "https://other.example/v1" },
      }),
    );
  }) as typeof fetch;
  try {
    let rejected = false;
    try {
      await publicFetch("https://model.example/v1", {
        method: "POST",
        headers: { Authorization: "Bearer private" },
      });
    } catch {
      rejected = true;
    }
    assert(rejected && requests === 1);
  } finally {
    globalThis.fetch = oldFetch;
    Deno.resolveDns = oldDns;
  }
});
Deno.test("BOSS login and category entries are never imported as recruitment notices", () => {
  const html =
    '<a href="/web/user/?intent=0">我要找工作 各大行业职位任选</a><a href="/c100010000-p130501/">其他运营职位</a><a href="/job_detail/abcdef123456.html">机械研发工程师</a>';
  const rows = parseSource(html, "https://www.zhipin.com/", "html", "career");
  assert(
    rows.length === 1 &&
      rows[0].canonical_url.endsWith("/job_detail/abcdef123456.html"),
  );
});
