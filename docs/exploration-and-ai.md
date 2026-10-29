# 探索与工具、个人 AI 与知识库

本轮修改面向 `apps/atlas` 原生主应用，客户端并入 [0.6.0 公开测试版](release-0.6.0.md)。Windows、Android 继续使用同一个 Supabase 账号体系，采集结果、来源配置、个人知识及 AI 执行记录存放在服务器，继承现有账号 RLS、Realtime 和版本检查。旧 React/Electron 应用保留。服务端已于 2026-10-28 部署到应用现有 Supabase 项目；部署前按账号创建加密备份，部署后已验证原有两个账号的三条业务记录完全一致。

## 使用入口

简历投递增加“实时岗位与公告”，原岗位目录、匹配、主简历、简历版本和投递记录保留。可添加 BOSS直聘、智联招聘的具体公开页、企业招聘网站，以及国家和地方人社、考试公告列表。支持 RSS/Atom、自建 RSSHub、网页公告链接和 JobPosting JSON-LD。只有结构化招聘数据才标为 job；列表入口标为 announcement，不能当作已核实的开放职位。招聘条件、截止时间、用工主体及是否仍在招聘须查看原文。匹配展示简历与条目的共同关键词。

股票页增加“金十与财经资讯”，可以直接从来源模板添加金十快讯。金十适配器解析 `https://www.jin10.com/flash_newest.js` 的 JSON 赋值数据，不执行远端脚本。金十内容作为财经资讯展示，现有东方财富报价、跨市场目录、自选和分组保留。

行业速览统一提供个人来源管理、启停、关键词过滤、服务器采集、网址去重、历史记录和收录知识库。资料检索保留账号内已有内容检索，公开网页改由服务器读取，提取后仍由用户核对再保存。

AI 助手允许添加多组兼容 Chat Completions 的 API 根地址、模型 ID、连接名称与 API Key，选择或删除连接。先加载已有连接，开启“公开来源 + 主动 AI”，再选择自由提问、搜寻资料、总结或修改正文。关键词检索覆盖当前账号知识、笔记和资讯，可指定某条知识。返回内容附带来源编号与资料版本。

修改知识时先显示原文和建议正文，允许继续编辑；确认保存走原有 repository 和 revision RPC，只更改 content，保留摘要、来源、关系等字段。原文保存在私有 AI 执行记录中，其他设备修改过原文则拒绝保存。超过单次长度限制或模型输出未正常结束时不生成可保存的建议。

## 服务器数据与边界

`atlas_ai_credentials` 独立于通用实体、导出与 Realtime，客户端没有 SELECT/INSERT/UPDATE/DELETE 权限。密钥使用 AES-GCM 和随机 IV 加密，认证附加数据绑定账号 ID。Edge Function 验证用户后，所有凭据操作都约束 user_id；服务端密钥不进入客户端。知识检索使用 security invoker RPC，同时显式限定 auth.uid()，不会查询其他账号。

AI 默认关闭；服务器在每次运行前重新读取个人策略。AI 每账号每小时最多 20 次，沿用现有限额。采集按来源每 5 分钟最多一次，采用数据库原子领取，跨账号无法领取他人来源。网页来源检查 robots.txt；登录、验证码、反爬、无公开条目和解析失败会显示失败记录。采集通过用户主动点击“更新来源”触发，本轮未增加后台定时任务。

公开读取只支持公网 HTTPS、逐跳检查重定向、限制响应体积和超时。带模型密钥的 POST 不跟随重定向。来源读取不使用登录 Cookie，不尝试绕过验证码。首次收录按规范化网址去重，重复采集不会覆盖已经保存或手动编辑的条目。

知识检索属于关键词检索加模型总结，尚未引入向量数据库或语义嵌入。普通检索/总结最多发送 8 篇资料、每篇前 5000 字；正文修改最多 24000 字，发送完整所选正文。长资料需要分段处理。密钥不包含在工作台导出中，换服务器后需要重新添加连接。更换 ATLAS_CREDENTIAL_SECRET 前应制定凭据迁移或重新录入方案。

