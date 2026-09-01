import { buildLectureDetail, LectureDetail } from "./knowledge-lectures";
import { buildEvidenceReport, EvidenceReport } from "./knowledge-evidence";
import { buildProfessionalKnowledge, ProfessionalKnowledge } from "./knowledge-professional";

export type KnowledgeEnrichment = LectureDetail & ProfessionalKnowledge & {
  evidence: EvidenceReport;
  completeness: number;
  autoFilled: string[];
  background: string;
  keyPoints: string[];
  steps: string[];
  verification: string;
  boundaries: string[];
  application: string;
  takeaway: string;
  relatedTopics: string[];
  beginnerIntro: string;
  principles: Array<{ title: string; explanation: string }>;
  mainstreamMethods: Array<{ name: string; idea: string; suitable: string; tradeoff: string }>;
  learningPath: string[];
  example: string;
};

type Template = Omit<KnowledgeEnrichment, "evidence" | "completeness" | "autoFilled" | "keyPoints" | "takeaway" | "beginnerIntro" | "principles" | "mainstreamMethods" | "learningPath" | "example" | keyof LectureDetail | keyof ProfessionalKnowledge>;

const templates: Record<string, Template> = {
  机械: {
    background: "机械问题需要先明确载荷路径、结构约束、材料与制造条件，再判断计算模型是否适用。",
    steps: ["定义工况、边界条件和失效判据", "完成受力、运动或结构参数分析", "通过仿真、样机或试验迭代设计"],
    verification: "建议同时进行手算复核、有限元或运动学仿真，并以尺寸检测、载荷试验或寿命试验验证关键结论。",
    boundaries: ["结论只适用于已声明的载荷和约束条件", "材料、温度、冲击与制造误差会改变结果", "安全系数不能替代失效模式分析"],
    application: "可用于结构设计、零部件选型、强度与寿命校核以及制造方案评审。",
    relatedTopics: ["材料与强度", "公差与装配", "试验验证"],
  },
  电气: {
    background: "电气问题应从供电、信号链、控制回路和保护机制四个层面建立完整边界。",
    steps: ["确认电源、负载、接口与安全要求", "分层检查硬件、采样和控制参数", "用波形、日志和极限工况完成闭环验证"],
    verification: "建议记录关键节点波形、电流、电压、温升与故障码，并覆盖启动、稳态、扰动和保护动作测试。",
    boundaries: ["额定参数不代表所有瞬态工况都安全", "采样误差、时延和电磁干扰会影响判断", "上电调试必须保留限流与保护措施"],
    application: "可用于电气方案、驱动控制、回路调试、保护设计和现场故障诊断。",
    relatedTopics: ["电源与保护", "电机驱动", "信号与EMC"],
  },
  机器人: {
    background: "机器人知识通常跨越机构、运动学、动力学、感知和实时控制，需要明确模型与真实系统之间的差异。",
    steps: ["定义任务空间目标、约束和评价指标", "建立模型并选择规划或控制方法", "在仿真和真机上逐级验证精度、稳定性与安全性"],
    verification: "建议对轨迹误差、速度加速度峰值、控制周期、碰撞边界和重复定位精度进行量化验证。",
    boundaries: ["仿真结果不能直接等同于真机表现", "负载、摩擦、标定误差和通信时延需要纳入测试", "安全限位与急停逻辑应独立验证"],
    application: "可用于机器人建模、轨迹规划、运动控制、感知融合和应用部署。",
    relatedTopics: ["运动控制", "感知与标定", "安全与验证"],
  },
  车辆: {
    background: "车辆系统分析需要同时考虑动力学性能、能量流、道路输入、驾驶工况和法规安全要求。",
    steps: ["确定整车指标、工况和系统边界", "建立部件与整车层级模型", "通过仿真、台架和道路试验交叉验证"],
    verification: "建议覆盖典型与极限工况，对模型参数、传感数据、能耗、热状态和操稳指标进行一致性检查。",
    boundaries: ["单一工况不能代表完整车辆性能", "轮胎、路面、温度与驾驶行为会显著影响结果", "法规与安全要求优先于局部性能优化"],
    application: "可用于整车性能分析、底盘与动力系统设计、控制策略开发及试验验证。",
    relatedTopics: ["车辆动力学", "能量管理", "道路试验"],
  },
  系统: {
    background: "系统问题应先明确目标、接口、状态、约束和评价指标，再处理局部算法或部件设计。",
    steps: ["定义系统边界、需求和可观测指标", "建立功能、逻辑或数学模型", "开展场景、参数摄动与故障条件验证"],
    verification: "建议使用需求追踪、接口测试、模型对比和异常注入，确认系统在正常与退化状态下均可解释。",
    boundaries: ["局部最优不一定等于系统最优", "接口假设和时序约束必须显式记录", "模型有效范围外的结论需要重新验证"],
    application: "可用于系统建模、架构设计、控制器开发、接口评审和跨专业集成。",
    relatedTopics: ["系统架构", "控制理论", "需求与测试"],
  },
  嵌入式: {
    background: "嵌入式问题需要联动检查硬件接口、时钟、驱动、任务调度、通信和资源限制。",
    steps: ["确认硬件版本、接口和时序基线", "分层定位驱动、协议、任务与应用逻辑", "通过日志、示波器和压力测试复现并验证"],
    verification: "建议记录可复现步骤、寄存器与日志证据，并覆盖长时间运行、异常重启、通信干扰和资源耗尽场景。",
    boundaries: ["一次成功运行不能证明实时性与稳定性", "编译配置、硬件版本和时钟差异必须记录", "故障恢复和看门狗策略需要独立测试"],
    application: "可用于固件开发、接口调试、实时通信、资源优化和现场故障排查。",
    relatedTopics: ["驱动与接口", "RTOS与通信", "可靠性测试"],
  },
  通用: {
    background: "先明确问题背景、输入条件、目标输出和适用范围，才能让知识被准确理解和复用。",
    steps: ["定义问题和已知条件", "提炼方法、证据与关键结论", "通过实例或可靠来源验证后再复用"],
    verification: "建议保留原始来源、检查关键事实，并用实例、数据或交叉来源确认结论。",
    boundaries: ["区分事实、经验和推断", "缺少来源的数字与结论应标记待验证", "应用到新场景前需要重新检查条件"],
    application: "可用于项目复盘、方法复用、团队协作和个人知识积累。",
    relatedTopics: ["问题定义", "证据验证", "方法复用"],
  },
};

