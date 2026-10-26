"use client";
import { CareerWorkspace } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { applicationFormDraft } from "../domain/resumeMatching";
type Props = {
    controller: Pick<WorkspaceController, "view" | "jobsError" | "jobsLoading" | "refreshJobs" | "rankedJobs" | "jobMarket" | "applications" | "resume" | "resumeSkills" | "jobsLoadingMore" | "loadMoreJobs" | "handleTrackOpening" | "setResumeDraft" | "setResumeFileName" | "setResumeModal" | "setEditingApplication" | "setApplicationDraft" | "setApplicationModal" | "deleteApplication">;
};
export function CareerView({ controller }: Props) {
    const { view, jobsError, jobsLoading, refreshJobs, rankedJobs, jobMarket, applications, resume, resumeSkills, jobsLoadingMore, loadMoreJobs, handleTrackOpening, setResumeDraft, setResumeFileName, setResumeModal, setEditingApplication, setApplicationDraft, setApplicationModal, deleteApplication } = controller;
    return <>{view === "简历投递" && (<>
            {jobsError && <div className="workspace-data-status" role="alert"><span>{jobsError}</span><button disabled={jobsLoading} onClick={() => void refreshJobs()}>重试加载岗位</button></div>}
            <CareerWorkspace jobs={rankedJobs} market={jobMarket} applications={applications} resume={resume} resumeSkills={resumeSkills} jobsLoading={jobsLoading} jobsLoadingMore={jobsLoadingMore} onRefreshJobs={refreshJobs} onLoadMoreJobs={loadMoreJobs} onTrackJob={handleTrackOpening} onOpenResume={() => {
                setResumeDraft(resume?.content || "");
                setResumeFileName(resume?.fileName || "");
                setResumeModal(true);
            }} onAddApplication={() => {
                setEditingApplication(null);
                setApplicationDraft(applicationFormDraft(null));
                setApplicationModal(true);
            }} onEditApplication={(application) => {
                setEditingApplication(application);
                setApplicationDraft(applicationFormDraft(application));
                setApplicationModal(true);
            }} onDeleteApplication={deleteApplication}/>
            </>)}</>;
}
