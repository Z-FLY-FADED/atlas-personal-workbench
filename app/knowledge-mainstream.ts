export type CuratedKnowledgeSeed = {
  title: string;
  summary: string;
  content: string;
  primaryCategory: string;
  secondaryCategory: string;
  confidence: number;
  source: string;
  sourceType: string;
  createdAt: string;
};

export const CURATED_MAINSTREAM_KNOWLEDGE: CuratedKnowledgeSeed[] = [
  {
    title: "ROS 机器人操作系统：ROS 1 与 ROS 2",
    summary: "合并梳理 ROS 1 与 ROS 2 的节点通信、工作空间、DDS、QoS、Executor、生命周期及工程迁移要点。",
    content: "ROS 将机器人软件拆分为职责单一、接口清晰的节点。Topic 适合连续异步数据，Service 适合短时请求响应，Action 适合可取消且带反馈的长任务。ROS 1 通过 Master 完成名称注册与连接发现，数据随后通常在发布者和订阅者之间点对点传输；catkin 工作空间负责软件包、依赖、消息生成与构建顺序。ROS 2 改用 DDS/RTPS 进行分布式发现和数据交换，不再依赖单一 Master；可靠性、历史深度、持久性、Deadline 与 Liveliness 等 QoS 需要根据数据重要性和网络条件匹配。Executor、回调组与线程模型共同决定回调并发和最坏响应时间，组件化可减少进程间复制，生命周期节点则让 configure、activate、deactivate、cleanup 等状态转换可控。工程迁移时应同时核对接口定义、启动方式、构建工具、QoS、参数、坐标系 tf、rosbag/ros2 bag 与节点失效恢复策略。",
    primaryCategory: "机器人", secondaryCategory: "ROS与中间件", confidence: 97,
    source: "ROS Wiki / ROS 2 Documentation", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "机械基础：受力分析、平衡与强度",
    summary: "以自由体图为起点，建立力、力矩、约束反力、应力应变、刚度和安全系数之间的完整计算链。",
    content: "机械分析首先隔离研究对象并画自由体图，明确外载荷、约束和正方向。静力平衡满足合力与合力矩为零；运动问题再加入质量、惯量和加速度。材料力学把内力转换为正应力、剪应力、弯曲应力和扭转应力，并结合屈服、疲劳、失稳和断裂判据校核。刚度决定变形和装配精度，强度决定是否失效，两者不能互相替代。",
    primaryCategory: "机械", secondaryCategory: "机械基础", confidence: 96,
    source: "MIT OpenCourseWare", sourceType: "高校课程", createdAt: "基础知识库",
  },
  {
    title: "机械设计基础：机构、传动、连接与公差",
    summary: "覆盖自由度、四杆机构、齿轮与带传动、轴和轴承、螺栓连接、公差配合及常见失效模式。",
    content: "机构分析用自由度判断运动是否确定，再用速度和加速度关系评估运动品质。传动设计需同时考虑传动比、效率、扭矩、冲击、润滑和寿命。轴系设计把齿轮、轴、轴承和联轴器视为载荷路径整体；连接设计需要校核预紧、滑移、疲劳和防松。尺寸公差决定能否制造，几何公差决定形状与位置精度，配合制度决定装配间隙或过盈。",
    primaryCategory: "机械", secondaryCategory: "机械基础", confidence: 95,
    source: "MIT OpenCourseWare", sourceType: "高校课程", createdAt: "基础知识库",
  },
  {
    title: "汽车四冲程发动机与奥托循环原理",
    summary: "从进气、压缩、燃烧膨胀和排气四个冲程，解释燃料化学能如何转化为曲轴机械功。",
    content: "四冲程发动机每两个曲轴转完成一个工作循环。进气系统控制空气质量，压缩过程提高混合气压力和温度，点火或压燃启动放热，膨胀气体推动活塞并经连杆曲柄输出转矩，排气系统排出燃烧产物。理想奥托循环效率随压缩比提高，但真实发动机受到爆震、传热、泵气损失、摩擦、燃烧持续期和排放限制。",
    primaryCategory: "车辆", secondaryCategory: "发动机与动力", confidence: 96,
    source: "U.S. Department of Energy", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "发动机空气、燃油、点火与排放控制",
    summary: "建立进气增压、喷油、点火、燃烧、EGR、三元催化器及颗粒捕集器之间的控制关系。",
    content: "发动机控制器依据转速、负荷、温度、压力和氧传感器估计气缸充量，计算喷油量并安排点火或喷射时刻。增压提高进气密度，EGR 降低燃烧温度和 NOx，但会影响稳定燃烧。汽油机在三元催化器窗口附近控制空燃比；柴油机常结合 DOC、DPF 和 SCR。标定目标同时包含转矩响应、油耗、爆震裕度、热负荷、排放和诊断法规。",
    primaryCategory: "车辆", secondaryCategory: "发动机与动力", confidence: 95,
    source: "U.S. Department of Energy", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "机器人训练：数据、仿真、策略与真机部署",
    summary: "把机器人训练拆分为任务定义、数据采集、仿真环境、策略学习、域随机化、安全验证和真机微调。",
    content: "机器人训练首先定义观测、动作、目标、约束和成功指标。模仿学习从专家轨迹学习初始策略，强化学习通过环境交互优化长期回报，监督学习常用于视觉感知和状态估计。仿真训练能并行生成数据，但动力学参数、传感噪声、时延和接触模型会形成 sim-to-real 差距。域随机化、系统辨识、残差学习和安全控制层用于提高迁移能力，部署前必须进行离线回放、仿真压力测试、低速真机和故障降级验证。",
    primaryCategory: "机器人", secondaryCategory: "机器人训练", confidence: 94,
    source: "PyTorch / ROS Documentation", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "强化学习基础：MDP、价值函数与 Bellman 方程",
    summary: "从状态、动作、转移、奖励和折扣因子建立马尔可夫决策过程，并推导价值函数与 Bellman 递推。",
    content: "强化学习将智能体和环境交互写成马尔可夫决策过程。策略决定状态下的动作分布，回报是未来奖励的折扣和，价值函数表示遵循某策略后的期望回报。Bellman 方程把长期价值拆成即时奖励与下一状态价值，因此可用动态规划、时序差分和 Q-learning 迭代求解。工程应用必须区分训练回报与真实安全指标，并检查奖励投机、分布外状态和样本效率。",
    primaryCategory: "系统", secondaryCategory: "智能算法", confidence: 96,
    source: "OpenAI Spinning Up", sourceType: "官方课程", createdAt: "基础知识库",
  },
  {
    title: "强化学习算法选型：DQN、PPO、SAC 与模型方法",
    summary: "比较离散与连续动作、on-policy 与 off-policy、价值学习与策略优化，并给出机器人任务选型依据。",
    content: "DQN 以神经网络逼近离散动作 Q 值，经验回放和目标网络用于降低相关性与训练振荡。PPO 是 on-policy 策略梯度方法，通过裁剪概率比限制单次更新幅度，工程实现稳健但样本利用率较低。SAC 是连续动作 off-policy actor-critic 方法，在回报中加入熵以保持探索，适合高样本成本任务。模型方法学习或利用动力学进行规划，样本效率高但受模型偏差影响。",
    primaryCategory: "系统", secondaryCategory: "智能算法", confidence: 95,
    source: "OpenAI Spinning Up / PyTorch", sourceType: "官方课程", createdAt: "基础知识库",
  },
  {
    title: "嵌入式系统基础：MCU、存储、中断与 DMA",
    summary: "从处理器、总线、Flash、RAM、外设、中断控制器和 DMA 解释固件运行的底层机制。",
    content: "MCU 通过时钟树驱动内核和外设，Flash 保存程序与常量，RAM 保存栈、堆和运行数据。外设通过寄存器映射到地址空间，中断让紧急事件打断顺序执行，DMA 在外设与内存之间搬运数据以降低 CPU 占用。启动过程包括复位向量、栈初始化、数据段复制、BSS 清零和系统时钟配置。可靠固件需要控制中断时长、栈深度、并发访问、缓存一致性和低功耗状态切换。",
    primaryCategory: "嵌入式", secondaryCategory: "MCU与固件", confidence: 97,
    source: "Arm CMSIS", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "RTOS 调度、同步与实时性分析",
    summary: "讲解任务状态、优先级抢占、周期调度、互斥量、信号量、消息队列、优先级反转与响应时间分析。",
    content: "RTOS 把应用拆为具有独立栈和优先级的任务。调度器在就绪任务中选择最高优先级执行，阻塞式等待避免无效轮询。互斥量保护共享资源并常提供优先级继承，信号量用于资源计数或事件同步，消息队列传递数据所有权。实时性不是平均速度，而是最坏情况下仍在截止期前完成；必须测量执行时间、阻塞时间、中断负载和任务响应时间。",
    primaryCategory: "嵌入式", secondaryCategory: "RTOS与通信", confidence: 97,
    source: "Arm CMSIS-RTOS2", sourceType: "官方资料", createdAt: "基础知识库",
  },
  {
    title: "嵌入式硬件接口：GPIO、ADC、PWM、SPI、I²C 与 UART",
    summary: "建立数字输入输出、模拟采样、定时器波形和串行总线的电气、时序与软件驱动知识框架。",
    content: "GPIO 需要正确配置输入输出模式、上下拉和驱动能力；ADC 的采样时间、参考电压、源阻抗和量化位数共同决定有效精度；PWM 由定时器周期和比较值决定频率与占空比。SPI 是同步全双工主从总线，I²C 使用开漏与上拉形成地址化多设备总线，UART 依赖双方波特率和帧格式一致。接口调试必须同时检查原理图、电平、时序波形、寄存器和驱动状态机。",
    primaryCategory: "嵌入式", secondaryCategory: "硬件接口", confidence: 96,
    source: "Arm CMSIS / MCU Vendor Manuals", sourceType: "官方资料", createdAt: "基础知识库",
  },
];

