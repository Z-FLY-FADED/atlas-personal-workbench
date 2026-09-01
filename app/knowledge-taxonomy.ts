export type TaxonomyResult = {
  primaryCategory: string;
  secondaryCategory: string;
  confidence: number;
};

export const KNOWLEDGE_TAXONOMY = [
  { name: "机械", icon: "⚙", color: "#d5b168", children: ["机械基础", "结构设计", "传动机构", "材料与工艺"] },
  { name: "电气", icon: "ϟ", color: "#b8a3dc", children: ["电机与驱动", "电气控制", "配电与安全"] },
  { name: "机器人", icon: "⌘", color: "#75a6ac", children: ["ROS与中间件", "机器人训练", "运动控制", "感知与定位", "机器人学"] },
  { name: "车辆", icon: "◒", color: "#c58b72", children: ["发动机与动力", "整车系统", "底盘与动力", "新能源汽车"] },
  { name: "系统", icon: "◎", color: "#7fa486", children: ["智能算法", "系统工程", "仿真与建模", "控制理论", "产品与架构", "知识管理"] },
  { name: "嵌入式", icon: "▣", color: "#7f9cc5", children: ["MCU与固件", "RTOS与通信", "硬件接口"] },
  { name: "通用", icon: "◇", color: "#999b94", children: ["项目管理", "工作方法", "未分类"] },
] as const;

const RULES = [
  { primary: "机械", keywords: ["机械", "齿轮", "轴承", "结构", "强度", "应力", "材料", "加工", "装配", "传动", "液压", "静力学", "动力学", "自由体图", "公差"], children: [
    { name: "机械基础", words: ["机械基础", "静力学", "动力学", "自由体图", "受力分析", "应力", "应变", "公差", "机构"] },
    { name: "结构设计", words: ["结构", "强度", "应力", "有限元", "尺寸", "载荷"] },
    { name: "传动机构", words: ["齿轮", "轴承", "传动", "丝杠", "减速器", "液压"] },
    { name: "材料与工艺", words: ["材料", "加工", "焊接", "热处理", "工艺", "装配"] },
  ] },
  { primary: "电气", keywords: ["电气", "电机", "驱动", "变频", "继电器", "接触器", "配电", "电压", "电流", "PLC", "伺服"], children: [
    { name: "电机与驱动", words: ["电机", "伺服", "变频", "驱动", "逆变器"] },
    { name: "电气控制", words: ["PLC", "继电器", "接触器", "梯形图", "电气控制"] },
    { name: "配电与安全", words: ["配电", "电压", "电流", "断路器", "接地", "安全"] },
  ] },
  { primary: "机器人", keywords: ["机器人", "机械臂", "轨迹", "运动学", "SLAM", "导航", "视觉", "定位", "ROS", "DDS", "QoS", "抓取", "模仿学习", "机器人训练", "sim-to-real"], children: [
    { name: "ROS与中间件", words: ["ROS", "ROS 1", "ROS 2", "DDS", "QoS", "Topic", "Service", "Action", "Executor", "catkin", "colcon"] },
    { name: "机器人训练", words: ["机器人训练", "模仿学习", "行为克隆", "域随机化", "sim-to-real", "专家轨迹", "策略训练"] },
    { name: "运动控制", words: ["轨迹", "运动控制", "机械臂", "抓取", "关节"] },
    { name: "感知与定位", words: ["SLAM", "导航", "视觉", "定位", "雷达", "传感"] },
    { name: "机器人学", words: ["机器人", "运动学", "动力学", "雅可比"] },
  ] },
  { primary: "车辆", keywords: ["车辆", "汽车", "底盘", "悬架", "转向", "制动", "发动机", "内燃机", "奥托循环", "燃烧", "喷油", "点火", "电池", "整车", "新能源", "车身"], children: [
    { name: "发动机与动力", words: ["发动机", "内燃机", "奥托循环", "四冲程", "燃烧", "喷油", "点火", "进气", "排放", "增压"] },
    { name: "整车系统", words: ["整车", "车身", "车辆", "汽车", "热管理"] },
    { name: "底盘与动力", words: ["底盘", "悬架", "转向", "制动", "发动机", "动力"] },
    { name: "新能源汽车", words: ["新能源", "电池", "电驱", "充电", "BMS"] },
  ] },
  { primary: "系统", keywords: ["系统", "架构", "仿真", "模型", "Simulink", "控制", "算法", "强化学习", "机器学习", "DQN", "PPO", "SAC", "Bellman", "需求", "产品", "知识", "数据"], children: [
    { name: "智能算法", words: ["算法", "强化学习", "机器学习", "深度学习", "MDP", "Bellman", "Q-learning", "DQN", "PPO", "SAC", "策略梯度"] },
    { name: "系统工程", words: ["系统工程", "需求", "验证", "接口", "集成"] },
    { name: "仿真与建模", words: ["仿真", "模型", "Simulink", "建模", "数字孪生"] },
    { name: "控制理论", words: ["控制", "PID", "状态空间", "稳定性", "控制器"] },
    { name: "产品与架构", words: ["产品", "架构", "PWA", "平台", "服务", "数据"] },
    { name: "知识管理", words: ["知识", "总结", "分类", "检索", "沉淀"] },
  ] },
  { primary: "嵌入式", keywords: ["嵌入式", "MCU", "单片机", "固件", "RTOS", "CAN", "串口", "SPI", "I2C", "芯片", "传感器"], children: [
    { name: "MCU与固件", words: ["MCU", "单片机", "固件", "芯片", "启动"] },
    { name: "RTOS与通信", words: ["RTOS", "CAN", "串口", "通信", "协议", "任务调度"] },
    { name: "硬件接口", words: ["SPI", "I2C", "GPIO", "ADC", "传感器", "接口"] },
  ] },
];

function score(text: string, words: string[]) {
  return words.reduce((total, word) => total + (text.toLowerCase().includes(word.toLowerCase()) ? (word.length > 2 ? 3 : 2) : 0), 0);
}

export function classifyKnowledge(input: string): TaxonomyResult {
  const text = input.replace(/\s+/g, " ");
  const ranked = RULES.map((rule) => ({ rule, value: score(text, rule.keywords) })).sort((a, b) => b.value - a.value);
  if (!ranked[0] || ranked[0].value === 0) {
    const secondaryCategory = /计划|项目|任务|复盘|进度/.test(text) ? "项目管理" : /方法|效率|习惯|流程/.test(text) ? "工作方法" : "未分类";
    return { primaryCategory: "通用", secondaryCategory, confidence: secondaryCategory === "未分类" ? 52 : 72 };
  }
  const { rule, value } = ranked[0];
  const child = rule.children.map((item) => ({ name: item.name, value: score(text, item.words) })).sort((a, b) => b.value - a.value)[0];
  return { primaryCategory: rule.primary, secondaryCategory: child?.value ? child.name : rule.children[0].name, confidence: Math.min(97, 66 + value * 3) };
}
