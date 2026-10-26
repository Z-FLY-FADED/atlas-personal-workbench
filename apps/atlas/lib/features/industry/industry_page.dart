import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/collection_page.dart';
import '../workspace/workspace_controller.dart';
import 'feed_service.dart';

class IndustryPage extends StatefulWidget {
  const IndustryPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  State<IndustryPage> createState() => _IndustryPageState();
}

class _IndustryPageState extends State<IndustryPage> {
  bool _busy = false;
  String _status = '';
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    child: Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 17),
          child: AtlasPageHeader(
            title: '行业速览',
            subtitle: '留意正在发生的变化，积累自己的观察。',
            eyebrow: 'STAY CURIOUS, STAY INFORMED',
          ),
        ),
        const TabBar(
          tabs: [
            Tab(text: '资讯收件箱'),
            Tab(text: 'RSS / Atom 来源'),
          ],
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () => runAction(context, () async {
                        final c = widget.controller;
                        if (!RuntimePolicy.read(c.all).allowsPublic) {
                          throw StateError('外部来源已关闭。');
                        }
                        setState(() => _busy = true);
                        var added = 0;
                        var failed = 0;
                        try {
                          final urls = c
                              .items('industry_articles')
                              .map((e) => e.text('canonical_url'))
                              .toSet();
                          for (final source
                              in c
                                  .items('industry_sources')
                                  .where((s) => s.flag('enabled'))) {
                            try {
                              final rows = await FeedService.read(
                                source.text('url'),
                                source.text('name'),
                                source.text('industry'),
                              );
                              final imports = <Map<String, dynamic>>[];
                              for (final row in rows) {
                                if (urls.add(row['canonical_url'] as String)) {
                                  imports.add({
                                    'kind': 'industry_articles',
                                    'legacy_key': 'rss:${row['url_hash']}',
                                    'payload': row,
                                  });
                                }
                              }
                              if (imports.isNotEmpty) {
                                added += await c.importRows(imports);
                              }
                            } catch (_) {
                              failed++;
                            }
                          }
                          await c.refresh();
                          if (mounted) {
                            setState(
                              () => _status = '新增 $added 条，失败来源 $failed 个',
                            );
                          }
                        } finally {
                          if (mounted) setState(() => _busy = false);
                        }
                      }),
                icon: const Icon(Icons.rss_feed),
                label: Text(_busy ? '更新中…' : '更新订阅'),
              ),
              if (_status.isNotEmpty) Text(_status),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            children: [
              CollectionPage(
                embedded: true,
                controller: widget.controller,
                kind: 'industry_articles',
              ),
              CollectionPage(
                embedded: true,
                controller: widget.controller,
                kind: 'industry_sources',
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
