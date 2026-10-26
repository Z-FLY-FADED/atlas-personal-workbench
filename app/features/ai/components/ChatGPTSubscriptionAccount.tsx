"use client";
import type { AIData } from "../../../contracts/workspace";
export function ChatGPTSubscriptionAccount({ account, }: {
    account: AIData["account"] | null | undefined;
}) {
    const authenticated = Boolean(account?.authenticated);
    return (<section className="chatgpt-subscription-card panel" aria-label="ChatGPT订阅账号登录与切换">
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
        <a className="primary-account-action" href="https://chatgpt.com/auth/login" target="_blank" rel="noreferrer">
          {authenticated ? "登录其他账号" : "登录 ChatGPT"}
        </a>
        <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
          切换订阅账号 ↗
        </a>
      </div>
    </section>);
}
