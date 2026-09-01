export const INDUSTRY_CATEGORIES = ["汽车", "机器人", "半导体", "互联网大厂", "制造业"] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];
export type IndustryTopic = "industry" | "company";
export type IndustrySourceKind = "seed" | "rss" | "rsshub" | "json" | "html" | "webhook";
export type IndustryTrustLevel = "official" | "institution" | "media" | "community";

export type IndustryArticle = {
  id: number;
  sourceId: number | null;
  industry: IndustryCategory;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  discoveredAt: string;
  url: string;
  topic: IndustryTopic;
  company?: string;
  importanceScore: number;
  relevanceScore: number;
  confidenceScore: number;
  sourceAuthenticity: "official" | "reviewed" | "unreviewed";
  contentStatus: "full" | "excerpt" | "summary_only" | "unavailable";
  corroborationStatus: "official_primary" | "multiple_sources" | "single_source";
  read: boolean;
  starred: boolean;
  knowledgeId: number | null;
};

export type IndustrySource = {
  id: number;
  name: string;
  url: string;
  kind: IndustrySourceKind;
  industry: IndustryCategory;
  topic: IndustryTopic;
  company: string;
  trustLevel: IndustryTrustLevel;
  priority: number;
  pollIntervalMinutes: number;
  enabled: boolean;
  lastCheckedAt: string;
  lastSuccessAt: string;
  nextCheckAt: string;
  consecutiveFailures: number;
  lastError: string;
};

export type IndustryPayload = {
  articles: IndustryArticle[];
  counts: Record<IndustryCategory, number>;
  unreadCount: number;
  starredCount: number;
  sourceCount: number;
  unhealthySourceCount: number;
  updatedAt: string;
  lastSuccessfulAt: string;
  nextCursor: number | null;
  methodology: string;
};

export type ParsedFeedItem = {
  title: string;
  url: string;
  summary: string;
  contentExcerpt: string;
  publishedAt: string;
  guid: string;
};

