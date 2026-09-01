"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  query: string;
  dateLabel: string;
  avatarText: string;
  onQueryChange: (query: string) => void;
  onMenu: () => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onNewNote: () => void;
  onCapture: () => void;
  onImportDocument: () => void;
  onProfile: () => void;
  onReminders: () => void;
};

export function WorkspaceTopbar({
  query,
  dateLabel,
  avatarText,
  onQueryChange,
  onMenu,
  onNewTask,
  onNewProject,
  onNewNote,
  onCapture,
  onImportDocument,
  onProfile,
  onReminders,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const actions = [
    ["新建任务", "安排一个明确行动", onNewTask],
    ["新建项目", "管理阶段与里程碑", onNewProject],
    ["写一条笔记", "先记下，再整理", onNewNote],
    ["收录网页 / 想法", "沉淀到资料库", onCapture],
    ["导入文档", "PDF、DOCX、Markdown", onImportDocument],
  ] as const;

  return (
    <header className="workspace-topbar">
      <button className="workspace-menu-button" onClick={onMenu} aria-label="打开导航">
        ☰
      </button>
      <div className="workspace-day-status">
        <b>{dateLabel}</b>
        <span>晴 · 26°C</span>
      </div>
      <label className="workspace-search">
        <span>⌕</span>
        <input
          ref={searchRef}
          aria-label="全局搜索"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索任务、项目、笔记或资料…"
        />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="workspace-top-actions">
        <button className="workspace-reminder-button" aria-label="提醒" onClick={onReminders}>
          ♢<i />
        </button>
        <div className="workspace-add-wrap">
          <button
            className="workspace-add-button"
            onClick={() => setAddOpen((open) => !open)}
            aria-expanded={addOpen}
          >
            ＋ <span>快捷新增</span> <i>⌄</i>
          </button>
          {addOpen && (
            <div className="workspace-add-menu">
              <p>新增到工作台</p>
              {actions.map(([title, note, action]) => (
                <button
                  key={title}
                  onClick={() => {
                    setAddOpen(false);
                    action();
                  }}
                >
                  <span>＋</span>
                  <span><b>{title}</b><small>{note}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="workspace-top-avatar" onClick={onProfile} aria-label="个人资料">
          {avatarText}
        </button>
      </div>
    </header>
  );
}
