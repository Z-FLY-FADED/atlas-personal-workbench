"use client";

import { useMemo, useState } from "react";
import { formatProjectDueDate } from "./projectDates";

export type WorkspaceTask = {
  id: number;
  title: string;
  detail: string;
  priority: "优先" | "一般" | "不重要";
  horizon: "今日" | "本周" | "年度";
  done: boolean;
  date: string;
};

export type WorkspaceKnowledge = {
  id: number;
  title: string;
  summary: string;
  primaryCategory: string;
  secondaryCategory: string;
  createdAt: string;
};

export type WorkspaceProject = {
  id: number;
  title: string;
  stage: string;
  progress: number;
  nextMilestone: string;
  dueDate: string;
  remainingTasks: number;
  accent: string;
};

export type WorkspaceReminder = {
  id: number;
  title: string;
  remindAt: string;
  done: boolean;
};

type Props = {
  displayName: string;
  tasks: WorkspaceTask[];
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
  onQuickNote: (content: string) => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function miniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return {
    label: `${year} 年 ${month + 1} 月`,
    today: now.getDate(),
    cells: [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)],
  };
}

export function WorkspaceOverview({
  displayName,
  tasks,
  knowledge,
  projects,
  reminders,
  onToggleTask,
  onNewTask,
  onNewProject,
  onOpenTasks,
  onOpenProjects,
  onOpenKnowledge,
  onOpenNotes,
  onOpenTools,
  onQuickNote,
}: Props) {
  const [taskFilter, setTaskFilter] = useState<"全部" | "高优先" | "临近截止">("全部");
  const [quickNote, setQuickNote] = useState("");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusStarted, setFocusStarted] = useState(false);
  const calendar = useMemo(() => miniCalendar(), []);
  const todayTasks = tasks.filter((task) => task.horizon === "今日");
  const taskGroups = ([
    { horizon: "今日", eyebrow: "今日重点" },
    { horizon: "本周", eyebrow: "本周推进" },
    { horizon: "年度", eyebrow: "年度目标" },
  ] as const).map(({ horizon, eyebrow }) => {
    const horizonTasks = tasks.filter((task) => task.horizon === horizon);
    const visibleTasks = horizonTasks.filter((task) => {
      if (taskFilter === "高优先") return task.priority === "优先";
      if (taskFilter === "临近截止") return /今天|\d{1,2}:\d{2}/.test(task.date);
      return true;
    }).slice(0, 4);
    const done = horizonTasks.filter((task) => task.done).length;
    const completion = horizonTasks.length ? Math.round((done / horizonTasks.length) * 100) : 0;
    return { horizon, eyebrow, tasks: horizonTasks, visibleTasks, done, completion };
  });
  const doneToday = todayTasks.filter((task) => task.done).length;
  const primaryTasks = todayTasks.filter((task) => !task.done).slice(0, 3);

  function submitQuickNote() {
    const content = quickNote.trim();
    if (!content) return;
    onQuickNote(content);
    setQuickNote("");
  }

  return (
    <div className="workspace-overview">
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
        <button onClick={() => onNewTask("今日")}><span>＋</span><b>添加今日任务</b><small>把下一步写具体</small></button>
      </section>

      <div className="workspace-home-grid">
        <div className="workspace-home-main">
          <section className="workspace-section workspace-today-card">
            <div className="workspace-section-head">
              <div><p>任务全景</p><h2>今日、本周与年度任务</h2></div>
              <button onClick={onOpenTasks}>查看全部 →</button>
            </div>
            <div className="workspace-task-filters">
              {(["全部", "高优先", "临近截止"] as const).map((filter) => (
                <button key={filter} className={taskFilter === filter ? "active" : ""} onClick={() => setTaskFilter(filter)}>{filter}</button>
              ))}
            </div>
            <div className="workspace-task-board">
              {taskGroups.map((group) => (
                <article className="workspace-task-column" key={group.horizon}>
                  <header>
                    <div><p>{group.eyebrow}</p><h3>{group.horizon}任务</h3></div>
                    <span><b>{group.done}</b> / {group.tasks.length}</span>
                  </header>
                  <div className="workspace-task-progress">
                    <div><i style={{ width: `${group.completion}%` }} /></div>
                    <em>{group.completion}%</em>
                  </div>
                  <div className="workspace-task-list">
                    {group.visibleTasks.length ? group.visibleTasks.map((task) => (
                      <button className={task.done ? "done" : ""} key={task.id} onClick={() => onToggleTask(task)}>
                        <i>{task.done ? "✓" : ""}</i>
                        <span><b>{task.title}</b><small>{task.detail || "个人任务"}</small></span>
                        <em className={task.priority === "优先" ? "high" : ""}>{task.date || "待安排"}</em>
                      </button>
                    )) : (
                      <div className="workspace-empty compact">
                        <span>✓</span>
                        <b>{group.tasks.length ? "当前筛选下没有任务" : `还没有${group.horizon}任务`}</b>
                        <small>{group.tasks.length ? "切换筛选条件查看其他任务。" : `添加一项${group.horizon}计划。`}</small>
                        <button onClick={() => onNewTask(group.horizon)}>＋ 新建{group.horizon}任务</button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="workspace-section">
            <div className="workspace-section-head">
              <div><p>正在推进</p><h2>进行中的项目</h2></div>
              <button onClick={onOpenProjects}>管理项目 →</button>
            </div>
            <div className="workspace-project-list">
              {projects.length ? projects.slice(0, 3).map((project) => (
                <button key={project.id} onClick={onOpenProjects} style={{ "--project-accent": project.accent } as React.CSSProperties}>
                  <span className="workspace-project-mark" />
                  <div className="workspace-project-copy">
                    <p><em>{project.stage}</em><small>{project.remainingTasks} 项待办</small></p>
                    <h3>{project.title}</h3>
                    <span>下一里程碑 · {project.nextMilestone}</span>
                    <div><i style={{ width: `${project.progress}%` }} /></div>
                    <p><b>{project.progress}%</b><small>{formatProjectDueDate(project.dueDate)}</small></p>
                  </div>
                </button>
              )) : (
                <div className="workspace-empty project-empty"><span>▦</span><b>还没有进行中的项目</b><small>用项目串起任务、节点和最终成果。</small><button onClick={onNewProject}>＋ 创建第一个项目</button></div>
              )}
            </div>
          </section>

          <section className="workspace-section">
            <div className="workspace-section-head">
              <div><p>继续阅读</p><h2>最近文档与笔记</h2></div>
              <button onClick={onOpenKnowledge}>打开资料库 →</button>
            </div>
            <div className="workspace-recent-list">
              {knowledge.slice(0, 4).map((item) => (
                <button key={item.id} onClick={onOpenKnowledge}>
                  <span>{item.primaryCategory.slice(0, 1) || "文"}</span>
                  <div><b>{item.title}</b><small>{item.summary || `${item.primaryCategory} / ${item.secondaryCategory}`}</small></div>
                  <em>{item.createdAt}</em><i>→</i>
                </button>
              ))}
              {!knowledge.length && <div className="workspace-empty compact"><span>◇</span><b>资料库还是空的</b><small>收录第一份文档或一条想法。</small><button onClick={onOpenNotes}>写笔记</button></div>}
            </div>
          </section>
        </div>

        <aside className="workspace-right-rail">
          <section className="workspace-rail-card workspace-calendar">
            <div><b>{calendar.label}</b><button aria-label="切换月份">•••</button></div>
            <p>{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</p>
            <div>{calendar.cells.map((day, index) => <span key={`${day}-${index}`} className={day === calendar.today ? "today" : ""}>{day}</span>)}</div>
          </section>

          <section className="workspace-rail-card workspace-quick-note">
            <p><b>快速记录</b><span>速记箱</span></p>
            <textarea
              value={quickNote}
              onChange={(event) => setQuickNote(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitQuickNote();
              }}
              placeholder="临时想法、待整理事项…"
            />
            <div><small>Ctrl + Enter 保存</small><button onClick={submitQuickNote}>记录</button></div>
          </section>

          <section className="workspace-rail-card workspace-countdown">
            <p><b>本周节点</b><button onClick={onOpenProjects}>管理</button></p>
            {(reminders.filter((reminder) => !reminder.done).slice(0, 2).length
              ? reminders.filter((reminder) => !reminder.done).slice(0, 2)
              : [
                  { id: -1, title: "周复盘与下周规划", remindAt: "周五", done: false },
                  { id: -2, title: "个人目标进度回顾", remindAt: "月底", done: false },
                ]
            ).map((reminder) => <div key={reminder.id}><span>{reminder.remindAt}</span><b>{reminder.title}</b><em>{reminder.id < 0 ? "待安排" : "提醒"}</em></div>)}
          </section>

          <section className="workspace-rail-card workspace-focus">
            <p><b>个人状态</b><span className={focusStarted ? "active" : ""}>{focusStarted ? "专注中" : "状态良好"}</span></p>
            <h3>{focusStarted ? `${focusMinutes}:00` : "准备进入专注"}</h3>
            <div>{[25, 50].map((minutes) => <button key={minutes} className={focusMinutes === minutes ? "active" : ""} onClick={() => setFocusMinutes(minutes)}>{minutes} 分钟</button>)}</div>
            <button className="workspace-focus-start" onClick={() => setFocusStarted((started) => !started)}>{focusStarted ? "暂停专注" : "开始专注"}</button>
          </section>
        </aside>
      </div>

      <footer className="workspace-portal">
        <section><p>常用网站</p><div><a href="https://github.com" target="_blank">GH <span>GitHub</span></a><a href="https://www.bilibili.com" target="_blank">B <span>哔哩哔哩</span></a><a href="https://www.zhihu.com" target="_blank">知 <span>知乎</span></a></div></section>
        <section><p>系统入口</p><div><button onClick={onOpenTools}>⌘ <span>所有工具</span></button><button onClick={onOpenKnowledge}>◇ <span>资料库</span></button><button onClick={onOpenNotes}>✎ <span>速记箱</span></button></div></section>
        <section className="workspace-week-stat"><p>本周数据</p><div><span><b>{doneToday}</b><small>完成任务</small></span><span><b>{knowledge.length}</b><small>知识条目</small></span><span><b>{projects.length}</b><small>活跃项目</small></span></div></section>
      </footer>
    </div>
  );
}
