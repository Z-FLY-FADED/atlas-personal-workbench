# WorkSpace 个人工作台 · Windows / Android

主应用已改为 `apps/atlas` 中的 Flutter + Dart 工程，两端直接连接 Supabase Auth、PostgreSQL 与 Realtime，不依赖这台电脑运行本地服务。原 React/Electron 工作台保留在根目录，供迁移核对和暂未替代的专用流程使用。

双端启动、构建、旧数据迁移、签名保存与验收边界见 [双端应用说明](docs/native-app.md)。Windows 程序与 Android APK 的生成目录为 `release/flutter/`。

0.4.0 按功能重构为暖白、米杏与陶土色界面：首页围绕今日任务、专注与学习组织，任务使用待办清单，项目展示进度，笔记使用便笺，知识库采用图文书架，课程按词句与场景阅读排版。顶部支持搜索现有内容与功能，Windows 可用 Ctrl+K 打开。截图与验收记录见 `outputs/warm-ui-20261026/`。

0.4.1 将 Windows 原生标题栏统一为米杏底色、陶土图标与圆角窗口按钮，显示中文标题，并保留系统拖动、缩放、最小化、最大化/还原和关闭操作。发布包、原生窗口截图与验证记录见 `outputs/titlebar-20261026/`。

0.5.0 将知识库整理为 17 篇 Know-how 实操指南，包含技术链路图、68 个操作步骤、算例、验收标准和排错路径。英语与日语统一放入“学习与成长 → 语言学习”，放大侧栏分组标题并精简操作提示。修复日期筛选、重复任务、正文编辑、主简历重复导入、保存版本及网络异常后的显示问题；本轮通过 96 项隔离自动测试和 21 项原生窗口命令检查。具体范围及未实测项见 `outputs/knowhow-20261026/功能检查与修复报告.md`。

0.5.1 使用用户提供的书本与钢笔 Logo，统一名称为 WorkSpace，更新应用内品牌、Windows 标题栏与程序图标、Android 桌面图标及启动画面。Windows 首次升级会保留并迁移原有加密登录存储；Android 沿用原应用 ID 和发布签名。品牌素材生成入口为 `scripts/generate-brand-assets.ps1`，原始透明 PNG 位于 `apps/atlas/assets/branding/workspace-logo.png`。验证范围见 [0.5.1 更新说明](docs/release-0.5.1.md)。

清理后的发布目录只保留当前版。双击 `运行WorkSpace.cmd` 或 `启动工作台.vbs` 可启动 Windows 原生应用；`安装WorkSpace桌面版.cmd` 更新桌面 WorkSpace 快捷方式。目录保留范围、历史资料位置与测试记录见 [清理后目录说明](docs/workspace-cleanup.md)。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/flutter-app.ps1 -Action doctor
powershell -ExecutionPolicy Bypass -File scripts/flutter-app.ps1 -Action analyze
powershell -ExecutionPolicy Bypass -File scripts/flutter-app.ps1 -Action test
powershell -ExecutionPolicy Bypass -File scripts/flutter-app.ps1 -Action build-windows -Config prod
powershell -ExecutionPolicy Bypass -File scripts/flutter-app.ps1 -Action build-apk -Config prod
```

以下保留旧版网站与 Electron 的说明。

## 旧版个人工作台

面向 PC、手机与平板的个人工作台网站。包含任务管理、知识库、三维知识关联图、语言学习、招聘与行业情报、统一股票研究工作台以及多模型配置等功能。股票模块将 A股、港股与美股集中到同一入口，提供跨市场筛选、研究信号拆解、数据来源状态和账户自选。行业情报模块支持 RSS/Atom 与 RSSHub 来源、增量采集、标题指纹去重、来源健康度、已读/重点状态及一键沉淀到知识库。

## 项目结构

```text
个人工作台/
├─ app/                         # 前端页面、样式与服务端接口
│  ├─ page.tsx                  # 路由入口，只装配工作台应用
│  ├─ shell/                    # 页面外壳、导航、功能装配与视图入口
│  ├─ contracts/                # 前后端共享的数据类型与备份格式
│  ├─ features/                 # tasks / knowledge / learning / career / market 等功能
│  │  └─ <feature>/             # domain、hooks、components、views，按功能维护
│  ├─ shared/                   # HTTP、存储、下载、文档解析与通用组件
│  ├─ server/                   # 服务端业务、查询、持久化与外部数据采集
│  ├─ api/                      # HTTP 路由适配层，保留现有接口地址
│  ├─ styles/                   # 按既有层叠顺序拆分的主题与模块样式
│  └─ globals.css               # Tailwind 与有序样式导入入口
├─ db/
│  └─ schema.ts                 # D1 数据库结构定义
├─ migrations/                  # 数据库迁移记录（按编号顺序执行）
├─ worker/                      # Cloudflare Worker 类型与运行配置
├─ public/                      # 网站静态资源
├─ tests/                       # 自动化测试
├─ .openai/hosting.example.json # 站点部署与 D1 绑定示例
├─ package.json                 # 依赖与常用命令
├─ pnpm-lock.yaml               # 部署使用的依赖锁定文件
├─ vite.config.ts               # 本地开发与构建配置
└─ drizzle.config.ts            # 数据库迁移生成配置
```

模块职责、依赖规则和后续扩展方式见 [架构说明](docs/architecture.md)。视图与弹窗按需加载；各功能保留自己的状态，切换页面时不会重新创建整个工作台。服务端工作台模块分别维护查询、修改、序列化和网页来源处理。

## 核心数据流

```text
手动输入 / 网页地址 / 上传文档
        ↓
