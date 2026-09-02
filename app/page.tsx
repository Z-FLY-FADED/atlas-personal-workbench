"use client";

import {
  ChangeEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import katex from "katex";
import { KNOWLEDGE_TAXONOMY } from "./knowledge-taxonomy";
import { enrichKnowledge, KnowledgeEnrichment } from "./knowledge-enrichment";
import {
  analyzeKnowledgeContent,
  rankKnowledgeRelations,
} from "./knowledge-intelligence";
import { CURATED_MAINSTREAM_KNOWLEDGE } from "./knowledge-mainstream";
import { WorkspaceOverview, WorkspaceReminder } from "./components/workspace/WorkspaceOverview";
import {
  WorkspaceEntryModals,
  WorkspaceNotesPage,
  WorkspaceProjectsPage,
  WorkspaceProjectRecord,
  WorkspaceQuickNote,
} from "./components/workspace/WorkspacePages";
import { WorkspaceSidebar } from "./components/workspace/WorkspaceSidebar";
import { WorkspaceTopbar } from "./components/workspace/WorkspaceTopbar";
import { CareerWorkspace } from "./components/career/CareerWorkspace";
import { IndustryWorkspace } from "./components/industry/IndustryWorkspace";
import { StockWorkspace } from "./components/stocks/StockWorkspace";

const technicalKeywordPattern =
  /^(必须|关键|核心|约束|边界|验证|风险|CAN|PMSM|FOC|MTPA|SVPWM|Bus-Off|L10|五次多项式|jerk|MPC|H∞|Lyapunov|相位裕度|增益裕度|采样点|终端电阻|电流环|速度环)$/;

function showLegacyCareerWorkspace() {
  return false;
}

function showLegacyIndustryWorkspace() {
  return false;
}

function emphasizeTechnicalText(text: string) {
  return text
    .split(
      /(必须|关键|核心|约束|边界|验证|风险|CAN|PMSM|FOC|MTPA|SVPWM|Bus-Off|L10|五次多项式|jerk|MPC|H∞|Lyapunov|相位裕度|增益裕度|采样点|终端电阻|电流环|速度环)/g,
    )
    .map((part, index) =>
      technicalKeywordPattern.test(part) ? (
        <strong key={`${part}-${index}`}>{part}</strong>
      ) : (
        part
      ),
    );
}

const standardizedFormulaMap: Record<string, string> = {
  "t_bit = (1 + TSEG1 + TSEG2) × BRP / f_CAN；BitRate = 1 / t_bit": String.raw`t_{\mathrm{bit}}=\frac{(1+\mathrm{TSEG1}+\mathrm{TSEG2})\,\mathrm{BRP}}{f_{\mathrm{CAN}}},\qquad \mathrm{BitRate}=\frac{1}{t_{\mathrm{bit}}}`,
  "SamplePoint = (1 + TSEG1) / (1 + TSEG1 + TSEG2) × 100%": String.raw`\mathrm{SamplePoint}=\frac{1+\mathrm{TSEG1}}{1+\mathrm{TSEG1}+\mathrm{TSEG2}}\times100\%`,
  "R_bus = R_T1 ∥ R_T2 = (R_T1 × R_T2) / (R_T1 + R_T2)": String.raw`R_{\mathrm{bus}}=R_{\mathrm{T1}}\parallel R_{\mathrm{T2}}=\frac{R_{\mathrm{T1}}R_{\mathrm{T2}}}{R_{\mathrm{T1}}+R_{\mathrm{T2}}}`,
  "u_d = R_s i_d + L_d·di_d/dt − ω_e L_q i_q；u_q = R_s i_q + L_q·di_q/dt + ω_e(L_d i_d + ψ_f)": String.raw`\begin{aligned}u_d&=R_s i_d+L_d\frac{\mathrm di_d}{\mathrm dt}-\omega_eL_qi_q\\u_q&=R_s i_q+L_q\frac{\mathrm di_q}{\mathrm dt}+\omega_e\left(L_di_d+\psi_f\right)\end{aligned}`,
  "T_e = 3p/2 · [ψ_f i_q + (L_d − L_q)i_d i_q]": String.raw`T_e=\frac{3p}{2}\left[\psi_f i_q+\left(L_d-L_q\right)i_d i_q\right]`,
  "J·dω_m/dt = T_e − T_L − Bω_m": String.raw`J\frac{\mathrm d\omega_m}{\mathrm dt}=T_e-T_L-B\omega_m`,
  "L_10 = (C/P)^p × 10⁶ rev；L_10h = L_10 / (60n)": String.raw`L_{10}=\left(\frac{C}{P}\right)^p\times10^6\,\mathrm{rev},\qquad L_{10h}=\frac{L_{10}}{60n}`,
  "P = X F_r + Y F_a": String.raw`P=XF_r+YF_a`,
  "P_eq = [Σ(P_i^p n_i t_i) / Σ(n_i t_i)]^(1/p)": String.raw`P_{\mathrm{eq}}=\left[\frac{\sum_i P_i^p n_i t_i}{\sum_i n_i t_i}\right]^{1/p}`,
  "q(t)=a₀+a₁t+a₂t²+a₃t³+a₄t⁴+a₅t⁵": String.raw`q(t)=a_0+a_1t+a_2t^2+a_3t^3+a_4t^4+a_5t^5`,
  "q(t)=q₀+(q_f−q₀)[10τ³−15τ⁴+6τ⁵]，τ=t/T": String.raw`q(t)=q_0+(q_f-q_0)\left(10\tau^3-15\tau^4+6\tau^5\right),\qquad \tau=\frac{t}{T}`,
  "v = J(q)·q̇；q̇ = J⁺(q)·v": String.raw`\mathbf v=\mathbf J(\mathbf q)\dot{\mathbf q},\qquad \dot{\mathbf q}=\mathbf J^{+}(\mathbf q)\mathbf v`,
  "m_s z̈_s + c_s(ż_s−ż_u) + k_s(z_s−z_u) = F_a": String.raw`m_s\ddot z_s+c_s\left(\dot z_s-\dot z_u\right)+k_s\left(z_s-z_u\right)=F_a`,
  "m_u z̈_u − c_s(ż_s−ż_u) − k_s(z_s−z_u) + k_t(z_u−z_r) = −F_a": String.raw`m_u\ddot z_u-c_s\left(\dot z_s-\dot z_u\right)-k_s\left(z_s-z_u\right)+k_t\left(z_u-z_r\right)=-F_a`,
  "f_s≈(1/2π)√(k_s/m_s)；ζ_s≈c_s/(2√(k_s m_s))": String.raw`f_s\approx\frac{1}{2\pi}\sqrt{\frac{k_s}{m_s}},\qquad \zeta_s\approx\frac{c_s}{2\sqrt{k_s m_s}}`,
  "T(s)=G(s)/(1+G(s)H(s))；1+G(s)H(s)=0": String.raw`T(s)=\frac{G(s)}{1+G(s)H(s)},\qquad 1+G(s)H(s)=0`,
  "s²+2ζω_n s+ω_n²=0；M_p=e^(−πζ/√(1−ζ²))；t_s≈4/(ζω_n)": String.raw`s^2+2\zeta\omega_n s+\omega_n^2=0,\qquad M_p=e^{-\frac{\pi\zeta}{\sqrt{1-\zeta^2}}},\qquad t_s\approx\frac{4}{\zeta\omega_n}`,
  "AᵀP + PA = −Q，Q>0，P>0": String.raw`A^{\mathsf T}P+PA=-Q,\qquad Q\succ0,\;P\succ0`,
};

function standardizeFormula(formula: string) {
  if (standardizedFormulaMap[formula]) return standardizedFormulaMap[formula];
  return formula
    .replace(/−/g, "-")
    .replace(/×/g, String.raw`\times `)
    .replace(/；/g, String.raw`,\qquad `)
    .replace(/，/g, String.raw`,\;`)
    .replace(/([A-Za-zωψζτ])_([A-Za-z0-9]+)/g, "$1_{$2}")
    .replace(/ω/g, String.raw`\omega `)
    .replace(/ψ/g, String.raw`\psi `)
    .replace(/ζ/g, String.raw`\zeta `)
    .replace(/τ/g, String.raw`\tau `)
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/⁶/g, "^6");
}