## 部署

本机 Supabase CLI 登录已完成，已核对项目 `rvlnipmvhsodvjjfwirg` 与 `apps/atlas/config/prod.json` 一致。已补齐原两项初始化的迁移历史，并应用两项新增迁移，部署 atlas-assistant 和 atlas-collect，配置 ATLAS_CREDENTIAL_SECRET。以下保留后续部署命令；已有加密密钥不得随意覆盖。

```powershell
npx --yes supabase login
npx --yes supabase link --project-ref <现有项目编号>
npx --yes supabase db push --dry-run
npx --yes supabase db push
npx --yes supabase secrets set --env-file <仅本机保存的密钥文件> --project-ref <现有项目编号>
npx --yes supabase functions deploy atlas-assistant --project-ref <现有项目编号>
npx --yes supabase functions deploy atlas-collect --project-ref <现有项目编号>
```

密钥文件需要 `ATLAS_CREDENTIAL_SECRET`，使用至少 32 字符的随机私密值，保存在服务器秘密存储，不写入源码或聊天。函数同时使用 Supabase 提供的 SUPABASE_URL、SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY。上线前先核对迁移清单，部署后用两个测试账号分别添加来源、知识及模型，验证登录、采集、AI 引用、修改冲突和账号隔离，再进行真实手机升级验证。

## 验证与参考

服务器测试使用临时 PGlite PostgreSQL 执行全部四个迁移、原 RLS 回滚测试及新增检索/凭据/采集权限测试，不连接真实数据库。

```powershell
npx --yes deno check --config supabase/functions/deno.json supabase/functions/atlas-assistant/index.ts supabase/functions/atlas-collect/index.ts
npx --yes deno test --config supabase/functions/deno.json --allow-env --allow-read --allow-write supabase/tests/exploration_test.ts supabase/tests/exploration_rls_test.ts
```

真实来源探测脚本为 `supabase/tests/probe_exploration.ts`，记录在 `outputs/explore-20261028/live-sources.json`。此前本机来源探测被 DNS/公网地址检查拦截。部署后改用临时测试账号在真实服务器采集，金十与 RSS/Atom 已成功；BOSS 首轮结果混有分类和登录入口，补充过滤规则后最终获得 10 个具体岗位详情入口；岗位条件和开放状态仍需核对原文。智联暂无可解析的公开岗位，官方公告站遇到连接超时、证书校验失败或无可解析条目等问题。网站有入口不等于已得到有效岗位。最新服务器证据见 `outputs/explore-deploy-20261028/live-acceptance.json`。

设计参考 [RSSHub](https://github.com/DIYgod/RSSHub) 的来源适配、[Scrapy](https://github.com/scrapy/scrapy) 的采集与解析分离、[AKShare](https://github.com/akfamily/akshare) 的金融来源组织，以及 [Dify](https://github.com/langgenius/dify) 的检索上下文与模型连接分离。本轮自行实现轻量适配和检索流程，没有直接复制这些项目的实现，也没有把整套开源平台打包进客户端。

本轮本地验收：Flutter 静态分析无问题，139 项回归通过、1 项跳过，新增回归后共有 9 项服务器测试通过，并完成 21 项真实云端检查。Windows 完整 ZIP 和 Android 签名 APK 已生成到 `outputs/explore-20261028/build/`；八项新页面布局检查通过。验收包没有替换当前运行版本。服务端部署、真实账号隔离和个人 API 加密保存均已验证。模型的真实生成需要用户在应用中添加自己的有效 API；本轮测试未消耗付费模型额度。Android 真机升级仍未验证。早期本地验收见 `outputs/explore-20261028/验收说明.md`，最新云端验收见 `outputs/explore-deploy-20261028/云端部署验收.md`。
