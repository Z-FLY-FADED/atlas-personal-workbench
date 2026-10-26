"use client";
import { SpacedReview } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "view" | "currentLanguage" | "dailyLanguage" | "setToast" | "languageExam" | "activeLanguageRoute" | "openLanguageRoute" | "speakLanguage" | "translationDraft" | "setTranslationDraft" | "translationRevealed" | "setTranslationRevealed" | "saveLanguageDraft" | "writingWordCount" | "writingDraft" | "setWritingDraft">;
};
export function LanguageView({ controller }: Props) {
    const { view, currentLanguage, dailyLanguage, setToast, languageExam, activeLanguageRoute, openLanguageRoute, speakLanguage, translationDraft, setTranslationDraft, translationRevealed, setTranslationRevealed, saveLanguageDraft, writingWordCount, writingDraft, setWritingDraft } = controller;
    return <>{(view === "英语学习" || view === "日语学习") && (<section className="full-view language-view daily-language-view">
              <SpacedReview key={currentLanguage} language={currentLanguage} words={dailyLanguage.words.map(item => ({ word: item.term, meaning: item.meaning }))}/>
              <div className="view-title">
                <div>
                  <p>DAILY EXAM PREPARATION</p>
                  <h1>{currentLanguage}</h1>
                </div>
                <button className="primary" onClick={() => setToast(`${dailyLanguage.dateKey} 的${currentLanguage === "英语学习" ? "英语" : "日语"}学习包已准备完成`)}>
                  ✦ 今日学习包
                </button>
              </div>
              <section className="panel daily-language-hero">
                <div className="daily-language-mark">
                  <span>{currentLanguage === "英语学习" ? "EN" : "あ"}</span>
                  <div>
                    <small>{languageExam.target}</small>
                    <h3>{languageExam.stage}</h3>

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
                  {languageExam.routes.map((route, index) => (<button type="button" className={`language-route-button ${activeLanguageRoute[currentLanguage] === index ? "active" : ""}`} key={route.label} aria-pressed={activeLanguageRoute[currentLanguage] === index} onClick={() => openLanguageRoute(index, route.target)}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{route.label}</b>
                      {activeLanguageRoute[currentLanguage] === index && <small>正在学习</small>}
                    </button>))}
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
                  </div>
                </header>
                <div className="daily-word-grid">
                  {dailyLanguage.words.map((word, index) => (<article key={word.term}>
                      <div className="daily-word-index">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <em>{word.tag}</em>
                      </div>
                      <h4>{word.term}</h4>
                      {word.reading && (<p className="word-reading">{word.reading}</p>)}
                      <b>{word.meaning}</b>
                      <blockquote>{word.example}</blockquote>
                      <p className="word-translation">{word.translation}</p>
                      <button onClick={() => speakLanguage(`${word.term}. ${word.example}`)} aria-label={`朗读${word.term}`}>
                        ◉ 朗读单词与例句
                      </button>
                    </article>))}
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
                      <button onClick={() => speakLanguage(dailyLanguage.caseStudy.original)}>
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
              {currentLanguage === "英语学习" && (<section className="language-practice-grid">
                  <article className="panel language-practice-card" id="language-reading">
                    <header>
                      <div><small>READING & TRANSLATION</small><h3>阅读与翻译练习</h3></div>
                      <span>{translationDraft.trim().length} 字</span>
                    </header>
                    <p className="language-practice-source">{dailyLanguage.caseStudy.original}</p>
                    <label>
                      <span>你的中文翻译</span>
                      <textarea value={translationDraft} onChange={(event) => setTranslationDraft(event.target.value)} placeholder="先独立完成翻译，再查看参考译文……"/>
                    </label>
                    {translationRevealed && (<div className="language-reference-answer"><b>参考译文</b><p>{dailyLanguage.caseStudy.translation}</p></div>)}
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
                      <textarea value={writingDraft} onChange={(event) => setWritingDraft(event.target.value)} placeholder="Write your response here..." lang="en"/>
                    </label>
                    <footer>
                      <span className={writingWordCount >= 150 ? "ready" : ""}>{writingWordCount >= 150 ? "已达到建议字数" : `还需约 ${Math.max(0, 150 - writingWordCount)} 词`}</span>
                      <button type="button" className="primary" onClick={() => saveLanguageDraft("writing", writingDraft)}>保存写作</button>
                    </footer>
                  </article>
                </section>)}
              <section className="panel daily-output" id="language-output">
                <header>
                  <div>
                    <h3>{currentLanguage === "英语学习" ? "今天必须完成的 CET-6 训练" : "今天必须完成的五十音练习"}</h3>
                  </div>
                </header>
                <div>
                  {dailyLanguage.caseStudy.tasks.map((task, index) => (<article key={task}>
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
                      <button onClick={() => setToast(`已加入今日输出：${task}`)}>
                        加入练习
                      </button>
                    </article>))}
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
            </section>)}</>;
}
