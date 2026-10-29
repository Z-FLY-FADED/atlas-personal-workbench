export const topicRules: Record<string, RegExp> = {
  "AI": /人工智能|大模型|机器学习|深度学习|\bAI\b|\bLLM\b|GPU|算力|智能体/i,
  "机器人": /机器人|robot|具身智能|机械臂|自动驾驶|无人机|无人系统|潜水器/i,
  "智能制造":
    /智能制造|工业|制造|manufactur|工业互联网|数字工厂|半导体|芯片|自动化|机加工|控制系统/i,
  "新能源":
    /新能源|动力电池|锂电|氢能|储能|光伏|风电|电动汽车|solar|battery|hydrogen/i,
};
export function topicsFor(text: string) {
  return Object.entries(topicRules).filter(([, rule]) => rule.test(text)).map((
    [name],
  ) => name);
}
export function validateIndustrySource(source: Record<string, any>) {
  if (!["tech_wechat", "company_wechat"].includes(source.source_channel)) {
    return;
  }
  const url = new URL(source.url);
  if (
    /(^|\.)weixin\.qq\.com$/i.test(url.hostname) &&
    source.adapter !== "wechat_article"
  ) {
    throw new Error(
      "这是微信单篇文章或主页链接，不能持续订阅。请填写已登录公众号订阅服务生成的 RSS / Atom / JSON Feed 地址。",
    );
  }
  if (!["feed", "wechat_article"].includes(source.adapter)) {
    throw new Error("请选择公众号订阅源，或微信单篇正文直采。");
  }
}
export function normalizePublished(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T") + "+08:00"
    : value;
  const stamp = Date.parse(normalized);
  return Number.isFinite(stamp) ? new Date(stamp).toISOString() : null;
}
