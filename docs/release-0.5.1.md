# WorkSpace 0.5.1

WorkSpace 的主应用为 Windows / Android 共用的 Flutter 工程，位于 `apps/atlas/`。两端直接连接 Supabase，支持用户名密码注册、账号数据隔离、备份与恢复。根目录保留 React/Electron 工程，供旧数据导出和兼容核对。

这一版使用书本与钢笔 Logo，统一应用名称、Windows 暖色标题栏与窗口按钮、桌面图标、Android 图标及启动画面。Windows 升级兼容原有加密登录存储；Android 沿用应用 ID 和长期签名，构建号递增至 8。

近期更新包含按功能组织的暖色界面，17 篇 Know-how 指南及配套图解、68 个操作步骤与排错内容。英语和日语统一归入“学习与成长 → 语言学习”。任务日期筛选、重复任务完成记录、正文编辑、导入去重、保存修订号和网络异常后的状态显示均已补充回归检查。

发布前通过 Flutter 静态检查、99 项 Flutter 隔离测试、21 项原生标题栏检查、66 项 React/Electron 回归测试，以及 TypeScript 类型检查、Lint 和旧版生产构建。Windows 与 Android Release 构建完成，Android 发布签名与前版一致。Windows 完整运行目录与 ZIP 的 31 个文件逐一核对一致。

自动测试使用隔离数据。原数据库、连接配置、登录存储、签名及本地备份不纳入 GitHub 提交。原生窗口的本轮目视检查因应用授权超时未完成；Android 真机覆盖安装和双设备实时同步尚未实测。

运行、构建、连接配置与签名说明见 [双端应用说明](native-app.md)。GitHub 源码更新不会自动升级已安装的应用，Windows 需要使用完整发布目录，Android 需要安装同签名的新 APK。
