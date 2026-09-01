"use client";

import { FormEvent, useState } from "react";
import type { WorkspaceProject } from "./WorkspaceOverview";
import { formatProjectDueDate, projectDueDateInputValue } from "./projectDates";

const ganttStart = new Date();
ganttStart.setHours(0, 0, 0, 0);
const PROJECT_TIMELINE_DAYS = Array.from({ length: 14 }, (_, index) => {
  const date = new Date(ganttStart);
  date.setDate(ganttStart.getDate() + index);
  return {
    key: date.toISOString(),
    day: date.getDate(),
    weekday: "日一二三四五六"[date.getDay()],
    month: date.getMonth() + 1,
    today: index === 0,
  };
});

function ganttPosition(project: WorkspaceProjectRecord, index: number) {
  const start = Math.min(5, index % 4);
  const parsedDue = /^\d{4}-\d{2}-\d{2}$/.test(project.dueDate)
    ? new Date(`${project.dueDate}T00:00:00`)
    : null;
  const dueOffset = parsedDue
    ? Math.ceil((parsedDue.getTime() - ganttStart.getTime()) / 86_400_000)
    : 0;
  const fallbackSpan = Math.max(4, Math.min(10, 5 + project.remainingTasks));
  const span = Math.max(2, Math.min(14 - start, dueOffset > start ? dueOffset - start + 1 : fallbackSpan));
  return { start, span };
}

export type WorkspaceProjectRecord = WorkspaceProject & {
  status: "进行中" | "已暂停" | "已完成";
  createdAt?: string;
  updatedAt?: string;
};

export type WorkspaceQuickNote = {
  id: number;
  content: string;
  status: "待整理" | "已整理" | "已归档";
  createdAt: string;
  updatedAt: string;
};

type ProjectPageProps = {
  projects: WorkspaceProjectRecord[];
  onNew: () => void;
  onEdit: (project: WorkspaceProjectRecord) => void;
};

