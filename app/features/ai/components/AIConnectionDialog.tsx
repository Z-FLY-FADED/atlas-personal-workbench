"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "aiConnectionModal" | "setAiConnectionModal" | "setEditingConnection" | "editingConnection" | "saveAIConnection">;
};
export function AIConnectionDialog({ controller }: Props) {
    const { aiConnectionModal, setAiConnectionModal, setEditingConnection, editingConnection, saveAIConnection } = controller;
    return <>{aiConnectionModal && (<div className="modal-backdrop" onMouseDown={() => {
                setAiConnectionModal(false);
                setEditingConnection(null);
            }}>
          <form key={editingConnection?.id || "new-ai"} className="modal ai-config-modal" onSubmit={saveAIConnection} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>SECURE MODEL CONNECTION</small>
                <h2>
                  {editingConnection
                ? "编辑账户与模型"
                : "选择已登录 GPT 账号或 AI 模型"}
                </h2>
              </div>
              <button type="button" onClick={() => {
                setAiConnectionModal(false);
                setEditingConnection(null);
            }}>
                ×
              </button>
            </div>
            {!editingConnection && (<section className="gpt-account-connect">
                <span>GPT</span>
                <div>
                  <small>已登录 GPT 账号</small>
                  <b>添加可切换的已登录账号</b>
                  <p>
                    每个账户可保存独立的 API Key
                    与默认模型，添加后可在顶部直接切换。
                  </p>
                </div>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                  获取 API Key<i>↗</i>
                </a>
              </section>)}
            <p className="ai-security-note">
              <span>⌾</span>API Key 由服务端加密保存。
            </p>
            <div className="form-grid">
              <label>
                账户 / 连接名称
                <input name="name" required autoFocus defaultValue={editingConnection?.name || "我的 GPT 账号"} placeholder="例如：工作账号、个人账号"/>
              </label>
              <label>
                模型厂商
                <select name="provider" defaultValue={editingConnection?.provider || "openai"}>
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
              <input name="model" required defaultValue={editingConnection?.model || "gpt-5.6-terra"} placeholder="例如：gpt-5.6-terra、deepseek-chat"/>
            </label>
            <label>
              API Key
              <input name="apiKey" type="password" autoComplete="new-password" placeholder={editingConnection?.hasKey
                ? "已保存，留空则不修改"
                : "粘贴此账户创建的 API Key"}/>
            </label>
            <label>
              接口地址（可选）
              <input name="baseUrl" type="url" defaultValue={editingConnection?.baseUrl || ""} placeholder="官方接口无需填写；兼容接口填写 https://…/v1"/>
            </label>
            <div className="provider-presets">
              <span>常用模型 ID</span>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "gpt-5.6-sol";
            }}>
                GPT-5.6 Sol
              </button>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "gpt-5.6-terra";
            }}>
                GPT-5.6 Terra
              </button>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "gpt-5.6-luna";
            }}>
                GPT-5.6 Luna
              </button>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "deepseek-chat";
            }}>
                DeepSeek Chat
              </button>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "claude-sonnet-4-5";
            }}>
                Claude Sonnet
              </button>
              <button type="button" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form)
                    (form.elements.namedItem("model") as HTMLInputElement).value = "gemini-2.5-flash";
            }}>
                Gemini Flash
              </button>
            </div>
            <button className="submit" type="submit">
              安全保存并加入切换列表 <span>→</span>
            </button>
          </form>
        </div>)}</>;
}