内容识别：标题、摘要、关键词、分类
        ↓
知识扩充：原理、公式、方法、参考资料
        ↓
D1 数据库：知识条目、主题、关联关系
        ↓
三维知识球：分类球 ← 主题球 ← 知识条目球
```

行业情报数据流：

```text
官方 RSS/Atom / RSSHub
        ↓
条件请求：ETag、Last-Modified、失败退避
        ↓
URL 规范化 + 标题 SimHash 去重
        ↓
D1：来源、文章、采集运行、用户阅读动作
        ↓
行业情报收件箱 → 重点关注 / 忽略 / 存入知识库
```

## 本地运行（Windows）

需要 Node.js 22.13 或更高版本。首次进入目录后执行：

```powershell
pnpm install
pnpm dev
```

生产构建验证：

```powershell
pnpm build
```

重构后的完整检查：

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`tests/architecture.test.ts` 检查运行时循环依赖，并阻止客户端代码引入服务端模块、Cloudflare 绑定和 Node 内置模块。

在 Cloudflare Workers 本地运行时预览构建结果：

```powershell
pnpm start --port 3005 --strictPort
```

旧版网站使用 D1，生产预览通过 Vite 的 Cloudflare 插件运行。旧 Electron 源码的开发模式默认使用 3002 端口，检查 `/api/health` 后再打开页面。当前桌面入口已切换到 Flutter 原生应用，无需本地 HTTP 服务。

数据库结构变更后生成迁移：

```powershell
pnpm db:generate
```

部署或首次运行前必须应用数据库迁移；运行时接口不会再重复建表：

```powershell
pnpm db:migrate:local
pnpm db:migrate:remote
```

本地迁移可直接使用仓库内的 `wrangler.jsonc`。执行远程迁移前，必须把其中的占位 `database_id` 替换为目标 D1 数据库 ID；托管平台部署则应使用平台注入的实际绑定。

## 密钥与生产安全

- `.env.local` 只用于本地开发且不会进入 Git；不要同步、截图或备份该文件。
- 生产密钥必须由部署环境注入，并且每个部署使用独立随机值：

```powershell
pnpm exec wrangler secret put AI_KEY_ENCRYPTION_SECRET
pnpm exec wrangler secret put AI_SCHEDULER_SECRET
```

- 更换 `AI_KEY_ENCRYPTION_SECRET` 前先迁移或重新保存已加密的模型 API Key，否则旧数据无法解密。
- `/api/ai` 的付费查询默认限制为每用户每分钟 10 次，可通过 `AI_QUERY_RATE_LIMIT_PER_MINUTE` 调整。
- 生产请求缺少 `oai-authenticated-user-id` 时返回 401；仅 localhost 开发环境使用本地用户回退。

## 数据与部署

- 工作台数据由 Cloudflare D1 保存，通过登录用户标识隔离。
- `.openai/hosting.example.json` 提供通用本地 D1 绑定；实际部署时复制为 `.openai/hosting.json` 并填写站点项目。真实配置仅保存在本机，由 Git 忽略。
- `migrations/` 内的迁移文件不可随意删除；新字段应通过 `db/schema.ts` 修改后生成新的迁移。
- `node_modules/`、`dist/` 等依赖与构建目录不包含在此源码副本中，可由上述命令重新生成。

## 离线与规则优先

默认使用公开来源与本地规则，模型执行和自动模型任务均关闭。在“数据与恢复”或“AI 模型”的运行方式中可切换到离线模式，或主动开启 AI 辅助。

本机服务运行时，断开互联网仍可管理基础数据、查看知识、练习语言和保存统计周报。公开网页与 RSS 采集不依赖模型；来源不可访问时展示带时间标识的缓存。手机或远程网页与服务器完全断开后，数据库保存仍需等待连接恢复。

详见 [离线使用说明](docs/offline-usage.md) 和 [架构说明](docs/architecture.md)。
