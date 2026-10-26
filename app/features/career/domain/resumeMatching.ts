import type { ApplicationFormDraft, JobApplication, JobOpening, RankedJob, ResumeProfile } from "../../../contracts/workspace";
import { shanghaiDateKey } from "../../tasks/domain/dates";
export function applicationDateInputValue(value?: string) {
    const date = value?.trim() || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(date))
        return date;
    if (date === "今天")
        return shanghaiDateKey();
    const chineseDate = date.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?/);
    if (!chineseDate)
        return "";
    const year = chineseDate[1] || shanghaiDateKey().slice(0, 4);
    return `${year}-${chineseDate[2].padStart(2, "0")}-${chineseDate[3].padStart(2, "0")}`;
}
export function applicationFormDraft(application: JobApplication | null): ApplicationFormDraft {
    return {
        company: application?.company || "",
        role: application?.role || "",
        status: application?.status || "已投递",
        channel: application?.channel || "",
        appliedAt: applicationDateInputValue(application?.appliedAt) || shanghaiDateKey(),
        nextAction: application?.nextAction || "",
        notes: application?.notes || "",
    };
}
export const resumeSkillDictionary = [
    "CAN",
    "C/C++",
    "Python",
    "MATLAB",
    "Simulink",
    "ROS",
    "PLC",
    "STM32",
    "AUTOSAR",
    "SolidWorks",
    "CATIA",
    "控制算法",
    "电机",
    "电池",
    "嵌入式",
    "机器人",
    "汽车",
    "机械设计",
    "电气",
    "自动化",
    "制造",
    "研发",
    "测试",
    "质量",
    "工艺",
    "产品",
    "项目管理",
];
export function includesSkill(text: string, skill: string) {
    const normalized = text.toLowerCase();
    if (skill === "C/C++")
        return (/(^|[^a-z])c(\+\+)?([^a-z]|$)/i.test(text) || normalized.includes("cpp"));
    return normalized.includes(skill.toLowerCase());
}
export function rankJobByResume(job: JobOpening, resume: ResumeProfile | null): RankedJob {
    if (!resume?.content.trim())
        return {
            ...job,
            resumeScore: job.matchScore,
            matchedSkills: [],
            missingSkills: [],
        };
    const resumeText = resume.content;
    const jobText = `${job.role} ${job.industry} ${job.function} ${job.tags.join(" ")} ${job.summary}`;
    const desiredSkills = resumeSkillDictionary.filter((skill) => includesSkill(jobText, skill));
    const matchedSkills = desiredSkills.filter((skill) => includesSkill(resumeText, skill));
    const missingSkills = desiredSkills
        .filter((skill) => !includesSkill(resumeText, skill))
        .slice(0, 3);
    const industryHit = includesSkill(resumeText, job.industry) ? 12 : 0;
    const functionHit = includesSkill(resumeText, job.function) ? 14 : 0;
    const roleTokens = job.role
        .split(/[\s·、/（）()\-]/)
        .filter((token) => token.length >= 2);
    const roleHit = roleTokens.some((token) => resumeText.includes(token))
        ? 10
        : 0;
    const skillScore = Math.min(38, matchedSkills.length * 8);
    const coverage = desiredSkills.length
        ? Math.round((matchedSkills.length / desiredSkills.length) * 16)
        : 6;
    const score = Math.max(35, Math.min(99, Math.round(job.matchScore * 0.25 +
        22 +
        industryHit +
        functionHit +
        roleHit +
        skillScore +
        coverage)));
    return { ...job, resumeScore: score, matchedSkills, missingSkills };
}
