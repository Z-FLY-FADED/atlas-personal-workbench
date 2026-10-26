# WorkSpace

Windows 与 Android 共用 `lib/`。运行与构建使用仓库根目录的
`scripts/flutter-app.ps1`，完整说明在 `../../docs/native-app.md`。

`config/example.json` 提供连接格式。真实的 `config/dev.json`、
`config/prod.json`、Android 签名文件均由 Git 忽略。

数据库迁移位于仓库根目录的 `supabase/migrations/`。
