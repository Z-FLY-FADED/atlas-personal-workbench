import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_version.dart';
import '../../shared/widgets/atlas_widgets.dart';
import 'update_manifest.dart';
import 'update_service.dart';
import 'update_backup.dart';
import 'update_compatibility.dart';

class AppUpdatePage extends StatefulWidget {
  const AppUpdatePage({
    super.key,
    this.service,
    this.versionLoader,
    this.platform,
    this.openUrl,
    this.beforeDownload,
    this.exportBackup,
  });
  final AppUpdateService? service;
  final Future<InstalledAppVersion> Function()? versionLoader;
  final UpdatePlatform? platform;
  final Future<bool> Function(Uri)? openUrl;
  final Future<String> Function()? beforeDownload;
  final Future<bool> Function()? exportBackup;
  @override
  State<AppUpdatePage> createState() => _AppUpdatePageState();
}

class _AppUpdatePageState extends State<AppUpdatePage> {
  InstalledAppVersion? _installed;
  UpdateManifest? _available;
  String? _message;
  String? _backupStatus;
  bool _checking = false,
      _opening = false,
      _versionFailed = false,
      _incompatible = false;
  UpdatePlatform? get _platform =>
      widget.platform ??
      switch (defaultTargetPlatform) {
        TargetPlatform.windows => UpdatePlatform.windows,
        TargetPlatform.android => UpdatePlatform.android,
        _ => null,
      };

  @override
  void initState() {
    super.initState();
    unawaited(_loadVersion());
  }

  Future<void> _loadVersion() async {
    try {
      final version =
          await (widget.versionLoader ?? InstalledAppVersion.load)();
      if (mounted) setState(() => _installed = version);
    } catch (_) {
      if (mounted) {
        setState(() {
          _versionFailed = true;
          _message = '暂时无法读取当前版本，可打开下载页查看。';
        });
      }
    }
  }