export type MainstreamLecture = {
  learningObjectives: string[];
  theorySections: Array<{ title: string; content: string }>;
  equations: Array<{ name: string; formula: string; variables: string[]; interpretation: string; assumptions: string[] }>;
  derivationSteps: string[];
  engineeringChecklist: string[];
  workedExample: { title: string; given: string[]; steps: string[]; result: string };
};

const lectureProfiles: Array<{ match: RegExp; detail: MainstreamLecture }> = [
  { match: /ROS\s*1|ROS\s*2|DDS|QoS|ROS与中间件/i, detail: {
    learningObjectives: ["区分 Topic、Service 与 Action 的通信语义", "解释 ROS 1 Master 与 ROS 2 DDS 发现机制的差异", "依据数据特性配置 ROS 2 QoS", "分析 Executor、回调组和线程对实时性的影响"],
    theorySections: [
      { title: "计算图与接口语义", content: "节点是计算单元，Topic 承载连续异步数据，Service 完成短时请求响应，Action 管理可取消且带反馈的长任务。接口选错会导致阻塞、状态耦合或无法抢占。" },
      { title: "ROS 1 与 ROS 2 的发现和传输", content: "ROS 1 由 Master 负责名称注册和连接协商，数据通常在节点间点对点传输；ROS 2 依赖 DDS 分布式发现，可选择不同中间件并支持更丰富的通信策略。" },
      { title: "QoS、Executor 与确定性", content: "可靠性、历史深度、持久性、Deadline 和 Liveliness 共同决定数据是否到达以及何时到达。Executor 的线程数、回调组与阻塞调用决定回调响应时间和竞争关系。" },
    ],
    equations: [
      { name: "端到端消息时延", formula: String.raw`T_{e2e}=T_{pub}+T_{ser}+T_{net}+T_{des}+T_{cb}`, variables: ["Tpub：发布与排队时间", "Tnet：网络与中间件传输时间", "Tcb：订阅回调等待与执行时间"], interpretation: "端到端时延是发布、序列化、网络、反序列化和回调调度各阶段之和。", assumptions: ["所有时间使用同一时钟基准", "未发生消息丢弃或重传风暴"] },
      { name: "消息带宽估算", formula: String.raw`B=f_m\left(S_p+S_h\right)`, variables: ["fm：消息发布频率", "Sp：有效载荷字节数", "Sh：协议与序列化开销"], interpretation: "单话题带宽由频率与每条消息总长度相乘得到。", assumptions: ["发布频率近似稳定", "未计链路层重传与发现流量"] },
    ],
    derivationSteps: ["画出节点、接口与数据方向", "为每条数据选择 Topic、Service 或 Action", "标注频率、消息大小、时延和可靠性要求", "在 ROS 2 中匹配发布端与订阅端 QoS", "分析 Executor 回调阻塞和共享资源", "用 ros2 topic、ros2 bag、tracing 与网络工具验证"],
    engineeringChecklist: ["每个节点只承担清晰职责", "消息包含时间戳与坐标系", "QoS 两端兼容", "长任务使用 Action 并支持取消", "回调内避免无界阻塞", "关键话题测量频率、时延和丢包", "记录 rosbag 以支持复现", "为节点失效设计重启或降级"],
    workedExample: { title: "相机图像到目标控制指令的通信设计", given: ["图像 30 Hz", "检测延时 25 ms", "控制指令 100 Hz", "允许端到端时延 80 ms"], steps: ["图像使用 Topic，选择适合大数据的可靠性与队列深度", "检测节点订阅图像并发布目标位姿", "控制节点以 100 Hz 读取最新目标，不累计过期目标", "移动任务用 Action 管理目标、反馈和取消", "测量采集时间戳到控制回调的端到端时延"], result: "通信设计必须保证图像积压时主动丢弃旧帧，并把长时运动与高频控制分成 Action 和 Topic 两条链路。" },
  } },
  { match: /机械基础|自由体图|受力分析|机构|公差|机械设计基础/i, detail: {
    learningObjectives: ["正确建立自由体图和约束反力", "使用力与力矩平衡求载荷", "区分强度、刚度、稳定性和疲劳", "把机构、传动、连接和公差放入同一载荷路径"],
    theorySections: [
      { title: "自由体图与边界条件", content: "隔离研究对象后，只保留外力、外力矩和约束反力。坐标系、正方向和作用点必须明确，否则后续内力与应力计算没有可靠基础。" },
      { title: "内力、应力与变形", content: "截面法得到轴力、剪力、弯矩和扭矩，再由几何性质换算应力。材料本构关系把应力连接到应变与变形，刚度校核通常与强度校核同时进行。" },
      { title: "失效模式和安全系数", content: "静强度、疲劳、屈曲、磨损、接触疲劳和断裂对应不同机理。安全系数应针对失效模式和载荷不确定性设置，不能用一个统一数值覆盖所有风险。" },
    ],
    equations: [
      { name: "平面静力平衡", formula: String.raw`\sum F_x=0,\qquad \sum F_y=0,\qquad \sum M_O=0`, variables: ["Fx、Fy：外力分量", "MO：对参考点 O 的力矩"], interpretation: "静止或匀速刚体的合力与合力矩均为零。", assumptions: ["惯性效应可忽略", "刚体简化满足分析精度"] },
      { name: "轴向正应力", formula: String.raw`\sigma=\frac{F}{A}`, variables: ["F：截面轴力", "A：承载截面积", "σ：平均正应力"], interpretation: "均匀轴向载荷下，平均应力等于内力除以面积。", assumptions: ["截面受力近似均匀", "远离孔、圆角和载荷作用局部"] },
    ],
    derivationSteps: ["定义对象、工况和失效判据", "画自由体图并列平衡或运动方程", "求支反力和关键截面内力", "计算应力、变形或运动参数", "与材料、寿命和精度限值比较", "用有限元、样机或试验校核"],
    engineeringChecklist: ["工况包含额定、峰值和异常载荷", "载荷单位与方向一致", "约束没有过约束或漏约束", "考虑应力集中", "区分屈服与疲劳", "检查刚度和固有频率", "公差链满足装配", "计算与试验工况一致"],
    workedExample: { title: "简支梁中央载荷的支反力与弯曲应力", given: ["跨度 L=1 m", "中央集中力 F=2 kN", "矩形截面 b=40 mm、h=80 mm"], steps: ["由对称性得两端反力均为 F/2=1 kN", "中央最大弯矩 Mmax=FL/4=500 N·m", "矩形截面惯性矩 I=bh³/12", "最外纤维距离 c=h/2", "用 σmax=Mmax c/I 计算弯曲应力"], result: "该算例建立了外载荷—支反力—内力—应力的完整链；真实设计还需加入自重、应力集中、疲劳和挠度校核。" },
  } },
  { match: /发动机|奥托循环|内燃机|燃烧|喷油|点火/i, detail: {
    learningObjectives: ["解释四冲程换气、压缩、燃烧膨胀和排气过程", "理解压缩比、空燃比、点火时刻与效率的关系", "区分指示功、制动功、泵气损失和摩擦损失", "说明增压、EGR 与后处理的工程权衡"],
    theorySections: [
      { title: "四冲程与能量转换", content: "进气建立气缸充量，压缩提高压力温度，燃烧释放化学能，膨胀行程把气体功传给活塞与曲轴，排气清除燃烧产物。真实循环还包括换气、传热和摩擦损失。" },
      { title: "燃烧、爆震与控制变量", content: "汽油机用火花触发预混燃烧，柴油机把燃油喷入高温压缩空气自燃。过早点火可能增加爆震和负功，过晚则降低膨胀利用率并提高排气温度。" },
      { title: "效率、排放与热管理", content: "提高压缩比和膨胀比有利于效率，但受到材料、爆震和排放限制。NOx、HC、CO 与颗粒物的生成机理不同，需要缸内控制与后处理协同。" },
    ],
    equations: [
      { name: "理想奥托循环热效率", formula: String.raw`\eta_{\mathrm{Otto}}=1-\frac{1}{r^{\gamma-1}}`, variables: ["r：压缩比", "γ：工质比热比", "ηOtto：理想循环热效率"], interpretation: "在空气标准理想化下，压缩比越高，奥托循环热效率越高。", assumptions: ["定比热理想气体", "压缩与膨胀绝热可逆", "燃烧等容、排热等容"] },
      { name: "转矩与功率", formula: String.raw`P=T\omega=\frac{2\pi nT}{60}`, variables: ["T：曲轴转矩", "n：转速 r/min", "P：机械功率"], interpretation: "发动机功率由转矩与角速度共同决定。", assumptions: ["稳态平均转矩", "忽略轴系瞬态储能"] },
    ],
    derivationSteps: ["以进气门关闭为气缸质量基准", "建立压缩与膨胀过程状态关系", "由放热率或缸压积分求循环指示功", "扣除换气和摩擦得到制动功", "计算油耗、效率与排放指标", "在台架上校准缸压、空燃比、点火和温度模型"],
    engineeringChecklist: ["区分汽油机与柴油机点火方式", "记录转速负荷和环境条件", "确认空燃比与燃油低热值", "监测爆震与排气温度", "检查增压器喘振裕度", "后处理温度窗口满足要求", "油耗按质量流量计算", "台架数据经过传感器校准"],
    workedExample: { title: "压缩比对理想奥托效率的影响", given: ["压缩比 r=10", "比热比 γ=1.4"], steps: ["计算指数 γ−1=0.4", "求 r^0.4≈2.512", "代入 η=1−1/2.512", "得到 η≈0.602"], result: "理想空气标准效率约 60.2%，实际制动热效率因燃烧、传热、泵气和摩擦损失显著低于该值，因此不能用理想效率替代台架结果。" },
  } },
  { match: /机器人训练|模仿学习|sim-to-real|域随机化|策略训练/i, detail: {
    learningObjectives: ["把机器人任务形式化为观测、动作、目标和约束", "区分模仿学习、强化学习和监督感知训练", "设计仿真到真机的域随机化与系统辨识流程", "建立安全、可复现的策略评测体系"],
    theorySections: [
      { title: "任务、数据与策略表示", content: "训练质量首先取决于任务定义。观测必须覆盖决策所需状态，动作空间应与执行器接口匹配，目标函数同时表达成功、效率、平滑和安全。" },
      { title: "模仿学习与强化学习", content: "行为克隆直接拟合专家动作，启动快但容易遇到分布偏移；强化学习通过交互优化长期回报，但样本成本高且奖励设计可能诱发非预期行为。" },
      { title: "Sim-to-Real 与安全层", content: "仿真中的质量、摩擦、时延、传感噪声和接触参数与真机存在偏差。域随机化和系统辨识提高鲁棒性，独立限位、碰撞检测和安全控制器负责约束策略。" },
    ],
    equations: [
      { name: "行为克隆目标", formula: String.raw`J(\theta)=\frac{1}{N}\sum_{i=1}^{N}\left\|\pi_{\theta}(o_i)-a_i^{E}\right\|_2^2`, variables: ["oi：专家观测", "aiE：专家动作", "πθ：待训练策略"], interpretation: "行为克隆通过最小化策略动作与专家动作的均方误差学习初始策略。", assumptions: ["专家数据覆盖部署状态", "动作误差可用欧氏距离衡量"] },
      { name: "域随机化训练目标", formula: String.raw`\max_{\theta}\;\mathbb{E}_{\phi\sim p(\phi),\tau\sim\pi_{\theta}}\left[R(\tau;\phi)\right]`, variables: ["φ：动力学与传感参数", "p(φ)：参数随机化分布", "τ：策略轨迹"], interpretation: "在一组随机化环境参数上优化期望回报，使策略不依赖单一仿真模型。", assumptions: ["随机化范围覆盖真机参数", "奖励与安全约束定义正确"] },
    ],
    derivationSteps: ["定义观测、动作、任务和失败条件", "建立数据采集与仿真环境", "训练基线策略并固定评测种子", "执行参数随机化和扰动压力测试", "离线回放检查越界与奖励投机", "低速真机、保护模式和正常工况逐级放开"],
    engineeringChecklist: ["训练与评测环境隔离", "记录随机种子和版本", "专家数据包含恢复动作", "奖励各项量纲归一", "观测时延和噪声被建模", "动作经过限幅和速率限制", "失败样本进入回归集", "真机具备急停与降级控制"],
    workedExample: { title: "机械臂到达任务训练闭环", given: ["6 维关节状态", "末端目标位姿", "动作是关节速度", "最大关节速度受限"], steps: ["观测包含关节位置速度与目标相对位姿", "奖励包含距离下降、动作平滑和碰撞惩罚", "用专家轨迹行为克隆得到初始策略", "在质量、摩擦、时延和相机噪声范围内随机训练", "评测成功率、碰撞率、时间和峰值速度"], result: "只有同时达到成功率、零碰撞、速度限制和扰动鲁棒性，策略才具备进入低速真机验证的条件。" },
  } },
  { match: /强化学习|Q-learning|DQN|PPO|SAC|Bellman|智能算法/i, detail: {
    learningObjectives: ["定义 MDP、策略、回报和价值函数", "推导 Bellman 期望与最优方程", "比较 DQN、PPO、SAC 的数据使用方式", "识别奖励投机、训练不稳定和分布外风险"],
    theorySections: [
      { title: "马尔可夫决策过程", content: "MDP 由状态、动作、转移概率、奖励和折扣因子构成。马尔可夫性要求给定当前状态后，未来与更早历史条件独立；若观测不完整，则需要历史、滤波或循环网络补充。" },
      { title: "价值学习与策略优化", content: "价值方法学习动作的长期收益并据此选动作，策略梯度直接优化参数化策略。Actor-Critic 同时维护策略和价值估计，用价值基线降低梯度方差。" },
      { title: "On-policy、Off-policy 与算法选型", content: "PPO 使用当前策略附近的新数据，稳定但样本利用率低；DQN、SAC 可重复使用经验回放数据，样本效率较高，但需要处理目标漂移、分布偏差和估计误差。" },
    ],
    equations: [
      { name: "折扣回报", formula: String.raw`G_t=\sum_{k=0}^{\infty}\gamma^k r_{t+k+1}`, variables: ["rt+k+1：未来奖励", "γ：折扣因子", "Gt：时刻 t 的累计回报"], interpretation: "回报把未来奖励按时间距离折扣后累加。", assumptions: ["0≤γ<1 或任务有限时域", "奖励尺度有限"] },
      { name: "Q-learning 更新", formula: String.raw`Q(s_t,a_t)\leftarrow Q(s_t,a_t)+\alpha\left[r_{t+1}+\gamma\max_a Q(s_{t+1},a)-Q(s_t,a_t)\right]`, variables: ["α：学习率", "γ：折扣因子", "方括号：时序差分误差"], interpretation: "Q-learning 用一步奖励和下一状态最大 Q 值构造自举目标。", assumptions: ["状态动作被充分探索", "学习率满足收敛条件或工程上合理衰减"] },
    ],
    derivationSteps: ["定义状态、动作、奖励和终止条件", "建立基线和随机策略", "选择价值型或策略型算法", "规范化观测与奖励并设置探索", "训练同时记录回报、成功率和约束违反", "用独立种子、扰动和分布外状态评测"],
    engineeringChecklist: ["奖励与真实目标一致", "区分 terminated 与 truncated", "训练和测试随机种子分离", "记录平均值和方差", "比较简单控制基线", "检查动作和状态边界", "防止经验回放数据失衡", "部署保留确定性安全约束"],
    workedExample: { title: "离散两动作 Q-learning 更新", given: ["当前 Q(s,a)=1.2", "奖励 r=0.5", "下一状态最大 Q=1.6", "α=0.1，γ=0.9"], steps: ["目标值=0.5+0.9×1.6=1.94", "TD 误差=1.94−1.2=0.74", "更新量=0.1×0.74=0.074", "新 Q(s,a)=1.274"], result: "该样本把动作价值从 1.2 更新为 1.274；深度强化学习把表格 Q 换成神经网络，并增加回放、目标网络或策略约束。" },
  } },
  { match: /嵌入式系统|MCU|RTOS|DMA|中断|GPIO|ADC|SPI|I²C|I2C|UART/i, detail: {
    learningObjectives: ["解释 MCU 启动、存储和外设映射", "区分轮询、中断与 DMA 数据路径", "掌握 RTOS 任务、同步和消息通信", "对周期任务执行最坏响应时间分析"],
    theorySections: [
      { title: "处理器、存储与启动", content: "复位后处理器从向量表取得初始栈指针和复位入口，启动代码复制已初始化数据、清零 BSS、配置时钟并进入 main。链接脚本决定代码和数据在 Flash 与 RAM 中的位置。" },
      { title: "轮询、中断与 DMA", content: "轮询结构简单但占用 CPU；中断适合低延迟离散事件，但中断服务过长会阻塞其他任务；DMA 适合连续批量传输，并通过半满、完成或错误中断通知软件。" },
      { title: "RTOS 并发与实时性", content: "任务在运行、就绪和阻塞状态间切换。互斥量保护共享资源，信号量同步事件，消息队列传递数据。优先级反转、锁顺序和不可重入驱动是常见并发风险。" },
    ],
    equations: [
      { name: "周期任务处理器利用率", formula: String.raw`U=\sum_{i=1}^{n}\frac{C_i}{T_i}`, variables: ["Ci：任务最坏执行时间", "Ti：任务周期", "U：总处理器利用率"], interpretation: "周期任务利用率是各任务最坏执行时间占周期比例之和。", assumptions: ["任务周期与执行时间定义稳定", "未直接包含阻塞和中断开销"] },
      { name: "ADC 理想量化步长", formula: String.raw`\Delta V=\frac{V_{\mathrm{ref}}}{2^N}`, variables: ["Vref：参考电压", "N：ADC 位数", "ΔV：一个最低有效位对应电压"], interpretation: "理想 N 位 ADC 把参考电压范围划分为 2^N 个量化区间。", assumptions: ["理想量化器", "未计噪声、失调、增益误差和非线性"] },
    ],
    derivationSteps: ["从硬件原理图和时钟树建立资源表", "定义中断、DMA、任务和数据所有权", "计算采样率、带宽、CPU 利用率与缓存容量", "设计状态机、超时和错误恢复", "使用断言、日志、GPIO 标记和总线分析仪观测", "执行压力、长稳、掉电和故障注入测试"],
    engineeringChecklist: ["启动与链接地址正确", "中断优先级符合 RTOS 规则", "ISR 内不执行阻塞操作", "DMA 缓冲区生命周期清晰", "共享数据有同步或单写者设计", "栈余量经过测量", "通信包含超时与重试上限", "看门狗能覆盖任务失活"],
    workedExample: { title: "1 kHz 采样任务的 CPU 利用率", given: ["采样任务周期 1 ms", "最坏执行时间 120 μs", "通信任务周期 10 ms", "最坏执行时间 500 μs"], steps: ["采样任务利用率=120/1000=0.12", "通信任务利用率=500/10000=0.05", "总利用率 U=0.17", "再预留中断、内核和异常工况裕量"], result: "两个任务的基础利用率为 17%，但可调度性仍需加入阻塞时间、中断干扰、任务优先级和最坏突发通信。" },
  } },
];

