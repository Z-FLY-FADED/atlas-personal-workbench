# ATLAS 个人工作台（初始化版本）

面向 PC、手机与平板的个人工作台网站。包含任务管理、知识库、三维知识关联图、语言学习、招聘与行业情报、统一股票研究工作台以及多模型配置等功能。股票模块将 A股、港股与美股集中到同一入口，提供跨市场筛选、研究信号拆解、数据来源状态和账户自选。行业情报模块支持 RSS/Atom 与 RSSHub 来源、增量采集、标题指纹去重、来源健康度、已读/重点状态及一键沉淀到知识库。

本仓库是已脱敏的初始化版本，仅包含主要功能源码、通用演示内容和数据库结构；不包含个人资料、本地数据库、运行日志、构建产物、部署项目标识或真实密钥。

## 项目结构

```text
个人工作台/
├─ app/                         # 前端页面、样式与服务端接口
│  ├─ page.tsx                  # 主界面：导航、任务、知识库、学习、行业和市场模块
│  ├─ globals.css               # 全局主题、响应式布局、知识球与三维关联图样式
│  ├─ knowledge-taxonomy.ts     # 知识库一级/二级分类体系与内容分类规则
│  ├─ knowledge-intelligence.ts # 自动标题、摘要、关键词、主题与关联关系计算
│  ├─ knowledge-enrichment.ts   # 专业知识卡片的原理、公式、方法与资料扩充
│  ├─ industry/                 # 行业来源、Feed 解析、去重、种子资料与 D1 存储
│  ├─ components/industry/      # 行业情报收件箱与来源管理界面
│  └─ api/                      # 工作台数据、AI、招聘和市场数据接口
├─ db/
│  └─ schema.ts                 # D1 数据库结构定义
├─ migrations/                  # 数据库迁移记录（按编号顺序执行）
├─ worker/                      # Cloudflare Worker 类型与运行配置
├─ public/                      # 网站静态资源
├─ tests/                       # 自动化测试
├─ .openai/hosting.json         # 站点部署与 D1 绑定声明
├─ package.json                 # 依赖与常用命令
├─ pnpm-lock.yaml               # 部署使用的依赖锁定文件
├─ vite.config.ts               # 本地开发与构建配置
└─ drizzle.config.ts            # 数据库迁移生成配置
```

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
- `.openai/hosting.json` 仅声明逻辑数据库绑定；首次部署时由部署环境创建或关联实际站点项目。
- `migrations/` 内的迁移文件不可随意删除；新字段应通过 `db/schema.ts` 修改后生成新的迁移。
- `node_modules/`、`dist/` 等依赖与构建目录不包含在此源码副本中，可由上述命令重新生成。