type LearningGuide = Pick<KnowledgeEnrichment, "beginnerIntro" | "principles" | "mainstreamMethods" | "learningPath" | "example">;

const categoryGuides: Record<string, LearningGuide> = {
  机械: {
    beginnerIntro: "机械知识可以先抓住三个问题：力从哪里来、经过哪些零件传递、最终会以哪种方式变形或失效。先画清受力和运动关系，再使用公式或软件。",
    principles: [{ title: "载荷路径", explanation: "外力会沿结构和连接件传递。路径不清，强度计算和零件选型就容易漏项。" }, { title: "约束与自由度", explanation: "机构能怎样运动，取决于关节和支撑限制了哪些自由度；多约束还可能引入装配内力。" }, { title: "失效模式", explanation: "屈服、疲劳、磨损、失稳和断裂的机理不同，必须针对真实失效模式选择判据。" }],
    mainstreamMethods: [{ name: "解析计算", idea: "把结构简化为梁、轴、齿轮或弹簧等模型，用公式快速估算。", suitable: "方案早期与尺寸初选", tradeoff: "速度快、可解释，但复杂边界需要做合理简化。" }, { name: "CAE仿真", idea: "使用有限元或多体动力学计算应力、变形和运动响应。", suitable: "复杂结构和多工况比较", tradeoff: "细节丰富，但结果高度依赖网格、接触和边界条件。" }, { name: "试验验证", idea: "通过应变、载荷、振动或寿命试验验证真实表现。", suitable: "定型、认证和高风险部件", tradeoff: "证据直接，但成本和周期较高。" }],
    learningPath: ["先学受力图、力矩和材料基本性质", "掌握常见机构、连接与失效模式", "练习手算与仿真结果互相校核", "用实际样件完成一次测试闭环"],
    example: "例如校核一根传动轴：先求扭矩和弯矩，再分别检查静强度与疲劳，最后结合轴承、键槽和试验工况复核。",
  },
  电气: {
    beginnerIntro: "电气系统可以理解为能量和信息同时流动：电源提供能量，传感器提供信息，控制器做决定，驱动器执行动作，保护电路负责在异常时切断风险。",
    principles: [{ title: "能量转换", explanation: "电压、电流和功率决定器件负担，损耗最终通常表现为温升。" }, { title: "闭环控制", explanation: "测量值与目标值比较后产生控制量，带宽、延迟和饱和决定响应与稳定性。" }, { title: "保护与安全", explanation: "过流、过压、过温和绝缘问题需要硬件与软件双重保护，不能只依赖控制算法。" }],
    mainstreamMethods: [{ name: "等效电路与公式", idea: "用电阻、电感、电容和受控源建立可解释模型。", suitable: "选型、稳态和初步动态分析", tradeoff: "直观快速，但难覆盖复杂开关和非线性。" }, { name: "电路/控制仿真", idea: "在仿真中观察波形、环路和极限工况。", suitable: "控制器设计和参数扫描", tradeoff: "便于迭代，但模型参数必须来自实测或可靠资料。" }, { name: "仪器测量", idea: "使用示波器、万用表、功率分析仪和电流探头采集证据。", suitable: "调试和故障定位", tradeoff: "最接近真实系统，但探头接法和带宽会影响结果。" }],
    learningPath: ["掌握电压、电流、功率和基本器件", "理解采样、驱动、反馈与保护链路", "学习阅读原理图和关键波形", "完成一次从仿真到上电调试的闭环"],
    example: "调试电机驱动时，先确认母线与采样正常，再验证PWM和电流环，最后增加速度环并逐步提高负载。",
  },
  机器人: {
    beginnerIntro: "机器人本质上是让机械结构在感知和控制下完成任务。最常见的学习顺序是：先算位置，再规划怎么走，然后控制电机跟上轨迹。",
    principles: [{ title: "运动学", explanation: "描述关节角度与末端位置姿态的几何关系，不考虑力和质量。" }, { title: "动力学与控制", explanation: "质量、惯量、摩擦和外力决定需要多大驱动力，控制器负责抑制误差。" }, { title: "感知与标定", explanation: "编码器、相机和力传感器提供反馈；坐标系或零位标定错误会直接变成运动误差。" }],
    mainstreamMethods: [{ name: "解析建模", idea: "使用运动学、雅可比和动力学方程求解。", suitable: "结构明确、实时性要求高", tradeoff: "可解释且快，但复杂约束下推导困难。" }, { name: "数值优化", idea: "把轨迹、碰撞和能耗写成约束优化问题。", suitable: "多约束轨迹和复杂任务", tradeoff: "表达能力强，但计算量和初值敏感性较高。" }, { name: "学习与数据驱动", idea: "从示教、仿真或运行数据学习策略和模型补偿。", suitable: "难建模感知与复杂操作", tradeoff: "适应性好，但数据质量、泛化和安全验证要求高。" }],
    learningPath: ["建立坐标系并掌握正逆运动学", "理解轨迹插值、速度和加速度约束", "学习PID、前馈和基本动力学补偿", "在仿真、低速真机和正常工况中逐级验证"],
    example: "机械臂抓取任务可分为目标识别、坐标变换、逆运动学、无碰轨迹、关节跟踪和抓取确认六个环节。",
  },
  车辆: {
    beginnerIntro: "车辆是轮胎与道路作用下的复杂系统。学习时先看力和能量如何在车身、悬架、轮胎和动力系统之间传递，再看控制策略如何改变响应。",
    principles: [{ title: "轮胎—道路作用", explanation: "车辆加速、制动和转向最终都依靠轮胎力，附着条件决定性能上限。" }, { title: "质量与载荷转移", explanation: "加减速和转弯会改变各车轮载荷，从而影响抓地、舒适和稳定性。" }, { title: "多目标权衡", explanation: "舒适性、操稳、能耗、成本和安全常相互制约，需要用工况和指标综合评价。" }],
    mainstreamMethods: [{ name: "低阶理论模型", idea: "使用四分之一车、单轨或纵向模型抓住主要关系。", suitable: "原理学习和控制器初设", tradeoff: "清晰快速，但会忽略结构和非线性细节。" }, { name: "整车仿真", idea: "联合车辆、动力系统、控制器和道路工况。", suitable: "系统方案和大量工况评估", tradeoff: "效率高，但参数标定和模型一致性工作量大。" }, { name: "台架与道路试验", idea: "通过测功机、K&C、硬件在环和实车采集真实响应。", suitable: "标定、法规和最终验证", tradeoff: "可信度高，但安全、成本和可重复性要求严格。" }],
    learningPath: ["掌握纵向、侧向和垂向基本受力", "学习常见低阶车辆模型", "理解传感、控制和评价指标", "用仿真与试验数据完成模型校准"],
    example: "分析悬架时可先用四分之一车模型观察车身加速度、悬架行程和轮胎动载荷，再逐步增加非线性和整车耦合。",
  },
  系统: {
    beginnerIntro: "系统方法关注的不是单个零件，而是输入经过系统后怎样产生输出，以及反馈、延迟和不确定性怎样改变结果。",
    principles: [{ title: "输入—状态—输出", explanation: "输入驱动内部状态变化，状态共同决定可观察输出；状态比单一输出包含更多系统信息。" }, { title: "反馈", explanation: "反馈能减小误差和抗扰，但增益过高、延迟过大也可能引发振荡或不稳定。" }, { title: "稳定性与鲁棒性", explanation: "稳定表示扰动后能回到可接受状态，鲁棒性表示参数变化时仍保持性能。" }],
    mainstreamMethods: [{ name: "时域方法", idea: "观察阶跃、脉冲和状态随时间的变化。", suitable: "响应速度、超调和稳态误差", tradeoff: "直观，但复杂频率特性不易一眼看出。" }, { name: "频域方法", idea: "用Bode、Nyquist和裕度分析不同频率下的增益与相位。", suitable: "稳定裕度、带宽和抗噪", tradeoff: "工程设计成熟，但通常基于线性模型。" }, { name: "状态空间方法", idea: "用状态方程处理多输入多输出、观测器和最优控制。", suitable: "复杂现代控制系统", tradeoff: "扩展能力强，但依赖状态建模和矩阵基础。" }],
    learningPath: ["理解微分方程、传递函数和反馈", "掌握极点、阶跃响应和稳定判据", "学习Bode图与稳定裕度", "进入状态空间、观测器和鲁棒控制"],
    example: "设计速度控制器时，可先看阶跃响应，再用Bode图检查带宽与裕度，最后对负载变化和采样延迟做鲁棒性测试。",
  },
  嵌入式: {
    beginnerIntro: "嵌入式系统就是在资源有限的芯片上，让硬件接口、驱动程序、实时任务和通信协议按确定时序协同工作。排错时最好从物理层一路向应用层检查。",
    principles: [{ title: "分层结构", explanation: "硬件、驱动、协议、任务和应用逐层依赖；底层错误往往会伪装成上层逻辑问题。" }, { title: "时序与状态", explanation: "中断、任务和外设都在特定时间改变状态，竞态、阻塞和超时是常见故障来源。" }, { title: "可观测性", explanation: "日志、GPIO标记、寄存器和总线波形让内部状态变得可见，是可靠排错的基础。" }],
    mainstreamMethods: [{ name: "分层排查", idea: "从供电、引脚和波形开始，再检查驱动、协议、任务和应用。", suitable: "大多数通信与外设故障", tradeoff: "稳定通用，但需要严格记录每层证据。" }, { name: "调试器与日志", idea: "通过断点、变量、断言、事件追踪和故障寄存器定位状态。", suitable: "软件逻辑、时序和异常复现", tradeoff: "信息丰富，但断点可能改变实时行为。" }, { name: "总线分析与故障注入", idea: "使用逻辑分析仪、总线工具或HIL主动制造丢包、超时和错误帧。", suitable: "协议、鲁棒性和恢复测试", tradeoff: "最能验证边界，但需要额外设备和测试设计。" }],
    learningPath: ["掌握GPIO、时钟、中断和常用外设", "理解驱动、状态机和通信分层", "学习RTOS调度、同步和超时", "建立日志、压力测试与故障注入习惯"],
    example: "排查CAN时，先测供电和CANH/CANL，再核对终端电阻与波特率，随后检查过滤器、中断和错误状态寄存器。",
  },
  通用: {
    beginnerIntro: "先用一句话说清它解决什么问题，再理解原理、比较方法、动手验证，最后记录适用条件。这样比只记结论更容易迁移到新场景。",
    principles: [{ title: "问题定义", explanation: "明确对象、目标、输入和限制，避免用正确方法解决错误问题。" }, { title: "因果与证据", explanation: "区分相关性和因果关系，让关键结论能被来源、数据或实验支持。" }, { title: "迁移边界", explanation: "任何方法都有适用条件，换场景时需要重新检查假设。" }],
    mainstreamMethods: [{ name: "原理推导", idea: "从定义、因果关系和模型理解知识。", suitable: "建立长期可迁移理解", tradeoff: "扎实但学习门槛较高。" }, { name: "案例学习", idea: "通过完整例子连接问题、方法和结果。", suitable: "快速入门和建立直觉", tradeoff: "容易受单一案例限制，需要总结通用规律。" }, { name: "实践验证", idea: "用练习、实验或项目检验掌握程度。", suitable: "形成可执行能力", tradeoff: "反馈真实，但需要时间和明确评价标准。" }],
    learningPath: ["先建立术语和问题地图", "理解核心原理与典型方法", "完成一个最小可运行案例", "复盘失败点并总结适用边界"],
    example: "学习一个新概念时，可以先解释给完全不了解的人听，再用一个反例检查自己是否真正理解。",
  },
};

