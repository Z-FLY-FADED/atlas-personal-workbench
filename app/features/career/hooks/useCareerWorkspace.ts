"use client";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo } from "react";
import type { JobApplication, JobOpening, JobPayload, RankedJob, ResumeProfile } from "../../../contracts/workspace";
import { readResearchJson } from "../../../shared/api/researchClient";
import { extractDocumentText } from "../../../shared/lib/documents";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import { shanghaiDateKey } from "../../tasks/domain/dates";
import { includesSkill, rankJobByResume, resumeSkillDictionary } from "../domain/resumeMatching";
type Dependencies = Pick<WorkspaceState, "view" | "jobMarket" | "setJobsLoading" | "setJobsError" | "setJobMarket" | "resume" | "applicationDraft" | "setToast" | "editingApplication" | "setApplicationSaving" | "workspaceRequest" | "setApplications" | "setApplicationModal" | "setEditingApplication" | "setResumeParsing" | "setResumeDraft" | "setResumeFileName" | "resumeDraft" | "resumeFileName" | "setResume" | "setResumeModal" | "applications" | "mutationLocks" | "jobsLoadingMore" | "setJobsLoadingMore" | "jobsLoading">;
export function useCareerWorkspace(dependencies: Dependencies) {
    const { view, jobMarket, setJobsLoading, setJobsError, setJobMarket, resume, applicationDraft, setToast, editingApplication, setApplicationSaving, workspaceRequest, setApplications, setApplicationModal, setEditingApplication, setResumeParsing, setResumeDraft, setResumeFileName, resumeDraft, resumeFileName, setResume, setResumeModal, applications, mutationLocks, jobsLoadingMore, setJobsLoadingMore, jobsLoading } = dependencies;
    useEffect(() => {
        const reset = () => setJobMarket(null);
        window.addEventListener('atlas-runtime-policy', reset);
        return () => window.removeEventListener('atlas-runtime-policy', reset);
    }, [setJobMarket]);
    useEffect(() => {
        if (view !== "简历投递" || jobMarket)
            return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setJobsLoading(true);
            setJobsError('');
            void readResearchJson<JobPayload>('/api/jobs', '岗位加载失败，请检查连接后重试', { signal: controller.signal })
                .then(data => {
                if (!controller.signal.aborted)
                    setJobMarket(data);
            })
                .catch(error => {
                if (!controller.signal.aborted)
                    setJobsError(error.message);
            })
                .finally(() => {
                if (!controller.signal.aborted)
                    setJobsLoading(false);
            });
        }, 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [view, jobMarket, setJobsLoading, setJobsError, setJobMarket]);
    const resumeSkills = useMemo(() => resume
        ? resumeSkillDictionary
            .filter((skill) => includesSkill(resume.content, skill))
            .slice(0, 8)
        : [], [resume]);
    const rankedJobs = useMemo<RankedJob[]>(() => {
        return (jobMarket?.jobs || [])
            .map((job) => rankJobByResume(job, resume))
            .sort((a, b) => b.resumeScore - a.resumeScore ||
            b.matchScore - a.matchScore ||
            a.company.localeCompare(b.company, "zh-CN"));
    }, [
        jobMarket,
        resume,
    ]);
    async function addApplication(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const company = applicationDraft.company.trim();
        const role = applicationDraft.role.trim();
        if (!company || !role) {
            setToast("请填写公司和职位");
            return;
        }
        const draft: JobApplication = {
            id: editingApplication?.id || Date.now(),
            company,
            role,
            status: applicationDraft.status,
            channel: applicationDraft.channel.trim() || "手动记录",
            appliedAt: applicationDraft.appliedAt || shanghaiDateKey(),
            nextAction: applicationDraft.nextAction.trim() || "等待反馈",
            notes: applicationDraft.notes.trim(),
        };
        const editing = Boolean(editingApplication);
        setApplicationSaving(true);
        try {
            const response = await workspaceRequest("/api/workspace", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "application", ...draft }),
            });
            const data = (await response.json().catch(() => ({}))) as {
                item?: JobApplication;
                error?: string;
            };
            if (!response.ok)
                throw new Error(data.error || "保存失败");
            const saved = data.item || draft;
            setApplications((items) => editing
                ? items.map((item) => (item.id === draft.id ? saved : item))
                : [saved, ...items]);
            setApplicationModal(false);
            setEditingApplication(null);
            setToast(editing ? "投递记录已更新" : "投递记录已保存");
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "保存失败，请稍后重试");
        }
        finally {
            setApplicationSaving(false);
        }
    }
    async function handleResumeFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (file.size > 12 * 1024 * 1024) {
            setToast("简历文件不能超过 12 MB");
            event.target.value = "";
            return;
        }
        setResumeParsing(true);
        try {
            const cleaned = (await extractDocumentText(file, 50)).slice(0, 100000);
            if (cleaned.length < 30)
                throw new Error("没有从文件中读取到足够文字，可在下方直接粘贴简历内容");
            setResumeDraft(cleaned);
            setResumeFileName(file.name);
            setToast(`已读取 ${file.name}，请确认后保存`);
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "简历解析失败，请粘贴文字内容");
        }
        finally {
            setResumeParsing(false);
            event.target.value = "";
        }
    }
    async function saveResume(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const content = resumeDraft.trim();
        if (content.length < 50) {
            setToast("请至少填写 50 个字的简历内容，以便完成岗位匹配");
            return;
        }
        setResumeParsing(true);
        try {
            const response = await workspaceRequest("/api/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "resume",
                    fileName: resumeFileName || "个人简历",
                    content,
                }),
            });
            if (!response.ok)
                throw new Error("简历保存失败");
            const data = (await response.json()) as {
                item: ResumeProfile;
            };
            setResume(data.item);
            setResumeDraft(data.item.content);
            setResumeFileName(data.item.fileName);
            setResumeModal(false);
            setToast("简历已保存，岗位已按匹配度从高到低排序");
        }
        catch (error) {
            setToast(error instanceof Error ? error.message : "简历保存失败");
        }
        finally {
            setResumeParsing(false);
        }
    }
    async function handleTrackOpening(job: JobOpening) {
        const duplicate = applications.some((item) => item.company === job.company &&
            item.role === job.role &&
            item.status !== "结束");
        if (duplicate) {
            setToast("该岗位已在投递追踪中");
            return;
        }
        const draft: JobApplication = {
            id: Math.max(0, ...applications.map((item) => item.id)) + 1,
            company: job.company,
            role: job.role,
            status: "待投递",
            channel: job.source,
            appliedAt: "待投递",
            nextAction: "打开官方链接并确认职位仍开放",
            notes: `${job.industry} · ${job.function} · ${job.locations.join(" / ")}`,
        };
        const key = 'track:' + job.company + ':' + job.role;
        if (mutationLocks.current.has(key))
            return;
        mutationLocks.current.add(key);
        try {
            const response = await workspaceRequest('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'application', ...draft }) });
            const { item } = await response.json() as {
                item: JobApplication;
            };
            setApplications(items => [item, ...items]);
            setToast('已加入投递追踪，可在“投递记录”中更新状态');
        }
        catch {
            setToast('加入投递追踪失败，请重试');
        }
        finally {
            mutationLocks.current.delete(key);
        }
    }
    function loadMoreJobs() {
        if (!jobMarket?.nextCursor || jobsLoadingMore)
            return;
        setJobsLoadingMore(true);
        readResearchJson<JobPayload>(`/api/jobs?cursor=${encodeURIComponent(jobMarket.nextCursor)}`, '更多招聘来源暂时无法访问，请稍后重试')
            .then((data: JobPayload) => setJobMarket((current) => {
            if (!current)
                return data;
            const merged = [
                ...current.jobs,
                ...data.jobs.filter((job) => !current.jobs.some((item) => item.id === job.id)),
            ];
            return {
                ...data,
                jobs: merged,
                verifiedCount: current.verifiedCount + data.verifiedCount,
            };
        }))
            .catch(() => setToast("更多招聘来源暂时无法访问，请稍后重试"))
            .finally(() => setJobsLoadingMore(false));
    }
    async function refreshJobs() {
        if (jobsLoading)
            return;
        setJobsLoading(true);
        setJobsError('');
        try {
            const data = await readResearchJson<JobPayload>(`/api/jobs?refresh=${Date.now()}`, '岗位刷新失败，请检查连接后重试');
            setJobMarket(data);
            setToast(data.availability?.state === 'offline' || data.availability?.state === 'unavailable' ? data.availability.message : `已刷新岗位信息，共发现 ${data.totalKnown || data.jobs.length} 个岗位`);
        }
        catch {
            setJobsError('岗位刷新失败，请检查连接后重试');
            setToast("岗位刷新失败，请检查网络后重试");
        }
        finally {
            setJobsLoading(false);
        }
    }
    async function deleteApplication(application: JobApplication) {
        const confirmed = window.confirm(`将「${application.company} · ${application.role}」移入回收站？可在“数据与恢复”中恢复。`);
        if (!confirmed)
            return;
        if (mutationLocks.current.has('delete-application'))
            return;
        mutationLocks.current.add('delete-application');
        try {
            await workspaceRequest(`/api/workspace?type=application&id=${encodeURIComponent(application.id)}`, { method: 'DELETE' });
            setApplications(items => items.filter(item => item.id !== application.id));
            setApplicationModal(false);
            setEditingApplication(null);
            setToast('投递记录已删除');
        }
        catch {
            setToast('删除失败，投递记录已保留');
        }
        finally {
            mutationLocks.current.delete('delete-application');
        }
    }
    return { resumeSkills, rankedJobs, addApplication, handleResumeFile, saveResume, handleTrackOpening, loadMoreJobs, refreshJobs, deleteApplication };
}
export type CareerWorkspaceResult = ReturnType<typeof useCareerWorkspace>;
