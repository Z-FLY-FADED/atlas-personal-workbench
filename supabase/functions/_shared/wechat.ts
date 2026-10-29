import * as cheerio from "npm:cheerio@1.1.2";
import { canonical, plain, type Row } from "./source_parser.ts";
import { normalizePublished } from "./industry.ts";
export function parseWechatArticle(raw: string, url: string): Row[] {
  const u = new URL(url);
  if (u.hostname !== "mp.weixin.qq.com" || !/^\/s(?:\/|$)/.test(u.pathname)) {
    throw new Error("请提供 mp.weixin.qq.com 的公开微信文章链接。");
  }
  const $ = cheerio.load(raw);
  const title = plain(
    $("#activity-name,.rich_media_title").first().text() ||
      $('meta[property="og:title"]').attr("content"),
  );
  const body = $("#js_content");
  body.find("script,style").remove();
  const content = plain(body.html());
  if (!title || content.length < 20) {
    throw new Error(
      "微信页面未提供可读正文，可能需要微信验证，请在微信中打开原文。",
    );
  }
  const ct = /\bvar\s+ct\s*=\s*["']?(\d{10})/.exec(raw)?.[1];
  const date = ct
    ? new Date(Number(ct) * 1000).toISOString()
    : normalizePublished($("#publish_time").text().trim());
  return [{
    title,
    summary: content.slice(0, 800),
    content_excerpt: content.slice(0, 100000),
    canonical_url: canonical(url, url),
    publisher: plain(
      $("#js_name").text() || $('meta[name="author"]').attr("content"),
    ),
    published_at: date,
    record_type: "wechat_article",
  }];
}
