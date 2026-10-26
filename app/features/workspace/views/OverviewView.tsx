"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { knowledgeKey } from "../../knowledge/domain/identity";
import { TaskBacklog } from "../../tasks/components/TaskBacklog";
import { WorkspaceOverview } from "../components/WorkspaceOverview";
import { projectMetrics } from "../domain/workspace";
type Props = {
    controller: Pick<WorkspaceController, "view" | "tasks" | "currentTaskDay" | "reloadWorkspace" | "openTaskEditor" | "profile" | "visibleTasks" | "knowledge" | "recentKeys" | "focusWidget" | "setSelectedKnowledge" | "setReminderDay" | "setReminderOpen" | "workspaceProjects" | "workspaceReminders" | "toggleTask" | "openNewTask" | "setEditingProject" | "setProjectModal" | "setView" | "setToast" | "saveQuickNote">;
};
export function OverviewView({ controller }: Props) {
    const { view, tasks, currentTaskDay, reloadWorkspace, openTaskEditor, profile, visibleTasks, knowledge, recentKeys, focusWidget, setSelectedKnowledge, setReminderDay, setReminderOpen, workspaceProjects, workspaceReminders, toggleTask, openNewTask, setEditingProject, setProjectModal, setView, setToast, saveQuickNote } = controller;
    return <>{view === "工作台" && (<>
            <TaskBacklog tasks={tasks} today={currentTaskDay} onChanged={reloadWorkspace} onEdit={id => {
                const task = tasks.find(t => t.id === id);
                if (task)
                    openTaskEditor(task);
            }}/>
            <WorkspaceOverview displayName={profile.displayName} calendarTasks={tasks} tasks={visibleTasks} knowledge={[...knowledge].sort((a, b) => (recentKeys.indexOf(knowledgeKey(a)) < 0 ? 999 : recentKeys.indexOf(knowledgeKey(a))) - (recentKeys.indexOf(knowledgeKey(b)) < 0 ? 999 : recentKeys.indexOf(knowledgeKey(b))))} today={currentTaskDay} focusWidget={focusWidget} onOpenItem={id => setSelectedKnowledge(knowledge.find(item => item.id === id) || null)} onReminders={day => { setReminderDay(day || currentTaskDay); setReminderOpen(true); }} projects={workspaceProjects.filter(item => item.status === '进行中').map(item => projectMetrics(item, tasks))} reminders={workspaceReminders} onToggleTask={(overviewTask) => {
                const task = tasks.find((item) => item.id === overviewTask.id);
                if (task)
                    toggleTask(task);
            }} onNewTask={openNewTask} onNewProject={() => {
                setEditingProject(null);
                setProjectModal(true);
            }} onOpenTasks={() => setView("个人任务")} onOpenProjects={() => setView("项目")} onOpenKnowledge={() => setView("知识库")} onOpenNotes={() => setView("笔记")} onOpenTools={() => setToast("常用工具已固定在左侧导航")} onQuickNote={saveQuickNote}/>
            </>)}</>;
}
