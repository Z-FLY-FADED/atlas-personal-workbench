# 参与 WorkSpace

欢迎提交可复现的问题、功能建议或 PR。主应用位于 `apps/atlas`，采集与 AI 服务位于 `supabase/functions`；原 React/Electron 应用保留在根目录。

提交问题时写明版本、Windows/Android 版本、操作步骤、期望与实际结果。使用仓库的 Issue 模板可以减少来回补充。截图和日志请移除用户名、个人知识、简历、会话、API Key 与签名材料。

修改前阅读 [原生应用约定](apps/atlas/AGENTS.md)。业务写入应通过 repository 和版本检查 RPC；个人数据始终按账号隔离。新增来源需注明公开入口、解析方式、失败行为与对应测试，不把登录页、验证码页或列表链接当作有效正文与职位。

Flutter 修改运行 `scripts/flutter-app.ps1 -Action analyze` 与 `-Action test`。服务端修改运行文档中的 Deno 检查与隔离测试。PR 描述说明用户会看到什么变化、验证方法，以及尚未覆盖的设备或真实来源。请勿提交本机配置、数据库导出、私有材料或安装签名。

仓库尚未指定项目许可证；公开源码不代表已经授予某项开源许可证。涉及分发授权的问题请先通过 Issue 与维护者确认。