export function WorkspaceProjectsPage({ projects, onNew, onEdit }: ProjectPageProps) {
  const [filter, setFilter] = useState<"全部" | WorkspaceProjectRecord["status"]>("全部");
  const visible = projects.filter((project) => filter === "全部" || project.status === filter);
  return (
    <section className="workspace-collection-page">
      <div className="workspace-collection-title">
        <div><p>PROJECTS</p><h1>项目</h1><span>围绕阶段、里程碑和下一步行动推进成果。</span></div>
        <button onClick={onNew}>＋ 新建项目</button>
      </div>
      <div className="workspace-collection-tabs">
        {(["全部", "进行中", "已暂停", "已完成"] as const).map((item) => (
          <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}<span>{item === "全部" ? projects.length : projects.filter((project) => project.status === item).length}</span></button>
        ))}
      </div>
      {visible.length ? (
        <div className="workspace-project-board">
          {visible.map((project) => (
            <button key={project.id} onClick={() => onEdit(project)} style={{ "--project-accent": project.accent } as React.CSSProperties}>
              <span className="workspace-project-board-accent" />
              <div><em>{project.status} · {project.stage}</em><small>{formatProjectDueDate(project.dueDate)}</small></div>
              <h2>{project.title}</h2>
              <p>下一里程碑：{project.nextMilestone}</p>
              <div className="workspace-project-board-progress"><i style={{ width: `${project.progress}%` }} /></div>
              <footer><b>{project.progress}%</b><span>{project.remainingTasks} 项待办</span><i>编辑 →</i></footer>
            </button>
          ))}
        </div>
      ) : (
        <div className="workspace-page-empty"><span>▦</span><h2>从一个清晰的项目开始</h2><p>设定阶段、里程碑和截止日期，工作台会把它带回每日行动。</p><button onClick={onNew}>＋ 创建项目</button></div>
      )}
      <section className="workspace-gantt">
        <header>
          <div><p>CALENDAR GANTT</p><h2>日历甘特图</h2><span>未来 14 天 · 直观看到项目阶段、进度和截止节奏</span></div>
          <div><span><i className="active" />进行中</span><span><i className="paused" />已暂停</span><span><i className="done" />已完成</span></div>
        </header>
        <div className="workspace-gantt-scroll">
          <div className="workspace-gantt-chart">
            <div className="workspace-gantt-corner">项目 / 日期</div>
            <div className="workspace-gantt-days">
              {PROJECT_TIMELINE_DAYS.map((date) => (
                <span key={date.key} className={date.today ? "today" : ""}>
                  <small>{date.weekday}</small><b>{date.day}</b>{date.day === 1 && <em>{date.month}月</em>}
                </span>
              ))}
            </div>
            {visible.length ? visible.map((project, index) => {
              const position = ganttPosition(project, index);
              return (
                <div className="workspace-gantt-row" key={project.id}>
                  <button className="workspace-gantt-label" onClick={() => onEdit(project)}><b>{project.title}</b><small>{project.stage} · {formatProjectDueDate(project.dueDate)}</small></button>
                  <div className="workspace-gantt-track">
                    <button
                      className={`workspace-gantt-bar ${project.status === "已暂停" ? "paused" : project.status === "已完成" ? "done" : "active"}`}
                      style={{ "--gantt-start": position.start, "--gantt-span": position.span, "--gantt-progress": `${project.progress}%`, "--project-accent": project.accent } as React.CSSProperties}
                      onClick={() => onEdit(project)}
                    >
                      <i /><span>{project.nextMilestone}</span><b>{project.progress}%</b>
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="workspace-gantt-empty"><span>时间轴已准备好</span><p>创建项目后，阶段条会自动显示在未来 14 天日历中。</p><button onClick={onNew}>＋ 新建项目</button></div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

type NotesPageProps = {
  notes: WorkspaceQuickNote[];
  onNew: () => void;
  onUpdate: (note: WorkspaceQuickNote, status: WorkspaceQuickNote["status"]) => void;
};

export function WorkspaceNotesPage({ notes, onNew, onUpdate }: NotesPageProps) {
  const [filter, setFilter] = useState<"全部" | WorkspaceQuickNote["status"]>("全部");
  const visible = notes.filter((note) => filter === "全部" || note.status === filter);
  return (
    <section className="workspace-collection-page">
      <div className="workspace-collection-title">
        <div><p>QUICK NOTES</p><h1>笔记</h1><span>先快速记录，再把有价值的内容整理进资料库。</span></div>
        <button onClick={onNew}>＋ 写笔记</button>
      </div>
      <div className="workspace-collection-tabs">
        {(["全部", "待整理", "已整理", "已归档"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}<span>{item === "全部" ? notes.length : notes.filter((note) => note.status === item).length}</span></button>)}
      </div>
      {visible.length ? (
        <div className="workspace-note-grid">
          {visible.map((note) => (
            <article key={note.id}>
              <header><span>{note.status}</span><time>{note.updatedAt || note.createdAt}</time></header>
              <p>{note.content}</p>
              <footer>
                {note.status === "待整理" && <button onClick={() => onUpdate(note, "已整理")}>标为已整理</button>}
                {note.status !== "已归档" && <button onClick={() => onUpdate(note, "已归档")}>归档</button>}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-page-empty"><span>✎</span><h2>速记箱还是空的</h2><p>记录一个临时想法、待办线索或稍后阅读的内容。</p><button onClick={onNew}>＋ 写第一条笔记</button></div>
      )}
    </section>
  );
}

type ToolDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpen: (view: string) => void;
};

export const WORKSPACE_TOOL_GROUPS = [
  { title: "职业", items: [["简历投递", "招聘与投递", "跟踪岗位机会与面试流程"]] },
  { title: "投资研究", items: [["股票", "股票研究", "A股、港股与美股统一筛选和跟踪"], ["行业速览", "行业速览", "汽车、机器人、半导体等资讯"]] },
  { title: "智能", items: [["AI 模型", "AI 模型", "连接模型、运行查询和自动任务"]] },
] as const;

export function WorkspaceToolDrawer({ open, onClose, onOpen }: ToolDrawerProps) {
  if (!open) return null;
  return (
    <div className="workspace-tool-layer" role="dialog" aria-modal="true" aria-label="常用工具">
      <button className="workspace-tool-scrim" onClick={onClose} aria-label="关闭常用工具" />
      <aside className="workspace-tool-drawer">
        <header><div><p>TOOLS</p><h2>常用工具</h2><span>低频模块按需打开，不打扰每日工作流。</span></div><button onClick={onClose}>×</button></header>
        <div>
          {WORKSPACE_TOOL_GROUPS.map((group) => (
            <section key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([view, title, note]) => (
                <button key={view} onClick={() => { onOpen(view); onClose(); }}>
                  <span>{title.slice(0, 1)}</span><span><b>{title}</b><small>{note}</small></span><i>→</i>
                </button>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

type EntryModalsProps = {
  projectOpen: boolean;
  noteOpen: boolean;
  project: WorkspaceProjectRecord | null;
  onClose: () => void;
  onSaveProject: (values: Omit<WorkspaceProjectRecord, "id">) => void;
  onSaveNote: (content: string) => void;
};

export function WorkspaceEntryModals({ projectOpen, noteOpen, project, onClose, onSaveProject, onSaveNote }: EntryModalsProps) {
  if (!projectOpen && !noteOpen) return null;
  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSaveProject({
      title: String(data.get("title") || "未命名项目"),
      stage: String(data.get("stage") || "规划中"),
      status: String(data.get("status") || "进行中") as WorkspaceProjectRecord["status"],
      progress: Number(data.get("progress") || 0),
      nextMilestone: String(data.get("nextMilestone") || "确定下一里程碑"),
      dueDate: String(data.get("dueDate") || "待安排"),
      remainingTasks: Number(data.get("remainingTasks") || 0),
      accent: String(data.get("accent") || "#a97d30"),
    });
  }
  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSaveNote(String(data.get("content") || ""));
  }
  return (
    <div className="workspace-entry-layer">
      <button className="workspace-entry-scrim" onClick={onClose} aria-label="关闭" />
      {projectOpen && <form className="workspace-entry-modal workspace-project-modal" onSubmit={saveProject}>
        <header><div><p>PROJECT</p><h2>{project ? "编辑项目" : "新建项目"}</h2></div><button className="workspace-entry-close" type="button" onClick={onClose} aria-label="关闭项目窗口">×</button></header>
        <label><span>项目名称</span><input name="title" defaultValue={project?.title} autoFocus required placeholder="例如：个人工作台 V2" /></label>
        <div className="workspace-entry-row"><label><span>当前阶段</span><input name="stage" defaultValue={project?.stage || "规划中"} /></label><label><span>项目状态</span><select name="status" defaultValue={project?.status || "进行中"}><option>进行中</option><option>已暂停</option><option>已完成</option></select></label></div>
        <label><span>下一里程碑</span><input name="nextMilestone" defaultValue={project?.nextMilestone} placeholder="清晰描述下一次可验收成果" /></label>
        <div className="workspace-entry-row"><label><span>截止日期</span><input name="dueDate" type="date" defaultValue={projectDueDateInputValue(project?.dueDate)} /></label><label><span>剩余任务</span><input name="remainingTasks" type="number" min="0" defaultValue={project?.remainingTasks || 0} /></label></div>
        <div className="workspace-entry-row"><label><span>完成进度（%）</span><input name="progress" type="number" min="0" max="100" defaultValue={project?.progress || 0} /></label><label><span>识别色</span><input name="accent" type="color" defaultValue={project?.accent || "#a97d30"} /></label></div>
        <footer><button type="button" onClick={onClose}>取消</button><button type="submit">保存项目</button></footer>
      </form>}
      {noteOpen && <form className="workspace-entry-modal workspace-note-modal" onSubmit={saveNote}>
        <header><div><p>QUICK NOTE</p><h2>写一条笔记</h2></div><button type="button" onClick={onClose} aria-label="关闭笔记窗口">×</button></header>
        <label><span>内容</span><textarea name="content" autoFocus required placeholder="先记下想法，之后再整理…" /></label>
        <small>新内容会进入“待整理”速记箱。</small>
        <footer><button type="button" onClick={onClose}>取消</button><button type="submit">保存笔记</button></footer>
      </form>}
    </div>
  );
}
