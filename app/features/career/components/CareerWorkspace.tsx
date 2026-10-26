"use client";
import { useMemo, useRef, useState } from "react";
import type { ApplicationStatus, JobApplication, JobPayload, RankedJob, ResumeProfile } from "../../../contracts/workspace";
import { CareerAutofillAssistant } from "./CareerAutofillAssistant";
import { CareerMaterials } from './CareerMaterials';
import { SourceNotice } from '../../../shared/components/SourceNotice';
export type CareerApplicationStatus = ApplicationStatus;
export type CareerApplication = JobApplication;
export type CareerJob = RankedJob;
type CareerResume = ResumeProfile;
type JobMarketMeta = Omit<JobPayload, "jobs">;
type CareerWorkspaceProps = {
    jobs: CareerJob[];
    market: JobMarketMeta | null;
    applications: CareerApplication[];
    resume: CareerResume | null;
    resumeSkills: string[];
    jobsLoading: boolean;
    jobsLoadingMore: boolean;
    onRefreshJobs: () => void;
    onLoadMoreJobs: () => void;
    onTrackJob: (job: CareerJob) => void;
    onOpenResume: () => void;
    onAddApplication: () => void;
    onEditApplication: (application: CareerApplication) => void;
    onDeleteApplication: (application: CareerApplication) => void;
};
type CareerView = "overview" | "library" | "pipeline" | "resume";
type JobPersonalState = "new" | "viewed" | "saved" | "ignored" | "tracking";
type DeadlineFilter = "全部" | "3天内" | "7天内" | "未注明";
const careerTabs: Array<{
    id: CareerView;
    label: string;
    short: string;
}> = [
    { id: "overview", label: "职业总览", short: "总览" },
    { id: "library", label: "职位库", short: "职位" },
    { id: "pipeline", label: "投递管线", short: "投递" },
    { id: "resume", label: "简历与材料", short: "简历" },
];
const applicationStages: CareerApplicationStatus[] = [
    "待投递",
    "已投递",
    "笔试",
    "面试",
    "Offer",
    "结束",
];
function recommendation(job: CareerJob) {
    const hardConstraintKnown = job.education && !/按岗位|未注明/.test(job.education);
    const evidence = evidenceCompleteness(job);
    const score = job.resumeScore || job.matchScore;
    if (hardConstraintKnown && score >= 88 && evidence >= 65)
        return { grade: "A", label: "优先准备", note: "方向与能力证据较强" };
    if (score >= 78)
        return { grade: "B", label: "值得投递", note: "主要方向匹配，仍需核对要求" };
    if (score >= 66)
        return { grade: "C", label: "谨慎评估", note: "信息不足或存在可解释缺口" };
    return { grade: "D", label: "暂不推荐", note: "建议先核对硬门槛" };
}
function evidenceCompleteness(job: CareerJob) {
    const fields = [
        job.summary,
        job.education,
        job.experience,
        job.locations.length ? "location" : "",
        job.verifiedAt,
        job.source,
        job.deadline,
    ];
    const present = fields.filter((value) => value && !/按岗位|未注明|为准/.test(String(value))).length;
    const sourceBonus = job.verification === "verified" ? 12 : job.verification === "reachable" ? 7 : 0;
    return Math.min(96, Math.round((present / fields.length) * 84 + sourceBonus));
}
function daysUntil(deadline?: string) {
    if (!deadline)
        return null;
    const target = new Date(`${deadline}T23:59:59+08:00`).getTime();
    if (!Number.isFinite(target))
        return null;
    return Math.ceil((target - Date.now()) / 86400000);
}
function deadlineLabel(job: CareerJob) {
    const days = daysUntil(job.deadline);
    if (days == null)
        return "截止未注明";
    if (days < 0)
        return "可能已截止";
    if (days === 0)
        return "今日截止";
    if (days <= 7)
        return `${days} 天后截止`;
    return job.deadline || "截止未注明";
}
function confidenceLabel(job: CareerJob) {
    if (job.verification === "verified")
        return job.confirmedBy && job.confirmedBy > 1
            ? `多源确认 ×${job.confirmedBy}`
            : "官方原文";
    if (job.verification === "reachable")
        return "官方入口可达";
    return "待重新核验";
}
function statusTone(status: CareerApplicationStatus) {
    return status === "Offer"
        ? "offer"
        : status === "面试"
            ? "interview"
            : status === "笔试"
                ? "test"
                : status === "结束"
                    ? "closed"
                    : status === "待投递"
                        ? "todo"
                        : "sent";
}
function concreteApplicationDate(value: string) {
    const date = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date))
        return date;
    const todayParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const today = Object.fromEntries(todayParts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]));
    if (date === "今天")
        return `${today.year}-${today.month}-${today.day}`;
    const chineseDate = date.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?/);
    if (!chineseDate)
        return date || "未记录";
    return `${chineseDate[1] || today.year}-${chineseDate[2].padStart(2, "0")}-${chineseDate[3].padStart(2, "0")}`;
}
export function CareerWorkspace({ jobs, market, applications, resume, resumeSkills, jobsLoading, jobsLoadingMore, onRefreshJobs, onLoadMoreJobs, onTrackJob, onOpenResume, onAddApplication, onEditApplication, onDeleteApplication, }: CareerWorkspaceProps) {
    const [activeView, setActiveView] = useState<CareerView>("overview");
    const [selectedJobId, setSelectedJobId] = useState("");
    const [query, setQuery] = useState("");
    const [industry, setIndustry] = useState("全部");
    const [jobFunction, setJobFunction] = useState("全部");
    const [recruitmentType, setRecruitmentType] = useState("全部");
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [cityPickerOpen, setCityPickerOpen] = useState(false);
    const [citySearch, setCitySearch] = useState("");
    const [nature, setNature] = useState("全部");
    const [source, setSource] = useState("全部");
    const [deadline, setDeadline] = useState<DeadlineFilter>("全部");
    const [filterOpen, setFilterOpen] = useState(false);
    const [applicationMode, setApplicationMode] = useState<"board" | "list">("board");
    const [applicationQuery, setApplicationQuery] = useState("");
    const detailPanelRef = useRef<HTMLElement | null>(null);
    const [personalStates, setPersonalStates] = useState<Record<string, JobPersonalState>>(() => {
        if (typeof window === "undefined")
            return {};
        try {
            const stored = localStorage.getItem("atlas-career-job-states");
            return stored ? JSON.parse(stored) as Record<string, JobPersonalState> : {};
        }
        catch {
            return {};
        }
    });
    const applicationJobKeys = useMemo(() => new Set(applications.map((item) => `${item.company}::${item.role}`)), [applications]);
    const setPersonalState = (job: CareerJob, state: JobPersonalState) => {
        const next = { ...personalStates, [job.id]: state };
        setPersonalStates(next);
        try {
            localStorage.setItem("atlas-career-job-states", JSON.stringify(next));
        }
        catch {
            // State still works for this session.
        }
    };
    const industries = useMemo(() => ["全部", ...Array.from(new Set(jobs.map((job) => job.industry)))], [jobs]);
    const functions = useMemo(() => ["全部", ...Array.from(new Set(jobs.map((job) => job.function)))], [jobs]);
    const cities = useMemo(() => [
        "全部城市",
        ...Array.from(new Set(jobs.flatMap((job) => job.locations))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    ], [jobs]);
    const visibleCities = useMemo(() => {
        const keyword = citySearch.trim().toLowerCase();
        return cities
            .filter((item) => item !== "全部城市")
            .filter((item) => !keyword || item.toLowerCase().includes(keyword));
    }, [cities, citySearch]);
    const filteredJobs = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return jobs.filter((job) => {
            const state = applicationJobKeys.has(`${job.company}::${job.role}`)
                ? "tracking"
                : personalStates[job.id] || "new";
            const days = daysUntil(job.deadline);
            const deadlineMatches = deadline === "全部" ||
                (deadline === "未注明" && days == null) ||
                (deadline === "3天内" && days != null && days >= 0 && days <= 3) ||
                (deadline === "7天内" && days != null && days >= 0 && days <= 7);
            const recruitmentText = `${job.cohort || ""} ${job.batch || ""} ${job.experience || ""}`;
            const recruitmentMatches = recruitmentType === "全部" ||
                (recruitmentType === "应届生" && /校园招聘|校园|校招|应届|实习|20\d{2}\s*届/.test(recruitmentText)) ||
                (recruitmentType === "社会招聘" && /社会招聘|社招/.test(recruitmentText));
            return (state !== "ignored" &&
                (industry === "全部" || job.industry === industry) &&
                (jobFunction === "全部" || job.function === jobFunction || job.tags.includes(jobFunction)) &&
                recruitmentMatches &&
                (!selectedCities.length ||
                    job.locations.includes("全国") ||
                    selectedCities.some((item) => job.locations.includes(item))) &&
                (nature === "全部" || job.employmentType === nature) &&
                (source === "全部" ||
                    (source === "官方来源" ? job.sourceKind !== "平台搜索" : job.sourceKind === "平台搜索")) &&
                deadlineMatches &&
                (!normalized ||
                    `${job.company} ${job.role} ${job.tags.join(" ")} ${job.locations.join(" ")} ${job.summary}`
                        .toLowerCase()
                        .includes(normalized)));
        });
    }, [
        jobs,
        query,
        industry,
        jobFunction,
        recruitmentType,
        selectedCities,
        nature,
        source,
        deadline,
        personalStates,
        applicationJobKeys,
    ]);
    const selectedJob = filteredJobs.find((job) => job.id === selectedJobId) || filteredJobs[0] || jobs[0];
    const selectedRecommendation = selectedJob ? recommendation(selectedJob) : null;
    const activeFilterCount = [industry, jobFunction, recruitmentType, nature, source, deadline].filter((value) => value !== "全部").length +
        selectedCities.length;
    const topJobs = jobs.filter((job) => recommendation(job).grade === "A").slice(0, 5);
    const inProgress = applications.filter((item) => !["Offer", "结束"].includes(item.status));
    const healthScore = resume
        ? Math.min(96, 68 + Math.min(18, resumeSkills.length * 2) + (applications.length ? 8 : 0))
        : 38;
    const pipelineCount = (status: CareerApplicationStatus) => applications.filter((item) => item.status === status).length;
    const searchedApplications = applications.filter((item) => `${item.company} ${item.role} ${item.status} ${concreteApplicationDate(item.appliedAt)}`
        .toLowerCase()
        .includes(applicationQuery.trim().toLowerCase()));
    const clearFilters = () => {
        setIndustry("全部");
        setJobFunction("全部");
        setRecruitmentType("全部");
        setSelectedCities([]);
        setCitySearch("");
        setNature("全部");
        setSource("全部");
        setDeadline("全部");
        setQuery("");
    };
    const toggleCity = (city: string) => {
        setSelectedCities((current) => current.includes(city)
            ? current.filter((item) => item !== city)
            : [...current, city]);
    };
    const openJob = (job: CareerJob) => {
        detailPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        setSelectedJobId(job.id);
        if ((personalStates[job.id] || "new") === "new")
            setPersonalState(job, "viewed");
    };
    return (<section className="full-view career-workspace">
      <SourceNotice availability={market?.availability}/>
      <header className="career-workspace-header">
        <div>
          <p>ATLAS CAREER WORKSPACE</p>
          <h1>职业工作区</h1>
          <h2>
            {inProgress.length
            ? `今天有 ${inProgress.length} 个机会需要推进，先处理下一步行动。`
            : "从真实职位开始，判断、准备并推进下一次机会。"}
          </h2>
        </div>
        <div className="career-header-actions">
          <button className="secondary-action" onClick={onRefreshJobs} disabled={jobsLoading}>
            <span aria-hidden="true">↻</span> {jobsLoading ? "同步中…" : "同步职位源"}
          </button>
          <button className="primary" onClick={onAddApplication}>＋ 新增记录</button>
        </div>
      </header>

      <nav className="career-navigation" aria-label="职业工作区导航">
        {careerTabs.map((tab, index) => (<button key={tab.id} className={activeView === tab.id ? "active" : ""} onClick={() => setActiveView(tab.id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{tab.label}</b>
            <em>{tab.short}</em>
          </button>))}
      </nav>

      {activeView === "overview" && (<div className="career-overview-grid">
          <section className="career-overview-card career-today panel">
            <header><div><small>TODAY</small><h3>今日行动</h3></div><span>{inProgress.length} 项待推进</span></header>
            <div className="career-action-list">
              {inProgress.slice(0, 5).map((item, index) => (<button key={item.id} onClick={() => { setActiveView("pipeline"); setApplicationQuery(item.company); }}>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <span><b>{item.company} · {item.role}</b><small>{item.nextAction || "补充下一步行动"}</small></span>
                  <em className={`career-status ${statusTone(item.status)}`}>{item.status}</em>
                </button>))}
              {!inProgress.length && <div className="career-empty-inline">从职位库收藏第一条机会，建立你的行动队列。</div>}
            </div>
          </section>

          <section className="career-overview-card career-health panel">
            <header><div><small>SEARCH HEALTH</small><h3>求职健康度</h3></div><strong>{healthScore}</strong></header>
            <div className="career-health-meter"><i style={{ width: `${healthScore}%` }}/></div>
            <dl>
              <div><dt>主简历</dt><dd>{resume ? "已建立" : "待建立"}</dd></div>
              <div><dt>已识别能力</dt><dd>{resumeSkills.length} 项</dd></div>
              <div><dt>进行中机会</dt><dd>{inProgress.length} 个</dd></div>
            </dl>
            <button onClick={() => setActiveView("resume")}>{resume ? "检查简历材料" : "建立主简历"}<span>→</span></button>
          </section>

          <section className="career-overview-card career-recommended panel">
            <header><div><small>HIGH MATCH</small><h3>高匹配新机会</h3></div><button onClick={() => setActiveView("library")}>查看全部</button></header>
            <div className="career-compact-jobs">
              {(topJobs.length ? topJobs : jobs.slice(0, 5)).map((job) => {
                const rec = recommendation(job);
                return <button key={job.id} onClick={() => { openJob(job); setActiveView("library"); }}>
                  <span className={`career-grade grade-${rec.grade.toLowerCase()}`}>{rec.grade}</span>
                  <div><b>{job.company}</b><strong>{job.role}</strong><small>{job.locations.join(" / ")} · {deadlineLabel(job)}</small></div>
                  <em>→</em>
                </button>;
            })}
            </div>
          </section>

          <section className="career-overview-card career-reminders panel">
            <header><div><small>REMINDERS</small><h3>临期与提醒</h3></div><span>按行动排序</span></header>
            <div className="career-reminder-list">
              <article><span className="gold">!</span><div><b>核对待投递岗位</b><p>{pipelineCount("待投递")} 条记录尚未完成官方入口确认</p></div></article>
              <article><span className="rose">◇</span><div><b>准备面试材料</b><p>{pipelineCount("面试")} 场面试需要绑定简历版本与复盘</p></div></article>
              <article><span className="blue">↻</span><div><b>职位源状态</b><p>{market?.verifiedCount || 0} 条已核验 · {market?.updatedAt || "等待同步"}</p></div></article>
            </div>
          </section>

          <section className="career-overview-card career-funnel panel">
            <header><div><small>APPLICATION FUNNEL</small><h3>投递漏斗</h3></div><span>数量与阶段转化</span></header>
            <div className="career-funnel-track">
              {["待投递", "已投递", "笔试", "面试", "Offer"].map((status, index) => (<div key={status}><span style={{ width: `${Math.max(24, 100 - index * 14)}%` }}><b>{pipelineCount(status as CareerApplicationStatus)}</b><small>{status}</small></span>{index < 4 && <i>→</i>}</div>))}
            </div>
          </section>
        </div>)}

      {activeView === "library" && (<div className="career-library-shell">
          <aside className={`career-filter-sidebar panel ${filterOpen ? "mobile-open" : ""}`}>
            <header><div><small>FILTERS</small><h3>筛选与关注</h3></div><button onClick={() => setFilterOpen(false)}>×</button></header>
            <label className="career-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="公司、岗位或技能"/></label>
            <label><span>行业</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}>{industries.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>岗位方向</span><select value={jobFunction} onChange={(event) => setJobFunction(event.target.value)}>{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>招聘类型</span><select value={recruitmentType} onChange={(event) => setRecruitmentType(event.target.value)}>{["全部", "应届生", "社会招聘"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="career-city-filter">
              <span>城市 <small>{selectedCities.length ? `已选 ${selectedCities.length}` : "可多选"}</small></span>
              <button type="button" className={`career-city-trigger ${selectedCities.length ? "has-value" : ""}`} aria-expanded={cityPickerOpen} onClick={() => setCityPickerOpen((open) => !open)}>
                <b>
                  {!selectedCities.length
                ? "全部城市"
                : selectedCities.length <= 2
                    ? selectedCities.join("、")
                    : `已选 ${selectedCities.length} 个城市`}
                </b>
                <i>{cityPickerOpen ? "⌃" : "⌄"}</i>
              </button>
              {selectedCities.length > 0 && (<div className="career-city-chips" aria-label="已选择城市">
                  {selectedCities.map((item) => (<button key={item} type="button" onClick={() => toggleCity(item)}>
                      {item}<span>×</span>
                    </button>))}
                </div>)}
              {cityPickerOpen && (<div className="career-city-popover">
                  <header>
                    <div><b>选择城市</b><small>岗位匹配任一所选城市即可</small></div>
                    <button type="button" onClick={() => setCityPickerOpen(false)}>完成</button>
                  </header>
                  <label className="career-city-search">
                    <span>⌕</span>
                    <input value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="搜索城市" autoFocus/>
                  </label>
                  <div className="career-city-options">
                    {visibleCities.map((item) => {
                    const checked = selectedCities.includes(item);
                    return (<button key={item} type="button" role="checkbox" aria-checked={checked} className={checked ? "selected" : ""} onClick={() => toggleCity(item)}>
                          <i>{checked ? "✓" : ""}</i><span>{item}</span>
                        </button>);
                })}
                    {!visibleCities.length && <p>没有匹配的城市</p>}
                  </div>
                  <footer>
                    <button type="button" onClick={() => setSelectedCities([])}>清空选择</button>
                    <span>{selectedCities.length ? `已选择 ${selectedCities.join("、")}` : "当前显示全部城市"}</span>
                  </footer>
                </div>)}
            </div>
            <label><span>岗位性质</span><select value={nature} onChange={(event) => setNature(event.target.value)}>{["全部", "企业", "国企/央企", "事业编制", "公务员"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>截止时间</span><select value={deadline} onChange={(event) => setDeadline(event.target.value as DeadlineFilter)}>{["全部", "3天内", "7天内", "未注明"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>数据来源</span><select value={source} onChange={(event) => setSource(event.target.value)}>{["全部", "官方来源", "公开平台"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="career-saved-view"><span>关注清单</span><button onClick={() => { setSelectedCities(["广州"]); setJobFunction("研发"); }}>机械研发 · 广州 <em>→</em></button><button onClick={() => { setNature("国企/央企"); setDeadline("7天内"); }}>央国企 · 临期 <em>→</em></button></div>
            <button className="career-clear-filter" onClick={clearFilters}>清除全部筛选</button>
          </aside>

          <section className="career-job-results panel">
            <header>
              <div><small>JOB LIBRARY</small><h3>{jobsLoading ? "正在核验职位…" : `${filteredJobs.length} 个职位方向`}</h3><p>已加载 {jobs.length} / 当前发现 {market?.totalKnown || jobs.length}</p></div>
              <button className="career-mobile-filter" onClick={() => setFilterOpen(true)}>筛选 {activeFilterCount ? `· ${activeFilterCount}` : ""}</button>
            </header>
            <div className="career-job-list">
              {filteredJobs.map((job) => {
                const rec = recommendation(job);
                const state = applicationJobKeys.has(`${job.company}::${job.role}`) ? "tracking" : personalStates[job.id] || "new";
                return <button className={`${selectedJob?.id === job.id ? "active" : ""} state-${state}`} key={job.id} onClick={() => openJob(job)}>
                  <span className={`career-grade grade-${rec.grade.toLowerCase()}`}>{rec.grade}</span>
                  <div><span><b>{job.company}</b>{state === "saved" && <em>已收藏</em>}{state === "tracking" && <em>追踪中</em>}</span><h4>{job.role}</h4><p>{job.locations.join(" / ")} · {job.cohort || job.experience} · {job.batch || job.sourceKind}</p><footer><small className={daysUntil(job.deadline) != null && (daysUntil(job.deadline) || 99) <= 7 ? "urgent" : ""}>{deadlineLabel(job)}</small><small>{confidenceLabel(job)}</small></footer></div>
                </button>;
            })}
              {!filteredJobs.length && <div className="career-empty-state"><span>⌕</span><b>没有符合条件的职位</b><p>当前筛选组合没有结果，可以清除筛选后重新浏览。</p><button onClick={clearFilters}>一键清除筛选</button></div>}
            </div>
            {market?.nextCursor && <button className="career-load-more" onClick={onLoadMoreJobs} disabled={jobsLoadingMore}>{jobsLoadingMore ? "正在核验更多来源…" : "加载下一页"}</button>}
          </section>

          <aside className="career-job-detail panel" ref={detailPanelRef}>
            {selectedJob && selectedRecommendation ? <>
              <header className="career-detail-hero">
                <div className="company-mark">{selectedJob.company.slice(0, 1)}</div>
                <div className="career-detail-title">
                  <small>{selectedJob.company}</small>
                  <h2>{selectedJob.role}</h2>
                  <div className="career-detail-meta">
                    <span><i>⌖</i>{selectedJob.locations.join(" / ") || "地点未注明"}</span>
                    <span>{selectedJob.cohort || selectedJob.experience || "招聘类型未注明"}</span>
                    <span>{selectedJob.batch || selectedJob.sourceKind}</span>
                  </div>
                </div>
              </header>
              <div className="career-detail-actions"><button className={personalStates[selectedJob.id] === "saved" ? "active" : ""} onClick={() => setPersonalState(selectedJob, personalStates[selectedJob.id] === "saved" ? "viewed" : "saved")}>☆ {personalStates[selectedJob.id] === "saved" ? "已收藏" : "收藏"}</button><button onClick={() => { onTrackJob(selectedJob); setPersonalState(selectedJob, "tracking"); }}>＋ 加入准备</button><a href={selectedJob.applyUrl} target="_blank" rel="noreferrer">官方入口 ↗</a></div>
              <section className="career-match-summary"><span className={`career-grade large grade-${selectedRecommendation.grade.toLowerCase()}`}>{selectedRecommendation.grade}</span><div><small>推荐等级</small><h3>{selectedRecommendation.label}</h3><p>{selectedRecommendation.note}</p></div><em><b>{evidenceCompleteness(selectedJob)}%</b>证据完整度</em></section>
              <section className="career-detail-section career-hard-constraints"><header><div><small>REQUIREMENTS</small><h3>硬条件</h3></div><span>投递前以官方原文为准</span></header><dl><div><dt>学历</dt><dd>{selectedJob.education || "未知"}</dd></div><div><dt>经验 / 届别</dt><dd>{selectedJob.cohort || selectedJob.experience || "未知"}</dd></div><div><dt>地点</dt><dd>{selectedJob.locations.join("、") || "未知"}</dd></div><div><dt>截止</dt><dd>{deadlineLabel(selectedJob)}</dd></div></dl></section>
              <section className="career-detail-section"><h3>七维评估</h3><div className="career-score-grid">{[
                    ["技能", selectedJob.resumeScore || selectedJob.matchScore],
                    ["硬条件", /按岗位/.test(selectedJob.education) ? null : Math.min(94, selectedJob.matchScore)],
                    ["薪资", null], ["强度", null],
                    ["稳定性", selectedJob.verification === "verified" ? 82 : null],
                    ["通勤", selectedJob.locations.includes("全国") ? null : 76],
                    ["成长", Math.min(91, selectedJob.matchScore - 2)],
                ].map(([label, value]) => <div className={value == null ? "unknown" : ""} key={String(label)}><span><b>{label}</b><em>{value == null ? "待补充" : `${value}%`}</em></span><i><u style={{ width: value == null ? "100%" : `${value}%` }}/></i></div>)}</div></section>
              <section className="career-detail-section career-evidence"><h3>能力证据与缺口</h3><div><b>已体现</b><p>{selectedJob.matchedSkills.length ? selectedJob.matchedSkills.join(" · ") : "简历中暂无直接证据，建议先核对岗位原文。"}</p></div><div className="gap"><b>待核对</b><p>{selectedJob.missingSkills.length ? selectedJob.missingSkills.join(" · ") : "暂无明显技能缺口；硬条件仍以官方原文为准。"}</p></div></section>
              <section className="career-detail-section career-source-audit"><h3>来源审计</h3><p><span className={`verification-dot ${selectedJob.verification}`}/>{confidenceLabel(selectedJob)}</p><dl><div><dt>来源</dt><dd>{selectedJob.source}</dd></div><div><dt>最后核验</dt><dd>{selectedJob.verifiedAt}</dd></div><div><dt>来源类型</dt><dd>{selectedJob.sourceKind}</dd></div></dl><small>{selectedJob.sourceLevel}</small></section>
              <section className="career-detail-section"><h3>职位摘要</h3><p>{selectedJob.summary}</p><div className="career-tags">{selectedJob.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
              <button className="career-ignore-job" onClick={() => setPersonalState(selectedJob, "ignored")}>忽略此职位</button>
            </> : <div className="career-empty-state"><b>选择一个职位</b></div>}
          </aside>
        </div>)}

      {activeView === "pipeline" && (<div className="career-pipeline-view">
          <header className="career-pipeline-toolbar panel"><label><span>⌕</span><input value={applicationQuery} onChange={(event) => setApplicationQuery(event.target.value)} placeholder="搜索公司、岗位、状态或日期"/></label><div><button className={applicationMode === "board" ? "active" : ""} onClick={() => setApplicationMode("board")}>看板</button><button className={applicationMode === "list" ? "active" : ""} onClick={() => setApplicationMode("list")}>列表</button></div><button className="primary" onClick={onAddApplication}>＋ 新增记录</button></header>
          {applicationMode === "board" ? (<div className="career-kanban">
              {applicationStages.map((stage) => {
                    const stageItems = searchedApplications.filter((item) => item.status === stage);
                    return (<section key={stage} className={`career-kanban-column stage-${statusTone(stage)}`}>
                    <header><span>{stage}</span><b>{stageItems.length}</b></header>
                    <div>
                      {stageItems.map((item) => (<article className="career-application-summary" key={item.id} role="button" tabIndex={0} onClick={() => onEditApplication(item)} onKeyDown={(event) => {
                                if (event.target !== event.currentTarget)
                                    return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onEditApplication(item);
                                }
                            }}>
                          <dl>
                            <div><dt>公司</dt><dd>{item.company}</dd></div>
                            <div><dt>岗位</dt><dd>{item.role}</dd></div>
                            <div><dt>状态</dt><dd><em className={`career-status ${statusTone(item.status)}`}>{item.status}</em></dd></div>
                            <div><dt>时间</dt><dd>{concreteApplicationDate(item.appliedAt)}</dd></div>
                          </dl>
                          <footer className="career-application-card-actions">

                            <button type="button" aria-label={`删除${item.company}${item.role}投递记录`} onClick={(event) => {
                                event.stopPropagation();
                                onDeleteApplication(item);
                            }}>
                              删除
                            </button>
                          </footer>
                        </article>))}
                      {!stageItems.length && <div className="career-kanban-empty">暂无记录</div>}
                    </div>
                  </section>);
                })}
            </div>) : (<div className="career-application-table panel">
              <div className="career-application-row header"><span>公司</span><span>岗位</span><span>状态</span><span>时间</span><span>操作</span></div>
              {searchedApplications.map((item) => (<div className="career-application-row" key={item.id} role="button" tabIndex={0} onClick={() => onEditApplication(item)} onKeyDown={(event) => {
                        if (event.target !== event.currentTarget)
                            return;
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onEditApplication(item);
                        }
                    }}>
                  <span><b>{item.company}</b></span>
                  <span>{item.role}</span>
                  <span><em className={`career-status ${statusTone(item.status)}`}>{item.status}</em></span>
                  <span>{concreteApplicationDate(item.appliedAt)}</span>
                  <span>
                    <button className="danger" type="button" onClick={(event) => {
                        event.stopPropagation();
                        onDeleteApplication(item);
                    }}>
                      删除
                    </button>
                  </span>
                </div>))}
              {!searchedApplications.length && <div className="career-empty-state"><b>还没有投递记录</b><p>从职位库收藏第一条机会，或手动新增一条记录。</p><button onClick={() => setActiveView("library")}>前往职位库</button></div>}
            </div>)}
        </div>)}

      {activeView === "resume" && (<div className="career-resume-layout">
          <section className="career-resume-hero panel"><div className={`career-resume-mark ${resume ? "ready" : ""}`}>{resume ? "✓" : "CV"}</div><div><small>MASTER PROFILE</small><h2>{resume ? resume.fileName : "建立你的主简历"}</h2><p>{resume ? `更新于 ${resume.updatedAt} · ${resume.content.length.toLocaleString("zh-CN")} 字` : "尚未导入简历"}</p><div className="career-resume-skills">{resumeSkills.length ? resumeSkills.map((skill) => <span key={skill}>{skill}</span>) : <span>尚未识别技能</span>}</div></div><button className="primary" onClick={onOpenResume}>{resume ? "查看与更新" : "导入简历"}</button></section>
          <CareerAutofillAssistant resume={resume}/>
          <CareerMaterials hasResume={Boolean(resume)} applications={applications}/>

        </div>)}
    </section>);
}
