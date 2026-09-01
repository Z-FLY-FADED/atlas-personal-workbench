"use client";

import { Fragment, useState } from "react";
import { WORKSPACE_TOOL_GROUPS } from "./WorkspacePages";

type WorkspaceDestination =
  | "工作台"
  | "今日"
  | "个人任务"
  | "项目"
  | "笔记"
  | "知识库"
  | "英语学习"
  | "日语学习";

const primaryNavigation: Array<{
  label: string;
  destination?: WorkspaceDestination;
  icon: string;
  toolGroup?: boolean;
  children?: Array<{
    label: string;
    destination: WorkspaceDestination;
    icon: string;
  }>;
}> = [
  { label: "概览", destination: "工作台", icon: "⌂" },
  { label: "今日", destination: "今日", icon: "☀" },
  { label: "项目", destination: "项目", icon: "▦" },
  { label: "笔记", destination: "笔记", icon: "✎" },
  {
    label: "语言学习",
    icon: "文",
    children: [
      { label: "英语学习", destination: "英语学习", icon: "EN" },
      { label: "日语学习", destination: "日语学习", icon: "日" },
    ],
  },
  { label: "资料库", destination: "知识库", icon: "◇" },
  { label: "常用工具", icon: "⌘", toolGroup: true },
];

const toolShortcutIcons: Record<string, string> = {
  简历投递: "聘",
  股票: "股",
  行业速览: "业",
  "AI 模型": "AI",
};

type Props = {
  active: string;
  mobileOpen: boolean;
  taskCount: number;
  profile: { displayName: string; motto: string; avatarText: string; accent: string };
  onNavigate: (destination: WorkspaceDestination) => void;
  onOpenTool: (destination: string) => void;
  onOpenProfile: () => void;
  onCloseMobile: () => void;
};

function activeLabel(active: string) {
  if (active === "工作台") return "概览";
  if (active === "个人任务") return "今日";
  if (active === "知识库") return "资料库";
  return active;
}

export function WorkspaceSidebar({
  active,
  mobileOpen,
  taskCount,
  profile,
  onNavigate,
  onOpenTool,
  onOpenProfile,
  onCloseMobile,
}: Props) {
  const current = activeLabel(active);
  const [languageOpen, setLanguageOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  return (
    <>
      <button
        className={`workspace-nav-scrim ${mobileOpen ? "visible" : ""}`}
        onClick={onCloseMobile}
        aria-label="关闭导航"
      />
      <aside className={`workspace-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="workspace-brand">
          <span>W</span>
          <div>
            <b>个人工作台</b>
            <small>Personal OS</small>
          </div>
        </div>

        <nav aria-label="工作台主导航">
          <p className="workspace-nav-caption">工作空间</p>
          {primaryNavigation.map((item) => {
            const childActive = item.children?.some(
              (child) => child.destination === active,
            );
            const toolActive =
              item.toolGroup &&
              WORKSPACE_TOOL_GROUPS.some((group) =>
                group.items.some(([destination]) => destination === active),
              );
            return (
              <Fragment key={item.label}>
                <button
                  className={current === item.label || childActive || toolActive ? "active" : ""}
                  onClick={() => {
                    if (item.children) setLanguageOpen((open) => !open);
                    else if (item.toolGroup) setToolsOpen((open) => !open);
                    else if (item.destination) onNavigate(item.destination);
                  }}
                  aria-expanded={
                    item.children
                      ? languageOpen
                      : item.toolGroup
                        ? toolsOpen
                        : undefined
                  }
                >
                  <span>{item.icon}</span>
                  <b>{item.label}</b>
                  {item.label === "今日" && taskCount > 0 && <em>{taskCount}</em>}
                  {item.children && <i>{languageOpen ? "⌄" : "›"}</i>}
                  {item.toolGroup && <i>{toolsOpen ? "⌄" : "›"}</i>}
                </button>
                {item.children && languageOpen && (
                  <div className="workspace-language-subnav" aria-label="语言学习子菜单">
                    {item.children.map((child) => (
                      <button
                        key={child.destination}
                        className={active === child.destination ? "active" : ""}
                        onClick={() => onNavigate(child.destination)}
                      >
                        <span>{child.icon}</span>
                        <b>{child.label}</b>
                      </button>
                    ))}
                  </div>
                )}
                {item.toolGroup && toolsOpen && (
                  <div className="workspace-tool-shortcuts" aria-label="常用工具子菜单">
                    {WORKSPACE_TOOL_GROUPS.flatMap((group) => group.items).map(([destination, title]) => (
                      <button
                        key={destination}
                        className={active === destination ? "active" : ""}
                        onClick={() => onOpenTool(destination)}
                        title={`打开${title}`}
                      >
                        <span>{toolShortcutIcons[destination] || title.slice(0, 1)}</span>
                        <b>{title}</b>
                      </button>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </nav>

        <div className="workspace-sidebar-spacer" />
        <div className="workspace-sync">
          <i />
          <span>
            <b>数据已同步</b>
            <small>刚刚更新</small>
          </span>
        </div>
        <button className="workspace-profile" onClick={onOpenProfile}>
          <span className={`avatar ${profile.accent}`}>{profile.avatarText}</span>
          <span>
            <b>{profile.displayName}</b>
            <small>{profile.motto || "编辑个人状态"}</small>
          </span>
          <i>•••</i>
        </button>
      </aside>
      <nav className="workspace-mobile-nav" aria-label="移动端主导航">
        <button className={current === "概览" ? "active" : ""} onClick={() => onNavigate("工作台")}><span>⌂</span><b>概览</b></button>
        <button className={current === "今日" ? "active" : ""} onClick={() => onNavigate("今日")}><span>☀</span><b>今日</b></button>
        <button className={current === "项目" ? "active" : ""} onClick={() => onNavigate("项目")}><span>▦</span><b>项目</b></button>
        <button className={current === "笔记" ? "active" : ""} onClick={() => onNavigate("笔记")}><span>✎</span><b>笔记</b></button>
        <button className={current === "资料库" ? "active" : ""} onClick={() => onNavigate("知识库")}><span>◇</span><b>资料库</b></button>
      </nav>
    </>
  );
}