export function findMainstreamLecture(text: string) {
  return lectureProfiles.find((profile) => profile.match.test(text))?.detail || null;
}

export type MainstreamProfessional = {
  codeExample?: { title: string; language: string; description: string; code: string; notes: string[] };
  readings: Array<{ title: string; organization: string; url: string; level: "基础理论" | "进阶方法" | "工程实践"; readTime: string; reason: string; tags: string[] }>;
};

const professionalProfiles: Array<{ match: RegExp; value: MainstreamProfessional }> = [
  { match: /ROS\s*1|ROS\s*2|DDS|QoS|ROS与中间件/i, value: {
    codeExample: { title: "ROS 2 Python 定时发布节点", language: "Python / rclpy", description: "创建节点、发布者和定时器，并在 Executor 中处理回调。", code: `import rclpy\nfrom rclpy.node import Node\nfrom std_msgs.msg import String\n\nclass StatusPublisher(Node):\n    def __init__(self):\n        super().__init__('status_publisher')\n        self.pub = self.create_publisher(String, '/robot/status', 10)\n        self.timer = self.create_timer(0.1, self.publish_status)\n\n    def publish_status(self):\n        msg = String()\n        msg.data = 'ready'\n        self.pub.publish(msg)\n\ndef main():\n    rclpy.init()\n    node = StatusPublisher()\n    rclpy.spin(node)\n    node.destroy_node()\n    rclpy.shutdown()`, notes: ["生产系统应显式选择 QoS，而不是只使用队列深度简写", "回调中避免长时间阻塞", "消息需加入时间戳和状态有效性"] },
    readings: [
      { title: "ROS 2 Interfaces: Topics, Services, Actions", organization: "Open Robotics", url: "https://docs.ros.org/en/ros2_documentation/rolling/Concepts/Basic/Interfaces-Topics-Services-Actions.html", level: "基础理论", readTime: "25 分钟", reason: "官方解释三类通信接口及其适用语义。", tags: ["ROS 2", "接口"] },
      { title: "ROS 2 Intermediate Concepts", organization: "Open Robotics", url: "https://docs.ros.org/en/rolling/Concepts/Intermediate.html", level: "进阶方法", readTime: "按章节阅读", reason: "覆盖 QoS、Executor、组件化、跨编译和安全。", tags: ["DDS", "QoS"] },
    ],
  } },
  { match: /机械基础|自由体图|受力分析|机构|公差|机械设计基础/i, value: { readings: [
    { title: "Engineering Dynamics", organization: "MIT OpenCourseWare", url: "https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/", level: "基础理论", readTime: "课程", reason: "包含牛顿定律、自由体图、刚体运动、能量和振动。", tags: ["力学", "动力学"] },
    { title: "Finite Element Procedures for Solids and Structures", organization: "MIT OpenCourseWare", url: "https://ocw.mit.edu/courses/res-2-002-finite-element-procedures-for-solids-and-structures-spring-2010/", level: "进阶方法", readTime: "课程", reason: "从连续体模型进入有限元离散与结构求解。", tags: ["结构", "有限元"] },
  ] } },
  { match: /发动机|奥托循环|内燃机|燃烧|喷油|点火/i, value: { readings: [
    { title: "Internal Combustion Engine Basics", organization: "U.S. Department of Energy", url: "https://www.energy.gov/cmei/vehicles/articles/internal-combustion-engine-basics", level: "基础理论", readTime: "15 分钟", reason: "官方概述四冲程、点燃式与压燃式发动机的能量转换。", tags: ["发动机", "四冲程"] },
    { title: "Fuel Efficiency Research", organization: "U.S. Department of Energy", url: "https://www.energy.gov/cmei/vehicles/fuel-efficiency", level: "进阶方法", readTime: "20 分钟", reason: "连接先进燃烧、效率提升与排放控制研究。", tags: ["效率", "排放"] },
  ] } },
  { match: /强化学习|Q-learning|DQN|PPO|SAC|Bellman|机器人训练|模仿学习|sim-to-real/i, value: {
    codeExample: { title: "表格 Q-learning 核心更新", language: "Python", description: "用时序差分目标更新离散状态动作价值。", code: `def q_update(q, s, a, reward, next_s, alpha=0.1, gamma=0.99):\n    td_target = reward + gamma * max(q[next_s])\n    td_error = td_target - q[s][a]\n    q[s][a] += alpha * td_error\n    return td_error`, notes: ["终止状态通常不加入下一状态价值", "必须保留探索策略", "深度版本需处理目标网络、经验回放与数值稳定性"] },
    readings: [
      { title: "Key Concepts in Reinforcement Learning", organization: "OpenAI Spinning Up", url: "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html", level: "基础理论", readTime: "60 分钟", reason: "系统定义策略、回报、价值函数、Bellman 方程与优势函数。", tags: ["MDP", "Bellman"] },
      { title: "Reinforcement Learning (DQN) Tutorial", organization: "PyTorch", url: "https://docs.pytorch.org/tutorials/intermediate/reinforcement_q_learning.html", level: "工程实践", readTime: "90 分钟", reason: "包含经验回放、目标网络和完整 CartPole 训练代码。", tags: ["DQN", "PyTorch"] },
      { title: "Gymnasium Environment API", organization: "Farama Foundation", url: "https://gymnasium.farama.org/api/env/", level: "工程实践", readTime: "25 分钟", reason: "明确 reset、step、terminated 与 truncated 等训练环境接口。", tags: ["环境", "评测"] },
    ],
  } },
  { match: /嵌入式系统|MCU|RTOS|DMA|中断|GPIO|ADC|SPI|I²C|I2C|UART/i, value: {
    codeExample: { title: "CMSIS-RTOS2 消息队列通信", language: "C", description: "生产者任务通过固定长度消息队列把采样结果交给消费者。", code: `typedef struct { uint32_t tick; float value; } Sample;\nosMessageQueueId_t sample_queue;\n\nvoid Producer(void *arg) {\n    Sample sample;\n    for (;;) {\n        sample.tick = osKernelGetTickCount();\n        sample.value = read_sensor();\n        osMessageQueuePut(sample_queue, &sample, 0U, 10U);\n        osDelay(10U);\n    }\n}`, notes: ["检查队列满时的处理策略", "消息结构需满足对齐和生命周期要求", "不要在中断中调用不支持 ISR 的 RTOS API"] },
    readings: [
      { title: "CMSIS-RTOS2 API", organization: "Arm", url: "https://arm-software.github.io/CMSIS_5/RTOS2/html/group__CMSIS__RTOS.html", level: "基础理论", readTime: "按模块阅读", reason: "覆盖线程、互斥量、信号量、内存池和消息队列。", tags: ["RTOS", "CMSIS"] },
      { title: "CMSIS Core Documentation", organization: "Arm", url: "https://arm-software.github.io/CMSIS_6/latest/Core/index.html", level: "进阶方法", readTime: "按章节阅读", reason: "连接 Cortex-M 内核、中断、寄存器和启动层。", tags: ["Cortex-M", "中断"] },
    ],
  } },
];

export function findMainstreamProfessional(text: string) {
  return professionalProfiles.find((profile) => profile.match.test(text))?.value || null;
}
