"use client";
import { useState } from "react";
import type { ApplicationFormDraft, JobApplication, JobPayload, ResumeProfile } from "../../../contracts/workspace";
import { initialApplications } from "../../workspace/domain/initialState";
import { applicationFormDraft } from "../domain/resumeMatching";
export function useCareerState() {
    const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
    const [applicationModal, setApplicationModal] = useState(false);
    const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
    const [applicationDraft, setApplicationDraft] = useState<ApplicationFormDraft>(() => applicationFormDraft(null));
    const [applicationSaving, setApplicationSaving] = useState(false);
    const [jobMarket, setJobMarket] = useState<JobPayload | null>(null);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [jobsLoadingMore, setJobsLoadingMore] = useState(false);
    const [jobsError, setJobsError] = useState('');
    const [resume, setResume] = useState<ResumeProfile | null>(null);
    const [resumeModal, setResumeModal] = useState(false);
    const [resumeDraft, setResumeDraft] = useState("");
    const [resumeFileName, setResumeFileName] = useState("");
    const [resumeParsing, setResumeParsing] = useState(false);
    return { applications, setApplications, applicationModal, setApplicationModal, editingApplication, setEditingApplication, applicationDraft, setApplicationDraft, applicationSaving, setApplicationSaving, jobMarket, setJobMarket, jobsLoading, setJobsLoading, jobsLoadingMore, setJobsLoadingMore, jobsError, setJobsError, resume, setResume, resumeModal, setResumeModal, resumeDraft, setResumeDraft, resumeFileName, setResumeFileName, resumeParsing, setResumeParsing };
}
