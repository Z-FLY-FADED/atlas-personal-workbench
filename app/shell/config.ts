import type { Theme } from "../contracts/workspace";
export const themeOptions: {
    id: Theme;
    name: string;
    note: string;
    colors: string[];
}[] = [
    {
        id: "ivory",
        name: "月光白",
        note: "默认 · 清爽明亮",
        colors: ["#f4f3ef", "#a97d30", "#20211d"],
    },
    {
        id: "obsidian",
        name: "哑黑金",
        note: "沉静专注",
        colors: ["#10110f", "#d5b168", "#f4f1e9"],
    },
    {
        id: "ocean",
        name: "深海蓝",
        note: "理性科技",
        colors: ["#0c141d", "#66a9d5", "#dfeaf1"],
    },
    {
        id: "forest",
        name: "森林绿",
        note: "自然舒缓",
        colors: ["#0f1712", "#8eb782", "#e4ece2"],
    },
    {
        id: "clay",
        name: "赤陶棕",
        note: "温暖沉稳",
        colors: ["#f2ebe2", "#b9684b", "#302620"],
    },
    {
        id: "plum",
        name: "暮光紫",
        note: "优雅创意",
        colors: ["#17131b", "#bd91c8", "#eee6f0"],
    },
    {
        id: "anime",
        name: "动漫晴空",
        note: "樱色云霞 · 轻盈治愈",
        colors: ["#f6d5e4", "#95c8ec", "#fff7db"],
    },
    {
        id: "scenery",
        name: "远山晨雾",
        note: "山林日出 · 安静自然",
        colors: ["#dcebdc", "#6f9b83", "#f0bd72"],
    },
    {
        id: "cyberpunk",
        name: "赛博朋克",
        note: "霓虹网格 · 未来都市",
        colors: ["#09071a", "#ff3faf", "#37d9ff"],
    },
];
