import type { KnowledgeEnrichment } from "../features/knowledge/domain/enrichment";
import type { RepeatRule } from "../features/planning/domain/planning";
export type Priority = "优先" | "一般" | "不重要";
export type Horizon = "今日" | "本周" | "年度";
export const WORKSPACE_VIEWS = ["工作台", "个人任务", "项目", "笔记", "知识库", "英语学习", "日语学习", "每周总结", "数据与恢复", "简历投递", "股票", "行业速览", "AI 模型"] as const;
export type View = typeof WORKSPACE_VIEWS[number];
export type Theme = "obsidian" | "ivory" | "ocean" | "forest" | "clay" | "plum" | "anime" | "scenery" | "cyberpunk";
export type Task = {
    id: number;
    title: string;
    detail: string;
    priority: Priority;
    horizon: Horizon;
    done: boolean;
    date: string;
    completedAt?: string;
    completedOn?: string;
    completionHistory?: TaskCompletion[];
    activeOn?: string;
    projectId?: number | null;
    repeatRule?: RepeatRule;
};
export type TaskCompletion = {
    id: string;
    completedAt: string;
    completedOn: string;
};
export type Knowledge = {
    id: number;
    stableKey?: string;
    title: string;
    summary: string;
    content?: string;
    primaryCategory: string;
    secondaryCategory: string;
    confidence?: number;
    source: string;
    sourceType: string;
    createdAt: string;
    completeness?: number;
    enrichment?: KnowledgeEnrichment;
    keywords?: string[];
    relatedIds?: number[];
    relatedTopics?: string[];
};
export type ApplicationStatus = "待投递" | "已投递" | "笔试" | "面试" | "Offer" | "结束";
export type JobApplication = {
    id: number;
    company: string;
    role: string;
    status: ApplicationStatus;
    channel: string;
    appliedAt: string;
    nextAction: string;
    notes: string;
};
export type ApplicationFormDraft = Omit<JobApplication, "id">;
export type JobOpening = {
    cohort?: string;
    batch?: string;
    deadline?: string;
    confirmedBy?: number;
    id: string;
    company: string;
    role: string;
    industry: "汽车" | "制造" | "机器人" | "科技";
    function: "研发" | "测试" | "产品" | "质量" | "工艺";
    locations: string[];
    experience: string;
    education: string;
    tags: string[];
    summary: string;
    matchScore: number;
    applyUrl: string;
    source: string;
    sourceKind: "具体职位" | "岗位集合" | "平台搜索";
    employmentType?: "企业" | "国企/央企" | "事业编制" | "公务员";
    organizationType?: string;
    verification: "verified" | "reachable" | "pending";
    verifiedAt: string;
    sourceLevel: string;
};
export type JobPayload = {
    availability?: import('./runtime').SourceAvailability;
    jobs: JobOpening[];
    updatedAt: string;
    verifiedCount: number;
    methodology: string;
    nextCursor: string | null;
    totalKnown: number;
    sourceSummary: {
        official: number;
        platform: number;
    };
};
export type ResumeProfile = {
    fileName: string;
    content: string;
    updatedAt: string;
};
export type RankedJob = JobOpening & {
    resumeScore: number;
    matchedSkills: string[];
    missingSkills: string[];
};
export type UserProfile = {
    displayName: string;
    motto: string;
    avatarText: string;
    accent: "gold" | "blue" | "green" | "rose" | "violet" | "slate";
    updatedAt?: string;
};
export type AIConnection = {
    id: number;
    name: string;
    provider: string;
    model: string;
    baseUrl: string;
    isActive: boolean;
    status: string;
    updatedAt: string;
    hasKey: boolean;
};
export type AISchedule = {
    id: number;
    title: string;
    connectionId: number;
    connectionName: string;
    model: string;
    prompt: string;
    cadence: "hourly" | "daily" | "weekly";
    timeOfDay: string;
    weekdays: string;
    useWeb: boolean;
    enabled: boolean;
    nextRunAt: string;
    lastRunAt: string;
};
export type AIRun = {
    id: number;
    scheduleId?: number;
    connectionId: number;
    connectionName: string;
    model: string;
    prompt: string;
    result: string;
    status: string;
    error: string;
    startedAt: string;
    finishedAt: string;
};
export type AIData = {
    connections: AIConnection[];
    schedules: AISchedule[];
    runs: AIRun[];
    account: {
        authenticated: boolean;
        email: string;
    };
    scheduler: {
        interval: string;
        timezone: string;
    };
};
export type WorkspacePayload = {
    tasks: Task[];
    knowledge: Knowledge[];
    applications: JobApplication[];
    projects: WorkspaceProjectRecord[];
    quickNotes: WorkspaceQuickNote[];
    reminders: WorkspaceReminder[];
    profile: UserProfile;
    resume: ResumeProfile | null;
    knowledgePreferences: Array<{
        knowledgeKey: string;
        primaryCategory: string;
        secondaryCategory: string;
        cover: string;
    }>;
};
export type { IndustryNews, MarketPayload, StockCandidate } from "./market";
export type WorkspaceProject = {
    id: number;
    title: string;
    stage: string;
    progress: number;
    nextMilestone: string;
    dueDate: string;
    remainingTasks: number;
    accent: string;
};
export type WorkspaceReminder = {
    id: number;
    title: string;
    remindAt: string;
    done: boolean;
};
export type WorkspaceProjectRecord = WorkspaceProject & {
    status: '进行中' | '已暂停' | '已完成';
    createdAt?: string;
    updatedAt?: string;
    startDate?: string;
    milestoneDate?: string;
    progressMode?: 'manual' | 'auto';
};
export type WorkspaceQuickNote = {
    id: number;
    content: string;
    status: '待整理' | '已整理' | '已归档';
    createdAt: string;
    updatedAt: string;
};
export type WorkspaceTask = Pick<Task, "id" | "title" | "detail" | "priority" | "horizon" | "done" | "date" | "activeOn" | "completedOn">;
export type WorkspaceKnowledge = Pick<Knowledge, "id" | "title" | "summary" | "primaryCategory" | "secondaryCategory" | "createdAt">;
