# WorkSpace Windows / Android 应用

本轮依据用户提供的《从零开发 Windows + Android 双平台 App》重构。原生主工程位于 `apps/atlas`，使用 Flutter 3.47.8、Dart、Supabase Flutter SDK。Windows 与 Android 使用同一套页面、业务规则与数据仓库。原网站和 Electron 程序保留，原 D1 数据库不做原地转换。

## 架构与数据

```text
apps/atlas/lib/main.dart
  → app.dart / AuthGate
  → features/workspace/workspace_shell.dart
  → features/* 页面和纯业务规则
  → WorkspaceController
  → WorkspaceRepository
  → Supabase Auth + atlas_entities + Realtime
```

`atlas_entities` 用 `kind` 区分原工作台的 31 种业务集合，用 `payload` 保存原业务字段。统一的 UUID、用户 ID、服务端版本号、时间戳和软删除标记放在外层。旧 ID 保留在 `legacy_key` 和原字段内，因此任务与项目等既有关系可继续识别。账号隔离在数据库 RLS 中执行，客户端没有 Secret Key。Supabase 会话通过系统安全存储保存。

应用订阅本账号的数据变化，收到通知后重新读取；重新进入前台、手动刷新和每 45 秒轮询也会重新读取，以弥补漏掉的通知。分页读取超过 1000 条的集合。保存和删除使用服务端版本检查；发生编辑冲突时保留编辑框，提示重新加载与合并。退出账号销毁该账号的页面、数据与订阅。

按本轮文档，第一版以云数据库为唯一数据源，不引入本地 SQLite 双向同步。网络断开后，可阅读当前已加载的数据；云端未确认的写入不会显示为已保存。原版 `offline` 设置在原生版中表示关闭公开来源和 AI，云端基础同步仍需网络。

## 功能迁移范围

| 模块 | 原生版已实现 |
|---|---|
| 工作台 | 真实任务/项目/知识统计，快速创建，提醒列表，跨页面专注计时与云端记录 |
| 任务与项目 | 新增、编辑、回收/恢复，优先级、范围、日期、重复任务、完成历史、子任务、项目关联，自动/手动进度 |
| 笔记与知识 | 笔记状态、转任务/知识，个人知识管理，17 篇原项目内置教材及完整扩展字段，旋转知识关联图，关键词检索，公开网页收录 |
| 英语与日语 | 原项目每日词汇与情景课程，加入复习，FSRS 调度，复习卡片和日志原子提交；原 FSRS 字段同时保留 |
| 周报 | 由任务历史、专注时间和笔记生成可编辑初稿，云端保存与版本检查 |
| 求职 | 投递管理，28 条原项目岗位目录与官方链接，简历技能匹配，主简历、岗位版本，Word/TXT/Markdown 文本导入 |
| 股票 | 24 条原项目跨市场目录、筛选、自选分组与笔记，东方财富公开报价、来源时间、云端历史缓存 |
| 行业 | 资讯收件箱、RSS/Atom 来源、新内容采集与去重、一键转知识 |
| 备份 | 普通/加密 JSON 导出、兼容旧版 AES-GCM 加密格式、校验和检查、按账号导入与回收站 |
| AI | 默认关闭，主动提问界面与 Edge Function 源码；模型密钥只由云端配置 |

迁移不等于原版所有专用流程已经逐项等价。原生版尚未替代网页自动填表、多来源证券信号与完整市场目录抓取、后台定时 AI、PDF 正文解析、求职附件的专用编辑流程和原版全部主题。相关旧数据和旧实现均保留；原生“数据与恢复”的集合浏览可查看已导入的附属记录。岗位目录是原项目快照，是否仍开放须到企业原始链接核对。行情没有有效来源时不生成报价。

## 本地运行

`apps/atlas/config/example.json` 是配置示例，复制为 `dev.json` 和 `prod.json`，填写 Supabase Project URL 与 `sb_publishable_` 开头的 Publishable Key。实际配置已在本机设置并被 Git 忽略；不要把 `sb_secret_`、service_role、数据库密码或模型密钥放入客户端。

