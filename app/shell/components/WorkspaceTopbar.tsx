"use client";
import { useEffect, useRef, useState } from 'react';
import { searchWorkspace, type SearchEntry } from "../../features/workspace/domain/workspace";
type Props = {
    query: string;
    dateLabel: string;
    avatarText: string;
    entries: SearchEntry[];
    reminderCount: number;
    onSelectResult: (entry: SearchEntry) => void;
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
export function WorkspaceTopbar(props: Props) {
    const { query, dateLabel, avatarText, entries, onQueryChange, onMenu, onNewTask, onNewProject, onNewNote, onCapture, onImportDocument, onProfile, onReminders, onSelectResult } = props;
    const [addOpen, setAddOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [selected, setSelected] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const addWrapper = useRef<HTMLDivElement>(null);
    const matches = searchWorkspace(entries, query);
    const results = matches.slice(0, 30);
    useEffect(() => {
        const shortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
                setSearchOpen(true);
            }
            if (event.key === 'Escape') {
                setAddOpen(false);
                setSearchOpen(false);
            }
        };
        const outside = (event: PointerEvent) => {
            if (!wrapper.current?.contains(event.target as Node))
                setSearchOpen(false);
            if (!addWrapper.current?.contains(event.target as Node))
                setAddOpen(false);
        };
        window.addEventListener('keydown', shortcut);
        document.addEventListener('pointerdown', outside);
        return () => { window.removeEventListener('keydown', shortcut); document.removeEventListener('pointerdown', outside); };
    }, []);
    function open(entry: SearchEntry) { onSelectResult(entry); onQueryChange(''); setSearchOpen(false); }
    const actions = [['新建任务', '安排一个明确行动', onNewTask], ['新建项目', '管理阶段与里程碑', onNewProject], ['写一条笔记', '先记下，再整理', onNewNote], ['收录知识', '笔记与网页摘录', onCapture], ['导入文档', 'PDF、DOCX、Markdown', onImportDocument]] as const;
    return <header className="workspace-topbar">
    <button className="workspace-menu-button" onClick={onMenu} aria-label="打开导航">☰</button>
    <div className="workspace-day-status"><b>{dateLabel}</b></div>
    <div className="workspace-search-wrap" ref={wrapper}>
      <label className="workspace-search"><span aria-hidden="true">⌕</span><input ref={searchRef} role="combobox" aria-label="全局搜索" aria-expanded={searchOpen && Boolean(query.trim())} aria-controls="workspace-search-results" aria-autocomplete="list" aria-activedescendant={searchOpen && results[selected] ? `workspace-result-${selected}` : undefined} value={query} onFocus={() => setSearchOpen(true)} onChange={event => { onQueryChange(event.target.value); setSelected(0); setSearchOpen(true); }} onKeyDown={event => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSearchOpen(true);
                setSelected(index => Math.max(0, Math.min(index + 1, results.length - 1)));
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelected(index => Math.max(0, index - 1));
            }
            if (event.key === 'Enter' && searchOpen && results[selected]) {
                event.preventDefault();
                open(results[selected]);
            }
        }} placeholder="搜索任务、项目、笔记或资料…"/><kbd>Ctrl K</kbd></label>
      {query && <button className="search-clear" aria-label="清空搜索" onClick={() => { onQueryChange(''); searchRef.current?.focus(); }}>×</button>}
      {searchOpen && query.trim() && <div className="workspace-search-results" id="workspace-search-results" role="listbox" aria-label="搜索结果"><p role="presentation">找到 {matches.length} 项{matches.length > 30 ? ' · 显示前 30 项，请补充关键词' : ''}</p>{results.map((entry, index) => <button id={`workspace-result-${index}`} role="option" aria-selected={index === selected} key={`${entry.kind}-${entry.id}`} onMouseEnter={() => setSelected(index)} onClick={() => open(entry)}><em>{entry.kind}</em><span><b>{entry.title}</b><small>{entry.detail}</small></span><i>↗</i></button>)}{!results.length && <p role="presentation">没有找到匹配内容，试试名称、正文或关键词。</p>}</div>}
    </div>
    <div className="workspace-top-actions"><button className="workspace-reminder-button" aria-label={`提醒${props.reminderCount ? `（${props.reminderCount}）` : ''}`} onClick={onReminders}>♢{props.reminderCount > 0 && <i />}</button>
      <div className="workspace-add-wrap" ref={addWrapper}><button className="workspace-add-button" onClick={() => setAddOpen(value => !value)} aria-expanded={addOpen}>＋ <span>快捷新增</span> <i>⌄</i></button>{addOpen && <div className="workspace-add-menu"><p>新增到工作台</p>{actions.map(([title, note, action]) => <button key={title} onClick={() => { setAddOpen(false); action(); }}><span>＋</span><span><b>{title}</b><small>{note}</small></span></button>)}</div>}</div>
      <button className="workspace-top-avatar" onClick={onProfile} aria-label="个人资料">{avatarText}</button>
    </div>
  </header>;
}
