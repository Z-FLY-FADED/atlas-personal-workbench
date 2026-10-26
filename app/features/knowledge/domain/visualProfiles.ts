export type KnowledgeVisualProfile = {
    kind: "can" | "motor" | "robot" | "bearing" | "suspension" | "control" | "ros" | "mechanics" | "engine" | "robot-training" | "reinforcement" | "embedded" | "rtos" | "interface" | "general";
    visualLabel: "机械结构图" | "电路原理图" | "算法流程图" | "系统关系图";
    purpose: string;
    title: string;
    caption: string;
    structure: Array<{
        symbol: string;
        label: string;
        detail: string;
    }>;
    codeFlow: Array<{
        label: string;
        detail: string;
    }>;
};
export function getKnowledgeVisualProfile(title: string, category: string): KnowledgeVisualProfile {
    const text = `${title} ${category}`;
    if (/CAN|控制器局域网|差分总线|CANH|CANL/i.test(text))
        return {
            kind: "can",
            visualLabel: "电路原理图",
            purpose: "定位 CAN 通信中控制器、收发器、线缆与接收节点之间的信号路径和故障边界。",
            title: "CAN 通信链路结构",
            caption: "从控制器数据到差分总线，再到接收节点；排障必须沿信号链逐层确认。",
            structure: [
                { symbol: "MCU", label: "控制器", detail: "组帧、仲裁与错误计数" },
                { symbol: "PHY", label: "收发器", detail: "逻辑电平与差分信号转换" },
                {
                    symbol: "BUS",
                    label: "CANH / CANL",
                    detail: "双绞线与两端 120Ω 终端",
                },
                { symbol: "ECU", label: "接收节点", detail: "滤波、校验与应用处理" },
            ],
            codeFlow: [
                { label: "初始化", detail: "配置时钟、位时序和采样点" },
                { label: "过滤", detail: "设置 ID 过滤器与接收中断" },
                { label: "收发", detail: "组帧、发送并读取 FIFO" },
                { label: "诊断", detail: "检查 ACK、错误计数与 Bus-Off" },
            ],
        };
    if (/电机|PMSM|FOC|矢量控制/i.test(text))
        return {
            kind: "motor",
            visualLabel: "电路原理图",
            purpose: "理解逆变器、电机、位置反馈和矢量控制器如何共同形成机电闭环。",
            title: "永磁同步电机矢量控制结构",
            caption: "电流采样与转子角度形成反馈，控制器在 dq 坐标系解耦磁链和转矩。",
            structure: [
                { symbol: "3φ", label: "三相逆变器", detail: "直流母线转换为三相电压" },
                { symbol: "M", label: "PMSM 本体", detail: "电磁转矩驱动机械负载" },
                { symbol: "θ", label: "位置传感", detail: "编码器或观测器输出电角度" },
                { symbol: "dq", label: "FOC 控制器", detail: "电流环、速度环与 SVPWM" },
            ],
            codeFlow: [
                { label: "采样", detail: "读取相电流、母线电压和转角" },
                { label: "变换", detail: "执行 Clarke 与 Park 变换" },
                { label: "调节", detail: "PI 计算并加入解耦前馈" },
                { label: "输出", detail: "限幅、反变换并更新 PWM" },
            ],
        };
    if (/ROS\s*[12]|ROS与中间件|DDS|QoS|Executor|Topic|Service|Action/i.test(text))
        return {
            kind: "ros",
            visualLabel: "系统关系图",
            purpose: "区分节点发现、接口匹配和数据传输三层关系，帮助排查机器人软件通信问题。",
            title: "ROS 节点通信与中间件关系",
            caption: "发布节点和订阅节点通过 Topic、Service 或 Action 交换信息；ROS 1 依赖 Master 完成发现，ROS 2 由 DDS 分布式发现并用 QoS 约束通信质量。",
            structure: [
                { symbol: "PUB", label: "发布节点", detail: "产生传感、状态或控制数据" },
                { symbol: "API", label: "通信接口", detail: "Topic、Service 与 Action" },
                { symbol: "DDS", label: "发现与传输", detail: "端点匹配、序列化与网络传输" },
                { symbol: "SUB", label: "订阅节点", detail: "回调处理并更新机器人状态" },
            ],
            codeFlow: [
                { label: "定义接口", detail: "明确消息类型、方向和更新频率" },
                { label: "发现匹配", detail: "核对 Domain、命名空间与 QoS" },
                { label: "传输调度", detail: "由中间件传输并由 Executor 调度回调" },
                { label: "诊断验证", detail: "检查延迟、丢包、队列和节点失效" },
            ],
        };
    if (/机器人训练|模仿学习|行为克隆|域随机化|sim-to-real/i.test(text))
        return {
            kind: "robot-training",
            visualLabel: "算法流程图",
            purpose: "把任务定义、数据或仿真训练、安全评测和真机部署串成可验证的完整流程。",
            title: "机器人训练与真机部署流程",
            caption: "训练回报不是最终目标；策略必须在独立场景中通过成功率、碰撞率、动作边界和扰动鲁棒性验证后，才能进入低速真机测试。",
            structure: [
                { symbol: "OBS", label: "观测与目标", detail: "状态、传感信息和任务成功条件" },
                { symbol: "SIM", label: "数据与仿真", detail: "专家轨迹、动力学和随机化环境" },
                { symbol: "π", label: "策略模型", detail: "从观测生成受约束动作" },
                { symbol: "BOT", label: "真实机器人", detail: "安全层、执行器与任务环境" },
            ],
            codeFlow: [
                { label: "定义任务", detail: "确定观测、动作、约束和验收指标" },
                { label: "训练策略", detail: "使用专家数据或环境交互优化策略" },
                { label: "压力评测", detail: "覆盖噪声、时延、参数变化和失败恢复" },
                { label: "分级部署", detail: "离线回放、仿真、低速真机逐级放开" },
            ],
        };
    if (/强化学习|MDP|Bellman|Q-learning|DQN|PPO|SAC/i.test(text))
        return {
            kind: "reinforcement",
            visualLabel: "算法流程图",
            purpose: "理解状态、动作、环境转移、奖励和策略更新之间的闭环因果关系。",
            title: "强化学习交互与策略更新流程",
            caption: "智能体依据状态选择动作，环境返回下一状态和奖励；算法用采样数据估计价值或更新策略，并在独立测试环境中检查真实任务表现。",
            structure: [
                { symbol: "sₜ", label: "状态", detail: "环境在当前时刻提供的可观测信息" },
                { symbol: "π", label: "策略", detail: "依据状态产生动作分布" },
                { symbol: "ENV", label: "环境", detail: "执行动作并产生状态转移" },
                { symbol: "rₜ", label: "奖励与回报", detail: "评价当前行为和长期价值" },
            ],
            codeFlow: [
                { label: "采集交互", detail: "记录状态、动作、奖励和下一状态" },
                { label: "估计价值", detail: "计算回报、优势或时序差分目标" },
                { label: "更新模型", detail: "优化价值网络或策略参数" },
                { label: "独立评测", detail: "检查成功率、方差、安全和泛化" },
            ],
        };
    if (/发动机|内燃机|奥托循环|四冲程|燃烧|喷油|点火|排放/i.test(text))
        return {
            kind: "engine",
            visualLabel: "机械结构图",
            purpose: "把活塞、连杆、曲轴和气门的机械运动与进气、燃烧、做功及排气过程对应起来。",
            title: "四冲程发动机结构与能量转换",
            caption: "气缸内燃烧产生的压力推动活塞，经连杆和曲轴转换为旋转机械功；气门、喷油和点火控制决定充量、燃烧相位、效率与排放。",
            structure: [
                { symbol: "V", label: "进排气系统", detail: "气门与气道控制气缸充量和废气排出" },
                { symbol: "P", label: "活塞与气缸", detail: "承受燃气压力并形成往复运动" },
                { symbol: "CR", label: "连杆与曲轴", detail: "把往复运动转换为旋转转矩" },
                { symbol: "ECU", label: "燃烧控制", detail: "协调喷油、点火、增压与排放后处理" },
            ],
            codeFlow: [
                { label: "进气", detail: "吸入空气并建立气缸充量" },
                { label: "压缩", detail: "提高混合气压力和温度" },
                { label: "做功", detail: "燃烧放热并推动活塞输出功" },
                { label: "排气", detail: "排出燃烧产物并准备下一循环" },
            ],
        };
    if (/RTOS|任务调度|互斥量|信号量|消息队列|优先级反转/i.test(text))
        return {
            kind: "rtos",
            visualLabel: "算法流程图",
            purpose: "说明实时任务如何在就绪、运行和阻塞状态间切换，以及事件如何触发抢占与唤醒。",
            title: "RTOS 任务状态与实时调度流程",
            caption: "调度器始终选择最高优先级就绪任务运行；互斥量、消息队列、中断和超时改变任务状态，最坏响应时间决定系统是否满足截止期。",
            structure: [
                { symbol: "IRQ", label: "中断与事件", detail: "外设完成、超时或数据到达" },
                { symbol: "RDY", label: "就绪队列", detail: "按优先级保存可运行任务" },
                { symbol: "CPU", label: "运行任务", detail: "最高优先级任务获得处理器" },
                { symbol: "BLK", label: "阻塞与同步", detail: "等待队列、互斥量或外设事件" },
            ],
            codeFlow: [
                { label: "事件到达", detail: "中断或超时使任务进入就绪态" },
                { label: "调度比较", detail: "比较优先级并决定是否抢占" },
                { label: "任务运行", detail: "执行时间受最坏情况预算约束" },
                { label: "阻塞或完成", detail: "释放资源并等待下一事件" },
            ],
        };
    if (/GPIO|ADC|PWM|SPI|I²C|I2C|UART|硬件接口/i.test(text))
        return {
            kind: "interface",
            visualLabel: "电路原理图",
            purpose: "把引脚电气条件、总线时序、寄存器配置和驱动状态机放在同一条调试链上。",
            title: "嵌入式硬件接口信号链",
            caption: "接口是否可靠同时取决于电压、电流、上下拉、时钟和帧时序，也取决于引脚复用、寄存器和软件超时恢复；只检查代码或只检查接线都不完整。",
            structure: [
                { symbol: "PIN", label: "引脚与保护", detail: "电平、上下拉、驱动能力和参考地" },
                { symbol: "BUS", label: "电气总线", detail: "时钟、数据线、片选与终端器件" },
                { symbol: "REG", label: "外设寄存器", detail: "复用、分频、采样、中断和 DMA" },
                { symbol: "DRV", label: "驱动状态机", detail: "收发、超时、重试与错误恢复" },
            ],
            codeFlow: [
                { label: "核对连接", detail: "确认电源、参考地、引脚和保护器件" },
                { label: "测量时序", detail: "用示波器或逻辑分析仪检查波形" },
                { label: "检查配置", detail: "核对寄存器、分频和中断状态" },
                { label: "验证恢复", detail: "注入超时、断线和异常帧" },
            ],
        };
    if (/嵌入式系统|MCU|Flash|RAM|DMA|中断/i.test(text))
        return {
            kind: "embedded",
            visualLabel: "系统关系图",
            purpose: "理解微控制器内核、存储器、外设、中断与 DMA 之间的数据和控制关系。",
            title: "微控制器硬件与固件运行结构",
            caption: "外设通过寄存器与内核交互，DMA 在外设和 RAM 之间搬运数据，中断报告完成或异常；启动代码则建立栈、数据段、时钟和程序入口。",
            structure: [
                { symbol: "CPU", label: "处理器内核", detail: "执行指令、异常响应和任务调度" },
                { symbol: "MEM", label: "Flash 与 RAM", detail: "保存程序、栈、堆和运行数据" },
                { symbol: "PER", label: "片上外设", detail: "定时器、ADC、通信与 GPIO" },
                { symbol: "DMA", label: "中断与 DMA", detail: "报告事件并高效搬运数据" },
            ],
            codeFlow: [
                { label: "复位启动", detail: "装载向量表、栈和数据段" },
                { label: "配置资源", detail: "设置时钟、引脚和外设寄存器" },
                { label: "事件处理", detail: "轮询、中断或 DMA 接收数据" },
                { label: "异常恢复", detail: "处理超时、溢出、看门狗和掉电" },
            ],
        };
    if (!/轴承|齿轮|寿命|传动/i.test(text) &&
        /机械基础|机械设计|受力分析|自由体图|强度|公差|机构|连接/i.test(text))
        return {
            kind: "mechanics",
            visualLabel: "机械结构图",
            purpose: "从装配结构中识别约束和载荷路径，并把外力逐级转换为内力、应力、变形与失效校核。",
            title: "机械结构与载荷分析链",
            caption: "先隔离研究对象并明确支承、连接与外载荷，再沿连续载荷路径计算内力和应力；几何、公差、材料和工况共同决定结构能否安全工作。",
            structure: [
                { symbol: "F", label: "外载荷", detail: "力、力矩、冲击和约束反力" },
                { symbol: "J", label: "连接与支承", detail: "轴承、螺栓、铰链和配合面" },
                { symbol: "S", label: "承载构件", detail: "轴、梁、壳体、齿轮和机架" },
                { symbol: "σ", label: "危险截面", detail: "应力、变形、疲劳、屈曲和磨损" },
            ],
            codeFlow: [
                { label: "画自由体图", detail: "隔离对象并标注边界和正方向" },
                { label: "求内力", detail: "由平衡或动力学方程求载荷" },
                { label: "校核响应", detail: "计算应力、变形、寿命与稳定性" },
                { label: "工程验证", detail: "结合公差、材料和试验修正" },
            ],
        };
    if (/机械臂|机器人|轨迹|运动控制/i.test(text))
        return {
            kind: "robot",
            visualLabel: "算法流程图",
            purpose: "说明末端目标如何经过轨迹规划、关节控制和机械执行，转化为可验证的机器人运动。",
            title: "机器人运动控制层级结构",
            caption: "任务空间目标经过轨迹规划和关节控制，最终由机械结构实现末端运动。",
            structure: [
                { symbol: "TCP", label: "末端目标", detail: "位置、姿态和到达时间" },
                { symbol: "q(t)", label: "轨迹规划", detail: "逆运动学与时间参数化" },
                { symbol: "PID", label: "关节伺服", detail: "位置、速度与力矩闭环" },
                { symbol: "ARM", label: "机械结构", detail: "连杆、关节与末端执行器" },
            ],
            codeFlow: [
                { label: "输入边界", detail: "读取起点、终点和运动时间" },
                { label: "求解系数", detail: "满足位置、速度、加速度边界" },
                { label: "离散采样", detail: "生成 q、q̇ 与 q̈ 指令" },
                { label: "约束验证", detail: "检查限位、速度、碰撞和奇异点" },
            ],
        };
    if (/轴承|齿轮|寿命|传动/i.test(text))
        return {
            kind: "bearing",
            visualLabel: "机械结构图",
            purpose: "识别轴、内外圈、滚动体和轴承座的装配关系，以及载荷和接触应力的传递方向。",
            title: "滚动轴承载荷与寿命结构",
            caption: "外部载荷经轴、内圈和滚动体传递到外圈及轴承座，接触应力决定疲劳寿命。",
            structure: [
                { symbol: "F", label: "轴系载荷", detail: "径向力、轴向力与冲击" },
                { symbol: "IR", label: "内圈", detail: "随轴旋转并传递载荷" },
                { symbol: "●", label: "滚动体", detail: "形成周期性赫兹接触应力" },
                { symbol: "OR", label: "外圈与座", detail: "承载反力并控制安装刚度" },
            ],
            codeFlow: [
                { label: "输入工况", detail: "整理转速、载荷谱和目标寿命" },
                { label: "等效载荷", detail: "计算 P = XFr + YFa" },
                { label: "基础寿命", detail: "按 C/P 指数关系计算 L10" },
                { label: "工程修正", detail: "加入可靠度、润滑、温度与污染" },
            ],
        };
    if (/悬架|车辆|四分之一车|底盘/i.test(text))
        return {
            kind: "suspension",
            visualLabel: "机械结构图",
            purpose: "把真实轮端结构与四分之一车辆模型对应起来，理解路面激励如何传递到车身。",
            title: "四分之一车辆悬架结构",
            caption: "路面输入依次作用于轮胎、非簧载质量和悬架，再传递到车身；舒适性与操稳需要同时评价。",
            structure: [
                { symbol: "zr", label: "路面输入", detail: "位移、速度与随机路谱" },
                { symbol: "kt", label: "轮胎", detail: "轮胎刚度传递路面激励" },
                { symbol: "mu", label: "非簧载质量", detail: "车轮、轮毂与部分悬架" },
                { symbol: "ms", label: "车身质量", detail: "经弹簧和阻尼器获得隔振" },
            ],
            codeFlow: [
                { label: "建立状态", detail: "定义车身与车轮位移和速度" },
                { label: "计算作用力", detail: "求悬架力、轮胎力和主动控制力" },
                { label: "状态更新", detail: "由牛顿定律计算加速度" },
                { label: "评价指标", detail: "检查车身加速度、行程与轮胎动载" },
            ],
        };
    if (/控制|稳定性|根轨迹|Bode|Nyquist|Lyapunov|状态空间/i.test(text))
        return {
            kind: "control",
            visualLabel: "算法流程图",
            purpose: "展示参考输入、控制器、被控对象和传感反馈之间的闭环关系及稳定性验证步骤。",
            title: "闭环控制系统结构",
            caption: "参考输入经控制器和被控对象产生输出，传感器反馈使误差持续收敛。",
            structure: [
                { symbol: "r", label: "参考输入", detail: "目标值与允许误差" },
                { symbol: "C", label: "控制器", detail: "根据误差生成控制量" },
                { symbol: "G", label: "被控对象", detail: "物理系统和执行机构" },
                { symbol: "y", label: "输出反馈", detail: "传感测量返回比较点" },
            ],
            codeFlow: [
                { label: "建立模型", detail: "定义传递函数或状态空间" },
                { label: "分析开环", detail: "计算极点、带宽与稳定裕度" },
                { label: "构造闭环", detail: "加入反馈并计算闭环极点" },
                { label: "时域验证", detail: "检查超调、调节时间和稳态误差" },
            ],
        };
    return {
        kind: "general",
        visualLabel: "系统关系图",
        purpose: "帮助识别知识主题中的输入、处理方法、输出结果和验证依据。",
        title: "知识主题的输入、方法与验证关系",
        caption: "阅读时先确认研究对象与输入，再理解采用的方法和产生的结果，最后用数据、试验或边界条件验证结论是否成立。",
        structure: [
            { symbol: "IN", label: "输入与背景", detail: "问题、对象、数据和约束条件" },
            { symbol: "WHY", label: "原理与机制", detail: "关键概念、因果关系和成立条件" },
            { symbol: "HOW", label: "方法与实现", detail: "模型、算法、工具和工程步骤" },
            { symbol: "OK", label: "结果与验证", detail: "输出、指标、证据和适用边界" },
        ],
        codeFlow: [
            { label: "定义问题", detail: "明确目标、对象和输入输出" },
            { label: "建立解释", detail: "连接概念、原理和变量关系" },
            { label: "执行方法", detail: "应用模型、流程或工程工具" },
            { label: "验证结论", detail: "检查证据、误差和适用范围" },
        ],
    };
}
export type TheoryFigurePreset = {
    kind: string;
    eyebrow: string;
    title: string;
    nodes: Array<{
        label: string;
        detail: string;
    }>;
    caption: string;
};
export function getTheoryFigurePreset(text: string): TheoryFigurePreset | null {
    const presets: Array<{
        match: RegExp;
        figure: TheoryFigurePreset;
    }> = [
        {
            match: /ROS\s*1|Master|Topic.*Service.*Action/i,
            figure: {
                kind: "network",
                eyebrow: "COMMUNICATION GRAPH",
                title: "ROS 1 节点发现与数据通信",
                nodes: [
                    { label: "Master", detail: "名称注册与连接发现" },
                    { label: "Publisher", detail: "声明 Topic 与数据类型" },
                    { label: "P2P 传输", detail: "节点之间直接传递消息" },
                    { label: "Subscriber", detail: "队列与回调消费数据" },
                ],
                caption: "Master 只参与注册与连接协商，数据通常不经过 Master；这也是诊断时要分开检查“发现失败”与“数据链路失败”的原因。",
            },
        },
        {
            match: /ROS\s*2|DDS|QoS|Executor/i,
            figure: {
                kind: "network",
                eyebrow: "DDS DATA SPACE",
                title: "ROS 2 分布式发现与 QoS 约束",
                nodes: [
                    { label: "Node A", detail: "DataWriter / 发布回调" },
                    { label: "DDS 发现", detail: "Domain 内自动匹配端点" },
                    { label: "QoS 匹配", detail: "可靠性、深度与持久性" },
                    { label: "Node B", detail: "Executor 调度订阅回调" },
                ],
                caption: "ROS 2 没有单一 Master。发布端与订阅端只有在类型、Domain 和 QoS 相容时才会建立有效通信。",
            },
        },
        {
            match: /自由体图|受力分析|平面静力|内力.*应力/i,
            figure: {
                kind: "mechanics",
                eyebrow: "LOAD PATH",
                title: "外载荷到应力的分析链",
                nodes: [
                    { label: "隔离对象", detail: "选定边界与坐标系" },
                    { label: "自由体图", detail: "标出力、力矩与约束反力" },
                    { label: "截面内力", detail: "N、V、M、T" },
                    { label: "失效校核", detail: "应力、变形、疲劳与屈曲" },
                ],
                caption: "受力分析的核心是建立连续的载荷路径。边界条件不清楚时，后续应力或安全系数都没有物理基础。",
            },
        },
        {
            match: /四冲程|奥托循环|进气.*压缩.*排气/i,
            figure: {
                kind: "cycle",
                eyebrow: "ENERGY CYCLE",
                title: "四冲程能量转换循环",
                nodes: [
                    { label: "进气", detail: "气门开启，建立气缸充量" },
                    { label: "压缩", detail: "容积减小，压力与温度上升" },
                    { label: "做功", detail: "燃烧放热推动活塞与曲轴" },
                    { label: "排气", detail: "清除燃烧产物并开始新循环" },
                ],
                caption: "一个循环需要曲轴旋转两圈。理想奥托循环用于解释效率趋势，真实发动机还需加入换气、传热、摩擦和燃烧持续期。",
            },
        },
        {
            match: /马尔可夫|MDP|Bellman|价值函数|强化学习/i,
            figure: {
                kind: "loop",
                eyebrow: "AGENT-ENVIRONMENT LOOP",
                title: "强化学习的交互闭环",
                nodes: [
                    { label: "状态 sₜ", detail: "环境向智能体提供可观测信息" },
                    { label: "策略 π", detail: "依据状态产生动作 aₜ" },
                    { label: "环境 P", detail: "执行动作并转移到 sₜ₊₁" },
                    { label: "奖励 rₜ", detail: "反馈当前行为的即时价值" },
                ],
                caption: "Bellman 方程把长期回报拆成当前奖励与后续状态价值。算法的差异主要在于如何估计价值、如何更新策略以及是否复用历史数据。",
            },
        },
        {
            match: /MCU.*存储|中断.*DMA|Flash.*RAM|复位向量/i,
            figure: {
                kind: "hardware",
                eyebrow: "MCU DATA PATH",
                title: "MCU 内核、存储器与外设数据通路",
                nodes: [
                    { label: "外设", detail: "ADC、UART、SPI 产生事件与数据" },
                    { label: "DMA / 中断", detail: "DMA 搬运数据，中断通知 CPU" },
                    { label: "RAM", detail: "缓冲区、栈、堆与运行状态" },
                    { label: "CPU / Flash", detail: "执行程序并管理外设寄存器" },
                ],
                caption: "DMA 不代替 CPU 处理业务逻辑，它只在外设与存储器之间高效搬运数据；中断则用于报告完成、错误或紧急事件。",
            },
        },
        {
            match: /RTOS|优先级抢占|互斥量|消息队列/i,
            figure: {
                kind: "timeline",
                eyebrow: "REAL-TIME SCHEDULING",
                title: "RTOS 任务状态与抢占调度",
                nodes: [
                    { label: "Ready", detail: "条件满足，等待 CPU" },
                    { label: "Running", detail: "当前最高优先级就绪任务" },
                    { label: "Blocked", detail: "等待队列、互斥量或外设事件" },
                    { label: "Wake-up", detail: "超时或事件到达后重回 Ready" },
                ],
                caption: "实时性关心最坏情况响应时间，不是平均 CPU 利用率。长时间中断、锁竞争和优先级反转都会延迟高优先级任务。",
            },
        },
        {
            match: /GPIO|ADC|PWM|SPI|I²C|I2C|UART/i,
            figure: {
                kind: "hardware",
                eyebrow: "HARDWARE INTERFACE",
                title: "MCU 接口从引脚到驱动的调试链",
                nodes: [
                    { label: "电气连接", detail: "电平、上下拉、参考地与保护" },
                    { label: "时序波形", detail: "时钟、建立/保持时间与帧格式" },
                    { label: "寄存器", detail: "引脚复用、分频、中断与 DMA" },
                    { label: "驱动状态机", detail: "超时、重试、错误恢复与并发保护" },
                ],
                caption: "接口故障不能只看代码。原理图、示波器/逻辑分析仪波形、寄存器配置和驱动状态必须放在同一条证据链上核对。",
            },
        },
        {
            match: /dq轴|Clarke|Park|MTPA|弱磁|FOC/i,
            figure: {
                kind: "control",
                eyebrow: "VECTOR CONTROL LOOP",
                title: "PMSM 矢量控制信号链",
                nodes: [
                    { label: "iₐ iᵇ iᶜ", detail: "三相电流采样" },
                    { label: "Clarke / Park", detail: "转换为 d、q 直流分量" },
                    { label: "PI + 解耦", detail: "调节磁链和转矩电流" },
                    { label: "SVPWM / 逆变器", detail: "生成三相电压并驱动电机" },
                ],
                caption: "Park 变换将随转子旋转的正弦量变成稳态近似直流量，使 PI 调节器能独立控制 d 轴磁链与 q 轴转矩。",
            },
        },
        {
            match: /轴承|内圈|滚动体|等效动载荷|L10/i,
            figure: {
                kind: "mechanics",
                eyebrow: "BEARING LOAD PATH",
                title: "滚动轴承载荷传递与失效链",
                nodes: [
                    { label: "轴 / 内圈", detail: "引入径向力、轴向力和力矩" },
                    { label: "滚动体", detail: "局部赫兹接触与循环应力" },
                    { label: "外圈 / 座孔", detail: "将载荷传入机架或壳体" },
                    { label: "寿命边界", detail: "疲劳、润滑、污染、游隙与温升" },
                ],
                caption: "L10 仅表示滚动接触疲劳的统计寿命。润滑不足、污染、安装偏心或过大预紧可能在计算寿命之前导致失效。",
            },
        },
        {
            match: /路径与轨迹|五次多项式|jerk|雅可比/i,
            figure: {
                kind: "trajectory",
                eyebrow: "TRAJECTORY PIPELINE",
                title: "路径到可执行轨迹的约束传递",
                nodes: [
                    { label: "几何路径 q(s)", detail: "定义构型空间或末端空间曲线" },
                    { label: "时间参数 s(t)", detail: "赋予位置具体执行时刻" },
                    { label: "导数约束", detail: "检查速度、加速度与 jerk" },
                    { label: "控制器采样", detail: "离散输出关节指令并验证碰撞" },
                ],
                caption: "路径只解决“从哪里经过”，轨迹还要解决“什么时候到达”。增大总时间可系统性降低速度、加速度与 jerk 峰值。",
            },
        },
        {
            match: /四分之一车|簧载质量|非簧载|轮胎动载荷/i,
            figure: {
                kind: "suspension",
                eyebrow: "QUARTER-CAR MODEL",
                title: "二自由度四分之一车模型",
                nodes: [
                    { label: "车身 mₛ", detail: "簧载质量及其垂向位移 zₛ" },
                    { label: "悬架 kₛ / cₛ", detail: "弹簧储能，减振器耗散能量" },
                    { label: "车轮 mᵤ", detail: "非簧载质量及位移 zᵤ" },
                    { label: "轮胎 kₜ / 路面 zᵣ", detail: "路面作为基座位移输入" },
                ],
                caption: "低频车身跳动决定舒适性，高频车轮跳动影响接地力。刚度与阻尼设计必须同时权衡车身加速度、悬架行程和轮胎动载荷。",
            },
        },
        {
            match: /稳定性|根轨迹|Bode|Nyquist|Lyapunov|闭环极点/i,
            figure: {
                kind: "control",
                eyebrow: "CLOSED-LOOP ANALYSIS",
                title: "闭环稳定性的三条验证路径",
                nodes: [
                    { label: "时域", detail: "阶跃、扰动与初值响应" },
                    { label: "极点 / 根轨迹", detail: "检查特征根位置与参数变化" },
                    { label: "频域", detail: "带宽、增益裕度与相位裕度" },
                    { label: "鲁棒验证", detail: "时延、摄动、饱和与未建模动态" },
                ],
                caption: "一次阶跃响应收敛不能代替内部稳定性证明。工程上应联合检查闭环极点、频域裕度和不确定参数下的时域响应。",
            },
        },
    ];
    return presets.find((item) => item.match.test(text))?.figure || null;
}
export type KnowledgeMedia = {
    src: string;
    cardSrc?: string;
    title: string;
    caption: string;
    source: string;
    sourceUrl?: string;
    portrait: boolean;
    objectPosition?: string;
    cardBackgroundSize?: string;
    cardBackgroundPosition?: string;
    details?: Array<{
        label: string;
        value: string;
    }>;
};
export function getKnowledgeTextbookMedia(title: string, category: string): KnowledgeMedia {
    const text = `${title} ${category}`;
    if (/机械设计基础|机构、传动、连接与公差|机构.*公差/i.test(text))
        return {
            src: "/knowledge-mechanical-design.png",
            title: "机械设计装配链与尺寸约束",
            caption: "爆炸图按同一轴线展开联轴器、紧固件、挡圈、轴承、键连接、齿轮、转轴和箱体，既显示装配先后，也显示零件之间的配合与定位关系。它用于把机构、传动、连接和公差从孤立知识点串成完整轴系。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "联轴器、螺栓、挡圈、两组轴承、键连接、齿轮、阶梯轴和剖切箱体。" },
                { label: "阅读顺序", value: "沿中心线从动力输入端向箱体内部阅读，再核对轴肩、挡圈、轴承座和螺栓对零件的轴向与径向定位。" },
                { label: "主要作用", value: "用于分析装配顺序、传动路径、定位基准、公差配合和潜在失效位置；具体尺寸仍以工程图和公差表为准。" },
            ],
        };
    if (/发动机空气|燃油、点火|排放控制|EGR|三元催化|颗粒捕集|DPF|SCR/i.test(text))
        return {
            src: "/knowledge-engine-controls.png",
            title: "发动机进气、燃烧与排放控制路径",
            caption: "剖视图把空气滤清与增压、喷油点火、缸内燃烧、排气、EGR 回流、氧传感和后处理装置放在同一流路中。不同颜色强调新鲜空气、燃烧能量和高温废气的去向，便于理解控制变量之间的耦合。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "进气滤清器、增压器、进气歧管、喷油与点火位置、气缸、排气歧管、EGR 冷却支路、氧传感器和催化后处理。" },
                { label: "阅读顺序", value: "先沿蓝色进气流进入气缸，再观察燃油与点火形成燃烧，最后沿橙色排气流检查 EGR 分流和后处理净化。" },
                { label: "主要作用", value: "用于解释充量、空燃比、点火时刻、NOx 抑制和后处理温度窗口的联动；箭头仅表示功能流向，不代表实际管路尺寸。" },
            ],
        };
    if (/机器人训练|模仿学习|sim-to-real|域随机化|真机部署/i.test(text))
        return {
            src: "/knowledge-robot-sim-to-real.png",
            title: "机器人训练与 Sim-to-Real 部署流程",
            caption: "左侧展示不同光照、物体和工况下的并行仿真训练，中部汇集轨迹数据、参数分布与策略验证，右侧是真实机械臂、安全围栏、传感器和急停装置。图片强调策略不能从仿真直接跳到真机，而要经过数据、随机化和分级验证。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "多环境仿真样本、轨迹数据集、动力学参数分布、策略评测、视觉与力传感器、真机工作站和独立安全装置。" },
                { label: "阅读顺序", value: "从任务与数据开始，经过并行仿真、域随机化和离线评测，再进入低速真机、保护模式和正常工况。" },
                { label: "主要作用", value: "用于识别 Sim-to-Real 差距与部署门槛；成功率之外还要检查碰撞率、约束违反、时延、扰动鲁棒性和故障降级。" },
            ],
        };
    if (/强化学习算法选型|DQN|PPO|SAC|模型方法/i.test(text))
        return {
            src: "/knowledge-rl-algorithms.png",
            title: "DQN、PPO 与 SAC 算法路径对比",
            caption: "三条并行计算路径分别突出离散价值学习、基于新轨迹的受约束策略更新，以及带经验回放的连续动作 Actor-Critic。它们共享环境却使用不同的数据来源、动作形式和更新机制，因此不应只按最终回报高低选型。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "离散动作价值网络与目标网络、PPO 策略分布和新轨迹批次、SAC 双价值估计与连续随机动作，以及共享环境。" },
                { label: "阅读顺序", value: "逐行比较数据是否重复使用、输出是离散动作还是连续分布、价值网络数量和策略更新约束，再回到同一环境看交互成本。" },
                { label: "主要作用", value: "用于依据动作空间、样本成本、稳定性和部署约束选择算法；图示不替代超参数实验和多随机种子统计。" },
            ],
        };
    if (/强化学习基础|MDP|Bellman|价值函数/i.test(text))
        return {
            src: "/knowledge-rl-mdp.png",
            title: "MDP 状态转移与 Bellman 回传",
            caption: "中心节点表示当前状态，蓝色分支表示可选动作和随机转移，绿色方块与红色危险点表示不同奖励结果，右侧暖色路径表示较高长期价值。回传箭头说明当前价值由即时奖励与折扣后的下一状态价值共同构成。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "当前状态、候选动作、多个后继状态、随机转移分支、正负奖励、终止目标和由近及远的价值梯度。" },
                { label: "阅读顺序", value: "从当前状态选择动作，沿分支观察可能后继状态和即时奖励，再从未来高价值区域反向理解 Bellman 递推。" },
                { label: "主要作用", value: "用于区分状态、动作、转移、奖励与价值；节点位置是概念布局，不代表真实物理距离或确定性转移概率。" },
            ],
        };
    if (/嵌入式硬件接口|GPIO.*ADC|ADC.*PWM|SPI.*I²C|硬件接口/i.test(text))
        return {
            src: "/knowledge-embedded-interfaces.png",
            title: "MCU 外设接口、电气连接与波形",
            caption: "中央 MCU 开发板向外连接数字输入输出、模拟传感、PWM 电机驱动、多线同步外设、带上拉的双线总线和异步串口。外围波形把电气信号与软件外设对应起来，避免只看接口名称而忽略电平和时序。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "开关与 LED、模拟传感器、PWM 电机驱动、同步串行外设、双线开漏总线与上拉电阻、异步收发器及对应波形。" },
                { label: "阅读顺序", value: "从 MCU 引脚向外围设备追踪导线数量和方向，再把方波、采样点、时钟与数据信号对应到寄存器和驱动状态机。" },
                { label: "主要作用", value: "用于联合检查原理图、电平、时序、引脚复用与软件配置；图中波形为原理示意，具体频率和阈值以芯片手册与测量为准。" },
            ],
        };
    if (/发动机|内燃机|奥托循环|四冲程|燃烧|喷油|点火/i.test(text))
        return {
            src: "/knowledge-engine-four-stroke.gif",
            title: "四冲程发动机工作循环",
            caption: "活塞在进气、压缩、做功和排气四个冲程之间往复运动，曲轴把活塞直线运动转换为连续旋转输出。观察气门开闭、点火时刻和活塞方向，可以把热力循环与真实机构运动对应起来。",
            source: "Wikimedia Commons · UtzOnBike / A7N8X · CC BY-SA 3.0",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:4-Stroke-Engine.gif",
            portrait: true,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "进气门、排气门、火花塞、活塞、连杆与曲轴在四个冲程中的相对位置和运动方向。" },
                { label: "阅读顺序", value: "按进气、压缩、做功、排气依次观察气门开闭、活塞方向和点火时刻，并注意一个循环需要曲轴旋转两周。" },
                { label: "主要作用", value: "用于把奥托循环阶段对应到真实机构运动；动画不表示真实燃烧速度、压力曲线、热损失和摩擦损失。" },
            ],
        };
    if (/STM32.*(硬件|开发板|接口)|MCU.*(硬件|引脚|外设)|GPIO|ADC|SPI|I²C|I2C|UART|硬件接口/i.test(text))
        return {
            src: "/knowledge-stm32-real.jpg",
            title: "STM32 开发板实物与硬件分区",
            caption: "开发板把 MCU、时钟、复位、供电、调试接口和外设引脚组织在同一块 PCB 上。阅读固件之前，应先在实物和原理图中确认芯片型号、晶振、供电域、接口复用及信号流向。",
            source: "Wikimedia Commons · Viswesr · CC BY-SA 3.0",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:STM32_LV_Discovery_board.jpg",
            portrait: true,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "MCU、晶振、供电与稳压、复位、调试接口、存储器和扩展引脚等开发板基础分区。" },
                { label: "阅读顺序", value: "先确认主芯片和供电域，再沿时钟、复位与调试链路检查启动条件，最后对应外设引脚和复用功能。" },
                { label: "主要作用", value: "用于把固件配置映射到真实硬件位置；芯片型号、引脚编号和电气限制仍应以原理图与数据手册为准。" },
            ],
        };
    if (/工业机器人|机械臂本体|机器人机械结构|关节结构|末端执行器|机器人构造/i.test(text))
        return {
            src: "/knowledge-robot-real.jpg",
            title: "工业机器人实物系统",
            caption: "真实机器人并不是单一算法：机械臂本体、关节驱动、末端工具、传感器、安全装置和控制软件共同构成闭环。模型、代码和训练策略最终都必须回到这套物理系统上验证。",
            source: "Wikimedia Commons · Projekt ANA · CC0 1.0",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:ROMO_FerRobotics_Technisches_Museum_Wien_Februar_2013_File1.JPG",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "机械臂本体、旋转关节、末端法兰、工具、线缆、工作区域和外部安全设施。" },
                { label: "阅读顺序", value: "从基座沿关节链到末端工具，再观察传感器、工作空间和安全边界如何约束控制任务。" },
                { label: "主要作用", value: "用于把算法输出连接到真实执行器和负载；实物照片不提供尺寸、额定载荷或碰撞安全结论。" },
            ],
        };
    if (/ROS|DDS|QoS/i.test(text))
        return {
            src: "/knowledge-ros-network.png",
            title: "ROS 节点通信与数据流",
            caption: "中心机器人与周围计算节点通过多条数据通路协同，直观对应 ROS 中节点、Topic、Service、Action 以及 ROS 2 的 DDS/QoS 通信关系。读图时应重点关注消息方向、频率、可靠性与超时边界。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "机器人控制对象、感知、规划、控制和监测计算节点，以及不同颜色和方向的数据连接。" },
                { label: "阅读顺序", value: "先识别每个节点职责，再沿箭头检查发布与订阅方向、请求响应或长任务反馈，最后核对 DDS/QoS 属性。" },
                { label: "主要作用", value: "用于设计 ROS 计算图和排查端到端通信；连接线表示逻辑数据流，不等同于实际网络拓扑。" },
            ],
        };
    if (/强化学习|MDP|Bellman|Q-learning|DQN|PPO|SAC|机器人训练/i.test(text))
        return {
            src: "/knowledge-reinforcement-loop.png",
            title: "强化学习训练与反馈闭环",
            caption: "智能体输出动作驱动机器人，环境返回状态、奖励和完成信号，经验样本再进入策略更新。该图用于对应状态—动作—转移—奖励链，并提醒训练指标必须与真实任务、安全约束和部署表现联合验证。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "智能体、机器人环境、状态与观测回流、动作通路、奖励确认信号和经验样本堆栈。" },
                { label: "阅读顺序", value: "从智能体输出动作开始，观察机器人与环境产生的新状态和奖励，再沿经验回放路径回到策略更新。" },
                { label: "主要作用", value: "用于理解交互训练闭环；部署结论还需结合样本效率、策略方差、约束违反和独立评测。" },
            ],
        };
    if (/机械臂|轨迹规划|运动学|末端轨迹/i.test(text))
        return {
            src: "/knowledge-robot-real.jpg",
            title: "机械臂实体结构与运动对象",
            caption: "机械臂本体、关节驱动、末端工具、传感器和控制软件共同构成闭环。运动学模型与轨迹规划最终都要在真实执行器、负载、关节限位和安全边界下验证。",
            source: "Wikimedia Commons · Projekt ANA · CC0 1.0",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:ROMO_FerRobotics_Technisches_Museum_Wien_Februar_2013_File1.JPG",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "机器人基座、串联关节、连杆、末端工具、工作对象和关节驱动线缆。" },
                { label: "阅读顺序", value: "从基坐标系沿关节链到末端，区分关节空间运动与末端笛卡尔轨迹，再检查可达域和奇异位形。" },
                { label: "主要作用", value: "用于把运动学和轨迹规划映射到实体机构；真实执行还必须校核限位、速度、加速度、碰撞和负载。" },
            ],
        };
    if (/PMSM|永磁同步电机|电机|矢量控制|FOC|SVPWM|逆变器/i.test(text))
        return {
            src: "/knowledge-reference-atlas.png",
            title: "电机剖面与机电能量转换",
            caption: "剖面图展示定子绕组、转子、转轴与机壳的相对位置。电流经逆变器形成旋转磁场，电磁转矩由转子和轴系输出；控制参数需要与电机结构、温升和机械负载联合校核。",
            source: "资料库工程图集 · 项目内置示意图",
            portrait: false,
            objectPosition: "50% 20%",
            cardBackgroundSize: "300% auto",
            cardBackgroundPosition: "50% 0%",
            details: [
                { label: "图中内容", value: "电机剖面中的定子绕组、转子、永磁体、气隙、转轴、轴承和机壳散热路径。" },
                { label: "阅读顺序", value: "从逆变器电流形成定子磁场开始，观察转子受力和转矩经轴系输出，再追踪铜耗、铁耗和热量传递。" },
                { label: "主要作用", value: "用于连接电磁模型、控制参数与机械热边界；结构比例和材料参数须以电机图纸与试验数据为准。" },
            ],
        };
    if (/轴承|齿轮|传动|机械基础|机械设计|受力|强度|公差/i.test(text))
        return {
            src: "/knowledge-mechanics-load-path.png",
            title: "齿轮—轴—轴承载荷传递路径",
            caption: "剖视结构展示齿轮输入、轴系传递、滚动轴承支承与箱体固定关系，黄色路径表示载荷由输入端向输出端及支承位置传递。开展强度、寿命或公差分析时，应先据此确定边界和危险截面。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "输入齿轮、阶梯轴、滚动轴承、轴承座、剖切箱体、紧固件和贯穿轴系的载荷路径。" },
                { label: "阅读顺序", value: "从齿轮啮合载荷进入轴开始，沿轴追踪弯矩和扭矩，再观察轴承反力如何传入箱体与安装基础。" },
                { label: "主要作用", value: "用于建立自由体图、确定危险截面并开展强度与寿命校核；实际载荷大小仍需由工况和计算确定。" },
            ],
        };
    if (/车辆|悬架|底盘|轮胎|四分之一车/i.test(text))
        return {
            src: "/knowledge-reference-atlas.png",
            title: "车辆悬架与轮端结构参考",
            caption: "轮胎、轮毂、连杆、弹簧和减振器共同传递路面输入。车辆模型中的簧载质量、非簧载质量、刚度和阻尼，均应与真实轮端结构和试验工况对应。",
            source: "资料库工程图集 · 项目内置示意图",
            portrait: false,
            objectPosition: "50% 78%",
            cardBackgroundSize: "300% auto",
            cardBackgroundPosition: "50% 100%",
            details: [
                { label: "图中内容", value: "轮胎、轮毂、转向节、控制臂、弹簧、减振器以及与车身相连的安装点。" },
                { label: "阅读顺序", value: "从路面输入经轮胎和非簧载质量向上阅读，再观察弹簧与减振器如何把振动传递到簧载车身。" },
                { label: "主要作用", value: "用于对应四分之一车模型和真实轮端；几何比例不能直接用于提取刚度、阻尼或悬架运动学参数。" },
            ],
        };
    if (/CAN(?:\s|通信|总线|FD)|CANH|CANL|终端电阻/i.test(text))
        return {
            src: "/knowledge-stm32-real.jpg",
            cardSrc: "/knowledge-reference-atlas.png",
            title: "CAN 控制器、收发器与双绞线",
            caption: "标题图聚焦 ECU、连接器和双绞线构成的 CAN 物理链路；排障时应沿 MCU 控制器、收发器、CANH/CANL、终端电阻和对端节点逐段检查，并结合示波器波形判断电气与协议问题。",
            source: "资料库工程图集 · 项目内置示意图",
            portrait: true,
            objectPosition: "center",
            cardBackgroundSize: "300% auto",
            cardBackgroundPosition: "100% 0%",
            details: [
                { label: "图中内容", value: "MCU 控制器、CAN 收发器、连接器、双绞线、CANH/CANL、终端匹配和对端 ECU。" },
                { label: "阅读顺序", value: "从软件发送请求沿控制器和收发器进入总线，再检查差分电压、终端电阻、帧仲裁和对端应答。" },
                { label: "主要作用", value: "用于定位物理层、驱动层或协议层故障；卡片裁切图强调链路结构，详细电压与时序应以标准和实测波形为准。" },
            ],
        };
    if (/RTOS|实时任务|任务调度|互斥量|信号量|消息队列/i.test(text))
        return {
            src: "/knowledge-rtos-scheduler.png",
            title: "RTOS 任务调度与时间线",
            caption: "微控制器旁的多条时间线表示不同优先级任务、中断、等待与资源互斥过程。沿时间轴观察执行片段和同步点，可以理解抢占、阻塞、消息传递以及最坏响应时间如何共同决定系统实时性。",
            source: "OpenAI 图像生成 · 资料库专题图",
            portrait: false,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "微控制器、多个优先级任务时间线、中断脉冲、运行片段、阻塞区、消息缓冲区和互斥锁。" },
                { label: "阅读顺序", value: "沿水平时间轴观察任务何时就绪、抢占、阻塞和恢复，再核对锁与队列造成的等待以及截止期位置。" },
                { label: "主要作用", value: "用于分析最坏响应时间、优先级反转和资源竞争；时间块长度为关系示意，不能直接当作实测执行时间。" },
            ],
        };
    if (/控制系统|闭环控制|稳定性|频率响应|根轨迹|状态空间|PID/i.test(text))
        return {
            src: "/knowledge-reference-atlas.png",
            title: "闭环控制器、执行器与反馈测量",
            caption: "试验台图把参考输入、控制器、执行器、被控对象和传感器反馈放在同一闭环中。稳定性分析或参数整定时，应同时检查极点与频域指标、时域响应、饱和限制和测量噪声。",
            source: "资料库工程图集 · 项目内置示意图",
            portrait: false,
            objectPosition: "100% 78%",
            cardBackgroundSize: "300% auto",
            cardBackgroundPosition: "100% 100%",
            details: [
                { label: "图中内容", value: "参考输入、控制器、执行器、被控对象、传感器反馈与观测到的时域响应。" },
                { label: "阅读顺序", value: "从参考量沿正向通道到被控对象，再沿传感器反馈回比较点，并同时观察输出波形的超调、振荡和稳态误差。" },
                { label: "主要作用", value: "用于建立闭环因果关系并解释稳定性与性能指标；参数整定仍需基于对象模型、频域分析和实测响应。" },
            ],
        };
    if (/STM32|MCU|RTOS|DMA|中断|GPIO|ADC|SPI|I²C|I2C|UART|CAN|嵌入式/i.test(text))
        return {
            src: "/knowledge-stm32-real.jpg",
            title: "MCU 核心器件与固件运行载体",
            caption: "开发板上的微控制器、时钟、Flash、RAM、供电、复位、调试端口和外设引脚共同构成固件运行载体。理解启动、中断和 DMA 时，应把代码执行路径映射到芯片内部资源与板级连接。",
            source: "Wikimedia Commons · Viswesr · CC BY-SA 3.0",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:STM32_LV_Discovery_board.jpg",
            portrait: true,
            objectPosition: "center",
            details: [
                { label: "图中内容", value: "MCU 内核与片上总线、Flash、RAM、中断控制器、DMA、时钟、调试端口和外设引脚。" },
                { label: "阅读顺序", value: "从复位和时钟启动开始，依次理解程序与数据存储、外设寄存器映射、中断响应和 DMA 数据搬运路径。" },
                { label: "主要作用", value: "用于建立固件运行的硬件全景；缓存、地址映射、总线带宽和低功耗细节应以具体 MCU 参考手册为准。" },
            ],
        };
    return {
        src: "/knowledge-engineering-hero.png",
        title: "工程系统对象与验证场景",
        caption: "图中汇集机器人、电机、轴承、嵌入式控制器和车辆悬架等典型工程对象，用于说明知识条目应从概念和模型延伸到结构、信号、载荷与验证场景。",
        source: "资料库工程总览 · 项目内置示意图",
        portrait: false,
        objectPosition: "center",
        details: [
            { label: "图中内容", value: "机器人、电机、轴承、控制器和车辆等典型工程对象及其验证场景。" },
            { label: "阅读顺序", value: "先确定知识条目对应的对象，再识别输入、结构或信号、输出和验证环节。" },
            { label: "主要作用", value: "用于尚未匹配专用封面的通用知识；它只提供工程阅读框架，不应替代条目专属结构图。" },
        ],
    };
}
