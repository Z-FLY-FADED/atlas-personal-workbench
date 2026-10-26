export type ArchiveRow = Record<string, string | number | null>;
export const ARCHIVE_TABLES = ['projects', 'tasks', 'knowledge', 'quick_notes', 'reminders', 'profiles', 'resumes', 'applications', 'knowledge_preferences', 'weekly_reviews', 'workspace_settings', 'learning_cards', 'learning_logs', 'industry_sources', 'industry_articles', 'industry_article_actions', 'industry_ingestion_runs', 'watchlists', 'watchlist_items', 'recycled_records', 'task_subtasks', 'focus_sessions', 'project_knowledge', 'resume_versions', 'application_resume_links', 'career_attachments'] as const;
export const ARCHIVE_LABELS: Record<string, string> = { projects: '项目', tasks: '任务', knowledge: '个人资料', quick_notes: '笔记', reminders: '提醒', profiles: '个人资料设置', resumes: '主简历', applications: '投递记录', knowledge_preferences: '资料偏好', weekly_reviews: '周报', workspace_settings: '工作台设置', learning_cards: '复习卡片', learning_logs: '复习历史', industry_sources: '资讯来源', industry_articles: '资讯文章', industry_article_actions: '阅读与收藏', industry_ingestion_runs: '采集记录', watchlists: '自选分组', watchlist_items: '自选股票', recycled_records: '回收站', task_subtasks: '子任务', focus_sessions: '专注记录', project_knowledge: '项目资料关联', resume_versions: '岗位简历版本', application_resume_links: '投递简历快照', career_attachments: '求职附件' };
export type WorkspaceArchive = {
    format: 'atlas-workspace';
    version: 1;
    createdAt: string;
    workspaceId: string;
    tables: Record<string, ArchiveRow[]>;
    checksum: string;
    localState?: Record<string, string>;
};
export const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export async function archiveChecksum(tables: Record<string, ArchiveRow[]>) {
    const bytes = new TextEncoder().encode(JSON.stringify(tables));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
