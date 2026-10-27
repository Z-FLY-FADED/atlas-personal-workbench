# 工作台目录与清理说明

主应用为 `apps/atlas` 中的 Flutter 工程，名称为 WorkSpace，当前版本 `0.5.2+9`。`release/flutter/windows/` 是本机可直接运行的完整 Windows 程序，必须保留其中的 DLL 和 `data/`；同目录下仅保留一份当前 Windows ZIP 分发包和 `WorkSpace-Android.apk`。

`运行WorkSpace.cmd`、`启动工作台.vbs` 与桌面 WorkSpace 快捷方式均应打开 `release/flutter/windows/WorkSpace.exe`。`安装WorkSpace桌面版.cmd` 用于重新生成这个快捷方式。根目录的 `package.json`、React/Electron 源码与 Node 依赖继续保留，供兼容核对、旧数据导出及尚未替代的专用流程使用；它们不是当前桌面启动入口。

`.wrangler/` 保留原始数据库。`.runtime/flutter-migration/` 保留按旧账号分别导出的数据。`apps/atlas/config/` 中的本机连接配置、`apps/atlas/android/atlas-release.jks` 和 `key.properties`、`.runtime/signing-backup-*` 中的签名备份均保留；后续发布必须沿用原签名。

`.runtime/backups/latest-source-*.zip` 为上一次目录整理时的源码快照，`.runtime/backups/data-before-cleanup-20261026/` 为整理前的数据库备份，`before-flutter-data-20261026/` 是首次重构时的原数据基线。暖色改版前的源码和 0.3.0 发布包保存在 `.runtime/backups/before-warm-ui-20261026-141429/`，供本次界面更新回退使用。历史论文图表、答辩文件、设计资料、旧报告与旧源码备份纳入 `.runtime/archives/history-*.zip`，压缩包保留项目内的原相对路径。

WorkSpace 更名前的 0.5.0 源码、发布包与旧快捷方式保存在 `.runtime/backups/before-workspace-brand-20261026/`。Windows 的原加密会话文件保留在原用户目录；首次运行新版时仅在新目录尚无存储文件时复制，以兼容原登录状态。Android 原应用 ID、签名、账号隔离及备份格式继续沿用。

`.runtime/toolchains/paths.json` 记录实际使用的外部工具路径，`gradle-9.3.1-bin.zip` 与校验文件继续保留。工程内未使用的重复 Flutter/Android SDK、重复 Pub 缓存及下载的安装文件会清除，不涉及这些实际配置的外部工具。当前工具位于本机临时目录，系统若将其清除，需要重新安装或通过 `scripts/flutter-app.ps1` 的参数指定长期路径。

清理清单、删除与归档结果、文件保留校验以及本次完整测试记录位于 `outputs/cleanup-20261026/`。`scripts/clean-project.ps1` 需要 PowerShell 7，默认仅生成清单，只有显式传入 `-Apply` 才会按清单归档和清理。它校验目标位于本项目内，不沿目录联接进入其他路径，并拒绝与受保护文件重叠的目标。
