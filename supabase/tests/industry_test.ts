import { canonical, parseSource } from "../functions/_shared/source_parser.ts";
import { parseWechatArticle } from "../functions/_shared/wechat.ts";
import {
  normalizePublished,
  topicsFor,
  validateIndustrySource,
} from "../functions/_shared/industry.ts";
function assert(v: unknown) {
  if (!v) throw new Error("Industry assertion failed");
}
Deno.test("CCTV JSONP reads article dates and URLs without executing code", () => {
  const raw =
    'tech({"data":{"list":[{"title":"人工智能机器人新闻","brief":"新能源智能制造","url":"https://news.cctv.cn/2026/10/29/ARTItest.shtml","focus_date":"2026-10-29 09:00:00"}]}});';
  const rows = parseSource(
    raw,
    "https://news.cctv.cn/tech",
    "cctv",
    "industry",
  );
  assert(rows.length === 1 && rows[0].record_type === "news");
  assert(
    normalizePublished(rows[0].published_at) === "2026-10-29T01:00:00.000Z",
  );
  let denied = false;
  try {
    parseSource(raw + "alert(1)", "https://news.cctv.cn/", "cctv", "industry");
  } catch {
    denied = true;
  }
  assert(denied);
});
Deno.test("Wechat single article reads original publisher, body and real publication timestamp", () => {
  const html =
    '<h1 id="activity-name">机器人控制技术</h1><a id="js_name">测试科技号</a><div id="js_content"><p>人工智能机器人控制系统研究与智能制造应用，这是足够长的正文。</p><script>danger()</script></div><script>var ct = "1793235600";</script>';
  const row = parseWechatArticle(html, "https://mp.weixin.qq.com/s/test")[0];
  assert(
    row.publisher === "测试科技号" &&
      String(row.content_excerpt).includes("机器人控制系统") &&
      !String(row.content_excerpt).includes("danger"),
  );
  assert(row.published_at === new Date(1793235600000).toISOString());
  let denied = false;
  try {
    parseWechatArticle(
      "<h2>环境异常</h2><p>完成验证后继续</p>",
      "https://mp.weixin.qq.com/s/test",
    );
  } catch (e) {
    denied = String(e).includes("微信验证");
  }
  assert(denied);
});
Deno.test("A Wechat article cannot be presented as a continuing subscription", () => {
  let denied = false;
  try {
    validateIndustrySource({
      source_channel: "tech_wechat",
      adapter: "feed",
      url: "https://mp.weixin.qq.com/s/test",
    });
  } catch {
    denied = true;
  }
  assert(denied);
  validateIndustrySource({
    source_channel: "company_wechat",
    adapter: "wechat_article",
    url: "https://mp.weixin.qq.com/s/test",
  });
  validateIndustrySource({
    source_channel: "company_wechat",
    adapter: "feed",
    url: "https://feeds.example.com/tencent.atom",
  });
});
Deno.test("Wechat JSON feed and stable canonical links preserve article identifiers", () => {
  const rows = parseSource(
    JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      items: [{
        title: "公众号机器人新闻",
        url:
          "https://mp.weixin.qq.com/s?__biz=xyz&mid=123&idx=1&sn=abc&scene=2",
        content_html: "<p>人工智能</p>",
        date_published: "2026-10-29T09:00:00+08:00",
      }, { title: "missing-url" }],
    }),
    "https://feeds.example.com/account.json",
    "feed",
    "industry",
  );
  assert(rows.length === 1);
  const url = canonical(
    String(rows[0].canonical_url),
    "https://feeds.example.com",
  );
  assert(
    url.includes("mid=123") && url.includes("sn=abc") &&
      !url.includes("scene="),
  );
  assert(topicsFor("人工智能机器人新能源制造").length === 4);
  assert(topicsFor("said hello").length === 0);
  assert(normalizePublished("not a date") === null);
});
