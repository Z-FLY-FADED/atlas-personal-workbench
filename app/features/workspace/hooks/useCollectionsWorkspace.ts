"use client";
import type { FormEvent } from "react";
import type { UserProfile } from "../../../contracts/workspace";
import { getAvatarInitial } from "../../../shared/lib/profile";
import type { WorkspaceSessionResult } from "../../../shell/useWorkspaceSession";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import type { TaskActionsResult } from "../../tasks/hooks/useTaskActions";
import type { WorkspaceReminder } from "../components/WorkspaceOverview";
import type { WorkspaceProjectRecord, WorkspaceQuickNote } from "../components/WorkspacePages";
type Dependencies = Pick<WorkspaceState & TaskActionsResult & WorkspaceSessionResult, "editingProject" | "workspaceRequest" | "setWorkspaceProjects" | "setProjectModal" | "setEditingProject" | "setToast" | "setQuickNotes" | "setNoteModal" | "setEditingNote" | "openNewTask" | "setTaskSeed" | "openKnowledgeCapture" | "setWorkspaceReminders" | "setProfile" | "setProfileModal">;
export function useCollectionsWorkspace(dependencies: Dependencies) {
    const { editingProject, workspaceRequest, setWorkspaceProjects, setProjectModal, setEditingProject, setToast, setQuickNotes, setNoteModal, setEditingNote, openNewTask, setTaskSeed, openKnowledgeCapture, setWorkspaceReminders, setProfile, setProfileModal } = dependencies;
    async function saveWorkspaceProject(values: Omit<WorkspaceProjectRecord, "id">) {
        const current = editingProject;
        try {
            const response = await workspaceRequest("/api/workspace", {
                method: current ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "project", id: current?.id, ...values }),
            });
            if (!response.ok)
                throw new Error("project save failed");
            const { item } = await response.json() as {
                item: WorkspaceProjectRecord;
            };
            setWorkspaceProjects((projects) => current
                ? projects.map((project) => project.id === current.id ? { ...project, ...item } : project)
                : [item, ...projects]);
            setProjectModal(false);
            setEditingProject(null);
            setToast(current ? "项目已更新" : "项目已创建");
            return true;
        }
        catch {
            setToast("项目保存失败，请稍后重试");
            return false;
        }
    }
    async function saveQuickNote(content: string, note: WorkspaceQuickNote | null = null) {
        const normalized = content.trim();
        if (!normalized)
            return false;
        try {
            const response = await workspaceRequest('/api/workspace', { method: note ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'quick-note', ...(note || {}), content: normalized }) });
            const { item } = await response.json() as {
                item: WorkspaceQuickNote;
            };
            setQuickNotes(notes => note ? notes.map(entry => entry.id === note.id ? item : entry) : [item, ...notes]);
            setNoteModal(false);
            setEditingNote(null);
            setToast('笔记已保存');
            return true;
        }
        catch {
            setToast('笔记保存失败，草稿已保留，请重试');
            return false;
        }
    }
    async function updateQuickNote(note: WorkspaceQuickNote, status: WorkspaceQuickNote['status']) {
        try {
            const response = await workspaceRequest('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'quick-note', ...note, status }) });
            const { item } = await response.json() as {
                item: WorkspaceQuickNote;
            };
            setQuickNotes(notes => notes.map(entry => entry.id === note.id ? item : entry));
            setToast(status === '已归档' ? '笔记已归档，可随时恢复' : status === '待整理' ? '笔记已恢复到速记箱' : '笔记已整理');
            return true;
        }
        catch {
            setToast('笔记更新失败，原内容已保留');
            return false;
        }
    }
    function convertNote(note: WorkspaceQuickNote, target: 'task' | 'knowledge') {
        if (target === 'task') {
            openNewTask('今日');
            setTaskSeed({ title: note.content.split(/\n/)[0].slice(0, 80), detail: note.content });
        }
        else
            openKnowledgeCapture('note', note.content);
    }
    async function saveReminder(title: string, remindAt: string) {
        try {
            const response = await workspaceRequest('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'reminder', title, remindAt }) });
            const { item } = await response.json() as {
                item: WorkspaceReminder;
            };
            setWorkspaceReminders(items => [item, ...items]);
            setToast('提醒已保存');
            return true;
        }
        catch {
            setToast('提醒保存失败，请重试');
            return false;
        }
    }
    async function toggleReminder(reminder: WorkspaceReminder) {
        try {
            await workspaceRequest('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'reminder', id: reminder.id, done: !reminder.done }) });
            setWorkspaceReminders(items => items.map(item => item.id === reminder.id ? { ...item, done: !item.done } : item));
            setToast(reminder.done ? '提醒已恢复' : '提醒已完成');
            return true;
        }
        catch {
            setToast('提醒更新失败，请重试');
            return false;
        }
    }
    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const displayName = String(form.get("displayName") || "用户名")
            .trim()
            .slice(0, 24) || "用户名";
        const next: UserProfile = {
            displayName,
            motto: String(form.get("motto") || "")
                .trim()
                .slice(0, 60),
            avatarText: getAvatarInitial(displayName),
            accent: String(form.get("accent") || "gold") as UserProfile["accent"],
        };
        workspaceRequest("/api/workspace", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "profile", ...next }),
        })
            .then((res) => (res.ok ? res.json() as Promise<{
            item: UserProfile;
        }> : Promise.reject()))
            .then(({ item }) => item && setProfile(item))
            .then(() => { setProfile(next); setProfileModal(false); setToast("个人资料已更新"); })
            .catch(() => setToast("个人资料保存失败，请重试"));
    }
    return { saveWorkspaceProject, saveQuickNote, updateQuickNote, convertNote, saveReminder, toggleReminder, saveProfile };
}
export type CollectionsWorkspaceResult = ReturnType<typeof useCollectionsWorkspace>;
