"use client";
import { emphasizeTechnicalText } from "../../../shared/components/TechnicalText";
import { MathFormula } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { detailedFormulaDerivation, formulaLessonNote } from "../domain/formulas";
import { EngineeringTopicFigure, KnowledgeVisualSuite } from "./KnowledgeFigures";
import { TextbookTheory } from "./TextbookSections";
type Props = {
    controller: Pick<WorkspaceController, "selectedKnowledge" | "selectedDigest" | "selectedTextbook" | "setSelectedKnowledge" | "setToast" | "knowledgeVisualProfile">;
};
export function KnowledgeDetailDialog({ controller }: Props) {
    const { selectedKnowledge, selectedDigest, selectedTextbook, setSelectedKnowledge, setToast, knowledgeVisualProfile } = controller;
    return <>{selectedKnowledge && selectedKnowledge.sourceType !== "网页摘录" && selectedDigest && selectedTextbook && (<div className="modal-backdrop detail-backdrop" onMouseDown={() => setSelectedKnowledge(null)}>
          <article className="knowledge-detail textbook-detail" onMouseDown={(event) => event.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-brand">
                <span>ENGINEERING KNOWLEDGE NOTE</span>
                <b>工程知识条目</b>
              </div>
              <div>
                <button onClick={() => {
                navigator.clipboard
                    ?.writeText(`${selectedKnowledge.title}\n\n内容提要：${selectedKnowledge.summary}\n\n核心结论：${selectedDigest.takeaway}\n\n关键公式：\n${selectedDigest.equations.map((equation) => `${equation.name}：${equation.formula}`).join("\n")}`)
                    .then(() => setToast("知识内容摘要已复制"));
            }}>
                  复制内容
                </button>
                <button className="detail-close" onClick={() => setSelectedKnowledge(null)}>
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
                <h2>执行摘要</h2>
                <p>
                  {emphasizeTechnicalText(selectedKnowledge.summary)}{" "}
                  本条目按研究对象、物理原理、数学模型、工程实现、验证方法与适用边界组织；公式注明变量和假设，结论保留来源与工程约束。
                </p>
                <div className="chapter-meta">
                  <div>
                    <b>建议基础</b>
                    {selectedTextbook.prerequisites.map((item) => (<span key={item}>{item}</span>))}
                  </div>
                  <div>
                    <b>关键词</b>
                    {selectedTextbook.concepts.slice(0, 5).map((item) => (<span key={item.term}>{item.term}</span>))}
                  </div>
                  <div>
                    <b>内容标准</b>
                    <span>来源可追溯</span>
                    <span>公式可复算</span>
                    <span>边界已标注</span>
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
                            {selectedDigest.learningObjectives.map((objective) => (<li key={objective}>{objective}</li>))}
                          </ol>
                        </article>
                        <article>
                          <h3>关键问题</h3>
                          <ol>
                            {selectedTextbook.guideQuestions.map((question) => (<li key={question}>{question}</li>))}
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
                        {selectedTextbook.concepts.map((concept, index) => (<div key={concept.term}>
                            <dt>
                              <span>定义 {index + 1}</span>
                              {concept.term}
                            </dt>
                            <dd>
                              {emphasizeTechnicalText(concept.definition)}
                            </dd>
                          </div>))}
                      </dl>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">03</div>
                    <div>
                      <h2>理论基础与物理机制</h2>
                      <p className="section-lead">
                        本节采用教材语段展开概念、因果链和物理机制，并把结构图、实物图放在对应知识点旁，帮助建立从模型到真实对象的联系。
                      </p>
                      <TextbookTheory sections={selectedDigest.theorySections} title={selectedKnowledge.title} category={`${selectedKnowledge.primaryCategory} ${selectedKnowledge.secondaryCategory}`}/>
                      {knowledgeVisualProfile && (<figure className="knowledge-structure-figure">
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
                            {knowledgeVisualProfile.structure.map((node, index) => (<div className="structure-node-wrap" key={node.label}>
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
                                </div>))}
                          </div>
                          <figcaption>
                            {knowledgeVisualProfile.caption}
                          </figcaption>
                        </figure>)}
                      {knowledgeVisualProfile && (<KnowledgeVisualSuite profile={knowledgeVisualProfile}/>)}
                      <div className="principle-grid compact-principles">
                        {selectedDigest.principles.map((principle, index) => (<article key={principle.title}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <h3>{principle.title}</h3>
                            <p>
                              {emphasizeTechnicalText(principle.explanation)}
                            </p>
                          </article>))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">04</div>
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
                          {selectedDigest.principleVisual.nodes.map((node, index) => (<div className="principle-step" key={`${node.label}-${index}`}>
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
                              </div>))}
                        </div>
                        <p className="principle-caption">
                          {emphasizeTechnicalText(selectedDigest.principleVisual.caption)}
                        </p>
                        <div className="relation-tags">
                          {selectedDigest.principleVisual.relations.map((relation) => (<span key={relation}>{relation}</span>))}
                        </div>
                      </article>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">05</div>
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
                const detailedSteps = detailedFormulaDerivation(equation);
                return (<article className="equation-card" key={equation.name}>
                              <header>
                                <div>
                                  <small>TEXTBOOK FORMULA</small>
                                  <h3>{equation.name}</h3>
                                </div>
                                <span>MODEL</span>
                              </header>
                              <MathFormula formula={equation.formula}/>
                              <div className="formula-question">
                                <b>这条公式要回答什么？</b>
                                <p>{lesson.question}</p>
                              </div>
                              <p>
                                {emphasizeTechnicalText(equation.interpretation)}
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
                                    {lesson.derivation.map((step, index) => (<li key={step}>
                                        <span>
                                          {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <p>{emphasizeTechnicalText(step)}</p>
                                      </li>))}
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
                                  {detailedSteps.map((step, index) => (<li key={`${step.title}-${index}`}>
                                      <span>{index + 1}</span>
                                      <div>
                                        <h5>{step.title}</h5>
                                        {step.formula && (<MathFormula formula={step.formula}/>)}
                                        <p>
                                          {emphasizeTechnicalText(step.explanation)}
                                        </p>
                                      </div>
                                    </li>))}
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
                                    {equation.variables.map((variable) => (<li key={variable}>{variable}</li>))}
                                  </ul>
                                </div>
                                <div>
                                  <b>成立条件</b>
                                  <ul>
                                    {equation.assumptions.map((assumption) => (<li key={assumption}>{assumption}</li>))}
                                  </ul>
                                </div>
                              </div>
                            </article>);
            })}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">06</div>
                    <div>
                      <h2>原理推导与逻辑链</h2>
                      <p className="section-lead">
                        按“基本定律—模型化简—参数求解—结果验证”的顺序呈现推导，避免把公式当作黑箱。
                      </p>
                      {knowledgeVisualProfile && (<EngineeringTopicFigure profile={knowledgeVisualProfile}/>)}
                      <ol className="derivation-flow">
                        {selectedDigest.derivationSteps.map((step, index) => (<li key={step}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>{step}</p>
                          </li>))}
                      </ol>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">07</div>
                    <div>
                      <h2>主流工程方法与选型</h2>
                      <p className="section-lead">
                        比较理论依据、适用工况、精度、实现成本与风险，形成可以落地的选型判断。
                      </p>
                      <div className="method-compare">
                        {selectedDigest.mainstreamMethods.map((method) => (<article key={method.name}>
                            <header>
                              <h3>{method.name}</h3>
                              <span>{method.suitable}</span>
                            </header>
                            <p>{emphasizeTechnicalText(method.idea)}</p>
                            <footer>
                              <b>权衡与注意</b>
                              {emphasizeTechnicalText(method.tradeoff)}
                            </footer>
                          </article>))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">08</div>
                    <div>
                      <h2>工程场景、方法与交付物</h2>
                      <p className="section-lead">
                        从真实项目反推需要解决的问题、采用的方法、最终交付物和可量化验收指标。
                      </p>
                      <div className="application-grid">
                        {selectedDigest.applications.map((item, index) => (<article key={item.scenario}>
                            {knowledgeVisualProfile && (<div className="application-visual" data-kind={knowledgeVisualProfile.kind} data-variant={index + 1} aria-hidden="true">
                                <i />
                                <i />
                                <i />
                                <span />
                              </div>)}
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
                              {item.metrics.map((metric) => (<span key={metric}>{metric}</span>))}
                            </footer>
                          </article>))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">09</div>
                    <div>
                      <h2>工程实施流程</h2>
                      <p className="section-lead">
                        覆盖需求澄清、建模、参数设计、实现、调试、测量和交付检查。
                      </p>
                      <div className="method-steps">
                        {selectedDigest.steps.map((step, index) => (<div key={step}>
                            <span>{index + 1}</span>
                            <p>{step}</p>
                          </div>))}
                      </div>
                      <h3 className="subsection-title">工程检查清单</h3>
                      <ul className="engineering-checklist">
                        {selectedDigest.engineeringChecklist.map((item) => (<li key={item}>{item}</li>))}
                      </ul>
                    </div>
                  </section>
                  {selectedDigest.codeExample && (<section>
                      <div className="section-number">10</div>
                      <div>
                        <h2>示例代码与运行说明</h2>
                        <p className="section-lead">
                          代码用于把公式和流程映射为可执行步骤。本节先用流程图解释输入、处理和输出，再给出完整示例；移植到真实系统前，必须补齐量纲、边界、采样周期与异常处理。
                        </p>
                        {knowledgeVisualProfile && (<figure className="code-flow-figure">
                            <header>
                              <small>CODE FLOW</small>
                              <h3>从输入到输出的程序流程</h3>
                            </header>
                            <div>
                              {knowledgeVisualProfile.codeFlow.map((step, index) => (<div className="code-flow-step" key={step.label}>
                                    <article>
                                      <span>{index + 1}</span>
                                      <b>{step.label}</b>
                                      <p>{step.detail}</p>
                                    </article>
                                    {index <
                            knowledgeVisualProfile.codeFlow.length -
                                1 && <i aria-hidden="true">→</i>}
                                  </div>))}
                            </div>
                            <figcaption>
                              流程图与下方代码逐步对应；移植前仍需按目标硬件补充边界保护和异常处理。
                            </figcaption>
                          </figure>)}
                        <article className="code-example">
                          <header>
                            <div>
                              <span>CODE EXAMPLE</span>
                              <h3>{selectedDigest.codeExample.title}</h3>
                            </div>
                            <b>{selectedDigest.codeExample.language}</b>
                          </header>
                          <p>
                            {emphasizeTechnicalText(selectedDigest.codeExample.description)}
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
                              {selectedDigest.codeExample.notes.map((note) => (<li key={note}>
                                  {emphasizeTechnicalText(note)}
                                </li>))}
                            </ul>
                          </footer>
                        </article>
                      </div>
                    </section>)}
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "11" : "10"}
                    </div>
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
                            {selectedDigest.workedExample.given.map((item) => (<li key={item}>{item}</li>))}
                          </ul>
                        </div>
                        <ol>
                          {selectedDigest.workedExample.steps.map((step, index) => (<li key={step}>
                                <span>{index + 1}</span>
                                <p>{step}</p>
                              </li>))}
                        </ol>
                        <footer>
                          <b>结果与工程解释</b>
                          <p>
                            {emphasizeTechnicalText(selectedDigest.workedExample.result)}
                          </p>
                        </footer>
                      </article>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "12" : "11"}
                    </div>
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
                        {selectedDigest.boundaries.map((boundary) => (<li key={boundary}>
                            {emphasizeTechnicalText(boundary)}
                          </li>))}
                      </ul>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "13" : "12"}
                    </div>
                    <div>
                      <h2>技术成熟度与前沿方向</h2>
                      <p className="section-lead">
                        区分已经规模应用、正在快速演进和仍需验证的研究方向，避免把趋势当成成熟方案。
                      </p>
                      <div className="frontier-list">
                        {selectedDigest.frontier.map((item) => (<article key={item.title}>
                            <header>
                              <span data-stage={item.stage}>{item.stage}</span>
                              <h3>{item.title}</h3>
                              <b>{item.readiness}%</b>
                            </header>
                            <p>{emphasizeTechnicalText(item.description)}</p>
                            <div className="readiness-track">
                              <i style={{ width: `${item.readiness}%` }}/>
                            </div>
                            <footer>
                              <strong>对工程工作的影响</strong>
                              <span>
                                {emphasizeTechnicalText(item.implication)}
                              </span>
                            </footer>
                          </article>))}
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "§14.1" : "§13.1"}
                    </div>
                    <div>
                      <h2>本章小结</h2>
                      <p className="section-lead">
                        按概念、原理、模型、方法与应用回顾本章主线。
                      </p>
                      <ol className="key-points">
                        {selectedDigest.keyPoints.map((point, index) => (<li key={index}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>{emphasizeTechnicalText(`${point}。`)}</p>
                          </li>))}
                      </ol>
                      <p className="textbook-prose">
                        {emphasizeTechnicalText(selectedDigest.application)}
                      </p>
                      <div className="takeaway">
                        <span>本章结论</span>
                        <b>
                          {emphasizeTechnicalText(`${selectedDigest.takeaway}。`)}
                        </b>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "§14.2" : "§13.2"}
                    </div>
                    <div>
                      <h2>复习思考题与课程设计</h2>
                      <p className="section-lead">
                        题目按理解、分析、计算、设计和实验五个层次组织，用于课后复习与工程训练。
                      </p>
                      <ol className="textbook-exercises">
                        {selectedTextbook.exercises.map((exercise, index) => (<li key={exercise.kind}>
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
                          </li>))}
                      </ol>
                    </div>
                  </section>
                  <section>
                    <div className="section-number">
                      {selectedDigest.codeExample ? "§14.3" : "§13.3"}
                    </div>
                    <div>
                      <h2>参考文献与延伸阅读</h2>
                      <p className="section-lead">
                        列出标准、高校教材与公开课程、厂商手册和专业工具文档，便于追溯定义与继续学习。
                      </p>
                      <div className="reading-list">
                        {selectedDigest.readings.map((item, index) => (<a href={item.url} target="_blank" rel="noreferrer" key={item.url}>
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
                              {item.tags.map((tag) => (<span key={tag}>{tag}</span>))}
                              <strong>打开原文 ↗</strong>
                            </footer>
                          </a>))}
                        {!selectedDigest.readings.length && (<div className="no-evidence">
                            本章参考文献待补充。
                          </div>)}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </article>
        </div>)}</>;
}
