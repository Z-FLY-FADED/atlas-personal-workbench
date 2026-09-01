"use client";

import { ChangeEvent, useMemo, useState } from "react";

type CareerResume = {
  fileName: string;
  content: string;
  updatedAt: string;
};

type AutofillProfile = {
  name: string;
  phone: string;
  email: string;
  gender: string;
  birthDate: string;
  idNumber: string;
  currentCity: string;
  targetCity: string;
  education: string;
  school: string;
  major: string;
  graduationDate: string;
  workYears: string;
  politicalStatus: string;
};

const emptyProfile: AutofillProfile = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  birthDate: "",
  idNumber: "",
  currentCity: "",
  targetCity: "",
  education: "",
  school: "",
  major: "",
  graduationDate: "",
  workYears: "",
  politicalStatus: "",
};

const profileFields: Array<{
  key: keyof AutofillProfile;
  label: string;
  placeholder: string;
  sensitive?: boolean;
}> = [
  { key: "name", label: "姓名", placeholder: "例如：张三" },
  { key: "phone", label: "手机号", placeholder: "11 位手机号" },
  { key: "email", label: "邮箱", placeholder: "name@example.com" },
  { key: "gender", label: "性别", placeholder: "男 / 女" },
  { key: "birthDate", label: "出生日期", placeholder: "YYYY-MM-DD" },
  {
    key: "idNumber",
    label: "身份证号",
    placeholder: "可留空，仅在确有需要时填写",
    sensitive: true,
  },
  { key: "currentCity", label: "现居城市", placeholder: "例如：上海" },
  { key: "targetCity", label: "期望城市", placeholder: "例如：上海、苏州" },
  { key: "education", label: "最高学历", placeholder: "例如：硕士" },
  { key: "school", label: "毕业院校", placeholder: "学校全称" },
  { key: "major", label: "专业", placeholder: "专业全称" },
  { key: "graduationDate", label: "毕业时间", placeholder: "YYYY-MM" },
  { key: "workYears", label: "工作年限", placeholder: "应届生可填 0" },
  { key: "politicalStatus", label: "政治面貌", placeholder: "例如：中共党员" },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labeledValue(text: string, labels: string[], maxLength = 48) {
  const alternatives = labels.map(escapeRegExp).join("|");
  const match = text.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${alternatives})\\s*(?:[:：]|[ \\t]{1,4})\\s*([^\\n]{1,${maxLength}})`,
      "i",
    ),
  );
  return match?.[1]?.trim().replace(/[；;|].*$/, "") || "";
}

function normalizeDate(value: string, includeDay = true) {
  const match = value.match(/(19|20)\d{2}[年./-]\d{1,2}(?:[月./-]\d{1,2}日?)?/);
  if (!match) return value.trim();
  const parts = match[0].replace(/[年月./]/g, "-").replace(/日/g, "").split("-");
  const normalized = parts.map((part, index) => (index ? part.padStart(2, "0") : part));
  return includeDay ? normalized.join("-") : normalized.slice(0, 2).join("-");
}

function parseProfile(text: string): AutofillProfile {
  const content = text.replace(/\r/g, "");
  const phone = content.match(/(?<!\d)1[3-9]\d{9}(?!\d)/)?.[0] || "";
  const email = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const idNumber =
    labeledValue(content, ["身份证号", "身份证号码", "证件号码"], 24).match(
      /\d{17}[\dXx]/,
    )?.[0] || "";
  const school =
    labeledValue(content, ["毕业院校", "院校", "学校"], 60) ||
    content.match(/[\u4e00-\u9fa5·]{2,28}(?:大学|学院)/)?.[0] ||
    "";
  const education =
    labeledValue(content, ["最高学历", "学历"], 20) ||
    content.match(/博士研究生|硕士研究生|本科|大专|专科|博士|硕士/)?.[0] ||
    "";
  const birthDate = labeledValue(content, ["出生日期", "出生年月", "生日"], 24);
  const graduationDate = labeledValue(
    content,
    ["毕业时间", "毕业日期", "预计毕业时间"],
    24,
  );

  return {
    name: labeledValue(content, ["姓名", "真实姓名"], 20),
    phone,
    email,
    gender: labeledValue(content, ["性别"], 8),
    birthDate: birthDate ? normalizeDate(birthDate) : "",
    idNumber,
    currentCity: labeledValue(content, ["现居城市", "现居地", "当前城市", "所在地"], 30),
    targetCity: labeledValue(content, ["期望城市", "意向城市", "工作地点"], 40),
    education,
    school,
    major: labeledValue(content, ["专业名称", "所学专业", "专业"], 50),
    graduationDate: graduationDate ? normalizeDate(graduationDate, false) : "",
    workYears: labeledValue(content, ["工作年限", "工作经验"], 20),
    politicalStatus: labeledValue(content, ["政治面貌"], 20),
  };
}

function withResumeFileName(profile: AutofillProfile, fileName = "") {
  if (profile.name) return profile;
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
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    content = result.value;
  } else if (extension === "pdf") {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const document = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: string[] = [];
    for (
      let pageNumber = 1;
      pageNumber <= Math.min(document.numPages, maxPages);
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pages.push(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    content = pages.join("\n");
  } else {
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
// @version      1.0.0
// @description  根据本地核对后的个人信息补充网申空字段；不会自动提交表单
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const PROFILE = ${payload};
  const RULES = [
    { key: "name", aliases: ["姓名", "真实姓名", "name", "fullname", "full-name"], exclude: ["紧急", "推荐人", "证明人", "联系人"] },
    { key: "phone", aliases: ["手机号", "手机号码", "联系电话", "mobile", "phone", "tel"], exclude: ["紧急", "推荐人", "证明人"] },
    { key: "email", aliases: ["邮箱", "电子邮箱", "电子邮件", "email", "e-mail"], exclude: ["紧急", "推荐人", "证明人"] },
    { key: "gender", aliases: ["性别", "gender", "sex"] },
    { key: "birthDate", aliases: ["出生日期", "出生年月", "生日", "birthdate", "birthday", "dateofbirth"] },
    { key: "idNumber", aliases: ["身份证号", "身份证号码", "证件号码", "idnumber", "identitynumber"] },
    { key: "currentCity", aliases: ["现居城市", "现居地", "当前城市", "所在地", "currentcity", "residence"] },
    { key: "targetCity", aliases: ["期望城市", "意向城市", "期望工作地点", "preferredcity", "targetcity"] },
    { key: "education", aliases: ["最高学历", "学历", "education", "degree"] },
    { key: "school", aliases: ["毕业院校", "院校", "学校", "school", "university", "college"] },
    { key: "major", aliases: ["专业名称", "所学专业", "专业", "major", "specialty"] },
    { key: "graduationDate", aliases: ["毕业时间", "毕业日期", "预计毕业时间", "graduationdate", "graduation"] },
    { key: "workYears", aliases: ["工作年限", "工作经验", "yearsofexperience", "workexperience"] },
    { key: "politicalStatus", aliases: ["政治面貌", "politicalstatus"] }
  ];

  const normalize = (value) => String(value || "").toLowerCase().replace(/[\\s_:/：*（）()·.-]/g, "");

  function fieldContext(element) {
    const labels = element.labels ? Array.from(element.labels).map((label) => label.innerText) : [];
    const group = element.closest(".ant-form-item,.el-form-item,.form-item,.form-group,.field,.field-item");
    const groupLabel = group ? group.querySelector("label,.ant-form-item-label,.el-form-item__label")?.textContent : "";
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.id,
      ...labels,
      groupLabel,
      element.closest("label")?.textContent,
      element.previousElementSibling?.textContent
    ].filter(Boolean).join(" ");
  }

  function setValue(element, value) {
    if (element instanceof HTMLSelectElement) {
      const target = normalize(value);
      const option = Array.from(element.options).find((item) => {
        const optionText = normalize(item.textContent);
        const optionValue = normalize(item.value);
        return optionText === target || optionValue === target || optionText.includes(target) || target.includes(optionText);
      });
      if (!option) return false;
      element.value = option.value;
    } else {
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(element, value);
      else element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dataset.atlasAutofilled = "true";
    element.style.boxShadow = "0 0 0 2px rgba(75,126,187,.25)";
    return true;
  }

  function fillEmptyFields() {
    const fields = document.querySelectorAll("input:not([type='hidden']):not([type='password']):not([type='file']):not([type='checkbox']):not([type='radio']):not([type='submit']), textarea, select");
    let filled = 0;
    fields.forEach((element) => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return;
      if (element.disabled || element.readOnly || String(element.value || "").trim()) return;
      const context = normalize(fieldContext(element));
      if (!context) return;
      const rule = RULES.find((item) => {
        const aliasesMatch = item.aliases.some((alias) => context.includes(normalize(alias)));
        const excluded = (item.exclude || []).some((word) => context.includes(normalize(word)));
        return aliasesMatch && !excluded;
      });
      if (!rule) return;
      const value = PROFILE[rule.key];
      if (value && setValue(element, value)) filled += 1;
    });
    showToast(filled ? "已填写 " + filled + " 个空字段，请逐项核对后再提交" : "未找到可安全匹配的空字段");
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

export function CareerAutofillAssistant({ resume }: { resume: CareerResume | null }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<AutofillProfile>(emptyProfile);
  const [sourceText, setSourceText] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const script = useMemo(() => buildCareerAutofillUserscript(profile), [profile]);
  const filledCount = Object.values(profile).filter(Boolean).length;

  function openAssistant() {
    setProfile(withResumeFileName(parseProfile(resume?.content || ""), resume?.fileName));
    setSourceText("");
    setSourceFile("");
    setStatus(resume ? "已从主简历识别基础字段，请核对并补充。" : "请先导入主简历。 ");
    setOpen(true);
  }

  async function handleDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("正在读取补充信息文档…");
    try {
      const text = await extractDocumentText(file);
      setSourceFile(file.name);
      setSourceText(text);
      setProfile(
        withResumeFileName(
          parseProfile(`${resume?.content || ""}\n${text}`),
          resume?.fileName,
        ),
      );
      setStatus(`已读取 ${file.name}，请逐项核对识别结果。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "文档读取失败，请更换文件重试。 ");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function recognizeAgain() {
    setProfile(
      withResumeFileName(
        parseProfile(`${resume?.content || ""}\n${sourceText}`),
        resume?.fileName,
      ),
    );
    setStatus("已重新识别字段，请继续核对。 ");
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setStatus("脚本已复制。请粘贴到本地用户脚本管理器中安装。 ");
    } catch {
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

  return (
    <>
      <section className="career-autofill-card panel">
        <div className="career-autofill-icon">⌁</div>
        <div>
          <small>AUTO FILL</small>
          <h3>企业网申自动填写</h3>
          <p>读取主简历与补充信息文档，生成本地填写脚本；只补充空字段，不自动提交。</p>
          <div className="career-autofill-badges">
            <span>本地生成</span><span>字段可核对</span><span>禁止自动提交</span>
          </div>
        </div>
        <button className="primary" disabled={!resume} onClick={openAssistant}>
          {resume ? "生成填写脚本" : "请先导入简历"}
        </button>
      </section>

      {open && (
        <div className="career-autofill-layer" role="dialog" aria-modal="true" aria-label="企业网申自动填写助手">
          <button className="career-autofill-scrim" aria-label="关闭" onClick={() => setOpen(false)} />
          <section className="career-autofill-modal">
            <header>
              <div><small>AUTO FILL ASSISTANT</small><h2>核对自动填写信息</h2><p>敏感信息只写入你下载的本地脚本，不会由工作台自动提交到任何网站。</p></div>
              <button aria-label="关闭" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="career-autofill-source">
              <div><span>01</span><div><b>主简历</b><p>{resume?.fileName || "未导入"}</p></div><em>已读取</em></div>
              <label className={busy ? "busy" : ""}><span>02</span><div><b>{busy ? "正在解析…" : "补充信息文档"}</b><p>{sourceFile || "PDF / DOCX / TXT / MD / CSV / JSON"}</p></div><strong>{sourceFile ? "更换" : "选择文件"}</strong><input type="file" accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json" disabled={busy} onChange={handleDocument} /></label>
            </div>

            <div className="career-autofill-fields-head"><div><b>识别字段</b><p>已识别 {filledCount} / {profileFields.length} 项；脚本只会使用非空字段。</p></div><button onClick={recognizeAgain}>重新识别</button></div>
            <div className="career-autofill-fields">
              {profileFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}{field.sensitive && <em>敏感</em>}</span>
                  <input
                    value={profile[field.key]}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    onChange={(event) => setProfile((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>

            <details className="career-autofill-raw">
              <summary>查看或粘贴补充信息原文</summary>
              <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="也可以在这里粘贴个人信息，然后点击“重新识别”。" />
            </details>

            <aside className="career-autofill-warning"><span>!</span><p><b>提交前必须人工复核</b>不同招聘网站的字段命名并不统一；助手只匹配空白文本框和下拉框，不处理文件上传、单选/复选框，也不会点击提交按钮。</p></aside>
            {status && <p className="career-autofill-status" aria-live="polite">{status}</p>}
            <footer><button onClick={() => setOpen(false)}>取消</button><button onClick={copyScript} disabled={!filledCount}>复制脚本</button><button className="primary" onClick={downloadScript} disabled={!filledCount}>下载 .user.js</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
