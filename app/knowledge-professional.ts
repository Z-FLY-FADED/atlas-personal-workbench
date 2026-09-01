import { findMainstreamProfessional } from "./knowledge-mainstream";

export type PrincipleNode = {
  label: string;
  detail: string;
  kind: "input" | "model" | "decision" | "output";
};

export type ProfessionalKnowledge = {
  codeExample?: {
    title: string;
    language: string;
    description: string;
    code: string;
    notes: string[];
  };
  principleVisual: {
    title: string;
    caption: string;
    nodes: PrincipleNode[];
    relations: string[];
  };
  applications: Array<{
    scenario: string;
    challenge: string;
    method: string;
    deliverable: string;
    metrics: string[];
  }>;
  frontier: Array<{
    stage: "规模应用" | "快速演进" | "研究前沿";
    title: string;
    description: string;
    readiness: number;
    implication: string;
  }>;
  readings: Array<{
    title: string;
    organization: string;
    url: string;
    level: "基础理论" | "进阶方法" | "工程实践";
    readTime: string;
    reason: string;
    tags: string[];
  }>;
};

type KnowledgeInput = { title: string; summary: string; content?: string; primaryCategory: string; secondaryCategory: string };

const profiles: Array<{ match: RegExp; value: ProfessionalKnowledge }> = [
  {
    match: /CAN|控制器局域网/i,
    value: {
      principleVisual: {
        title: "从电气信号到应用报文的完整因果链",
        caption: "排障时沿链路逐级确认，每一级都必须有可观测证据；上层现象不能直接证明上层故障。",
        nodes: [
          { label: "线束与终端", detail: "双绞线、120 Ω、拓扑与支线", kind: "input" },
          { label: "差分物理层", detail: "CANH/CANL、电平、传播与反射", kind: "model" },
          { label: "位时序", detail: "BRP、TSEG、SJW、采样点", kind: "model" },
          { label: "协议控制器", detail: "仲裁、CRC、ACK、TEC/REC", kind: "decision" },
          { label: "驱动与过滤", detail: "FIFO、中断、过滤器、Bus-Off恢复", kind: "decision" },
          { label: "应用数据", detail: "ID、周期、信号缩放与超时", kind: "output" },
        ],
        relations: ["阻抗失配会造成边沿反射", "采样误差会触发错误帧", "错误计数决定节点状态", "过滤与调度决定数据是否到达应用"],
      },
      applications: [
        { scenario: "整车网络联调", challenge: "偶发丢帧与Bus-Off", method: "示波器+分析仪+错误计数器分层定位", deliverable: "网络时序预算、故障树、波形证据包", metrics: ["总线负载率", "错误帧率", "恢复时间"] },
        { scenario: "新ECU通信适配", challenge: "多节点位时序与兼容性", method: "计算采样点并进行温度/线长/时钟偏差验证", deliverable: "位时序配置表与互操作测试报告", metrics: ["采样裕量", "振铃幅值", "报文抖动"] },
        { scenario: "经典CAN升级CAN FD", challenge: "数据段高速率带来的物理层裕量下降", method: "分别设计仲裁段与数据段时序，评估收发器和拓扑", deliverable: "迁移方案、器件清单、边界工况矩阵", metrics: ["数据段速率", "相位裕量", "兼容节点数"] },
      ],
      frontier: [
        { stage: "规模应用", title: "CAN FD与诊断带宽提升", description: "用更长数据字段和数据段变速提高标定、诊断与软件更新效率。", readiness: 92, implication: "工程重点从协议可用转向物理层裕量、网关调度和网络安全。" },
        { stage: "快速演进", title: "区域架构中的CAN—以太网协同", description: "区域控制器汇聚传统总线，骨干网转向车载以太网和TSN。", readiness: 74, implication: "需要同时理解CAN实时性、以太网时间同步及端到端时延预算。" },
        { stage: "研究前沿", title: "CAN XL高速数据链路", description: "面向更长负载和更高数据速率，同时保留CAN仲裁特征。", readiness: 43, implication: "应持续跟踪物理层规范、收发器生态与兼容性测试方法。" },
      ],
      readings: [
        { title: "CAN FD: The basic idea", organization: "CAN in Automation (CiA)", url: "https://can-cia.org/can-knowledge/can-fd-the-basic-idea", level: "基础理论", readTime: "12 分钟", reason: "从协议组织视角理解CAN FD帧、位速率切换和标准体系。", tags: ["CAN FD", "标准体系"] },
        { title: "Recommendation for the CAN FD bit-timing", organization: "CAN in Automation (CiA)", url: "https://stage.can-cia.org/fileadmin/cia/documents/publications/cnlm/march_2018/18-1_p28_recommendation_for_the_canfd_bit-timing_holger_zeltwanger_cia.pdf", level: "进阶方法", readTime: "20 分钟", reason: "把采样点、时钟容差和物理层约束连接到实际位时序配置。", tags: ["位时序", "采样点"] },
        { title: "CAN (bxCAN) bit time configuration on STM32 MCUs", organization: "STMicroelectronics", url: "https://community.st.com/stm32-mcus-60/can-bxcan-bit-time-configuration-on-stm32-mcus-135466", level: "工程实践", readTime: "15 分钟", reason: "直接对应STM32寄存器配置与常见时钟理解错误。", tags: ["STM32", "调试"] },
      ],
    },
  },
  {
    match: /永磁同步|PMSM|矢量控制|FOC/i,
    value: {
      principleVisual: {
        title: "PMSM矢量控制的能量与信息闭环",
        caption: "控制器用坐标变换把交流量变为近似直流量，以id调磁链、iq调转矩，再经逆变器作用于机械系统。",
        nodes: [
          { label: "转矩/速度指令", detail: "目标、限幅与斜坡", kind: "input" },
          { label: "速度控制器", detail: "机械带宽与iq参考", kind: "decision" },
          { label: "dq电流环", detail: "PI、解耦与电压约束", kind: "model" },
          { label: "SVPWM逆变器", detail: "母线利用率与开关时序", kind: "decision" },
          { label: "PMSM与负载", detail: "电磁转矩、惯量与扰动", kind: "model" },
          { label: "角度/电流反馈", detail: "编码器、观测器、ADC", kind: "output" },
        ],
        relations: ["Park变换依赖准确电角度", "dq耦合项随转速增大", "母线电压限制高速转矩", "机械响应决定外环带宽"],
      },
      applications: [
        { scenario: "新能源汽车电驱", challenge: "宽速域效率、弱磁与热约束", method: "MTPA+弱磁+参数在线修正", deliverable: "效率MAP、限扭策略、标定参数集", metrics: ["效率", "转矩纹波", "恒功率范围"] },
        { scenario: "机器人伺服关节", challenge: "低速平稳与高动态响应", method: "高带宽电流环+摩擦补偿+高分辨率位置反馈", deliverable: "环路模型、频响报告、保护矩阵", metrics: ["带宽", "速度波动", "定位误差"] },
        { scenario: "无位置传感器驱动", challenge: "低速可观测性与参数漂移", method: "反电动势/滑模/磁链观测器并结合启动切换", deliverable: "状态机、观测误差分析、极限工况测试", metrics: ["最低稳定转速", "角度误差", "启动成功率"] },
      ],
      frontier: [
        { stage: "规模应用", title: "模型驱动的MTPA与弱磁控制", description: "以电机参数和电压电流边界求取效率最优工作点。", readiness: 94, implication: "重点是参数温漂、磁饱和、逆变器非线性与标定自动化。" },
        { stage: "快速演进", title: "SiC/GaN高频驱动与多物理优化", description: "更高开关频率提升功率密度，同时放大EMI、dv/dt和绝缘挑战。", readiness: 78, implication: "控制算法必须与功率器件、热设计和电机绝缘协同开发。" },
        { stage: "研究前沿", title: "在线辨识与预测电流控制", description: "实时估计Rs、Ld/Lq和磁链，并在约束内直接优化开关或电压矢量。", readiness: 55, implication: "需证明计算时延、参数可辨识性与故障状态下的稳定边界。" },
      ],
      readings: [
        { title: "Sensored Field Oriented Control of 3-Phase PMSM", organization: "Texas Instruments", url: "https://www.ti.com/lit/an/sprabq2/sprabq2.pdf", level: "基础理论", readTime: "45 分钟", reason: "包含FOC理论、Clarke/Park变换、控制框图和渐进式实验搭建。", tags: ["FOC", "C2000"] },
        { title: "Sensorless FOC of a PMSM using a Sliding Mode Observer", organization: "Microchip Technology", url: "https://www.microchip.com/en-us/application-notes/an1078", level: "进阶方法", readTime: "50 分钟", reason: "把PMSM模型、滑模观测器和无传感器实现连接起来。", tags: ["SMO", "无传感器"] },
        { title: "750W sensorless FOC motor inverter reference design", organization: "Texas Instruments", url: "https://www.ti.com/tool/TIDA-010265", level: "工程实践", readTime: "30 分钟", reason: "提供可落地的硬件、软件、观测器与测试结果链路。", tags: ["参考设计", "实机验证"] },
      ],
    },
  },
  {
    match: /轴承|L10|寿命/i,
    value: {
      principleVisual: {
        title: "从载荷谱到轴承寿命与失效风险",
        caption: "L10只描述滚动接触疲劳的统计寿命；润滑、污染、安装和电蚀必须作为并行失效路径评估。",
        nodes: [
          { label: "工况载荷谱", detail: "Fr、Fa、转速、冲击与占比", kind: "input" },
          { label: "轴系载荷分配", detail: "支反力、游隙、预紧与挠度", kind: "model" },
          { label: "等效动载荷", detail: "X、Y系数与多工况折算", kind: "model" },
          { label: "疲劳寿命模型", detail: "C/P幂次与可靠度修正", kind: "decision" },
          { label: "润滑污染修正", detail: "黏度比、清洁度与材料系数", kind: "decision" },
          { label: "验证与维护", detail: "温振监测、拆检与寿命闭环", kind: "output" },
        ],
        relations: ["少量高载荷可主导疲劳损伤", "预紧改变内部载荷分配", "润滑膜决定表面疲劳风险", "现场数据用于修正载荷谱"],
      },
      applications: [
        { scenario: "减速器轴承选型", challenge: "齿轮力、多工况与空间约束", method: "轴系受力+等效载荷+修正寿命+静强度校核", deliverable: "选型计算书、游隙/配合规范", metrics: ["L10mh", "静安全系数", "极限转速"] },
        { scenario: "电机轴承可靠性", challenge: "高速、温升和轴电流", method: "热—润滑分析并增加绝缘/接地与电蚀监测", deliverable: "润滑方案、温升试验、电蚀风险清单", metrics: ["黏度比", "外圈温度", "振动包络"] },
        { scenario: "预测性维护", challenge: "早期故障弱特征和工况变化", method: "阶次跟踪、包络谱与工况归一化趋势", deliverable: "报警阈值、诊断规则、维护窗口", metrics: ["峭度", "包络能量", "剩余寿命区间"] },
      ],
      frontier: [
        { stage: "规模应用", title: "修正额定寿命与工况谱设计", description: "把可靠度、润滑和污染条件纳入标准化寿命评估。", readiness: 93, implication: "需要用真实转数占比和载荷谱替代单一额定工况。" },
        { stage: "快速演进", title: "在线状态监测与PHM", description: "融合振动、温度、电流与转速数据进行退化识别。", readiness: 76, implication: "算法精度依赖传感器安装、工况标签和可解释阈值。" },
        { stage: "研究前沿", title: "物理约束数字孪生与剩余寿命", description: "将接触疲劳机理与数据驱动退化模型联合更新。", readiness: 48, implication: "应输出寿命区间和不确定度，而不是单一确定天数。" },
      ],
      readings: [
        { title: "ISO 281:2007 Rolling bearings — Dynamic load ratings and rating life", organization: "ISO", url: "https://www.iso.org/standard/38102.html", level: "基础理论", readTime: "标准索引", reason: "明确基本额定寿命、可靠度与标准适用边界。", tags: ["ISO 281", "寿命"] },
        { title: "SKF Rolling bearings catalogue", organization: "SKF", url: "https://www.skf.com/binaries/pub12/Images/0901d196802809de-Rolling-bearings---17000_1-EN_tcm_12-121486.pdf", level: "进阶方法", readTime: "按章节阅读", reason: "包含载荷系数、修正寿命、润滑、配合和失效模式的完整工程链路。", tags: ["选型", "润滑"] },
      ],
    },
  },
  {
    match: /轨迹规划|五次多项式|机械臂/i,
    value: {
      principleVisual: {
        title: "从几何任务到可执行关节轨迹",
        caption: "规划的核心不是画出一条曲线，而是在碰撞、奇异、运动学和执行器约束下给路径分配时间。",
        nodes: [
          { label: "任务与环境", detail: "位姿、障碍物、节拍与容差", kind: "input" },
          { label: "几何路径", detail: "关节/笛卡尔路径与碰撞检测", kind: "model" },
          { label: "逆解与连续性", detail: "构型选择、奇异性与跳变", kind: "decision" },
          { label: "时间参数化", detail: "速度、加速度、jerk与力矩约束", kind: "model" },
          { label: "轨迹跟踪", detail: "前馈、反馈、采样与延迟", kind: "decision" },
          { label: "真机结果", detail: "误差、振动、节拍与安全", kind: "output" },
        ],
        relations: ["路径决定几何可行性", "雅可比决定速度映射", "时间尺度改变各阶导数峰值", "控制带宽决定跟踪误差"],
      },
      applications: [
        { scenario: "机械臂点到点搬运", challenge: "节拍、平滑性与关节限位", method: "五次/梯形初始轨迹+受约束时间参数化", deliverable: "轨迹文件、峰值约束表、碰撞报告", metrics: ["节拍", "jerk峰值", "跟踪误差"] },
        { scenario: "焊接/涂胶连续轨迹", challenge: "末端速度恒定与姿态连续", method: "笛卡尔样条+弧长参数化+前瞻速度规划", deliverable: "工艺路径、速度曲线、质量验证", metrics: ["轮廓误差", "速度波动", "工艺一致性"] },
        { scenario: "人机协作在线改轨", challenge: "动态障碍与实时安全", method: "局部重规划+jerk受限平滑+安全速度缩放", deliverable: "安全状态机、实时性报告、风险评估", metrics: ["重规划时延", "最小距离", "停止时间"] },
      ],
      frontier: [
        { stage: "规模应用", title: "速度/加速度/jerk受限在线轨迹生成", description: "以Ruckig等方法在控制周期内生成平滑且满足运动学限制的轨迹。", readiness: 90, implication: "部署时仍要处理离散采样、过冲和多关节同步。" },
        { stage: "快速演进", title: "动力学约束时间最优参数化", description: "在给定路径上结合关节力矩与驱动器边界寻找更快时间尺度。", readiness: 72, implication: "需要可信动力学参数并验证热限制和控制跟踪能力。" },
        { stage: "研究前沿", title: "学习辅助规划与可验证安全层", description: "学习模型提出候选动作，确定性规划器和安全约束负责校验。", readiness: 46, implication: "应保留可证明的碰撞、速度和力约束，避免端到端黑箱直接驱动。" },
      ],
      readings: [
        { title: "Chapter 9 — Trajectory Generation", organization: "Northwestern University", url: "https://modernrobotics.northwestern.edu/chapters/chapter9/", level: "基础理论", readTime: "60 分钟", reason: "系统区分路径、轨迹、时间标度，并讲解多项式与时间最优方法。", tags: ["轨迹生成", "时间标度"] },
        { title: "RuckigSmoothing Class Reference", organization: "ROS / MoveIt", url: "https://docs.ros.org/en/noetic/api/moveit_core/html/classtrajectory__processing_1_1RuckigSmoothing.html", level: "工程实践", readTime: "25 分钟", reason: "展示如何把速度、加速度和jerk限制落实到机器人轨迹平滑。", tags: ["Ruckig", "MoveIt"] },
        { title: "Modern Robotics: Mechanics, Planning, and Control", organization: "Northwestern University", url: "https://hades.mech.northwestern.edu/images/7/7f/MR.pdf", level: "进阶方法", readTime: "按章节阅读", reason: "把运动学、动力学、规划与控制放入统一数学框架。", tags: ["教材", "机器人学"] },
      ],
    },
  },
  {
    match: /悬架|四分之一车辆/i,
    value: {
      principleVisual: {
        title: "路面扰动到舒适性与接地性的传递路径",
        caption: "悬架设计是车身加速度、悬架行程和轮胎动载荷之间的多目标权衡，单一指标最优通常不可取。",
        nodes: [
          { label: "路面输入", detail: "阶跃、扫频与随机路谱", kind: "input" },
          { label: "轮胎与非簧载质量", detail: "kt、mu与车轮跳动", kind: "model" },
          { label: "弹簧/阻尼/作动器", detail: "ks、cs、Fa与限位", kind: "decision" },
          { label: "簧载质量", detail: "车身模态与载荷变化", kind: "model" },
          { label: "控制与估计", detail: "天棚、LQR、H∞、MPC", kind: "decision" },
          { label: "性能指标", detail: "加速度、动挠度、动载荷", kind: "output" },
        ],
        relations: ["低频车身模态影响舒适", "高频车轮模态影响接地", "增大阻尼会改变两侧频段传递", "主动作用力受行程和功率限制"],
      },
      applications: [
        { scenario: "乘用车被动悬架匹配", challenge: "舒适、操稳与成本权衡", method: "频响+随机路谱+参数灵敏度/Pareto分析", deliverable: "弹簧阻尼目标、工况矩阵、权衡曲线", metrics: ["RMS加速度", "悬架行程", "轮胎动载荷"] },
        { scenario: "半主动减振器控制", challenge: "只能耗能、不能主动输入能量", method: "天棚控制/混合逻辑并施加可实现阻尼边界", deliverable: "控制律、阀特性标定、HIL报告", metrics: ["舒适改善率", "切换频率", "功耗"] },
        { scenario: "预瞄主动悬架", challenge: "路面预测误差与作动器约束", method: "摄像/地图预瞄+MPC约束优化", deliverable: "预瞄模型、延迟预算、失效降级策略", metrics: ["预测距离", "峰值力", "能耗"] },
      ],
      frontier: [
        { stage: "规模应用", title: "可变阻尼半主动控制", description: "以较低能耗在多驾驶模式间调整舒适与支撑。", readiness: 91, implication: "工程质量取决于减振器迟滞模型、传感信号与故障降级。" },
        { stage: "快速演进", title: "路面预瞄与约束MPC", description: "利用前方路面信息提前分配作动力和悬架行程。", readiness: 68, implication: "需要联合处理感知误差、计算时延、功率和热限制。" },
        { stage: "研究前沿", title: "底盘域协同控制", description: "悬架与制动、转向、驱动共同优化轮胎力和车身姿态。", readiness: 52, implication: "评价应从单角模型升级到整车、轮胎非线性和故障工况。" },
      ],
      readings: [
        { title: "Robust Control of Active Suspension", organization: "MathWorks", url: "https://www.mathworks.com/help/robust/gs/active-suspension-control-design.html", level: "进阶方法", readTime: "35 分钟", reason: "从四分之一车建模推进到H∞与μ综合，完整展示不确定性处理。", tags: ["H∞", "主动悬架"] },
        { title: "Control Quarter-Car Suspension Dynamics Using ADMM Solver", organization: "MathWorks", url: "https://www.mathworks.com/help/mpc/ug/admm-based-mpc-control-for-quarter-car-suspension.html", level: "工程实践", readTime: "30 分钟", reason: "展示带约束MPC及ADMM求解在悬架系统中的落地过程。", tags: ["MPC", "ADMM"] },
        { title: "Optimizing Vehicle Suspension Design Through System-Level Simulation", organization: "MathWorks", url: "https://www.mathworks.com/company/technical-articles/optimizing-vehicle-suspension-design-through-system-level-simulation.html", level: "基础理论", readTime: "20 分钟", reason: "把路面模型、参数优化和系统级仿真串成清晰工程流程。", tags: ["系统仿真", "参数优化"] },
      ],
    },
  },
  {
    match: /稳定性|根轨迹|频域|状态空间|Lyapunov/i,
    value: {
      principleVisual: {
        title: "从模型、反馈到鲁棒性能的分析闭环",
        caption: "稳定只是最低要求；工程控制还要回答性能、扰动抑制、噪声放大、参数变化和时延下是否仍可接受。",
        nodes: [
          { label: "需求与扰动", detail: "参考、负载、噪声与约束", kind: "input" },
          { label: "被控对象模型", detail: "极点、零点、状态与不确定性", kind: "model" },
          { label: "控制器结构", detail: "PID、状态反馈、MPC、鲁棒控制", kind: "decision" },
          { label: "闭环动态", detail: "灵敏度、互补灵敏度与带宽", kind: "model" },
          { label: "稳定性证据", detail: "极点、Nyquist、Lyapunov与裕度", kind: "decision" },
          { label: "性能验证", detail: "时域、频域、摄动与故障注入", kind: "output" },
        ],
        relations: ["反馈重塑闭环极点", "高带宽提升响应也放大噪声", "时延侵蚀相位裕度", "模型不确定性决定鲁棒边界"],
      },
      applications: [
        { scenario: "伺服速度/位置环", challenge: "快速响应与振动抑制", method: "频域整形+陷波+前馈并检查裕度", deliverable: "开闭环频响、增益表、稳定性报告", metrics: ["带宽", "相位裕度", "跟踪误差"] },
        { scenario: "多变量耦合系统", challenge: "单回路整定引发通道相互作用", method: "状态空间建模+LQR/H∞/解耦控制", deliverable: "MIMO模型、权重选择、鲁棒性证据", metrics: ["奇异值", "H∞范数", "控制能量"] },
        { scenario: "带约束过程控制", challenge: "输入饱和、状态边界与预测扰动", method: "MPC在线优化+状态估计+软约束", deliverable: "预测模型、约束表、求解时延测试", metrics: ["约束违反率", "求解时间", "经济指标"] },
      ],
      frontier: [
        { stage: "规模应用", title: "模型预测控制与在线约束优化", description: "显式处理输入、状态和输出边界，已广泛用于过程与车辆系统。", readiness: 89, implication: "核心风险是模型失配、状态估计误差和最坏求解时间。" },
        { stage: "快速演进", title: "LPV/增益调度与多模型控制", description: "用工作点相关模型覆盖强非线性系统的宽工况运行。", readiness: 73, implication: "必须验证调度变量速度、模型插值和全包络稳定性。" },
        { stage: "研究前沿", title: "学习控制与稳定性证书", description: "让数据驱动模型改善性能，同时用Lyapunov、屏障函数或安全滤波保证边界。", readiness: 44, implication: "应用时应把学习模块限制在可验证安全层之内。" },
      ],
      readings: [
        { title: "Frequency Domain Methods for Controller Design", organization: "University of Michigan", url: "https://ctms.engin.umich.edu/CTMS/index.php?example=Introduction&section=ControlFrequency", level: "基础理论", readTime: "45 分钟", reason: "从Bode、Nyquist到增益/相位裕度，数学与工程解释兼顾。", tags: ["频域", "稳定裕度"] },
        { title: "Gain margin, phase margin, and crossover frequencies", organization: "MathWorks", url: "https://www.mathworks.com/help/control/ref/dynamicsystem.margin.html", level: "工程实践", readTime: "15 分钟", reason: "明确裕度定义、计算方式及经典裕度的使用限制。", tags: ["margin", "MATLAB"] },
        { title: "Solve continuous-time Lyapunov equations", organization: "MathWorks", url: "https://www.mathworks.com/help/control/ref/lyap.html", level: "进阶方法", readTime: "20 分钟", reason: "连接状态空间稳定性、正定矩阵与可计算的Lyapunov方程。", tags: ["Lyapunov", "状态空间"] },
      ],
    },
  },
];

