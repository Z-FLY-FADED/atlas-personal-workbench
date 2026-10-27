import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/file_io.dart';
import '../../shared/widgets/collection_page.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';
import 'archive_service.dart';
import 'archive_cipher.dart';
import '../../core/app_version.dart';

class DataPage extends StatefulWidget {
  const DataPage({super.key, required this.controller, required this.userId});
  final WorkspaceController controller;
  final String userId;
  @override
  State<DataPage> createState() => _DataPageState();
}

class _DataPageState extends State<DataPage> {
  late final Future<InstalledAppVersion?> _version = () async {
    try {
      return await InstalledAppVersion.load();
    } catch (_) {
      return null;
    }
  }();
  final _password = TextEditingController();
  bool _busy = false;
  String? _status;
  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final deleted = c.all.where((e) => e.deletedAt != null).toList();
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const AtlasPageHeader(
          title: '数据与备份',
          subtitle: '管理备份、迁移与恢复，让积累一直陪着你。',
          eyebrow: 'KEEP WHAT MATTERS',
        ),
        const SizedBox(height: 12),
        const Text('云数据库是当前数据源。断网时保留当前页面供阅读；修改只有在云端确认后才算保存。'),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('备份与迁移', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                const Text(
                  '支持本应用与旧版工作台的加密或普通 JSON 备份。导入只新增缺少的记录，不覆盖云端修改。导入前请核对当前账号。',
                ),
                const SizedBox(height: 8),
                SelectableText(
                  '当前账号 ID：${widget.userId}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: '备份密码（留空导出普通 JSON）',
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    FilledButton.icon(
                      onPressed: _busy || c.loading
                          ? null
                          : () => runAction(context, () async {
                              await c.refresh();
                              if (!c.connected) {
                                throw StateError('尚未取得最新云端数据，请联网刷新后导出。');
                              }
                              final saved = await saveFile(
                                'WorkSpace-backup-${DateTime.now().millisecondsSinceEpoch}.json',
                                await ArchiveCipher.encode(
                                  ArchiveService.export(c.all),
                                  _password.text,
                                ),
                              );
                              if (saved && mounted) {
                                setState(
                                  () => _status = '已导出 ${c.all.length} 条记录。',
                                );
                              }
                            }),
                      icon: const Icon(Icons.download),
                      label: const Text('导出备份'),
                    ),
                    OutlinedButton.icon(
                      onPressed: _busy || c.saving
                          ? null
                          : () => runAction(context, () async {
                              final bytes = await pickJson();
                              if (bytes == null) return;
                              final rows = ArchiveService.parse(
                                await ArchiveCipher.decode(
                                  bytes,
                                  _password.text,
                                ),
                              );
                              if (!context.mounted) return;
                              final counts = <String, int>{};
                              for (final row in rows) {
                                final kind = row['kind'] as String;
                                counts[kind] = (counts[kind] ?? 0) + 1;
                              }
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: Text('导入 ${rows.length} 条记录？'),
                                  content: SingleChildScrollView(
                                    child: Text(
                                      counts.entries
                                          .map(
                                            (e) =>
                                                '${specFor(e.key).label}：${e.value}',
                                          )
                                          .join('\n'),
                                    ),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(context, false),
                                      child: const Text('取消'),
                                    ),
                                    FilledButton(
                                      onPressed: () =>
                                          Navigator.pop(context, true),
                                      child: const Text('导入当前账号'),
                                    ),
                                  ],
                                ),
                              );
                              if (confirmed != true || !mounted) return;
                              setState(() => _busy = true);
                              try {
                                final count = await c.importRows(rows);
                                await c.refresh();
                                if (mounted) {
                                  setState(
                                    () => _status =
                                        '已新增 $count 条，跳过 ${rows.length - count} 条已有记录。',
                                  );
                                }
                              } finally {
                                if (mounted) setState(() => _busy = false);
                              }
                            }),
                      icon: const Icon(Icons.upload_file),
                      label: Text(_busy ? '导入中…' : '导入 JSON'),
                    ),
                  ],
                ),
                if (_status != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(_status!),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          '回收站 · ${deleted.length}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        for (final item in deleted)
          ListTile(
            title: Text(item.text(specFor(item.kind).titleKey, item.id)),
            subtitle: Text(specFor(item.kind).label),
            trailing: TextButton(
              onPressed: c.saving
                  ? null
                  : () => runAction(context, () => c.restore(item)),
              child: const Text('恢复'),
            ),
          ),
        const SizedBox(height: 24),
        Text('全部数据集合', style: Theme.of(context).textTheme.titleLarge),
        for (final kind in entityKinds)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(specFor(kind).icon),
            title: Text(specFor(kind).label),
            trailing: Text('${c.items(kind).length}'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (context) => Scaffold(
                  appBar: AppBar(title: Text(specFor(kind).label)),
                  body: ListenableBuilder(
                    listenable: c,
                    builder: (context, _) =>
                        CollectionPage(controller: c, kind: kind),
                  ),
                ),
              ),
            ),
          ),
        const SizedBox(height: 12),
        FutureBuilder<InstalledAppVersion?>(
          future: _version,
          builder: (context, snapshot) => Text(
            'WorkSpace${snapshot.data == null ? '' : ' ${snapshot.data!.version}'} · 共 ${c.all.length} 条记录',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}
