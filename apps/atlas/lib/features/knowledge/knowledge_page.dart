import 'package:flutter/material.dart';
import '../../core/asset_catalog.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../planning/planning.dart';
import '../workspace/catalog.dart';
import '../workspace/entity.dart';
import '../workspace/workspace_controller.dart';
import 'knowledge_graph.dart';
import 'knowhow_view.dart';

String knowledgeCover(String category) => switch (category) {
  '机械' => 'knowledge-mechanical-design.webp',
  '机器人' => 'knowledge-robot-sim-to-real.webp',
  '嵌入式' => 'knowledge-embedded-interfaces.webp',
  '系统' => 'knowledge-engine-controls.webp',
  _ => 'knowledge-library-hero-v2.webp',
};

class KnowledgePage extends StatefulWidget {
  const KnowledgePage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  State<KnowledgePage> createState() => _KnowledgePageState();
}

class _KnowledgePageState extends State<KnowledgePage>
    with SingleTickerProviderStateMixin {
  late final _catalog = AssetCatalog.load();
  late final TabController _tabs;
  final _search = TextEditingController();
  String _query = '', _category = '全部';
  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this, initialIndex: 1);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _search.dispose();
    super.dispose();
  }

  void _read(Map<String, dynamic> item, {String? entityId}) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => KnowledgeReaderPage(
        controller: widget.controller,
        payload: item,
        entityId: entityId ?? item['_entity_id']?.toString(),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, bounds) {
      final inset = bounds.maxWidth < 600 ? 20.0 : 30.0;
      return Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(inset, 25, inset, 16),
            child: const AtlasPageHeader(
              title: '知识库',
              subtitle: '遇到问题，找到步骤，把知识用起来。',
              eyebrow: 'KNOW-HOW · LEARN BY DOING',
            ),
          ),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: inset - 5),
            child: TabBar(
              controller: _tabs,
              tabs: const [
                Tab(text: '我的收藏'),
                Tab(text: 'Know-how'),
                Tab(text: '知识地图'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                CollectionPage(
                  controller: widget.controller,
                  kind: 'knowledge',
                  onOpen: (item) => _read(item.payload, entityId: item.id),
                  embedded: true,
                ),
                FutureBuilder<Map<String, dynamic>>(
                  future: _catalog,
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return const Center(child: Text('教材资源读取失败，请稍后重试。'));
                    }
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final all = (snapshot.data!['knowledge'] as List)
                        .cast<Map>();
                    final categories = [
                      '全部',
                      ...{
                        for (final item in all)
                          item['primary_category'].toString(),
                      },
                    ];
                    final books = all
                        .where(
                          (item) =>
                              (_category == '全部' ||
                                  item['primary_category'] == _category) &&
                              ('${item['title']} ${item['summary']} ${item['primary_category']} ${item['knowhow']}')
                                  .toLowerCase()
                                  .contains(_query.toLowerCase()),
                        )
                        .toList();
                    return Padding(
                      padding: EdgeInsets.fromLTRB(inset, 18, inset, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _search,
                            onChanged: (v) => setState(() => _query = v),
                            decoration: InputDecoration(
                              hintText: '搜索问题、操作或关键词',
                              prefixIcon: const Icon(
                                Icons.search_rounded,
                                size: 20,
                              ),
                              suffixIcon: _query.isEmpty
                                  ? null
                                  : IconButton(
                                      tooltip: '清空教材搜索',
                                      onPressed: () => setState(() {
                                        _query = '';
                                        _search.clear();
                                      }),
                                      icon: const Icon(
                                        Icons.close_rounded,
                                        size: 18,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                for (final category in categories)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 7),
                                    child: ChoiceChip(
                                      showCheckmark: false,
                                      label: Text(category),
                                      selected: _category == category,
                                      onSelected: (_) =>
                                          setState(() => _category = category),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            child: Text(
                              '${books.length} 份实操指南 · 步骤、图解与排错',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                          Expanded(
                            child: books.isEmpty
                                ? const SingleChildScrollView(
                                    child: AtlasEmptyState(
                                      icon: Icons.menu_book_outlined,
                                      title: '暂时没有找到相关教材',
                                      description: '换一个关键词或分类试试。',
                                    ),
                                  )
                                : LayoutBuilder(
                                    builder: (context, width) {
                                      final columns = width.maxWidth >= 1060
                                          ? 3
                                          : width.maxWidth >= 650
                                          ? 2
                                          : 1;
                                      final scale = MediaQuery.textScalerOf(
                                        context,
                                      ).scale(1).clamp(1.0, 1.6).toDouble();
                                      return GridView.builder(
                                        padding: const EdgeInsets.only(
                                          bottom: 25,
                                        ),
                                        gridDelegate:
                                            SliverGridDelegateWithFixedCrossAxisCount(
                                              crossAxisCount: columns,
                                              crossAxisSpacing: 17,
                                              mainAxisSpacing: 18,
                                              mainAxisExtent: 350.0 * scale,
                                            ),
                                        itemCount: books.length,
                                        itemBuilder: (_, index) {
                                          final item =
                                                  Map<String, dynamic>.from(
                                                    books[index],
                                                  ),
                                              category =
                                                  item['primary_category']
                                                      .toString();
                                          return Card(
                                            margin: EdgeInsets.zero,
                                            clipBehavior: Clip.antiAlias,
                                            child: InkWell(
                                              onTap: () => _read(item),
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.stretch,
                                                children: [
                                                  SizedBox(
                                                    height: 118,
                                                    child: Stack(
                                                      fit: StackFit.expand,
                                                      children: [
                                                        Image.asset(
                                                          'assets/images/${knowledgeCover(category)}',
                                                          fit: BoxFit.cover,
                                                          errorBuilder: (_, e, s) =>
                                                              const ColoredBox(
                                                                color:
                                                                    AtlasColors
                                                                        .peach,
                                                                child: Center(
                                                                  child: Icon(
                                                                    Icons
                                                                        .auto_stories_outlined,
                                                                    color:
                                                                        AtlasColors
                                                                            .gold,
                                                                    size: 32,
                                                                  ),
                                                                ),
                                                              ),
                                                        ),
                                                        Positioned(
                                                          left: 14,
                                                          bottom: 12,
                                                          child: Container(
                                                            padding:
                                                                const EdgeInsets.symmetric(
                                                                  horizontal: 9,
                                                                  vertical: 4,
                                                                ),
                                                            decoration: BoxDecoration(
                                                              color: AtlasColors
                                                                  .surface,
                                                              borderRadius:
                                                                  BorderRadius.circular(
                                                                    6,
                                                                  ),
                                                            ),
                                                            child: Text(
                                                              category,
                                                              style: const TextStyle(
                                                                fontSize: 10,
                                                                color:
                                                                    AtlasColors
                                                                        .gold,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w600,
                                                              ),
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  Expanded(
                                                    child: Padding(
                                                      padding:
                                                          const EdgeInsets.all(
                                                            17,
                                                          ),
                                                      child: Column(
                                                        crossAxisAlignment:
                                                            CrossAxisAlignment
                                                                .stretch,
                                                        children: [
                                                          Text(
                                                            (item['knowhow']?['title'] ??
                                                                    item['title'])
                                                                .toString(),
                                                            maxLines: 2,
                                                            overflow:
                                                                TextOverflow
                                                                    .ellipsis,
                                                            style:
                                                                const TextStyle(
                                                                  fontSize: 15,
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w600,
                                                                  height: 1.6,
                                                                ),
                                                          ),
                                                          const SizedBox(
                                                            height: 9,
                                                          ),
                                                          Expanded(
                                                            child: Text(
                                                              (item['knowhow']?['purpose'] ??
                                                                      item['summary'])
                                                                  .toString(),
                                                              maxLines: 3,
                                                              overflow:
                                                                  TextOverflow
                                                                      .ellipsis,
                                                              style: const TextStyle(
                                                                fontSize: 11,
                                                                color:
                                                                    AtlasColors
                                                                        .muted,
                                                                height: 1.8,
                                                              ),
                                                            ),
                                                          ),
                                                          const SizedBox(
                                                            height: 12,
                                                          ),
                                                          const Row(
                                                            children: [
                                                              Expanded(
                                                                child: Text(
                                                                  '打开阅读',
                                                                  style: TextStyle(
                                                                    fontSize:
                                                                        11,
                                                                    color:
                                                                        AtlasColors
                                                                            .gold,
                                                                    fontWeight:
                                                                        FontWeight
                                                                            .w500,
                                                                  ),
                                                                ),
                                                              ),
                                                              Icon(
                                                                Icons
                                                                    .arrow_forward_rounded,
                                                                size: 16,
                                                                color:
                                                                    AtlasColors
                                                                        .gold,
                                                              ),
                                                            ],
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                FutureBuilder<Map<String, dynamic>>(
                  future: _catalog,
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return const Center(child: Text('知识地图资源读取失败。'));
                    }
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final items = [
                      ...(snapshot.data!['knowledge'] as List).map(
                        (e) => Map<String, dynamic>.from(e as Map),
                      ),
                      ...widget.controller
                          .items('knowledge')
                          .map((e) => {...e.payload, '_entity_id': e.id}),
                    ];
                    return KnowledgeGraph(items: items, onOpen: _read);
                  },
                ),
              ],
            ),
          ),
        ],
      );
    },
  );
}

const _labels = <String, String>{
  'learningObjectives': '学习目标',
  'theorySections': '理论讲解',
  'equations': '关键公式',
  'derivationSteps': '推导步骤',
  'engineeringChecklist': '工程检查',
  'workedExample': '算例',
  'given': '已知条件',
  'steps': '步骤',
  'result': '结果',
  'name': '名称',
  'formula': '公式',
  'variables': '变量',
  'interpretation': '解释',
  'assumptions': '适用假设',
  'content': '内容',
  'title': '标题',
  'background': '背景',
  'keyPoints': '关键点',
  'verification': '验证方法',
  'boundaries': '适用边界',
  'application': '应用',
  'takeaway': '要点',
  'relatedTopics': '关联主题',
  'beginnerIntro': '入门导读',
  'principles': '基本原理',
  'explanation': '解释',
  'mainstreamMethods': '主流方法',
  'idea': '思路',
  'suitable': '适用场景',
  'tradeoff': '权衡',
  'applications': '工程应用',
  'frontier': '前沿方向',
  'readings': '参考阅读',
  'evidence': '证据说明',
  'sources': '来源',
  'principleVisual': '原理结构',
  'nodes': '节点',
  'edges': '连接',
  'label': '标签',
  'detail': '说明',
  'codeExample': '代码示例',
  'language': '语言',
  'code': '代码',
  'complete': '完整性',
  'url': '网址',
  'warning': '提示',
  'completeness': '完整度',
};
Widget richValue(BuildContext context, dynamic value, {int depth = 0}) {
  if (value == null) return const SizedBox.shrink();
  if (value is List) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final item in value)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: richValue(context, item, depth: depth + 1),
          ),
      ],
    );
  }
  if (value is Map) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final entry in value.entries)
          if (entry.value != null && entry.value.toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _labels[entry.key] ?? entry.key.toString(),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: depth == 0
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                  ),
                  const SizedBox(height: 6),
                  richValue(context, entry.value, depth: depth + 1),
                ],
              ),
            ),
      ],
    );
  }
  return SelectableText(value.toString());
}

class KnowledgeReaderPage extends StatelessWidget {
  const KnowledgeReaderPage({
    super.key,
    required this.controller,
    required this.payload,
    this.entityId,
  });
  final WorkspaceController controller;
  final Map<String, dynamic> payload;
  final String? entityId;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: controller,
    builder: (context, _) {
      final own = entityId == null
          ? null
          : controller.all
                .where((e) => e.id == entityId && e.deletedAt == null)
                .firstOrNull;
      if (entityId != null && own == null) {
        return Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('此记录已移入回收站，或当前账号不可访问。')),
        );
      }
      final data = own?.payload ?? payload;
      return FutureBuilder<Map<String, dynamic>>(
        future: AssetCatalog.load(),
        initialData: AssetCatalog.cached,
        builder: (context, snapshot) {
          var guide = jsonObject(data['knowhow']);
          if (!validKnowhowGuide(guide)) {
            final builtins = (snapshot.data?['knowledge'] as List? ?? const [])
                .whereType<Map>();
            final matches = builtins.where(
              (e) =>
                  e['stable_key'] != null &&
                  e['stable_key'] == data['stable_key'],
            );
            if (matches.isNotEmpty) {
              guide = jsonObject(matches.first['knowhow']);
            }
          }
          return _reader(context, data, own, guide);
        },
      );
    },
  );

  Widget _reader(
    BuildContext context,
    Map<String, dynamic> data,
    WorkspaceEntity? own,
    Map<String, dynamic> guide,
  ) {
    final practical = validKnowhowGuide(guide);
    final enrichment = jsonObject(data['enrichment']);
    final category = data['primary_category']?.toString() ?? '通用';
    final title = own == null && practical
        ? guide['title'].toString()
        : data['title']?.toString() ?? '';
    final existing = controller
        .items('knowledge')
        .where(
          (e) =>
              data['stable_key'] != null &&
              e.text('stable_key') == data['stable_key'],
        )
        .firstOrNull;
    return Scaffold(
      appBar: AppBar(
        title: Text(practical ? 'Know-how' : '知识阅读'),
        actions: [
          if (own == null && existing != null)
            TextButton.icon(
              onPressed: () => Navigator.pushReplacement(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => KnowledgeReaderPage(
                    controller: controller,
                    payload: existing.payload,
                    entityId: existing.id,
                  ),
                ),
              ),
              icon: const Icon(Icons.bookmark_added_outlined, size: 18),
              label: const Text('我的收录'),
            ),
          TextButton.icon(
            key: const ValueKey('edit-knowledge'),
            onPressed: controller.saving
                ? null
                : () => editEntity(
                    context,
                    controller,
                    specFor('knowledge'),
                    entity:
                        own ??
                        existing ??
                        WorkspaceEntity(
                          id: controller.create('knowledge').id,
                          kind: 'knowledge',
                          payload: {
                            ...data,
                            'title': title,
                            if (practical) ...{
                              'knowhow': guide,
                              'summary': guide['purpose'],
                            },
                          },
                        ),
                  ),
            icon: const Icon(Icons.edit_outlined, size: 18),
            label: Text(own == null ? '编辑并收录' : '编辑'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, bounds) => ListView(
          padding: EdgeInsets.all(bounds.maxWidth < 600 ? 18 : 30),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1000),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.asset(
                        'assets/images/${knowledgeCover(category)}',
                        height: bounds.maxWidth < 600 ? 145 : 190,
                        fit: BoxFit.cover,
                        errorBuilder: (_, e, s) => const SizedBox.shrink(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        AtlasBadge(category, color: AtlasColors.teal),
                        if (practical)
                          const AtlasBadge(
                            'Know-how · 实操指南',
                            icon: Icons.handyman_outlined,
                          ),
                        if (own != null) const AtlasBadge('我的收录'),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SelectableText(
                      title,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 12),
                    SelectableText(
                      practical && own == null
                          ? guide['purpose'].toString()
                          : data['summary']?.toString() ?? '',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        height: 1.8,
                        color: AtlasColors.muted,
                      ),
                    ),
                    if (own != null &&
                        data['content']?.toString().trim().isNotEmpty ==
                            true) ...[
                      const SizedBox(height: 18),
                      Card(
                        margin: EdgeInsets.zero,
                        child: Padding(
                          padding: const EdgeInsets.all(22),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                '我的正文',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: AtlasColors.gold,
                                ),
                              ),
                              const SizedBox(height: 10),
                              SelectableText(
                                data['content'].toString(),
                                style: const TextStyle(height: 1.9),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    if (practical)
                      KnowhowView(key: ValueKey(guide['key']), guide: guide),
                    if (!practical) ...[
                      SelectableText(
                        data['content']?.toString() ?? '',
                        style: const TextStyle(height: 1.9),
                      ),
                      const SizedBox(height: 24),
                      for (final entry in enrichment.entries)
                        if (!['autoFilled', 'completeness'].contains(entry.key))
                          _referenceCard(
                            context,
                            _labels[entry.key] ?? entry.key,
                            entry.value,
                          ),
                    ],
                    if (practical && enrichment.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Card(
                        margin: EdgeInsets.zero,
                        child: ExpansionTile(
                          title: const Text('原理与扩展资料'),
                          childrenPadding: const EdgeInsets.all(20),
                          children: [
                            SelectableText(
                              data['content']?.toString() ?? '',
                              style: const TextStyle(height: 1.8),
                            ),
                            const SizedBox(height: 18),
                            for (final entry in enrichment.entries)
                              if (![
                                'autoFilled',
                                'completeness',
                              ].contains(entry.key))
                                _referenceCard(
                                  context,
                                  _labels[entry.key] ?? entry.key,
                                  entry.value,
                                ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _referenceCard(BuildContext context, String title, dynamic value) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(color: AtlasColors.gold),
            ),
            const SizedBox(height: 12),
            richValue(context, value),
          ],
        ),
      );
}
