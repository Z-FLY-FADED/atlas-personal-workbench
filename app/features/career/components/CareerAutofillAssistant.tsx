"use client";
import { ChangeEvent, useMemo, useState } from "react";
type CareerResume = {
    fileName: string;
    content: string;
    updatedAt: string;
};
export type AutofillProfile = {
    recommendationType: string;
    referralCode: string;
    recruitmentSource: string;
    acceptAdjustment: string;
    acceptGlobalAssignment: string;
    name: string;
    phone: string;
    email: string;
    gender: string;
    birthDate: string;
    idNumber: string;
    currentCity: string;
    hometown: string;
    targetCity: string;
    politicalStatus: string;
    education: string;
    school: string;
    major: string;
    educationStartDate: string;
    graduationDate: string;
    educationType: string;
    gradeRank: string;
    workYears: string;
    companyName: string;
    jobTitle: string;
    workStartDate: string;
    workEndDate: string;
    workDescription: string;
    projectName: string;
    projectRole: string;
    projectStartDate: string;
    projectEndDate: string;
    projectUrl: string;
    projectDescription: string;
    awardName: string;
    awardDate: string;
    awardDescription: string;
    entrepreneurshipName: string;
    entrepreneurshipRole: string;
    entrepreneurshipStartDate: string;
    entrepreneurshipEndDate: string;
    entrepreneurshipDescription: string;
    workName: string;
    workUrl: string;
    workPortfolioDescription: string;
    skills: string;
    selfIntroduction: string;
};
const emptyProfile: AutofillProfile = {
    recommendationType: "",
    referralCode: "",
    recruitmentSource: "",
    acceptAdjustment: "",
    acceptGlobalAssignment: "",
    name: "",
    phone: "",
    email: "",
    gender: "",
    birthDate: "",
    idNumber: "",
    currentCity: "",
    hometown: "",
    targetCity: "",
    politicalStatus: "",
    education: "",
    school: "",
    major: "",
    educationStartDate: "",
    graduationDate: "",
    educationType: "",
    gradeRank: "",
    workYears: "",
    companyName: "",
    jobTitle: "",
    workStartDate: "",
    workEndDate: "",
    workDescription: "",
    projectName: "",
    projectRole: "",
    projectStartDate: "",
    projectEndDate: "",
    projectUrl: "",
    projectDescription: "",
    awardName: "",
    awardDate: "",
    awardDescription: "",
    entrepreneurshipName: "",
    entrepreneurshipRole: "",
    entrepreneurshipStartDate: "",
    entrepreneurshipEndDate: "",
    entrepreneurshipDescription: "",
    workName: "",
    workUrl: "",
    workPortfolioDescription: "",
    skills: "",
    selfIntroduction: "",
};
const profileFields: Array<{
    key: keyof AutofillProfile;
    group: string;
    label: string;
    placeholder: string;
    sensitive?: boolean;
    multiline?: boolean;
}> = [
    { key: "recommendationType", group: "投递偏好", label: "推荐方式", placeholder: "无 / 内推 / 大使推荐" },
    { key: "referralCode", group: "投递偏好", label: "内推码 / 推荐码", placeholder: "没有可留空" },
    { key: "targetCity", group: "投递偏好", label: "意向城市", placeholder: "例如：上海、苏州" },
    { key: "recruitmentSource", group: "投递偏好", label: "招聘信息来源", placeholder: "例如：招聘公众号" },
    { key: "acceptAdjustment", group: "投递偏好", label: "是否服从调配", placeholder: "是 / 否" },
    { key: "acceptGlobalAssignment", group: "投递偏好", label: "是否接受全球派遣", placeholder: "接受 / 不接受" },
    { key: "name", group: "基本信息", label: "姓名", placeholder: "例如：张三" },
    { key: "phone", group: "基本信息", label: "手机号", placeholder: "11 位手机号" },
    { key: "email", group: "基本信息", label: "邮箱", placeholder: "name@example.com" },
    { key: "gender", group: "基本信息", label: "性别", placeholder: "男 / 女" },
    { key: "birthDate", group: "基本信息", label: "出生日期", placeholder: "YYYY-MM-DD" },
    {
        key: "idNumber",
        group: "基本信息",
        label: "身份证号",
        placeholder: "可留空，仅在确有需要时填写",
        sensitive: true,
    },
    { key: "currentCity", group: "基本信息", label: "现居城市", placeholder: "例如：上海" },
    { key: "hometown", group: "基本信息", label: "籍贯 / 生源地", placeholder: "例如：江苏苏州" },
    { key: "politicalStatus", group: "基本信息", label: "政治面貌", placeholder: "例如：中共党员" },
    { key: "school", group: "教育经历", label: "学校名称", placeholder: "学校全称" },
    { key: "education", group: "教育经历", label: "学历", placeholder: "例如：硕士" },
    { key: "major", group: "教育经历", label: "专业", placeholder: "专业全称" },
    { key: "educationStartDate", group: "教育经历", label: "入学时间", placeholder: "YYYY-MM" },
    { key: "graduationDate", group: "教育经历", label: "毕业时间", placeholder: "YYYY-MM" },
    { key: "educationType", group: "教育经历", label: "学历类型", placeholder: "例如：统招全日制" },
    { key: "gradeRank", group: "教育经历", label: "成绩排名", placeholder: "例如：前 5%" },
    { key: "companyName", group: "实习 / 工作经历", label: "公司名称", placeholder: "公司全称" },
    { key: "jobTitle", group: "实习 / 工作经历", label: "职位名称", placeholder: "例如：结构工程实习生" },
    { key: "workStartDate", group: "实习 / 工作经历", label: "开始时间", placeholder: "YYYY-MM" },
    { key: "workEndDate", group: "实习 / 工作经历", label: "结束时间", placeholder: "YYYY-MM / 至今" },
    { key: "workDescription", group: "实习 / 工作经历", label: "经历描述", placeholder: "职责、行动与量化结果", multiline: true },
    { key: "workYears", group: "实习 / 工作经历", label: "工作年限", placeholder: "应届生可填 0" },
    { key: "projectName", group: "项目经历", label: "项目名称", placeholder: "项目全称" },
    { key: "projectRole", group: "项目经历", label: "项目角色", placeholder: "例如：项目负责人" },
    { key: "projectStartDate", group: "项目经历", label: "开始时间", placeholder: "YYYY-MM" },
    { key: "projectEndDate", group: "项目经历", label: "结束时间", placeholder: "YYYY-MM" },
    { key: "projectUrl", group: "项目经历", label: "项目链接", placeholder: "https://…" },
    { key: "projectDescription", group: "项目经历", label: "项目描述", placeholder: "任务、技术、行动与成果", multiline: true },
    { key: "awardName", group: "获奖", label: "获奖名称", placeholder: "奖项全称" },
    { key: "awardDate", group: "获奖", label: "获奖时间", placeholder: "YYYY / YYYY-MM" },
    { key: "awardDescription", group: "获奖", label: "获奖描述", placeholder: "级别、名次与佐证说明", multiline: true },
    { key: "entrepreneurshipName", group: "创业类经历", label: "项目 / 企业名称", placeholder: "没有可留空" },
    { key: "entrepreneurshipRole", group: "创业类经历", label: "担任角色", placeholder: "例如：联合创始人" },
    { key: "entrepreneurshipStartDate", group: "创业类经历", label: "开始时间", placeholder: "YYYY-MM" },
    { key: "entrepreneurshipEndDate", group: "创业类经历", label: "结束时间", placeholder: "YYYY-MM / 至今" },
    { key: "entrepreneurshipDescription", group: "创业类经历", label: "经历描述", placeholder: "业务、职责与成果", multiline: true },
    { key: "workName", group: "作品 / 其他", label: "作品名称", placeholder: "作品、论文、专利或作品集名称" },
    { key: "workUrl", group: "作品 / 其他", label: "作品链接", placeholder: "https://…" },
    { key: "workPortfolioDescription", group: "作品 / 其他", label: "作品描述", placeholder: "内容、贡献与成果", multiline: true },
    { key: "skills", group: "作品 / 其他", label: "技能 / 证书", placeholder: "技能、语言、证书等", multiline: true },
    { key: "selfIntroduction", group: "作品 / 其他", label: "自我介绍", placeholder: "与岗位相关的优势概述", multiline: true },
];
const profileGroups = Array.from(new Set(profileFields.map((field) => field.group)));
function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function labeledValue(text: string, labels: string[], maxLength = 48) {
    const alternatives = labels.map(escapeRegExp).join("|");
    const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${alternatives})\\s*(?:[:：]|[ \\t]{1,4})\\s*([^\\n]{1,${maxLength}})`, "i"));
    return match?.[1]?.trim().replace(/[；;|].*$/, "") || "";
}
function normalizeDate(value: string, includeDay = true) {
    const match = value.match(/(19|20)\d{2}[年./-]\d{1,2}(?:[月./-]\d{1,2}日?)?/);
    if (!match)
        return value.trim();
    const parts = match[0].replace(/[年月./]/g, "-").replace(/日/g, "").split("-");
    const normalized = parts.map((part, index) => (index ? part.padStart(2, "0") : part));
    return includeDay ? normalized.join("-") : normalized.slice(0, 2).join("-");
}
export function parseCareerAutofillProfile(text: string): AutofillProfile {
    const content = text.replace(/\r/g, "");
    const phone = content.match(/(?<!\d)1[3-9]\d{9}(?!\d)/)?.[0] || "";
    const email = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const idNumber = labeledValue(content, ["身份证号", "身份证号码", "证件号码"], 24).match(/\d{17}[\dXx]/)?.[0] || "";
    const school = labeledValue(content, ["毕业院校", "学校名称", "院校", "学校"], 60) ||
        content.match(/[\u4e00-\u9fa5·]{2,28}(?:大学|学院)/)?.[0] ||
        "";
    const education = labeledValue(content, ["最高学历", "学历"], 20) ||
        content.match(/博士研究生|硕士研究生|本科|大专|专科|博士|硕士/)?.[0] ||
        "";
    const birthDate = labeledValue(content, ["出生日期", "出生年月", "生日"], 24);
    const graduationDate = labeledValue(content, ["毕业时间", "毕业日期", "预计毕业时间"], 24);
    const educationStartDate = labeledValue(content, ["入学时间", "入学日期", "教育开始时间"], 24);
    const workStartDate = labeledValue(content, ["实习开始时间", "工作开始时间"], 24);
    const workEndDate = labeledValue(content, ["实习结束时间", "工作结束时间"], 24);
    const projectStartDate = labeledValue(content, ["项目开始时间"], 24);
    const projectEndDate = labeledValue(content, ["项目结束时间"], 24);
    const entrepreneurshipStartDate = labeledValue(content, ["创业开始时间"], 24);
    const entrepreneurshipEndDate = labeledValue(content, ["创业结束时间"], 24);
    return {
        recommendationType: labeledValue(content, ["推荐方式", "推荐类型"], 20),
        referralCode: labeledValue(content, ["内推码", "推荐码", "推荐人编号"], 40),
        recruitmentSource: labeledValue(content, ["招聘信息来源", "信息来源", "获知渠道", "招聘渠道"], 60),
        acceptAdjustment: labeledValue(content, ["是否服从调配", "服从调配", "志愿调配"], 20),
        acceptGlobalAssignment: labeledValue(content, ["是否接受全球派遣", "全球派遣", "海外派遣"], 20),
        name: labeledValue(content, ["姓名", "真实姓名"], 20),
        phone,
        email,
        gender: labeledValue(content, ["性别"], 8),
        birthDate: birthDate ? normalizeDate(birthDate) : "",
        idNumber,
        currentCity: labeledValue(content, ["现居城市", "现居地", "当前城市", "所在地"], 30),
        hometown: labeledValue(content, ["籍贯", "生源地", "户籍所在地"], 40),
        targetCity: labeledValue(content, ["期望城市", "意向城市", "工作地点"], 40),
        politicalStatus: labeledValue(content, ["政治面貌"], 20),
        education,
        school,
        major: labeledValue(content, ["专业名称", "所学专业", "专业"], 50),
        educationStartDate: educationStartDate ? normalizeDate(educationStartDate, false) : "",
        graduationDate: graduationDate ? normalizeDate(graduationDate, false) : "",
        educationType: labeledValue(content, ["学历类型", "培养方式", "学习形式"], 30),
        gradeRank: labeledValue(content, ["成绩排名", "专业排名", "综合排名", "排名"], 30),
        workYears: labeledValue(content, ["工作年限", "工作经验"], 20),
        companyName: labeledValue(content, ["公司名称", "实习单位", "工作单位"], 80),
        jobTitle: labeledValue(content, ["职位名称", "实习职位", "工作职位", "岗位名称"], 60),
        workStartDate: workStartDate ? normalizeDate(workStartDate, false) : "",
        workEndDate: workEndDate ? normalizeDate(workEndDate, false) : "",
        workDescription: labeledValue(content, ["实习描述", "工作描述", "工作内容", "实习内容"], 2000),
        projectName: labeledValue(content, ["项目名称"], 100),
        projectRole: labeledValue(content, ["项目角色", "项目职责", "担任角色"], 60),
        projectStartDate: projectStartDate ? normalizeDate(projectStartDate, false) : "",
        projectEndDate: projectEndDate ? normalizeDate(projectEndDate, false) : "",
        projectUrl: labeledValue(content, ["项目链接", "项目地址"], 300),
        projectDescription: labeledValue(content, ["项目描述", "项目介绍", "项目内容"], 2000),
        awardName: labeledValue(content, ["获奖名称", "奖项名称", "荣誉名称"], 100),
        awardDate: labeledValue(content, ["获奖时间", "获奖日期"], 24),
        awardDescription: labeledValue(content, ["获奖描述", "奖项描述", "荣誉描述"], 1000),
        entrepreneurshipName: labeledValue(content, ["创业项目名称", "创业企业名称"], 100),
        entrepreneurshipRole: labeledValue(content, ["创业角色", "创业项目角色"], 60),
        entrepreneurshipStartDate: entrepreneurshipStartDate ? normalizeDate(entrepreneurshipStartDate, false) : "",
        entrepreneurshipEndDate: entrepreneurshipEndDate ? normalizeDate(entrepreneurshipEndDate, false) : "",
        entrepreneurshipDescription: labeledValue(content, ["创业经历描述", "创业项目描述"], 1600),
        workName: labeledValue(content, ["作品名称", "作品集名称"], 100),
        workUrl: labeledValue(content, ["作品链接", "作品集链接", "个人主页"], 300),
        workPortfolioDescription: labeledValue(content, ["作品描述", "作品集描述"], 1600),
        skills: labeledValue(content, ["技能", "专业技能", "技能证书", "证书"], 1200),
        selfIntroduction: labeledValue(content, ["自我介绍", "自我评价", "个人优势", "个人总结"], 1600),
    };
}
function withResumeFileName(profile: AutofillProfile, fileName = "") {
    if (profile.name)
        return profile;
    const stem = fileName.replace(/\.[^.]+$/, "");
    const candidate = stem.split(/[-_—–\s]/)[0]?.trim() || "";
    return /^[\u4e00-\u9fa5·]{2,5}$/.test(candidate)
        ? { ...profile, name: candidate }
        : profile;
}
async function extractDocumentText(file: File, maxPages = 60) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    let content = "";
    if (["txt", "md", "markdown", "csv", "json"].includes(extension)) {
        content = await file.text();
    }
    else if (extension === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({
            arrayBuffer: await file.arrayBuffer(),
        });
        content = result.value;
    }
    else if (extension === "pdf") {
        const [pdfjs, worker] = await Promise.all([
            import("pdfjs-dist"),
            import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const document = await pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
        }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, maxPages); pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const textContent = await page.getTextContent();
            pages.push(textContent.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" "));
        }
        content = pages.join("\n");
    }
    else {
        throw new Error("支持 PDF、DOCX、TXT、Markdown、CSV 和 JSON 文档");
    }
    return content
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 120000);
}
export function buildCareerAutofillUserscript(profile: AutofillProfile) {
    const payload = JSON.stringify(profile, null, 2).replace(/</g, "\\u003c");
    return `// ==UserScript==
