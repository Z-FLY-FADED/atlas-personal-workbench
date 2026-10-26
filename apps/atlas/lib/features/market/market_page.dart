import 'dart:convert';
import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../core/asset_catalog.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../planning/planning.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';
import 'quote_service.dart';

class MarketPage extends StatefulWidget {
  const MarketPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  State<MarketPage> createState() => _MarketPageState();
}

class _MarketPageState extends State<MarketPage> {
  final _catalog = AssetCatalog.load();
  String _market = '全部', _query = '';
  bool _busy = false;
  Map<String, dynamic>? _latest;
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 17),
          child: AtlasPageHeader(
            title: '市场观察',
            subtitle: '把关注的标的、价格和研究记录放在一起。',
            eyebrow: 'OBSERVE WITH PERSPECTIVE',
          ),
        ),
        const TabBar(
          tabs: [
            Tab(text: '跨市场目录'),
            Tab(text: '我的自选'),
            Tab(text: '自选分组'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              FutureBuilder<Map<String, dynamic>>(
                future: _catalog,
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final all = (snapshot.data!['market'] as List).cast<Map>();
                  final rows = all
                      .where(
                        (e) =>
                            (_market == '全部' || e['market'] == _market) &&
                            '${e['name']} ${e['code']} ${e['industry']}'
                                .toLowerCase()
                                .contains(_query.toLowerCase()),
                      )
                      .toList();
                  final settings = widget.controller
                      .items('workspace_settings')
                      .where((e) => e.text('key') == 'market-cache');
                  final cached = settings.isEmpty
                      ? <String, dynamic>{}
                      : jsonObject(settings.first.payload['value']);
                  final data = _latest ?? cached;
                  final quotes = jsonObject(data['quotes']);
                  return Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final market in ['全部', 'A股', '港股', '纳斯达克'])
                                  ChoiceChip(
                                    label: Text(market),
                                    selected: _market == market,
                                    onSelected: (_) =>
                                        setState(() => _market = market),
                                  ),
                                OutlinedButton.icon(
                                  onPressed: _busy
                                      ? null
                                      : () => runAction(context, () async {
                                          if (!RuntimePolicy.read(
                                            widget.controller.all,
                                          ).allowsPublic) {
                                            throw StateError('外部来源已关闭。');
                                          }
                                          setState(() => _busy = true);
                                          try {
                                            final next =
                                                await QuoteService.fetch(all);
                                            if (mounted) {
                                              setState(() => _latest = next);
                                            }
                                            final record = settings.isEmpty
                                                ? widget.controller.create(
                                                    'workspace_settings',
                                                  )
                                                : settings.first;
                                            await widget.controller
                                                .save(record, {
                                                  'key': 'market-cache',
                                                  'value': jsonEncode(next),
                                                });
                                          } finally {
                                            if (mounted) {
                                              setState(() => _busy = false);
                                            }
                                          }
                                        }),
                                  icon: const Icon(Icons.refresh),
                                  label: Text(_busy ? '更新中…' : '读取公开行情'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              decoration: const InputDecoration(
                                hintText: '搜索代码、名称、行业',
                                prefixIcon: Icon(Icons.search),
                              ),
                              onChanged: (v) => setState(() => _query = v),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              data.isEmpty
                                  ? '尚未读取行情'
                                  : '${_latest == null ? '历史缓存' : '本次读取'} · ${data['source']} · 获取时间 ${data['fetched_at']}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          children: [
                            for (final row in rows)
                              Builder(
                                builder: (context) {
                                  final quote = jsonObject(
                                    quotes[row['secid']],
                                  );
                                  final existing = widget.controller
                                      .items('watchlist_items')
                                      .where(
                                        (e) =>
                                            e.text('instrument_id') ==
                                            QuoteService.identity(row),
                                      )
                                      .firstOrNull;
                                  return Card(
                                    child: Padding(
                                      padding: const EdgeInsets.all(18),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${row['name']} · ${row['code']}',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleLarge,
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            '${row['market']} · ${row['industry']}',
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            quote.isEmpty
                                                ? '行情暂不可用'
                                                : '${quote['price']}  ${quote['change'] == null ? '' : '${quote['change']}%'}',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.headlineSmall,
                                          ),
                                          if (quote.isNotEmpty)
                                            Text(
                                              '来源时间：${quote['provider_time'] ?? '未提供'}',
                                              style: Theme.of(
                                                context,
                                              ).textTheme.bodySmall,
                                            ),
                                          const SizedBox(height: 12),
                                          OutlinedButton.icon(
                                            onPressed: () => editEntity(
                                              context,
                                              widget.controller,
                                              specFor('watchlist_items'),
                                              entity: existing,
                                              initial: existing != null
                                                  ? const {}
                                                  : {
                                                      'instrument_id':
                                                          QuoteService.identity(
                                                            row,
                                                          ),
                                                      'note':
                                                          '${row['name']} · ${row['industry']}',
                                                    },
                                            ),
                                            icon: const Icon(
                                              Icons.star_outline,
                                            ),
                                            label: Text(
                                              existing == null
                                                  ? '加入自选'
                                                  : '编辑自选',
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
              CollectionPage(
                embedded: true,
                controller: widget.controller,
                kind: 'watchlist_items',
              ),
              CollectionPage(controller: widget.controller, kind: 'watchlists'),
            ],
          ),
        ),
      ],
    ),
  );
}
