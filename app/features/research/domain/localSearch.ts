export type ResearchRecord = { kind: string; title: string; content: string; url?: string };
const kinds: Record<string, string[]> = { '任务': ['任务', '待办'], '项目': ['项目'], '笔记': ['笔记', '速记'], '知识': ['知识', '资料', '技术'], '行业': ['行业', '资讯', '新闻'] };
export function searchLocalRecords(query: string, records: ResearchRecord[]) {
    const text = query.replace(/https?:\/\/\S+/g, '').toLowerCase();
    const words = text.match(/[a-z0-9_+-]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
    const phrases = words.flatMap(word => /^[\u4e00-\u9fff]+$/.test(word) && word.length > 3
        ? [word, ...Array.from({ length: word.length - 1 }, (_, index) => word.slice(index, index + 2))] : [word]);
    const tokens = [...new Set(phrases)].filter(word => !['请帮', '帮我', '整理', '查询', '检索', '一下', '有哪些', '最近', '本周', '重要', '信息', '资料'].includes(word));
    return records.map((record, index) => {
        const title = record.title.toLowerCase(), body = record.content.toLowerCase();
        const score = tokens.reduce((sum, word) => sum + (title.includes(word) ? 4 : body.includes(word) ? 1 : 0), 0)
            + (kinds[record.kind]?.some(word => text.includes(word)) ? 2 : 0);
        return { record, score, index };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 12).map(result => result.record);
}