const topicGuides: Array<{ match: RegExp; guide: Partial<LearningGuide> }> = [
  { match: /CAN|控制器局域网/i, guide: {
    beginnerIntro: "CAN可以把它想成一间所有节点共用的会议室：谁都能发言，消息不是按接收人地址发送，而是用消息ID说明“这是什么数据”；所有节点决定自己是否接收。",
    principles: [{ title: "差分物理层", explanation: "CANH与CANL用电压差表示信号，能够抵抗共模干扰。总线两端通常各放置120Ω终端电阻，用于抑制反射。" }, { title: "显性、隐性与仲裁", explanation: "多个节点同时发送时，显性位会覆盖隐性位。ID数值更小的报文优先级更高，失败节点停止发送但不会破坏获胜报文。" }, { title: "位时序与同步", explanation: "波特率由外设时钟、预分频和时间段共同决定；采样点不合适或两端时钟误差过大，会造成位错误。" }, { title: "错误检测与隔离", explanation: "CAN会检查CRC、位填充、格式和应答。发送/接收错误计数器逐步把异常节点推入错误被动或总线关闭，避免拖垮整网。" }],
    mainstreamMethods: [{ name: "自底向上排查", idea: "依次检查供电、线束、终端、电平、位时序、过滤器、中断和应用。", suitable: "未知原因的通信中断", tradeoff: "最稳妥，能避免在软件层反复猜测；需要逐项记录结果。" }, { name: "环回/静默模式", idea: "先用内部或外部环回验证控制器配置，再用静默模式只监听总线。", suitable: "新板卡和初次驱动联调", tradeoff: "能隔离收发问题，但环回成功不代表真实总线一定正常。" }, { name: "分析仪与错误帧定位", idea: "用CAN分析仪或示波器观察报文、应答、错误帧和采样质量。", suitable: "偶发丢帧、总线关闭和兼容问题", tradeoff: "证据最直接，但需要正确设置波特率、采样点和触发条件。" }],
    learningPath: ["理解帧结构、ID、DLC和仲裁", "会根据时钟计算波特率与采样点", "完成两节点收发和过滤器实验", "制造断线、无终端、波特率错误并观察错误计数", "掌握总线关闭后的恢复策略"],
    example: "若节点只能发送但收不到应答，先看示波器上是否存在差分波形，再检查是否只有一个节点、对端波特率是否一致，以及过滤器是否把报文丢弃。",
  } },
];

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter((item) => item.length >= 8))];
}