const fallback: ProfessionalKnowledge = {
  principleVisual: {
    title: "从问题输入到工程验证的通用知识链",
    caption: "将事实、模型、决策和验证分开表达，可避免把经验判断误当成普适结论。",
    nodes: [
      { label: "场景与输入", detail: "对象、工况、数据与目标", kind: "input" },
      { label: "机理与假设", detail: "因果关系、守恒定律与边界", kind: "model" },
      { label: "数学/逻辑模型", detail: "变量、参数、约束与误差", kind: "model" },
      { label: "方案与决策", detail: "方法比较、选型与风险", kind: "decision" },
      { label: "实施与测量", detail: "工具、流程、数据与异常", kind: "decision" },
      { label: "证据与结论", detail: "复算、实验、来源与适用范围", kind: "output" },
    ],
    relations: ["假设决定模型有效范围", "参数误差传播到输出", "验证数据修正模型", "结论必须携带边界条件"],
  },
  applications: [
    { scenario: "方案设计", challenge: "需求不完整与多目标冲突", method: "需求量化+机理模型+权衡分析", deliverable: "需求基线、方案比较、风险清单", metrics: ["性能", "成本", "风险"] },
    { scenario: "工程调试", challenge: "现象多、根因不清", method: "分层测量+假设检验+最小复现实验", deliverable: "证据链、根因分析、回归用例", metrics: ["复现率", "定位时间", "关闭率"] },
  ],
  frontier: [
    { stage: "规模应用", title: "模型与数据联合验证", description: "用机理模型解释因果，用真实数据校准参数和边界。", readiness: 88, implication: "应保留版本、工况、数据来源和不确定度。" },
    { stage: "快速演进", title: "数字线程与自动化追溯", description: "连接需求、模型、代码、测试和现场反馈。", readiness: 67, implication: "关键是统一标识、数据质量和变更管理。" },
    { stage: "研究前沿", title: "可验证的AI辅助工程", description: "让AI生成候选解释与方案，再由一手来源、计算和实验闭环确认。", readiness: 42, implication: "AI输出不能替代标准、专家评审和安全验证。" },
  ],
  readings: [],
};

