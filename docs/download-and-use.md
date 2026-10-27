# WorkSpace 下载与使用

公开测试版下载页：https://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v0.5.2

选择页面 Assets 中的 Windows ZIP 或 Android APK。页面自动附带的 Source code 是开发源码，普通使用者无需下载。无需安装 Flutter、Node.js 或数据库，也不需要运行开发者电脑上的服务。

## Windows

下载 WorkSpace-0.5.2-Windows-x64.zip，在 Windows 10/11 64 位电脑上完整解压到固定文件夹，例如 D:\Apps\WorkSpace，然后双击 WorkSpace.exe。运行时必须保留同目录的 DLL 和 data 文件夹。可以给 WorkSpace.exe 创建桌面快捷方式。

公开下载包附带微软签名的 x64 C++ 运行库。如果仍提示运行库缺失，可从微软官方页面安装最新 x64 Visual C++ v14 Redistributable：https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist 。

## Android

下载 WorkSpace-0.5.2-Android.apk，在 Android 7.0 或以上设备打开 APK，按系统安装流程安装。系统可能要求为打开 APK 的浏览器或文件管理器授予安装应用权限。目前提供 APK 下载，不依赖应用商店账号。

已有旧版时，安装新版 APK 进行覆盖更新。新版继续使用相同应用 ID 和长期签名；请不要为升级先卸载旧版。

## 首次使用与数据

打开应用后选择“注册”，填写自己的用户名和密码。用户名为 3–24 个中文、英文字母、数字或下划线，密码至少 8 个字符。不需要提供真实邮箱。已有账号直接登录；同一账号可在 Windows 和 Android 登录同一云端工作区。

注册、登录和保存数据需要联网。每人使用自己的账号，数据按账号隔离，不共享开发者的个人账号。当前版本连接同一托管云项目，后续运营和容量由项目维护者管理。退出账号或换设备前，确认内容已保存。

没有邮件找回密码功能，忘记密码需要联系应用维护者。AI 默认关闭，尚未配置的模型功能不能生成结果。

## 版本与验证范围

当前版本 0.5.2，Android 构建号 9，为公开测试版。Windows 尚未做商业代码签名；Android 真机安装、设备兼容性和双设备同步尚未完成实测。已完成编译、签名校验及隔离自动测试，不代表所有设备均已验证。

发布页提供 SHA256SUMS.txt 和 download-manifest.json，可用于核对下载文件。Windows 后续更新应先关闭程序、备份重要内容，再解压完整新包到新文件夹；可在“关于与更新”中检查新版本并打开下载链接，安装需按系统提示完成。

参考：Flutter 支持平台 https://docs.flutter.dev/reference/supported-platforms ，Windows 分发要求 https://docs.flutter.dev/platform-integration/windows/building 。