export function enrichKnowledge(input: { title: string; summary: string; content?: string; primaryCategory: string; secondaryCategory: string }): KnowledgeEnrichment {
  const template = templates[input.primaryCategory] || templates.通用;
  const raw = `${input.summary || ""} ${input.content || ""}`.replace(/\s+/g, " ").trim();
  const categoryGuide = categoryGuides[input.primaryCategory] || categoryGuides.通用;
  const topicGuide = topicGuides.find((item) => item.match.test(`${input.title} ${input.secondaryCategory} ${raw}`))?.guide;
  const guide = { ...categoryGuide, ...topicGuide } as LearningGuide;
  const lecture = buildLectureDetail(input);
  const evidence = buildEvidenceReport(input);
  const professional = buildProfessionalKnowledge(input);
  const sentences = unique(raw.split(/[。！？!?；;]/));
  const checks = {
    摘要: input.summary.trim().length >= 38,
    背景: raw.length >= 90 || /背景|目标|问题|原因|用于/.test(raw),
    方法步骤: /步骤|首先|然后|通过|采用|建立|计算|整定|排查/.test(raw),
    验证方式: /验证|检查|测试|试验|仿真|测量|校核/.test(raw),
    适用边界: /限制|边界|条件|风险|注意|误差|不适用|安全/.test(raw),
    关联知识: raw.length >= 180,
  };
  const weights: Record<keyof typeof checks, number> = { 摘要: 15, 背景: 15, 方法步骤: 20, 验证方式: 20, 适用边界: 20, 关联知识: 10 };
  const completeness = (Object.keys(checks) as Array<keyof typeof checks>).reduce((score, key) => score + (checks[key] ? weights[key] : 0), 0);
  const autoFilled = (Object.keys(checks) as Array<keyof typeof checks>).filter((key) => !checks[key]);
  const topic = input.secondaryCategory || input.primaryCategory;
  const additions = [
    `${topic}的结论需要与明确的输入条件、约束和评价指标一起使用`,
    `实施时应保留关键参数、过程证据和异常情况，便于复现与复盘`,
    `应用到新设备或新工况前，应重新检查模型、参数和安全边界`,
  ];
  const keyPoints = unique([...sentences.slice(0, 4), ...additions]).slice(0, 4);
  return {
    ...lecture,
    ...professional,
    evidence,
    completeness,
    autoFilled,
    background: checks.背景 && sentences[0] ? sentences[0] : template.background,
    keyPoints,
    steps: template.steps,
    verification: template.verification,
    boundaries: template.boundaries,
    application: template.application,
    takeaway: keyPoints[0] || `${topic}需要在明确条件和验证证据下使用`,
    relatedTopics: unique([input.primaryCategory, input.secondaryCategory, ...template.relatedTopics]).slice(0, 5),
    beginnerIntro: guide.beginnerIntro,
    principles: guide.principles,
    mainstreamMethods: guide.mainstreamMethods,
    learningPath: guide.learningPath,
    example: guide.example,
  };
}

export function parseKnowledgeEnrichment(value: unknown): KnowledgeEnrichment | null {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && typeof parsed.completeness === "number" && parsed.evidence && Array.isArray(parsed.evidence.sources) && Array.isArray(parsed.theorySections) && Array.isArray(parsed.equations) && Array.isArray(parsed.derivationSteps) && Array.isArray(parsed.engineeringChecklist) && parsed.workedExample && Array.isArray(parsed.mainstreamMethods) && parsed.principleVisual && Array.isArray(parsed.principleVisual.nodes) && Array.isArray(parsed.applications) && Array.isArray(parsed.frontier) && Array.isArray(parsed.readings) ? parsed as KnowledgeEnrichment : null;
  } catch {
    return null;
  }
}
