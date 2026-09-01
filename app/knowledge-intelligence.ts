import { classifyKnowledge, TaxonomyResult } from "./knowledge-taxonomy";

export type KnowledgeIntelligence = TaxonomyResult & {
  title: string;
  summary: string;
  keywords: string[];
  relatedTopics: string[];
};

type KnowledgeLike = {
  id: number;
  title: string;
  summary: string;
  content?: string;
  primaryCategory: string;
  secondaryCategory: string;
  keywords?: string[];
  relatedTopics?: string[];
};

const TOPIC_DICTIONARY = [
  { topic: "电机驱动", terms: ["电机", "PMSM", "FOC", "伺服", "逆变器", "电驱", "转矩", "SVPWM"] },
  { topic: "ROS与中间件", terms: ["ROS", "ROS 1", "ROS 2", "DDS", "QoS", "Topic", "Service", "Action", "Executor", "catkin", "colcon"] },
  { topic: "机器人训练", terms: ["机器人训练", "模仿学习", "行为克隆", "域随机化", "sim-to-real", "专家轨迹", "策略训练"] },
  { topic: "机器人运动", terms: ["机器人", "机械臂", "轨迹", "运动学", "动力学", "雅可比", "关节", "抓取"] },
  { topic: "感知定位", terms: ["传感器", "视觉", "相机", "雷达", "SLAM", "定位", "标定", "融合"] },
  { topic: "嵌入式系统", terms: ["嵌入式", "MCU", "STM32", "RTOS", "中断", "DMA", "GPIO", "ADC", "I2C", "SPI", "UART", "CAN", "固件"] },
  { topic: "机械基础", terms: ["机械基础", "静力学", "动力学", "自由体图", "受力分析", "强度", "应力", "应变", "公差", "机构"] },
  { topic: "机械结构", terms: ["结构", "轴承", "齿轮", "传动", "强度", "应力", "疲劳", "材料", "工艺", "装配"] },
  { topic: "发动机原理", terms: ["发动机", "内燃机", "奥托循环", "四冲程", "燃烧", "喷油", "点火", "进气", "排放"] },
  { topic: "车辆系统", terms: ["车辆", "汽车", "底盘", "悬架", "转向", "制动", "发动机", "电池", "BMS", "热管理"] },
  { topic: "强化学习", terms: ["强化学习", "MDP", "Bellman", "Q-learning", "DQN", "PPO", "SAC", "Actor-Critic", "策略梯度"] },
  { topic: "控制与建模", terms: ["控制", "PID", "状态空间", "稳定性", "仿真", "模型", "Simulink", "数字孪生", "算法"] },
  { topic: "系统工程", terms: ["系统工程", "需求", "架构", "接口", "集成", "验证", "测试", "可靠性", "安全"] },
  { topic: "人工智能", terms: ["人工智能", "AI", "大模型", "LLM", "机器学习", "深度学习", "神经网络", "智能体", "提示词"] },
  { topic: "软件开发", terms: ["代码", "编程", "Python", "TypeScript", "JavaScript", "API", "数据库", "前端", "后端", "软件"] },
  { topic: "项目与方法", terms: ["项目", "任务", "复盘", "计划", "流程", "效率", "管理", "方法", "决策"] },
];

const EXTRA_TERMS = [
  "有限元", "拓扑优化", "公差", "润滑", "故障诊断", "预测维护", "振动", "噪声", "热管理", "电磁兼容",
  "控制器", "观测器", "卡尔曼滤波", "路径规划", "强化学习", "计算机视觉", "点云", "ROS", "通信总线",
  "数据治理", "知识图谱", "向量检索", "检索增强", "微服务", "云计算", "边缘计算", "网络安全",
];

const GENERIC_SENTENCE = /^(本文|本章|内容|主要|相关|介绍|说明|通过|可以|进行|以及|其中|对于|一种)/;