工具入口为根目录 `scripts/flutter-app.ps1`。它优先读取 `.runtime/toolchains/paths.json`，也支持 `-FlutterSdk`、`-AndroidSdk`、`-JavaHome` 指定现有工具。当前临时工具目录记录在该文件中；这些工具若被系统清理，请按 Flutter 官方说明安装到长期保留的英文路径，再通过参数指定。Windows 需要 Visual Studio C++ 工作负载，以及安全存储插件使用的 ATL 组件；Android 需要 SDK、命令行工具与 JDK。

```powershell
.\scripts\flutter-app.ps1 -Action doctor
.\scripts\flutter-app.ps1 -Action get
.\scripts\flutter-app.ps1 -Action analyze
.\scripts\flutter-app.ps1 -Action test
.\scripts\flutter-app.ps1 -Action run-windows -Config dev
.\scripts\flutter-app.ps1 -Action run-android -Device 手机设备ID -Config dev
```

Windows 的 Dart LSP 与 Android 构建工具在中文路径中出现过实际错误，因此脚本把源代码复制到英文临时目录进行检查和构建，源码仍在本仓库。当前 Windows 插件路径使用普通目录联接，不修改 Windows 开发者模式或安全设置。

## Supabase 设置

按顺序执行 `supabase/migrations/202610260001_atlas_workspace.sql` 和 `202610260002_entity_invariants.sql`。第二份增加单例/周报/设置唯一约束、云端备份重复恢复保护和 AI 限流。实际执行状态以本轮验收记录为准。脚本均为新增结构，不删除旧表。

`supabase/tests/workspace_rls.sql` 在事务内创建临时测试账号并执行本人读写、跨账号隔离、冲突拒绝、导入和恢复检查，最后回滚；不留下测试账号或业务数据。

应用提供“登录 / 注册”切换。注册只填写用户名和密码，用户名支持 3–24 个中文、英文字母、数字或下划线，忽略英文大小写与首尾空格；密码至少 8 个字符。Windows 与 Android 用同一用户名和密码登录即可访问同一份数据。

