"use client";
import { useCallback, useEffect } from "react";
import type { Horizon, Knowledge, Theme, View, WorkspacePayload } from "../contracts/workspace";
import { findKnowledge, knowledgeKey, knowledgePreference } from "../features/knowledge/domain/identity";
import { initialKnowledge } from "../features/knowledge/domain/initialKnowledge";
import { shanghaiDateKey } from "../features/tasks/domain/dates";
import { readLocal, useWorkspaceDialogs, writeLocal } from "../shared/hooks/useWorkspaceIO";
import { getAvatarInitial } from "../shared/lib/profile";
import { themeOptions } from "./config";
import { isWorkspaceView } from './navigation';
import type { WorkspaceState } from "./useWorkspaceState";
type Dependencies = Pick<WorkspaceState, "themeReady" | "documentTitle" | "documentDraft" | "documentFileName" | "changeView" | "setCaptureMode" | "setCaptureSeed" | "setCaptureModal" | "changeHorizon" | "changeSelectedKnowledge" | "setRecentKeys" | "workspaceReady" | "knowledge" | "taskModal" | "captureModal" | "documentModal" | "resumeModal" | "applicationModal" | "aiConnectionModal" | "aiScheduleModal" | "profileModal" | "projectModal" | "noteModal" | "reminderOpen" | "selectedKnowledge" | "pending" | "webCaptureBusy" | "setTaskModal" | "setDocumentModal" | "setResumeModal" | "setApplicationModal" | "setAiConnectionModal" | "setAiScheduleModal" | "setProfileModal" | "setProjectModal" | "setNoteModal" | "setReminderOpen" | "workspaceReminders" | "setToast" | "workspaceRequest" | "setWorkspaceReady" | "setKnowledgePreferences" | "setTasks" | "setKnowledge" | "setApplications" | "setWorkspaceProjects" | "setQuickNotes" | "setWorkspaceReminders" | "setProfile" | "setResume" | "setResumeDraft" | "setResumeFileName" | "setCurrentTaskDay" | "theme" | "setTheme" | "setDocumentTitle" | "setDocumentDraft" | "setDocumentFileName" | "setThemeReady" | "toast" | "setUndoTask" | "undoTask">;
export function useWorkspaceSession(dependencies: Dependencies) {
    const { themeReady, documentTitle, documentDraft, documentFileName, changeView, setCaptureMode, setCaptureSeed, setCaptureModal, changeHorizon, changeSelectedKnowledge, setRecentKeys, workspaceReady, knowledge, taskModal, captureModal, documentModal, resumeModal, applicationModal, aiConnectionModal, aiScheduleModal, profileModal, projectModal, noteModal, reminderOpen, selectedKnowledge, pending, webCaptureBusy, setTaskModal, setDocumentModal, setResumeModal, setApplicationModal, setAiConnectionModal, setAiScheduleModal, setProfileModal, setProjectModal, setNoteModal, setReminderOpen, workspaceReminders, setToast, workspaceRequest, setWorkspaceReady, setKnowledgePreferences, setTasks, setKnowledge, setApplications, setWorkspaceProjects, setQuickNotes, setWorkspaceReminders, setProfile, setResume, setResumeDraft, setResumeFileName, setCurrentTaskDay, theme, setTheme, setDocumentTitle, setDocumentDraft, setDocumentFileName, setThemeReady, toast, setUndoTask, undoTask } = dependencies;
    useEffect(() => {
        if (themeReady)
            writeLocal('atlas-document-draft', { title: documentTitle, content: documentDraft, fileName: documentFileName });
    }, [documentDraft, documentTitle, documentFileName, themeReady]);
    const setView = useCallback((destination: View) => {
        changeView(destination);
        const url = new URL(window.location.href);
        url.searchParams.set('page', destination);
        url.searchParams.delete('item');
        window.history.pushState(null, '', url);
        writeLocal('atlas-last-page', destination);
        window.scrollTo({ top: 0 });
    }, [changeView]);
    function openKnowledgeCapture(mode: 'note' | 'web' = 'note', seed = '') {
        setCaptureMode(mode);
        setCaptureSeed(seed);
        setCaptureModal(true);
        setView('知识库');
    }
    const setHorizon = useCallback((value: Horizon) => {
        changeHorizon(value);
        const url = new URL(window.location.href);
        url.searchParams.set('period', value);
        window.history.replaceState(null, '', url);
    }, [changeHorizon]);
    const setSelectedKnowledge = useCallback((item: Knowledge | null) => {
        changeSelectedKnowledge(item);
        const url = new URL(window.location.href);
        if (item) {
            const key = knowledgeKey(item);
            changeView('知识库');
            url.searchParams.set('page', '知识库');
            url.searchParams.set('item', key);
            const keys = [key, ...readLocal<string[]>('atlas-recent-knowledge-v2', []).filter(value => value !== key)].slice(0, 30);
            writeLocal('atlas-recent-knowledge-v2', keys);
            setRecentKeys(keys);
        }
        else
            url.searchParams.delete('item');
        window.history.pushState(null, '', url);
    }, [changeSelectedKnowledge, changeView, setRecentKeys]);
    useEffect(() => {
        const restore = () => {
            const url = new URL(window.location.href), params = url.searchParams;
            let destination = params.get('page') || readLocal('atlas-last-page', '工作台');
            if (destination === '网页收录' || (destination === '知识库' && (params.get('capture') === 'web' || new URLSearchParams(url.hash.slice(1)).has('clip')))) {
                destination = '知识库';
                setCaptureMode('web');
                setCaptureSeed('');
                setCaptureModal(true);
                params.set('page', destination);
                params.delete('capture');
                params.delete('item');
                window.history.replaceState(null, '', url);
                writeLocal('atlas-last-page', destination);
            }
            if (isWorkspaceView(destination))
                changeView(destination);
            const period = params.get('period');
            if (period && ['今日', '本周', '年度'].includes(period))
                changeHorizon(period as Horizon);
            const key = params.get('item');
            if (workspaceReady) {
                const item = key ? findKnowledge(knowledge, key) || null : null;
                changeSelectedKnowledge(item);
                if (item && key !== knowledgeKey(item)) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('item', knowledgeKey(item));
                    window.history.replaceState(null, '', url);
                }
                const recent = readLocal<string[]>('atlas-recent-knowledge-v2', readLocal('atlas-recent-knowledge', [])).map(value => findKnowledge(knowledge, value)).filter((item): item is Knowledge => Boolean(item)).map(knowledgeKey);
                setRecentKeys(recent);
                writeLocal('atlas-recent-knowledge-v2', recent);
            }
        };
        const timer = window.setTimeout(restore, 0);
        window.addEventListener('popstate', restore);
        return () => { clearTimeout(timer); window.removeEventListener('popstate', restore); };
    }, [changeHorizon, changeSelectedKnowledge, changeView, knowledge, setCaptureModal, setCaptureMode, setCaptureSeed, setRecentKeys, workspaceReady]);
    useWorkspaceDialogs([taskModal, captureModal, documentModal, resumeModal, applicationModal, aiConnectionModal, aiScheduleModal, profileModal, projectModal, noteModal, reminderOpen, Boolean(selectedKnowledge)].map(value => value ? '1' : '0').join('').replace(/^0+$/, ''), () => {
        if (pending || webCaptureBusy)
            return;
        setTaskModal(false);
        setCaptureModal(false);
        setDocumentModal(false);
        setResumeModal(false);
        setApplicationModal(false);
        setAiConnectionModal(false);
        setAiScheduleModal(false);
        setProfileModal(false);
        setProjectModal(false);
        setNoteModal(false);
        setReminderOpen(false);
        if (selectedKnowledge)
            setSelectedKnowledge(null);
    });
    useEffect(() => {
        const check = () => {
            const notified = readLocal<string[]>('atlas-reminders-notified', []);
            const due = workspaceReminders.filter(item => !item.done && Number.isFinite(Date.parse(item.remindAt)) && Date.parse(item.remindAt) <= Date.now() && !notified.includes(item.id + ':' + item.remindAt));
            if (due.length) {
                setToast('提醒：' + due.map(item => item.title).join('、'));
                writeLocal('atlas-reminders-notified', [...notified, ...due.map(item => item.id + ':' + item.remindAt)]);
            }
        };
        const initial = window.setTimeout(check, 0);
        const timer = window.setInterval(check, 30000);
        return () => { clearTimeout(initial); clearInterval(timer); };
    }, [setToast, workspaceReminders]);
    const reloadWorkspace = useCallback(() => {
        return workspaceRequest("/api/workspace")
            .then((res) => (res.ok ? res.json() as Promise<WorkspacePayload> : Promise.reject()))
            .then((data) => {
            setWorkspaceReady(true);
            if (Array.isArray(data.knowledgePreferences))
                setKnowledgePreferences(data.knowledgePreferences);
            // An empty API response is meaningful: it should clear the empty
            // initial state rather than leave any demo tasks on screen.
            if (Array.isArray(data.tasks))
                setTasks(data.tasks);
            if (Array.isArray(data.knowledge)) {
                const serverKnowledge = data.knowledge as Knowledge[];
                const applyPreference = (item: Knowledge) => { const pref = knowledgePreference(data.knowledgePreferences || [], item); return pref ? { ...item, primaryCategory: pref.primaryCategory || item.primaryCategory, secondaryCategory: pref.secondaryCategory || item.secondaryCategory } : item; };
                const savedTitles = new Set(serverKnowledge.map((item) => item.title.trim().toLowerCase()));
                const bundledKnowledge = initialKnowledge.filter((item) => !savedTitles.has(item.title.trim().toLowerCase()));
                setKnowledge([...serverKnowledge.map(applyPreference), ...bundledKnowledge.map(applyPreference)]);
            }
            if (Array.isArray(data.applications))
                setApplications(data.applications);
            if (Array.isArray(data.projects))
                setWorkspaceProjects(data.projects);
            if (Array.isArray(data.quickNotes))
                setQuickNotes(data.quickNotes);
            if (Array.isArray(data.reminders))
                setWorkspaceReminders(data.reminders);
            if (data.profile)
                setProfile({
                    ...data.profile,
                    avatarText: getAvatarInitial(data.profile.displayName),
                });
            if (data.resume?.content) {
                setResume(data.resume);
                setResumeDraft(data.resume.content);
                setResumeFileName(data.resume.fileName || "个人简历");
            }
        })
            .catch(() => { setToast('工作台数据加载失败，可点击状态栏重试'); });
        ;
    }, [setApplications, setKnowledge, setKnowledgePreferences, setProfile, setQuickNotes, setResume, setResumeDraft, setResumeFileName, setTasks, setToast, setWorkspaceProjects, setWorkspaceReady, setWorkspaceReminders, workspaceRequest]);
    useEffect(() => {
        const timer = window.setInterval(() => {
            const currentDay = shanghaiDateKey();
            setCurrentTaskDay((activeDay) => activeDay === currentDay ? activeDay : currentDay);
        }, 60000);
        return () => window.clearInterval(timer);
    }, [setCurrentTaskDay]);
    useEffect(() => {
        if (!themeReady)
            return;
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem("atlas-theme", theme);
        }
        catch { /* Storage unavailable. */ }
    }, [theme, themeReady]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            try {
                const saved = localStorage.getItem('atlas-theme');
                if (saved === 'light')
                    setTheme('ivory');
                else if (saved === 'dark')
                    setTheme('obsidian');
                else if (themeOptions.some(option => option.id === saved))
                    setTheme(saved as Theme);
            }
            catch { /* Keep the default when browser storage is unavailable. */ }
            const draft = readLocal('atlas-document-draft', { title: '', content: '', fileName: '' });
            setDocumentTitle(draft.title);
            setDocumentDraft(draft.content);
            setDocumentFileName(draft.fileName);
            setThemeReady(true);
            void reloadWorkspace();
        }, 0);
        return () => clearTimeout(timer);
    }, [reloadWorkspace, setDocumentDraft, setDocumentFileName, setDocumentTitle, setTheme, setThemeReady]);
    useEffect(() => {
        if (!toast)
            return;
        const timer = window.setTimeout(() => {
            setToast("");
            setUndoTask(null);
        }, undoTask ? 6000 : 2600);
        return () => window.clearTimeout(timer);
    }, [setToast, setUndoTask, toast, undoTask]);
    return { setView, openKnowledgeCapture, setHorizon, setSelectedKnowledge, reloadWorkspace };
}
export type WorkspaceSessionResult = ReturnType<typeof useWorkspaceSession>;
