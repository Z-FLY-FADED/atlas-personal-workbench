"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "resumeModal" | "setResumeModal" | "saveResume" | "resume" | "resumeParsing" | "handleResumeFile" | "resumeFileName" | "setResumeFileName" | "resumeDraft" | "setResumeDraft">;
};
export function ResumeDialog({ controller }: Props) {
    const { resumeModal, setResumeModal, saveResume, resume, resumeParsing, handleResumeFile, resumeFileName, setResumeFileName, resumeDraft, setResumeDraft } = controller;
    return <>{resumeModal && (<div className="modal-backdrop" onMouseDown={() => setResumeModal(false)}>
          <form className="modal resume-modal" onSubmit={saveResume} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>RESUME MATCHING PROFILE</small>
                <h2>{resume ? "更新个人简历" : "导入个人简历"}</h2>
              </div>
              <button type="button" onClick={() => setResumeModal(false)}>
                ×
              </button>
            </div>
            <label className={`resume-upload ${resumeParsing ? "parsing" : ""}`}>
              <input type="file" accept=".pdf,.docx,.txt,.md,.markdown" onChange={handleResumeFile} disabled={resumeParsing}/>
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
              <input value={resumeFileName} onChange={(event) => setResumeFileName(event.target.value)} maxLength={180} placeholder="例如：研发工程师简历.pdf"/>
            </label>
            <label>
              简历内容
              <textarea autoFocus={!resume} value={resumeDraft} onChange={(event) => setResumeDraft(event.target.value.slice(0, 100000))} rows={12} placeholder="粘贴教育经历、工作或项目经历、技能、证书与求职方向。内容越完整，岗位匹配越准确。"/>
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
        </div>)}</>;
}