// @name         ATLAS 企业网申自动填写助手
// @namespace    atlas-local-career
// @version      2.0.0
// @description  根据本地核对后的个人信息与经历补充网申空字段；不会上传附件或提交表单
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const PROFILE = ${payload};
  const RULES = [
    { key: "recommendationType", aliases: ["推荐方式", "推荐类型", "referraltype", "recommendationtype"], input: "radio" },
    { key: "referralCode", aliases: ["内推码", "推荐码", "推荐人编号", "referralcode", "recommendationcode"] },
    { key: "recruitmentSource", aliases: ["招聘信息来源", "信息来源", "获知渠道", "招聘渠道", "sourcechannel"] },
    { key: "acceptAdjustment", aliases: ["是否服从调配", "服从调配", "志愿调配", "acceptadjustment"] },
    { key: "acceptGlobalAssignment", aliases: ["是否接受全球范围的工作派遣", "是否接受全球派遣", "全球派遣", "海外派遣", "globalassignment"] },
    { key: "name", aliases: ["姓名", "真实姓名", "name", "fullname", "full-name"], exclude: ["紧急", "推荐人", "证明人", "联系人"] },
    { key: "phone", aliases: ["手机号", "手机号码", "联系电话", "mobile", "phone", "tel"], exclude: ["紧急", "推荐人", "证明人"] },
    { key: "email", aliases: ["邮箱", "电子邮箱", "电子邮件", "email", "e-mail"], exclude: ["紧急", "推荐人", "证明人"] },
    { key: "gender", aliases: ["性别", "gender", "sex"] },
    { key: "birthDate", aliases: ["出生日期", "出生年月", "生日", "birthdate", "birthday", "dateofbirth"] },
    { key: "idNumber", aliases: ["身份证号", "身份证号码", "证件号码", "idnumber", "identitynumber"] },
    { key: "currentCity", aliases: ["现居城市", "现居地", "当前城市", "所在地", "currentcity", "residence"] },
    { key: "hometown", aliases: ["籍贯", "生源地", "户籍所在地", "hometown", "nativeplace"] },
    { key: "targetCity", aliases: ["期望城市", "意向城市", "期望工作地点", "preferredcity", "targetcity"] },
    { key: "politicalStatus", aliases: ["政治面貌", "politicalstatus"] },
    { key: "education", aliases: ["最高学历", "学历", "education", "degree"], section: ["教育经历", "教育背景", "education"] },
    { key: "school", aliases: ["毕业院校", "院校", "学校名称", "学校", "school", "university", "college"], section: ["教育经历", "教育背景", "education"] },
    { key: "major", aliases: ["专业名称", "所学专业", "专业", "major", "specialty"], section: ["教育经历", "教育背景", "education"] },
    { key: "educationStartDate", aliases: ["入学时间", "教育开始时间", "开始时间", "起止时间", "startdate"], section: ["教育经历", "教育背景", "education"], rangeIndex: 0 },
    { key: "graduationDate", aliases: ["毕业时间", "毕业日期", "预计毕业时间", "结束时间", "起止时间", "graduationdate", "graduation", "enddate"], section: ["教育经历", "教育背景", "education"], rangeIndex: 1 },
    { key: "educationType", aliases: ["学历类型", "培养方式", "学习形式", "educationtype"], section: ["教育经历", "教育背景", "education"] },
    { key: "gradeRank", aliases: ["成绩排名", "专业排名", "综合排名", "排名", "graderank"], section: ["教育经历", "教育背景", "education"] },
    { key: "workYears", aliases: ["工作年限", "工作经验", "yearsofexperience", "workexperience"] },
    { key: "companyName", aliases: ["公司名称", "实习单位", "工作单位", "company", "employer"], section: ["实习经历", "工作经历", "职业经历", "experience"] },
    { key: "jobTitle", aliases: ["职位名称", "实习职位", "工作职位", "岗位名称", "jobtitle", "position"], section: ["实习经历", "工作经历", "职业经历", "experience"] },
    { key: "workStartDate", aliases: ["开始时间", "入职时间", "起止时间", "startdate"], section: ["实习经历", "工作经历", "职业经历", "experience"], rangeIndex: 0 },
    { key: "workEndDate", aliases: ["结束时间", "离职时间", "起止时间", "enddate"], section: ["实习经历", "工作经历", "职业经历", "experience"], rangeIndex: 1 },
    { key: "workDescription", aliases: ["描述", "经历描述", "工作内容", "实习内容", "description"], section: ["实习经历", "工作经历", "职业经历", "experience"] },
    { key: "projectName", aliases: ["项目名称", "projectname"], section: ["项目经历", "项目经验", "project"] },
    { key: "projectRole", aliases: ["项目角色", "项目职责", "担任角色", "projectrole"] , section: ["项目经历", "项目经验", "project"] },
    { key: "projectStartDate", aliases: ["开始时间", "起止时间", "startdate"], section: ["项目经历", "项目经验", "project"], rangeIndex: 0 },
    { key: "projectEndDate", aliases: ["结束时间", "起止时间", "enddate"], section: ["项目经历", "项目经验", "project"], rangeIndex: 1 },
    { key: "projectUrl", aliases: ["项目链接", "项目地址", "projecturl", "projectlink"], section: ["项目经历", "项目经验", "project"] },
    { key: "projectDescription", aliases: ["描述", "项目描述", "项目介绍", "description"], section: ["项目经历", "项目经验", "project"] },
    { key: "awardName", aliases: ["获奖名称", "奖项名称", "荣誉名称", "awardname"], section: ["获奖", "奖项", "荣誉", "award"] },
    { key: "awardDate", aliases: ["获奖时间", "获奖日期", "awarddate"], section: ["获奖", "奖项", "荣誉", "award"] },
    { key: "awardDescription", aliases: ["描述", "获奖描述", "奖项描述", "description"], section: ["获奖", "奖项", "荣誉", "award"] },
    { key: "entrepreneurshipName", aliases: ["项目名称", "企业名称", "创业项目名称"], section: ["创业类经历", "创业经历", "entrepreneurship"] },
    { key: "entrepreneurshipRole", aliases: ["项目角色", "担任角色", "创业角色"], section: ["创业类经历", "创业经历", "entrepreneurship"] },
    { key: "entrepreneurshipStartDate", aliases: ["开始时间", "起止时间", "startdate"], section: ["创业类经历", "创业经历", "entrepreneurship"], rangeIndex: 0 },
    { key: "entrepreneurshipEndDate", aliases: ["结束时间", "起止时间", "enddate"], section: ["创业类经历", "创业经历", "entrepreneurship"], rangeIndex: 1 },
    { key: "entrepreneurshipDescription", aliases: ["描述", "经历描述", "项目描述", "description"], section: ["创业类经历", "创业经历", "entrepreneurship"] },
    { key: "workName", aliases: ["作品名称", "成果名称", "作品集名称"], section: ["作品", "作品集", "成果", "portfolio"] },
    { key: "workUrl", aliases: ["作品链接", "作品地址", "作品集链接", "portfolio"], section: ["作品", "作品集", "成果", "portfolio"] },
    { key: "workPortfolioDescription", aliases: ["描述", "作品描述", "成果描述", "description"], section: ["作品", "作品集", "成果", "portfolio"] },
    { key: "skills", aliases: ["技能", "专业技能", "技能证书", "证书", "skills"] },
    { key: "selfIntroduction", aliases: ["自我介绍", "自我评价", "个人优势", "个人总结", "selfintroduction", "summary"] }
  ];

  const normalize = (value) => String(value || "").toLowerCase().replace(/[\\s_:/：*（）()·.-]/g, "");

  function formItem(element) {
    return element.closest(".ud-formily-item,.ant-form-item,.el-form-item,.form-item,.form-group,.field,.field-item");
  }

  function fieldContext(element) {
    const labels = element.labels ? Array.from(element.labels).map((label) => label.innerText) : [];
    const group = formItem(element);
    const groupLabel = group ? group.querySelector("label,.ud-formily-item-label,.ant-form-item-label,.el-form-item__label")?.textContent : "";
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.getAttribute("data-form-field-id"),
      element.getAttribute("data-form-field-name"),
      element.getAttribute("data-form-field-i18n-name"),
      group?.getAttribute("data-form-field-id"),
      group?.getAttribute("data-form-field-name"),
      group?.getAttribute("data-form-field-i18n-name"),
      element.id,
      ...labels,
      groupLabel,
      element.closest("label")?.textContent,
      element.previousElementSibling?.textContent
    ].filter(Boolean).join(" ");
  }

  function sectionContext(element) {
    const feishuSection = element.closest(".applyFormModuleWrapper-windows,[class*='applyFormModuleWrapper-windows']");
    const feishuTitle = feishuSection?.querySelector(".applyFormModuleWrapper-left,[class*='applyFormModuleWrapper-left']")?.textContent;
    const genericSection = element.closest("fieldset,section,[role='group'],[class*='section'],[class*='module']");
    const genericTitle = genericSection?.querySelector("legend,h1,h2,h3,h4,[class*='title'],[class*='header']")?.textContent;
    return [feishuTitle, genericTitle].filter(Boolean).join(" ");
  }

  function rangePosition(element) {
    const group = formItem(element);
    if (!group) return -1;
    const controls = Array.from(group.querySelectorAll("input:not([type='hidden']),textarea"));
    return controls.indexOf(element);
  }

  function matchesRule(element, rule) {
    const context = normalize(fieldContext(element));
    const section = normalize(sectionContext(element));
    if (!context) return false;
    const aliasesMatch = rule.aliases.some((alias) => context.includes(normalize(alias)));
    const sectionMatch = !rule.section || rule.section.some((alias) => section.includes(normalize(alias)));
    const excluded = (rule.exclude || []).some((word) => context.includes(normalize(word)));
    const positionMatch = rule.rangeIndex === undefined || rangePosition(element) === rule.rangeIndex;
    return aliasesMatch && sectionMatch && !excluded && positionMatch;
  }

  function markFilled(element) {
    element.dataset.atlasAutofilled = "true";
    element.style.boxShadow = "0 0 0 2px rgba(75,126,187,.25)";
  }

  function dispatchValueEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function setTextValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    dispatchValueEvents(element);
    markFilled(element);
    return true;
  }

  function setNativeSelect(element, value) {
      const target = normalize(value);
      const option = Array.from(element.options).find((item) => {
        const optionText = normalize(item.textContent);
        const optionValue = normalize(item.value);
        return optionText === target || optionValue === target || optionText.includes(target) || target.includes(optionText);
      });
      if (!option) return false;
      element.value = option.value;
    dispatchValueEvents(element);
    markFilled(element);
    return true;
  }

  function isCustomSelect(element) {
    return element.getAttribute("role") === "combobox" || Boolean(element.closest("[class*='select__selector'],[class*='select-selector'],[class*='selectSelector']"));
  }

  function customSelectIsEmpty(element) {
    const selector = element.closest("[class*='select__selector'],[class*='select-selector'],[class*='selectSelector']");
    if (!selector) return !String(element.value || "").trim();
    const text = String(selector.textContent || "").replace(/请选择|please select|select/gi, "").trim();
    return !text && !String(element.value || "").trim();
  }

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  async function setCustomSelect(element, value) {
    const trigger = element.closest("[class*='select__selector'],[class*='select-selector'],[class*='selectSelector']") || element;
    trigger.click();
    await wait(120);
    const target = normalize(value);
    const options = Array.from(document.querySelectorAll("[role='option'],.ud__select__option,[class*='select-option'],[class*='selectOption'],[class*='dropdown-item']"));
    const option = options.find((item) => {
      const text = normalize(item.textContent);
      const visible = Boolean(item.offsetWidth || item.offsetHeight || item.getClientRects().length);
      return visible && text && (text === target || text.includes(target) || target.includes(text));
    });
    if (!option) {
      document.body.click();
      return false;
    }
    option.click();
    markFilled(trigger);
    return true;
  }

  function radioGroup(radio) {
    let node = radio.parentElement;
    while (node && node !== document.body) {
      if (node.querySelectorAll("input[type='radio']").length > 1) return node;
      node = node.parentElement;
    }
    return radio.parentElement;
  }

  function fillRadioField(rule) {
    const value = PROFILE[rule.key];
    if (!value) return false;
    const target = normalize(value);
    const radios = Array.from(document.querySelectorAll("input[type='radio']"));
    const radio = radios.find((item) => {
      const group = radioGroup(item);
      const optionText = normalize(item.closest("label")?.textContent || item.parentElement?.textContent || item.value);
      const context = normalize([fieldContext(item), group?.textContent].filter(Boolean).join(" "));
      return rule.aliases.some((alias) => context.includes(normalize(alias))) && (optionText === target || optionText.includes(target));
    });
    if (!radio) return false;
    const group = radioGroup(radio);
    if (group?.querySelector("input[type='radio']:checked")) return false;
    radio.click();
    markFilled(radio.closest("label") || radio);
    return true;
  }

  async function fillEmptyFields() {
    const fields = document.querySelectorAll("input:not([type='hidden']):not([type='password']):not([type='file']):not([type='checkbox']):not([type='radio']):not([type='submit']), textarea, select");
    const usedKeys = new Set();
    let filled = 0;
    for (const rule of RULES.filter((item) => item.input === "radio")) {
      if (fillRadioField(rule)) {
        usedKeys.add(rule.key);
        filled += 1;
      }
    }
    for (const element of fields) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
      const customSelect = isCustomSelect(element);
      if (element.disabled || (!customSelect && element.readOnly)) continue;
      if (customSelect ? !customSelectIsEmpty(element) : String(element.value || "").trim()) continue;
      const rule = RULES.find((item) => item.input !== "radio" && !usedKeys.has(item.key) && matchesRule(element, item));
      if (!rule) continue;
      const value = PROFILE[rule.key];
      if (!value) continue;
      let success = false;
      if (element instanceof HTMLSelectElement) success = setNativeSelect(element, value);
      else if (customSelect) success = await setCustomSelect(element, value);
      else success = setTextValue(element, value);
      if (success) {
        usedKeys.add(rule.key);
        filled += 1;
      }
    }
    showToast(filled ? "已填写 " + filled + " 个空字段；附件、隐私确认和提交仍需手动完成" : "未找到可安全匹配的空字段");
  }

  function showToast(message) {
    const oldToast = document.getElementById("atlas-autofill-toast");
    if (oldToast) oldToast.remove();
    const toast = document.createElement("div");
    toast.id = "atlas-autofill-toast";
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed", right: "24px", bottom: "82px", zIndex: "2147483647",
      maxWidth: "340px", padding: "12px 16px", borderRadius: "10px",
      color: "#fff", background: "#243247", boxShadow: "0 12px 34px rgba(0,0,0,.22)",
      font: "13px/1.5 system-ui, sans-serif"
    });
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function mountButton() {
    if (document.getElementById("atlas-autofill-button")) return;
    const button = document.createElement("button");
    button.id = "atlas-autofill-button";
    button.type = "button";
    button.textContent = "ATLAS 自动填写";
    button.title = "只填写识别到的空字段，不会提交表单";
    Object.assign(button.style, {
      position: "fixed", right: "24px", bottom: "24px", zIndex: "2147483647",
      minHeight: "42px", padding: "0 18px", border: "1px solid rgba(255,255,255,.28)",
      borderRadius: "12px", color: "#fff", background: "#4b7ebb",
      boxShadow: "0 12px 30px rgba(43,88,143,.32)", cursor: "pointer",
      font: "600 13px system-ui, sans-serif"
    });
    button.addEventListener("click", fillEmptyFields);
    document.body.appendChild(button);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountButton);
  else mountButton();
})();
`;
}
export function CareerAutofillAssistant({ resume }: {
    resume: CareerResume | null;
}) {
    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState<AutofillProfile>(emptyProfile);
    const [sourceText, setSourceText] = useState("");
    const [sourceFile, setSourceFile] = useState("");
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const script = useMemo(() => buildCareerAutofillUserscript(profile), [profile]);
    const filledCount = Object.values(profile).filter(Boolean).length;
    function openAssistant() {
        setProfile(withResumeFileName(parseCareerAutofillProfile(resume?.content || ""), resume?.fileName));
        setSourceText("");
        setSourceFile("");
        setStatus(resume ? "已从主简历识别基础字段，请核对并补充。" : "请先导入主简历。 ");
        setOpen(true);
    }
    async function handleDocument(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setBusy(true);
        setStatus("正在读取补充信息文档…");
        try {
            const text = await extractDocumentText(file);
            setSourceFile(file.name);
            setSourceText(text);
            setProfile(withResumeFileName(parseCareerAutofillProfile(`${resume?.content || ""}\n${text}`), resume?.fileName));
            setStatus(`已读取 ${file.name}，请逐项核对识别结果。`);
        }
        catch (error) {
            setStatus(error instanceof Error ? error.message : "文档读取失败，请更换文件重试。 ");
        }
        finally {
            setBusy(false);
            event.target.value = "";
        }
    }
    function recognizeAgain() {
        setProfile(withResumeFileName(parseCareerAutofillProfile(`${resume?.content || ""}\n${sourceText}`), resume?.fileName));
        setStatus("已重新识别字段，请继续核对。 ");
    }
    async function copyScript() {
        try {
            await navigator.clipboard.writeText(script);
            setStatus("脚本已复制。请粘贴到本地用户脚本管理器中安装。 ");
        }
        catch {
            setStatus("浏览器未允许复制，请使用“下载脚本”。 ");
        }
    }
    function downloadScript() {
        const blob = new Blob([script], { type: "text/javascript;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "atlas-career-autofill.user.js";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setStatus("脚本已下载。安装后打开企业网申页，点击右下角“ATLAS 自动填写”。 ");
    }
    return (<>
      <section className="career-autofill-card panel">
        <div className="career-autofill-icon">⌁</div>
        <div>
          <small>AUTO FILL</small>
          <h3>企业网申自动填写</h3>
          <p>只填写空字段，提交前请核对。</p>
        </div>
        <button className="primary" disabled={!resume} onClick={openAssistant}>
          {resume ? "生成填写脚本" : "请先导入简历"}
        </button>
      </section>

      {open && (<div className="career-autofill-layer" role="dialog" aria-modal="true" aria-label="企业网申自动填写助手">
          <button className="career-autofill-scrim" aria-label="关闭" onClick={() => setOpen(false)}/>
          <section className="career-autofill-modal">
            <header>
              <div><small>AUTO FILL ASSISTANT</small><h2>核对自动填写信息</h2><p>敏感信息只写入你下载的本地脚本，不会由工作台自动提交到任何网站。</p></div>
              <button aria-label="关闭" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="career-autofill-source">
              <div><span>01</span><div><b>主简历</b><p>{resume?.fileName || "未导入"}</p></div><em>已读取</em></div>
              <label className={busy ? "busy" : ""}><span>02</span><div><b>{busy ? "正在解析…" : "补充信息文档"}</b><p>{sourceFile || "PDF / DOCX / TXT / MD / CSV / JSON"}</p></div><strong>{sourceFile ? "更换" : "选择文件"}</strong><input type="file" accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json" disabled={busy} onChange={handleDocument}/></label>
            </div>

            <div className="career-autofill-fields-head"><div><b>识别字段</b><p>已识别 {filledCount} / {profileFields.length} 项；脚本只会使用非空字段。</p></div><button onClick={recognizeAgain}>重新识别</button></div>
            <div className="career-autofill-field-groups">
              {profileGroups.map((group) => (<section key={group} className="career-autofill-field-group">
                  <h3>{group}</h3>
                  <div className="career-autofill-fields">
                    {profileFields.filter((field) => field.group === group).map((field) => (<label key={field.key} className={field.multiline ? "wide" : undefined}>
                        <span>{field.label}{field.sensitive && <em>敏感</em>}</span>
                        {field.multiline ? (<textarea value={profile[field.key]} placeholder={field.placeholder} onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))}/>) : (<input value={profile[field.key]} placeholder={field.placeholder} autoComplete="off" onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))}/>)}
                      </label>))}
                  </div>
                </section>))}
            </div>

            <details className="career-autofill-raw">
              <summary>查看或粘贴补充信息原文</summary>
              <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="也可以在这里粘贴个人信息，然后点击“重新识别”。"/>
            </details>

            <aside className="career-autofill-warning"><span>!</span><p><b>提交前必须人工复核</b>不同招聘网站的字段命名并不统一；助手只补充空白文本框、下拉框和未选择的推荐方式。简历/获奖附件、隐私同意、验证码及最终提交必须手动完成。</p></aside>
            {status && <p className="career-autofill-status" aria-live="polite">{status}</p>}
            <footer><button onClick={() => setOpen(false)}>取消</button><button onClick={copyScript} disabled={!filledCount}>复制脚本</button><button className="primary" onClick={downloadScript} disabled={!filledCount}>下载 .user.js</button></footer>
          </section>
        </div>)}
    </>);
}
