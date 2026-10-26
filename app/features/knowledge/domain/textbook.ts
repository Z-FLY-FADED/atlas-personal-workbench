import type { Knowledge } from "../../../contracts/workspace";
import { motorMechanicalTheory } from "../components/TextbookSections";
import type { KnowledgeEnrichment } from "./enrichment";
import { enrichKnowledge } from "./enrichment";
export function buildKnowledgeDigest(item: Knowledge) {
    const digest = { ...enrichKnowledge(item), ...(item.enrichment || {}) };
    if (!/电机|PMSM|FOC|矢量控制/i.test(`${item.title} ${item.summary} ${item.secondaryCategory}`))
        return digest;
    const existingTitles = new Set(digest.theorySections.map((section) => section.title));
    return {
        ...digest,
        learningObjectives: [
            ...new Set([
                ...digest.learningObjectives,
                "识别电机定子、转子、转轴、轴承、机壳、端盖、冷却和密封结构",
                "建立转矩、径向力、轴向力与热量在电机总成中的传递路径",
                "校核转子强度、轴系临界转速、轴承寿命、气隙和装配公差",
            ]),
        ],
        theorySections: [
            ...digest.theorySections,
            ...motorMechanicalTheory.filter((section) => !existingTitles.has(section.title)),
        ],
        engineeringChecklist: [
            ...new Set([
                ...digest.engineeringChecklist,
                "画出电机转矩、径向载荷、轴向载荷与热流四条传递路径",
                "校核磁钢保持、转子桥和护套在最高转速及超速工况下的强度",
                "完成转轴弯扭合成、疲劳、挠度和临界转速校核",
                "检查轴承固定—浮动配置、游隙/预紧、配合与电蚀风险",
                "以公差链、热变形和电磁拉力共同校核最小气隙",
                "验证机壳与端盖模态、动平衡、温升、密封和耐久性能",
            ]),
        ],
    };
}
export function getKnowledgeSphereLabel(item: Knowledge) {
    const text = `${item.title} ${item.secondaryCategory}`;
    const knownLabels: Array<[
        RegExp,
        string
    ]> = [
        [/ROS\s*机器人操作系统|ROS\s*[12]|ROS与中间件/i, "ROS"],
        [/STM32.*CAN/i, "STM32 · CAN通信"],
        [/RTOS\s*调度|RTOS与通信/i, "RTOS"],
        [/MCU.*DMA|MCU与固件/i, "MCU"],
        [/GPIO.*ADC.*PWM|硬件接口/i, "硬件接口"],
        [/永磁同步电机|PMSM|FOC/i, "矢量控制"],
        [/机械臂.*轨迹|五次多项式/i, "轨迹规划"],
        [/齿轮箱.*轴承|轴承寿命/i, "轴承寿命"],
        [/车辆悬架|四分之一车/i, "悬架建模"],
        [/控制系统稳定性|根轨迹.*频域/i, "稳定性分析"],
        [/四冲程发动机|奥托循环/i, "四冲程"],
        [/空气.*燃油.*点火|排放控制/i, "排放控制"],
        [/机器人训练/i, "机器人训练"],
        [/强化学习基础|Bellman/i, "强化学习"],
        [/强化学习算法选型|DQN.*PPO.*SAC/i, "算法选型"],
        [/机械设计基础/i, "机械设计"],
        [/机械基础.*受力|受力分析/i, "受力分析"],
    ];
    return (knownLabels.find(([pattern]) => pattern.test(text))?.[1] ||
        item.secondaryCategory ||
        item.title.split(/[：:]/, 1)[0].trim());
}
export type TextbookExercise = {
    kind: "概念题" | "分析题" | "计算题" | "设计题" | "实验题";
    question: string;
    guidance: string;
};
export function buildTextbookFrame(item: Knowledge, digest: KnowledgeEnrichment) {
    const prerequisites: Record<string, string[]> = {
        机械: ["高等数学", "理论力学", "材料力学", "机械原理"],
        电气: ["高等数学", "电路基础", "电磁场基础", "自动控制原理"],
        机器人: ["线性代数", "理论力学", "机器人学基础", "自动控制原理"],
        车辆: ["理论力学", "机械原理", "汽车构造", "自动控制原理"],
        系统: ["高等数学", "线性代数", "信号与系统", "自动控制原理"],
        嵌入式: ["C语言程序设计", "数字电路", "计算机组成原理", "数据结构"],
        算法: ["高等数学", "线性代数", "概率论", "程序设计基础"],
    };
    const chapterOrder = [
        "机械",
        "电气",
        "机器人",
        "车辆",
        "系统",
        "嵌入式",
        "算法",
        "通用",
    ];
    const chapterNumber = String(Math.max(1, chapterOrder.indexOf(item.primaryCategory) + 1)).padStart(2, "0");
    const concepts = [
        ...digest.principles.slice(0, 4).map((principle) => ({
            term: principle.title,
            definition: principle.explanation,
        })),
        ...digest.equations.slice(0, 2).map((equation) => ({
            term: equation.name,
            definition: equation.interpretation,
        })),
    ];
    const firstPrinciple = digest.principles[0];
    const firstEquation = digest.equations[0];
    const firstMethod = digest.mainstreamMethods[0];
    const firstApplication = digest.applications[0];
    const exercises: TextbookExercise[] = [
        {
            kind: "概念题",
            question: `结合前述定义，说明“${firstPrinciple?.title || item.title}”的物理含义、成立条件及其与系统性能的关系。`,
            guidance: "先给出严格定义，再沿输入—状态—输出的因果链解释；不要只复述结论。",
        },
        {
            kind: "分析题",
            question: `画出${item.title}的系统边界与主要能量、信息或载荷传递路径，并标出关键状态量。`,
            guidance: "图中至少应包含输入、核心部件或算法、约束、扰动和可测输出。",
        },
        {
            kind: "计算题",
            question: firstEquation
                ? `从“${firstEquation.assumptions[0] || "当前建模假设"}”出发推导${firstEquation.name}，检查量纲，并更换一组参数完成复算。`
                : `依据当前数学模型建立一组可计算参数，完成结果、单位和数量级校核。`,
            guidance: "按已知条件、基本定律、代数整理、数值代入和结果判断五步书写。",
        },
        {
            kind: "设计题",
            question: `面向“${firstApplication?.scenario || "典型工程场景"}”，比较${firstMethod?.name || "两种主流方法"}与另一种可行方案，给出选型、参数和验收指标。`,
            guidance: "必须说明选择依据、适用边界、资源代价、失效模式和验证方法。",
        },
        {
            kind: "实验题",
            question: `依据前述验证方案设计一个可复现实验，判断${item.title}的模型、代码或结构是否满足工程要求。`,
            guidance: "列出仪器或软件、变量控制、采样方法、评价指标、误差来源和通过准则。",
        },
    ];
    return {
        chapterNumber,
        prerequisites: prerequisites[item.primaryCategory] || [
            "高等数学",
            "工程基础",
            "专业导论",
        ],
        concepts,
        guideQuestions: [
            `当前研究对象的系统边界、输入、输出和主要约束分别是什么？`,
            `${firstPrinciple?.title || "核心机理"}如何从基本定律推导到可计算模型？`,
            `模型、方法和工程实现之间如何形成可验证的闭环？`,
        ],
        exercises,
    };
}