function MathFormula({ formula }: { formula: string }) {
  const html = katex.renderToString(standardizeFormula(formula), {
    displayMode: true,
    throwOnError: false,
    strict: "ignore",
    output: "html",
  });
  return (
    <div
      className="equation-formula"
      role="math"
      aria-label={formula}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type FormulaForLesson = {
  name: string;
  formula: string;
  interpretation: string;
  variables: string[];
  assumptions: string[];
};
type FormulaLessonNote = {
  question: string;
  principle: string;
  derivation: string[];
  units: string;
  intuition: string;
  boundary: string;
};
type FormulaDerivationStep = {
  title: string;
  formula?: string;
  explanation: string;
};

function detailedFormulaDerivation(
  equation: FormulaForLesson,
): FormulaDerivationStep[] {
  const name = equation.name;
  if (/五次多项式/.test(name))
    return [
      {
        title: "写出位置及其各阶导数",
        formula: String.raw`\begin{aligned}q(t)&=a_0+a_1t+a_2t^2+a_3t^3+a_4t^4+a_5t^5\\ \dot q(t)&=a_1+2a_2t+3a_3t^2+4a_4t^3+5a_5t^4\\ \ddot q(t)&=2a_2+6a_3t+12a_4t^2+20a_5t^3\end{aligned}`,
        explanation:
          "五次多项式包含六个待定系数，因此需要六个相互独立的边界条件才能得到唯一解。",
      },
      {
        title: "代入起点和终点边界",
        formula: String.raw`q(0)=q_0,\;\dot q(0)=v_0,\;\ddot q(0)=a_0^{*},\qquad q(T)=q_f,\;\dot q(T)=v_f,\;\ddot q(T)=a_f`,
        explanation:
          "把两端的位置、速度和加速度代入后形成六元一次方程组。这里用 a₀* 表示起点加速度，以免与多项式系数 a₀ 混淆。",
      },
      {
        title: "零速零加速度条件下化简",
        formula: String.raw`q(t)=q_0+(q_f-q_0)\left(10\tau^3-15\tau^4+6\tau^5\right),\qquad \tau=\frac{t}{T}`,
        explanation:
          "当两端速度和加速度均为零时可得到常用归一化形式。速度、加速度和 jerk 峰值分别按 1/T、1/T² 和 1/T³ 缩放。",
      },
    ];
  if (/理想奥托循环热效率/.test(name))
    return [
      {
        title: "从循环热效率定义出发",
        formula: String.raw`\eta=1-\frac{Q_{out}}{Q_{in}}=1-\frac{c_v(T_4-T_1)}{c_v(T_3-T_2)}`,
        explanation:
          "理想奥托循环的吸热与放热均为等容过程，因此热量可直接写成定容比热与温差的乘积。",
      },
      {
        title: "使用绝热过程温度关系",
        formula: String.raw`\frac{T_2}{T_1}=r^{\gamma-1},\qquad \frac{T_3}{T_4}=r^{\gamma-1}`,
        explanation:
          "压缩和膨胀视为可逆绝热过程，压缩比 r 将状态点温度联系起来。",
      },
      {
        title: "消去状态温度",
        formula: String.raw`\eta_{\mathrm{Otto}}=1-\frac{1}{r^{\gamma-1}}`,
        explanation:
          "代入温度关系并约去相同项后得到效率式。它说明提高压缩比能够提高理想效率，但实际发动机会受爆震、传热和排放约束。",
      },
    ];
  if (/Q-learning/.test(name))
    return [
      {
        title: "写出 Bellman 最优方程",
        formula: String.raw`Q^{*}(s,a)=\mathbb E\!\left[r+\gamma\max_{a'}Q^{*}(s',a')\mid s,a\right]`,
        explanation: "最优动作价值等于当前奖励与下一状态最优价值折扣和的期望。",
      },
      {
        title: "用单次样本构造自举目标",
        formula: String.raw`y_t=r_{t+1}+\gamma\max_a Q(s_{t+1},a)`,
        explanation:
          "真实期望未知时，以一次状态转移样本近似 Bellman 目标；该目标本身依赖当前价值估计，因此称为自举。",
      },
      {
        title: "沿时序差分误差更新",
        formula: String.raw`\delta_t=y_t-Q(s_t,a_t),\qquad Q(s_t,a_t)\leftarrow Q(s_t,a_t)+\alpha\delta_t`,
        explanation:
          "学习率 α 决定新样本修正旧估计的幅度；探索覆盖、奖励尺度和目标非平稳性决定实际收敛质量。",
      },
    ];
  if (/平面静力平衡/.test(name))
    return [
      {
        title: "隔离研究对象并画受力图",
        explanation:
          "切断所有连接，以未知反力代替约束；统一坐标正方向，并将分布载荷等效为合力及其作用点。",
      },
      {
        title: "应用平动与转动平衡",
        formula: String.raw`\sum \mathbf F=m\mathbf a=0,\qquad \sum M_O=I_O\alpha=0`,
        explanation:
          "静力问题中线加速度与角加速度均为零，于是牛顿—欧拉方程退化为力和力矩平衡。",
      },
      {
        title: "求解并回代检查",
        formula: String.raw`\sum F_x=0,\qquad \sum F_y=0,\qquad \sum M_O=0`,
        explanation:
          "优先选择能消去最多未知量的取矩点；求解后检查反力方向、数量级以及整体平衡。",
      },
    ];
  if (/轴向正应力/.test(name))
    return [
      {
        title: "对杆件作截面切割",
        formula: String.raw`F=\int_A \sigma\,\mathrm dA`,
        explanation:
          "截面内分布应力的合力必须与外部轴向载荷平衡，这是公式的力学起点。",
      },
      {
        title: "采用均匀应力近似",
        formula: String.raw`F=\sigma\int_A\mathrm dA=\sigma A`,
        explanation:
          "当载荷通过截面形心、远离几何突变且材料处于线弹性范围时，可认为截面平均应力近似均匀。",
      },
      {
        title: "整理并进行强度判定",
        formula: String.raw`\sigma=\frac{F}{A},\qquad \sigma_{max}\leq[\sigma]`,
        explanation:
          "计算值还需与许用应力比较；孔、圆角、螺纹根部等位置应另外考虑应力集中。",
      },
    ];
  if (/周期任务处理器利用率/.test(name))
    return [
      {
        title: "计算单个任务占用比例",
        formula: String.raw`U_i=\frac{C_i}{T_i}`,
        explanation:
          "任务每周期最多执行 Cᵢ 时间，因此 Cᵢ/Tᵢ 表示其长期平均处理器需求。",
      },
      {
        title: "叠加全部周期任务",
        formula: String.raw`U=\sum_{i=1}^{n}U_i=\sum_{i=1}^{n}\frac{C_i}{T_i}`,
        explanation:
          "在单核处理器上，各任务执行时间不能重叠，故总利用率为各任务占用比例之和。",
      },
      {
        title: "加入调度可行性条件",
        formula: String.raw`U\leq1\quad\text{仅为必要条件；RM 下还需检查 }U\leq n(2^{1/n}-1)`,
        explanation:
          "利用率小于 100% 不代表必然可调度，还要考虑优先级、截止期、阻塞、中断和上下文切换。",
      },
    ];
  if (/ADC 理想量化步长/.test(name))
    return [
      {
        title: "确定量化区间数量",
        formula: String.raw`N_{level}=2^N`,
        explanation:
          "N 位二进制输出最多表示 2ᴺ 个离散码，理想量化器把满量程均匀划分为相同宽度区间。",
      },
      {
        title: "由满量程除以区间数",
        formula: String.raw`\Delta V=\frac{V_{ref}}{2^N}`,
        explanation:
          "ΔV 是一个最低有效位对应的理想输入电压增量；具体芯片的满量程端点定义应以数据手册为准。",
      },
      {
        title: "估计理想量化误差",
        formula: String.raw`e_q\in\left[-\frac{\Delta V}{2},\frac{\Delta V}{2}\right]`,
        explanation:
          "舍入量化时误差理想上限为半个 LSB；实际系统还叠加参考源噪声、失调、增益误差和非线性。",
      },
    ];
  return [0, 1, 2].map((index) => {
    const assumption =
      equation.assumptions[index] ||
      equation.assumptions[0] ||
      "变量连续且模型参数在分析区间内有效";
    return {
      title:
        index === 0
          ? "建立对象与基本关系"
          : index === 1
            ? "代入约束并整理"
            : "检查结果与适用范围",
      formula: index === 1 ? equation.formula : undefined,
      explanation:
        index === 0
          ? `从研究对象的守恒、平衡或定义关系出发。当前推导采用“${assumption}”这一前提，并明确各变量的正方向和单位。`
          : index === 1
            ? `将已知本构关系和边界条件逐项代入，保留中间步骤，整理得到目标表达式；随后用${equation.variables.slice(0, 3).join("、")}解释各项来源。`
            : `使用极限工况、量纲一致性和可测数据进行交叉检查。若“${assumption}”不再成立，应恢复被忽略项或改用更高阶模型。`,
    };
  });
}

function formulaLessonNote(equation: FormulaForLesson): FormulaLessonNote {
  const name = equation.name;
  if (/位时间与波特率/.test(name))
    return {
      question: "一个数据位需要多少时间？外设时钟如何变成总线波特率？",
      principle:
        "把一个 bit 划分为同步段、TSEG1 和 TSEG2 三段；每一段由若干时间量子（TQ）组成，BRP 决定 TQ 的长度。",
      derivation: [
        "先由 TQ = BRP / f_CAN 得到单个时间量子的持续时间。",
        "一位包含 1 + TSEG1 + TSEG2 个 TQ，因此 t_bit = 总TQ数 × TQ。",
        "对 t_bit 取倒数得到 BitRate，再用采样点和时钟误差检查配置是否可实现。",
      ],
      units:
        "BRP、TSEG1、TSEG2 是无量纲计数；BRP/f_CAN 的单位是秒；1/t_bit 的单位是 bit/s。",
      intuition:
        "总TQ数增加会让每一位变长、波特率下降；在时钟不变时，BRP越大，通信越慢但定时分辨率更粗。",
      boundary:
        "这是标称位速率模型，尚未包含收发器延迟、线缆传播、SJW和晶振容差，最终必须用波形和错误计数验证。",
    };
  if (/采样点/.test(name))
    return {
      question: "接收器在一个 bit 的什么时刻做最终判决？",
      principle:
        "采样点是同步段和 TSEG1 结束的位置；它必须晚于主要传播延迟，又要为下一次重同步保留 TSEG2。",
      derivation: [
        "计算一位的总时间量子数 N = 1 + TSEG1 + TSEG2。",
        "采样发生在第 1 + TSEG1 个 TQ，因此采样点 = (1 + TSEG1) / N。",
        "把结果与线长、节点时钟偏差和 SJW 联合校核，而不是只追求某个固定百分比。",
      ],
      units: "分子和分母同为 TQ，比例无量纲；乘以 100% 后才表示百分数。",
      intuition:
        "总线越长、传播延迟越大，通常需要更靠后的采样点；但过晚会压缩相位缓冲段，降低抗抖动能力。",
      boundary:
        "采样点建议值不是协议硬性常数；不同控制器的时间段定义、三采样模式和SJW规则必须以芯片手册为准。",
    };
  if (/终端等效阻抗/.test(name))
    return {
      question: "为什么断电测 CANH-CANL 常见约为 60 Ω？",
      principle:
        "干线两端各放置一个 120 Ω 终端，测量时两只电阻处于并联关系，等效阻抗决定差分信号的反射与负载。",
      derivation: [
        "将两端终端写成并联模型 R_bus = R_T1 ∥ R_T2。",
        "代入并联公式 R_T1R_T2/(R_T1+R_T2)。",
        "若两端均为 120 Ω，则结果约 60 Ω；偏离该值时沿线检查开路、短路或多余终端。",
      ],
      units: "所有电阻必须使用同一单位（Ω）；并联运算不会改变电阻的量纲。",
      intuition:
        "终端太少会使等效阻抗偏高、边沿反射增强；终端太多会过度加载收发器，使差分幅值下降。",
      boundary:
        "60 Ω 是断电、总线连通且忽略收发器直流影响时的诊断基准，不等于带电时的动态阻抗。",
    };
  if (/dq轴电压模型/.test(name))
    return {
      question: "电机电压究竟被哪些物理效应消耗或改变？",
      principle:
        "这是定子绕组的 KVL：电压 = 电阻压降 + 磁链变化产生的感应电压 + 旋转坐标系中的交叉耦合项。",
      derivation: [
        "从磁链关系 ψ_d = L_d i_d + ψ_f、ψ_q = L_q i_q 出发。",
        "对磁链求导得到电感动态项，再把 Park 旋转坐标带来的 ±ω_eψ 项加入。",
        "整理 d、q 两轴后，可把耦合项与反电动势作为前馈，剩余部分交给 PI 电流环。",
      ],
      units:
        "R·i、L·di/dt、ω·L·i 和 ω·ψ 的单位都为伏特；任何一项量纲不一致都说明参数或角速度定义有误。",
      intuition:
        "低速时电阻和电感动态占主导；高速时 ω_e 相关项迅速增大，母线电压会成为电流控制和弱磁的瓶颈。",
      boundary:
        "模型忽略铁耗、PWM死区、磁饱和和参数温漂；做标定或论文建模时必须说明这些简化。",
    };
  if (/电磁转矩/.test(name))
    return {
      question: "为什么 iq 主要决定转矩，id 又会在内埋式电机中产生额外转矩？",
      principle:
        "转矩来自磁场能量随转子角度变化的梯度；永磁磁链与 q 轴电流形成永磁转矩，Ld/Lq 不同则出现磁阻转矩。",
      derivation: [
        "写出电机磁链与电流的 dq 关系，并用电磁功率 P_e = T_eω_m 联系电气量和机械量。",
        "在功率不变变换约定下整理得到永磁项 ψ_f i_q 与磁阻项 (L_d−L_q)i_d i_q。",
        "检查极对数、变换系数和电流峰值/RMS定义，避免系数 3/2 的约定错误。",
      ],
      units:
        "ψ·i 的单位为 Wb·A = N·m；极对数 p 无量纲，因此右侧整体必须是转矩单位。",
      intuition:
        "表贴式电机 Ld≈Lq，调 id 的收益有限；内埋式电机利用凸极差，可通过 MTPA 在同一电流下获得更大转矩。",
      boundary:
        "正弦反电动势、三相对称和参数准确是前提；饱和、谐波和逆变器非理想会让实际转矩偏离理想式。",
    };
  if (/机械运动方程/.test(name))
    return {
      question: "电磁转矩、负载转矩和阻尼如何共同决定转速变化？",
      principle:
        "这是旋转形式的牛顿第二定律：惯量乘角加速度等于驱动转矩减去负载和阻尼损耗。",
      derivation: [
        "对转子建立转矩平衡，正方向取电磁转矩方向。",
        "将黏性阻尼写成与角速度成正比的 Bω_m，并整理得到微分方程。",
        "给定初始转速和负载变化后积分即可得到 ω_m(t)，再用速度环调节 T_e。",
      ],
      units:
        "J·dω/dt、T_e、T_L 和 Bω_m 都是 N·m；J 的单位是 kg·m²，B 的单位是 N·m·s/rad。",
      intuition:
        "惯量越大，转速变化越慢；负载阶跃会先造成加速度下降，速度环随后提高 iq 以恢复转速。",
      boundary:
        "刚性轴系和黏性阻尼是简化假设；齿轮间隙、弹性联轴器和库仑摩擦需要在高精度模型中单独加入。",
    };
  if (/基本额定寿命/.test(name))
    return {
      question: "为什么载荷略微增加，轴承寿命会大幅下降？",
      principle:
        "滚动接触疲劳遵循经验幂律：寿命与 C/P 的 p 次方成正比，球轴承 p=3、滚子轴承 p≈10/3。",
      derivation: [
        "先由轴承受力得到等效动载荷 P，并确认它与额定动载荷 C 同单位。",
        "代入 L10 = (C/P)^p × 10⁶ 得到转数寿命。",
        "再除以 60n 把转数换算为小时，并根据可靠度、润滑和污染条件修正。",
      ],
      units:
        "C/P 是无量纲比值；L10 的单位是 rev，60n 的单位是 rev/h，因此 L10h 的单位是 h。",
      intuition:
        "寿命对载荷是幂次敏感的：P 增加 10% 并不是寿命只下降 10%，高载荷短时段也可能主导累计损伤。",
      boundary:
        "L10只描述滚动接触疲劳的统计基准，不能替代润滑失效、污染磨损、安装错误和电蚀的独立校核。",
    };
  if (/五次多项式/.test(name))
    return {
      question: "为什么轨迹规划常用五次而不是三次多项式？",
      principle:
        "五次多项式有 6 个系数，可以同时满足起点/终点的位置、速度、加速度共 6 个边界条件，保证运动更平滑。",
      derivation: [
        "写出 q(t)、q̇(t)、q̈(t)，分别在 t=0 与 t=T 代入边界条件。",
        "得到一个 6×6 线性方程组，求解 a₀…a₅。",
        "继续求 q⃛(t) 检查 jerk 峰值，并将速度、加速度和力矩约束映射到真实关节。",
      ],
      units:
        "a_k 的单位随 k 变化，使 a_k t^k 始终具有位置单位；T 的单位必须与控制周期一致。",
      intuition:
        "在同样位移下增大 T，速度约按 1/T、加速度按 1/T²、jerk 按 1/T³ 下降，因此‘放慢’是最直接的平滑手段。",
      boundary:
        "多项式只保证边界条件，不自动保证中间时刻不超速、不碰撞或不经过奇异点，必须逐点采样验证。",
    };
  return {
    question: `这条“${name}”在工程问题中要回答什么？`,
    principle: `先把公式看成${equation.interpretation.replace(/[。；].*$/, "")}，再确认每个符号的物理来源。`,
    derivation: [
      "明确目标量、输入量和正方向，写出基本守恒定律或平衡关系。",
      "将材料、几何、边界条件等本构关系代入，并逐步整理到目标公式。",
      "用极限情况、量纲和实测数据检查推导与代入结果。",
    ],
    units:
      "等式两侧必须具有相同量纲；变量单位应以国际单位制为主，代入前统一角度、时间、长度和质量单位。",
    intuition:
      "分子项通常表示驱动或输入，分母项表示阻抗、容量或约束；改变某个参数前先判断它对结果的单调性。",
    boundary: equation.assumptions.join("；"),
  };
}

type Priority = "优先" | "一般" | "不重要";
type Horizon = "今日" | "本周" | "年度";
type View =
  | "工作台"
  | "今日"
  | "个人任务"
  | "项目"
  | "笔记"
  | "知识库"
  | "英语学习"
  | "日语学习"
  | "每周总结"
  | "简历投递"
  | "股票"
  | "行业速览"
  | "AI 模型";
type Theme =
  | "obsidian"
  | "ivory"
  | "ocean"
  | "forest"
  | "clay"
  | "plum"
  | "anime"
  | "scenery"
  | "cyberpunk";

type Task = {
  id: number;
  title: string;
  detail: string;
  priority: Priority;
  horizon: Horizon;
  done: boolean;
  date: string;
  completedAt?: string;
  completedOn?: string;
  completionHistory?: TaskCompletion[];
  projectId?: number | null;
};

type TaskCompletion = { id: string; completedAt: string; completedOn: string };

function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function shanghaiDisplayTime(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function normalizeDailyTasks(items: Task[], today = shanghaiDateKey()) {
  return items.map((task) =>
    task.horizon === "今日" && task.done && task.completedOn !== today
      ? { ...task, done: false, completedAt: "", completedOn: "" }
      : task,
  );
}

type Knowledge = {
  id: number;
  title: string;
  summary: string;
  content?: string;
  primaryCategory: string;
  secondaryCategory: string;
  confidence?: number;
  source: string;
  sourceType: string;
  createdAt: string;
  completeness?: number;
  enrichment?: KnowledgeEnrichment;
  keywords?: string[];
  relatedIds?: number[];
  relatedTopics?: string[];
};

type ApplicationStatus =
  "待投递" | "已投递" | "笔试" | "面试" | "Offer" | "结束";
type JobApplication = {
  id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  channel: string;
  appliedAt: string;
  nextAction: string;
  notes: string;
};
type StockCandidate = {
  instrumentId: string;
  market: "A股" | "港股" | "纳斯达克";
  region: "CN" | "HK" | "US";
  exchange: string;
  code: string;
  name: string;
  industry: string;
  subIndustry: string;
  currency: "CNY" | "HKD" | "USD";
  price: number | null;
  change: number | null;
  score: number;
  signal: "positive" | "neutral" | "negative" | "insufficient_data";
  confidence: number;
  factors: { trend: number; momentum: number; quality: number; risk: number };
  risk: "中" | "中高" | "高";
  reason: string;
  watch: string;
  verified: boolean;
  sourceCount: number;
  quoteQuality: "verified" | "single_source" | "stale" | "conflict";
  asOf: string;
};
type IndustryNews = {
  id: string;
  industry: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  verification: "verified" | "pending" | "failed";
  verifiedAt: string;
  sourceLevel: string;
  topic?: "industry" | "company";
  company?: string;
};
type MarketPayload = {
  stocks: StockCandidate[];
  instruments?: StockCandidate[];
  markets?: {
    A股: StockCandidate[];
    港股: StockCandidate[];
    纳斯达克: StockCandidate[];
  };
  marketSummary?: Array<{
    region: "CN" | "HK" | "US";
    label: string;
    count: number;
    verifiedCount: number;
  }>;
  news: IndustryNews[];
  updatedAt: string;
  quoteSource: string;
  live: boolean;
  methodology: string;
};
type JobOpening = {
  id: string;
  company: string;
  role: string;
  industry: "汽车" | "制造" | "机器人" | "科技";
  function: "研发" | "测试" | "产品" | "质量" | "工艺";
  locations: string[];
  experience: string;
  education: string;
  tags: string[];
  summary: string;
  matchScore: number;
  applyUrl: string;
  source: string;
  sourceKind: "具体职位" | "岗位集合" | "平台搜索";
  employmentType?: "企业" | "国企/央企" | "事业编制" | "公务员";
  organizationType?: string;
  verification: "verified" | "reachable" | "pending";
  verifiedAt: string;
  sourceLevel: string;
};
type JobPayload = {
  jobs: JobOpening[];
  updatedAt: string;
  verifiedCount: number;
  methodology: string;
  nextCursor: string | null;
  totalKnown: number;
  sourceSummary: { official: number; platform: number };
};
type ResumeProfile = { fileName: string; content: string; updatedAt: string };
type RankedJob = JobOpening & {
  resumeScore: number;
  matchedSkills: string[];
  missingSkills: string[];
};
type UserProfile = {
  displayName: string;
  motto: string;
  avatarText: string;
  accent: "gold" | "blue" | "green" | "rose" | "violet" | "slate";
  updatedAt?: string;
};
type AIConnection = {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  isActive: boolean;
  status: string;
  updatedAt: string;
  hasKey: boolean;
};

function getAvatarInitial(displayName: string) {
  const firstCharacter =
    String(displayName || "")
      .trim()
      .match(/[\p{Script=Han}\p{L}\p{N}]/u)?.[0] || "个";
  return /[a-z]/i.test(firstCharacter)
    ? firstCharacter.toUpperCase()
    : firstCharacter;
}

type AISchedule = {
  id: number;
  title: string;
  connectionId: number;
  connectionName: string;
  model: string;
  prompt: string;
  cadence: "hourly" | "daily" | "weekly";
  timeOfDay: string;
  weekdays: string;
  useWeb: boolean;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string;
};
type AIRun = {
  id: number;
  scheduleId?: number;
  connectionId: number;
  connectionName: string;
  model: string;
  prompt: string;
  result: string;
  status: string;
  error: string;
  startedAt: string;
  finishedAt: string;
};
type AIData = {
  connections: AIConnection[];
  schedules: AISchedule[];
  runs: AIRun[];
  account: { authenticated: boolean; email: string };
  scheduler: { interval: string; timezone: string };
};

function ChatGPTSubscriptionAccount({
  account,
}: {
  account: AIData["account"] | null | undefined;
}) {
  const authenticated = Boolean(account?.authenticated);
  return (
    <section
      className="chatgpt-subscription-card panel"
      aria-label="ChatGPT订阅账号登录与切换"
    >
      <div className="chatgpt-subscription-brand">
        <span>GPT</span>
        <div>
          <small>CHATGPT SUBSCRIPTION</small>
          <h3>ChatGPT 订阅账号</h3>
          <p>{authenticated ? account?.email : "尚未登录 ChatGPT 账号"}</p>
        </div>
      </div>
      <div className="chatgpt-subscription-status">
        <span className={authenticated ? "online" : ""}>
          {authenticated ? "已登录" : "未登录"}
        </span>
        <small>订阅方案与可用模型以 ChatGPT 账号内显示为准</small>
      </div>
      <div className="chatgpt-subscription-actions">
        <a
          className="primary-account-action"
          href="https://chatgpt.com/auth/login"
          target="_blank"
          rel="noreferrer"
        >
          {authenticated ? "登录其他账号" : "登录 ChatGPT"}
        </a>
        <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
          切换订阅账号 ↗
        </a>
      </div>
    </section>
  );
}

const resumeSkillDictionary = [
  "CAN",
  "C/C++",
  "Python",
  "MATLAB",
  "Simulink",
  "ROS",
  "PLC",
  "STM32",
  "AUTOSAR",
  "SolidWorks",
  "CATIA",
  "控制算法",
  "电机",
  "电池",
  "嵌入式",
  "机器人",
  "汽车",
  "机械设计",
  "电气",
  "自动化",
  "制造",
  "研发",
  "测试",
  "质量",
  "工艺",
  "产品",
  "项目管理",
];

function includesSkill(text: string, skill: string) {
  const normalized = text.toLowerCase();
  if (skill === "C/C++")
    return (
      /(^|[^a-z])c(\+\+)?([^a-z]|$)/i.test(text) || normalized.includes("cpp")
    );
  return normalized.includes(skill.toLowerCase());
}

function rankJobByResume(
  job: JobOpening,
  resume: ResumeProfile | null,
): RankedJob {
  if (!resume?.content.trim())
    return {
      ...job,
      resumeScore: job.matchScore,
      matchedSkills: [],
      missingSkills: [],
    };
  const resumeText = resume.content;
  const jobText = `${job.role} ${job.industry} ${job.function} ${job.tags.join(" ")} ${job.summary}`;
  const desiredSkills = resumeSkillDictionary.filter((skill) =>
    includesSkill(jobText, skill),
  );
  const matchedSkills = desiredSkills.filter((skill) =>
    includesSkill(resumeText, skill),
  );
  const missingSkills = desiredSkills
    .filter((skill) => !includesSkill(resumeText, skill))
    .slice(0, 3);
  const industryHit = includesSkill(resumeText, job.industry) ? 12 : 0;
  const functionHit = includesSkill(resumeText, job.function) ? 14 : 0;
  const roleTokens = job.role
    .split(/[\s·、/（）()\-]/)
    .filter((token) => token.length >= 2);
  const roleHit = roleTokens.some((token) => resumeText.includes(token))
    ? 10
    : 0;
  const skillScore = Math.min(38, matchedSkills.length * 8);
  const coverage = desiredSkills.length
    ? Math.round((matchedSkills.length / desiredSkills.length) * 16)
    : 6;
  const score = Math.max(
    35,
    Math.min(
      99,
      Math.round(
        job.matchScore * 0.25 +
          22 +
          industryHit +
          functionHit +
          roleHit +
          skillScore +
          coverage,
      ),
    ),
  );
  return { ...job, resumeScore: score, matchedSkills, missingSkills };
}

type DailyLanguageWord = {
  term: string;
  reading?: string;
  meaning: string;
  example: string;
  translation: string;
  tag: string;
};
type DailyLanguageCase = {
  title: string;
  scene: string;
  original: string;
  translation: string;
  tasks: string[];
};

type LearningLanguage = "英语学习" | "日语学习";

const languageWordBank: Record<LearningLanguage, DailyLanguageWord[]> = {
  英语学习: [
    {
      term: "analyze",
      meaning: "分析；解析",
      example:
        "Students should analyze the evidence before reaching a conclusion.",
      translation: "学生在得出结论前应当分析证据。",
      tag: "CET-6 高频",
    },
    {
      term: "significant",
      meaning: "重要的；显著的",
      example:
        "Regular reading can make a significant difference to vocabulary growth.",
      translation: "规律阅读能显著促进词汇增长。",
      tag: "阅读",
    },
    {
      term: "maintain",
      meaning: "保持；维护",
      example:
        "It is difficult to maintain concentration without enough sleep.",
      translation: "睡眠不足时很难保持专注。",
      tag: "完形",
    },
    {
      term: "evidence",
      meaning: "证据；依据",
      example: "There is growing evidence that exercise improves memory.",
      translation: "越来越多证据表明运动能够改善记忆。",
      tag: "阅读",
    },
    {
      term: "impact",
      meaning: "影响；冲击",
      example: "Technology has a major impact on the way people communicate.",
      translation: "技术对人们的沟通方式产生重大影响。",
      tag: "写作",
    },
    {
      term: "require",
      meaning: "需要；要求",
      example: "The task requires both patience and careful planning.",
      translation: "这项任务既需要耐心，也需要周密规划。",
      tag: "CET-6 高频",
    },
    {
      term: "indicate",
      meaning: "表明；指出",
      example: "The survey results indicate a change in consumer habits.",
      translation: "调查结果表明消费者习惯发生了变化。",
      tag: "阅读",
    },
    {
      term: "approach",
      meaning: "方法；接近",
      example: "A practical approach is to review new words in context.",
      translation: "一种实用方法是在语境中复习新单词。",
      tag: "写作",
    },
    {
      term: "available",
      meaning: "可获得的；有空的",
      example: "More learning resources are now available online.",
      translation: "现在网上可以获得更多学习资源。",
      tag: "听力",
    },
    {
      term: "contribute",
      meaning: "贡献；促成",
      example: "Good study habits contribute to long-term progress.",
      translation: "良好的学习习惯有助于长期进步。",
      tag: "搭配",
    },
    {
      term: "establish",
      meaning: "建立；确立",
      example: "The school established a program to support new students.",
      translation: "学校设立了帮助新生的项目。",
      tag: "CET-6 高频",
    },
    {
      term: "respond",
      meaning: "回答；作出反应",
      example: "Please respond to the question in no more than two sentences.",
      translation: "请用不超过两句话回答问题。",
      tag: "听力",
    },
  ],
  日语学习: [
    {
      term: "あ",
      reading: "a",
      meaning: "平假名 a",
      example: "あさ（朝）",
      translation: "早晨",
      tag: "あ行",
    },
    {
      term: "い",
      reading: "i",
      meaning: "平假名 i",
      example: "いえ（家）",
      translation: "家",
      tag: "あ行",
    },
    {
      term: "う",
      reading: "u",
      meaning: "平假名 u",
      example: "うみ（海）",
      translation: "海",
      tag: "あ行",
    },
    {
      term: "え",
      reading: "e",
      meaning: "平假名 e",
      example: "えき（駅）",
      translation: "车站",
      tag: "あ行",
    },
    {
      term: "お",
      reading: "o",
      meaning: "平假名 o",
      example: "おと（音）",
      translation: "声音",
      tag: "あ行",
    },
    {
      term: "か",
      reading: "ka",
      meaning: "平假名 ka",
      example: "かさ（傘）",
      translation: "伞",
      tag: "か行",
    },
    {
      term: "き",
      reading: "ki",
      meaning: "平假名 ki",
      example: "き（木）",
      translation: "树；木头",
      tag: "か行",
    },
    {
      term: "く",
      reading: "ku",
      meaning: "平假名 ku",
      example: "くつ（靴）",
      translation: "鞋",
      tag: "か行",
    },
    {
      term: "け",
      reading: "ke",
      meaning: "平假名 ke",
      example: "けさ（今朝）",
      translation: "今天早晨",
      tag: "か行",
    },
    {
      term: "こ",
      reading: "ko",
      meaning: "平假名 ko",
      example: "こえ（声）",
      translation: "声音；嗓音",
      tag: "か行",
    },
    {
      term: "さ",
      reading: "sa",
      meaning: "平假名 sa",
      example: "さかな（魚）",
      translation: "鱼",
      tag: "さ行",
    },
    {
      term: "し",
      reading: "shi",
      meaning: "平假名 shi",
      example: "しお（塩）",
      translation: "盐",
      tag: "さ行",
    },
  ],
};

const languageCaseBank: Record<LearningLanguage, DailyLanguageCase[]> = {
  英语学习: [
    {
      title: "CET-6 阅读：规律运动与学习效率",
      scene: "六级阅读与翻译训练：识别主题句、因果关系和作者观点。",
      original:
        "Many students believe that studying longer always leads to better results. However, research suggests that short periods of regular exercise can improve attention and memory. The key is not to replace study time, but to arrange both activities in a balanced way.",
      translation:
        "许多学生认为学习时间越长，效果就越好。然而研究表明，短时间的规律运动可以改善注意力和记忆力。关键不是用运动取代学习，而是平衡安排两类活动。",
      tasks: [
        "用一句英文概括文章主旨",
        "找出转折词并判断作者观点",
        "完成一段 150 词的观点写作",
      ],
    },
    {
      title: "日常对话：图书馆服务咨询",
      scene: "生活英语对话训练：抓取地点、时间、目的与解决方案。",
      original:
        "The library will extend its opening hours during the exam week. Students may reserve a study room online, but each reservation is limited to two hours. Those who need help can ask at the information desk on the first floor.",
      translation:
        "考试周期间图书馆将延长开放时间。学生可以在线预约自习室，但每次预约限两小时；需要帮助可前往一楼咨询台。",
      tasks: [
        "记录三个关键信息点",
        "复述预约限制",
        "模拟回答一道主旨题和一道细节题",
      ],
    },
    {
      title: "CET-6 写作：合理使用智能工具",
      scene: "六级写作训练：建立观点、理由、例证和结论。",
      original:
        "Intelligent tools can make learning more efficient, but they should be used as assistants rather than substitutes for thinking. Students need to check information, compare different sources, and explain ideas in their own words.",
      translation:
        "智能工具能够提高学习效率，但应作为辅助工具，而不是思考的替代品。学生需要核对信息、比较不同来源，并用自己的语言解释观点。",
      tasks: [
        "提取中心论点和两个支撑点",
        "补写一个具体例子",
        "完成 120—150 词考试作文",
      ],
    },
  ],
  日语学习: [
    {
      title: "五十音入门：あ行",
      scene: "零基础第一课：识别并准确读出 あ、い、う、え、お。",
      original:
        "あ・い・う・え・お。あさ、いえ、うみ、えき、おと。",
      translation: "a、i、u、e、o。早晨、家、海、车站、声音。",
      tasks: [
        "按顺序跟读あ行五个假名三遍",
        "遮住罗马音后独立认读",
        "各抄写五遍并说出对应基础词",
      ],
    },
    {
      title: "五十音入门：か行",
      scene: "零基础第二课：掌握清音 か、き、く、け、こ。",
      original:
        "か・き・く・け・こ。かさ、き、くつ、けさ、こえ。",
      translation: "ka、ki、ku、ke、ko。伞、树、鞋、今天早晨、声音。",
      tasks: [
        "对比あ行与か行的口型和送气",
        "听音后指出正确假名",
        "各抄写五遍并完成あ行、か行混合认读",
      ],
    },
    {
      title: "五十音入门：さ行",
      scene: "零基础第三课：学习 さ、し、す、せ、そ，重点区分 shi 的发音。",
      original:
        "さ・し・す・せ・そ。さかな、しお、すし、せかい、そら。",
      translation: "sa、shi、su、se、so。鱼、盐、寿司、世界、天空。",
      tasks: [
        "慢速跟读さ行并重点练习し",
        "随机认读あ行、か行、さ行",
        "用假名卡完成听音选字练习",
      ],
    },
  ],
};

function getDailyLanguageLesson(language: LearningLanguage) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const seed = Number(dateKey.replace(/\D/g, ""));
  const bank = languageWordBank[language];
  const start = language === "日语学习" ? 0 : seed % bank.length;
  const words = Array.from(
    { length: 6 },
    (_, index) => bank[(start + index) % bank.length],
  );
  const caseStudy = language === "日语学习"
    ? languageCaseBank[language][0]
    : languageCaseBank[language][seed % languageCaseBank[language].length];
  return { dateKey, words, caseStudy };
}

type KnowledgeVisualProfile = {
  kind:
    | "can"
    | "motor"
    | "robot"
    | "bearing"
    | "suspension"
    | "control"
    | "ros"
    | "mechanics"
    | "engine"
    | "robot-training"
    | "reinforcement"
    | "embedded"
    | "rtos"
    | "interface"
    | "general";
  visualLabel: "机械结构图" | "电路原理图" | "算法流程图" | "系统关系图";
  purpose: string;
  title: string;
  caption: string;
  structure: Array<{ symbol: string; label: string; detail: string }>;
  codeFlow: Array<{ label: string; detail: string }>;
};

export function getKnowledgeVisualProfile(
  title: string,
  category: string,
): KnowledgeVisualProfile {
  const text = `${title} ${category}`;
  if (/CAN|控制器局域网|差分总线|CANH|CANL/i.test(text))
    return {
      kind: "can",
      visualLabel: "电路原理图",
      purpose: "定位 CAN 通信中控制器、收发器、线缆与接收节点之间的信号路径和故障边界。",
      title: "CAN 通信链路结构",
      caption:
        "从控制器数据到差分总线，再到接收节点；排障必须沿信号链逐层确认。",
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
      caption:
        "发布节点和订阅节点通过 Topic、Service 或 Action 交换信息；ROS 1 依赖 Master 完成发现，ROS 2 由 DDS 分布式发现并用 QoS 约束通信质量。",
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
      caption:
        "训练回报不是最终目标；策略必须在独立场景中通过成功率、碰撞率、动作边界和扰动鲁棒性验证后，才能进入低速真机测试。",
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
      caption:
        "智能体依据状态选择动作，环境返回下一状态和奖励；算法用采样数据估计价值或更新策略，并在独立测试环境中检查真实任务表现。",
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
      caption:
        "气缸内燃烧产生的压力推动活塞，经连杆和曲轴转换为旋转机械功；气门、喷油和点火控制决定充量、燃烧相位、效率与排放。",
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
      caption:
        "调度器始终选择最高优先级就绪任务运行；互斥量、消息队列、中断和超时改变任务状态，最坏响应时间决定系统是否满足截止期。",
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
      caption:
        "接口是否可靠同时取决于电压、电流、上下拉、时钟和帧时序，也取决于引脚复用、寄存器和软件超时恢复；只检查代码或只检查接线都不完整。",
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
      caption:
        "外设通过寄存器与内核交互，DMA 在外设和 RAM 之间搬运数据，中断报告完成或异常；启动代码则建立栈、数据段、时钟和程序入口。",
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
  if (
    !/轴承|齿轮|寿命|传动/i.test(text) &&
    /机械基础|机械设计|受力分析|自由体图|强度|公差|机构|连接/i.test(text)
  )
    return {
      kind: "mechanics",
      visualLabel: "机械结构图",
      purpose: "从装配结构中识别约束和载荷路径，并把外力逐级转换为内力、应力、变形与失效校核。",
      title: "机械结构与载荷分析链",
      caption:
        "先隔离研究对象并明确支承、连接与外载荷，再沿连续载荷路径计算内力和应力；几何、公差、材料和工况共同决定结构能否安全工作。",
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
      caption:
        "任务空间目标经过轨迹规划和关节控制，最终由机械结构实现末端运动。",
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
      caption:
        "外部载荷经轴、内圈和滚动体传递到外圈及轴承座，接触应力决定疲劳寿命。",
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
      caption:
        "路面输入依次作用于轮胎、非簧载质量和悬架，再传递到车身；舒适性与操稳需要同时评价。",
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
    caption:
      "阅读时先确认研究对象与输入，再理解采用的方法和产生的结果，最后用数据、试验或边界条件验证结论是否成立。",
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

function EngineeringTopicFigure({
  profile,
}: {
  profile: KnowledgeVisualProfile;
}) {
  const reference = {
    robot: {
      title: "工业机械臂实物参考",
      note: "观察关节减速器、线缆走向、末端法兰与工作空间之间的真实装配关系。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "robot",
      source: "资料库工程图集 · 项目内置示意图",
    },
    motor: {
      title: "PMSM 电机剖视参考",
      note: "定子绕组、永磁转子、轴承与输出轴共同构成电磁能到机械能的转换链。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "motor",
      source: "资料库工程图集 · 项目内置示意图",
    },
    can: {
      title: "车规 ECU 与线束参考",
      note: "将控制器、连接器与双绞线放在同一视图中，便于对应物理层排障位置。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "can",
      source: "资料库工程图集 · 项目内置示意图",
    },
    bearing: {
      title: "滚动轴承剖视参考",
      note: "内外圈、滚动体与保持架的接触关系决定了承载能力、摩擦与疲劳寿命。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "bearing",
      source: "资料库工程图集 · 项目内置示意图",
    },
    suspension: {
      title: "车辆悬架实物参考",
      note: "轮胎、弹簧减振器、控制臂与转向节共同决定路面激励的传递路径。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "suspension",
      source: "资料库工程图集 · 项目内置示意图",
    },
    control: {
      title: "闭环控制试验台参考",
      note: "传感器、执行器与测量波形构成可观测、可验证的实际闭环系统。",
      src: "/knowledge-reference-atlas.png",
      cropKind: "control",
      source: "资料库工程图集 · 项目内置示意图",
    },
    ros: {
      title: "ROS 节点通信与机器人数据流",
      note: "以机器人为中心观察感知、规划、控制和监测节点之间的消息方向与协同关系。",
      src: "/knowledge-ros-network.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    mechanics: {
      title: "齿轮轴系、滚动支承与载荷路径",
      note: "从剖视装配关系中识别齿轮输入、轴系传力、轴承支承、箱体约束与危险截面。",
      src: "/knowledge-mechanics-load-path.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    engine: {
      title: "四冲程发动机机构运动",
      note: "观察活塞、连杆、曲轴和气门在进气、压缩、做功和排气阶段的相对运动。",
      src: "/knowledge-engine-four-stroke.gif",
      cropKind: "direct",
      source: "Wikimedia Commons · UtzOnBike / A7N8X · CC BY-SA 3.0",
    },
    "robot-training": {
      title: "机器人训练、反馈与策略更新闭环",
      note: "动作驱动机器人，状态、奖励和经验样本返回智能体，形成可迭代验证的训练循环。",
      src: "/knowledge-reinforcement-loop.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    reinforcement: {
      title: "强化学习状态—动作—奖励闭环",
      note: "把策略、动作、环境反馈和经验回放放在同一循环中理解，避免只看累计回报。",
      src: "/knowledge-reinforcement-loop.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    embedded: {
      title: "微控制器开发板与核心器件",
      note: "在实物中对应处理器、晶振、复位、供电、调试端口和外设引脚。",
      src: "/knowledge-stm32-real.jpg",
      cropKind: "direct",
      source: "Wikimedia Commons · Viswesr · CC BY-SA 3.0",
    },
    rtos: {
      title: "实时任务调度、同步与资源等待",
      note: "沿多任务时间线识别抢占、阻塞、唤醒、互斥区和消息队列对响应时间的影响。",
      src: "/knowledge-rtos-scheduler.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    interface: {
      title: "MCU 接口连接与测量波形",
      note: "将数字、模拟、PWM 与串行总线的电气连接对应到可测量的真实信号波形。",
      src: "/knowledge-embedded-interfaces.png",
      cropKind: "direct",
      source: "OpenAI 图像生成 · 资料库专题图",
    },
    general: {
      title: "工程对象与验证场景总览",
      note: "用真实对象提醒读者把概念、模型和方法连接到可观测、可测量的工程系统。",
      src: "/knowledge-engineering-hero.png",
      cropKind: "direct",
      source: "资料库工程总览 · 项目内置示意图",
    },
  }[profile.kind];
  return (
    <figure className="engineering-topic-figure" data-kind={profile.kind}>
      <header>
        <div>
          <small>ENGINEERING SCHEMATIC</small>
          <h3>{profile.title}</h3>
        </div>
        <span>{profile.visualLabel}</span>
      </header>
      <div className="engineering-schematic">
        <div
          className="schematic-art"
          aria-label={`${profile.title}示意图`}
          role="img"
        >
          <i className="schematic-part part-a" />
          <i className="schematic-part part-b" />
          <i className="schematic-part part-c" />
          <i className="schematic-part part-d" />
          <i className="schematic-line line-a" />
          <i className="schematic-line line-b" />
          <i className="schematic-line line-c" />
        </div>
        <div className="schematic-legend">
          {profile.structure.map((node, index) => (
            <article key={node.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{node.label}</b>
                <p>{node.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <section className="engineering-reference">
        <div>
          <small>PHYSICAL REFERENCE</small>
          <h4>{reference.title}</h4>
          <p>{reference.note}</p>
          <span>
            实物风格图仅用于辅助理解结构与部件关系；尺寸、材料和安全边界仍以工程图纸、标准与实测数据为准。
          </span>
          <span>图片来源：{reference.source}</span>
        </div>
        <figure
          className={`engineering-reference-photo ${reference.cropKind === "direct" ? "direct" : ""}`}
          data-kind={reference.cropKind}
          data-profile-kind={profile.kind}
        >
          <img src={reference.src} alt={reference.title} loading="lazy" />
        </figure>
      </section>
      <figcaption>
        <b>主要作用：</b>
        {profile.purpose}
        <span>
          <b>读图说明：</b>
          {profile.caption}
        </span>
      </figcaption>
    </figure>
  );
}

function KnowledgeVisualSuite({
  profile,
}: {
  profile: KnowledgeVisualProfile;
}) {
  const structuralKinds = new Set<KnowledgeVisualProfile["kind"]>([
    "robot",
    "motor",
    "bearing",
    "suspension",
    "mechanics",
    "engine",
    "embedded",
  ]);
  const isStructural = structuralKinds.has(profile.kind);
  return (
    <div className="knowledge-visual-suite">
      {isStructural && (
        <figure className="diagram-card exploded-diagram">
          <header>
            <div>
              <small>EXPLODED VIEW</small>
              <h3>结构拆解图与组成成分</h3>
            </div>
            <span>总成 → 部件 → 接口</span>
          </header>
          <div className="exploded-canvas">
            <div className="exploded-axis" />
            {profile.structure.map((part, index) => (
              <article
                key={part.label}
                style={{ "--part-index": index } as React.CSSProperties}
              >
                <span>{part.symbol}</span>
                <div>
                  <b>{part.label}</b>
                  <small>{part.detail}</small>
                </div>
              </article>
            ))}
          </div>
          <figcaption>
            拆解图用于识别组成成分、装配关系和载荷/信号传递方向；实际尺寸、材料与公差以工程图纸和实测数据为准。
          </figcaption>
        </figure>
      )}
      <figure className="diagram-card circuit-diagram">
        <header>
          <div>
            <small>PRINCIPLE / PROCESS</small>
            <h3>{profile.visualLabel}：{profile.title}</h3>
          </div>
          <span>输入 → 处理 → 输出 → 验证</span>
        </header>
        <div className="circuit-canvas">
          <div className="circuit-track">
            {profile.codeFlow.map((node, index) => (
              <div className="circuit-step" key={node.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b title={node.detail}>{node.label}</b>
                {index < profile.codeFlow.length - 1 && <i aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="circuit-return">
            <span>验证结果返回模型与参数修正</span>
            <i />
          </div>
        </div>
        <div className="diagram-step-notes">
          {profile.codeFlow.map((node, index) => (
            <p key={node.label}>
              <b>{index + 1}. {node.label}</b>
              <span>{node.detail}</span>
            </p>
          ))}
        </div>
        <p className="diagram-principle">
          <b>主要作用：</b>
          {profile.purpose}
        </p>
        <figcaption className="diagram-reading-caption">
          <b>读图说明：</b>{profile.caption}
        </figcaption>
      </figure>
    </div>
  );
}

function CanDifferentialPrincipleFigure() {
  return (
    <figure className="can-differential-figure">
      <header>
        <div>
          <small>CIRCUIT PRINCIPLE</small>
          <h4>CAN 差分总线结构与电平关系</h4>
        </div>
        <span>双端 120 Ω 终端匹配</span>
      </header>
      <div className="can-network-diagram" aria-label="CAN差分通信电路原理图">
        <article className="can-ecu-node">
          <b>节点 A</b>
          <span>MCU</span>
          <i>TX / RX</i>
          <strong>CAN 收发器</strong>
        </article>
        <div className="can-termination left">
          <span>120 Ω</span>
        </div>
        <div className="can-bus-lines">
          <div className="can-wire can-high">
            <b>CANH</b>
            <i />
          </div>
          <div className="can-wire can-low">
            <b>CANL</b>
            <i />
          </div>
          <span className="can-twist">双绞线</span>
        </div>
        <div className="can-termination right">
          <span>120 Ω</span>
        </div>
        <article className="can-ecu-node">
          <b>节点 B</b>
          <span>MCU</span>
          <i>TX / RX</i>
          <strong>CAN 收发器</strong>
        </article>
      </div>
      <div className="can-state-explanation">
        <article>
          <small>显性位 · Dominant</small>
          <div>
            <span className="high" style={{ width: "78%" }}>
              CANH ≈ 3.5 V
            </span>
          </div>
          <div>
            <span className="low" style={{ width: "34%" }}>
              CANL ≈ 1.5 V
            </span>
          </div>
          <p>
            <b>差分电压约 2 V</b>，接收器判定为显性状态。
          </p>
        </article>
        <article>
          <small>隐性位 · Recessive</small>
          <div>
            <span className="neutral" style={{ width: "56%" }}>
              CANH ≈ 2.5 V
            </span>
          </div>
          <div>
            <span className="neutral" style={{ width: "56%" }}>
              CANL ≈ 2.5 V
            </span>
          </div>
          <p>
            <b>差分电压接近 0 V</b>，两根线回到共同偏置电平。
          </p>
        </article>
      </div>
      <figcaption>
        收发器把 MCU 的单端逻辑转换为 CANH 与 CANL
        上方向相反的电压变化。接收端只判断两线之差，因此两根线上同时耦合的共模干扰会被大幅抵消；两端终端电阻用于匹配线缆特性阻抗并抑制信号反射。
      </figcaption>
    </figure>
  );
}

type TheoryFigurePreset = {
  kind: string;
  eyebrow: string;
  title: string;
  nodes: Array<{ label: string; detail: string }>;
  caption: string;
};

function getTheoryFigurePreset(text: string): TheoryFigurePreset | null {
  const presets: Array<{ match: RegExp; figure: TheoryFigurePreset }> = [
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
        caption:
          "Master 只参与注册与连接协商，数据通常不经过 Master；这也是诊断时要分开检查“发现失败”与“数据链路失败”的原因。",
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
        caption:
          "ROS 2 没有单一 Master。发布端与订阅端只有在类型、Domain 和 QoS 相容时才会建立有效通信。",
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
        caption:
          "受力分析的核心是建立连续的载荷路径。边界条件不清楚时，后续应力或安全系数都没有物理基础。",
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
        caption:
          "一个循环需要曲轴旋转两圈。理想奥托循环用于解释效率趋势，真实发动机还需加入换气、传热、摩擦和燃烧持续期。",
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
        caption:
          "Bellman 方程把长期回报拆成当前奖励与后续状态价值。算法的差异主要在于如何估计价值、如何更新策略以及是否复用历史数据。",
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
        caption:
          "DMA 不代替 CPU 处理业务逻辑，它只在外设与存储器之间高效搬运数据；中断则用于报告完成、错误或紧急事件。",
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
        caption:
          "实时性关心最坏情况响应时间，不是平均 CPU 利用率。长时间中断、锁竞争和优先级反转都会延迟高优先级任务。",
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
        caption:
          "接口故障不能只看代码。原理图、示波器/逻辑分析仪波形、寄存器配置和驱动状态必须放在同一条证据链上核对。",
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
        caption:
          "Park 变换将随转子旋转的正弦量变成稳态近似直流量，使 PI 调节器能独立控制 d 轴磁链与 q 轴转矩。",
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
        caption:
          "L10 仅表示滚动接触疲劳的统计寿命。润滑不足、污染、安装偏心或过大预紧可能在计算寿命之前导致失效。",
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
        caption:
          "路径只解决“从哪里经过”，轨迹还要解决“什么时候到达”。增大总时间可系统性降低速度、加速度与 jerk 峰值。",
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
        caption:
          "低频车身跳动决定舒适性，高频车轮跳动影响接地力。刚度与阻尼设计必须同时权衡车身加速度、悬架行程和轮胎动载荷。",
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
        caption:
          "一次阶跃响应收敛不能代替内部稳定性证明。工程上应联合检查闭环极点、频域裕度和不确定参数下的时域响应。",
      },
    },
  ];
  return presets.find((item) => item.match.test(text))?.figure || null;
}

function TheoryConceptFigure({ preset }: { preset: TheoryFigurePreset }) {
  return (
    <figure className={`theory-concept-figure ${preset.kind}`}>
      <header>
        <div>
          <small>{preset.eyebrow}</small>
          <h4>{preset.title}</h4>
        </div>
        <span>原理图</span>
      </header>
      <div className="theory-concept-chain">
        {preset.nodes.map((node, index) => (
          <div className="theory-concept-step" key={node.label}>
            <article>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{node.label}</b>
              <p>{node.detail}</p>
            </article>
            {index < preset.nodes.length - 1 && <i aria-hidden="true">→</i>}
          </div>
        ))}
      </div>
      <figcaption>{preset.caption}</figcaption>
    </figure>
  );
}

type KnowledgeMedia = {
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
  details?: Array<{ label: string; value: string }>;
};

export function getKnowledgeTextbookMedia(
  title: string,
  category: string,
): KnowledgeMedia {
  const text = `${title} ${category}`;
  if (/机械设计基础|机构、传动、连接与公差|机构.*公差/i.test(text))
    return {
      src: "/knowledge-mechanical-design.png",
      title: "机械设计装配链与尺寸约束",
      caption:
        "爆炸图按同一轴线展开联轴器、紧固件、挡圈、轴承、键连接、齿轮、转轴和箱体，既显示装配先后，也显示零件之间的配合与定位关系。它用于把机构、传动、连接和公差从孤立知识点串成完整轴系。",
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
      caption:
        "剖视图把空气滤清与增压、喷油点火、缸内燃烧、排气、EGR 回流、氧传感和后处理装置放在同一流路中。不同颜色强调新鲜空气、燃烧能量和高温废气的去向，便于理解控制变量之间的耦合。",
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
      caption:
        "左侧展示不同光照、物体和工况下的并行仿真训练，中部汇集轨迹数据、参数分布与策略验证，右侧是真实机械臂、安全围栏、传感器和急停装置。图片强调策略不能从仿真直接跳到真机，而要经过数据、随机化和分级验证。",
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
      caption:
        "三条并行计算路径分别突出离散价值学习、基于新轨迹的受约束策略更新，以及带经验回放的连续动作 Actor-Critic。它们共享环境却使用不同的数据来源、动作形式和更新机制，因此不应只按最终回报高低选型。",
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
      caption:
        "中心节点表示当前状态，蓝色分支表示可选动作和随机转移，绿色方块与红色危险点表示不同奖励结果，右侧暖色路径表示较高长期价值。回传箭头说明当前价值由即时奖励与折扣后的下一状态价值共同构成。",
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
      caption:
        "中央 MCU 开发板向外连接数字输入输出、模拟传感、PWM 电机驱动、多线同步外设、带上拉的双线总线和异步串口。外围波形把电气信号与软件外设对应起来，避免只看接口名称而忽略电平和时序。",
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
      caption:
        "活塞在进气、压缩、做功和排气四个冲程之间往复运动，曲轴把活塞直线运动转换为连续旋转输出。观察气门开闭、点火时刻和活塞方向，可以把热力循环与真实机构运动对应起来。",
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
  if (
    /STM32.*(硬件|开发板|接口)|MCU.*(硬件|引脚|外设)|GPIO|ADC|SPI|I²C|I2C|UART|硬件接口/i.test(
      text,
    )
  )
    return {
      src: "/knowledge-stm32-real.jpg",
      title: "STM32 开发板实物与硬件分区",
      caption:
        "开发板把 MCU、时钟、复位、供电、调试接口和外设引脚组织在同一块 PCB 上。阅读固件之前，应先在实物和原理图中确认芯片型号、晶振、供电域、接口复用及信号流向。",
      source: "Wikimedia Commons · Viswesr · CC BY-SA 3.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:STM32_LV_Discovery_board.jpg",
      portrait: true,
      objectPosition: "center",
      details: [
        { label: "图中内容", value: "MCU、晶振、供电与稳压、复位、调试接口、存储器和扩展引脚等开发板基础分区。" },
        { label: "阅读顺序", value: "先确认主芯片和供电域，再沿时钟、复位与调试链路检查启动条件，最后对应外设引脚和复用功能。" },
        { label: "主要作用", value: "用于把固件配置映射到真实硬件位置；芯片型号、引脚编号和电气限制仍应以原理图与数据手册为准。" },
      ],
    };
  if (
    /工业机器人|机械臂本体|机器人机械结构|关节结构|末端执行器|机器人构造/i.test(
      text,
    )
  )
    return {
      src: "/knowledge-robot-real.jpg",
      title: "工业机器人实物系统",
      caption:
        "真实机器人并不是单一算法：机械臂本体、关节驱动、末端工具、传感器、安全装置和控制软件共同构成闭环。模型、代码和训练策略最终都必须回到这套物理系统上验证。",
      source: "Wikimedia Commons · Projekt ANA · CC0 1.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:ROMO_FerRobotics_Technisches_Museum_Wien_Februar_2013_File1.JPG",
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
      caption:
        "中心机器人与周围计算节点通过多条数据通路协同，直观对应 ROS 中节点、Topic、Service、Action 以及 ROS 2 的 DDS/QoS 通信关系。读图时应重点关注消息方向、频率、可靠性与超时边界。",
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
      caption:
        "智能体输出动作驱动机器人，环境返回状态、奖励和完成信号，经验样本再进入策略更新。该图用于对应状态—动作—转移—奖励链，并提醒训练指标必须与真实任务、安全约束和部署表现联合验证。",
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
      caption:
        "机械臂本体、关节驱动、末端工具、传感器和控制软件共同构成闭环。运动学模型与轨迹规划最终都要在真实执行器、负载、关节限位和安全边界下验证。",
      source: "Wikimedia Commons · Projekt ANA · CC0 1.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:ROMO_FerRobotics_Technisches_Museum_Wien_Februar_2013_File1.JPG",
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
      caption:
        "剖面图展示定子绕组、转子、转轴与机壳的相对位置。电流经逆变器形成旋转磁场，电磁转矩由转子和轴系输出；控制参数需要与电机结构、温升和机械负载联合校核。",
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
      caption:
        "剖视结构展示齿轮输入、轴系传递、滚动轴承支承与箱体固定关系，黄色路径表示载荷由输入端向输出端及支承位置传递。开展强度、寿命或公差分析时，应先据此确定边界和危险截面。",
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
      caption:
        "轮胎、轮毂、连杆、弹簧和减振器共同传递路面输入。车辆模型中的簧载质量、非簧载质量、刚度和阻尼，均应与真实轮端结构和试验工况对应。",
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
      caption:
        "标题图聚焦 ECU、连接器和双绞线构成的 CAN 物理链路；排障时应沿 MCU 控制器、收发器、CANH/CANL、终端电阻和对端节点逐段检查，并结合示波器波形判断电气与协议问题。",
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
      caption:
        "微控制器旁的多条时间线表示不同优先级任务、中断、等待与资源互斥过程。沿时间轴观察执行片段和同步点，可以理解抢占、阻塞、消息传递以及最坏响应时间如何共同决定系统实时性。",
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
      caption:
        "试验台图把参考输入、控制器、执行器、被控对象和传感器反馈放在同一闭环中。稳定性分析或参数整定时，应同时检查极点与频域指标、时域响应、饱和限制和测量噪声。",
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
      caption:
        "开发板上的微控制器、时钟、Flash、RAM、供电、复位、调试端口和外设引脚共同构成固件运行载体。理解启动、中断和 DMA 时，应把代码执行路径映射到芯片内部资源与板级连接。",
      source: "Wikimedia Commons · Viswesr · CC BY-SA 3.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:STM32_LV_Discovery_board.jpg",
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
    caption:
      "图中汇集机器人、电机、轴承、嵌入式控制器和车辆悬架等典型工程对象，用于说明知识条目应从概念和模型延伸到结构、信号、载荷与验证场景。",
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

function buildTheoryExpansion(
  sectionTitle: string,
  title: string,
  category: string,
) {
  const text = `${sectionTitle} ${title} ${category}`;
  if (/ROS|Topic|Service|Action|DDS|QoS|节点|通信图/i.test(text))
    return "分析这一部分时，应先画出节点之间的通信图，再为每条接口标注消息类型、方向、频率、数据规模、可靠性和超时要求。Topic适合连续异步数据，Service适合短时请求—响应，Action适合需要进度反馈与取消机制的长任务；接口选错会引入阻塞、状态耦合或不可预测时延。";
  if (/轨迹|五次多项式|雅可比|运动学/i.test(text))
    return "应把几何路径、时间参数化和执行器约束分开分析：路径决定经过哪里，时间律决定何时到达，控制系统决定能否准确跟随。任何轨迹都需要逐点检查关节限位、速度、加速度、jerk、奇异性和碰撞，不能只凭曲线连续就判定可执行。";
  if (/强化学习|Q-learning|PPO|SAC|策略|奖励/i.test(text))
    return "该知识点应放在马尔可夫决策过程的状态—动作—转移—奖励链中理解。训练指标除了累计回报，还必须同时检查样本效率、策略方差、约束违反率、域外状态和部署稳定性，防止奖励提高但真实任务性能下降。";
  if (/发动机|奥托循环|燃烧|四冲程/i.test(text))
    return "理解热力循环时，应把气缸压力、容积、温度和曲轴转角联系起来，并区分理想循环与真实换气、燃烧、传热和摩擦损失。结构运动图用于解释活塞、连杆、曲轴和气门的时序关系，性能结论仍需结合示功图和试验数据。";
  if (/电机|PMSM|定子|转子|磁链|转矩/i.test(text))
    return "应同时沿电磁、机械和热三条路径理解：电流建立磁场并产生转矩，转矩经转子和轴系输出，铜耗与铁耗则通过定子、机壳和冷却系统散出。模型参数会随温度、饱和与频率变化，因此控制模型和结构校核需要相互验证。";
  if (/轴承|齿轮|传动|应力|静力|强度/i.test(text))
    return "分析机械问题时，应先用受力图确定载荷路径，再由平衡方程求内力，随后计算应力、变形、疲劳或寿命。材料、几何突变、装配公差、润滑和载荷谱决定理想计算能否代表真实结构。";
  if (/STM32|MCU|RTOS|中断|DMA|GPIO|ADC|SPI|I²C|UART|CAN/i.test(text))
    return "应把芯片引脚与电气连接、寄存器配置、驱动状态机和实时任务放在同一条信号链中核对。硬件原理图说明信号从哪里来，代码说明如何采样与处理，时序测量则验证延迟、抖动和异常恢复是否满足要求。";
  if (/控制|稳定|闭环|Lyapunov|频率响应/i.test(text))
    return "应从对象模型、反馈结构和性能指标三层展开：模型描述状态如何演化，反馈决定误差如何被修正，稳定裕度、带宽、超调和稳态误差共同限定参数范围。结论必须通过极点或频域分析与时域响应交叉验证。";
  return `理解“${sectionTitle}”时，应明确研究对象、输入输出、主要变量和成立条件，再沿因果关系把概念转换为可计算模型。最后使用量纲、极限工况和实际数据检查结论，避免把局部规律直接推广到模型边界之外。`;
}

function TextbookTheory({
  sections,
  title,
  category,
}: {
  sections: Array<{ title: string; content: string }>;
  title: string;
  category: string;
}) {
  const media = getKnowledgeTextbookMedia(title, category);
  return (
    <div className="textbook-theory">
      {sections.map((item, index) => {
        const theoryText = `${item.title} ${item.content} ${title} ${category}`;
        const isCanDifferential = /CAN\s*差分通信电路原理|CANH|CANL/i.test(
          theoryText,
        );
        const matchedFigure = isCanDifferential
          ? null
          : getTheoryFigurePreset(theoryText);
        const conceptFigure =
          matchedFigure &&
          sections.findIndex(
            (section) =>
              getTheoryFigurePreset(
                `${section.title} ${section.content} ${title} ${category}`,
              )?.title === matchedFigure.title,
          ) === index
            ? matchedFigure
            : null;
        const showCanFigure =
          isCanDifferential &&
          sections.findIndex((section) =>
            /CAN\s*差分通信电路原理|CANH|CANL/i.test(
              `${section.title} ${section.content} ${title} ${category}`,
            ),
          ) === index;
        return (
          <div className="textbook-theory-unit" key={item.title}>
            <header>
              <span>{`2.${index + 1}`}</span>
              <h3>{item.title}</h3>
            </header>
            <p>{emphasizeTechnicalText(item.content)}</p>
            {showCanFigure && <CanDifferentialPrincipleFigure />}
            {conceptFigure && <TheoryConceptFigure preset={conceptFigure} />}
            <p className="textbook-expansion">
              {emphasizeTechnicalText(
                buildTheoryExpansion(item.title, title, category),
              )}
            </p>
            <aside className="textbook-study-note">
              <b>分析要点</b>
              <span>定义对象与边界</span>
              <i>→</i>
              <span>识别输入和状态量</span>
              <i>→</i>
              <span>建立模型</span>
              <i>→</i>
              <span>用试验或数据验证</span>
            </aside>
            {index === 0 && media && (
              <figure
                className={`textbook-media ${media.portrait ? "portrait" : "landscape"}`}
              >
                <div className="textbook-media-image">
                  <img
                    src={media.src}
                    alt={media.title}
                    loading="lazy"
                    style={{ objectPosition: media.objectPosition }}
                  />
                </div>
                <figcaption>
                  <small>相关实物 / 结构参考</small>
                  <h4>{media.title}</h4>
                  <p>{media.caption}</p>
                  {media.details?.length ? (
                    <dl className="knowledge-media-details">
                      {media.details.map((detail) => (
                        <div key={detail.label}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {media.sourceUrl ? (
                    <a href={media.sourceUrl} target="_blank" rel="noreferrer">
                      图片来源：{media.source} ↗
                    </a>
                  ) : (
                    <span>图片来源：{media.source}</span>
                  )}
                </figcaption>
              </figure>
            )}
          </div>
        );
      })}
      {/电机|PMSM|FOC|矢量控制/i.test(`${title} ${category}`) && (
        <MotorMechanicalStructureLesson />
      )}
    </div>
  );
}

const motorMechanicalTheory = [
  {
    title: "电机总成与机械载荷路径",
    content:
      "电机机械总成由定子铁芯与绕组、转子、转轴、前后轴承、机壳、端盖、密封和冷却部件组成。电磁力在定转子气隙中产生转矩，转矩经转子铁芯传到转轴，再通过花键、键或联轴器输出；径向电磁力、不平衡力和外部悬臂载荷则由转轴传给轴承，最终经端盖和机壳传到安装基础。结构设计必须同时画清转矩路径、径向载荷路径、轴向载荷路径和热流路径。",
  },
  {
    title: "定子铁芯、绕组与机壳",
    content:
      "定子铁芯由绝缘硅钢片叠压而成，齿槽容纳绕组并建立磁路。叠片可降低涡流损耗，但叠压系数、齿部饱和、槽口形状和装配应力会影响电磁性能与噪声。铁芯通常通过过盈、热套、焊接或灌封固定在机壳内；过盈不足可能产生微动和异响，过盈过大会使机壳和铁芯变形并改变气隙。机壳不仅承载，还承担散热、密封、接口定位和模态控制。",
  },
  {
    title: "转子、永磁体、转轴与高速约束",
    content:
      "表贴式转子把磁钢固定在转子表面，结构简单但高速时需护套或绑带抵抗离心力；内埋式转子把磁钢置于硅钢片磁障内，机械强度和凸极利用率较高，但转子桥处应力集中明显。转轴承受扭转、弯曲、轴向力和循环疲劳，台阶、键槽、花键根部及过盈配合端部是常见危险截面。高速设计还需校核转子离心应力、过盈保持力、临界转速、动平衡等级和超速试验裕量。",
  },
  {
    title: "轴承支承、气隙与轴系精度",
    content:
      "轴承支承决定转子的径向和轴向定位。常见方案包括深沟球轴承的浮动—固定组合、角接触轴承成对预紧以及高速电机的陶瓷或绝缘轴承。轴承游隙、预紧、配合、公差链和温差膨胀共同决定运行间隙；预紧过小会降低刚度并产生窜动，过大则增加摩擦、温升和早期疲劳。轴系挠度、轴承位同轴度和端盖变形必须受控，使最小气隙在装配误差、热变形和电磁拉力共同作用下仍不发生扫膛。",
  },
  {
    title: "冷却、密封、NVH与可制造性",
    content:
      "损耗由绕组铜耗、铁耗、磁钢涡流损耗和轴承摩擦组成，热量沿槽内绝缘、铁芯、机壳、冷却水套或油路排出。机械结构应避免冷却死区，并控制绕组热点、轴承温度和磁钢退磁风险。密封需根据防护等级选择骨架油封、O形圈、迷宫或机械密封，同时评估摩擦和泄漏。NVH设计要联动电磁阶次、转子不平衡、轴承激励和机壳模态；制造阶段则需明确叠压、动平衡、轴承压装、气隙测量和端盖定位的检验方法。",
  },
];

function MotorMechanicalStructureLesson() {
  const assemblies = [
    {
      mark: "S",
      title: "定子总成",
      detail: "铁芯、绕组、绝缘与温度传感器",
      check: "叠压系数 · 槽满率 · 过盈量",
    },
    {
      mark: "R",
      title: "转子总成",
      detail: "磁钢、转子铁芯、护套与平衡件",
      check: "离心强度 · 保持力 · 动平衡",
    },
    {
      mark: "B",
      title: "轴承轴系",
      detail: "转轴、轴承、预紧与输出接口",
      check: "挠度 · 游隙 · 临界转速",
    },
    {
      mark: "H",
      title: "壳体热管理",
      detail: "机壳、端盖、密封、水套或油路",
      check: "同轴度 · 温升 · 防护等级",
    },
  ];
  return (
    <section className="motor-mechanics-lesson">
      <header>
        <div>
          <small>MOTOR MECHANICAL ARCHITECTURE</small>
          <h3>电机机械结构专题</h3>
        </div>
        <span>结构 · 载荷 · 热 · 装配</span>
      </header>
      <div className="motor-cutaway" aria-label="电机机械结构剖面示意">
        <div className="motor-housing">
          <i className="motor-stator" />
          <i className="motor-rotor" />
          <i className="motor-shaft" />
          <i className="motor-bearing bearing-left" />
          <i className="motor-bearing bearing-right" />
        </div>
        <div className="motor-load-path">
          <span>电磁转矩</span>
          <i>→</i>
          <span>转子</span>
          <i>→</i>
          <span>转轴</span>
          <i>→</i>
          <span>负载</span>
        </div>
      </div>
      <div className="motor-assembly-grid">
        {assemblies.map((item, index) => (
          <article key={item.title}>
            <span>{item.mark}</span>
            <div>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
              <b>{item.check}</b>
            </div>
          </article>
        ))}
      </div>
      <footer>
        <b>设计闭环：</b>
        电磁方案确定气隙力与损耗，机械结构保证强度、精度和寿命，热设计控制材料与配合状态，最终通过模态、超速、温升、振动和耐久试验验证。
      </footer>
    </section>
  );
}

// Keep the first visit clean. Real tasks are loaded from the workspace API.
const initialTasks: Task[] = [];

const initialKnowledge: Knowledge[] = [
  {
    id: 1,
    title: "机械臂末端轨迹规划与速度约束",
    summary:
      "通过五次多项式插值生成平滑轨迹，并对关节速度、加速度与末端误差设置约束。",
    content:
      "轨迹规划的目标是在给定起点、终点和运行时间后，生成位置、速度及加速度连续的运动指令。五次多项式可同时约束两端的位置、速度和加速度。实施时应先在关节空间完成插值，再通过正运动学验证末端路径，并检查各关节是否超过速度与加速度上限。",
    primaryCategory: "机器人",
    secondaryCategory: "运动控制",
    confidence: 94,
    source: "Codex",
    sourceType: "对话",
    createdAt: "今天 09:42",
  },
  {
    id: 2,
    title: "永磁同步电机的矢量控制",
    summary:
      "梳理了坐标变换、电流环和速度环的控制关系，并给出驱动参数整定顺序。",
    content:
      "矢量控制通过 Clarke 与 Park 变换把三相电流映射到旋转坐标系，实现励磁分量和转矩分量解耦。调试通常先完成电流采样与转子角度标定，再整定电流环，最后整定速度环。验证时需要关注电流纹波、转矩响应和高速区电压饱和。",
    primaryCategory: "电气",
    secondaryCategory: "电机与驱动",
    confidence: 96,
    source: "DeepSeek",
    sourceType: "对话",
    createdAt: "今天 08:15",
  },
  {
    id: 3,
    title: "齿轮箱轴承寿命计算方法",
    summary: "依据等效动载荷、工况系数与额定寿命公式，建立轴承选型和校核流程。",
    content:
      "轴承寿命校核从齿轮啮合力和轴系受力分析开始，计算轴承径向与轴向载荷。把多工况载荷折算为等效动载荷后，结合基本额定动载荷计算 L10 寿命。结果还应根据温度、润滑、冲击和可靠度要求进行修正。",
    primaryCategory: "机械",
    secondaryCategory: "传动机构",
    confidence: 95,
    source: "网页",
    sourceType: "网址",
    createdAt: "昨天 18:20",
  },
  {
    id: 4,
    title: "车辆悬架 Simulink 建模记录",
    summary:
      "使用二自由度四分之一车辆模型分析路面输入、车身加速度与轮胎动载荷。",
    content:
      "四分之一车辆模型由簧载质量、非簧载质量、悬架弹簧阻尼和轮胎刚度组成。以路面位移为输入，可以评估车身加速度、悬架动挠度和轮胎动载荷。建模后应使用阶跃、正弦和随机路面分别验证舒适性与操纵稳定性。",
    primaryCategory: "车辆",
    secondaryCategory: "底盘与动力",
    confidence: 93,
    source: "Codex",
    sourceType: "对话",
    createdAt: "昨天 14:02",
  },
  {
    id: 5,
    title: "STM32 CAN 通信故障排查",
    summary: "从时钟、波特率、过滤器与终端电阻四个层面定位总线通信异常。",
    content:
      "排查 CAN 通信应从物理层开始，确认 CANH、CANL 电平和总线两端 120Ω 终端电阻。随后核对外设时钟、采样点与波特率配置，再检查过滤器和收发中断。最后通过错误状态寄存器区分位错误、填充错误、应答错误及总线关闭。",
    primaryCategory: "嵌入式",
    secondaryCategory: "RTOS与通信",
    confidence: 97,
    source: "手动",
    sourceType: "手动输入",
    createdAt: "8月1日",
  },
  {
    id: 6,
    title: "控制系统稳定性分析清单",
    summary: "结合根轨迹、频域裕度和状态空间方法，形成控制器设计前的验证清单。",
    content:
      "稳定性分析需要先确认工作点与线性模型适用范围。经典控制系统可用极点、根轨迹和增益相位裕度判断稳定性与鲁棒性；状态空间模型还应检查特征值、可控性和可观性。控制器上线前需要覆盖参数摄动、时延、饱和与传感噪声测试。",
    primaryCategory: "系统",
    secondaryCategory: "控制理论",
    confidence: 91,
    source: "Codex",
    sourceType: "对话",
    createdAt: "7月31日",
  },
  ...CURATED_MAINSTREAM_KNOWLEDGE.map((item, index) => ({
    ...item,
    id: index + 7,
  })),
];

const initialApplications: JobApplication[] = [
  {
    id: 1,
    company: "某智能制造企业",
    role: "机器人控制工程师",
    status: "面试",
    channel: "BOSS直聘",
    appliedAt: "8月2日",
    nextAction: "准备控制算法项目复盘",
    notes: "重点梳理 Simulink 与运动控制经历",
  },
  {
    id: 2,
    company: "某新能源汽车公司",
    role: "车辆系统工程师",
    status: "已投递",
    channel: "官网",
    appliedAt: "8月1日",
    nextAction: "8月8日前跟进",
    notes: "已使用车辆系统版简历",
  },
];

type GraphPoint3D = { x: number; y: number; z: number };
type SemanticTopic = GraphPoint3D & {
  id: string;
  name: string;
  categories: string[];
  keywords: string[];
  color: string;
};

const graphCategories: Array<
  GraphPoint3D & { name: string; displayName?: string }
> = [
  { name: "机械", x: -0.92, y: -0.38, z: -0.12 },
  { name: "电气", x: -0.35, y: 0.72, z: 0.14 },
  { name: "机器人", x: 0.72, y: 0.43, z: 0.18 },
  { name: "车辆", displayName: "汽车", x: 0.94, y: -0.34, z: -0.08 },
  { name: "系统", x: 0.05, y: -0.82, z: -0.18 },
  { name: "嵌入式", x: -0.72, y: 0.34, z: -0.22 },
  { name: "通用", x: 0.05, y: 0.12, z: -0.72 },
];

const semanticTopics: SemanticTopic[] = [
  {
    id: "motor",
    name: "电机",
    x: 0.25,
    y: 0.18,
    z: 0.58,
    categories: ["电气", "机器人", "车辆"],
    keywords: ["电机", "电驱", "伺服", "驱动", "逆变器"],
    color: "#d6aa70",
  },
  {
    id: "sensor",
    name: "传感器",
    x: -0.12,
    y: 0.44,
    z: 0.48,
    categories: ["机器人", "车辆", "嵌入式"],
    keywords: ["传感器", "雷达", "视觉", "定位", "ADC"],
    color: "#79b7b0",
  },
  {
    id: "control",
    name: "控制算法",
    x: 0.34,
    y: -0.28,
    z: 0.42,
    categories: ["系统", "机器人", "车辆"],
    keywords: ["控制", "算法", "PID", "轨迹", "状态空间"],
    color: "#8ba6d4",
  },
  {
    id: "bus",
    name: "通信总线",
    x: -0.42,
    y: 0.02,
    z: 0.38,
    categories: ["嵌入式", "车辆", "系统"],
    keywords: ["CAN", "通信", "总线", "RTOS", "协议"],
    color: "#8e9fc5",
  },
  {
    id: "mechanism",
    name: "结构传动",
    x: -0.28,
    y: -0.36,
    z: 0.3,
    categories: ["机械", "机器人", "车辆"],
    keywords: ["结构", "齿轮", "轴承", "传动", "机械臂"],
    color: "#c8a86c",
  },
  {
    id: "simulation",
    name: "仿真建模",
    x: 0.02,
    y: -0.52,
    z: 0.3,
    categories: ["系统", "机械", "车辆", "机器人"],
    keywords: ["仿真", "模型", "Simulink", "动力学", "有限元"],
    color: "#87a98c",
  },
];

function projectGraphPoint(
  point: GraphPoint3D,
  rotateX: number,
  rotateY: number,
) {
  const rx = (rotateX * Math.PI) / 180;
  const ry = (rotateY * Math.PI) / 180;
  const x1 = point.x * Math.cos(ry) + point.z * Math.sin(ry);
  const z1 = -point.x * Math.sin(ry) + point.z * Math.cos(ry);
  const y1 = point.y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = point.y * Math.sin(rx) + z1 * Math.cos(rx);
  const perspective = Math.max(0.72, 1 + z2 * 0.22);
  return {
    left: 50 + x1 * 36 * perspective,
    top: 50 + y1 * 38 * perspective,
    depth: z2,
    scale: Math.max(0.72, Math.min(1.3, 1 + z2 * 0.2)),
    zIndex: Math.round(40 + z2 * 20),
  };
}

function distributeGraphCategories(
  points: Array<GraphPoint3D & { name: string; displayName?: string }>,
) {
  const count = Math.max(1, points.length);
  return points.map((point, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
      ...point,
      x: Math.cos(angle) * 0.84,
      y: Math.sin(angle) * 0.77,
      z: ((index % 3) - 1) * 0.12,
    };
  });
}

function distributeGraphTopics<T extends SemanticTopic>(points: T[]): T[] {
  const categories = distributeGraphCategories(graphCategories);
  const categoryByName = new Map(
    categories.map((category) => [category.name, category]),
  );
  const count = Math.max(1, points.length);
  const availableSlots = points.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const radius = index % 2 ? 0.58 : 0.5;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.9,
      z: ((index % 4) - 1.5) * 0.11,
    };
  });
  const ranked = points
    .map((point) => {
      const related = point.categories
        .map((name) => categoryByName.get(name))
        .filter(Boolean) as Array<GraphPoint3D & { name: string }>;
      const centroid = related.reduce(
        (sum, category) => ({ x: sum.x + category.x, y: sum.y + category.y }),
        { x: 0, y: 0 },
      );
      const count = Math.max(1, related.length);
      return {
        point,
        target: {
          x: (centroid.x / count) * 0.68,
          y: (centroid.y / count) * 0.68,
        },
      };
    })
    .sort(
      (a, b) =>
        Math.atan2(a.target.y, a.target.x) - Math.atan2(b.target.y, b.target.x),
    );
  return ranked.map(({ point, target }) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    availableSlots.forEach((slot, index) => {
      const distance = Math.hypot(slot.x - target.x, slot.y - target.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const slot = availableSlots.splice(bestIndex, 1)[0];
    return { ...point, ...slot };
  });
}

const optimizedGraphCategories = distributeGraphCategories(graphCategories);

const themeOptions: {
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

const navGroups: Array<{
  title: string;
  code: string;
  items: Array<{
    label: View;
    display: string;
    icon: string;
    subsection?: string;
    indent?: boolean;
  }>;
}> = [
  {
    title: "工作台",
    code: "HOME",
    items: [{ label: "工作台", display: "主页面", icon: "⌂" }],
  },
  {
    title: "个人任务",
    code: "PERSONAL",
    items: [
      { label: "个人任务", display: "任务", icon: "✓" },
      { label: "每周总结", display: "每周总结", icon: "◷" },
    ],
  },
  {
    title: "学习",
    code: "LEARNING",
    items: [
      { label: "知识库", display: "知识库", icon: "◇" },
      {
        label: "英语学习",
        display: "英语",
        icon: "EN",
        subsection: "语言学习",
        indent: true,
      },
      { label: "日语学习", display: "日语", icon: "日", indent: true },
    ],
  },
  {
    title: "行业",
    code: "INDUSTRY",
    items: [
      { label: "简历投递", display: "招聘与投递", icon: "▣" },
      { label: "行业速览", display: "行业速览", icon: "◫" },
    ],
  },
  {
    title: "股市",
    code: "MARKETS",
    items: [
      { label: "股票", display: "股票研究", icon: "股" },
    ],
  },
  {
    title: "AI 模型",
    code: "AI",
    items: [{ label: "AI 模型", display: "多模型中心", icon: "✦" }],
  },
];

function priorityClass(priority: Priority) {
  return priority === "优先"
    ? "urgent"
    : priority === "一般"
      ? "normal"
      : "low";
}

function providerLabel(provider: string) {
  return (
    (
      {
        openai: "OpenAI",
        deepseek: "DeepSeek",
        anthropic: "Claude",
        gemini: "Gemini",
        custom: "兼容接口",
      } as Record<string, string>
    )[provider] || provider
  );
}

function applicationStatusKey(status: ApplicationStatus) {
  return (
    {
      待投递: "todo",
      已投递: "sent",
      笔试: "test",
      面试: "interview",
      Offer: "offer",
      结束: "closed",
    } as Record<ApplicationStatus, string>
  )[status];
}

function applicationStageIndex(status: ApplicationStatus) {
  return status === "待投递"
    ? 0
    : status === "已投递"
      ? 1
      : status === "笔试"
        ? 2
        : status === "面试"
          ? 3
          : status === "Offer"
            ? 4
            : 5;
}

function formatAIRunTime(value: string) {
  if (!value) return "尚未执行";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

async function extractDocumentText(file: File, maxPages = 60) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  let content = "";
  if (["txt", "md", "markdown", "csv"].includes(extension)) {
    content = await file.text();
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    content = result.value;
  } else if (extension === "pdf") {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const document = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: string[] = [];
    for (
      let pageNumber = 1;
      pageNumber <= Math.min(document.numPages, maxPages);
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pages.push(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    content = pages.join("\n");
  } else {
    throw new Error("目前支持 PDF、DOCX、TXT、Markdown 和 CSV 文档");
  }
  return content
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 120000);
}

function buildKnowledgeDigest(item: Knowledge) {
  const digest = { ...enrichKnowledge(item), ...(item.enrichment || {}) };
  if (
    !/电机|PMSM|FOC|矢量控制/i.test(
      `${item.title} ${item.summary} ${item.secondaryCategory}`,
    )
  )
    return digest;
  const existingTitles = new Set(
    digest.theorySections.map((section) => section.title),
  );
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
      ...motorMechanicalTheory.filter(
        (section) => !existingTitles.has(section.title),
      ),
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

function getKnowledgeSphereLabel(item: Knowledge) {
  const text = `${item.title} ${item.secondaryCategory}`;
  const knownLabels: Array<[RegExp, string]> = [
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
  return (
    knownLabels.find(([pattern]) => pattern.test(text))?.[1] ||
    item.secondaryCategory ||
    item.title.split(/[：:]/, 1)[0].trim()
  );
}

type TextbookExercise = {
  kind: "概念题" | "分析题" | "计算题" | "设计题" | "实验题";
  question: string;
  guidance: string;
};

function buildTextbookFrame(item: Knowledge, digest: KnowledgeEnrichment) {
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
  const chapterNumber = String(
    Math.max(1, chapterOrder.indexOf(item.primaryCategory) + 1),
  ).padStart(2, "0");
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
      guidance:
        "先给出严格定义，再沿输入—状态—输出的因果链解释；不要只复述结论。",
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
      guidance:
        "列出仪器或软件、变量控制、采样方法、评价指标、误差来源和通过准则。",
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

export default function Home() {
  const [view, setView] = useState<View>("工作台");
  const [theme, setTheme] = useState<Theme>("ivory");
  const [themeReady, setThemeReady] = useState(false);
  const [themeMenu, setThemeMenu] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>("今日");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [knowledge, setKnowledge] = useState<Knowledge[]>(initialKnowledge);
  const [query, setQuery] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [captureModal, setCaptureModal] = useState(false);
  const [documentModal, setDocumentModal] = useState(false);
  const [documentParsing, setDocumentParsing] = useState(false);
  const [documentDraft, setDocumentDraft] = useState("");
  const [documentFileName, setDocumentFileName] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [activeLanguageRoute, setActiveLanguageRoute] = useState<Record<LearningLanguage, number>>({
    英语学习: 0,
    日语学习: 0,
  });
  const [translationDraft, setTranslationDraft] = useState("");
  const [writingDraft, setWritingDraft] = useState("");
  const [translationRevealed, setTranslationRevealed] = useState(false);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProjectRecord[]>([]);
  const [quickNotes, setQuickNotes] = useState<WorkspaceQuickNote[]>([]);
  const [workspaceReminders, setWorkspaceReminders] = useState<WorkspaceReminder[]>([]);
  const [projectModal, setProjectModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkspaceProjectRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "用户名",
    motto: "专注 · 自洽 · 成长",
    avatarText: "用",
    accent: "gold",
  });
  const [profileModal, setProfileModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [graphViewport, setGraphViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [graphPanning, setGraphPanning] = useState(false);
  const [graphFocus, setGraphFocus] = useState<string | null>(null);
  const graphGesture = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
  const [applications, setApplications] =
    useState<JobApplication[]>(initialApplications);
  const [applicationModal, setApplicationModal] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<JobApplication | null>(null);
  const [applicationFilter, setApplicationFilter] = useState<
    "全部" | "进行中" | "已结束"
  >("全部");
  const [applicationQuery, setApplicationQuery] = useState("");
  const [careerMode, setCareerMode] = useState<"discover" | "pipeline">(
    "discover",
  );
  const [jobMarket, setJobMarket] = useState<JobPayload | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsLoadingMore, setJobsLoadingMore] = useState(false);
  const [jobIndustry, setJobIndustry] = useState("全部");
  const [jobFunction, setJobFunction] = useState("全部");
  const [jobNature, setJobNature] = useState("全部");
  const [jobCity, setJobCity] = useState("全部城市");
  const [jobQuery, setJobQuery] = useState("");
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [resumeModal, setResumeModal] = useState(false);
  const [resumeDraft, setResumeDraft] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeParsing, setResumeParsing] = useState(false);
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [industry, setIndustry] = useState("汽车");
  const [industryLens, setIndustryLens] = useState<
    "全部" | "行业趋势" | "企业动态"
  >("全部");
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiConnectionModal, setAiConnectionModal] = useState(false);
  const [aiScheduleModal, setAiScheduleModal] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<AIConnection | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<AISchedule | null>(
    null,
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiConnectionId, setAiConnectionId] = useState(0);
  const [aiUseWeb, setAiUseWeb] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const taskSyncQueue = useRef(new Map<number, Promise<void>>());
  const dailyResetDay = useRef(shanghaiDateKey());

  useEffect(() => {
    const today = shanghaiDateKey();
    const lastOpenDay = localStorage.getItem("atlas-task-reset-day");
    localStorage.setItem("atlas-task-reset-day", today);
    dailyResetDay.current = today;
    if (lastOpenDay && lastOpenDay !== today) {
      setTasks((items) =>
        items.map((task) =>
          task.horizon === "今日" && task.done
            ? { ...task, done: false, completedAt: "", completedOn: "" }
            : task,
        ),
      );
    }
    const timer = window.setInterval(() => {
      const currentDay = shanghaiDateKey();
      if (currentDay === dailyResetDay.current) return;
      dailyResetDay.current = currentDay;
      localStorage.setItem("atlas-task-reset-day", currentDay);
      setTasks((items) => {
        const dailyDone = items.filter(
          (task) => task.horizon === "今日" && task.done,
        );
        dailyDone.forEach((task) => {
          fetch("/api/workspace", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "task",
              action: "reset-daily",
              id: task.id,
            }),
          }).catch(() => undefined);
        });
        return items.map((task) =>
          task.horizon === "今日" && task.done
            ? { ...task, done: false, completedAt: "", completedOn: "" }
            : task,
        );
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("atlas-theme", theme);
  }, [theme, themeReady]);

  useEffect(() => {
    const saved = localStorage.getItem("atlas-theme");
    const migrated = localStorage.getItem("atlas-theme-default-v3");
    if (!migrated) {
      setTheme("ivory");
      localStorage.setItem("atlas-theme", "ivory");
      localStorage.setItem("atlas-theme-default-v3", "white");
    } else if (saved === "light") setTheme("ivory");
    else if (saved === "dark") setTheme("obsidian");
    else if (themeOptions.some((option) => option.id === saved))
      setTheme(saved as Theme);
    setThemeReady(true);
    fetch("/api/workspace")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        // An empty API response is meaningful: it should clear the empty
        // initial state rather than leave any demo tasks on screen.
        if (Array.isArray(data.tasks))
          setTasks(normalizeDailyTasks(data.tasks));
        if (Array.isArray(data.knowledge)) {
          const serverKnowledge = data.knowledge as Knowledge[];
          const savedTitles = new Set(
            serverKnowledge.map((item) => item.title.trim().toLowerCase()),
          );
          const bundledKnowledge = initialKnowledge.filter(
            (item) => !savedTitles.has(item.title.trim().toLowerCase()),
          );
          const firstBundledId =
            Math.max(
              0,
              ...serverKnowledge.map((item) => Number(item.id) || 0),
            ) + 1;
          setKnowledge([
            ...serverKnowledge,
            ...bundledKnowledge.map((item, index) => ({
              ...item,
              id: firstBundledId + index,
            })),
          ]);
        }
        if (Array.isArray(data.applications))
          setApplications(data.applications);
        if (Array.isArray(data.projects))
          setWorkspaceProjects(data.projects);
        if (Array.isArray(data.quickNotes))
          setQuickNotes(data.quickNotes);
        if (Array.isArray(data.reminders))
          setWorkspaceReminders(data.reminders);
        if (data.profile)
          setProfile({
            ...data.profile,
            avatarText: getAvatarInitial(data.profile.displayName),
          });
        if (data.resume?.content) {
          setResume(data.resume);
          setResumeDraft(data.resume.content);
          setResumeFileName(data.resume.fileName || "个人简历");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (view !== "简历投递" || jobMarket) return;
    fetch("/api/jobs")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: JobPayload) => setJobMarket(data))
      .catch(() => undefined)
      .finally(() => setJobsLoading(false));
  }, [view, jobMarket]);

  useEffect(() => {
    if (view !== "股票" || market)
      return;
    fetch("/api/market")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: MarketPayload) => setMarket(data))
      .catch(() => undefined)
      .finally(() => setMarketLoading(false));
  }, [view, market]);

  useEffect(() => {
    if (view !== "AI 模型" || aiData) return;
    fetch("/api/ai")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: AIData) => {
        setAiData(data);
        const active =
          data.connections.find((item) => item.isActive) || data.connections[0];
        if (active) setAiConnectionId(active.id);
      })
      .catch(() => undefined)
      .finally(() => setAiLoading(false));
  }, [view, aiData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => {
        setToast("");
        setUndoTask(null);
      },
      undoTask ? 6000 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, [toast, undoTask]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.horizon === horizon && !task.done),
    [tasks, horizon],
  );
  const activeAIConnection = useMemo(
    () =>
      aiData?.connections.find((item) => item.id === aiConnectionId) ||
      aiData?.connections.find((item) => item.isActive) ||
      aiData?.connections[0] ||
      null,
    [aiData, aiConnectionId],
  );
  const completedHistory = useMemo(
    () =>
      tasks
        .flatMap((task) =>
          (task.completionHistory || []).map((entry, index) => ({
            ...entry,
            taskId: task.id,
            title: task.title,
            detail: task.detail,
            horizon: task.horizon,
            historyIndex: index,
          })),
        )
        .sort(
          (a, b) =>
            b.completedOn.localeCompare(a.completedOn) ||
            b.completedAt.localeCompare(a.completedAt),
        ),
    [tasks],
  );
  const visibleKnowledge = useMemo(() => {
    const value = query.trim().toLowerCase();
    return knowledge.filter((item) => {
      const categoryMatch =
        activeCategory === "全部" || item.primaryCategory === activeCategory;
      const queryMatch =
        !value ||
        `${item.title}${item.summary}${item.primaryCategory}${item.secondaryCategory}${item.source}`
          .toLowerCase()
          .includes(value);
      return categoryMatch && queryMatch;
    });
  }, [knowledge, query, activeCategory]);
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        KNOWLEDGE_TAXONOMY.map((category) => [
          category.name,
          knowledge.filter((item) => item.primaryCategory === category.name)
            .length,
        ]),
      ),
    [knowledge],
  );
  const secondaryGroups = useMemo(() => {
    const selected =
      activeCategory === "全部"
        ? knowledge
        : knowledge.filter((item) => item.primaryCategory === activeCategory);
    return Object.entries(
      selected.reduce<Record<string, number>>((groups, item) => {
        groups[item.secondaryCategory] =
          (groups[item.secondaryCategory] || 0) + 1;
        return groups;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
  }, [knowledge, activeCategory]);
  const semanticGraph = useMemo(() => {
    const discoveredNames = [
      ...new Set(knowledge.flatMap((item) => item.relatedTopics || [])),
    ]
      .filter((name) => !semanticTopics.some((topic) => topic.name === name))
      .slice(0, 10);
    const discoveredTopics: SemanticTopic[] = discoveredNames.map(
      (name, index) => {
        const relatedItems = knowledge.filter((item) =>
          item.relatedTopics?.includes(name),
        );
        const categories = [
          ...new Set(relatedItems.map((item) => item.primaryCategory)),
        ].slice(0, 4);
        const meta = KNOWLEDGE_TAXONOMY.find(
          (item) => item.name === categories[0],
        );
        const angle = index * 2.399 + 0.55;
        const radius = 0.48 + (index % 3) * 0.08;
        return {
          id: `auto-${encodeURIComponent(name)}`,
          name,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0.12 + (index % 4) * 0.12,
          categories: categories.length ? categories : ["通用"],
          keywords: [
            name,
            ...relatedItems.flatMap((item) => item.keywords || []).slice(0, 5),
          ],
          color: meta?.color || "#c6a76d",
        };
      },
    );
    const topicSeeds = [...semanticTopics, ...discoveredTopics].map(
      (topic) => ({
        ...topic,
        items: knowledge.filter(
          (item) =>
            item.relatedTopics?.includes(topic.name) ||
            topic.keywords.some((keyword) =>
              `${item.title}${item.summary}${item.content || ""}${item.secondaryCategory}`
                .toLowerCase()
                .includes(keyword.toLowerCase()),
            ),
        ),
      }),
    );
    const topics = distributeGraphTopics(topicSeeds);
    const graphKnowledge = [...knowledge]
      .sort(
        (a, b) =>
          a.primaryCategory.localeCompare(b.primaryCategory, "zh-CN") ||
          a.secondaryCategory.localeCompare(b.secondaryCategory, "zh-CN") ||
          a.id - b.id,
      )
      .slice(0, 30);
    const articleSlots = graphKnowledge.map((_, index) => {
      const angle =
        -Math.PI / 2 +
        (index * Math.PI * 2) / Math.max(1, graphKnowledge.length);
      const band = index % 3;
      const radius = 0.24 + band * 0.055;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.88,
        z: ((index % 5) - 2) * 0.075,
      };
    });
    const articles = graphKnowledge.map((item, index) => {
      const matched =
        topics.find((topic) => item.relatedTopics?.includes(topic.name)) ||
        topics.find((topic) =>
          topic.items.some((entry) => entry.id === item.id),
        );
      const category =
        optimizedGraphCategories.find(
          (entry) => entry.name === item.primaryCategory,
        ) || optimizedGraphCategories[index % optimizedGraphCategories.length];
      const anchor = matched || category;
      const anchorId = matched?.id || category.name;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      articleSlots.forEach((slot, slotIndex) => {
        const distance = Math.hypot(slot.x - anchor.x, slot.y - anchor.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = slotIndex;
        }
      });
      const slot = articleSlots.splice(bestIndex, 1)[0];
      return { item, anchorId, ...slot };
    });
    const visibleIds = new Set(articles.map((article) => article.item.id));
    const seenRelations = new Set<string>();
    const relationEdges = articles.flatMap(({ item }) => {
      const relatedIds = [
        ...new Set([
          ...(item.relatedIds || []),
          ...rankKnowledgeRelations(item, knowledge, 3).map(
            (relation) => relation.id,
          ),
        ]),
      ];
      return relatedIds
        .filter((id) => visibleIds.has(id))
        .slice(0, 3)
        .flatMap((id) => {
          const key = [item.id, id].sort((a, b) => a - b).join("-");
          if (seenRelations.has(key)) return [];
          seenRelations.add(key);
          return [{ fromId: item.id, toId: id }];
        });
    });
    const topicEdges = topics
      .flatMap((topic, topicIndex) =>
        topics.slice(topicIndex + 1).flatMap((candidate) => {
          const sharedCategories = topic.categories.filter((category) =>
            candidate.categories.includes(category),
          );
          const sharedItems = topic.items.filter((item) =>
            candidate.items.some(
              (candidateItem) => candidateItem.id === item.id,
            ),
          );
          return sharedCategories.length >= 2 || sharedItems.length
            ? [{ fromId: topic.id, toId: candidate.id }]
            : [];
        }),
      )
      .slice(0, 14);
    return { topics, articles, relationEdges, topicEdges };
  }, [knowledge]);
  const activeCompleted = tasks.filter((task) => task.done).length;
  const completed = completedHistory.length;
  const todayTotal = tasks.filter((task) => task.horizon === "今日").length;
  const todayDone = tasks.filter(
    (task) => task.horizon === "今日" && task.done,
  ).length;
  const selectedDigest = selectedKnowledge
    ? buildKnowledgeDigest(selectedKnowledge)
    : null;
  const selectedTextbook =
    selectedKnowledge && selectedDigest
      ? buildTextbookFrame(selectedKnowledge, selectedDigest)
      : null;
  const knowledgeVisualProfile = selectedKnowledge
    ? getKnowledgeVisualProfile(
        selectedKnowledge.title,
        `${selectedKnowledge.primaryCategory} ${selectedKnowledge.secondaryCategory}`,
      )
    : null;
  const documentPreview = useMemo(() => {
    if (!documentDraft.trim()) return null;
    const title =
      documentTitle.trim() ||
      documentFileName.replace(/\.[^.]+$/, "") ||
      "未命名文档";
    return analyzeKnowledgeContent({
      title,
      content: documentDraft,
      sourceType: "文档",
    });
  }, [documentDraft, documentFileName, documentTitle]);
  const currentLanguage: LearningLanguage =
    view === "日语学习" ? "日语学习" : "英语学习";
  const dailyLanguage = useMemo(
    () => getDailyLanguageLesson(currentLanguage),
    [currentLanguage],
  );
  useEffect(() => {
    if (currentLanguage !== "英语学习") return;
    setTranslationDraft(localStorage.getItem(`atlas-translation-${dailyLanguage.dateKey}`) || "");
    setWritingDraft(localStorage.getItem(`atlas-writing-${dailyLanguage.dateKey}`) || "");
    setTranslationRevealed(false);
  }, [currentLanguage, dailyLanguage.dateKey]);
  const languageExam =
    currentLanguage === "英语学习"
      ? {
          target: "CET-6 + 日常英语",
          stage: "六级备考 · 日常会话",
          description:
            "围绕 CET-6 核心能力训练，同时补充真实生活场景中的听说对话。",
          routes: [
            { label: "CET-6 核心词汇", target: "language-vocabulary" },
            { label: "日常对话听力", target: "language-conversation" },
            { label: "阅读与翻译", target: "language-reading" },
            { label: "写作输出", target: "language-writing" },
          ],
        }
      : {
          target: "JLPT N5 入门",
          stage: "零基础 · 从五十音开始",
          description:
            "先建立假名、发音和基本句型，再进入 N5 词汇、语法、听力与日常会话。",
          routes: [
            { label: "五十音与发音", target: "language-vocabulary" },
            { label: "假名基础词汇", target: "language-vocabulary" },
            { label: "基础助词句型", target: "language-conversation" },
            { label: "日常听力会话", target: "language-output" },
          ],
        };
  const writingWordCount = writingDraft.trim()
    ? writingDraft.trim().split(/\s+/).length
    : 0;
  const applicationProgress = applications.filter((item) =>
    ["笔试", "面试", "Offer"].includes(item.status),
  ).length;
  const visibleApplications = useMemo(() => {
    const queryValue = applicationQuery.trim().toLowerCase();
    return applications
      .filter(
        (item) =>
          applicationFilter === "全部" ||
          (applicationFilter === "已结束"
            ? ["Offer", "结束"].includes(item.status)
            : !["Offer", "结束"].includes(item.status)),
      )
      .filter(
        (item) =>
          !queryValue ||
          `${item.company} ${item.role} ${item.channel} ${item.nextAction} ${item.notes}`
            .toLowerCase()
            .includes(queryValue),
      )
      .sort(
        (a, b) =>
          applicationStageIndex(b.status) - applicationStageIndex(a.status) ||
          b.id - a.id,
      );
  }, [applications, applicationFilter, applicationQuery]);
  const visibleNews =
    market?.news.filter(
      (item) =>
        item.industry === industry &&
        item.verification === "verified" &&
        (industryLens === "全部" ||
          (industryLens === "企业动态"
            ? item.topic === "company"
            : item.topic !== "company")),
    ) || [];
  const resumeSkills = useMemo(
    () =>
      resume
        ? resumeSkillDictionary
            .filter((skill) => includesSkill(resume.content, skill))
            .slice(0, 8)
        : [],
    [resume],
  );
  const availableJobCities = useMemo(() => {
    const cities = new Set((jobMarket?.jobs || []).flatMap((job) => job.locations));
    cities.delete("全国");
    return [
      "全部城市",
      ...Array.from(cities).sort((a, b) => a.localeCompare(b, "zh-CN")),
      ...(jobMarket?.jobs.some((job) => job.locations.includes("全国")) ? ["全国"] : []),
    ];
  }, [jobMarket]);
  const rankedJobs = useMemo<RankedJob[]>(() => {
    return (jobMarket?.jobs || [])
      .map((job) => rankJobByResume(job, resume))
      .sort(
        (a, b) =>
          b.resumeScore - a.resumeScore ||
          b.matchScore - a.matchScore ||
          a.company.localeCompare(b.company, "zh-CN"),
      );
  }, [
    jobMarket,
    resume,
  ]);
  const visibleJobs = useMemo<RankedJob[]>(() => {
    const value = jobQuery.trim().toLowerCase();
    return rankedJobs.filter((job) =>
      (jobIndustry === "全部" || job.industry === jobIndustry) &&
      (jobFunction === "全部" || job.function === jobFunction || job.tags.some((tag) => tag.includes(jobFunction))) &&
      (jobNature === "全部" || job.employmentType === jobNature) &&
      (jobCity === "全部城市" || job.locations.includes(jobCity) || (jobCity !== "全国" && job.locations.includes("全国"))) &&
      (!value || `${job.company}${job.role}${job.locations.join("")}${job.tags.join("")}${job.summary}`.toLowerCase().includes(value)),
    );
  }, [rankedJobs, jobIndustry, jobFunction, jobNature, jobCity, jobQuery]);

  function speakLanguage(text: string) {
    if (!("speechSynthesis" in window)) {
      setToast("当前浏览器暂不支持语音朗读");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage === "英语学习" ? "en-US" : "ja-JP";
    utterance.rate = currentLanguage === "英语学习" ? 0.86 : 0.78;
    window.speechSynthesis.speak(utterance);
  }

  function openLanguageRoute(index: number, target: string) {
    setActiveLanguageRoute((routes) => ({ ...routes, [currentLanguage]: index }));
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function saveLanguageDraft(kind: "translation" | "writing", content: string) {
    const value = content.trim();
    if (!value) {
      setToast(kind === "translation" ? "请先填写翻译内容" : "请先填写写作内容");
      return;
    }
    localStorage.setItem(`atlas-${kind}-${dailyLanguage.dateKey}`, value);
    setToast(kind === "translation" ? "今日翻译练习已保存" : "今日写作练习已保存");
  }

  function openNewTask(nextHorizon?: Horizon) {
    if (nextHorizon) setHorizon(nextHorizon);
    setEditingTask(null);
    setTaskModal(true);
  }

  function openTaskEditor(task: Task) {
    setEditingTask(task);
    setTaskModal(true);
  }

  function persistTaskState(next: Task) {
    const previous = taskSyncQueue.current.get(next.id) || Promise.resolve();
    const request = previous
      .catch(() => undefined)
      .then(() =>
        fetch("/api/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "task", action: "toggle", ...next }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then(
            ({ item }) =>
              item &&
              setTasks((items) =>
                items.map((entry) => (entry.id === next.id ? item : entry)),
              ),
          )
          .catch(() => {
            setToast("同步失败，任务状态已保留在当前页面");
          }),
      );
    taskSyncQueue.current.set(next.id, request);
  }

  function toggleTask(task: Task) {
    const done = !task.done;
    const completedAt = done ? shanghaiDisplayTime() : "";
    const completedOn = done ? shanghaiDateKey() : "";
    const nextHistory = done
      ? [
          ...(task.completionHistory || []),
          { id: `${Date.now()}-${task.id}`, completedAt, completedOn },
        ]
      : (task.completionHistory || []).slice(0, -1);
    const next = {
      ...task,
      done,
      completedAt,
      completedOn,
      completionHistory: nextHistory,
    };
    setTasks((items) =>
      items.map((item) => (item.id === task.id ? next : item)),
    );
    setUndoTask(done ? next : null);
    setToast(done ? "任务已移入完成历史" : "任务已恢复到当前列表");
    persistTaskState(next);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: Task = {
      id: editingTask?.id ?? Date.now(),
      title: String(form.get("title")),
      detail: String(form.get("detail") || "个人任务"),
      priority: String(form.get("priority")) as Priority,
      horizon: String(form.get("horizon")) as Horizon,
      done: editingTask?.done ?? false,
      date: String(form.get("date") || "待安排"),
      completedAt: editingTask?.completedAt || "",
      completedOn: editingTask?.completedOn || "",
      completionHistory: editingTask?.completionHistory || [],
      projectId: Number(form.get("projectId")) || null,
    };
    if (editingTask)
      setTasks((items) =>
        items.map((item) => (item.id === draft.id ? draft : item)),
      );
    else setTasks((items) => [draft, ...items]);
    setTaskModal(false);
    setToast(editingTask ? "任务修改已保存" : "新任务已加入工作台");
    const method = editingTask ? "PATCH" : "POST";
    fetch("/api/workspace", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "task",
        action: editingTask ? "edit" : "create",
        ...draft,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(
        ({ item }) =>
          item &&
          setTasks((items) =>
            items.map((task) => (task.id === draft.id ? item : task)),
          ),
      )
      .catch(() => undefined);
    setEditingTask(null);
  }

  async function saveWorkspaceProject(
    values: Omit<WorkspaceProjectRecord, "id">,
  ) {
    const current = editingProject;
    try {
      const response = await fetch("/api/workspace", {
        method: current ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "project", id: current?.id, ...values }),
      });
      if (!response.ok) throw new Error("project save failed");
      const { item } = await response.json();
      setWorkspaceProjects((projects) =>
        current
          ? projects.map((project) =>
              project.id === current.id ? { ...project, ...item } : project,
            )
          : [item, ...projects],
      );
      setProjectModal(false);
      setEditingProject(null);
      setToast(current ? "项目已更新" : "项目已创建");
    } catch {
      setToast("项目保存失败，请稍后重试");
    }
  }

  async function saveQuickNote(content: string) {
    const normalized = content.trim();
    if (!normalized) return;
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quick-note", content: normalized }),
      });
      if (!response.ok) throw new Error("note save failed");
      const { item } = await response.json();
      setQuickNotes((notes) => [item, ...notes]);
      setNoteModal(false);
      setToast("笔记已保存到速记箱");
    } catch {
      setToast("笔记保存失败，请稍后重试");
    }
  }

  async function updateQuickNote(
    note: WorkspaceQuickNote,
    status: WorkspaceQuickNote["status"],
  ) {
    const next = { ...note, status };
    setQuickNotes((notes) =>
      notes.map((item) => (item.id === note.id ? next : item)),
    );
    try {
      const response = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quick-note", ...next }),
      });
      if (!response.ok) throw new Error("note update failed");
      setToast(status === "已归档" ? "笔记已归档" : "笔记已整理");
    } catch {
      setQuickNotes((notes) =>
        notes.map((item) => (item.id === note.id ? note : item)),
      );
      setToast("笔记更新失败");
    }
  }

  async function addKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sourceType = String(form.get("sourceType"));
    const content = String(form.get("content"));
    const source = String(form.get("source"));
    const submittedTitle = String(form.get("title")) || "新收录内容";
    const intelligence = analyzeKnowledgeContent({
      title: submittedTitle,
      content,
      sourceType,
    });
    const enrichment = enrichKnowledge({ ...intelligence, content });
    const draft: Knowledge = {
      id: Date.now(),
      ...intelligence,
      enrichment,
      completeness: enrichment.completeness,
      content,
      source,
      sourceType,
      createdAt: "刚刚",
      relatedIds: [],
    };
    draft.relatedIds = rankKnowledgeRelations(draft, knowledge).map(
      (relation) => relation.id,
    );
    setKnowledge((items) => [draft, ...items]);
    setCaptureModal(false);
    setView("知识库");
    setActiveCategory(intelligence.primaryCategory);
    setToast("正在识别内容、生成总结并建立知识关联…");
    fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "knowledge", ...draft, content }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ item }) => {
        setKnowledge((items) =>
          items.map((entry) => (entry.id === draft.id ? item : entry)),
        );
        setToast(
          `已自动总结并归入「${item.primaryCategory} › ${item.secondaryCategory}」，建立 ${item.relatedIds?.length || 0} 条关联`,
        );
      })
      .catch(() => undefined);
  }

  async function handleKnowledgeDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setToast("文档不能超过 12 MB");
      event.target.value = "";
      return;
    }
    setDocumentParsing(true);
    try {
      const content = await extractDocumentText(file);
      if (content.length < 40)
        throw new Error("没有读取到足够文字；扫描版 PDF 请先进行 OCR 识别");
      setDocumentDraft(content);
      setDocumentFileName(file.name);
      setDocumentTitle(file.name.replace(/\.[^.]+$/, ""));
      setToast(`已读取 ${file.name}，请确认摘要后加入知识库`);
    } catch (error) {
      setDocumentDraft("");
      setDocumentFileName("");
      setToast(error instanceof Error ? error.message : "文档读取失败");
    } finally {
      setDocumentParsing(false);
      event.target.value = "";
    }
  }

  async function addKnowledgeDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentPreview || documentDraft.length < 40) {
      setToast("请先选择并读取文档");
      return;
    }
    const enrichment = enrichKnowledge({
      title: documentPreview.title,
      summary: documentPreview.summary,
      content: documentDraft,
      primaryCategory: documentPreview.primaryCategory,
      secondaryCategory: documentPreview.secondaryCategory,
    });
    const draft: Knowledge = {
      id: Date.now(),
      title: documentPreview.title,
      summary: documentPreview.summary,
      primaryCategory: documentPreview.primaryCategory,
      secondaryCategory: documentPreview.secondaryCategory,
      confidence: documentPreview.confidence,
      enrichment,
      completeness: enrichment.completeness,
      keywords: documentPreview.keywords,
      relatedTopics: documentPreview.relatedTopics,
      relatedIds: [],
      content: documentDraft,
      source: documentFileName,
      sourceType: "文档",
      createdAt: "刚刚",
    };
    draft.relatedIds = rankKnowledgeRelations(draft, knowledge).map(
      (relation) => relation.id,
    );
    setKnowledge((items) => [draft, ...items]);
    setDocumentModal(false);
    setView("知识库");
    setActiveCategory(draft.primaryCategory);
    setDocumentDraft("");
    setDocumentFileName("");
    setDocumentTitle("");
    setToast("文档已读取，正在生成专业总结并写入知识库…");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "knowledge", ...draft }),
      });
      if (!response.ok) throw new Error("文档保存失败");
      const { item } = (await response.json()) as { item: Knowledge };
      setKnowledge((items) =>
        items.map((entry) => (entry.id === draft.id ? item : entry)),
      );
      setToast(
        `文档已自动总结、分类，并建立 ${item.relatedIds?.length || 0} 条知识关联`,
      );
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "文档保存失败，请稍后重试",
      );
    }
  }

  async function addApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft: JobApplication = {
      id: editingApplication?.id || Date.now(),
      company: String(form.get("company")),
      role: String(form.get("role")),
      status: String(form.get("status")) as ApplicationStatus,
      channel: String(form.get("channel") || "手动记录"),
      appliedAt: String(form.get("appliedAt") || "今天"),
      nextAction: String(form.get("nextAction") || "等待反馈"),
      notes: String(form.get("notes") || ""),
    };
    const editing = Boolean(editingApplication);
    setApplications((items) =>
      editing
        ? items.map((item) => (item.id === draft.id ? draft : item))
        : [draft, ...items],
    );
    setApplicationModal(false);
    setEditingApplication(null);
    setToast(editing ? "投递记录已更新" : "投递记录已保存");
    fetch("/api/workspace", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "application", ...draft }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(
        ({ item }) =>
          item &&
          setApplications((items) =>
            items.map((entry) => (entry.id === draft.id ? item : entry)),
          ),
      )
      .catch(() => undefined);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName =
      String(form.get("displayName") || "用户名")
        .trim()
        .slice(0, 24) || "用户名";
    const next: UserProfile = {
      displayName,
      motto: String(form.get("motto") || "")
        .trim()
        .slice(0, 60),
      avatarText: getAvatarInitial(displayName),
      accent: String(form.get("accent") || "gold") as UserProfile["accent"],
    };
    setProfile(next);
    setProfileModal(false);
    setToast("个人资料已更新");
    fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profile", ...next }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ item }) => item && setProfile(item))
      .catch(() => setToast("个人资料暂未同步，请稍后重试"));
  }

  async function requestAI(payload: Record<string, unknown>) {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      error?: string;
      id?: number;
      run?: { result?: string };
    };
    if (!response.ok) throw new Error(data.error || "AI 模型服务请求失败");
    return data;
  }

  async function reloadAI() {
    const response = await fetch("/api/ai");
    if (!response.ok) throw new Error("AI 模型数据加载失败");
    const data = (await response.json()) as AIData;
    setAiData(data);
    const active =
      data.connections.find((item) => item.isActive) || data.connections[0];
    if (active && !data.connections.some((item) => item.id === aiConnectionId))
      setAiConnectionId(active.id);
    return data;
  }

  async function saveAIConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const saved = await requestAI({
        action: "save-connection",
        id: editingConnection?.id || 0,
        name: String(form.get("name") || ""),
        provider: String(form.get("provider") || "openai"),
        model: String(form.get("model") || ""),
        baseUrl: String(form.get("baseUrl") || ""),
        apiKey: String(form.get("apiKey") || ""),
      });
      if (!editingConnection && saved.id)
        await requestAI({ action: "set-active", id: saved.id });
      const data = await reloadAI();
      const selected =
        data.connections.find(
          (item) => item.id === (saved.id || editingConnection?.id),
        ) ||
        data.connections.find((item) => item.isActive) ||
        data.connections[0];
      if (selected) setAiConnectionId(selected.id);
      setAiConnectionModal(false);
      setEditingConnection(null);
      setToast("账户与模型已安全保存并切换");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function saveAISchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await requestAI({
        action: "save-schedule",
        id: editingSchedule?.id || 0,
        title: String(form.get("title") || ""),
        connectionId: Number(form.get("connectionId")),
        prompt: String(form.get("prompt") || ""),
        cadence: String(form.get("cadence") || "daily"),
        timeOfDay: String(form.get("timeOfDay") || "08:00"),
        weekdays: String(form.get("weekdays") || "1,2,3,4,5"),
        useWeb: form.get("useWeb") === "on",
        enabled: true,
      });
      await reloadAI();
      setAiScheduleModal(false);
      setEditingSchedule(null);
      setToast("定时查询已启用");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function runAIQuery() {
    if (!aiConnectionId || !aiPrompt.trim()) {
      setToast("请选择模型并输入查询内容");
      return;
    }
    setAiRunning(true);
    setAiResult("");
    try {
      const data = await requestAI({
        action: "query",
        connectionId: aiConnectionId,
        prompt: aiPrompt,
        useWeb: aiUseWeb,
      });
      setAiResult(data.run?.result || "查询完成");
      await reloadAI();
    } catch (error) {
      setAiResult(
        error instanceof Error ? `查询失败：${error.message}` : "查询失败",
      );
    } finally {
      setAiRunning(false);
    }
  }

  async function switchAIConnection(id: number) {
    if (id === -1) {
      setEditingConnection(null);
      setAiConnectionModal(true);
      return;
    }
    if (!id || id === aiConnectionId) return;
    setAiConnectionId(id);
    try {
      await requestAI({ action: "set-active", id });
      await reloadAI();
      setToast("GPT 账户与模型已切换");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "账户切换失败");
    }
  }

  async function aiAction(payload: Record<string, unknown>, success: string) {
    try {
      await requestAI(payload);
      await reloadAI();
      setToast(success);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleResumeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setToast("简历文件不能超过 12 MB");
      event.target.value = "";
      return;
    }
    setResumeParsing(true);
    try {
      const cleaned = (await extractDocumentText(file, 50)).slice(0, 100000);
      if (cleaned.length < 30)
        throw new Error("没有从文件中读取到足够文字，可在下方直接粘贴简历内容");
      setResumeDraft(cleaned);
      setResumeFileName(file.name);
      setToast(`已读取 ${file.name}，请确认后保存`);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "简历解析失败，请粘贴文字内容",
      );
    } finally {
      setResumeParsing(false);
      event.target.value = "";
    }
  }

  async function saveResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = resumeDraft.trim();
    if (content.length < 50) {
      setToast("请至少填写 50 个字的简历内容，以便完成岗位匹配");
      return;
    }
    setResumeParsing(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "resume",
          fileName: resumeFileName || "个人简历",
          content,
        }),
      });
      if (!response.ok) throw new Error("简历保存失败");
      const data = (await response.json()) as { item: ResumeProfile };
      setResume(data.item);
      setResumeDraft(data.item.content);
      setResumeFileName(data.item.fileName);
      setResumeModal(false);
      setToast("简历已保存，岗位已按匹配度从高到低排序");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "简历保存失败");
    } finally {
      setResumeParsing(false);
    }
  }

  function handleTrackOpening(job: JobOpening) {
    const duplicate = applications.some(
      (item) =>
        item.company === job.company &&
        item.role === job.role &&
        item.status !== "结束",
    );
    if (duplicate) {
      setToast("该岗位已在投递追踪中");
      return;
    }
    const draft: JobApplication = {
      id: Math.max(0, ...applications.map((item) => item.id)) + 1,
      company: job.company,
      role: job.role,
      status: "待投递",
      channel: job.source,
      appliedAt: "待投递",
      nextAction: "打开官方链接并确认职位仍开放",
      notes: `${job.industry} · ${job.function} · ${job.locations.join(" / ")}`,
    };
    setApplications((items) => [draft, ...items]);
    setToast("已加入投递追踪，可在“投递记录”中更新状态");
    fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "application", ...draft }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(
        ({ item }) =>
          item &&
          setApplications((items) =>
            items.map((entry) => (entry.id === draft.id ? item : entry)),
          ),
      )
      .catch(() => undefined);
  }

  function loadMoreJobs() {
    if (!jobMarket?.nextCursor || jobsLoadingMore) return;
    setJobsLoadingMore(true);
    fetch(`/api/jobs?cursor=${encodeURIComponent(jobMarket.nextCursor)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: JobPayload) =>
        setJobMarket((current) => {
          if (!current) return data;
          const merged = [
            ...current.jobs,
            ...data.jobs.filter(
              (job) => !current.jobs.some((item) => item.id === job.id),
            ),
          ];
          return {
            ...data,
            jobs: merged,
            verifiedCount: current.verifiedCount + data.verifiedCount,
          };
        }),
      )
      .catch(() => setToast("更多招聘来源暂时无法访问，请稍后重试"))
      .finally(() => setJobsLoadingMore(false));
  }

  async function refreshJobs() {
    if (jobsLoading) return;
    setJobsLoading(true);
    try {
      const response = await fetch(`/api/jobs?refresh=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("岗位刷新失败");
      const data = (await response.json()) as JobPayload;
      setJobMarket(data);
      setToast(
        `已刷新岗位信息，共发现 ${data.totalKnown || data.jobs.length} 个岗位`,
      );
    } catch {
      setToast("岗位刷新失败，请检查网络后重试");
    } finally {
      setJobsLoading(false);
    }
  }

  function updateApplicationStatus(
    application: JobApplication,
    status: ApplicationStatus,
  ) {
    const next = { ...application, status };
    setApplications((items) =>
      items.map((item) => (item.id === application.id ? next : item)),
    );
    setToast(`已更新为“${status}”`);
    fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "application", ...next }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(
        ({ item }) =>
          item &&
          setApplications((items) =>
            items.map((entry) => (entry.id === application.id ? item : entry)),
          ),
      )
      .catch(() => undefined);
  }

  async function deleteApplication(application: JobApplication) {
    const confirmed = window.confirm(
      `确认删除「${application.company} · ${application.role}」的投递记录吗？\n删除后将无法恢复。`,
    );
    if (!confirmed) return;
    setApplications((items) =>
      items.filter((item) => item.id !== application.id),
    );
    setToast("投递记录已删除");
    try {
      const response = await fetch(
        `/api/workspace?type=application&id=${encodeURIComponent(application.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("删除失败");
    } catch {
      setApplications((items) =>
        items.some((item) => item.id === application.id)
          ? items
          : [...items, application].sort(
              (a, b) =>
                applicationStageIndex(b.status) -
                  applicationStageIndex(a.status) || b.id - a.id,
            ),
      );
      setToast("删除失败，投递记录已恢复");
    }
  }

  async function refreshIndustryBrief() {
    if (marketLoading) return;
    setMarketLoading(true);
    try {
      const response = await fetch(`/api/market?refresh=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("行业资讯刷新失败");
      const data = (await response.json()) as MarketPayload;
      setMarket(data);
      const verifiedCount = data.news.filter(
        (item) =>
          item.industry === industry && item.verification === "verified",
      ).length;
      setToast(`已刷新${industry}资讯，共 ${verifiedCount} 条通过核验`);
    } catch {
      setToast("刷新失败，请检查网络后重试");
    } finally {
      setMarketLoading(false);
    }
  }

  async function refreshStocks() {
    if (marketLoading) return;
    setMarketLoading(true);
    try {
      const response = await fetch(`/api/market?refresh=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("股票行情刷新失败");
      const data = (await response.json()) as MarketPayload;
      setMarket(data);
      const instruments = data.instruments || Object.values(data.markets || {}).flat();
      const verified = instruments.filter((item) => item.verified).length;
      setToast(`已刷新 ${instruments.length} 个标的，${verified} 个通过多源核验`);
    } catch {
      setToast("行情刷新失败，请稍后重试");
    } finally {
      setMarketLoading(false);
    }
  }

  function zoomGraph(amount: number) {
    setGraphViewport((current) => ({
      ...current,
      scale: Math.min(1.9, Math.max(0.62, current.scale + amount)),
    }));
  }

  function handleGraphWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setGraphViewport((current) => ({
      ...current,
      scale: Math.min(
        1.9,
        Math.max(0.62, current.scale - event.deltaY * 0.0012),
      ),
    }));
  }

  function startGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    graphGesture.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: graphViewport.x,
      originY: graphViewport.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setGraphPanning(true);
  }

  function moveGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!graphPanning) return;
    const rotateY =
      graphGesture.current.originX +
      (event.clientX - graphGesture.current.startX) * 0.36;
    const rotateX = Math.max(
      -52,
      Math.min(
        52,
        graphGesture.current.originY -
          (event.clientY - graphGesture.current.startY) * 0.3,
      ),
    );
    setGraphViewport((current) => ({ ...current, x: rotateY, y: rotateX }));
  }

  function endGraphPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!graphPanning) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setGraphPanning(false);
  }

  const TaskRows = ({ limit }: { limit?: number }) => (
    <div className="task-list">
      {filteredTasks.slice(0, limit).map((task) => (
        <div className="task-row" key={task.id}>
          <button
            className="checkmark"
            onClick={() => toggleTask(task)}
            aria-label={`完成${task.title}`}
          ></button>
          <span className="task-copy">
            <strong>{task.title}</strong>
            <small>{task.detail}</small>
          </span>
          <span className={`priority ${priorityClass(task.priority)}`}>
            <i />
            {task.priority}
          </span>
          <span className="task-date">{task.date}</span>
          <button
            className="task-edit"
            onClick={() => openTaskEditor(task)}
            aria-label={`编辑${task.title}`}
          >
            ✎
          </button>
        </div>
      ))}
      {!filteredTasks.length && (
        <div className="empty-state">
          这一阶段还没有任务，留一点空间给新想法。
        </div>
      )}
    </div>
  );

  const HorizonTabs = () => (
    <div className="tabs" role="tablist" aria-label="任务时间范围">
      {(["今日", "本周", "年度"] as Horizon[]).map((item) => (
        <button
          key={item}
          className={horizon === item ? "active" : ""}
          onClick={() => setHorizon(item)}
        >
          {item}任务{" "}
          <span>
            {tasks.filter((task) => task.horizon === item && !task.done).length}
          </span>
        </button>
      ))}
    </div>
  );

  const TaskHistory = () => (
    <section className="task-history panel" aria-label="完成历史">
      <header>
        <div>
          <small>COMPLETION HISTORY</small>
          <h3>完成历史</h3>
          <p>每日任务会自动清零，完成记录仍会保留。</p>
        </div>
        <span>{completedHistory.length} 项</span>
      </header>
      <div className="history-list">
        {completedHistory.map((entry) => {
          const task = tasks.find((item) => item.id === entry.taskId);
          return (
            <article key={`${entry.taskId}-${entry.id}`}>
              <span className="history-check">✓</span>
              <div>
                <b>{entry.title}</b>
                <small>{entry.detail}</small>
                <em>
                  {entry.horizon} · 完成于 {entry.completedAt || "历史记录"}
                </em>
              </div>
              <button
                disabled={!task?.done}
                onClick={() => task?.done && toggleTask(task)}
                aria-label={`撤回完成任务${entry.title}`}
              >
                {task?.done ? "↶ 撤回完成" : "已回到当前"}
              </button>
            </article>
          );
        })}
        {!completedHistory.length && (
          <div className="empty-state">
            还没有完成记录，完成的任务会安全保存在这里。
          </div>
        )}
      </div>
    </section>
  );

  const KnowledgeMap = () => {
    const categories3d = optimizedGraphCategories.map((node) => ({
      ...node,
      projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    const topics3d = semanticGraph.topics.map((node) => ({
      ...node,
      projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    const articles3d = semanticGraph.articles.map((node) => ({
      ...node,
      projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    type ProjectedPoint = {
      left: number;
      top: number;
      depth: number;
      scale: number;
      zIndex: number;
    };
    const curvePath = (from: ProjectedPoint, to: ProjectedPoint, bend = 0) => {
      const dx = to.left - from.left;
      const dy = to.top - from.top;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const midX = (from.left + to.left) / 2 + normalX * bend;
      const midY = (from.top + to.top) / 2 + normalY * bend;
      return `M ${from.left.toFixed(3)} ${from.top.toFixed(3)} Q ${midX.toFixed(3)} ${midY.toFixed(3)} ${to.left.toFixed(3)} ${to.top.toFixed(3)}`;
    };
    const edgeClass = (kind: string, fromId: string, toId: string) => {
      if (!graphFocus) return `graph-edge ${kind}`;
      return `graph-edge ${kind} ${graphFocus === fromId || graphFocus === toId ? "is-active" : "is-muted"}`;
    };
    const anchorForArticle = (anchorId: string) => {
      const topic = topics3d.find((node) => node.id === anchorId);
      if (topic)
        return { projected: topic.projected, focusId: `topic:${topic.id}` };
      const category = categories3d.find((node) => node.name === anchorId);
      return category
        ? {
            projected: category.projected,
            focusId: `category:${category.name}`,
          }
        : null;
    };

    return (
      <section className="knowledge-visual panel graph-3d-shell">
        <div className="visual-head">
          <div>
            <span>3D SEMANTIC KNOWLEDGE GRAPH</span>
            <h3>三维知识关联球</h3>
            <p>
              系统按知识内容自动整合、均匀排布并建立分类、主题和知识条目之间的关联。
            </p>
          </div>
          <div className="visual-legend graph-legend">
            <i />
            大球 · 一级领域 <i />
            中球 · 关联主题 <i />
            小球 · 知识条目
          </div>
        </div>
        <div
          className={`map-stage graph-3d-stage ${graphPanning ? "is-panning" : ""}`}
          aria-label="可旋转缩放的三维知识关联图谱"
          onWheel={handleGraphWheel}
          onPointerDown={startGraphPan}
          onPointerMove={moveGraphPan}
          onPointerUp={endGraphPan}
          onPointerCancel={endGraphPan}
          onDoubleClick={(event) => {
            if (!(event.target as HTMLElement).closest("button"))
              setGraphViewport({ x: 0, y: 0, scale: 1 });
          }}
        >
          <div className="graph-controls" aria-label="图谱缩放控制">
            <button onClick={() => zoomGraph(-0.16)} aria-label="缩小知识图谱">
              −
            </button>
            <span>{Math.round(graphViewport.scale * 100)}%</span>
            <button onClick={() => zoomGraph(0.16)} aria-label="放大知识图谱">
              ＋
            </button>
            <button
              className="graph-reset"
              onClick={() => setGraphViewport({ x: 0, y: 0, scale: 1 })}
              aria-label="复位知识图谱"
            >
              ⌖
            </button>
          </div>
          <div className="graph-axis">
            <span>X</span>
            <span>Y</span>
            <span>Z</span>
          </div>
          <div
            className="map-canvas graph-3d-canvas"
            style={{ transform: `scale(${graphViewport.scale})` }}
          >
            <span className="depth-orbit orbit-a" />
            <span className="depth-orbit orbit-b" />
            <span className="depth-orbit orbit-c" />
            {Array.from({ length: 14 }, (_, index) => (
              <i
                className="map-particle"
                key={`particle-${index}`}
                style={{ "--particle-index": index } as React.CSSProperties}
              />
            ))}
            <svg
              className="graph-connection-layer"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {topics3d.flatMap((topic, topicIndex) =>
                topic.categories.map((categoryName, categoryIndex) => {
                  const category = categories3d.find(
                    (node) => node.name === categoryName,
                  );
                  if (!category) return null;
                  const bend =
                    ((topicIndex + categoryIndex) % 2 ? 1 : -1) *
                    (1.2 + categoryIndex * 0.45);
                  return (
                    <path
                      key={`${topic.id}-${categoryName}`}
                      d={curvePath(topic.projected, category.projected, bend)}
                      className={edgeClass(
                        "graph-edge-domain",
                        `topic:${topic.id}`,
                        `category:${categoryName}`,
                      )}
                      style={
                        { "--edge-color": topic.color } as React.CSSProperties
                      }
                    />
                  );
                }),
              )}
              {articles3d.map((article, index) => {
                const anchor = anchorForArticle(article.anchorId);
                if (!anchor) return null;
                const color =
                  KNOWLEDGE_TAXONOMY.find(
                    (meta) => meta.name === article.item.primaryCategory,
                  )?.color || "#d5b168";
                return (
                  <path
                    key={`article-link-${article.item.id}`}
                    d={curvePath(
                      anchor.projected,
                      article.projected,
                      (index % 2 ? 1 : -1) * 0.65,
                    )}
                    className={edgeClass(
                      "graph-edge-article",
                      anchor.focusId,
                      `article:${article.item.id}`,
                    )}
                    style={{ "--edge-color": color } as React.CSSProperties}
                  />
                );
              })}
              {semanticGraph.topicEdges.map((edge, index) => {
                const from = topics3d.find((topic) => topic.id === edge.fromId);
                const to = topics3d.find((topic) => topic.id === edge.toId);
                return from && to ? (
                  <path
                    key={`topic-relation-${edge.fromId}-${edge.toId}`}
                    d={curvePath(
                      from.projected,
                      to.projected,
                      (index % 2 ? 1 : -1) * 1.1,
                    )}
                    className={edgeClass(
                      "graph-edge-topic",
                      `topic:${edge.fromId}`,
                      `topic:${edge.toId}`,
                    )}
                  />
                ) : null;
              })}
              {semanticGraph.relationEdges.slice(0, 10).map((edge, index) => {
                const from = articles3d.find(
                  (article) => article.item.id === edge.fromId,
                );
                const to = articles3d.find(
                  (article) => article.item.id === edge.toId,
                );
                return from && to ? (
                  <path
                    key={`relation-${edge.fromId}-${edge.toId}`}
                    d={curvePath(
                      from.projected,
                      to.projected,
                      (index % 2 ? 1 : -1) * 1.8,
                    )}
                    className={edgeClass(
                      "graph-edge-relation",
                      `article:${edge.fromId}`,
                      `article:${edge.toId}`,
                    )}
                  />
                ) : null;
              })}
            </svg>

            {categories3d.map((node) => {
              const meta = KNOWLEDGE_TAXONOMY.find(
                (item) => item.name === node.name,
              )!;
              return (
                <button
                  key={node.name}
                  className={`map-node graph-category sphere-large ${activeCategory === node.name ? "selected" : ""}`}
                  style={
                    {
                      left: `${node.projected.left}%`,
                      top: `${node.projected.top}%`,
                      zIndex: 500 + node.projected.zIndex,
                      "--node-color": meta.color,
                      "--depth-scale": node.projected.scale,
                    } as React.CSSProperties
                  }
                  onMouseEnter={() => setGraphFocus(`category:${node.name}`)}
                  onMouseLeave={() => setGraphFocus(null)}
                  onFocus={() => setGraphFocus(`category:${node.name}`)}
                  onBlur={() => setGraphFocus(null)}
                  onClick={() => setActiveCategory(node.name)}
                >
                  <span>{meta.icon}</span>
                  <b>{node.displayName || node.name}</b>
                  <small>{categoryCounts[node.name] || 0} 条</small>
                </button>
              );
            })}
            {topics3d.map((topic) => (
              <button
                key={topic.id}
                className="semantic-sphere sphere-medium"
                style={
                  {
                    left: `${topic.projected.left}%`,
                    top: `${topic.projected.top}%`,
                    zIndex: 600 + topic.projected.zIndex,
                    "--node-color": topic.color,
                    "--depth-scale": topic.projected.scale,
                  } as React.CSSProperties
                }
                title={`${topic.name}连接${topic.categories.map((name) => (name === "车辆" ? "汽车" : name)).join("、")}`}
                onMouseEnter={() => setGraphFocus(`topic:${topic.id}`)}
                onMouseLeave={() => setGraphFocus(null)}
                onFocus={() => setGraphFocus(`topic:${topic.id}`)}
                onBlur={() => setGraphFocus(null)}
                onClick={() => {
                  const matched = topic.items[0];
                  if (matched) {
                    setActiveCategory(matched.primaryCategory);
                    setSelectedKnowledge(matched);
                  } else
                    setToast(
                      `${topic.name}已连接${topic.categories.map((name) => (name === "车辆" ? "汽车" : name)).join("、")}，等待收录相关知识`,
                    );
                }}
              >
                <span>◎</span>
                <b>{topic.name}</b>
                <small>{topic.items.length || "关联"}</small>
              </button>
            ))}
            {articles3d.map((article) => {
              const color =
                KNOWLEDGE_TAXONOMY.find(
                  (meta) => meta.name === article.item.primaryCategory,
                )?.color || "#d5b168";
              return (
                <button
                  key={article.item.id}
                  className="article-sphere sphere-small"
                  style={
                    {
                      left: `${article.projected.left}%`,
                      top: `${article.projected.top}%`,
                      zIndex: 700 + article.projected.zIndex,
                      "--node-color": color,
                      "--depth-scale": article.projected.scale,
                    } as React.CSSProperties
                  }
                  title={article.item.title}
                  onMouseEnter={() =>
                    setGraphFocus(`article:${article.item.id}`)
                  }
                  onMouseLeave={() => setGraphFocus(null)}
                  onFocus={() => setGraphFocus(`article:${article.item.id}`)}
                  onBlur={() => setGraphFocus(null)}
                  onClick={() => {
                    setActiveCategory(article.item.primaryCategory);
                    setSelectedKnowledge(article.item);
                  }}
                >
                  <b>{getKnowledgeSphereLabel(article.item)}</b>
                  <small>{article.item.title}</small>
                </button>
              );
            })}
          </div>
          <div className="graph-hint">
            <span>✥ 拖动旋转3D视角</span>
            <span>滚轮 / 按钮缩放</span>
            <span>双击复位</span>
          </div>
        </div>
        <div className="topic-stream">
          <span className="topic-label">
            {activeCategory === "全部"
              ? "全部二级目录"
              : `${activeCategory === "车辆" ? "汽车" : activeCategory} · 二级目录`}
          </span>
          <div>
            {secondaryGroups.length ? (
              secondaryGroups.map(([name, count]) => (
                <button key={name}>
                  <span>{name}</span>
                  <em>{count}</em>
                </button>
              ))
            ) : (
              <small>该领域还没有知识条目</small>
            )}
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="app-shell">
      <WorkspaceSidebar
        active={view}
        mobileOpen={mobileMenu}
        taskCount={tasks.filter((task) => !task.done).length}
        profile={{ ...profile, avatarText: getAvatarInitial(profile.displayName) }}
        onNavigate={(destination) => {
          if (destination === "今日") {
            setHorizon("今日");
            setView("个人任务");
          } else {
            setView(destination);
          }
          setMobileMenu(false);
        }}
        onOpenTool={(destination) => {
          setView(destination as View);
          setMobileMenu(false);
        }}
        onOpenProfile={() => setProfileModal(true)}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <section className="content-shell">
        <WorkspaceTopbar
          query={query}
          dateLabel={formatDate()}
          avatarText={getAvatarInitial(profile.displayName)}
          onQueryChange={setQuery}
          onMenu={() => setMobileMenu((open) => !open)}
          onNewTask={() => openNewTask()}
          onNewProject={() => {
            setEditingProject(null);
            setProjectModal(true);
          }}
          onNewNote={() => setNoteModal(true)}
          onCapture={() => setCaptureModal(true)}
          onImportDocument={() => setDocumentModal(true)}
          onProfile={() => setProfileModal(true)}
          onReminders={() => setToast(workspaceReminders.filter((reminder) => !reminder.done).length ? `你有 ${workspaceReminders.filter((reminder) => !reminder.done).length} 条待处理提醒` : "当前没有待处理提醒")}
        />

        <div className="page">
          {view === "工作台" && (
            <WorkspaceOverview
              displayName={profile.displayName}
              tasks={tasks}
              knowledge={knowledge}
              projects={workspaceProjects}
              reminders={workspaceReminders}
              onToggleTask={(overviewTask) => {
                const task = tasks.find((item) => item.id === overviewTask.id);
                if (task) toggleTask(task);
              }}
              onNewTask={openNewTask}
              onNewProject={() => {
                setEditingProject(null);
                setProjectModal(true);
              }}
              onOpenTasks={() => setView("个人任务")}
              onOpenProjects={() => setView("项目")}
              onOpenKnowledge={() => setView("知识库")}
              onOpenNotes={() => setView("笔记")}
              onOpenTools={() => setToast("常用工具已固定在左侧导航")}
              onQuickNote={saveQuickNote}
            />
          )}
          {false && view === "工作台" && (
            <>
              <section className="welcome">
                <div>
                  <p>{formatDate()}</p>
                  <h1>早上好</h1>
                  <h2>今天也要向重要的事情靠近一点。</h2>
                </div>
                <button
                  className="capture"
                  onClick={() => setCaptureModal(true)}
                >
                  <span>✦</span>
                  <div>
                    <b>快速收录知识</b>
                    <small>对话、网址或一段想法</small>
                  </div>
                  <i>→</i>
                </button>
              </section>
              <section className="stats-grid">
                <article>
                  <span className="stat-icon gold">✓</span>
                  <div>
                    <small>今日任务</small>
                    <strong>
                      {todayDone}
                      <i> / {todayTotal}</i>
                    </strong>
                    <p>
                      完成进度{" "}
                      <b>
                        {todayTotal
                          ? Math.round((todayDone / todayTotal) * 100)
                          : 0}
                        %
                      </b>
                    </p>
                    <div className="progress">
                      <i
                        style={{
                          width: `${todayTotal ? (todayDone / todayTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>
                <article>
                  <span className="stat-icon lavender">◷</span>
                  <div>
                    <small>本周专注</small>
                    <strong>
                      18.5<i> 小时</i>
                    </strong>
                    <p>
                      <span className="trend">↗ 12%</span> 较上周
                    </p>
                  </div>
                </article>
                <article>
                  <span className="stat-icon cyan">◇</span>
                  <div>
                    <small>知识沉淀</small>
                    <strong>
                      {knowledge.length}
                      <i> 条</i>
                    </strong>
                    <p>
                      <span className="trend">
                        ＋{Math.min(knowledge.length, 8)}
                      </span>{" "}
                      本周新增
                    </p>
                  </div>
                </article>
                <article>
                  <span className="stat-icon coral">⌁</span>
                  <div>
                    <small>连续记录</small>
                    <strong>
                      12<i> 天</i>
                    </strong>
                    <p>最长记录 28 天</p>
                  </div>
                </article>
              </section>
              <section className="panel tasks-panel">
                <div className="panel-head">
                  <div>
                    <h3>个人任务</h3>
                    <p>让每一件事都有清晰的优先级</p>
                  </div>
                  <button onClick={() => setView("个人任务")}>
                    查看全部 →
                  </button>
                </div>
                <HorizonTabs />
                <TaskRows limit={4} />
              </section>
              <section className="tool-launcher">
                <button onClick={() => setView("简历投递")}>
                  <span className="tool-mark job">▣</span>
                  <div>
                    <small>CAREER PIPELINE</small>
                    <b>简历投递</b>
                    <p>
                      {applications.length} 个机会 · {applicationProgress}{" "}
                      个进入流程
                    </p>
                  </div>
                  <i>→</i>
                </button>
                <button onClick={() => setView("股票")}>
                  <span className="tool-mark stock">⌁</span>
                  <div>
                    <small>EQUITY RESEARCH</small>
                    <b>股票研究工作台</b>
                    <p>
                      {marketLoading
                        ? "正在同步行情"
                        : `${market?.instruments?.length || Object.values(market?.markets || {}).flat().length || market?.stocks.length || 0} 个跨市场标的 · 信号与证据分层`}
                    </p>
                  </div>
                  <i>→</i>
                </button>
                <button onClick={() => setView("行业速览")}>
                  <span className="tool-mark news">◫</span>
                  <div>
                    <small>INDUSTRY BRIEF</small>
                    <b>行业讯息速览</b>
                    <p>汽车 · 机器人 · 半导体 · 互联网大厂 · 制造业</p>
                  </div>
                  <i>→</i>
                </button>
              </section>
              <div className="lower-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>最近知识</h3>
                      <p>按内容自动归入专业领域</p>
                    </div>
                    <button onClick={() => setView("知识库")}>知识库 →</button>
                  </div>
                  <div className="knowledge-mini">
                    {knowledge.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setView("知识库");
                          setActiveCategory(item.primaryCategory);
                        }}
                      >
                        <span>
                          {KNOWLEDGE_TAXONOMY.find(
                            (meta) => meta.name === item.primaryCategory,
                          )?.icon || "◇"}
                        </span>
                        <div>
                          <b>{item.title}</b>
                          <small>{item.summary}</small>
                          <em>
                            {item.primaryCategory} / {item.secondaryCategory} ·{" "}
                            {item.createdAt}
                          </em>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel week-card">
                  <div className="panel-head">
                    <div>
                      <h3>本周节奏</h3>
                      <p>第 32 周 · 稳定推进中</p>
                    </div>
                    <button onClick={() => setView("每周总结")}>总结 →</button>
                  </div>
                  <div className="week-chart">
                    {[42, 64, 51, 82, 73, 38, 22].map((height, index) => (
                      <div key={index}>
                        <i
                          style={{ height: `${height}%` }}
                          className={index === 3 ? "peak" : ""}
                        />
                        <small>{"一二三四五六日"[index]}</small>
                      </div>
                    ))}
                  </div>
                  <p className="week-note">
                    <span>✦</span> 周四是你的高效日，建议把深度工作安排在上午。
                  </p>
                </section>
              </div>
            </>
          )}

          {view === "项目" && (
            <WorkspaceProjectsPage
              projects={workspaceProjects}
              onNew={() => {
                setEditingProject(null);
                setProjectModal(true);
              }}
              onEdit={(project) => {
                setEditingProject(project);
                setProjectModal(true);
              }}
            />
          )}

          {view === "笔记" && (
            <WorkspaceNotesPage
              notes={quickNotes}
              onNew={() => setNoteModal(true)}
              onUpdate={updateQuickNote}
            />
          )}

          {view === "个人任务" && (
            <section className="full-view">
              <div className="view-title">
                <div>
                  <p>TODAY & TASKS</p>
                  <h1>今日任务</h1>
                  <h2>从今日入口统一管理待办，并按本周和年度视角继续规划。</h2>
                </div>
                <div className="task-title-actions">
                  <button
                    className="secondary-action"
                    onClick={() => setView("每周总结")}
                  >
                    ◫ 每周总结
                  </button>
                  <button
                    className={`secondary-action ${taskHistoryOpen ? "active" : ""}`}
                    onClick={() => setTaskHistoryOpen((open) => !open)}
                  >
                    ◷ 完成历史 <span>{completed}</span>
                  </button>
                  <button className="primary" onClick={openNewTask}>
                    ＋ 新建任务
                  </button>
                </div>
              </div>
              <div className="task-overview">
                <article>
                  <small>当前任务</small>
                  <strong>{tasks.length - activeCompleted}</strong>
                </article>
                <article>
                  <small>今日待办</small>
                  <strong>
                    {
                      tasks.filter(
                        (task) => task.horizon === "今日" && !task.done,
                      ).length
                    }
                  </strong>
                </article>
                <article>
                  <small>历史完成</small>
                  <strong>{completed}</strong>
                </article>
              </div>
              <section className="panel tasks-panel">
                <div className="active-task-label">
                  <span>ACTIVE TASKS</span>
                  <p>只显示未完成任务</p>
                </div>
                <HorizonTabs />
                <TaskRows />
              </section>
              {taskHistoryOpen && <TaskHistory />}
            </section>
          )}

          {view === "知识库" && (
            <section className="full-view knowledge-view">
              <div className="view-title">
                <div>
                  <p>KNOWLEDGE BASE</p>
                  <h1>知识库</h1>
                  <h2>按内容理解知识，构建可浏览、可追溯的专业知识网络。</h2>
                </div>
                <div className="knowledge-title-actions">
                  <button
                    className="secondary-action"
                    onClick={() => setDocumentModal(true)}
                  >
                    ↑ 添加文档
                  </button>
                  <button
                    className="primary"
                    onClick={() => setCaptureModal(true)}
                  >
                    ✦ 收录知识
                  </button>
                </div>
              </div>
              <KnowledgeMap />
              <div className="category-row taxonomy-row">
                <button
                  className={activeCategory === "全部" ? "active" : ""}
                  onClick={() => setActiveCategory("全部")}
                >
                  全部 <span>{knowledge.length}</span>
                </button>
                {KNOWLEDGE_TAXONOMY.map((category) => (
                  <button
                    key={category.name}
                    className={activeCategory === category.name ? "active" : ""}
                    onClick={() => setActiveCategory(category.name)}
                  >
                    {category.icon} {category.name}{" "}
                    <span>{categoryCounts[category.name] || 0}</span>
                  </button>
                ))}
              </div>
              <div className="knowledge-grid">
                {visibleKnowledge.map((item) => {
                  const media = getKnowledgeTextbookMedia(
                    item.title,
                    `${item.primaryCategory} ${item.secondaryCategory}`,
                  );
                  return (
                    <article
                      key={item.id}
                      className="knowledge-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedKnowledge(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSelectedKnowledge(item);
                      }}
                    >
                      <div className="knowledge-top">
                        <span
                          style={{
                            color: KNOWLEDGE_TAXONOMY.find(
                              (meta) => meta.name === item.primaryCategory,
                            )?.color,
                          }}
                        >
                          {KNOWLEDGE_TAXONOMY.find(
                            (meta) => meta.name === item.primaryCategory,
                          )?.icon || "◇"}
                        </span>
                        <span className="card-more">打开 ↗</span>
                      </div>
                      <figure className="knowledge-card-media">
                        <div
                          className="knowledge-card-media-image"
                          role="img"
                          aria-label={media.title}
                          style={{
                            backgroundImage: `url("${media.cardSrc || media.src}")`,
                            backgroundPosition:
                              media.cardBackgroundPosition ||
                              media.objectPosition ||
                              "center",
                            backgroundSize:
                              media.cardBackgroundSize || "cover",
                          }}
                        />
                        <figcaption>
                          <b>{media.title}</b>
                          <span>{media.caption}</span>
                        </figcaption>
                      </figure>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <footer>
                        <span>
                          {item.primaryCategory} <i>›</i> {item.secondaryCategory}
                        </span>
                        <time>{item.createdAt}</time>
                      </footer>
                    </article>
                  );
                })}
              </div>
              {!visibleKnowledge.length && (
                <div className="empty-state">
                  这个专业领域还没有知识，收录内容后会自动归入对应目录。
                </div>
              )}
            </section>
          )}

          {(view === "英语学习" || view === "日语学习") && (
            <section className="full-view language-view daily-language-view">
              <div className="view-title">
                <div>
                  <p>DAILY EXAM PREPARATION</p>
                  <h1>{currentLanguage}</h1>
                  <h2>
                    {currentLanguage === "英语学习"
                      ? "CET-6 备考与日常英语对话并行：训练词汇、听说、阅读翻译与写作。"
                      : "零基础日语从五十音开始：先掌握假名与发音，再逐步进入基础表达。"}
                  </h2>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    setToast(
                      `${dailyLanguage.dateKey} 的${currentLanguage === "英语学习" ? "英语" : "日语"}学习包已准备完成`,
                    )
                  }
                >
                  ✦ 今日学习包
                </button>
              </div>
              <section className="panel daily-language-hero">
                <div className="daily-language-mark">
                  <span>{currentLanguage === "英语学习" ? "EN" : "あ"}</span>
                  <div>
                    <small>{languageExam.target}</small>
                    <h3>{languageExam.stage}</h3>
                    <p>{languageExam.description}</p>
                  </div>
                </div>
                <div className="daily-language-metrics">
                  <article>
                    <strong>06</strong>
                    <span>
                      {currentLanguage === "英语学习" ? "CET-6 词汇" : "今日假名"}
                    </span>
                  </article>
                  <article>
                    <strong>01</strong>
                    <span>今日题型</span>
                  </article>
                  <article>
                    <strong>03</strong>
                    <span>输出练习</span>
                  </article>
                  <article>
                    <strong>45</strong>
                    <span>建议分钟</span>
                  </article>
                </div>
              </section>
              <section className="panel language-exam-route">
                <header>
                  <div>
                    <small>LEARNING ROUTE</small>
                    <h3>
                      {currentLanguage === "英语学习"
                        ? "每日备考路径"
                        : "日语零基础学习路径"}
                    </h3>
                  </div>
                  <span>{languageExam.target}</span>
                </header>
                <div>
                  {languageExam.routes.map((route, index) => (
                    <button
                      type="button"
                      className={`language-route-button ${activeLanguageRoute[currentLanguage] === index ? "active" : ""}`}
                      key={route.label}
                      aria-pressed={activeLanguageRoute[currentLanguage] === index}
                      onClick={() => openLanguageRoute(index, route.target)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{route.label}</b>
                      <small>{activeLanguageRoute[currentLanguage] === index ? "正在学习" : "点击开始"}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section className="panel daily-vocabulary" id="language-vocabulary">
                <header>
                  <div>
                    <h3>
                      {currentLanguage === "英语学习"
                        ? "今日 CET-6 核心词汇与例句"
                        : "今日五十音与基础词例"}
                    </h3>
                    <p>
                      {currentLanguage === "英语学习"
                        ? "结合六级常见语境记忆词义、搭配和句法，并通过朗读强化听力辨音。"
                        : "从平假名的字形、罗马音和发音开始，再用最简单的词汇建立记忆。"}
                    </p>
                  </div>
                </header>
                <div className="daily-word-grid">
                  {dailyLanguage.words.map((word, index) => (
                    <article key={word.term}>
                      <div className="daily-word-index">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <em>{word.tag}</em>
                      </div>
                      <h4>{word.term}</h4>
                      {word.reading && (
                        <p className="word-reading">{word.reading}</p>
                      )}
                      <b>{word.meaning}</b>
                      <blockquote>{word.example}</blockquote>
                      <p className="word-translation">{word.translation}</p>
                      <button
                        onClick={() =>
                          speakLanguage(`${word.term}. ${word.example}`)
                        }
                        aria-label={`朗读${word.term}`}
                      >
                        ◉ 朗读单词与例句
                      </button>
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel daily-case-study" id="language-conversation">
                <header>
                  <div>
                    <h3>{dailyLanguage.caseStudy.title}</h3>
                    <p>{dailyLanguage.caseStudy.scene}</p>
                  </div>
                </header>
                <div className="daily-case-layout">
                  <article className="case-original">
                    <div>
                      <b>
                        {currentLanguage === "英语学习"
                          ? "ORIGINAL ENGLISH"
                          : "日本語原文"}
                      </b>
                      <button
                        onClick={() =>
                          speakLanguage(dailyLanguage.caseStudy.original)
                        }
                      >
                        ◉ 朗读原文
                      </button>
                    </div>
                    <p>{dailyLanguage.caseStudy.original}</p>
                  </article>
                  <article className="case-translation">
                    <b>中文理解</b>
                    <p>{dailyLanguage.caseStudy.translation}</p>
                  </article>
                </div>
              </section>
              {currentLanguage === "英语学习" && (
                <section className="language-practice-grid">
                  <article className="panel language-practice-card" id="language-reading">
                    <header>
                      <div><small>READING & TRANSLATION</small><h3>阅读与翻译练习</h3></div>
                      <span>{translationDraft.trim().length} 字</span>
                    </header>
                    <p className="language-practice-source">{dailyLanguage.caseStudy.original}</p>
                    <label>
                      <span>你的中文翻译</span>
                      <textarea
                        value={translationDraft}
                        onChange={(event) => setTranslationDraft(event.target.value)}
                        placeholder="先独立完成翻译，再查看参考译文……"
                      />
                    </label>
                    {translationRevealed && (
                      <div className="language-reference-answer"><b>参考译文</b><p>{dailyLanguage.caseStudy.translation}</p></div>
                    )}
                    <footer>
                      <button type="button" onClick={() => setTranslationRevealed((revealed) => !revealed)}>{translationRevealed ? "隐藏参考译文" : "查看参考译文"}</button>
                      <button type="button" className="primary" onClick={() => saveLanguageDraft("translation", translationDraft)}>保存翻译</button>
                    </footer>
                  </article>
                  <article className="panel language-practice-card" id="language-writing">
                    <header>
                      <div><small>WRITING OUTPUT</small><h3>CET-6 写作输出</h3></div>
                      <span>{writingWordCount} 词</span>
                    </header>
                    <div className="language-writing-prompt"><b>今日题目</b><p>{dailyLanguage.caseStudy.tasks[2]}</p><small>建议 150–200 词，使用清晰的观点、理由、例证和结论。</small></div>
                    <label>
                      <span>你的英文写作</span>
                      <textarea
                        value={writingDraft}
                        onChange={(event) => setWritingDraft(event.target.value)}
                        placeholder="Write your response here..."
                        lang="en"
                      />
                    </label>
                    <footer>
                      <span className={writingWordCount >= 150 ? "ready" : ""}>{writingWordCount >= 150 ? "已达到建议字数" : `还需约 ${Math.max(0, 150 - writingWordCount)} 词`}</span>
                      <button type="button" className="primary" onClick={() => saveLanguageDraft("writing", writingDraft)}>保存写作</button>
                    </footer>
                  </article>
                </section>
              )}
              <section className="panel daily-output" id="language-output">
                <header>
                  <div>
                    <h3>{currentLanguage === "英语学习" ? "今天必须完成的 CET-6 训练" : "今天必须完成的五十音练习"}</h3>
                    <p>
                      {currentLanguage === "英语学习"
                        ? "按照考试时间意识完成理解、复述和写作，逐步提高正确率与输出速度。"
                        : "初学阶段重在准确模仿发音、掌握最小句型，并能完成简单日常对话。"}
                    </p>
                  </div>
                </header>
                <div>
                  {dailyLanguage.caseStudy.tasks.map((task, index) => (
                    <article key={task}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>
                          {index === 0
                            ? "基础识别"
                            : index === 1
                              ? "考试训练"
                              : "主动输出"}
                        </small>
                        <p>{task}</p>
                      </div>
                      <button
                        onClick={() => setToast(`已加入今日输出：${task}`)}
                      >
                        加入练习
                      </button>
                    </article>
                  ))}
                </div>
                <footer>
                  <span>建议顺序</span>
                  <p>
                    {currentLanguage === "英语学习"
                      ? "词汇与听音 15 分钟 → 题型精练 15 分钟 → 写作复盘 15 分钟"
                      : "假名与发音 15 分钟 → 词汇句型 15 分钟 → 跟读会话 15 分钟"}
                  </p>
                </footer>
              </section>
            </section>
          )}

          {view === "每周总结" && (
            <section className="full-view">
              <div className="view-title">
                <div>
                  <p>WEEKLY REVIEW</p>
                  <h1>每周总结</h1>
                  <h2>回顾不是为了评判，而是为了下一次更从容。</h2>
                </div>
                <button
                  className="primary"
                  onClick={() => setToast("本周总结已生成草稿")}
                >
                  ✦ AI 生成总结
                </button>
              </div>
              <div className="review-grid">
                <section className="panel review-main">
                  <span className="eyebrow">2026 · 第 32 周</span>
                  <h3>稳定交付，也留出了思考的余地</h3>
                  <p>
                    本周共完成 {completed} 项任务，新增 {knowledge.length}{" "}
                    条知识。核心进展集中在产品规划与知识管理流程上，工作节奏较上周更稳定。
                  </p>
                  <div className="highlight-list">
                    <div>
                      <span>01</span>
                      <p>
                        <b>本周亮点</b>
                        完成个人工作台需求梳理，明确跨端同步与自动沉淀路径。
                      </p>
                    </div>
                    <div>
                      <span>02</span>
                      <p>
                        <b>值得改进</b>
                        部分一般优先级任务仍挤占了深度工作的连续时间。
                      </p>
                    </div>
                    <div>
                      <span>03</span>
                      <p>
                        <b>下周聚焦</b>
                        把重要任务提前锁定在上午，并减少临时切换。
                      </p>
                    </div>
                  </div>
                </section>
                <aside className="panel review-side">
                  <h3>本周数据</h3>
                  <div>
                    <span>任务完成率</span>
                    <strong>
                      {tasks.length
                        ? Math.round((completed / tasks.length) * 100)
                        : 0}
                      %
                    </strong>
                  </div>
                  <div>
                    <span>专注时长</span>
                    <strong>18.5h</strong>
                  </div>
                  <div>
                    <span>知识新增</span>
                    <strong>+{knowledge.length}</strong>
                  </div>
                  <hr />
                  <blockquote>“进步的证据，藏在每一次认真复盘里。”</blockquote>
                </aside>
              </div>
            </section>
          )}

          {view === "简历投递" && (
            <CareerWorkspace
              jobs={rankedJobs}
              market={jobMarket}
              applications={applications}
              resume={resume}
              resumeSkills={resumeSkills}
              jobsLoading={jobsLoading}
              jobsLoadingMore={jobsLoadingMore}
              onRefreshJobs={refreshJobs}
              onLoadMoreJobs={loadMoreJobs}
              onTrackJob={handleTrackOpening}
              onOpenResume={() => {
                setResumeDraft(resume?.content || "");
                setResumeFileName(resume?.fileName || "");
                setResumeModal(true);
              }}
              onAddApplication={() => {
                setEditingApplication(null);
                setApplicationModal(true);
              }}
              onEditApplication={(application) => {
                setEditingApplication(application);
                setApplicationModal(true);
              }}
              onDeleteApplication={deleteApplication}
              onUpdateApplicationStatus={updateApplicationStatus}
            />
          )}

          {showLegacyCareerWorkspace() && view === "简历投递" && (
            <section className="full-view career-view">
              <div className="view-title">
                <div>
                  <p>CAREER OPPORTUNITY RADAR</p>
                  <h1>岗位发现与简历投递</h1>
                  <h2>
                    导入个人简历后自动评估岗位匹配度，并从高到低推荐汽车、制造、机器人与科技行业机会。
                  </h2>
                </div>
                <div className="career-title-actions">
                  <button
                    className="secondary-action refresh-action"
                    disabled={jobsLoading}
                    onClick={refreshJobs}
                    aria-label="刷新岗位信息"
                  >
                    <span aria-hidden="true">↻</span>{" "}
                    {jobsLoading ? "刷新中…" : "刷新岗位"}
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setEditingApplication(null);
                      setApplicationModal(true);
                    }}
                  >
                    ＋ 手动新增投递
                  </button>
                </div>
              </div>
              <div
                className="career-mode-tabs"
                role="tablist"
                aria-label="岗位与投递视图"
              >
                <button
                  className={careerMode === "discover" ? "active" : ""}
                  onClick={() => setCareerMode("discover")}
                >
                  <span>01</span>岗位发现<em>{jobMarket?.jobs.length || 0}</em>
                </button>
                <button
                  className={careerMode === "pipeline" ? "active" : ""}
                  onClick={() => setCareerMode("pipeline")}
                >
                  <span>02</span>投递记录<em>{applications.length}</em>
                </button>
              </div>
              <section
                className={`resume-match-panel panel ${resume ? "ready" : "empty"}`}
              >
                <div className="resume-identity">
                  <span>{resume ? "✓" : "CV"}</span>
                  <div>
                    <small>PERSONAL RESUME</small>
                    <h3>{resume ? resume.fileName : "导入你的个人简历"}</h3>
                    <p>
                      {resume
                        ? `更新于 ${resume.updatedAt} · 已识别 ${resume.content.length.toLocaleString("zh-CN")} 字`
                        : "支持 PDF、DOCX、TXT 和 Markdown，也可以直接粘贴简历文字。"}
                    </p>
                  </div>
                </div>
                {resume && (
                  <div className="resume-skill-preview">
                    <small>已识别能力</small>
                    <div>
                      {resumeSkills.length ? (
                        resumeSkills.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))
                      ) : (
                        <span>等待识别更多技能</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="resume-sort-state">
                  <b>{resume ? "已启用简历匹配排序" : "导入后开启智能排序"}</b>
                  <p>
                    {resume
                      ? "岗位会综合行业、职能、岗位名称和技能重合度计算匹配分，并按分数从高到低展示。"
                      : "简历只用于当前账号的岗位匹配，可随时更新。"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setResumeDraft(resume?.content || "");
                    setResumeFileName(resume?.fileName || "");
                    setResumeModal(true);
                  }}
                >
                  {resume ? "查看与更新" : "开始导入"}
                  <span>→</span>
                </button>
              </section>
              {careerMode === "discover" ? (
                <>
                  <div className="job-toolbar panel">
                    <label className="job-search">
                      <span>⌕</span>
                      <input
                        value={jobQuery}
                        onChange={(event) => setJobQuery(event.target.value)}
                        placeholder="搜索公司、岗位、城市或技能…"
                      />
                    </label>
                    <div className="job-filter-row">
                      <small>行业</small>
                      {["全部", "汽车", "制造", "机器人", "科技"].map(
                        (item) => (
                          <button
                            key={item}
                            className={jobIndustry === item ? "active" : ""}
                            onClick={() => setJobIndustry(item)}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="job-filter-row">
                      <small>职能</small>
                      {["全部", "研发", "测试", "产品", "质量", "工艺"].map(
                        (item) => (
                          <button
                            key={item}
                            className={jobFunction === item ? "active" : ""}
                            onClick={() => setJobFunction(item)}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="job-filter-row">
                      <small>岗位性质</small>
                      {["全部", "企业", "国企/央企", "事业编制", "公务员"].map(
                        (item) => (
                          <button
                            key={item}
                            className={jobNature === item ? "active" : ""}
                            onClick={() => setJobNature(item)}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    </div>
                    <label className="job-city-select">
                      <small>城市</small>
                      <select
                        value={jobCity}
                        onChange={(event) => setJobCity(event.target.value)}
                      >
                        {availableJobCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="job-source-notice">
                    <span>∞</span>
                    <div>
                      <b>持续收录，不设置岗位数量上限</b>
                      <p>
                        已接入企业官网、国聘/国资央企平台及BOSS公开搜索页；只读取无需登录的公开内容，不绕过验证码或访问限制。
                      </p>
                    </div>
                  </div>
                  <div className="job-result-meta">
                    <div>
                      <b>
                        {jobsLoading
                          ? "正在核验…"
                          : `${visibleJobs.length} 个匹配方向`}
                      </b>
                      <span>
                        {resume
                          ? "已按简历匹配度从高到低排序"
                          : "导入简历后可开启个性化排序"}{" "}
                        · 已加载 {jobMarket?.jobs.length || 0} / 当前发现{" "}
                        {jobMarket?.totalKnown || 0}
                      </span>
                    </div>
                  </div>
                  <div className="job-grid">
                    {visibleJobs.map((job, index) => (
                      <article className="job-card panel" key={job.id}>
                        <span className="job-rank">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="job-card-head">
                          <div className="company-mark">
                            {job.company.slice(0, 1)}
                          </div>
                          <div>
                            <span>{job.company}</span>
                            <h3>{job.role}</h3>
                          </div>
                          <b>
                            {job.resumeScore}
                            <small>% {resume ? "RESUME MATCH" : "MATCH"}</small>
                          </b>
                        </div>
                        <div className="job-badges">
                          <em
                            className={
                              job.employmentType === "公务员"
                                ? "public-service"
                                : job.employmentType === "事业编制"
                                  ? "institution"
                                  : job.employmentType === "国企/央企"
                                    ? "state-owned"
                                    : job.sourceKind === "具体职位"
                                      ? "specific"
                                      : job.sourceKind === "平台搜索"
                                        ? "platform"
                                        : "collection"
                            }
                          >
                            {job.employmentType || "企业"}
                          </em>
                          <em
                            className={
                              job.sourceKind === "具体职位"
                                ? "specific"
                                : job.sourceKind === "平台搜索"
                                  ? "platform"
                                  : "collection"
                            }
                          >
                            {job.sourceKind}
                          </em>
                          <span>{job.industry}</span>
                          <span>{job.function}</span>
                          {job.tags.slice(0, 2).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        {resume && (
                          <div className="resume-job-fit">
                            <div>
                              <b>匹配能力</b>
                              <span>
                                {job.matchedSkills.length
                                  ? job.matchedSkills.join(" · ")
                                  : "行业与职能方向相符"}
                              </span>
                            </div>
                            {job.missingSkills.length > 0 && (
                              <div className="gap">
                                <b>建议补充</b>
                                <span>{job.missingSkills.join(" · ")}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p>{job.summary}</p>
                        <dl>
                          <div>
                            <dt>工作地点</dt>
                            <dd>{job.locations.join(" · ")}</dd>
                          </div>
                          <div>
                            <dt>经验类型</dt>
                            <dd>{job.experience}</dd>
                          </div>
                          <div>
                            <dt>学历要求</dt>
                            <dd>{job.education}</dd>
                          </div>
                        </dl>
                        <div className={`job-source ${job.verification}`}>
                          <span>
                            {job.verification === "verified"
                              ? "✓"
                              : job.verification === "reachable"
                                ? "●"
                                : "!"}
                          </span>
                          <div>
                            <b>{job.sourceLevel}</b>
                            <small>
                              {job.source} · {job.verifiedAt}
                            </small>
                          </div>
                        </div>
                        <footer>
                          <button onClick={() => handleTrackOpening(job)}>
                            ＋ 加入投递追踪
                          </button>
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            前往官方投递 <span>↗</span>
                          </a>
                        </footer>
                      </article>
                    ))}
                  </div>
                  {jobMarket?.nextCursor && (
                    <button
                      className="job-load-more"
                      onClick={loadMoreJobs}
                      disabled={jobsLoadingMore}
                    >
                      <span>
                        {jobsLoadingMore
                          ? "正在读取并核验更多来源…"
                          : "继续采集更多岗位"}
                      </span>
                      <small>
                        当前已加载 {jobMarket.jobs.length}{" "}
                        条，后续结果会追加到列表，不会覆盖已有岗位
                      </small>
                    </button>
                  )}
                  {!jobMarket?.nextCursor && jobMarket?.jobs.length ? (
                    <div className="job-crawl-end">
                      <span>✓</span>
                      本轮公开来源已全部加载；重新查询时会继续检查新岗位并追加来源。
                    </div>
                  ) : null}
                  {!jobsLoading && !visibleJobs.length && (
                    <div className="empty-state">
                      暂时没有符合筛选条件的岗位，请调整行业、职能或关键词。
                    </div>
                  )}
                  {jobMarket?.methodology && (
                    <p className="methodology-note">
                      核验方法：{jobMarket.methodology}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="pipeline-stats">
                    <article>
                      <small>全部机会</small>
                      <strong>{applications.length}</strong>
                      <span>已建立追踪</span>
                    </article>
                    <article>
                      <small>进行中</small>
                      <strong>{applicationProgress}</strong>
                      <span>笔试 · 面试 · Offer</span>
                    </article>
                    <article>
                      <small>面试</small>
                      <strong>
                        {
                          applications.filter((item) => item.status === "面试")
                            .length
                        }
                      </strong>
                      <span>需要准备</span>
                    </article>
                    <article>
                      <small>Offer</small>
                      <strong>
                        {
                          applications.filter((item) => item.status === "Offer")
                            .length
                        }
                      </strong>
                      <span>已达成</span>
                    </article>
                  </div>
                  <div className="application-toolbar panel">
                    <label className="application-search">
                      <span>⌕</span>
                      <input
                        value={applicationQuery}
                        onChange={(event) =>
                          setApplicationQuery(event.target.value)
                        }
                        placeholder="搜索公司、岗位、渠道或下一步行动…"
                      />
                    </label>
                    <div className="application-filter-row">
                      <small>视图</small>
                      {(["全部", "进行中", "已结束"] as const).map((filter) => (
                        <button
                          key={filter}
                          className={
                            applicationFilter === filter ? "active" : ""
                          }
                          onClick={() => setApplicationFilter(filter)}
                        >
                          {filter}
                          <em>
                            {filter === "全部"
                              ? applications.length
                              : filter === "进行中"
                                ? applications.filter(
                                    (item) =>
                                      !["Offer", "结束"].includes(item.status),
                                  ).length
                                : applications.filter((item) =>
                                    ["Offer", "结束"].includes(item.status),
                                  ).length}
                          </em>
                        </button>
                      ))}
                    </div>
                    <div className="application-toolbar-meta">
                      <b>{visibleApplications.length} 条记录</b>
                      <span>按推进阶段与最近更新排序</span>
                    </div>
                  </div>
                  <div className="application-list">
                    {visibleApplications.map((item) => {
                      const currentStage = applicationStageIndex(item.status);
                      return (
                        <article
                          className={`application-card panel status-card-${applicationStatusKey(item.status)}`}
                          key={item.id}
                        >
                          <div className="company-mark">
                            {item.company.slice(0, 1)}
                          </div>
                          <div className="application-copy">
                            <div className="application-heading">
                              <div>
                                <h3>{item.role}</h3>
                                <span>{item.company}</span>
                              </div>
                              <em
                                className={`application-status-pill status-${applicationStatusKey(item.status)}`}
                              >
                                {item.status}
                              </em>
                            </div>
                            <p>
                              {item.notes ||
                                "暂无备注，可点击编辑补充岗位要点。"}
                            </p>
                            <div
                              className="application-stage-track"
                              aria-label={`${item.company}投递进度`}
                            >
                              {(
                                [
                                  "待投递",
                                  "已投递",
                                  "笔试",
                                  "面试",
                                  "Offer",
                                ] as ApplicationStatus[]
                              ).map((stage, index) => (
                                <div
                                  className={
                                    index < currentStage
                                      ? "completed"
                                      : index === currentStage
                                        ? "current"
                                        : ""
                                  }
                                  key={stage}
                                >
                                  <i />
                                  <span>{stage}</span>
                                </div>
                              ))}
                            </div>
                            <footer>
                              <span>渠道 · {item.channel}</span>
                              <span>投递 · {item.appliedAt}</span>
                              <span>下一步 · {item.nextAction}</span>
                            </footer>
                          </div>
                          <div className="application-next">
                            <small>NEXT ACTION</small>
                            <b>{item.nextAction}</b>
                            <div className="application-card-actions">
                              <select
                                aria-label={`${item.company}投递状态`}
                                value={item.status}
                                onChange={(event) =>
                                  updateApplicationStatus(
                                    item,
                                    event.target.value as ApplicationStatus,
                                  )
                                }
                              >
                                {(
                                  [
                                    "待投递",
                                    "已投递",
                                    "笔试",
                                    "面试",
                                    "Offer",
                                    "结束",
                                  ] as ApplicationStatus[]
                                ).map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingApplication(item);
                                  setApplicationModal(true);
                                }}
                              >
                                编辑记录
                              </button>
                              <button
                                className="application-delete"
                                type="button"
                                aria-label={`删除${item.company}${item.role}投递记录`}
                                onClick={() => deleteApplication(item)}
                              >
                                删除记录
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {!visibleApplications.length && (
                      <div className="empty-state">
                        没有符合筛选条件的投递记录，可以调整搜索词或切换视图。
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {view === "AI 模型" && (
            <section className="full-view ai-center-view">
              <section className="panel ai-center-hero">
                <div className="ai-center-hero-copy">
                  <p>AI MODEL ORCHESTRATOR</p>
                  <h1>AI 模型中心</h1>
                  <h2>统一调度模型连接、即时查询与自动任务，在一个工作面板中查看状态和结果。</h2>
                  <div className="ai-center-active-model" aria-live="polite">
                    <span className={activeAIConnection?.status === "connected" ? "online" : ""} />
                    <div>
                      <small>{aiLoading ? "正在检查模型状态" : activeAIConnection?.status === "error" ? "当前模型需要检查" : activeAIConnection ? "当前默认模型" : "尚未连接模型"}</small>
                      <b>{activeAIConnection ? `${providerLabel(activeAIConnection.provider)} · ${activeAIConnection.model}` : "连接模型后即可开始查询"}</b>
                    </div>
                  </div>
                </div>
                <div className="ai-center-hero-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => document.getElementById("ai-query-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >✦ 立即查询</button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingConnection(null);
                      setAiConnectionModal(true);
                    }}
                  >＋ 连接模型</button>
                  <button
                    type="button"
                    disabled={!aiData?.connections.length}
                    onClick={() => {
                      setEditingSchedule(null);
                      setAiScheduleModal(true);
                    }}
                  >◷ 新建自动任务</button>
                </div>
                <div className="ai-center-overview">
                  <article><span>模型连接</span><b>{aiData?.connections.length || 0}</b><small>{aiData?.connections.filter((item) => item.status === "connected").length || 0} 个已验证</small></article>
                  <article><span>自动任务</span><b>{aiData?.schedules.filter((item) => item.enabled).length || 0}</b><small>{aiData?.schedules.length || 0} 个任务</small></article>
                  <article><span>运行记录</span><b>{aiData?.runs.length || 0}</b><small>{aiData?.runs.filter((item) => item.status === "succeeded").length || 0} 次成功</small></article>
                  <article><span>联网查询</span><b>{aiUseWeb ? "开启" : "关闭"}</b><small>可在查询区切换</small></article>
                </div>
              </section>
              <ChatGPTSubscriptionAccount account={aiData?.account} />
              <div className="ai-account-strip panel">
                <span className={activeAIConnection ? "connected" : "local"}>
                  GPT
                </span>
                <div className="ai-account-copy">
                  <b>GPT 账户与模型</b>
                  <small>
                    {activeAIConnection
                      ? `${activeAIConnection.name} · ${activeAIConnection.model}`
                      : "尚未选择已登录 GPT 账号"}
                  </small>
                </div>
                <label className="ai-account-switcher">
                  <span>当前账户 / 模型</span>
                  <select
                    value={activeAIConnection?.id || 0}
                    onChange={(event) =>
                      switchAIConnection(Number(event.target.value))
                    }
                    aria-label="切换 GPT 账户与模型"
                  >
                    <option value={0}>选择账户</option>
                    {aiData?.connections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {providerLabel(item.provider)} · {item.name} ·{" "}
                        {item.model}
                      </option>
                    ))}
                    <option value={-1}>＋ 已登录 GPT 账号</option>
                  </select>
                </label>
                <button
                  className="ai-add-account"
                  type="button"
                  onClick={() => {
                    setEditingConnection(null);
                    setAiConnectionModal(true);
                  }}
                >
                  ＋ 已登录账号
                </button>
                <em>密钥服务端加密</em>
              </div>
              <section className="ai-connection-section" id="ai-model-connections">
                <div className="panel-head">
                  <div>
                    <h3>模型连接</h3>
                    <p>
                      点击设为默认后，快速查询与新建定时任务会优先使用该模型
                    </p>
                  </div>
                  <span>{aiData?.connections.length || 0} 个模型</span>
                </div>
                <div className="ai-connection-grid">
                  {aiLoading ? (
                    <div className="empty-state">正在加载模型连接…</div>
                  ) : (
                    aiData?.connections.map((connection) => (
                      <article
                        className={`ai-connection-card panel ${connection.isActive ? "active" : ""}`}
                        key={connection.id}
                      >
                        <header>
                          <span>
                            {providerLabel(connection.provider).slice(0, 2)}
                          </span>
                          <div>
                            <small>{providerLabel(connection.provider)}</small>
                            <h3>{connection.name}</h3>
                          </div>
                          <em
                            className={
                              connection.status === "error" ? "error" : "ok"
                            }
                          >
                            {connection.status === "connected"
                              ? "● 已验证"
                              : connection.status === "error"
                                ? "● 需检查"
                                : "● 已配置"}
                          </em>
                        </header>
                        <strong>{connection.model}</strong>
                        <p>{connection.baseUrl || "使用厂商官方接口"}</p>
                        <footer>
                          {connection.isActive ? (
                            <b>✓ 当前默认</b>
                          ) : (
                            <button
                              onClick={() =>
                                aiAction(
                                  { action: "set-active", id: connection.id },
                                  "默认模型已切换",
                                )
                              }
                            >
                              设为默认
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingConnection(connection);
                              setAiConnectionModal(true);
                            }}
                          >
                            编辑
                          </button>
                          <button
                            className="danger-link"
                            onClick={() =>
                              aiAction(
                                {
                                  action: "delete-connection",
                                  id: connection.id,
                                },
                                "模型连接已删除",
                              )
                            }
                          >
                            删除
                          </button>
                        </footer>
                      </article>
                    ))
                  )}
                  {!aiLoading && !aiData?.connections.length && (
                    <div className="ai-onboarding panel">
                      <span>✦</span>
                      <h3>连接第一个 AI 模型</h3>
                      <p>
                        支持 OpenAI、DeepSeek、Claude、Gemini 和 OpenAI
                        兼容接口。API Key 只会加密后保存。
                      </p>
                      <button
                        className="primary"
                        onClick={() => setAiConnectionModal(true)}
                      >
                        添加模型连接
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <div className="ai-work-grid">
                <section className="panel ai-query-panel" id="ai-query-workbench">
                  <div className="panel-head">
                    <div>
                      <h3>即时数据查询</h3>
                      <p>切换账户或模型后直接发起研究、摘要或信息核验</p>
                    </div>
                    <span className={aiRunning ? "ai-pulse" : ""}>
                      {aiRunning ? "运行中" : "READY"}
                    </span>
                  </div>
                  <div className="ai-query-controls">
                    <select
                      value={aiConnectionId}
                      onChange={(event) =>
                        switchAIConnection(Number(event.target.value))
                      }
                      aria-label="选择查询账户与模型"
                    >
                      <option value={0}>选择账户与模型</option>
                      {aiData?.connections.map((item) => (
                        <option key={item.id} value={item.id}>
                          {providerLabel(item.provider)} · {item.name} ·{" "}
                          {item.model}
                        </option>
                      ))}
                      <option value={-1}>＋ 已登录 GPT 账号</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={aiUseWeb}
                        onChange={(event) => setAiUseWeb(event.target.checked)}
                      />
                      联网检索（OpenAI 支持）
                    </label>
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={7}
                    placeholder="例如：检索本周汽车、机器人和半导体行业的重要官方信息，按影响程度排序并附来源线索。"
                  />
                  <div className="ai-prompt-templates">
                    {["行业资讯核验", "岗位信息整理", "技术资料总结"].map(
                      (item) => (
                        <button
                          key={item}
                          onClick={() =>
                            setAiPrompt(
                              item === "行业资讯核验"
                                ? "检索最近一周汽车、机器人和半导体行业的重要官方信息，说明事实、影响和需要继续核验的部分。"
                                : item === "岗位信息整理"
                                  ? "整理汽车、制造、机器人和科技行业的研发、测试、产品、质量、工艺岗位信息，按匹配度输出。"
                                  : "将输入的技术资料整理为原理、数学模型、主流方法、工程步骤和适用边界。",
                            )
                          }
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className="submit ai-run-button"
                    onClick={runAIQuery}
                    disabled={aiRunning}
                  >
                    {aiRunning ? "模型正在查询…" : "✦ 开始查询"}
                    <span>→</span>
                  </button>
                  {aiResult && (
                    <article className="ai-result">
                      <small>MODEL RESPONSE</small>
                      <pre>{aiResult}</pre>
                    </article>
                  )}
                </section>
                <section className="panel ai-schedule-panel" id="ai-schedule-workbench">
                  <div className="panel-head">
                    <div>
                      <h3>定时查询</h3>
                      <p>服务器每 5 分钟检查一次，到点自动执行</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingSchedule(null);
                        setAiScheduleModal(true);
                      }}
                    >
                      ＋ 新建
                    </button>
                  </div>
                  <div className="ai-schedule-list">
                    {aiData?.schedules.map((schedule) => (
                      <article key={schedule.id}>
                        <button
                          className={`schedule-switch ${schedule.enabled ? "on" : ""}`}
                          onClick={() =>
                            aiAction(
                              {
                                action: "toggle-schedule",
                                id: schedule.id,
                                enabled: !schedule.enabled,
                              },
                              schedule.enabled
                                ? "定时任务已暂停"
                                : "定时任务已恢复",
                            )
                          }
                        >
                          <i />
                        </button>
                        <div>
                          <h4>{schedule.title}</h4>
                          <p>
                            {schedule.connectionName} · {schedule.model}
                          </p>
                          <small>
                            下次：
                            {schedule.enabled
                              ? formatAIRunTime(schedule.nextRunAt)
                              : "已暂停"}{" "}
                            · 上次：{formatAIRunTime(schedule.lastRunAt)}
                          </small>
                        </div>
                        <span>
                          {schedule.cadence === "hourly"
                            ? "每小时"
                            : schedule.cadence === "daily"
                              ? `每天 ${schedule.timeOfDay}`
                              : `每周 ${schedule.timeOfDay}`}
                        </span>
                        <div className="schedule-actions">
                          <button
                            onClick={() =>
                              aiAction(
                                { action: "run-schedule", id: schedule.id },
                                "定时查询已立即执行",
                              )
                            }
                          >
                            立即运行
                          </button>
                          <button
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setAiScheduleModal(true);
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() =>
                              aiAction(
                                { action: "delete-schedule", id: schedule.id },
                                "定时任务已删除",
                              )
                            }
                          >
                            删除
                          </button>
                        </div>
                      </article>
                    ))}
                    {!aiData?.schedules.length && (
                      <div className="empty-state">
                        还没有定时任务。连接模型后，可设置每小时、每天或每周自动查询。
                      </div>
                    )}
                  </div>
                </section>
              </div>
              <section className="panel ai-history" id="ai-run-history">
                <div className="panel-head">
                  <div>
                    <h3>运行历史</h3>
                    <p>即时查询和定时任务的结果都可追溯</p>
                  </div>
                  <span>{aiData?.runs.length || 0} 条</span>
                </div>
                <div className="ai-run-table">
                  {aiData?.runs.slice(0, 10).map((run) => (
                    <article key={run.id}>
                      <span className={run.status}>
                        {run.status === "succeeded"
                          ? "✓"
                          : run.status === "failed"
                            ? "!"
                            : "…"}
                      </span>
                      <div>
                        <b>
                          {run.connectionName || "已删除模型"} · {run.model}
                        </b>
                        <p>{run.prompt}</p>
                      </div>
                      <time>{formatAIRunTime(run.startedAt)}</time>
                      <em>
                        {run.status === "succeeded"
                          ? "成功"
                          : run.status === "failed"
                            ? run.error || "失败"
                            : "运行中"}
                      </em>
                    </article>
                  ))}
                  {!aiData?.runs.length && (
                    <div className="empty-state">
                      完成首次查询后，运行记录会显示在这里。
                    </div>
                  )}
                </div>
              </section>
            </section>
          )}

          {view === "股票" && (
            <StockWorkspace
              market={market}
              loading={marketLoading}
              onRefresh={refreshStocks}
              onNotify={setToast}
            />
          )}

          {view === "行业速览" && <IndustryWorkspace onNotify={setToast} />}

          {showLegacyIndustryWorkspace() && (
            <section className="full-view insight-view">
              <div className="view-title">
                <div>
                  <p>INDUSTRY BRIEF</p>
                  <h1>行业讯息速览</h1>
                  <h2>
                    行业趋势与相关企业动态分开展示，优先收录官方原文并标注发布时间。
                  </h2>
                </div>
                <div className="industry-title-actions">
                  <button
                    className="secondary-action refresh-action"
                    disabled={marketLoading}
                    onClick={refreshIndustryBrief}
                    aria-label="刷新行业资讯"
                  >
                    <span aria-hidden="true">↻</span>{" "}
                    {marketLoading ? "刷新中…" : "刷新"}
                  </button>
                  <button
                    className="secondary-action"
                    onClick={() =>
                      setToast(
                        "系统每30分钟重新访问官方原文；待复核资料不会进入资讯流",
                      )
                    }
                  >
                    ◷ 核验说明
                  </button>
                </div>
              </div>
              <div className="industry-tabs">
                {["汽车", "机器人", "半导体", "互联网大厂", "制造业"].map(
                  (item) => (
                    <button
                      key={item}
                      className={industry === item ? "active" : ""}
                      onClick={() => setIndustry(item)}
                    >
                      {item}
                      <span>
                        {market?.news.filter(
                          (news) =>
                            news.industry === item &&
                            news.verification === "verified",
                        ).length || 0}
                      </span>
                    </button>
                  ),
                )}
              </div>
              <div className="news-lens-tabs">
                <span>信息范围</span>
                {(["全部", "行业趋势", "企业动态"] as const).map((lens) => (
                  <button
                    key={lens}
                    className={industryLens === lens ? "active" : ""}
                    onClick={() => setIndustryLens(lens)}
                  >
                    {lens}
                    {lens === "企业动态" && (
                      <small>
                        {market?.news.filter(
                          (news) =>
                            news.industry === industry &&
                            news.topic === "company" &&
                            news.verification === "verified",
                        ).length || 0}
                      </small>
                    )}
                  </button>
                ))}
              </div>
              <div className="news-layout">
                <section className="news-feed">
                  {visibleNews.map((item, index) => (
                    <a
                      className="news-card panel"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      key={item.id}
                    >
                      <span className="news-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="news-meta">
                          <b>
                            {item.company
                              ? `${item.company} · ${item.source}`
                              : item.source}
                          </b>
                          <time>{item.publishedAt}</time>
                          <em
                            className={
                              item.topic === "company"
                                ? "source-company"
                                : "source-verified"
                            }
                          >
                            {item.topic === "company"
                              ? "企业动态"
                              : "行业资料已核验"}
                          </em>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                        <footer>
                          {item.sourceLevel} · 核验于 {item.verifiedAt}{" "}
                          <span>查看原文 ↗</span>
                        </footer>
                      </div>
                    </a>
                  ))}
                  {!marketLoading && !visibleNews.length && (
                    <div className="empty-state">
                      该筛选范围暂时没有通过核验的资讯。
                    </div>
                  )}
                </section>
                <aside className="panel signal-card">
                  <small>VERIFICATION RULES</small>
                  <h3>{industry}资料核验规则</h3>
                  <div>
                    <span>01</span>
                    <p>
                      <b>来源分级</b>政府、标准机构、交易所和公司公告优先。
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      <b>企业动态</b>
                      优先收录企业新闻中心、投资者关系和官方公告。
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      <b>交叉证据</b>关键数字和工程公式至少核对两个独立来源。
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          )}
        </div>
      </section>

      {taskModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setTaskModal(false);
            setEditingTask(null);
          }}
        >
          <form
            key={editingTask?.id ?? "new"}
            className="modal"
            onSubmit={saveTask}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>{editingTask ? "EDIT TASK" : "NEW TASK"}</small>
                <h2>{editingTask ? "编辑任务" : "新建任务"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTaskModal(false);
                  setEditingTask(null);
                }}
              >
                ×
              </button>
            </div>
            <label>
              任务名称
              <input
                name="title"
                required
                autoFocus
                defaultValue={editingTask?.title || ""}
                placeholder="准备完成什么？"
              />
            </label>
            <label>
              补充说明
              <input
                name="detail"
                defaultValue={editingTask?.detail || ""}
                placeholder="项目、目标或相关背景"
              />
            </label>
            <div className="form-grid">
              <label>
                时间范围
                <select
                  name="horizon"
                  defaultValue={editingTask?.horizon || horizon}
                >
                  <option>今日</option>
                  <option>本周</option>
                  <option>年度</option>
                </select>
              </label>
              <label>
                优先级
                <select
                  name="priority"
                  defaultValue={editingTask?.priority || "一般"}
                >
                  <option>优先</option>
                  <option>一般</option>
                  <option>不重要</option>
                </select>
              </label>
            </div>
            <label>
              时间提示
              <input
                name="date"
                defaultValue={editingTask?.date || ""}
                placeholder="例如：今天 14:00"
              />
            </label>
            <label>
              所属项目
              <select
                name="projectId"
                defaultValue={editingTask?.projectId || ""}
              >
                <option value="">不关联项目</option>
                {workspaceProjects
                  .filter((project) => project.status !== "已完成")
                  .map((project) => (
                    <option value={project.id} key={project.id}>
                      {project.title}
                    </option>
                  ))}
              </select>
            </label>
            <button className="submit" type="submit">
              {editingTask ? "保存修改" : "创建任务"} <span>→</span>
            </button>
          </form>
        </div>
      )}

      {captureModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setCaptureModal(false)}
        >
          <form
            className="modal capture-modal"
            onSubmit={addKnowledge}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>SMART CAPTURE</small>
                <h2>快速收录知识</h2>
              </div>
              <button type="button" onClick={() => setCaptureModal(false)}>
                ×
              </button>
            </div>
            <p className="ai-hint">
              <span>✦</span>{" "}
              粘贴对话、想法或网址后，系统会按内容分类，并检索标准、政府、高校与厂商一手资料进行交叉核对；来源不足时只保存为“待复核”，不会伪装成正确结论。
            </p>
            <div className="form-grid">
              <label>
                内容类型
                <select name="sourceType">
                  <option>AI 对话</option>
                  <option>网址</option>
                  <option>手动输入</option>
                </select>
              </label>
              <label>
                原始输入来源
                <select name="source">
                  <option>Codex</option>
                  <option>DeepSeek</option>
                  <option>网页</option>
                  <option>手动</option>
                </select>
              </label>
            </div>
            <label>
              标题（可选）
              <input name="title" placeholder="系统会根据内容生成" />
            </label>
            <label>
              内容或网址
              <textarea
                name="content"
                required
                placeholder="可粘贴对话、技术资料或公开网址…"
                rows={6}
              />
            </label>
            <div className="auto-taxonomy">
              <span>◎</span>
              <div>
                <b>资料采集、交叉核验与专业扩充</b>
                <small>原始输入、外部证据和系统结论分层展示，全程可追溯</small>
              </div>
            </div>
            <button className="submit" type="submit">
              ✦ 收录、检索并核验 <span>→</span>
            </button>
          </form>
        </div>
      )}

      {documentModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setDocumentModal(false)}
        >
          <form
            className="modal document-modal"
            onSubmit={addKnowledgeDocument}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>DOCUMENT TO KNOWLEDGE</small>
                <h2>添加文档到知识库</h2>
              </div>
              <button type="button" onClick={() => setDocumentModal(false)}>
                ×
              </button>
            </div>
            <label
              className={`resume-upload document-upload ${documentParsing ? "parsing" : ""}`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown,.csv"
                onChange={handleKnowledgeDocument}
                disabled={documentParsing}
              />
              <span>{documentParsing ? "…" : "↑"}</span>
              <div>
                <b>
                  {documentParsing
                    ? "正在读取并分析文档"
                    : documentFileName || "选择需要收录的文档"}
                </b>
                <small>支持 PDF、DOCX、TXT、Markdown、CSV，最大 12 MB</small>
              </div>
            </label>
            {documentPreview ? (
              <>
                <label>
                  知识标题
                  <input
                    value={documentTitle}
                    onChange={(event) =>
                      setDocumentTitle(event.target.value.slice(0, 160))
                    }
                    placeholder="文档标题"
                  />
                </label>
                <section className="document-summary-preview">
                  <header>
                    <div>
                      <small>自动识别结果</small>
                      <b>
                        {documentPreview.primaryCategory} <i>›</i>{" "}
                        {documentPreview.secondaryCategory}
                      </b>
                    </div>
                    <span>{documentPreview.confidence}% 分类置信度</span>
                  </header>
                  <p>{documentPreview.summary}</p>
                  <footer>
                    <span>
                      {documentDraft.length.toLocaleString("zh-CN")} 字
                    </span>
                    <span>来源：{documentFileName}</span>
                  </footer>
                </section>
                <label className="document-content-preview">
                  已提取正文
                  <textarea
                    value={documentDraft}
                    onChange={(event) =>
                      setDocumentDraft(event.target.value.slice(0, 120000))
                    }
                    rows={7}
                  />
                </label>
                <p className="document-privacy-note">
                  仅保存提取后的正文、分类和结构化总结，不保存原始文件。
                </p>
              </>
            ) : (
              <div className="document-empty-guide">
                <span>01</span>
                <p>
                  <b>读取正文</b>自动提取文档中的可复制文字。
                </p>
                <span>02</span>
                <p>
                  <b>理解与总结</b>生成摘要、知识路径和专业扩充。
                </p>
                <span>03</span>
                <p>
                  <b>写入知识库</b>按内容归类并保留文件来源。
                </p>
              </div>
            )}
            <button
              className="submit"
              type="submit"
              disabled={documentParsing || !documentPreview}
            >
              {documentParsing ? "正在读取…" : "✦ 总结并加入知识库"}{" "}
              <span>→</span>
            </button>
          </form>
        </div>
      )}

      {resumeModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setResumeModal(false)}
        >
          <form
            className="modal resume-modal"
            onSubmit={saveResume}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>RESUME MATCHING PROFILE</small>
                <h2>{resume ? "更新个人简历" : "导入个人简历"}</h2>
              </div>
              <button type="button" onClick={() => setResumeModal(false)}>
                ×
              </button>
            </div>
            <label
              className={`resume-upload ${resumeParsing ? "parsing" : ""}`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={handleResumeFile}
                disabled={resumeParsing}
              />
              <span>{resumeParsing ? "…" : "↑"}</span>
              <div>
                <b>
                  {resumeParsing
                    ? "正在读取简历内容"
                    : "选择 PDF、DOCX、TXT 或 Markdown"}
                </b>
                <small>文件最大 12 MB；也可以直接在下方粘贴简历文字</small>
              </div>
            </label>
            <label>
              简历名称
              <input
                value={resumeFileName}
                onChange={(event) => setResumeFileName(event.target.value)}
                maxLength={180}
                placeholder="例如：研发工程师简历.pdf"
              />
            </label>
            <label>
              简历内容
              <textarea
                autoFocus={!resume}
                value={resumeDraft}
                onChange={(event) =>
                  setResumeDraft(event.target.value.slice(0, 100000))
                }
                rows={12}
                placeholder="粘贴教育经历、工作或项目经历、技能、证书与求职方向。内容越完整，岗位匹配越准确。"
              />
            </label>
            <div className="resume-data-note">
              <span>◎</span>
              <p>
                系统会提取行业、职能和技能关键词用于岗位匹配，不会把简历内容展示在岗位页面之外。
              </p>
              <b>{resumeDraft.length.toLocaleString("zh-CN")} 字</b>
            </div>
            <button className="submit" type="submit" disabled={resumeParsing}>
              {resumeParsing ? "正在处理…" : "保存并重新匹配岗位"}{" "}
              <span>→</span>
            </button>
          </form>
        </div>
      )}
      {applicationModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setApplicationModal(false);
            setEditingApplication(null);
          }}
        >
          <form
            key={editingApplication?.id || "new-application"}
            className="modal application-modal"
            onSubmit={addApplication}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>
                  {editingApplication ? "EDIT APPLICATION" : "NEW APPLICATION"}
                </small>
                <h2>{editingApplication ? "编辑投递记录" : "新增投递记录"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApplicationModal(false);
                  setEditingApplication(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                公司
                <input
                  name="company"
                  required
                  autoFocus
                  defaultValue={editingApplication?.company || ""}
                  placeholder="公司名称"
                />
              </label>
              <label>
                职位
                <input
                  name="role"
                  required
                  defaultValue={editingApplication?.role || ""}
                  placeholder="目标岗位"
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                当前状态
                <select
                  name="status"
                  defaultValue={editingApplication?.status || "已投递"}
                >
                  <option>待投递</option>
                  <option>已投递</option>
                  <option>笔试</option>
                  <option>面试</option>
                  <option>Offer</option>
                  <option>结束</option>
                </select>
              </label>
              <label>
                投递渠道
                <input
                  name="channel"
                  defaultValue={editingApplication?.channel || ""}
                  placeholder="官网 / 内推 / 招聘平台"
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                投递日期
                <input
                  name="appliedAt"
                  defaultValue={editingApplication?.appliedAt || ""}
                  placeholder="例如：今天"
                />
              </label>
              <label>
                下一步
                <input
                  name="nextAction"
                  defaultValue={editingApplication?.nextAction || ""}
                  placeholder="例如：周五前跟进"
                />
              </label>
            </div>
            <label>
              备注
              <textarea
                name="notes"
                rows={4}
                defaultValue={editingApplication?.notes || ""}
                placeholder="简历版本、岗位要点、联系人或面试准备…"
              />
            </label>
            <button className="submit" type="submit">
              {editingApplication ? "保存记录修改" : "保存投递记录"}{" "}
              <span>→</span>
            </button>
          </form>
        </div>
      )}

      {aiConnectionModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setAiConnectionModal(false);
            setEditingConnection(null);
          }}
        >
          <form
            key={editingConnection?.id || "new-ai"}
            className="modal ai-config-modal"
            onSubmit={saveAIConnection}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>SECURE MODEL CONNECTION</small>
                <h2>
                  {editingConnection
                    ? "编辑账户与模型"
                    : "选择已登录 GPT 账号或 AI 模型"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAiConnectionModal(false);
                  setEditingConnection(null);
                }}
              >
                ×
              </button>
            </div>
            {!editingConnection && (
              <section className="gpt-account-connect">
                <span>GPT</span>
                <div>
                  <small>已登录 GPT 账号</small>
                  <b>添加可切换的已登录账号</b>
                  <p>
                    每个账户可保存独立的 API Key
                    与默认模型，添加后可在顶部直接切换。
                  </p>
                </div>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  获取 API Key<i>↗</i>
                </a>
              </section>
            )}
            <p className="ai-security-note">
              <span>⌾</span>API Key 由服务端加密保存。
            </p>
            <div className="form-grid">
              <label>
                账户 / 连接名称
                <input
                  name="name"
                  required
                  autoFocus
                  defaultValue={editingConnection?.name || "我的 GPT 账号"}
                  placeholder="例如：工作账号、个人账号"
                />
              </label>
              <label>
                模型厂商
                <select
                  name="provider"
                  defaultValue={editingConnection?.provider || "openai"}
                >
                  <option value="openai">OpenAI / GPT</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="anthropic">Anthropic / Claude</option>
                  <option value="gemini">Google / Gemini</option>
                  <option value="custom">OpenAI 兼容接口</option>
                </select>
              </label>
            </div>
            <label>
              默认模型 ID
              <input
                name="model"
                required
                defaultValue={editingConnection?.model || "gpt-5.6-terra"}
                placeholder="例如：gpt-5.6-terra、deepseek-chat"
              />
            </label>
            <label>
              API Key
              <input
                name="apiKey"
                type="password"
                autoComplete="new-password"
                placeholder={
                  editingConnection?.hasKey
                    ? "已保存，留空则不修改"
                    : "粘贴此账户创建的 API Key"
                }
              />
            </label>
            <label>
              接口地址（可选）
              <input
                name="baseUrl"
                type="url"
                defaultValue={editingConnection?.baseUrl || ""}
                placeholder="官方接口无需填写；兼容接口填写 https://…/v1"
              />
            </label>
            <div className="provider-presets">
              <span>常用模型 ID</span>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "gpt-5.6-sol";
                }}
              >
                GPT-5.6 Sol
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "gpt-5.6-terra";
                }}
              >
                GPT-5.6 Terra
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "gpt-5.6-luna";
                }}
              >
                GPT-5.6 Luna
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "deepseek-chat";
                }}
              >
                DeepSeek Chat
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "claude-sonnet-4-5";
                }}
              >
                Claude Sonnet
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form)
                    (
                      form.elements.namedItem("model") as HTMLInputElement
                    ).value = "gemini-2.5-flash";
                }}
              >
                Gemini Flash
              </button>
            </div>
            <button className="submit" type="submit">
              安全保存并加入切换列表 <span>→</span>
            </button>
          </form>
        </div>
      )}

      {aiScheduleModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setAiScheduleModal(false);
            setEditingSchedule(null);
          }}
        >
          <form
            key={editingSchedule?.id || "new-schedule"}
            className="modal ai-schedule-modal"
            onSubmit={saveAISchedule}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>AUTOMATED MODEL RUN</small>
                <h2>{editingSchedule ? "编辑定时查询" : "新建定时查询"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAiScheduleModal(false);
                  setEditingSchedule(null);
                }}
              >
                ×
              </button>
            </div>
            <label>
              任务名称
              <input
                name="title"
                required
                autoFocus
                defaultValue={editingSchedule?.title || "每日行业资讯核验"}
                placeholder="例如：每日行业资讯核验"
              />
            </label>
            <label>
              执行模型
              <select
                name="connectionId"
                required
                defaultValue={
                  editingSchedule?.connectionId ||
                  aiConnectionId ||
                  aiData?.connections[0]?.id ||
                  0
                }
              >
                <option value={0}>选择模型</option>
                {aiData?.connections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.model}
                  </option>
                ))}
              </select>
            </label>
            <label>
              查询指令
              <textarea
                name="prompt"
                required
                rows={6}
                defaultValue={
                  editingSchedule?.prompt ||
                  "检索汽车、机器人和半导体行业最新官方信息，交叉核验后输出事实、影响、来源和待确认事项。"
                }
              />
            </label>
            <div className="form-grid">
              <label>
                运行频率
                <select
                  name="cadence"
                  defaultValue={editingSchedule?.cadence || "daily"}
                >
                  <option value="hourly">每小时</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </select>
              </label>
              <label>
                执行时间（北京时间）
                <input
                  name="timeOfDay"
                  type="time"
                  defaultValue={editingSchedule?.timeOfDay || "08:00"}
                />
              </label>
            </div>
            <label>
              每周执行日
              <input
                name="weekdays"
                defaultValue={editingSchedule?.weekdays || "1,2,3,4,5"}
                placeholder="1,2,3,4,5（周一至周五）"
              />
              <small className="field-help">
                使用 0—6
                表示周日至周六，逗号分隔；每小时或每天运行时会忽略此项。
              </small>
            </label>
            <label className="check-label">
              <input
                name="useWeb"
                type="checkbox"
                defaultChecked={editingSchedule?.useWeb ?? true}
              />
              使用模型联网检索能力（当前 OpenAI Responses API 支持）
            </label>
            <button className="submit" type="submit">
              启用定时查询 <span>→</span>
            </button>
          </form>
        </div>
      )}

      {profileModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setProfileModal(false)}
        >
          <form
            key={`${profile.displayName}-${profile.updatedAt || "profile"}`}
            className="modal profile-modal"
            onSubmit={saveProfile}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <small>PERSONAL PROFILE</small>
                <h2>编辑个人资料</h2>
              </div>
              <button type="button" onClick={() => setProfileModal(false)}>
                ×
              </button>
            </div>
            <div className="profile-preview">
              <span className={`avatar ${profile.accent}`}>
                {getAvatarInitial(profile.displayName)}
              </span>
              <div>
                <b>{profile.displayName}</b>
                <small>{profile.motto || "添加一句个人标签"}</small>
              </div>
            </div>
            <label>
              显示名称
              <input
                name="displayName"
                required
                autoFocus
                defaultValue={profile.displayName}
                maxLength={24}
                placeholder="你的姓名或昵称"
              />
            </label>
            <label>
              个人标签
              <input
                name="motto"
                defaultValue={profile.motto}
                maxLength={60}
                placeholder="例如：专注 · 自洽 · 成长"
              />
            </label>
            <fieldset className="profile-accent">
              <legend>
                头像颜色 <small>选择色块即可</small>
              </legend>
              {(
                [
                  "gold",
                  "blue",
                  "green",
                  "rose",
                  "violet",
                  "slate",
                ] as UserProfile["accent"][]
              ).map((accent) => (
                <label key={accent} title={`选择${accent}色头像`}>
                  <input
                    type="radio"
                    name="accent"
                    value={accent}
                    defaultChecked={profile.accent === accent}
                    aria-label={`选择${accent}色头像`}
                  />
                  <span className={`avatar ${accent}`} aria-hidden="true" />
                </label>
              ))}
            </fieldset>
            <button className="submit" type="submit">
              保存个人资料 <span>→</span>
            </button>
          </form>
        </div>
      )}

      {selectedKnowledge && selectedDigest && selectedTextbook && (
        <div
          className="modal-backdrop detail-backdrop"
          onMouseDown={() => setSelectedKnowledge(null)}
        >
          <article
            className="knowledge-detail textbook-detail"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="detail-header">
              <div className="detail-brand">
                <span>KNOWLEDGE DETAIL</span>
                <b>专业知识</b>
              </div>
              <div>
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(
                        `${selectedKnowledge.title}\n\n内容提要：${selectedKnowledge.summary}\n\n核心结论：${selectedDigest.takeaway}\n\n关键公式：\n${selectedDigest.equations.map((equation) => `${equation.name}：${equation.formula}`).join("\n")}`,
                      )
                      .then(() => setToast("知识内容摘要已复制"));
                  }}
                >
                  复制内容
                </button>
                <button
                  className="detail-close"
                  onClick={() => setSelectedKnowledge(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="detail-scroll">
              <div className="detail-path">
                <span>{selectedKnowledge.primaryCategory}</span>
                <i>›</i>
                <span>{selectedKnowledge.secondaryCategory}</span>
              </div>
              <section className="detail-intro">
                <h1>{selectedKnowledge.title}</h1>
                <h2>内容概述</h2>
                <p>
                  {emphasizeTechnicalText(selectedKnowledge.summary)}{" "}
                  内容按照概念与原理、数学模型、实现方法、案例验证和延伸阅读组织，图片只在能够直接解释当前结构、对象或流程时显示。
                </p>
                <div className="chapter-meta">
                  <div>
                    <b>建议基础</b>
                    {selectedTextbook.prerequisites.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div>
                    <b>关键词</b>
                    {selectedTextbook.concepts.slice(0, 5).map((item) => (
                      <span key={item.term}>{item.term}</span>
                    ))}
                  </div>
                </div>
                <nav className="knowledge-reading-map" aria-label="内容导航">
                  <header>
                    <small>CONTENT MAP</small>
                    <b>内容导航</b>
                  </header>
                  <ol>
                    <li>
                      <div>
                        <span>01</span>
                        <b>概念与物理基础</b>
                        <small>目标 · 定义 · 结构与机理</small>
                      </div>
                    </li>
                    <li>
                      <div>
                        <span>02</span>
                        <b>数学模型与推导</b>
                        <small>变量关系 · 关键公式 · 成立条件</small>
                      </div>
                    </li>
                    <li>
                      <div>
                        <span>03</span>
                        <b>方法与工程实现</b>
                        <small>方法选型 · 实施流程 · 程序实现</small>
                      </div>
                    </li>
                    <li>
                      <div>
                        <span>04</span>
                        <b>案例与实验验证</b>
                        <small>计算案例 · 误差分析 · 验收准则</small>
                      </div>
                    </li>
                    <li>
                      <div>
                        <span>05</span>
                        <b>总结与延伸</b>
                        <small>核心结论 · 练习 · 参考资料</small>
                      </div>
                    </li>
                  </ol>
                </nav>
              </section>
              <div className="detail-layout">
                <div className="detail-main">
                  <section>
                    <div className="section-number">01</div>
                    <div>
                      <h2>学习目标与问题定义</h2>
                      <p className="section-lead">
                        先明确研究对象、所需基础和待解决的问题，再进入理论与模型。
                      </p>
                      <p className="textbook-prose">
                        {emphasizeTechnicalText(selectedDigest.background)}
                      </p>
                      <div className="chapter-guide">
                        <article>
                          <h3>掌握目标</h3>
                          <ol>
                            {selectedDigest.learningObjectives.map(
                              (objective) => (
                                <li key={objective}>{objective}</li>
                              ),
                            )}
                          </ol>
                        </article>
                        <article>
                          <h3>关键问题</h3>
                          <ol>
                            {selectedTextbook.guideQuestions.map((question) => (
                              <li key={question}>{question}</li>
                            ))}
                          </ol>
                        </article>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">02</div>
                    <div>
                      <h2>基本概念与术语</h2>
                      <p className="section-lead">
                        给出后续分析所需的定义；阅读公式和工程案例时，应回到这些概念核对物理含义与适用条件。
                      </p>
                      <dl className="textbook-definitions">
                        {selectedTextbook.concepts.map((concept, index) => (
                          <div key={concept.term}>
                            <dt>
                              <span>定义 {index + 1}</span>
                              {concept.term}
                            </dt>
                            <dd>
                              {emphasizeTechnicalText(concept.definition)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">02</div>
                    <div>
                      <h2>理论基础与物理机制</h2>
                      <p className="section-lead">
                        本节采用教材语段展开概念、因果链和物理机制，并把结构图、实物图放在对应知识点旁，帮助建立从模型到真实对象的联系。
                      </p>
                      <TextbookTheory
                        sections={selectedDigest.theorySections}
                        title={selectedKnowledge.title}
                        category={`${selectedKnowledge.primaryCategory} ${selectedKnowledge.secondaryCategory}`}
                      />
                      {knowledgeVisualProfile && (
                        <figure className="knowledge-structure-figure">
                          <header>
                            <div>
                              <small>STRUCTURE OVERVIEW</small>
                              <h3>{knowledgeVisualProfile.title}</h3>
                            </div>
                            <span>
                              {selectedKnowledge.primaryCategory} ·{" "}
                              {selectedKnowledge.secondaryCategory}
                            </span>
                          </header>
                          <div className="knowledge-structure-chain">
                            {knowledgeVisualProfile.structure.map(
                              (node, index) => (
                                <div
                                  className="structure-node-wrap"
                                  key={node.label}
                                >
                                  <article>
                                    <span>{node.symbol}</span>
                                    <div>
                                      <b>{node.label}</b>
                                      <p>{node.detail}</p>
                                    </div>
                                  </article>
                                  {index <
                                    knowledgeVisualProfile.structure.length -
                                      1 && <i aria-hidden="true">→</i>}
                                </div>
                              ),
                            )}
                          </div>
                          <figcaption>
                            {knowledgeVisualProfile.caption}
                          </figcaption>
                        </figure>
                      )}
                      {knowledgeVisualProfile && (
                        <KnowledgeVisualSuite
                          profile={knowledgeVisualProfile}
                        />
                      )}
                      <div className="principle-grid compact-principles">
                        {selectedDigest.principles.map((principle, index) => (
                          <article key={principle.title}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <h3>{principle.title}</h3>
                            <p>
                              {emphasizeTechnicalText(principle.explanation)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">03</div>
                    <div>
                      <h2>系统原理图与变量关系</h2>
                      <p className="section-lead">
                        把输入、机理模型、工程决策和输出放到同一条因果链中，直观看到变量如何传递。
                      </p>
                      <article className="principle-visual">
                        <header>
                          <div>
                            <small>PRINCIPLE MAP</small>
                            <h3>{selectedDigest.principleVisual.title}</h3>
                          </div>
                          <span>输入 → 模型 → 决策 → 输出</span>
                        </header>
                        <div className="principle-chain">
                          {selectedDigest.principleVisual.nodes.map(
                            (node, index) => (
                              <div
                                className="principle-step"
                                key={`${node.label}-${index}`}
                              >
                                <article data-kind={node.kind}>
                                  <small>
                                    {node.kind === "input"
                                      ? "输入"
                                      : node.kind === "model"
                                        ? "机理"
                                        : node.kind === "decision"
                                          ? "决策"
                                          : "输出"}
                                  </small>
                                  <b>{node.label}</b>
                                  <p>{emphasizeTechnicalText(node.detail)}</p>
                                </article>
                                {index <
                                  selectedDigest.principleVisual.nodes.length -
                                    1 && <i aria-hidden="true">→</i>}
                              </div>
                            ),
                          )}
                        </div>
                        <p className="principle-caption">
                          {emphasizeTechnicalText(
                            selectedDigest.principleVisual.caption,
                          )}
                        </p>
                        <div className="relation-tags">
                          {selectedDigest.principleVisual.relations.map(
                            (relation) => (
                              <span key={relation}>{relation}</span>
                            ),
                          )}
                        </div>
                      </article>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">04</div>
                    <div>
                      <h2>数学模型与关键公式</h2>
                      <p className="section-lead">
                        公式不是结果黑箱：按照大学教材的阅读顺序，先定义物理量，再讲推导、量纲、工程直觉和适用边界。
                      </p>
                      <div className="formula-textbook-intro">
                        <strong>建议学习顺序</strong>
                        <span>物理问题</span>
                        <i>→</i>
                        <span>建模假设</span>
                        <i>→</i>
                        <span>基本定律</span>
                        <i>→</i>
                        <span>公式整理</span>
                        <i>→</i>
                        <span>数值代入</span>
                        <i>→</i>
                        <span>验证与边界</span>
                      </div>
                      <div className="equation-list">
                        {selectedDigest.equations.map((equation) => {
                          const lesson = formulaLessonNote(equation);
                          const detailedSteps =
                            detailedFormulaDerivation(equation);
                          return (
                            <article
                              className="equation-card"
                              key={equation.name}
                            >
                              <header>
                                <div>
                                  <small>TEXTBOOK FORMULA</small>
                                  <h3>{equation.name}</h3>
                                </div>
                                <span>MODEL</span>
                              </header>
                              <MathFormula formula={equation.formula} />
                              <div className="formula-question">
                                <b>这条公式要回答什么？</b>
                                <p>{lesson.question}</p>
                              </div>
                              <p>
                                {emphasizeTechnicalText(
                                  equation.interpretation,
                                )}
                              </p>
                              <div className="formula-lesson">
                                <article>
                                  <small>PHYSICAL PRINCIPLE</small>
                                  <h4>物理原理</h4>
                                  <p>
                                    {emphasizeTechnicalText(lesson.principle)}
                                  </p>
                                </article>
                                <article>
                                  <small>DERIVATION</small>
                                  <h4>推导主线</h4>
                                  <ol>
                                    {lesson.derivation.map((step, index) => (
                                      <li key={step}>
                                        <span>
                                          {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <p>{emphasizeTechnicalText(step)}</p>
                                      </li>
                                    ))}
                                  </ol>
                                </article>
                                <article>
                                  <small>ENGINEERING INTUITION</small>
                                  <h4>工程直觉</h4>
                                  <p>
                                    {emphasizeTechnicalText(lesson.intuition)}
                                  </p>
                                </article>
                              </div>
                              <section className="formula-derivation-detail">
                                <header>
                                  <small>FULL DERIVATION</small>
                                  <h4>公式推导过程</h4>
                                  <p>
                                    以下保留主要中间关系，说明每一步使用的定律、假设和代数变化。
                                  </p>
                                </header>
                                <ol>
                                  {detailedSteps.map((step, index) => (
                                    <li key={`${step.title}-${index}`}>
                                      <span>{index + 1}</span>
                                      <div>
                                        <h5>{step.title}</h5>
                                        {step.formula && (
                                          <MathFormula formula={step.formula} />
                                        )}
                                        <p>
                                          {emphasizeTechnicalText(
                                            step.explanation,
                                          )}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </section>
                              <div className="formula-check-grid">
                                <div>
                                  <b>量纲与单位检查</b>
                                  <p>{lesson.units}</p>
                                </div>
                                <div>
                                  <b>适用边界</b>
                                  <p>
                                    {emphasizeTechnicalText(lesson.boundary)}
                                  </p>
                                </div>
                              </div>
                              <div className="equation-meta">
                                <div>
                                  <b>符号与参数</b>
                                  <ul>
                                    {equation.variables.map((variable) => (
                                      <li key={variable}>{variable}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <b>成立条件</b>
                                  <ul>
                                    {equation.assumptions.map((assumption) => (
                                      <li key={assumption}>{assumption}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">05</div>
                    <div>
                      <h2>原理推导与逻辑链</h2>
                      <p className="section-lead">
                        按“基本定律—模型化简—参数求解—结果验证”的顺序呈现推导，避免把公式当作黑箱。
                      </p>
                      {knowledgeVisualProfile && (
                        <EngineeringTopicFigure
                          profile={knowledgeVisualProfile}
                        />
                      )}
                      <ol className="derivation-flow">
                        {selectedDigest.derivationSteps.map((step, index) => (
                          <li key={step}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">06</div>
                    <div>
                      <h2>主流工程方法与选型</h2>
                      <p className="section-lead">
                        比较理论依据、适用工况、精度、实现成本与风险，形成可以落地的选型判断。
                      </p>
                      <div className="method-compare">
                        {selectedDigest.mainstreamMethods.map((method) => (
                          <article key={method.name}>
                            <header>
                              <h3>{method.name}</h3>
                              <span>{method.suitable}</span>
                            </header>
                            <p>{emphasizeTechnicalText(method.idea)}</p>
                            <footer>
                              <b>权衡与注意</b>
                              {emphasizeTechnicalText(method.tradeoff)}
                            </footer>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">07</div>
                    <div>
                      <h2>工程场景、方法与交付物</h2>
                      <p className="section-lead">
                        从真实项目反推需要解决的问题、采用的方法、最终交付物和可量化验收指标。
                      </p>
                      <div className="application-grid">
                        {selectedDigest.applications.map((item, index) => (
                          <article key={item.scenario}>
                            {knowledgeVisualProfile && (
                              <div
                                className="application-visual"
                                data-kind={knowledgeVisualProfile.kind}
                                data-variant={index + 1}
                                aria-hidden="true"
                              >
                                <i />
                                <i />
                                <i />
                                <span />
                              </div>
                            )}
                            <header>
                              <span>{String(index + 1).padStart(2, "0")}</span>
                              <h3>{item.scenario}</h3>
                            </header>
                            <dl>
                              <div>
                                <dt>工程难点</dt>
                                <dd>
                                  {emphasizeTechnicalText(item.challenge)}
                                </dd>
                              </div>
                              <div>
                                <dt>推荐方法</dt>
                                <dd>{emphasizeTechnicalText(item.method)}</dd>
                              </div>
                              <div>
                                <dt>应交付</dt>
                                <dd>
                                  {emphasizeTechnicalText(item.deliverable)}
                                </dd>
                              </div>
                            </dl>
                            <footer>
                              {item.metrics.map((metric) => (
                                <span key={metric}>{metric}</span>
                              ))}
                            </footer>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">08</div>
                    <div>
                      <h2>工程实施流程</h2>
                      <p className="section-lead">
                        覆盖需求澄清、建模、参数设计、实现、调试、测量和交付检查。
                      </p>
                      <div className="method-steps">
                        {selectedDigest.steps.map((step, index) => (
                          <div key={step}>
                            <span>{index + 1}</span>
                            <p>{step}</p>
                          </div>
                        ))}
                      </div>
                      <h3 className="subsection-title">工程检查清单</h3>
                      <ul className="engineering-checklist">
                        {selectedDigest.engineeringChecklist.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                  {selectedDigest.codeExample && (
                    <section>
                      <div className="section-number">09</div>
                      <div>
                        <h2>示例代码与运行说明</h2>
                        <p className="section-lead">
                          代码用于把公式和流程映射为可执行步骤。本节先用流程图解释输入、处理和输出，再给出完整示例；移植到真实系统前，必须补齐量纲、边界、采样周期与异常处理。
                        </p>
                        {knowledgeVisualProfile && (
                          <figure className="code-flow-figure">
                            <header>
                              <small>CODE FLOW</small>
                              <h3>从输入到输出的程序流程</h3>
                            </header>
                            <div>
                              {knowledgeVisualProfile.codeFlow.map(
                                (step, index) => (
                                  <div
                                    className="code-flow-step"
                                    key={step.label}
                                  >
                                    <article>
                                      <span>{index + 1}</span>
                                      <b>{step.label}</b>
                                      <p>{step.detail}</p>
                                    </article>
                                    {index <
                                      knowledgeVisualProfile.codeFlow.length -
                                        1 && <i aria-hidden="true">→</i>}
                                  </div>
                                ),
                              )}
                            </div>
                            <figcaption>
                              流程图与下方代码逐步对应；移植前仍需按目标硬件补充边界保护和异常处理。
                            </figcaption>
                          </figure>
                        )}
                        <article className="code-example">
                          <header>
                            <div>
                              <span>CODE EXAMPLE</span>
                              <h3>{selectedDigest.codeExample.title}</h3>
                            </div>
                            <b>{selectedDigest.codeExample.language}</b>
                          </header>
                          <p>
                            {emphasizeTechnicalText(
                              selectedDigest.codeExample.description,
                            )}
                          </p>
                          <div className="code-reading-note">
                            <b>代码阅读方法</b>
                            <p>
                              先找到输入参数与状态，再沿数据流阅读核心计算，最后检查输出、异常分支和资源释放。公式中的每个变量都应能在代码中找到明确的数据来源、单位和更新周期。
                            </p>
                          </div>
                          <pre>
                            <code>{selectedDigest.codeExample.code}</code>
                          </pre>
                          <footer>
                            <strong>运行前必须确认</strong>
                            <ul>
                              {selectedDigest.codeExample.notes.map((note) => (
                                <li key={note}>
                                  {emphasizeTechnicalText(note)}
                                </li>
                              ))}
                            </ul>
                          </footer>
                        </article>
                      </div>
                    </section>
                  )}
                  <section>
                    <div className="section-number">10</div>
                    <div>
                      <h2>完整算例与结果解读</h2>
                      <p className="section-lead">
                        给出已知条件、逐步计算和工程判断，使理论可以被复算和迁移。
                      </p>
                      <article className="worked-example">
                        <header>
                          <span>WORKED EXAMPLE</span>
                          <h3>{selectedDigest.workedExample.title}</h3>
                        </header>
                        <div className="example-given">
                          <b>已知条件</b>
                          <ul>
                            {selectedDigest.workedExample.given.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <ol>
                          {selectedDigest.workedExample.steps.map(
                            (step, index) => (
                              <li key={step}>
                                <span>{index + 1}</span>
                                <p>{step}</p>
                              </li>
                            ),
                          )}
                        </ol>
                        <footer>
                          <b>结果与工程解释</b>
                          <p>
                            {emphasizeTechnicalText(
                              selectedDigest.workedExample.result,
                            )}
                          </p>
                        </footer>
                      </article>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">11</div>
                    <div>
                      <h2>验证、误差来源与适用边界</h2>
                      <p className="section-lead">
                        明确如何证明结论可靠，以及哪些模型假设、测试误差和极端工况会使结论失效。
                      </p>
                      <div className="verification-box">
                        <span>验证方案</span>
                        <p>
                          {emphasizeTechnicalText(selectedDigest.verification)}
                        </p>
                      </div>
                      <ul className="boundary-list">
                        {selectedDigest.boundaries.map((boundary) => (
                          <li key={boundary}>
                            {emphasizeTechnicalText(boundary)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">12</div>
                    <div>
                      <h2>技术成熟度与前沿方向</h2>
                      <p className="section-lead">
                        区分已经规模应用、正在快速演进和仍需验证的研究方向，避免把趋势当成成熟方案。
                      </p>
                      <div className="frontier-list">
                        {selectedDigest.frontier.map((item) => (
                          <article key={item.title}>
                            <header>
                              <span data-stage={item.stage}>{item.stage}</span>
                              <h3>{item.title}</h3>
                              <b>{item.readiness}%</b>
                            </header>
                            <p>{emphasizeTechnicalText(item.description)}</p>
                            <div className="readiness-track">
                              <i style={{ width: `${item.readiness}%` }} />
                            </div>
                            <footer>
                              <strong>对工程工作的影响</strong>
                              <span>
                                {emphasizeTechnicalText(item.implication)}
                              </span>
                            </footer>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">§5.1</div>
                    <div>
                      <h2>本章小结</h2>
                      <p className="section-lead">
                        按概念、原理、模型、方法与应用回顾本章主线。
                      </p>
                      <ol className="key-points">
                        {selectedDigest.keyPoints.map((point, index) => (
                          <li key={index}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>{emphasizeTechnicalText(`${point}。`)}</p>
                          </li>
                        ))}
                      </ol>
                      <p className="textbook-prose">
                        {emphasizeTechnicalText(selectedDigest.application)}
                      </p>
                      <div className="takeaway">
                        <span>本章结论</span>
                        <b>
                          {emphasizeTechnicalText(
                            `${selectedDigest.takeaway}。`,
                          )}
                        </b>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">§5.2</div>
                    <div>
                      <h2>复习思考题与课程设计</h2>
                      <p className="section-lead">
                        题目按理解、分析、计算、设计和实验五个层次组织，用于课后复习与工程训练。
                      </p>
                      <ol className="textbook-exercises">
                        {selectedTextbook.exercises.map((exercise, index) => (
                          <li key={exercise.kind}>
                            <span>{index + 1}</span>
                            <div>
                              <header>
                                <b>{exercise.kind}</b>
                                <small>建议独立完成</small>
                              </header>
                              <p>{exercise.question}</p>
                              <aside>
                                <strong>解题提示</strong>
                                {exercise.guidance}
                              </aside>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">§5.3</div>
                    <div>
                      <h2>参考文献与延伸阅读</h2>
                      <p className="section-lead">
                        列出标准、高校教材与公开课程、厂商手册和专业工具文档，便于追溯定义与继续学习。
                      </p>
                      <div className="reading-list">
                        {selectedDigest.readings.map((item, index) => (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            key={item.url}
                          >
                            <header>
                              <span>
                                [{index + 1}] {item.level}
                              </span>
                              <small>{item.readTime}</small>
                            </header>
                            <h3>{item.title}</h3>
                            <b>{item.organization}</b>
                            <p>{item.reason}</p>
                            <footer>
                              {item.tags.map((tag) => (
                                <span key={tag}>{tag}</span>
                              ))}
                              <strong>打开原文 ↗</strong>
                            </footer>
                          </a>
                        ))}
                        {!selectedDigest.readings.length && (
                          <div className="no-evidence">
                            本章参考文献待补充。
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}

      <WorkspaceEntryModals
        projectOpen={projectModal}
        noteOpen={noteModal}
        project={editingProject}
        onClose={() => {
          setProjectModal(false);
          setNoteModal(false);
          setEditingProject(null);
        }}
        onSaveProject={saveWorkspaceProject}
        onSaveNote={saveQuickNote}
      />

      {toast && (
        <div className={`toast ${undoTask ? "with-action" : ""}`}>
          <span>✓</span>
          <b>{toast}</b>
          {undoTask && (
            <button onClick={() => toggleTask(undoTask)}>↶ 撤销</button>
          )}
        </div>
      )}
    </main>
  );
}
