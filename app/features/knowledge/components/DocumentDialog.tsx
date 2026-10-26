"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "documentModal" | "setDocumentModal" | "addKnowledgeDocument" | "documentParsing" | "handleKnowledgeDocument" | "documentFileName" | "documentPreview" | "documentTitle" | "setDocumentTitle" | "documentDraft" | "setDocumentDraft">;
};
export function DocumentDialog({ controller }: Props) {
    const { documentModal, setDocumentModal, addKnowledgeDocument, documentParsing, handleKnowledgeDocument, documentFileName, documentPreview, documentTitle, setDocumentTitle, documentDraft, setDocumentDraft } = controller;
    return <>{documentModal && (<div className="modal-backdrop" onMouseDown={() => setDocumentModal(false)}>
          <form className="modal document-modal" onSubmit={addKnowledgeDocument} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>DOCUMENT TO KNOWLEDGE</small>
                <h2>添加文档到知识库</h2>
              </div>
              <button type="button" onClick={() => setDocumentModal(false)}>
                ×
              </button>
            </div>
            <label className={`resume-upload document-upload ${documentParsing ? "parsing" : ""}`}>
              <input type="file" accept=".pdf,.docx,.txt,.md,.markdown,.csv" onChange={handleKnowledgeDocument} disabled={documentParsing}/>
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
            {documentPreview ? (<>
                <label>
                  知识标题
                  <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value.slice(0, 160))} placeholder="文档标题"/>
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
                  <textarea value={documentDraft} onChange={(event) => setDocumentDraft(event.target.value.slice(0, 120000))} rows={7}/>
                </label>
                <p className="document-privacy-note">
                  仅保存提取后的正文、分类和结构化总结，不保存原始文件。
                </p>
              </>) : (<div className="document-empty-guide">
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
              </div>)}
            <button className="submit" type="submit" disabled={documentParsing || !documentPreview}>
              {documentParsing ? "正在读取…" : "✦ 总结并加入知识库"}{" "}
              <span>→</span>
            </button>
          </form>
        </div>)}</>;
}
