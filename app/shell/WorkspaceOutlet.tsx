"use client";
import dynamic from 'next/dynamic';
import type { View } from '../contracts/workspace';
import { FeatureBoundary } from '../shared/components/FeatureBoundary';
import type { WorkspaceController } from './useWorkspaceController';
const loading = () => <p role="status">正在打开页面…</p>;
const OverviewView = dynamic(() => import("../features/workspace/views/OverviewView").then(module => module.OverviewView), { loading });
const ProjectsView = dynamic(() => import("../features/workspace/views/ProjectsView").then(module => module.ProjectsView), { loading });
const NotesView = dynamic(() => import("../features/workspace/views/NotesView").then(module => module.NotesView), { loading });
const TasksView = dynamic(() => import("../features/tasks/views/TasksView").then(module => module.TasksView), { loading });
const KnowledgeView = dynamic(() => import("../features/knowledge/views/KnowledgeView").then(module => module.KnowledgeView), { loading });
const LanguageView = dynamic(() => import("../features/learning/views/LanguageView").then(module => module.LanguageView), { loading });
const WeeklyReviewView = dynamic(() => import("../features/workspace/views/WeeklyReviewView").then(module => module.WeeklyReviewView), { loading });
const DataView = dynamic(() => import("../features/workspace/views/DataView").then(module => module.DataView), { loading });
const CareerView = dynamic(() => import("../features/career/views/CareerView").then(module => module.CareerView), { loading });
const AIView = dynamic(() => import("../features/ai/views/AIView").then(module => module.AIView), { loading });
const MarketView = dynamic(() => import("../features/market/views/MarketView").then(module => module.MarketView), { loading });
const IndustryView = dynamic(() => import("../features/industry/views/IndustryView").then(module => module.IndustryView), { loading });
const views = {
    "工作台": OverviewView,
    "项目": ProjectsView,
    "笔记": NotesView,
    "个人任务": TasksView,
    "知识库": KnowledgeView,
    "英语学习": LanguageView,
    "每周总结": WeeklyReviewView,
    "数据与恢复": DataView,
    "简历投递": CareerView,
    "AI 模型": AIView,
    "股票": MarketView,
    "行业速览": IndustryView,
    '日语学习': LanguageView,
} satisfies Record<View, unknown>;
export function WorkspaceOutlet({ controller }: {
    controller: WorkspaceController;
}) {
    const Component = views[controller.view];
    return <FeatureBoundary key={controller.view}><Component controller={controller}/></FeatureBoundary>;
}
