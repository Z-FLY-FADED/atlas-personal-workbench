export const REPEAT_RULES = { none: '不重复', daily: '每天', weekdays: '工作日', weekly: '每周' } as const;
export type RepeatRule = keyof typeof REPEAT_RULES;
export function validDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function nextOccurrence(rule: RepeatRule, activeOn: string, today: string) {
    if (rule === 'none')
        return '';
    const start = validDate(activeOn) ? activeOn : today;
    const day = 86400000;
    let next = Math.max(Date.parse(start), Date.parse(today)) + day;
    if (rule === 'weekly')
        next = Date.parse(start) + Math.max(1, Math.floor((Date.parse(today) - Date.parse(start)) / (7 * day)) + 1) * 7 * day;
    if (rule === 'weekdays')
        while ([0, 6].includes(new Date(next).getUTCDay()))
            next += day;
    return new Date(next).toISOString().slice(0, 10);
}
export const HOME_WIDGETS = { tasks: '今日任务', projects: '项目进度', knowledge: '最近资料', calendar: '日历', notes: '快速笔记', reminders: '倒计时', focus: '专注计时' } as const;
export type WidgetKey = keyof typeof HOME_WIDGETS;
export type HomeLayout = {
    main: WidgetKey[];
    side: WidgetKey[];
    hidden: WidgetKey[];
};
export const DEFAULT_LAYOUT: HomeLayout = { main: ['tasks', 'projects', 'knowledge'], side: ['calendar', 'notes', 'reminders', 'focus'], hidden: [] };
export function normalizeLayout(input: unknown): HomeLayout {
    const data = input as Partial<HomeLayout> | null;
    const section = (key: 'main' | 'side') => {
        const received = Array.isArray(data?.[key]) ? data[key] : [];
        return [...new Set([...received.filter(item => DEFAULT_LAYOUT[key].includes(item)), ...DEFAULT_LAYOUT[key]])];
    };
    return { main: section('main'), side: section('side'), hidden: Array.isArray(data?.hidden) ? [...new Set(data.hidden.filter(key => Object.hasOwn(HOME_WIDGETS, key)))] : [] };
}
export function safeWebUrl(value: string) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    }
    catch {
        return '';
    }
}
