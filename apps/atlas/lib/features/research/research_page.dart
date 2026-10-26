import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';
import 'public_source_service.dart';

class ResearchPage extends StatefulWidget {
  const ResearchPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  State<ResearchPage> createState() => _ResearchPageState();
}

class _ResearchPageState extends State<ResearchPage> {
  final _url = TextEditingController();
  String _query = '';
  bool _busy = false;
  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hits = widget.controller.all
        .where(
          (e) =>
              e.deletedAt == null &&
              [
                'knowledge',
                'quick_notes',
                'projects',
                'tasks',
              ].contains(e.kind) &&
              _query.isNotEmpty &&
              e.payload.values
                  .join(' ')
                  .toLowerCase()
                  .contains(_query.toLowerCase()),
        )
        .take(50)
        .toList();
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const AtlasPageHeader(
          title: '资料检索',
          subtitle: '在自己的资料里检索，也把有价值的网页收进来。',
          eyebrow: 'FOLLOW YOUR CURIOSITY',
        ),
        const SizedBox(height: 16),
        TextField(
          decoration: const InputDecoration(
            labelText: '检索关键词',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() => _query = v.trim()),
        ),
        const SizedBox(height: 12),
        for (final item in hits)
          Card(
            child: ListTile(
              title: Text(
                item.text(specFor(item.kind).titleKey, item.id),
                maxLines: 2,
              ),
              subtitle: Text(specFor(item.kind).label),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => EntityDetailPage(
                    controller: widget.controller,
                    entityId: item.id,
                  ),
                ),
              ),
            ),
          ),
        if (_query.isNotEmpty && hits.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Text('没有匹配的已保存资料。'),
          ),
        const SizedBox(height: 32),
        Text('收录公开网页', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        TextField(
          controller: _url,
          decoration: const InputDecoration(labelText: 'HTTPS 原文网址'),
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: _busy
                ? null
                : () => runAction(context, () async {
                    if (!RuntimePolicy.read(
                      widget.controller.all,
                    ).allowsPublic) {
                      throw StateError('外部来源已关闭，请到 AI 助手页启用公开来源。');
                    }
                    setState(() => _busy = true);
                    try {
                      final url = _url.text.trim();
                      final raw = await PublicSourceService.fetch(url);
                      final text = PublicSourceService.plainText(raw);
                      if (text.isEmpty) {
                        throw const FormatException('未提取到可读正文，请手动粘贴。');
                      }
                      if (context.mounted) {
                        await editEntity(
                          context,
                          widget.controller,
                          specFor('knowledge'),
                          initial: {
                            'title': Uri.parse(url).host,
                            'content': text,
                            'source': url,
                            'source_type': '网址',
                          },
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  }),
            icon: const Icon(Icons.travel_explore),
            label: Text(_busy ? '读取中…' : '读取并核对正文'),
          ),
        ),
      ],
    );
  }
}