const codeExamples: Array<{ match: RegExp; value: NonNullable<ProfessionalKnowledge["codeExample"]> }> = [
  { match: /CAN|控制器局域网/i, value: {
    title: "STM32 HAL 发送报文并读取错误状态",
    language: "C",
    description: "最小发送示例只验证控制器调用链；真实项目还必须配置位时序、过滤器、中断、终端电阻和Bus-Off恢复。",
    code: `CAN_TxHeaderTypeDef tx = {
  .StdId = 0x321,
  .IDE = CAN_ID_STD,
  .RTR = CAN_RTR_DATA,
  .DLC = 8
};
uint8_t payload[8] = {0x10, 0x02, 0, 0, 0, 0, 0, 0};
uint32_t mailbox;

if (HAL_CAN_AddTxMessage(&hcan1, &tx, payload, &mailbox) != HAL_OK) {
  Error_Handler();
}

uint32_t can_error = HAL_CAN_GetError(&hcan1);
if (can_error != HAL_CAN_ERROR_NONE) {
  log_can_error(can_error);
}`,
    notes: ["先确认hcan1实际外设时钟，再计算BRP、TSEG1和TSEG2。", "发送函数成功不等于总线收到ACK，必须同时检查错误寄存器和总线波形。", "不同STM32系列可能使用FDCAN HAL，结构体和API名称需以对应芯片手册为准。"],
  } },
  { match: /永磁同步|PMSM|矢量控制|FOC/i, value: {
    title: "FOC电流环核心计算顺序",
    language: "C / 伪代码",
    description: "示例展示Clarke、Park、电流PI、交叉耦合前馈与反Park的执行顺序，便于对应控制框图。",
    code: `// 两相电流采样，假设 ia + ib + ic = 0
float i_alpha = ia;
float i_beta  = (ia + 2.0f * ib) / SQRT3;

// Park：静止坐标系 -> 转子同步坐标系
float id =  cos_theta * i_alpha + sin_theta * i_beta;
float iq = -sin_theta * i_alpha + cos_theta * i_beta;

// PI + dq交叉耦合与反电动势前馈
float vd = pi_d(id_ref - id) - omega_e * Lq * iq;
float vq = pi_q(iq_ref - iq) + omega_e * (Ld * id + psi_f);

limit_voltage_vector(&vd, &vq, vbus);
inverse_park(vd, vq, theta_e, &v_alpha, &v_beta);
svpwm(v_alpha, v_beta, vbus);`,
    notes: ["theta_e方向、零位或极对数错误会直接破坏解耦。", "电压限幅后必须进行PI抗积分饱和。", "Rs、Ld/Lq和永磁磁链会随温度与饱和变化，前馈参数需要校准。"],
  } },
  { match: /轴承|L10|寿命/i, value: {
    title: "基本额定寿命与小时寿命计算",
    language: "Python",
    description: "用同一单位输入基本额定动载荷C和等效动载荷P，返回百万转寿命与小时寿命。",
    code: `def bearing_l10(C_kN, P_kN, rpm, bearing_type="ball"):
    if min(C_kN, P_kN, rpm) <= 0:
        raise ValueError("C、P和转速必须大于0")

    p = 3.0 if bearing_type == "ball" else 10.0 / 3.0
    life_million_rev = (C_kN / P_kN) ** p
    life_hours = life_million_rev * 1_000_000 / (60 * rpm)
    return life_million_rev, life_hours

L10, L10h = bearing_l10(30.7, 5.0, 1200, "ball")
print(f"L10 = {L10:.1f} million rev, L10h = {L10h:.0f} h")`,
    notes: ["该公式只覆盖滚动接触疲劳，不覆盖磨损、电蚀、腐蚀和安装错误。", "组合载荷应先依据轴承型式查X、Y系数，得到等效动载荷P。", "多工况应按累计转数和载荷幂次折算，不能只取平均载荷。"],
  } },
  { match: /轨迹规划|五次多项式|机械臂/i, value: {
    title: "零速零加速度边界的五次轨迹",
    language: "Python",
    description: "归一化五次时间标度同时输出位置、速度和加速度，可直接检查关节约束。",
    code: `def quintic_trajectory(q0, qf, T, t):
    if T <= 0 or not 0 <= t <= T:
        raise ValueError("需要满足 T > 0 且 0 <= t <= T")

    tau = t / T
    s   = 10*tau**3 - 15*tau**4 + 6*tau**5
    ds  = (30*tau**2 - 60*tau**3 + 30*tau**4) / T
    dds = (60*tau - 180*tau**2 + 120*tau**3) / T**2

    dq = qf - q0
    return q0 + dq*s, dq*ds, dq*dds

q, qd, qdd = quintic_trajectory(0.0, 1.5708, 2.0, 1.0)`,
    notes: ["增大T会按1/T降低速度、按1/T²降低加速度。", "多关节必须同步检查速度、加速度、jerk、力矩和碰撞约束。", "接近奇异点时，还应检查雅可比条件数和关节速度放大。"],
  } },
  { match: /悬架|四分之一车辆/i, value: {
    title: "二自由度四分之一车状态方程",
    language: "MATLAB",
    description: "状态依次为车身位移/速度和车轮位移/速度，输入为路面位移与主动作用力。",
    code: `function dx = quarter_car(~, x, p, zr, Fa)
% x = [zs; zsd; zu; zud]
zs = x(1); zsd = x(2);
zu = x(3); zud = x(4);

Fs = p.ks * (zs - zu) + p.cs * (zsd - zud);
Ft = p.kt * (zu - zr);

zsdd = (-Fs + Fa) / p.ms;
zudd = ( Fs - Ft - Fa) / p.mu;

dx = [zsd; zsdd; zud; zudd];
end`,
    notes: ["被动悬架令Fa=0，半主动悬架还必须满足阻尼器只能耗能的约束。", "舒适性看车身加速度，操稳相关指标看轮胎动载荷，同时检查悬架行程。", "限位块、轮胎离地和阻尼非线性需要在极限工况模型中补充。"],
  } },
  { match: /稳定性|根轨迹|频域|状态空间|Lyapunov/i, value: {
    title: "闭环极点与稳定裕度快速检查",
    language: "MATLAB",
    description: "先检查开环裕度，再构造单位负反馈闭环并核对极点和阶跃响应。",
    code: `s = tf('s');
G = 50 / (s^3 + 9*s^2 + 30*s + 40);

margin(G); grid on;          % 增益/相位裕度
[Gm, Pm, Wcg, Wcp] = margin(G);

T = feedback(G, 1);         % 单位负反馈闭环
closed_loop_poles = pole(T)
is_stable = isstable(T)

figure;
step(T); grid on;`,
    notes: ["闭环极点稳定只是最低条件，还要检查带宽、超调、稳态误差和噪声放大。", "时延会持续侵蚀相位裕度，离散实现必须包含采样与计算延迟。", "经典单回路裕度不能直接替代MIMO系统的鲁棒稳定性分析。"],
  } },
];

export function buildProfessionalKnowledge(input: KnowledgeInput): ProfessionalKnowledge {
  const text = `${input.title} ${input.summary} ${input.content || ""} ${input.primaryCategory} ${input.secondaryCategory}`;
  const profile = profiles.find((item) => item.match.test(text))?.value || fallback;
  const mainstream = findMainstreamProfessional(text);
  const codeExample = codeExamples.find((item) => item.match.test(text))?.value || mainstream?.codeExample;
  return { ...profile, readings: mainstream?.readings || profile.readings, codeExample };
}
