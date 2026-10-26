"use client";
import Image from "next/image";
import type { KnowledgeVisualProfile, TheoryFigurePreset } from "../domain/visualProfiles";
export function EngineeringTopicFigure({ profile, }: {
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
    return (<figure className="engineering-topic-figure" data-kind={profile.kind}>
      <header>
        <div>
          <small>ENGINEERING SCHEMATIC</small>
          <h3>{profile.title}</h3>
        </div>
        <span>{profile.visualLabel}</span>
      </header>
      <div className="engineering-schematic">
        <div className="schematic-art" aria-label={`${profile.title}示意图`} role="img">
          <i className="schematic-part part-a"/>
          <i className="schematic-part part-b"/>
          <i className="schematic-part part-c"/>
          <i className="schematic-part part-d"/>
          <i className="schematic-line line-a"/>
          <i className="schematic-line line-b"/>
          <i className="schematic-line line-c"/>
        </div>
        <div className="schematic-legend">
          {profile.structure.map((node, index) => (<article key={node.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{node.label}</b>
                <p>{node.detail}</p>
              </div>
            </article>))}
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
        <figure className={`engineering-reference-photo ${reference.cropKind === "direct" ? "direct" : ""}`} data-kind={reference.cropKind} data-profile-kind={profile.kind}>
          <Image unoptimized width={1440} height={960} src={reference.src.replace(/\.png$/, ".webp")} alt={reference.title} loading="lazy"/>
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
    </figure>);
}
export function KnowledgeVisualSuite({ profile, }: {
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
    return (<div className="knowledge-visual-suite">
      {isStructural && (<figure className="diagram-card exploded-diagram">
          <header>
            <div>
              <small>EXPLODED VIEW</small>
              <h3>结构拆解图与组成成分</h3>
            </div>
            <span>总成 → 部件 → 接口</span>
          </header>
          <div className="exploded-canvas">
            <div className="exploded-axis"/>
            {profile.structure.map((part, index) => (<article key={part.label} style={{ "--part-index": index } as React.CSSProperties}>
                <span>{part.symbol}</span>
                <div>
                  <b>{part.label}</b>
                  <small>{part.detail}</small>
                </div>
              </article>))}
          </div>
          <figcaption>
            拆解图用于识别组成成分、装配关系和载荷/信号传递方向；实际尺寸、材料与公差以工程图纸和实测数据为准。
          </figcaption>
        </figure>)}
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
            {profile.codeFlow.map((node, index) => (<div className="circuit-step" key={node.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b title={node.detail}>{node.label}</b>
                {index < profile.codeFlow.length - 1 && <i aria-hidden="true"/>}
              </div>))}
          </div>
          <div className="circuit-return">
            <span>验证结果返回模型与参数修正</span>
            <i />
          </div>
        </div>
        <div className="diagram-step-notes">
          {profile.codeFlow.map((node, index) => (<p key={node.label}>
              <b>{index + 1}. {node.label}</b>
              <span>{node.detail}</span>
            </p>))}
        </div>
        <p className="diagram-principle">
          <b>主要作用：</b>
          {profile.purpose}
        </p>
        <figcaption className="diagram-reading-caption">
          <b>读图说明：</b>{profile.caption}
        </figcaption>
      </figure>
    </div>);
}
export function CanDifferentialPrincipleFigure() {
    return (<figure className="can-differential-figure">
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
    </figure>);
}
export function TheoryConceptFigure({ preset }: {
    preset: TheoryFigurePreset;
}) {
    return (<figure className={`theory-concept-figure ${preset.kind}`}>
      <header>
        <div>
          <small>{preset.eyebrow}</small>
          <h4>{preset.title}</h4>
        </div>
        <span>原理图</span>
      </header>
      <div className="theory-concept-chain">
        {preset.nodes.map((node, index) => (<div className="theory-concept-step" key={node.label}>
            <article>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{node.label}</b>
              <p>{node.detail}</p>
            </article>
            {index < preset.nodes.length - 1 && <i aria-hidden="true">→</i>}
          </div>))}
      </div>
      <figcaption>{preset.caption}</figcaption>
    </figure>);
}
