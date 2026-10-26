"use client";
import Image from "next/image";
import { emphasizeTechnicalText } from "../../../shared/components/TechnicalText";
import { getKnowledgeTextbookMedia, getTheoryFigurePreset } from "../domain/visualProfiles";
import { CanDifferentialPrincipleFigure, TheoryConceptFigure } from "./KnowledgeFigures";
export function buildTheoryExpansion(sectionTitle: string, title: string, category: string) {
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
export function TextbookTheory({ sections, title, category, }: {
    sections: Array<{
        title: string;
        content: string;
    }>;
    title: string;
    category: string;
}) {
    const media = getKnowledgeTextbookMedia(title, category);
    return (<div className="textbook-theory">
      {sections.map((item, index) => {
            const theoryText = `${item.title} ${item.content} ${title} ${category}`;
            const isCanDifferential = /CAN\s*差分通信电路原理|CANH|CANL/i.test(theoryText);
            const matchedFigure = isCanDifferential
                ? null
                : getTheoryFigurePreset(theoryText);
            const conceptFigure = matchedFigure &&
                sections.findIndex((section) => getTheoryFigurePreset(`${section.title} ${section.content} ${title} ${category}`)?.title === matchedFigure.title) === index
                ? matchedFigure
                : null;
            const showCanFigure = isCanDifferential &&
                sections.findIndex((section) => /CAN\s*差分通信电路原理|CANH|CANL/i.test(`${section.title} ${section.content} ${title} ${category}`)) === index;
            return (<div className="textbook-theory-unit" key={item.title}>
            <header>
              <span>{`2.${index + 1}`}</span>
              <h3>{item.title}</h3>
            </header>
            <p>{emphasizeTechnicalText(item.content)}</p>
            {showCanFigure && <CanDifferentialPrincipleFigure />}
            {conceptFigure && <TheoryConceptFigure preset={conceptFigure}/>}
            <p className="textbook-expansion">
              {emphasizeTechnicalText(buildTheoryExpansion(item.title, title, category))}
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
            {index === 0 && media && (<figure className={`textbook-media ${media.portrait ? "portrait" : "landscape"}`}>
                <div className="textbook-media-image">
                  <Image unoptimized width={1440} height={960} src={media.src.replace(/\.png$/, ".webp")} alt={media.title} loading="lazy" style={{ objectPosition: media.objectPosition }}/>
                </div>
                <figcaption>
                  <small>专题图解 / 工程实物</small>
                  <h4>{media.title}</h4>
                  <p>{media.caption}</p>
                  {media.details?.length ? (<dl className="knowledge-media-details">
                      {media.details.map((detail) => (<div key={detail.label}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>))}
                    </dl>) : null}
                  {media.sourceUrl ? (<a href={media.sourceUrl} target="_blank" rel="noreferrer">
                      图片来源：{media.source} ↗
                    </a>) : (<span>图片来源：{media.source}</span>)}
                </figcaption>
              </figure>)}
          </div>);
        })}
      {/电机|PMSM|FOC|矢量控制/i.test(`${title} ${category}`) && (<MotorMechanicalStructureLesson />)}
    </div>);
}
export const motorMechanicalTheory = [
    {
        title: "电机总成与机械载荷路径",
        content: "电机机械总成由定子铁芯与绕组、转子、转轴、前后轴承、机壳、端盖、密封和冷却部件组成。电磁力在定转子气隙中产生转矩，转矩经转子铁芯传到转轴，再通过花键、键或联轴器输出；径向电磁力、不平衡力和外部悬臂载荷则由转轴传给轴承，最终经端盖和机壳传到安装基础。结构设计必须同时画清转矩路径、径向载荷路径、轴向载荷路径和热流路径。",
    },
    {
        title: "定子铁芯、绕组与机壳",
        content: "定子铁芯由绝缘硅钢片叠压而成，齿槽容纳绕组并建立磁路。叠片可降低涡流损耗，但叠压系数、齿部饱和、槽口形状和装配应力会影响电磁性能与噪声。铁芯通常通过过盈、热套、焊接或灌封固定在机壳内；过盈不足可能产生微动和异响，过盈过大会使机壳和铁芯变形并改变气隙。机壳不仅承载，还承担散热、密封、接口定位和模态控制。",
    },
    {
        title: "转子、永磁体、转轴与高速约束",
        content: "表贴式转子把磁钢固定在转子表面，结构简单但高速时需护套或绑带抵抗离心力；内埋式转子把磁钢置于硅钢片磁障内，机械强度和凸极利用率较高，但转子桥处应力集中明显。转轴承受扭转、弯曲、轴向力和循环疲劳，台阶、键槽、花键根部及过盈配合端部是常见危险截面。高速设计还需校核转子离心应力、过盈保持力、临界转速、动平衡等级和超速试验裕量。",
    },
    {
        title: "轴承支承、气隙与轴系精度",
        content: "轴承支承决定转子的径向和轴向定位。常见方案包括深沟球轴承的浮动—固定组合、角接触轴承成对预紧以及高速电机的陶瓷或绝缘轴承。轴承游隙、预紧、配合、公差链和温差膨胀共同决定运行间隙；预紧过小会降低刚度并产生窜动，过大则增加摩擦、温升和早期疲劳。轴系挠度、轴承位同轴度和端盖变形必须受控，使最小气隙在装配误差、热变形和电磁拉力共同作用下仍不发生扫膛。",
    },
    {
        title: "冷却、密封、NVH与可制造性",
        content: "损耗由绕组铜耗、铁耗、磁钢涡流损耗和轴承摩擦组成，热量沿槽内绝缘、铁芯、机壳、冷却水套或油路排出。机械结构应避免冷却死区，并控制绕组热点、轴承温度和磁钢退磁风险。密封需根据防护等级选择骨架油封、O形圈、迷宫或机械密封，同时评估摩擦和泄漏。NVH设计要联动电磁阶次、转子不平衡、轴承激励和机壳模态；制造阶段则需明确叠压、动平衡、轴承压装、气隙测量和端盖定位的检验方法。",
    },
];
export function MotorMechanicalStructureLesson() {
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
    return (<section className="motor-mechanics-lesson">
      <header>
        <div>
          <small>MOTOR MECHANICAL ARCHITECTURE</small>
          <h3>电机机械结构专题</h3>
        </div>
        <span>结构 · 载荷 · 热 · 装配</span>
      </header>
      <div className="motor-cutaway" aria-label="电机机械结构剖面示意">
        <div className="motor-housing">
          <i className="motor-stator"/>
          <i className="motor-rotor"/>
          <i className="motor-shaft"/>
          <i className="motor-bearing bearing-left"/>
          <i className="motor-bearing bearing-right"/>
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
        {assemblies.map((item, index) => (<article key={item.title}>
            <span>{item.mark}</span>
            <div>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
              <b>{item.check}</b>
            </div>
          </article>))}
      </div>
      <footer>
        <b>设计闭环：</b>
        电磁方案确定气隙力与损耗，机械结构保证强度、精度和寿命，热设计控制材料与配合状态，最终通过模态、超速、温升、振动和耐久试验验证。
      </footer>
    </section>);
}
