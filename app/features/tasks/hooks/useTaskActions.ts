"use client";
import type { FormEvent } from "react";
import { useCallback } from "react";
import type { Horizon, Priority, Task } from "../../../contracts/workspace";
import { clearFormDraft } from "../../../shared/hooks/useWorkspaceIO";
import { shanghaiDisplayTime } from "../../../shared/lib/dates";
import type { WorkspaceSessionResult } from "../../../shell/useWorkspaceSession";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import type { RepeatRule } from "../../planning/domain/planning";
import { shanghaiDateKey, taskPeriodStartKey } from "../domain/dates";
type Dependencies = Pick<WorkspaceState & WorkspaceSessionResult, "setTaskDraftHorizon" | "horizon" | "setTaskSeed" | "setEditingTask" | "setTaskModal" | "mutationLocks" | "workspaceRequest" | "setTasks" | "reloadWorkspace" | "setUndoTask" | "setToast" | "editingTask">;
export function useTaskActions(dependencies: Dependencies) {
    const { setTaskDraftHorizon, horizon, setTaskSeed, setEditingTask, setTaskModal, mutationLocks, workspaceRequest, setTasks, reloadWorkspace, setUndoTask, setToast, editingTask } = dependencies;
    function openNewTask(nextHorizon?: Horizon) {
        setTaskDraftHorizon(nextHorizon || horizon);
        setTaskSeed({ title: "", detail: "" });
        setEditingTask(null);
        setTaskModal(true);
    }
    function openTaskEditor(task: Task) {
        setTaskDraftHorizon(task.horizon);
        setEditingTask(task);
        setTaskModal(true);
    }
    const toggleTask = useCallback(async (task: Task) => {
        const key = 'task:' + task.id;
        if (mutationLocks.current.has(key))
            return;
        mutationLocks.current.add(key);
        const done = !task.done;
        const completedAt = done ? shanghaiDisplayTime() : '';
        const completedOn = done ? shanghaiDateKey() : '';
        const completionHistory = done ? [...(task.completionHistory || []), { id: crypto.randomUUID(), completedAt, completedOn }] : (task.completionHistory || []).slice(0, -1);
        const next = { ...task, done, completedAt, completedOn, completionHistory };
        try {
            const response = await workspaceRequest('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, type: 'task', action: 'toggle' }) });
            const { item, recurring } = await response.json() as {
                item: Task;
                recurring?: boolean;
            };
            setTasks(items => items.map(entry => entry.id === task.id ? item || next : entry));
            if (recurring)
                reloadWorkspace();
            setUndoTask(done ? item || next : null);
            setToast(done ? '任务已移入完成历史' : '任务已恢复到当前列表');
        }
        catch {
            setToast('任务状态保存失败，原状态已保留，请重试');
        }
        finally {
            mutationLocks.current.delete(key);
        }
    }, [mutationLocks, workspaceRequest, setTasks, reloadWorkspace, setUndoTask, setToast]);
    async function saveTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutationLocks.current.has("save-task"))
            return;
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const draftHorizon = String(form.get("horizon")) as Horizon;
        const draft: Task = {
            id: editingTask?.id ?? Date.now(),
            title: String(form.get("title")),
            detail: String(form.get("detail") || "个人任务"),
            priority: String(form.get("priority")) as Priority,
            horizon: draftHorizon,
            done: editingTask?.done ?? false,
            date: String(form.get("date") || "待安排"),
            completedAt: editingTask?.completedAt || "",
            completedOn: editingTask?.completedOn || "",
            completionHistory: editingTask?.completionHistory || [],
            activeOn: editingTask?.horizon === draftHorizon && editingTask.activeOn
                ? editingTask.activeOn
                : taskPeriodStartKey(draftHorizon),
            projectId: Number(form.get("projectId")) || null,
            repeatRule: draftHorizon === '今日' ? String(form.get('repeatRule') || 'none') as RepeatRule : 'none',
        };
        mutationLocks.current.add('save-task');
        try {
            draft.activeOn = String(form.get('activeOn') || draft.activeOn);
            const response = await workspaceRequest('/api/workspace', { method: editingTask ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'task', action: editingTask ? 'edit' : 'create', ...draft, subtasks: String(form.get('subtasks') || '') }) });
            const { item } = await response.json() as {
                item: Task;
            };
            setTasks(items => editingTask ? items.map(task => task.id === draft.id ? item : task) : [item, ...items]);
            clearFormDraft(formElement);
            setTaskModal(false);
            setToast(editingTask ? '任务修改已保存' : '新任务已加入工作台');
            setEditingTask(null);
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : '任务保存失败，草稿已保留，请重试');
        }
        finally {
            mutationLocks.current.delete('save-task');
        }
    }
    return { openNewTask, openTaskEditor, toggleTask, saveTask };
}
export type TaskActionsResult = ReturnType<typeof useTaskActions>;
