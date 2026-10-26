export type FormulaForLesson = {
    name: string;
    formula: string;
    interpretation: string;
    variables: string[];
    assumptions: string[];
};
export type FormulaLessonNote = {
    question: string;
    principle: string;
    derivation: string[];
    units: string;
    intuition: string;
    boundary: string;
};
export type FormulaDerivationStep = {
    title: string;
    formula?: string;
    explanation: string;
};
export function detailedFormulaDerivation(equation: FormulaForLesson): FormulaDerivationStep[] {
    const name = equation.name;
    if (/五次多项式/.test(name))
        return [
            {
                title: "写出位置及其各阶导数",
                formula: String.raw `\begin{aligned}q(t)&=a_0+a_1t+a_2t^2+a_3t^3+a_4t^4+a_5t^5\\ \dot q(t)&=a_1+2a_2t+3a_3t^2+4a_4t^3+5a_5t^4\\ \ddot q(t)&=2a_2+6a_3t+12a_4t^2+20a_5t^3\end{aligned}`,
                explanation: "五次多项式包含六个待定系数，因此需要六个相互独立的边界条件才能得到唯一解。",
            },
            {
                title: "代入起点和终点边界",
                formula: String.raw `q(0)=q_0,\;\dot q(0)=v_0,\;\ddot q(0)=a_0^{*},\qquad q(T)=q_f,\;\dot q(T)=v_f,\;\ddot q(T)=a_f`,
                explanation: "把两端的位置、速度和加速度代入后形成六元一次方程组。这里用 a₀* 表示起点加速度，以免与多项式系数 a₀ 混淆。",
            },
            {
                title: "零速零加速度条件下化简",
                formula: String.raw `q(t)=q_0+(q_f-q_0)\left(10\tau^3-15\tau^4+6\tau^5\right),\qquad \tau=\frac{t}{T}`,
                explanation: "当两端速度和加速度均为零时可得到常用归一化形式。速度、加速度和 jerk 峰值分别按 1/T、1/T² 和 1/T³ 缩放。",
            },
        ];
    if (/理想奥托循环热效率/.test(name))
        return [
            {
                title: "从循环热效率定义出发",
                formula: String.raw `\eta=1-\frac{Q_{out}}{Q_{in}}=1-\frac{c_v(T_4-T_1)}{c_v(T_3-T_2)}`,
                explanation: "理想奥托循环的吸热与放热均为等容过程，因此热量可直接写成定容比热与温差的乘积。",
            },
            {
                title: "使用绝热过程温度关系",
                formula: String.raw `\frac{T_2}{T_1}=r^{\gamma-1},\qquad \frac{T_3}{T_4}=r^{\gamma-1}`,
                explanation: "压缩和膨胀视为可逆绝热过程，压缩比 r 将状态点温度联系起来。",
            },
            {
                title: "消去状态温度",
                formula: String.raw `\eta_{\mathrm{Otto}}=1-\frac{1}{r^{\gamma-1}}`,
                explanation: "代入温度关系并约去相同项后得到效率式。它说明提高压缩比能够提高理想效率，但实际发动机会受爆震、传热和排放约束。",
            },
        ];
    if (/Q-learning/.test(name))
        return [
            {
                title: "写出 Bellman 最优方程",
                formula: String.raw `Q^{*}(s,a)=\mathbb E\!\left[r+\gamma\max_{a'}Q^{*}(s',a')\mid s,a\right]`,
                explanation: "最优动作价值等于当前奖励与下一状态最优价值折扣和的期望。",
            },
            {
                title: "用单次样本构造自举目标",
                formula: String.raw `y_t=r_{t+1}+\gamma\max_a Q(s_{t+1},a)`,
                explanation: "真实期望未知时，以一次状态转移样本近似 Bellman 目标；该目标本身依赖当前价值估计，因此称为自举。",
            },
            {
                title: "沿时序差分误差更新",
                formula: String.raw `\delta_t=y_t-Q(s_t,a_t),\qquad Q(s_t,a_t)\leftarrow Q(s_t,a_t)+\alpha\delta_t`,
                explanation: "学习率 α 决定新样本修正旧估计的幅度；探索覆盖、奖励尺度和目标非平稳性决定实际收敛质量。",
            },
        ];
    if (/平面静力平衡/.test(name))
        return [
            {
                title: "隔离研究对象并画受力图",
                explanation: "切断所有连接，以未知反力代替约束；统一坐标正方向，并将分布载荷等效为合力及其作用点。",
            },
            {
                title: "应用平动与转动平衡",
                formula: String.raw `\sum \mathbf F=m\mathbf a=0,\qquad \sum M_O=I_O\alpha=0`,
                explanation: "静力问题中线加速度与角加速度均为零，于是牛顿—欧拉方程退化为力和力矩平衡。",
            },
            {
                title: "求解并回代检查",
                formula: String.raw `\sum F_x=0,\qquad \sum F_y=0,\qquad \sum M_O=0`,
                explanation: "优先选择能消去最多未知量的取矩点；求解后检查反力方向、数量级以及整体平衡。",
            },
        ];
    if (/轴向正应力/.test(name))
        return [
            {
                title: "对杆件作截面切割",
                formula: String.raw `F=\int_A \sigma\,\mathrm dA`,
                explanation: "截面内分布应力的合力必须与外部轴向载荷平衡，这是公式的力学起点。",
            },
            {
                title: "采用均匀应力近似",
                formula: String.raw `F=\sigma\int_A\mathrm dA=\sigma A`,
                explanation: "当载荷通过截面形心、远离几何突变且材料处于线弹性范围时，可认为截面平均应力近似均匀。",
            },
            {
                title: "整理并进行强度判定",
                formula: String.raw `\sigma=\frac{F}{A},\qquad \sigma_{max}\leq[\sigma]`,
                explanation: "计算值还需与许用应力比较；孔、圆角、螺纹根部等位置应另外考虑应力集中。",
            },
        ];
    if (/周期任务处理器利用率/.test(name))
        return [
            {
                title: "计算单个任务占用比例",
                formula: String.raw `U_i=\frac{C_i}{T_i}`,
                explanation: "任务每周期最多执行 Cᵢ 时间，因此 Cᵢ/Tᵢ 表示其长期平均处理器需求。",
            },
            {
                title: "叠加全部周期任务",
                formula: String.raw `U=\sum_{i=1}^{n}U_i=\sum_{i=1}^{n}\frac{C_i}{T_i}`,
                explanation: "在单核处理器上，各任务执行时间不能重叠，故总利用率为各任务占用比例之和。",
            },
            {
                title: "加入调度可行性条件",
                formula: String.raw `U\leq1\quad\text{仅为必要条件；RM 下还需检查 }U\leq n(2^{1/n}-1)`,
                explanation: "利用率小于 100% 不代表必然可调度，还要考虑优先级、截止期、阻塞、中断和上下文切换。",
            },
        ];
    if (/ADC 理想量化步长/.test(name))
        return [
            {
                title: "确定量化区间数量",
                formula: String.raw `N_{level}=2^N`,
                explanation: "N 位二进制输出最多表示 2ᴺ 个离散码，理想量化器把满量程均匀划分为相同宽度区间。",
            },
            {
                title: "由满量程除以区间数",
                formula: String.raw `\Delta V=\frac{V_{ref}}{2^N}`,
                explanation: "ΔV 是一个最低有效位对应的理想输入电压增量；具体芯片的满量程端点定义应以数据手册为准。",
            },
            {
                title: "估计理想量化误差",
                formula: String.raw `e_q\in\left[-\frac{\Delta V}{2},\frac{\Delta V}{2}\right]`,
                explanation: "舍入量化时误差理想上限为半个 LSB；实际系统还叠加参考源噪声、失调、增益误差和非线性。",
            },
        ];
    return [0, 1, 2].map((index) => {
        const assumption = equation.assumptions[index] ||
            equation.assumptions[0] ||
            "变量连续且模型参数在分析区间内有效";
        return {
            title: index === 0
                ? "建立对象与基本关系"
                : index === 1
                    ? "代入约束并整理"
                    : "检查结果与适用范围",
            formula: index === 1 ? equation.formula : undefined,
            explanation: index === 0
                ? `从研究对象的守恒、平衡或定义关系出发。当前推导采用“${assumption}”这一前提，并明确各变量的正方向和单位。`
                : index === 1
                    ? `将已知本构关系和边界条件逐项代入，保留中间步骤，整理得到目标表达式；随后用${equation.variables.slice(0, 3).join("、")}解释各项来源。`
                    : `使用极限工况、量纲一致性和可测数据进行交叉检查。若“${assumption}”不再成立，应恢复被忽略项或改用更高阶模型。`,
        };
    });
}
export function formulaLessonNote(equation: FormulaForLesson): FormulaLessonNote {
    const name = equation.name;
    if (/位时间与波特率/.test(name))
        return {
            question: "一个数据位需要多少时间？外设时钟如何变成总线波特率？",
            principle: "把一个 bit 划分为同步段、TSEG1 和 TSEG2 三段；每一段由若干时间量子（TQ）组成，BRP 决定 TQ 的长度。",
            derivation: [
                "先由 TQ = BRP / f_CAN 得到单个时间量子的持续时间。",
                "一位包含 1 + TSEG1 + TSEG2 个 TQ，因此 t_bit = 总TQ数 × TQ。",
                "对 t_bit 取倒数得到 BitRate，再用采样点和时钟误差检查配置是否可实现。",
            ],
            units: "BRP、TSEG1、TSEG2 是无量纲计数；BRP/f_CAN 的单位是秒；1/t_bit 的单位是 bit/s。",
            intuition: "总TQ数增加会让每一位变长、波特率下降；在时钟不变时，BRP越大，通信越慢但定时分辨率更粗。",
            boundary: "这是标称位速率模型，尚未包含收发器延迟、线缆传播、SJW和晶振容差，最终必须用波形和错误计数验证。",
        };
    if (/采样点/.test(name))
        return {
            question: "接收器在一个 bit 的什么时刻做最终判决？",
            principle: "采样点是同步段和 TSEG1 结束的位置；它必须晚于主要传播延迟，又要为下一次重同步保留 TSEG2。",
            derivation: [
                "计算一位的总时间量子数 N = 1 + TSEG1 + TSEG2。",
                "采样发生在第 1 + TSEG1 个 TQ，因此采样点 = (1 + TSEG1) / N。",
                "把结果与线长、节点时钟偏差和 SJW 联合校核，而不是只追求某个固定百分比。",
            ],
            units: "分子和分母同为 TQ，比例无量纲；乘以 100% 后才表示百分数。",
            intuition: "总线越长、传播延迟越大，通常需要更靠后的采样点；但过晚会压缩相位缓冲段，降低抗抖动能力。",
            boundary: "采样点建议值不是协议硬性常数；不同控制器的时间段定义、三采样模式和SJW规则必须以芯片手册为准。",
        };
    if (/终端等效阻抗/.test(name))
        return {
            question: "为什么断电测 CANH-CANL 常见约为 60 Ω？",
            principle: "干线两端各放置一个 120 Ω 终端，测量时两只电阻处于并联关系，等效阻抗决定差分信号的反射与负载。",
            derivation: [
                "将两端终端写成并联模型 R_bus = R_T1 ∥ R_T2。",
                "代入并联公式 R_T1R_T2/(R_T1+R_T2)。",
                "若两端均为 120 Ω，则结果约 60 Ω；偏离该值时沿线检查开路、短路或多余终端。",
            ],
            units: "所有电阻必须使用同一单位（Ω）；并联运算不会改变电阻的量纲。",
            intuition: "终端太少会使等效阻抗偏高、边沿反射增强；终端太多会过度加载收发器，使差分幅值下降。",
            boundary: "60 Ω 是断电、总线连通且忽略收发器直流影响时的诊断基准，不等于带电时的动态阻抗。",
        };
    if (/dq轴电压模型/.test(name))
        return {
            question: "电机电压究竟被哪些物理效应消耗或改变？",
            principle: "这是定子绕组的 KVL：电压 = 电阻压降 + 磁链变化产生的感应电压 + 旋转坐标系中的交叉耦合项。",
            derivation: [
                "从磁链关系 ψ_d = L_d i_d + ψ_f、ψ_q = L_q i_q 出发。",
                "对磁链求导得到电感动态项，再把 Park 旋转坐标带来的 ±ω_eψ 项加入。",
                "整理 d、q 两轴后，可把耦合项与反电动势作为前馈，剩余部分交给 PI 电流环。",
            ],
            units: "R·i、L·di/dt、ω·L·i 和 ω·ψ 的单位都为伏特；任何一项量纲不一致都说明参数或角速度定义有误。",
            intuition: "低速时电阻和电感动态占主导；高速时 ω_e 相关项迅速增大，母线电压会成为电流控制和弱磁的瓶颈。",
            boundary: "模型忽略铁耗、PWM死区、磁饱和和参数温漂；做标定或论文建模时必须说明这些简化。",
        };
    if (/电磁转矩/.test(name))
        return {
            question: "为什么 iq 主要决定转矩，id 又会在内埋式电机中产生额外转矩？",
            principle: "转矩来自磁场能量随转子角度变化的梯度；永磁磁链与 q 轴电流形成永磁转矩，Ld/Lq 不同则出现磁阻转矩。",
            derivation: [
                "写出电机磁链与电流的 dq 关系，并用电磁功率 P_e = T_eω_m 联系电气量和机械量。",
                "在功率不变变换约定下整理得到永磁项 ψ_f i_q 与磁阻项 (L_d−L_q)i_d i_q。",
                "检查极对数、变换系数和电流峰值/RMS定义，避免系数 3/2 的约定错误。",
            ],
            units: "ψ·i 的单位为 Wb·A = N·m；极对数 p 无量纲，因此右侧整体必须是转矩单位。",
            intuition: "表贴式电机 Ld≈Lq，调 id 的收益有限；内埋式电机利用凸极差，可通过 MTPA 在同一电流下获得更大转矩。",
            boundary: "正弦反电动势、三相对称和参数准确是前提；饱和、谐波和逆变器非理想会让实际转矩偏离理想式。",
        };
    if (/机械运动方程/.test(name))
        return {
            question: "电磁转矩、负载转矩和阻尼如何共同决定转速变化？",
            principle: "这是旋转形式的牛顿第二定律：惯量乘角加速度等于驱动转矩减去负载和阻尼损耗。",
            derivation: [
                "对转子建立转矩平衡，正方向取电磁转矩方向。",
                "将黏性阻尼写成与角速度成正比的 Bω_m，并整理得到微分方程。",
                "给定初始转速和负载变化后积分即可得到 ω_m(t)，再用速度环调节 T_e。",
            ],
            units: "J·dω/dt、T_e、T_L 和 Bω_m 都是 N·m；J 的单位是 kg·m²，B 的单位是 N·m·s/rad。",
            intuition: "惯量越大，转速变化越慢；负载阶跃会先造成加速度下降，速度环随后提高 iq 以恢复转速。",
            boundary: "刚性轴系和黏性阻尼是简化假设；齿轮间隙、弹性联轴器和库仑摩擦需要在高精度模型中单独加入。",
        };
    if (/基本额定寿命/.test(name))
        return {
            question: "为什么载荷略微增加，轴承寿命会大幅下降？",
            principle: "滚动接触疲劳遵循经验幂律：寿命与 C/P 的 p 次方成正比，球轴承 p=3、滚子轴承 p≈10/3。",
            derivation: [
                "先由轴承受力得到等效动载荷 P，并确认它与额定动载荷 C 同单位。",
                "代入 L10 = (C/P)^p × 10⁶ 得到转数寿命。",
                "再除以 60n 把转数换算为小时，并根据可靠度、润滑和污染条件修正。",
            ],
            units: "C/P 是无量纲比值；L10 的单位是 rev，60n 的单位是 rev/h，因此 L10h 的单位是 h。",
            intuition: "寿命对载荷是幂次敏感的：P 增加 10% 并不是寿命只下降 10%，高载荷短时段也可能主导累计损伤。",
            boundary: "L10只描述滚动接触疲劳的统计基准，不能替代润滑失效、污染磨损、安装错误和电蚀的独立校核。",
        };
    if (/五次多项式/.test(name))
        return {
            question: "为什么轨迹规划常用五次而不是三次多项式？",
            principle: "五次多项式有 6 个系数，可以同时满足起点/终点的位置、速度、加速度共 6 个边界条件，保证运动更平滑。",
            derivation: [
                "写出 q(t)、q̇(t)、q̈(t)，分别在 t=0 与 t=T 代入边界条件。",
                "得到一个 6×6 线性方程组，求解 a₀…a₅。",
                "继续求 q⃛(t) 检查 jerk 峰值，并将速度、加速度和力矩约束映射到真实关节。",
            ],
            units: "a_k 的单位随 k 变化，使 a_k t^k 始终具有位置单位；T 的单位必须与控制周期一致。",
            intuition: "在同样位移下增大 T，速度约按 1/T、加速度按 1/T²、jerk 按 1/T³ 下降，因此‘放慢’是最直接的平滑手段。",
            boundary: "多项式只保证边界条件，不自动保证中间时刻不超速、不碰撞或不经过奇异点，必须逐点采样验证。",
        };
    return {
        question: `这条“${name}”在工程问题中要回答什么？`,
        principle: `先把公式看成${equation.interpretation.replace(/[。；].*$/, "")}，再确认每个符号的物理来源。`,
        derivation: [
            "明确目标量、输入量和正方向，写出基本守恒定律或平衡关系。",
            "将材料、几何、边界条件等本构关系代入，并逐步整理到目标公式。",
            "用极限情况、量纲和实测数据检查推导与代入结果。",
        ],
        units: "等式两侧必须具有相同量纲；变量单位应以国际单位制为主，代入前统一角度、时间、长度和质量单位。",
        intuition: "分子项通常表示驱动或输入，分母项表示阻抗、容量或约束；改变某个参数前先判断它对结果的单调性。",
        boundary: equation.assumptions.join("；"),
    };
}
