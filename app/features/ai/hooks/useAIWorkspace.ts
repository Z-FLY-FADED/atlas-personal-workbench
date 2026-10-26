"use client";
import type { FormEvent } from "react";
import { useEffect, useMemo } from "react";
import type { AIData } from "../../../contracts/workspace";
import { requestJson } from "../../../shared/api/httpClient";
import { readResearchJson } from "../../../shared/api/researchClient";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
type Dependencies = Pick<WorkspaceState, "view" | "aiData" | "setAiLoading" | "setAiError" | "setAiData" | "setAiConnectionId" | "aiConnectionId" | "editingConnection" | "setAiConnectionModal" | "setEditingConnection" | "setToast" | "editingSchedule" | "setAiScheduleModal" | "setEditingSchedule" | "aiPrompt" | "setAiRunning" | "setAiResult" | "aiUseWeb">;
export function useAIWorkspace(dependencies: Dependencies) {
    const { view, aiData, setAiLoading, setAiError, setAiData, setAiConnectionId, aiConnectionId, editingConnection, setAiConnectionModal, setEditingConnection, setToast, editingSchedule, setAiScheduleModal, setEditingSchedule, aiPrompt, setAiRunning, setAiResult, aiUseWeb } = dependencies;
    useEffect(() => {
        if (view !== "AI 模型" || aiData)
            return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setAiLoading(true);
            setAiError('');
            void readResearchJson<AIData>('/api/ai', '模型配置加载失败，请检查连接后重试', { signal: controller.signal })
                .then(data => {
                if (controller.signal.aborted)
                    return;
                setAiData(data);
                const active = data.connections.find(item => item.isActive) || data.connections[0];
                if (active)
                    setAiConnectionId(active.id);
            })
                .catch(error => {
                if (!controller.signal.aborted)
                    setAiError(error.message);
            })
                .finally(() => {
                if (!controller.signal.aborted)
                    setAiLoading(false);
            });
        }, 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [view, aiData, setAiLoading, setAiError, setAiData, setAiConnectionId]);
    const activeAIConnection = useMemo(() => aiData?.connections.find((item) => item.id === aiConnectionId) ||
        aiData?.connections.find((item) => item.isActive) ||
        aiData?.connections[0] ||
        null, [aiData, aiConnectionId]);
    async function requestAI(payload: Record<string, unknown>) {
        return requestJson<{
            error?: string;
            id?: number;
            run?: {
                result?: string;
            };
        }>("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            timeoutMs: 120000,
        });
    }
    async function reloadAI() {
        setAiLoading(true);
        setAiError('');
        try {
            const data = await readResearchJson<AIData>('/api/ai', '模型配置加载失败，请检查连接后重试');
            setAiData(data);
            const active = data.connections.find(item => item.isActive) || data.connections[0];
            if (active && !data.connections.some(item => item.id === aiConnectionId))
                setAiConnectionId(active.id);
            return data;
        }
        catch (error) {
            setAiError(error instanceof Error ? error.message : '模型配置加载失败，请重试');
            throw error;
        }
        finally {
            setAiLoading(false);
        }
    }
    async function saveAIConnection(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            const saved = await requestAI({
                action: "save-connection",
                id: editingConnection?.id || 0,
                name: String(form.get("name") || ""),
                provider: String(form.get("provider") || "openai"),
                model: String(form.get("model") || ""),
                baseUrl: String(form.get("baseUrl") || ""),
                apiKey: String(form.get("apiKey") || ""),
            });
            if (!editingConnection && saved.id)
                await requestAI({ action: "set-active", id: saved.id });
            const data = await reloadAI();
            const selected = data.connections.find((item) => item.id === (saved.id || editingConnection?.id)) ||
                data.connections.find((item) => item.isActive) ||
                data.connections[0];
            if (selected)
                setAiConnectionId(selected.id);
            setAiConnectionModal(false);
            setEditingConnection(null);
            setToast("账户与模型已安全保存并切换");
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "保存失败");
        }
    }
    async function saveAISchedule(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await requestAI({
                action: "save-schedule",
                id: editingSchedule?.id || 0,
                title: String(form.get("title") || ""),
                connectionId: Number(form.get("connectionId")),
                prompt: String(form.get("prompt") || ""),
                cadence: String(form.get("cadence") || "daily"),
                timeOfDay: String(form.get("timeOfDay") || "08:00"),
                weekdays: String(form.get("weekdays") || "1,2,3,4,5"),
                useWeb: form.get("useWeb") === "on",
                enabled: true,
            });
            await reloadAI();
            setAiScheduleModal(false);
            setEditingSchedule(null);
            setToast("定时查询已保存，自动执行以运行方式设置为准");
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "保存失败");
        }
    }
    async function runAIQuery() {
        if (!aiConnectionId || !aiPrompt.trim()) {
            setToast("请选择模型并输入查询内容");
            return;
        }
        setAiRunning(true);
        setAiResult("");
        try {
            const data = await requestAI({
                action: "query",
                connectionId: aiConnectionId,
                prompt: aiPrompt,
                useWeb: aiUseWeb,
            });
            setAiResult(data.run?.result || "查询完成");
            await reloadAI();
        }
        catch (error) {
            setAiResult(error instanceof Error ? `查询失败：${error.message}` : "查询失败");
        }
        finally {
            setAiRunning(false);
        }
    }
    async function switchAIConnection(id: number) {
        if (id === -1) {
            setEditingConnection(null);
            setAiConnectionModal(true);
            return;
        }
        if (!id || id === aiConnectionId)
            return;
        setAiConnectionId(id);
        try {
            await requestAI({ action: "set-active", id });
            await reloadAI();
            setToast("GPT 账户与模型已切换");
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "账户切换失败");
        }
    }
    async function aiAction(payload: Record<string, unknown>, success: string) {
        try {
            await requestAI(payload);
            await reloadAI();
            setToast(success);
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "操作失败");
        }
    }
    return { activeAIConnection, requestAI, reloadAI, saveAIConnection, saveAISchedule, runAIQuery, switchAIConnection, aiAction };
}
export type AIWorkspaceResult = ReturnType<typeof useAIWorkspace>;