  Future<void> _check() async {
    if (_checking || _opening || _installed == null) return;
    setState(() {
      _checking = true;
      _available = null;
      _message = null;
      _incompatible = false;
    });
    try {
      final latest = await (widget.service ?? AppUpdateService()).fetch();
      if (!mounted) return;
      setState(() {
        _available = latest;
        _message = latest.isNewerThan(_installed!)
            ? latest.platforms[_platform] == null
                  ? '新版本已发布，该平台暂未提供下载。'
                  : '有新版本可以更新'
            : '当前已是最新版本';
      });
    } on UpdateCompatibilityException {
      if (mounted) {
        setState(() {
          _incompatible = true;
          _message = '此更新的数据兼容性尚未确认，已暂停下载。请联系维护者。';
        });
      }
    } on TimeoutException {
      if (mounted) setState(() => _message = '检查更新超时，请稍后重试。');
    } catch (_) {
      if (mounted) setState(() => _message = '暂时无法检查更新，请检查网络后重试，或打开下载页。');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _open(Uri uri, {bool protectData = false}) async {
    if (_opening || _incompatible) return;
    setState(() => _opening = true);
    try {
      if (protectData && widget.beforeDownload != null) {
        setState(() => _backupStatus = '正在同步并创建更新前备份…');
        try {
          final result = await widget.beforeDownload!();
          if (!mounted || _incompatible) return;
          setState(() => _backupStatus = result);
        } on UpdateProtectionException catch (e) {
          if (mounted) setState(() => _backupStatus = e.message);
          return;
        } catch (_) {
          if (mounted) {
            setState(() => _backupStatus = '更新前备份未完成，已暂停下载。请检查同步和本机存储后重试。');
          }
          return;
        }
      }
      final opened =
          await (widget.openUrl ??
              (url) =>
                  launchUrl(url, mode: LaunchMode.externalApplication))(uri);
      if (!opened) throw StateError('无法打开浏览器');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('无法打开浏览器，请稍后重试。')));
      }
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  Future<void> _exportBackup() async {
    if (_opening || widget.exportBackup == null) return;
    setState(() => _opening = true);
    try {
      final saved = await widget.exportBackup!();
      if (mounted && saved) {
        setState(() => _backupStatus = '已导出更新备份，可在“数据与恢复”中导入。请妥善保存文件。');
      }
    } on UpdateProtectionException catch (e) {
      if (mounted) setState(() => _backupStatus = e.message);
    } catch (_) {
      if (mounted) setState(() => _backupStatus = '备份未导出，请检查同步和存储后重试。');
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final latest = _available;
    final upgrade =
        latest != null && _installed != null && latest.isNewerThan(_installed!);
    final asset = latest?.platforms[_platform];
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const AtlasPageHeader(
          title: '关于与更新',
          subtitle: '查看当前版本，接续新的改进。',
          eyebrow: 'WORKSPACE',
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: AtlasBrand(),
                ),
                const SizedBox(height: 22),
                Text(
                  _installed == null
                      ? (_versionFailed ? '版本暂不可用' : '正在读取版本…')
                      : '当前版本 ${_installed!.label}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 10),
                const Text('检查更新不会上传账号或工作台内容。'),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 12,
                  runSpacing: 10,
                  children: [
                    FilledButton.icon(
                      onPressed: _checking || _opening || _installed == null
                          ? null
                          : _check,
                      icon: _checking
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.refresh_rounded),
                      label: Text(_checking ? '正在检查…' : '检查更新'),
                    ),
                    OutlinedButton.icon(
                      onPressed: _opening
                          ? null
                          : () => _open(allReleasesUrl, protectData: true),
                      icon: const Icon(Icons.open_in_new_rounded),
                      label: const Text('打开下载页'),
                    ),
                  ],
                ),
                if (_message != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 18),
                    child: Text(
                      _message!,
                      key: const ValueKey('update-status'),
                    ),
                  ),
                if (_backupStatus != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Text(
                      _backupStatus!,
                      key: const ValueKey('update-backup-status'),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (upgrade) ...[
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'WorkSpace ${latest.version}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${latest.publishedAt.toLocal().toString().split(' ').first} · ${latest.channel == 'preview' ? '测试版' : '正式版'}${asset == null ? '' : ' · ${(asset.sizeBytes / 1048576).toStringAsFixed(1)} MB'}',
                  ),
                  const SizedBox(height: 16),
                  SelectableText(latest.notes),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 10,
                    children: [
                      if (asset != null)
                        FilledButton.icon(
                          onPressed: _opening
                              ? null
                              : () => _open(asset.url, protectData: true),
                          icon: const Icon(Icons.download_outlined),
                          label: const Text('下载更新'),
                        ),
                      TextButton(
                        onPressed: _opening
                            ? null
                            : () => _open(latest.releaseUrl),
                        child: const Text('查看发布说明'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '更新前的数据保护',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Text(
                  widget.beforeDownload == null
                      ? '已有账号请先登录，再下载更新并保存更新前备份。'
                      : '下载前先同步云端数据，并在本机保存加密备份。保存未完成或备份失败时，暂停下载。',
                ),
                if (widget.exportBackup != null) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _opening ? null : _exportBackup,
                    icon: const Icon(Icons.save_alt_rounded),
                    label: const Text('导出更新备份'),
                  ),
                  const SizedBox(height: 8),
                  const Text('导出的 JSON 可在“数据与恢复”中导入。文件包含当前账号的业务数据，请妥善保存。'),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('如何更新', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Text(
                  _platform == UpdatePlatform.android
                      ? '下载新版 APK 后按系统提示覆盖安装，保留现有应用即可。'
                      : '下载 Windows 完整包，关闭当前程序后解压到新文件夹，再运行新版 WorkSpace.exe。',
                ),
                const SizedBox(height: 10),
                const Text('更新前确认内容已保存，重要内容可先导出备份。下载由浏览器完成，安装时按系统提示操作。'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