为继续使用 Supabase 托管密码认证、会话与 RLS，客户端把规范化用户名转换为保留 `.invalid` 域中的确定性内部标识，不要求真实邮箱，不向外部域发送邮件，密码仍由 Supabase Auth 管理。注册元数据保留用户名和显示名。此方式需要该项目允许新用户注册，并关闭注册邮箱确认；这两项配置已于 2026-10-26 经用户授权核对完成，公共认证接口确认自动激活已启用。[Supabase 说明](https://supabase.com/docs/guides/auth/general-configuration)确认该设置关闭后可直接登录。后台 `auth.users.email` 显示的是内部标识，不能用来收邮件。当前没有邮件找回密码功能，需要管理员协助重置。管理控制台身份与应用身份仍然相互独立。

AI 可选功能需额外部署 `supabase/functions/atlas-assistant` 并配置 `ATLAS_AI_API_KEY`、`ATLAS_AI_MODEL`，可选 `ATLAS_AI_BASE_URL`。这些是模型服务的云端环境变量，与 Supabase 的客户端密钥不同。没有配置时界面会报告服务未就绪，不伪造模型结果。Edge Function 会自行检查登录身份、账号运行策略与配额。当前实现不执行后台 AI 计划。

## 旧数据迁移与回退

初次重构前的源码在文件夹清理时纳入 `.runtime/archives/history-*.zip`，其中保留原路径；原始数据库基线仍在 `.runtime/backups/before-flutter-data-20261026`。当前源码快照为 `.runtime/backups/latest-source-*.zip`。只读导出命令为：

```powershell
node scripts/export-flutter-data.mjs --out .runtime/flutter-migration-new
```

每个旧 `owner_id` 分别导出一个文件，导出内容不包含模型密钥和旧账号凭据。不要把所有文件导入同一账号。本轮生成的导出文件在 `.runtime/flutter-migration/`，清单在 `export-manifest.json`。原来多个工作台有各自的资讯记录，不能把最大的文件默认当作唯一真实账号。

在原生应用登录目标账号，进入“数据与恢复”，选择对应 JSON，先查看各集合记录数，再确认导入。加密备份需填写原密码。导入为事务操作，只新增缺少的记录；已存在或已更新的云端记录保留。第二份迁移还会按原生 `source_id` 避免将本账号导出的云端记录重复导回。

未自动上传任何真实旧数据。原 D1 数据库与 React/Electron 源码保留；本机桌面入口现已更新为 WorkSpace。历史原生发布包与旧快捷方式位于 `.runtime/backups/`。回退不意味着 Supabase 中新增的数据会自动写回旧 D1，应先另行导出与核对。

## 发布与更新

```powershell
.\scripts\flutter-app.ps1 -Action build-windows -Config prod
.\scripts\flutter-app.ps1 -Action build-apk -Config prod
```

Windows 成功构建后将完整 Release 目录复制到 `release/flutter/windows/`，并生成 `WorkSpace-Windows-*.zip`；必须一起分发 DLL 和 `data/`。可执行文件为 `WorkSpace.exe`。此包没有商业代码签名，目标电脑需要所需的 Visual C++ 运行库。Android 成功构建后为 `release/flutter/WorkSpace-Android.apk`。

Android 发布必须使用长期签名。`scripts/create-android-signing.ps1` 只在获得用户明确授权后执行；本轮已获得授权。签名为 `apps/atlas/android/atlas-release.jks`，密码配置为 `android/key.properties`，另有 `.runtime/signing-backup-*` 本地备份，均被 Git 忽略。请长期保留签名和密码，丢失后无法用同一签名覆盖更新。脚本拒绝覆盖已有密钥；Release 构建拒绝使用 Debug 签名回退。

每次发布递增 `pubspec.yaml` 的版本与构建号，保留 Android 应用 ID 和签名，先执行检查与测试再构建。GitHub 推送不会使已安装的 App 自动更新。仓库中的 CI 配置提供检查和双平台构建入口，需要自行配置仓库的环境与签名 secrets；本轮未创建远程仓库或推送代码。

0.5.1 起应用名称统一为 WorkSpace。原始 Logo 位于 `assets/branding/workspace-logo.png`；运行 `scripts/generate-brand-assets.ps1` 可重新生成 Windows 多尺寸 ICO、Android 密度图标、自适应图标前景和启动画面。图标使用原书本与钢笔图案，配以米杏底色。Android 应用 ID `com.compus.atlas_workspace` 与 Dart 包名保持兼容。Windows 产品名变更会影响加密登录存储的目录，因此启动时会将原目录中的加密文件复制到新目录，已有新文件时不覆盖，原文件继续保留。

## 验收边界

0.4.0 按功能重构为暖白、米杏、陶土与橄榄绿界面。首页将今日待办、专注和学习放在主要位置；任务使用清单与状态筛选，项目采用进度卡片，笔记采用便笺，知识库提供收藏、教材书架与知识地图，课程以词句卡片及场景阅读呈现。侧栏中的探索工具可以折叠，设置与数据入口固定在底部。全局搜索可查找本账号已加载的记录及功能入口，Windows 支持 Ctrl+K。手机保留底部导航，并适配键盘和大字体。账号注册、云端保存、复习、备份与恢复沿用已有逻辑。截图、测试和发布记录见 `outputs/warm-ui-20261026/暖色界面重构与验收.md`，界面测试截图使用隔离的示例数据。

0.5.0 的 Know-how 内容位于独立的 `assets/knowhow.json`，由 `AssetCatalog` 按 `stable_key` 与原目录合并；重新导出旧目录不会覆盖实操指南。图解、步骤、算例和排错由 `knowhow_view.dart` 渲染，个人收录正文可以编辑。`LanguageHubPage` 为英语和日语提供统一入口，原语言代码和 FSRS 数据保持兼容。任务和提醒默认只显示未完成，今日范围使用执行/完成日期；历史仍可筛选查看，重复任务保留每次完成记录。

保存操作使用现有 RPC 返回的服务端修订号，并等待并发刷新；网络响应不确定时按同一 ID 和完整内容核对。编辑采用字段合并，同字段冲突需要在应用中核对双方内容。详情及本轮实际验证边界见 `outputs/knowhow-20261026/功能检查与修复报告.md`。

自动测试、静态检查、编译成功、原生窗口检查、Android 实机运行以及互联网双端同步是不同的证据。本轮具体通过项和剩余项记录在 `outputs/flutter-20261026/`，不得把数据库角色测试当作真机登录或双设备 Realtime 验收。

参考：[Flutter Windows 配置](https://docs.flutter.dev/platform-integration/windows/setup)、[Flutter Android 配置](https://docs.flutter.dev/platform-integration/android/setup)、[Supabase Flutter](https://supabase.com/docs/guides/getting-started/quickstarts/flutter)。