function cleanText(value: string) {
  return value.replace(/https?:\/\/\S+/g, " ").replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`|]/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function splitSentences(value: string) {
  return cleanText(value).split(/(?<=[。！？!?；;])|\n+/).map((sentence) => sentence.replace(/^[\d.、\-\s]+/, "").trim()).filter((sentence) => sentence.length >= 12);
}

export function extractKnowledgeKeywords(value: string, limit = 12) {
  const text = cleanText(value);
  const lower = text.toLowerCase();
  const hits: Array<{ term: string; score: number }> = [];
  for (const group of TOPIC_DICTIONARY) {
    for (const term of group.terms) {
      const index = lower.indexOf(term.toLowerCase());
      if (index >= 0) hits.push({ term, score: (term.length >= 4 ? 5 : 3) + (index < 80 ? 2 : 0) });
    }
  }
  for (const term of EXTRA_TERMS) {
    const index = lower.indexOf(term.toLowerCase());
    if (index >= 0) hits.push({ term, score: 5 + (index < 80 ? 2 : 0) });
  }
  const latin = text.match(/\b[A-Za-z][A-Za-z0-9.+#-]{2,18}\b/g) || [];
  for (const term of latin) {
    if (!/^(the|and|for|with|from|this|that|into|using|use|are|was|were)$/i.test(term)) hits.push({ term, score: /^[A-Z0-9.+#-]+$/.test(term) ? 5 : 2 });
  }
  return unique(hits.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term, "zh-CN")).map((item) => item.term)).slice(0, limit);
}

function buildRelatedTopics(text: string, classification: TaxonomyResult, keywords: string[]) {
  const lower = text.toLowerCase();
  const matched = TOPIC_DICTIONARY.filter((group) => group.terms.some((term) => lower.includes(term.toLowerCase()) || keywords.includes(term))).map((group) => group.topic);
  return unique([classification.secondaryCategory, ...matched]).slice(0, 6);
}

function buildSummary(value: string, keywords: string[], sourceType: string) {
  const sentences = splitSentences(value);
  if (!sentences.length) return sourceType === "网址" ? "已识别网页地址，等待页面正文提取后生成结构化总结。" : "内容信息不足，已保存为待补充知识。";
  const ranked = sentences.map((sentence, index) => {
    let score = Math.max(0, 8 - index);
    score += keywords.filter((keyword) => sentence.toLowerCase().includes(keyword.toLowerCase())).length * 3;
    if (/原理|原因|本质|模型|方法|步骤|结果|结论|适用|限制|风险|验证|应用/.test(sentence)) score += 4;
    if (/\d|[%°Ω]|=|→/.test(sentence)) score += 2;
    if (sentence.length >= 24 && sentence.length <= 120) score += 2;
    if (GENERIC_SENTENCE.test(sentence)) score -= 1;
    return { sentence: sentence.replace(/[。；;]$/, ""), index, score };
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).sort((a, b) => a.index - b.index);
  const summary = ranked.map((item) => item.sentence).join("；");
  return `${summary.slice(0, 260)}${summary.length > 260 ? "…" : "。"}`;
}

function buildTitle(value: string, keywords: string[], fallback: string) {
  const firstLine = value.split(/\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find((line) => line.length >= 4 && line.length <= 42 && !/^https?:\/\//.test(line));
  if (firstLine) return firstLine.replace(/[。；;：:]$/, "");
  const firstSentence = splitSentences(value)[0]?.replace(/[。；;：:]$/, "");
  if (firstSentence && firstSentence.length <= 38) return firstSentence;
  if (keywords.length) return `${keywords.slice(0, 3).join(" · ")}知识整理`;
  return fallback || "新收录知识";
}

export function analyzeKnowledgeContent(input: { title?: string; content: string; sourceType?: string; summaryHint?: string }): KnowledgeIntelligence {
  const submittedTitle = String(input.title || "").trim();
  const combined = `${submittedTitle} ${input.summaryHint || ""} ${input.content}`;
  const keywords = extractKnowledgeKeywords(combined);
  const classification = classifyKnowledge(combined);
  const relatedTopics = buildRelatedTopics(combined, classification, keywords);
  const genericTitle = !submittedTitle || /新收录内容|未命名知识|新收录知识/.test(submittedTitle);
  return {
    ...classification,
    title: genericTitle ? buildTitle(input.content, keywords, submittedTitle) : submittedTitle,
    summary: buildSummary(`${input.summaryHint || ""} ${input.content}`, keywords, input.sourceType || "手动输入"),
    keywords,
    relatedTopics,
  };
}

export function rankKnowledgeRelations(current: KnowledgeLike, items: KnowledgeLike[], limit = 6) {
  const currentKeywords = current.keywords?.length ? current.keywords : extractKnowledgeKeywords(`${current.title} ${current.summary} ${current.content || ""}`);
  const currentTopics = current.relatedTopics || [];
  return items.filter((item) => item.id !== current.id).map((item) => {
    const keywords = item.keywords?.length ? item.keywords : extractKnowledgeKeywords(`${item.title} ${item.summary} ${item.content || ""}`);
    const topics = item.relatedTopics || [];
    const sharedKeywords = currentKeywords.filter((keyword) => keywords.some((candidate) => candidate.toLowerCase() === keyword.toLowerCase()));
    const sharedTopics = currentTopics.filter((topic) => topics.includes(topic));
    let score = sharedKeywords.length * 4 + sharedTopics.length * 3;
    if (current.secondaryCategory === item.secondaryCategory) score += 6;
    else if (current.primaryCategory === item.primaryCategory) score += 3;
    return { id: item.id, score, sharedKeywords, sharedTopics };
  }).filter((item) => item.score >= 4).sort((a, b) => b.score - a.score || b.id - a.id).slice(0, limit);
}
