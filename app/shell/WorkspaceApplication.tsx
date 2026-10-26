"use client";
import dynamic from "next/dynamic";
import type { View } from "../contracts/workspace";
import { WorkspaceToast } from "../features/workspace/components/WorkspaceToast";
import type { SearchEntry } from "../features/workspace/domain/workspace";
import { conciseSummary } from "../features/workspace/domain/workspace";
import { formatDate } from "../shared/lib/dates";
import { getAvatarInitial } from "../shared/lib/profile";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { WorkspaceTopbar } from "./components/WorkspaceTopbar";
import { useWorkspaceController } from './useWorkspaceController';
import { WorkspaceOutlet } from './WorkspaceOutlet';
const TaskDialog = dynamic(() => import("../features/tasks/components/TaskDialog").then(module => module.TaskDialog));
const CaptureDialog = dynamic(() => import("../features/knowledge/components/CaptureDialog").then(module => module.CaptureDialog));
const DocumentDialog = dynamic(() => import("../features/knowledge/components/DocumentDialog").then(module => module.DocumentDialog));
const ResumeDialog = dynamic(() => import("../features/career/components/ResumeDialog").then(module => module.ResumeDialog));
const ApplicationDialog = dynamic(() => import("../features/career/components/ApplicationDialog").then(module => module.ApplicationDialog));
const AIConnectionDialog = dynamic(() => import("../features/ai/components/AIConnectionDialog").then(module => module.AIConnectionDialog));
const AIScheduleDialog = dynamic(() => import("../features/ai/components/AIScheduleDialog").then(module => module.AIScheduleDialog));
const ProfileDialog = dynamic(() => import("../features/workspace/components/ProfileDialog").then(module => module.ProfileDialog));
const WebClipDialog = dynamic(() => import("../features/knowledge/components/WebClipDialog").then(module => module.WebClipDialog));
const KnowledgeDetailDialog = dynamic(() => import("../features/knowledge/components/KnowledgeDetailDialog").then(module => module.KnowledgeDetailDialog));
const ReminderDialog = dynamic(() => import("../features/workspace/components/ReminderDialog").then(module => module.ReminderDialog));
const CollectionDialogs = dynamic(() => import("../features/workspace/components/CollectionDialogs").then(module => module.CollectionDialogs));
export function WorkspaceApplication() {
    const controller = useWorkspaceController();
    const { view, mobileMenu, visibleTasks, pending, syncError, lastSaved, reloadWorkspace, profile, setHorizon, setView, setMobileMenu, setProfileModal, tasks, workspaceProjects, quickNotes, knowledge, workspaceReminders, openTaskEditor, setEditingProject, setProjectModal, setEditingNote, setNoteModal, setSelectedKnowledge, query, setQuery, openNewTask, openKnowledgeCapture, setDocumentModal, setReminderDay, currentTaskDay, setReminderOpen, workspaceReady } = controller;
    return (<main className="app-shell">
      <WorkspaceSidebar active={view} mobileOpen={mobileMenu} taskCount={visibleTasks.filter((task) => task.horizon === "今日" && !task.done).length} syncStatus={pending ? "同步中…" : syncError || (lastSaved ? "数据已同步" : "等待加载")} syncDetail={lastSaved ? `最近成功：${new Date(lastSaved).toLocaleTimeString("zh-CN")}` : "尚未完成同步"} syncError={Boolean(syncError)} onRetry={() => void reloadWorkspace()} profile={{ ...profile, avatarText: getAvatarInitial(profile.displayName) }} onNavigate={(destination) => {
            if (destination === "今日") {
                setHorizon("今日");
                setView("个人任务");
            }
            else {
                setView(destination);
            }
            setMobileMenu(false);
        }} onOpenTool={(destination) => {
            setView(destination as View);
            setMobileMenu(false);
        }} onOpenProfile={() => setProfileModal(true)} onCloseMobile={() => setMobileMenu(false)}/>

      <section className="content-shell">
        <WorkspaceTopbar entries={[
            ...tasks.map(item => ({ id: item.id, kind: '任务' as const, title: item.title, detail: item.horizon + ' · ' + item.detail })),
            ...workspaceProjects.map(item => ({ id: item.id, kind: '项目' as const, title: item.title, detail: item.stage + ' · ' + item.nextMilestone })),
            ...quickNotes.map(item => ({ id: item.id, kind: '笔记' as const, title: item.content.slice(0, 70), detail: item.status, content: item.content })),
            ...knowledge.map(item => ({ id: item.id, kind: '资料' as const, title: item.title, detail: item.primaryCategory + ' · ' + conciseSummary(item.title, item.summary), content: item.content })),
        ]} reminderCount={workspaceReminders.filter(item => !item.done).length} onSelectResult={(entry: SearchEntry) => {
            if (entry.kind === '任务') {
                const item = tasks.find(item => item.id === entry.id);
                if (item) {
                    setView('个人任务');
                    setHorizon(item.horizon);
                    openTaskEditor(item);
                }
            }
            if (entry.kind === '项目') {
                setView('项目');
                setEditingProject(workspaceProjects.find(item => item.id === entry.id) || null);
                setProjectModal(true);
            }
            if (entry.kind === '笔记') {
                setView('笔记');
                setEditingNote(quickNotes.find(item => item.id === entry.id) || null);
                setNoteModal(true);
            }
            if (entry.kind === '资料') {
                setView('知识库');
                setSelectedKnowledge(knowledge.find(item => item.id === entry.id) || null);
            }
        }} query={query} dateLabel={formatDate()} avatarText={getAvatarInitial(profile.displayName)} onQueryChange={setQuery} onMenu={() => setMobileMenu((open) => !open)} onNewTask={() => openNewTask()} onNewProject={() => {
            setEditingProject(null);
            setProjectModal(true);
        }} onNewNote={() => { setEditingNote(null); setNoteModal(true); }} onCapture={() => openKnowledgeCapture()} onImportDocument={() => setDocumentModal(true)} onProfile={() => setProfileModal(true)} onReminders={() => { setReminderDay(currentTaskDay); setReminderOpen(true); }}/>

        <div className="page">{(!workspaceReady || syncError) && <div className="workspace-data-status" role="status"><span>{pending ? '正在加载或保存数据…' : syncError || '正在加载个人数据…'}</span>{!pending && <button onClick={() => void reloadWorkspace()}>重新加载</button>}</div>}
    <WorkspaceOutlet controller={controller}/></div>
      </section>

      {(controller.taskModal) && <TaskDialog controller={controller}/>}

      {(controller.captureModal) && <CaptureDialog controller={controller}/>}

      {(controller.documentModal) && <DocumentDialog controller={controller}/>}

      {(controller.resumeModal) && <ResumeDialog controller={controller}/>}
      {(controller.applicationModal) && <ApplicationDialog controller={controller}/>}

      {(controller.aiConnectionModal) && <AIConnectionDialog controller={controller}/>}

      {(controller.aiScheduleModal) && <AIScheduleDialog controller={controller}/>}

      {(controller.profileModal) && <ProfileDialog controller={controller}/>}

      {(controller.selectedKnowledge?.sourceType === "网页摘录") && <WebClipDialog controller={controller}/>}
      {(controller.selectedKnowledge && controller.selectedKnowledge.sourceType !== "网页摘录") && <KnowledgeDetailDialog controller={controller}/>}

      {(controller.reminderOpen) && <ReminderDialog controller={controller}/>}
      {(controller.projectModal || controller.noteModal) && <CollectionDialogs controller={controller}/>}

      <WorkspaceToast controller={controller}/>
    </main>);
}
