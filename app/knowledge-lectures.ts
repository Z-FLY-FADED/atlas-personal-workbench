import { findMainstreamLecture } from "./knowledge-mainstream";

export type LectureDetail = {
  learningObjectives: string[];
  theorySections: Array<{ title: string; content: string }>;
  equations: Array<{ name: string; formula: string; variables: string[]; interpretation: string; assumptions: string[] }>;
  derivationSteps: string[];
  engineeringChecklist: string[];
  workedExample: { title: string; given: string[]; steps: string[]; result: string };
};

type LectureInput = { title: string; summary: string; content?: string; primaryCategory: string; secondaryCategory: string };

const catalog: Array<{ match: RegExp; detail: LectureDetail }> = [
  { match: /CAN|控制器局域网/i, detail: {
    learningObjectives: ["解释CAN差分物理层、总线拓扑与终端匹配", "独立计算位时间、波特率和采样点", "解释无损仲裁、错误计数与总线关闭机制", "按物理层到应用层的顺序定位通信故障"],
    theorySections: [
      { title: "物理层与信号完整性", content: "高速CAN采用双绞线差分传输。接收器判断的是CANH与CANL的电压差，因此同向耦合到两根线上的共模噪声会被部分抵消。线缆是分布参数传输线，阻抗突变会产生反射；两端终端电阻用于吸收传播到端点的能量。断电测量完整总线CANH与CANL之间通常约为60Ω，这是两个120Ω终端并联的结果。" },
      { title: "显性/隐性逻辑与无损仲裁", content: "CAN使用线与逻辑：显性位能够覆盖隐性位。多个节点同时发送时，每个节点边发送边回读总线；若自己发送隐性而读到显性，说明存在更高优先级报文，立即退出仲裁。因退出发生在仲裁字段，获胜报文没有被破坏。标准帧中ID数值越小，越早发送显性位，优先级越高。" },
      { title: "错误检测与故障隔离", content: "协议同时使用位监视、位填充检查、CRC、格式检查和ACK检查。发送错误计数TEC与接收错误计数REC按规则增减；错误较多时节点由错误主动转为错误被动，TEC超过阈值后进入Bus-Off。该机制把持续故障节点从总线上隔离，避免网络被错误帧淹没。" },
    ],
    equations: [
      { name: "位时间与波特率", formula: "t_bit = (1 + TSEG1 + TSEG2) × BRP / f_CAN；BitRate = 1 / t_bit", variables: ["f_CAN：CAN外设时钟", "BRP：波特率预分频系数", "TSEG1：传播段+相位缓冲段1的时间量子数", "TSEG2：相位缓冲段2的时间量子数", "1：同步段固定占1个时间量子"], interpretation: "先确定外设时钟，再选择总时间量子数与BRP。常见目标是在满足波特率的同时，把采样点布置在约75%～87.5%的位时间位置。", assumptions: ["各节点使用相同标称波特率", "控制器参数定义与芯片手册一致", "线缆传播延迟未超过相位补偿能力"] },
      { name: "采样点", formula: "SamplePoint = (1 + TSEG1) / (1 + TSEG1 + TSEG2) × 100%", variables: ["SamplePoint：接收器判定位值的时刻", "TSEG1、TSEG2：位时间分段"], interpretation: "采样过早时传播延迟尚未稳定，过晚则留给重同步的余量不足。长总线、高速率和时钟偏差需联合评估。", assumptions: ["采用单采样模式", "同步跳转宽度SJW不大于TSEG2"] },
      { name: "终端等效阻抗", formula: "R_bus = R_T1 ∥ R_T2 = (R_T1 × R_T2) / (R_T1 + R_T2)", variables: ["R_T1、R_T2：总线两端终端电阻", "R_bus：断电后CANH与CANL间测得的等效电阻"], interpretation: "两个120Ω终端并联得到约60Ω。明显偏高通常表示终端缺失或开路，偏低可能表示终端过多或短路。", assumptions: ["节点断电", "测量点与总线连通", "收发器内部电路对直流测量影响可忽略"] },
    ],
    derivationSteps: ["从外设时钟f_CAN出发，把一个位划分为同步段、TSEG1和TSEG2", "总时间量子数乘以BRP/f_CAN得到单个位持续时间", "取倒数得到波特率，并用(1+TSEG1)/总时间量子数检查采样点", "结合总线长度、收发器延迟和晶振误差选择SJW与采样点", "通过分析仪观察ACK、错误帧和Bus-Off计数，验证理论配置"],
    engineeringChecklist: ["确认CAN外设实际时钟，避免把APB时钟或倍频关系理解错误", "断电测量CANH-CANL约60Ω，并检查终端只位于干线两端", "核对所有节点的波特率、采样点、帧格式与ID类型", "检查过滤器是否允许目标ID进入FIFO", "读取TEC、REC、LEC和Bus-Off状态，而不是只看发送函数返回值", "用示波器检查差分幅值、振铃、共模范围和支线长度", "明确Bus-Off恢复是自动恢复还是由软件复位控制器"],
    workedExample: { title: "以42 MHz外设时钟配置500 kbit/s", given: ["f_CAN = 42 MHz", "目标BitRate = 500 kbit/s", "选择总时间量子数 = 14", "期望采样点约85.7%"], steps: ["所需位时间t_bit = 1/500000 = 2 μs", "每位需要14个时间量子，因此单个TQ = 2 μs / 14 ≈ 142.857 ns", "BRP = TQ × f_CAN = 142.857 ns × 42 MHz = 6", "取TSEG1 = 11、TSEG2 = 2，加同步段后总TQ为14", "采样点=(1+11)/14=85.7%，名义波特率=42 MHz/(6×14)=500 kbit/s"], result: "BRP=6、TSEG1=11、TSEG2=2可得到500 kbit/s和85.7%采样点；还需依据芯片寄存器是否采用“写入值=实际值−1”进行换算，并在真实总线上验证。" },
  } },
  { match: /永磁同步|PMSM|矢量控制|FOC/i, detail: {
    learningObjectives: ["从三相模型推导dq轴电压方程", "解释id、iq解耦与电磁转矩的关系", "掌握电流环、速度环和SVPWM的带宽配置", "理解MTPA与弱磁控制的使用边界"],
    theorySections: [
      { title: "坐标变换的目的", content: "三相定子电流在abc坐标系中是随转子位置周期变化的正弦量。Clarke变换把三相量映射到静止αβ平面，Park变换再以电角速度旋转坐标系，使稳态正弦量变成近似直流量。这样可以使用PI调节器分别控制磁链分量id和转矩分量iq。" },
      { title: "dq轴耦合与前馈解耦", content: "dq电压方程中存在±ωeL·i交叉项和反电动势ωeψf。转速升高后，这些项显著增大，仅依赖PI会产生相位滞后和电流误差，因此工程中加入交叉耦合与反电动势前馈。" },
      { title: "电压约束、MTPA与弱磁", content: "逆变器可输出电压受直流母线限制。低速区通常以最大转矩电流比MTPA减少铜耗；达到基速后反电动势接近电压上限，需要施加负id削弱等效磁链，以扩大恒功率速度范围。" },
    ],
    equations: [
      { name: "dq轴电压模型", formula: "u_d = R_s i_d + L_d·di_d/dt − ω_e L_q i_q；u_q = R_s i_q + L_q·di_q/dt + ω_e(L_d i_d + ψ_f)", variables: ["u_d、u_q：dq轴定子电压", "i_d、i_q：励磁与转矩电流", "R_s：定子电阻", "L_d、L_q：dq轴电感", "ω_e：电角速度", "ψ_f：永磁体磁链"], interpretation: "模型把电阻压降、电感动态、交叉耦合和反电动势分离，是电流环设计与前馈补偿的基础。", assumptions: ["忽略铁耗与高频谐波", "参数在当前温度和磁饱和程度下有效", "转子角度估计正确"] },
      { name: "电磁转矩", formula: "T_e = 3p/2 · [ψ_f i_q + (L_d − L_q)i_d i_q]", variables: ["p：极对数", "第一项：永磁转矩", "第二项：磁阻转矩"], interpretation: "表贴式PMSM通常Ld≈Lq，转矩主要由iq决定；内埋式PMSM可利用凸极差产生磁阻转矩。", assumptions: ["正弦反电动势", "三相对称", "采用幅值不变或功率不变变换时需保持系数约定一致"] },
      { name: "机械运动方程", formula: "J·dω_m/dt = T_e − T_L − Bω_m", variables: ["J：转动惯量", "ω_m：机械角速度", "T_L：负载转矩", "B：黏性阻尼系数"], interpretation: "电流环改变电磁转矩，速度环通过机械方程改变转速。由于机械环节明显慢于电气环节，速度环带宽通常设置为电流环的1/5～1/10。", assumptions: ["刚性轴系", "负载转矩在采样周期内近似连续"] },
    ],
    derivationSteps: ["从三相电压方程和磁链方程出发，使用Clarke变换得到αβ模型", "用转子电角度θe执行Park变换，得到dq旋转坐标系模型", "把ωeLq·iq、ωe(Ld·id+ψf)作为前馈项抵消耦合", "根据电机Rs、Ld/Lq和采样周期整定电流PI", "在稳定电流环基础上建立机械模型并整定速度PI", "最后加入电压限幅、抗积分饱和、MTPA和弱磁状态切换"],
    engineeringChecklist: ["标定相序、电流采样零偏与增益", "确认编码器零位、电角度方向和极对数", "先锁轴验证dq电流与转矩方向", "电流环带宽必须低于PWM与采样频率的可实现范围", "加入电压矢量限幅与PI抗积分饱和", "在线考虑Rs温漂、磁饱和和母线波动", "验证过流、失速、过压和位置传感器故障保护"],
    workedExample: { title: "表贴式PMSM的转矩电流估算", given: ["极对数p=4", "永磁体磁链ψf=0.08 Wb", "Ld≈Lq，令id=0", "目标转矩Te=6 N·m"], steps: ["表贴式电机磁阻转矩近似为0", "转矩方程化为Te=3pψf·iq/2", "iq=2Te/(3pψf)=12/(3×4×0.08)", "计算得到iq=12.5 A"], result: "理想模型下iq参考值约为12.5 A。实际控制还需考虑磁链辨识误差、逆变器压降、温升与电流限幅。" },
  } },
  { match: /轴承|L10|寿命/i, detail: {
    learningObjectives: ["区分基本额定寿命、修正寿命与可靠度", "计算径向/轴向组合载荷下的等效动载荷", "处理多工况变载荷与转速", "识别润滑、污染、游隙和安装对寿命的影响"],
    theorySections: [{ title: "疲劳寿命的统计含义", content: "滚动轴承基本额定寿命L10是同型号、同条件轴承中90%不发生滚动接触疲劳剥落的寿命，不是单个轴承的确定失效时间。公式来自载荷—寿命统计关系，不能覆盖润滑失效、污染磨损、保持架损坏或安装错误。" }, { title: "等效动载荷", content: "实际载荷可能同时包含径向力Fr与轴向力Fa。标准方法使用载荷系数X、Y把组合载荷折算为产生同等疲劳损伤的等效动载荷P；X、Y与轴承类型、Fa/Fr及接触角有关。" }, { title: "多工况累积损伤", content: "设备在不同载荷和转速下运行时，需要按转数占比而不是单纯时间占比折算。由于寿命对载荷呈幂次关系，少量高载荷工况可能主导总损伤。" }],
    equations: [
      { name: "基本额定寿命", formula: "L_10 = (C/P)^p × 10⁶ rev；L_10h = L_10 / (60n)", variables: ["C：基本额定动载荷", "P：等效动载荷", "p=3：球轴承", "p=10/3：滚子轴承", "n：转速r/min"], interpretation: "载荷进入幂指数，P增加10%会造成显著寿命下降。C与P必须采用相同单位。", assumptions: ["载荷和转速恒定", "安装、润滑与清洁度满足基本条件", "失效模式为滚动接触疲劳"] },
      { name: "组合载荷折算", formula: "P = X F_r + Y F_a", variables: ["Fr：径向载荷", "Fa：轴向载荷", "X、Y：由轴承类型和载荷比查表得到"], interpretation: "当Fa/Fr较小时，P可能近似Fr；超过判定值e后，轴向载荷权重显著增加。", assumptions: ["载荷方向和轴承受力分配已正确求得", "X、Y取自制造商或标准表格"] },
      { name: "多工况等效载荷", formula: "P_eq = [Σ(P_i^p n_i t_i) / Σ(n_i t_i)]^(1/p)", variables: ["Pi：第i工况等效载荷", "ni：第i工况转速", "ti：持续时间", "p：寿命指数"], interpretation: "权重是各工况累计转数ni·ti，高载荷通过p次方被放大。", assumptions: ["各工况可用Palmgren-Miner型线性损伤思想折算", "载荷谱具有代表性"] },
    ],
    derivationSteps: ["由齿轮、皮带或外载荷建立轴系受力图", "计算各轴承反力并分解Fr与Fa", "依据轴承型式和Fa/Fr查X、Y，得到各工况Pi", "按转速与持续时间计算Peq", "代入C/P幂次关系得到L10或小时寿命", "根据目标可靠度、润滑黏度比和污染条件进行修正并校核静强度"],
    engineeringChecklist: ["区分C基本额定动载荷与C0基本额定静载荷", "载荷谱必须包含启动、冲击、过载和反转", "检查轴承游隙、预紧、配合与轴系挠度", "核对润滑方式、黏度、温度和污染等级", "对高速工况校核极限转速与发热", "寿命满足后仍需校核静安全系数和接触应力", "优先使用轴承制造商最新技术手册中的系数"],
    workedExample: { title: "6208球轴承恒载寿命", given: ["C=30.7 kN", "等效动载荷P=5 kN", "转速n=1200 r/min", "球轴承指数p=3"], steps: ["C/P=30.7/5=6.14", "L10=6.14³×10⁶≈231.5×10⁶ rev", "每小时转数=60×1200=72000 rev", "L10h=231.5×10⁶/72000≈3215 h"], result: "基本额定寿命约3215 h。这只是90%可靠度下的滚动疲劳基准值，尚未加入润滑、污染、可靠度与温度修正。" },
  } },
  { match: /轨迹规划|五次多项式|机械臂/i, detail: {
    learningObjectives: ["区分路径、轨迹与时间参数化", "由边界条件求五次多项式系数", "检查速度、加速度和加加速度约束", "比较梯形、S曲线、样条与时间最优参数化"],
    theorySections: [{ title: "路径与轨迹", content: "路径只描述几何位置集合q(s)，轨迹还规定每个位置对应的时间q(t)。工业控制器必须输出随时间连续的关节位置、速度和加速度；若加速度不连续，会产生冲击和结构振动。" }, { title: "五次多项式的边界匹配", content: "五次多项式有6个系数，恰好可以满足起点和终点的位置、速度、加速度共6个边界条件。它保证加速度连续，但加加速度jerk通常在分段连接处仍需额外检查。" }, { title: "关节空间与笛卡尔空间", content: "关节空间插值易满足电机约束且计算稳定，但末端路径未必是直线；笛卡尔空间插值能控制末端几何路径，却可能遇到逆解跳变、奇异点和关节速度放大。" }],
    equations: [
      { name: "五次多项式", formula: "q(t)=a₀+a₁t+a₂t²+a₃t³+a₄t⁴+a₅t⁵", variables: ["q：关节位置或路径参数", "a0…a5：由六个边界条件求得", "t∈[0,T]"], interpretation: "对q(t)求一阶、二阶和三阶导数即可得到速度、加速度与jerk，用于驱动约束和振动评估。", assumptions: ["单段运动时间T已给定", "边界条件可实现", "插值过程中不穿越奇异或碰撞区域"] },
      { name: "零速零加速度归一化轨迹", formula: "q(t)=q₀+(q_f−q₀)[10τ³−15τ⁴+6τ⁵]，τ=t/T", variables: ["q0、qf：起终点位置", "τ：归一化时间", "T：规划时长"], interpretation: "该形式直接满足两端速度与加速度为0。增大T会按1/T降低速度、按1/T²降低加速度、按1/T³降低jerk。", assumptions: ["起终点速度和加速度均为0"] },
      { name: "关节速度与末端速度", formula: "v = J(q)·q̇；q̇ = J⁺(q)·v", variables: ["J：雅可比矩阵", "J⁺：伪逆", "v：末端线速度与角速度", "q̇：关节速度"], interpretation: "接近奇异点时J条件数变差，有限末端速度会要求极大的关节速度，因此需阻尼伪逆或避开奇异区域。", assumptions: ["机器人运动学模型与标定参数准确", "当前构型可微"] },
    ],
    derivationSteps: ["写出q、q̇、q̈在t=0与t=T的六个边界方程", "组成6×6线性方程组求a0…a5", "对多项式求导获得速度、加速度与jerk", "求各导数在[0,T]内的极值并与关节限制比较", "若超限，增大T或采用受约束时间参数化", "通过正运动学、碰撞检测和真机低速试运行验证末端路径"],
    engineeringChecklist: ["统一角度单位、时间单位与控制周期", "所有关节同步到达时应共享或协调T", "检查中间时刻而非只看端点约束", "评估雅可比条件数和逆解连续性", "加入速度、加速度、jerk、力矩与碰撞限制", "离散采样后重新计算数值导数，防止采样造成峰值", "真机首次运行使用低速、限位和急停保护"],
    workedExample: { title: "关节从0°运动到90°", given: ["q0=0 rad", "qf=π/2 rad", "T=2 s", "两端速度和加速度均为0"], steps: ["令τ=t/2，使用归一化五次轨迹", "q(t)=π/2·(10τ³−15τ⁴+6τ⁵)", "中点τ=0.5时，位置为π/4=45°", "归一化速度函数为(30τ²−60τ³+30τ⁴)/T", "τ=0.5处达到峰值，q̇max=(π/2)×1.875/2≈1.473 rad/s"], result: "2 s规划下峰值速度约84.4°/s。若电机限速低于该值，需要增大T或改用显式受限速度规划。" },
  } },
  { match: /悬架|四分之一车辆/i, detail: {
    learningObjectives: ["建立二自由度四分之一车辆动力学方程", "解释车身加速度、悬架动挠度和轮胎动载荷三类指标", "分析刚度与阻尼的参数权衡", "理解被动、半主动和主动悬架方法"],
    theorySections: [{ title: "模型构成", content: "四分之一车模型把整车简化为簧载质量ms与非簧载质量mu。悬架弹簧ks和阻尼cs连接两质量，轮胎通常简化为刚度kt，路面位移zr作为基座输入。该模型抓住垂向舒适性与轮胎接地性的主要矛盾。" }, { title: "舒适与操稳的冲突", content: "降低悬架刚度有利于隔离高频路面输入，但会增大悬架行程；增大阻尼能抑制共振，却可能把更多高频振动传给车身。轮胎动载荷过大则意味着接地力波动，影响制动和转向能力。" }, { title: "频率域解释", content: "系统通常存在车身跳动低频模态和车轮跳动高频模态。扫频分析能看到两个共振峰，参数设计目标是在可接受的悬架行程内降低车身加速度，并控制轮胎动载荷。" }],
    equations: [
      { name: "簧载质量方程", formula: "m_s z̈_s + c_s(ż_s−ż_u) + k_s(z_s−z_u) = F_a", variables: ["zs、zu：车身与车轮垂向位移", "ms：簧载质量", "ks、cs：悬架刚度与阻尼", "Fa：主动悬架作动力，被动悬架取0"], interpretation: "车身加速度由悬架相对位移和相对速度产生的力决定，是舒适性评价核心。", assumptions: ["小位移线性运动", "忽略悬架几何非线性与摩擦"] },
      { name: "非簧载质量方程", formula: "m_u z̈_u − c_s(ż_s−ż_u) − k_s(z_s−z_u) + k_t(z_u−z_r) = −F_a", variables: ["mu：非簧载质量", "kt：轮胎垂向刚度", "zr：路面位移输入"], interpretation: "轮胎变形kt(zu−zr)产生轮胎动载荷，反映车轮跟随路面的能力。", assumptions: ["轮胎不离地", "忽略轮胎阻尼或将其并入模型"] },
      { name: "车身固有频率与阻尼比近似", formula: "f_s≈(1/2π)√(k_s/m_s)；ζ_s≈c_s/(2√(k_s m_s))", variables: ["fs：车身模态频率", "ζs：车身模态阻尼比"], interpretation: "这是一自由度近似，用于参数初选；最终结果需回到二自由度特征值或频响分析。", assumptions: ["轮胎刚度远大于悬架刚度", "车轮模态对低频车身模态影响较小"] },
    ],
    derivationSteps: ["分别对簧载质量和非簧载质量画受力图", "按牛顿第二定律列出两个耦合微分方程", "选择状态x=[zs−zu, żs, zu−zr, żu]建立状态空间模型", "对阶跃、正弦扫频和随机路谱求车身加速度、悬架行程与轮胎动载荷", "改变ks、cs进行灵敏度分析并绘制Pareto权衡", "用台架或道路采集数据辨识参数并校准模型"],
    engineeringChecklist: ["明确ms、mu是单角质量而非整车质量", "用轮胎试验或资料获得有效kt", "加入限位块、摩擦和阻尼非线性做极限工况验证", "随机路面应按标准功率谱密度生成并检查空间频率到时间频率换算", "舒适性需结合加权加速度而非单一峰值", "检查轮胎是否离地和悬架是否触底", "仿真步长应能覆盖车轮高频模态"],
    workedExample: { title: "车身模态参数初估", given: ["ms=300 kg", "ks=18000 N/m", "cs=1500 N·s/m"], steps: ["fs≈(1/2π)√(18000/300)", "√60≈7.746 rad/s，因此fs≈1.233 Hz", "临界阻尼cc=2√(ks·ms)=2√(5.4×10⁶)≈4648 N·s/m", "ζs=1500/4648≈0.323"], result: "车身低频模态约1.23 Hz、阻尼比约0.32。该值只用于初估，必须结合非簧载质量和轮胎刚度计算二自由度真实模态。" },
  } },
  { match: /稳定性|根轨迹|频域|状态空间/i, detail: {
    learningObjectives: ["从闭环特征方程判断内部稳定性", "使用Routh、根轨迹、Bode/Nyquist与状态空间方法", "区分稳定性、相对稳定性与鲁棒性", "处理时延、饱和、参数摄动和未建模动态"],
    theorySections: [{ title: "稳定性的核心", content: "对线性时不变连续系统，内部稳定要求闭环全部极点位于复平面左半平面。极点实部决定指数衰减或增长，虚部决定振荡频率。仅观察一次阶跃响应可能漏掉未被当前输入激发的内部不稳定模态。" }, { title: "频率响应与稳定裕度", content: "开环频响描述不同频率下的增益和相位。相位裕度与增益裕度衡量系统距离临界振荡还有多少余量；带宽影响响应速度和噪声敏感度。裕度是工程鲁棒性的近似指标，不替代不确定性建模。" }, { title: "状态空间与Lyapunov", content: "状态空间直接描述内部状态。连续线性系统ẋ=Ax在A为Hurwitz矩阵时渐近稳定；等价地，对任意Q>0存在P>0满足AᵀP+PA=−Q。Lyapunov方法还能扩展到非线性系统局部稳定性分析。" }],
    equations: [
      { name: "闭环传递函数与特征方程", formula: "T(s)=G(s)/(1+G(s)H(s))；1+G(s)H(s)=0", variables: ["G(s)：前向通道", "H(s)：反馈通道", "特征方程根：闭环极点"], interpretation: "改变增益或控制器参数会移动特征根；根轨迹展示增益变化时极点的连续运动。", assumptions: ["系统线性时不变", "模型不存在未处理的极零抵消风险"] },
      { name: "二阶指标", formula: "s²+2ζω_n s+ω_n²=0；M_p=e^(−πζ/√(1−ζ²))；t_s≈4/(ζω_n)", variables: ["ζ：阻尼比", "ωn：自然频率", "Mp：单位阶跃超调量", "ts：2%稳定时间近似"], interpretation: "极点位置可以直接连接到超调和稳定时间，但高阶系统只有在主导极点明显时才能使用二阶近似。", assumptions: ["0<ζ<1", "高阶极点远离主导极点", "无显著零点影响"] },
      { name: "Lyapunov方程", formula: "AᵀP + PA = −Q，Q>0，P>0", variables: ["A：系统矩阵", "P：Lyapunov函数V=xᵀPx的权重", "Q：任意正定矩阵"], interpretation: "若能找到正定P，则V沿系统轨迹严格下降，证明原点渐近稳定。", assumptions: ["连续线性自治系统", "A、P、Q维数匹配"] },
    ],
    derivationSteps: ["确定工作点并线性化，检查线性模型适用范围", "建立开环G(s)H(s)或状态空间(A,B,C,D)", "先检查开环/闭环极点和Routh符号变化", "用根轨迹选择增益范围并识别主导极点", "用Bode/Nyquist检查带宽、交叉频率与稳定裕度", "加入时延、参数摄动、饱和和噪声进行鲁棒性验证", "对关键非线性或多变量系统使用Lyapunov、μ分析或仿真包络补充"],
    engineeringChecklist: ["不要用‘输出看起来收敛’替代内部稳定性检查", "核查传感器、执行器和计算延迟", "防止不稳定极零点被代数抵消隐藏", "明确增益裕度和相位裕度的测量交叉频率", "验证控制器离散化后的极点位于单位圆内", "加入限幅与抗积分饱和", "对参数上下限和未建模高频动态做批量分析"],
    workedExample: { title: "标准二阶闭环性能估算", given: ["闭环特征式s²+4s+16=0", "与s²+2ζωn s+ωn²对比"], steps: ["ωn²=16，因此ωn=4 rad/s", "2ζωn=4，因此ζ=0.5", "Mp=e^(−π×0.5/√0.75)≈0.163，即16.3%", "ts≈4/(0.5×4)=2 s", "极点为−2±j3.464，位于左半平面"], result: "系统渐近稳定，预计超调约16.3%、2%稳定时间约2 s。若存在零点或高阶慢极点，需要用完整模型重新计算。" },
  } },
];

const fallbackByCategory: Record<string, LectureDetail> = {
  机械: catalog[2].detail,
  电气: catalog[1].detail,
  机器人: catalog[3].detail,
  车辆: catalog[4].detail,
  系统: catalog[5].detail,
  嵌入式: catalog[0].detail,
};

export function buildLectureDetail(input: LectureInput): LectureDetail {
  const text = `${input.title} ${input.summary} ${input.content || ""} ${input.secondaryCategory}`;
  return catalog.find((item) => item.match.test(text))?.detail || findMainstreamLecture(text) || fallbackByCategory[input.primaryCategory] || fallbackByCategory.系统;
}
