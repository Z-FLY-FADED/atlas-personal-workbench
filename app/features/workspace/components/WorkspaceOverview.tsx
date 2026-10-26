"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { WorkspaceKnowledge, WorkspaceProject, WorkspaceReminder, WorkspaceTask } from "../../../contracts/workspace";
import { readLocal, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import { isTaskCarriedOver } from "../../tasks/domain/dates";
import { formatProjectDueDate } from "../domain/projectDates";
import { conciseSummary, formatStoredDate } from "../domain/workspace";
import { useHomeLayout } from './HomeLayout';
import { WorkspaceCalendar } from "./WorkspaceWidgets";
export type { WorkspaceKnowledge, WorkspaceProject, WorkspaceReminder, WorkspaceTask } from "../../../contracts/workspace";
type Props = {
    today: string;
    focusWidget: ReactNode;
    onReminders: (day?: string) => void;
    onOpenItem: (id: number) => void;
    displayName: string;
    tasks: WorkspaceTask[];
    calendarTasks?: WorkspaceTask[];
    knowledge: WorkspaceKnowledge[];
    projects: WorkspaceProject[];
    reminders: WorkspaceReminder[];
    onToggleTask: (task: WorkspaceTask) => void;
    onNewTask: (horizon?: WorkspaceTask["horizon"]) => void;
    onNewProject: () => void;
    onOpenTasks: () => void;
    onOpenProjects: () => void;
    onOpenKnowledge: () => void;
    onOpenNotes: () => void;
    onOpenTools: () => void;
    onQuickNote: (content: string) => Promise<boolean>;
};
function greeting() {
    const hour = new Date().getHours();
    if (hour < 11)
        return "早上好";
    if (hour < 14)
        return "中午好";
    if (hour < 18)
        return "下午好";
    return "晚上好";
}
export function WorkspaceOverview({ today, focusWidget, onReminders, onOpenItem, calendarTasks, displayName, tasks, knowledge, projects, reminders, onToggleTask, onNewTask, onNewProject, onOpenTasks, onOpenProjects, onOpenKnowledge, onOpenNotes, onOpenTools, onQuickNote, }: Props) {
    const [taskFilter, setTaskFilter] = useState<"全部" | "高优先" | "临近截止">("全部");
    const [quickNote, setQuickNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [expandedPlans, setExpandedPlans] = useState(true);
    useEffect(() => { const timer = window.setTimeout(() => setQuickNote(readLocal('atlas-overview-note-draft', '')), 0); return () => clearTimeout(timer); }, []);
    const todayTasks = tasks.filter((task) => task.horizon === "今日");
    const taskGroups = ([
        { horizon: "今日", eyebrow: "今日重点" },
        { horizon: "本周", eyebrow: "本周推进" },
        { horizon: "年度", eyebrow: "年度目标" },
    ] as const).map(({ horizon, eyebrow }) => {
        const horizonTasks = tasks.filter((task) => task.horizon === horizon);
        const visibleTasks = horizonTasks.filter((task) => {
            if (taskFilter === "高优先")
                return task.priority === "优先";
            if (taskFilter === "临近截止")
                return /今天|\d{1,2}:\d{2}/.test(task.date);
            return true;
        }).slice(0, 4);
        const done = horizonTasks.filter((task) => task.done).length;
        const completion = horizonTasks.length ? Math.round((done / horizonTasks.length) * 100) : 0;
        return { horizon, eyebrow, tasks: horizonTasks, visibleTasks, done, completion };
    });
    const homeLayout = useHomeLayout();
    const doneToday = todayTasks.filter((task) => task.done).length;
    const primaryTasks = todayTasks.filter((task) => !task.done).slice(0, 3);
    async function submitQuickNote() {
        const content = quickNote.trim();
        if (!content || savingNote)
            return;
        setSavingNote(true);
        try {
            if (await onQuickNote(content)) {
                setQuickNote('');
                writeLocal('atlas-overview-note-draft', '');
            }
        }
        finally {
            setSavingNote(false);
        }
    }
    return (<div className="workspace-overview">
      <section className="workspace-welcome">
        <div>
          <p>{greeting()}，{displayName}</p>
          <h1>{primaryTasks.length ? "先完成最重要的三件事。" : "今天从一件重要的小事开始。"}</h1>
          <span>
            {todayTasks.length
            ? `今日 ${todayTasks.length} 项任务，已完成 ${doneToday} 项。`
            : "今天还没有安排任务，给自己一个清晰的起点。"}
          </span>
        </div>
        <button onClick={() => onNewTask("今日")}><span>＋</span><b>添加今日任务</b></button>
      </section>

      {homeLayout.controls}
      <div className="workspace-home-grid">
        <div className="workspace-home-main">
          <section {...homeLayout.slot('tasks')} className="workspace-section workspace-today-card">
            <div className="workspace-section-head">
              <div><p>任务全景</p><h2>今日、本周与年度任务</h2></div>
              <button onClick={onOpenTasks}>查看全部 →</button>
            </div>
            <div className="workspace-task-filters">
              {(["全部", "高优先", "临近截止"] as const).map((filter) => (<button key={filter} className={taskFilter === filter ? "active" : ""} onClick={() => setTaskFilter(filter)}>{filter}</button>))}
            </div>
            <button className="workspace-plan-toggle" onClick={() => setExpandedPlans(value => !value)} aria-expanded={expandedPlans}>{expandedPlans ? "收起本周与年度计划" : "展开本周与年度计划"}</button>
            <div className={`workspace-task-board ${expandedPlans ? "" : "today-only"}`}>
              {taskGroups.filter(group => expandedPlans || group.horizon === "今日").map((group) => (<article className="workspace-task-column" key={group.horizon}>
                  <header>
                    <div><p>{group.eyebrow}</p><h3>{group.horizon}任务</h3></div>
                    <span><b>{group.done}</b> / {group.tasks.length}</span>
                  </header>
                  <div className="workspace-task-progress">
                    <div><i style={{ width: `${group.completion}%` }}/></div>
                    <em>{group.completion}%</em>
                  </div>
                  <div className="workspace-task-list">
                    {group.visibleTasks.length ? group.visibleTasks.map((task) => {
                const carriedOver = isTaskCarriedOver(task);
                return (<button className={`${task.done ? "done" : ""} ${carriedOver ? "carried-over" : ""}`} key={task.id} onClick={() => onToggleTask(task)}>
                          <i>{task.done ? "✓" : ""}</i>
                          <span>
                            <b>{task.title}</b>
                            <small>{task.detail || "个人任务"}</small>
                          </span>
                          <em className={carriedOver
                        ? "overdue"
                        : task.priority === "优先"
                            ? "high"
                            : ""}>
                            {carriedOver ? "未完成" : task.date || "待安排"}
                          </em>
                        </button>);
            }) : (<div className="workspace-empty compact">
                        <span>✓</span>
                        <b>{group.tasks.length ? "当前筛选下没有任务" : `还没有${group.horizon}任务`}</b>
                        <small>{group.tasks.length ? "切换筛选条件查看其他任务。" : `添加一项${group.horizon}计划。`}</small>
                        <button onClick={() => onNewTask(group.horizon)}>＋ 新建{group.horizon}任务</button>
                      </div>)}
                  </div>
                </article>))}
            </div>
          </section>

          <section {...homeLayout.slot('projects')} className="workspace-section">
            <div className="workspace-section-head">
              <div><p>正在推进</p><h2>进行中的项目</h2></div>
              <button onClick={onOpenProjects}>管理项目 →</button>
            </div>
            <div className="workspace-project-list">
              {projects.length ? projects.slice(0, 3).map((project) => (<button key={project.id} onClick={onOpenProjects} style={{ "--project-accent": project.accent } as React.CSSProperties}>
                  <span className="workspace-project-mark"/>
                  <div className="workspace-project-copy">
                    <p><em>{project.stage}</em><small>{project.remainingTasks} 项待办</small></p>
                    <h3>{project.title}</h3>
                    <span>下一里程碑 · {project.nextMilestone}</span>
                    <div><i style={{ width: `${project.progress}%` }}/></div>
                    <p><b>{project.progress}%</b><small>{formatProjectDueDate(project.dueDate)}</small></p>
                  </div>
                </button>)) : (<div className="workspace-empty project-empty"><span>▦</span><b>还没有进行中的项目</b><small>用项目串起任务、节点和最终成果。</small><button onClick={onNewProject}>＋ 创建第一个项目</button></div>)}
            </div>
          </section>

          <section {...homeLayout.slot('knowledge')} className="workspace-section">
            <div className="workspace-section-head">
              <div><p>继续阅读</p><h2>最近阅读与收录</h2></div>
              <button onClick={onOpenKnowledge}>打开资料库 →</button>
            </div>
            <div className="workspace-recent-list">
              {knowledge.slice(0, 4).map((item) => (<button key={item.id} onClick={() => onOpenItem(item.id)}>
                  <span>{item.primaryCategory.slice(0, 1) || "文"}</span>
                  <div><b>{item.title}</b><small>{conciseSummary(item.title, item.summary) || `${item.primaryCategory} / ${item.secondaryCategory}`}</small></div>
                  <em>{formatStoredDate(item.createdAt)}</em><i>→</i>
                </button>))}
              {!knowledge.length && <div className="workspace-empty compact"><span>◇</span><b>资料库还是空的</b><small>收录第一份文档或一条想法。</small><button onClick={onOpenNotes}>写笔记</button></div>}
            </div>
          </section>
        </div>

        <aside className="workspace-right-rail">
          <div className="home-widget-slot" {...homeLayout.slot('calendar')}><WorkspaceCalendar today={today} tasks={calendarTasks || tasks} projects={projects} reminders={reminders} onReminders={onReminders}/></div>

          <section {...homeLayout.slot('notes')} className="workspace-rail-card workspace-quick-note">
            <p><b>快速记录</b><span>速记箱</span></p>
            <textarea value={quickNote} onChange={(event) => { setQuickNote(event.target.value); writeLocal("atlas-overview-note-draft", event.target.value); }} onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                submitQuickNote();
        }} placeholder="临时想法、待整理事项…"/>
            <div><small>Ctrl + Enter 保存</small><button disabled={savingNote} onClick={submitQuickNote}>{savingNote ? "保存中…" : "记录"}</button></div>
          </section>

          <section {...homeLayout.slot('reminders')} className="workspace-rail-card workspace-countdown"><p><b>待处理提醒</b><button onClick={() => onReminders()}>管理</button></p>{reminders.filter(item => !item.done).slice(0, 3).map(item => <div key={item.id}><span>{item.remindAt.replace('T', ' ')}</span><b>{item.title}</b></div>)}{!reminders.some(item => !item.done) && <p>暂无提醒</p>}</section>
          <div className="home-widget-slot" {...homeLayout.slot('focus')}>{focusWidget}</div>
        </aside>
      </div>

      <footer className="workspace-portal">
        <section><p>常用网站</p><div><a href="https://github.com" target="_blank">GH <span>GitHub</span></a><a href="https://www.bilibili.com" target="_blank">B <span>哔哩哔哩</span></a><a href="https://www.zhihu.com" target="_blank">知 <span>知乎</span></a></div></section>
        <section><p>系统入口</p><div><button onClick={onOpenTools}>⌘ <span>所有工具</span></button><button onClick={onOpenKnowledge}>◇ <span>资料库</span></button><button onClick={onOpenNotes}>✎ <span>速记箱</span></button></div></section>
        <section className="workspace-week-stat"><p>工作台数据</p><div><span><b>{doneToday}</b><small>今日完成</small></span><span><b>{knowledge.length}</b><small>知识条目</small></span><span><b>{projects.length}</b><small>活跃项目</small></span></div></section>
      </footer>
    </div>);
}
