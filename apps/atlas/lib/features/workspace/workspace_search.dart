import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import 'catalog.dart';
import 'entity.dart';
import 'workspace_controller.dart';

class WorkspaceSearch extends StatefulWidget {
  const WorkspaceSearch({
    super.key,
    required this.controller,
    required this.navigation,
    required this.onNavigate,
    required this.onOpenEntity,
  });
  final WorkspaceController controller;
  final List<(String, String, IconData, String)> navigation;
  final ValueChanged<String> onNavigate, onOpenEntity;
  @override
  State<WorkspaceSearch> createState() => _WorkspaceSearchState();
}

class _WorkspaceSearchState extends State<WorkspaceSearch> {
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final modules = widget.navigation
        .where((e) => query.isEmpty || e.$2.toLowerCase().contains(query))
        .take(6)
        .toList();
    final entries = query.isEmpty
        ? <WorkspaceEntity>[]
        : widget.controller.all
              .where(
                (e) =>
                    e.deletedAt == null &&
                    const [
                      'tasks',
                      'projects',
                      'quick_notes',
                      'knowledge',
                      'reminders',
                      'applications',
                      'learning_cards',
                    ].contains(e.kind) &&
                    e.payload.values.join(' ').toLowerCase().contains(query),
              )
              .take(15)
              .toList();
    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      child: SizedBox(
        width: 620,
        height: 540,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      autofocus: true,
                      onChanged: (v) => setState(() => _query = v),
                      decoration: const InputDecoration(
                        hintText: '搜索任务、笔记、知识或功能',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: '关闭搜索',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, size: 20),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  if (modules.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Text(
                        '功能入口',
                        style: TextStyle(
                          fontSize: 11,
                          color: AtlasColors.muted,
                        ),
                      ),
                    ),
                    for (final module in modules)
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                        ),
                        leading: Icon(
                          module.$3,
                          size: 20,
                          color: AtlasColors.gold,
                        ),
                        title: Text(
                          module.$2,
                          style: const TextStyle(fontSize: 13),
                        ),
                        subtitle: Text(
                          module.$4,
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: const Icon(
                          Icons.arrow_forward_rounded,
                          size: 16,
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          widget.onNavigate(module.$1);
                        },
                      ),
                  ],
                  if (entries.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        '我的内容',
                        style: TextStyle(
                          fontSize: 11,
                          color: AtlasColors.muted,
                        ),
                      ),
                    ),
                    for (final entry in entries)
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                        ),
                        leading: Icon(
                          specFor(entry.kind).icon,
                          size: 20,
                          color: AtlasColors.teal,
                        ),
                        title: Text(
                          entry
                              .text(specFor(entry.kind).titleKey)
                              .split('\n')
                              .first,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13),
                        ),
                        subtitle: Text(
                          specFor(entry.kind).label,
                          style: const TextStyle(fontSize: 11),
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          widget.onOpenEntity(entry.id);
                        },
                      ),
                  ],
                  if (modules.isEmpty && entries.isEmpty)
                    const AtlasEmptyState(
                      icon: Icons.search_off_rounded,
                      title: '暂时没有找到相关内容',
                      description: '换一个关键词试试。',
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
