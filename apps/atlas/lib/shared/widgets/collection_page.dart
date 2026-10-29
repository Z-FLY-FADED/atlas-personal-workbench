import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/atlas_theme.dart';
import 'atlas_widgets.dart';
import '../error_message.dart';
import '../../features/planning/planning.dart';
import '../../features/workspace/catalog.dart';
import '../../features/workspace/entity.dart';
import '../../features/workspace/workspace_controller.dart';
import 'entity_editor.dart';
import 'list_filter_button.dart';
import '../models/list_filters.dart';
import '../../core/asset_catalog.dart';
import '../../features/career/career_filters.dart';
import '../../features/market/market_filters.dart';

Future<void> runAction(
  BuildContext context,
  Future<void> Function() action,
) async {
  try {
    await action();
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(errorMessage(e))));
    }
  }
}

class CollectionPage extends StatefulWidget {
  const CollectionPage({
    super.key,
    required this.controller,
    required this.kind,
    this.language,
    this.embedded = false,
    this.onOpen,
  });
  final WorkspaceController controller;
  final String kind;
  final String? language;
  final bool embedded;
  final ValueChanged<WorkspaceEntity>? onOpen;
  @override
  State<CollectionPage> createState() => _CollectionPageState();
}

class _CollectionPageState extends State<CollectionPage> {
  final _search = TextEditingController();
  ListFilters _listFilters = const ListFilters();
  @override
  void initState() {
    super.initState();
    if (widget.kind == 'watchlist_items') {
      AssetCatalog.load().then((_) {
        if (mounted) setState(() {});
      });
    }
  }

  String _query = '', _filter = '全部', _taskState = '未完成';
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _open(WorkspaceEntity item) {
    if (widget.onOpen != null) {
      widget.onOpen!(item);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) =>
            EntityDetailPage(controller: widget.controller, entityId: item.id),
      ),
    );
  }

  void _create(List<WorkspaceEntity> all) => editEntity(
    context,
    widget.controller,
    specFor(widget.kind),
    entity: ['profiles', 'resumes'].contains(widget.kind) && all.isNotEmpty
        ? all.first
        : null,
    initial: widget.language == null ? {} : {'language': widget.language},
  );

  @override
  Widget build(BuildContext context) {
    final spec = specFor(widget.kind), c = widget.controller;
    final all = c
        .items(widget.kind)
        .where(
          (e) =>
              widget.language == null ||
              [
                widget.language,
                widget.language == 'en' ? '英语学习' : '日语学习',
              ].contains(e.text('language')),
        )
        .toList();
    final filterKey = switch (widget.kind) {
      'tasks' => 'horizon',
      'knowledge' => 'primary_category',
      'projects' || 'quick_notes' || 'applications' => 'status',
      _ => '',
    };
    final filters = [
      '全部',
      ...{
        if (widget.kind == 'tasks') ...['今日', '本周', '年度'],
        for (final e in all)
          if (e.text(filterKey).isNotEmpty) e.text(filterKey),
      },
    ];
    final selected = widget.kind == 'applications'
        ? (_listFilters.value('status').isEmpty
              ? '全部'
              : _listFilters.value('status'))
        : (filters.contains(_filter) ? _filter : '全部');
    final stockCatalog = (AssetCatalog.cached?['market'] as List? ?? const [])
        .cast<Map>();
    final marketSettings = c
        .items('workspace_settings')
        .where((e) => e.text('key') == 'market-cache');
    final stockQuotes = jsonObject(
      marketSettings.isEmpty
          ? null
          : jsonObject(marketSettings.first.payload['value'])['quotes'],
    );
    final groups = c.items('watchlists');
    bool extraMatch(WorkspaceEntity e) {
      if (widget.kind == 'applications') {
        return matchesApplication(e, _listFilters);
      }
      if (widget.kind != 'watchlist_items') return true;
      final group = _listFilters.value('watchlist');
      if (group == '__ungrouped__' && e.text('watchlist_id').isNotEmpty) {
        return false;
      }
      if (group.isNotEmpty && group != '__ungrouped__') {
        final target = groups.where((g) => g.id == group).firstOrNull;
        if (target == null ||
            ![target.id, target.legacyKey].contains(e.text('watchlist_id'))) {
          return false;
        }
      }
      final row = watchlistInstrument(e, stockCatalog);
      return matchesMarket(
        row ?? const {},
        _listFilters,
        watched: true,
        quote: jsonObject(stockQuotes[row?['secid']]),
      );
    }

    final advancedFields = widget.kind == 'applications'
        ? <FilterField>[
            FilterField(
              'status',
              '投递进展',
              filterOptions(all.map((e) => e.text('status'))),
            ),
            FilterField(
              'company',
              '公司',
              filterOptions(all.map((e) => e.text('company'))),
            ),
            FilterField(
              'role',
              '岗位',
              filterOptions(all.map((e) => e.text('role'))),
            ),
            FilterField(
              'channel',
              '渠道',
              filterOptions(all.map((e) => e.text('channel'))),
            ),
          ]
        : <FilterField>[
            FilterField(
              'market',
              '市场',
              filterOptions(stockCatalog.map((e) => e['market'])),
            ),
            FilterField(
              'industry',
              '行业',
              filterOptions(stockCatalog.map((e) => e['industry'])),
            ),
            FilterField(
              'risk',
              '风险',
              filterOptions(stockCatalog.map((e) => e['risk'])),
            ),
            FilterField('watchlist', '自选分组', [
              const FilterOption('__ungrouped__', '未分组'),
              for (final group in groups)
                FilterOption(group.id, group.text('name')),
            ]),
            const FilterField('quote', '行情状态', [
              FilterOption('available', '有行情'),
              FilterOption('missing', '暂无行情'),
            ]),
            const FilterField('direction', '涨跌', [
              FilterOption('up', '上涨'),
              FilterOption('down', '下跌'),
              FilterOption('flat', '平盘'),
            ]),
          ];
    final items = all
        .where(
          (e) =>
              (widget.kind == 'tasks'
                  ? taskInScope(e, selected, DateTime.now())
                  : (selected == '全部' || e.text(filterKey) == selected)) &&
              (_taskState == '全部状态' ||
                  !const ['tasks', 'reminders'].contains(widget.kind) ||
                  (_taskState == '已完成' ? e.flag('done') : !e.flag('done'))) &&
              extraMatch(e) &&
              (e.payload.values.join(' ').toLowerCase() +
                      (widget.kind == 'watchlist_items'
                          ? ' ${watchlistInstrument(e, stockCatalog)?.values.join(' ') ?? ''}'
                          : ''))
                  .toLowerCase()
                  .contains(_query.trim().toLowerCase()),
        )
        .toList();
    final description = switch (widget.kind) {
      'tasks' => '把想做的事写下来，一件一件，有条不紊。',
      'projects' => '把目标拆成里程碑，让每一步进展都有迹可循。',
      'quick_notes' => '接住一闪而过的想法，慢慢整理成自己的答案。',
      'knowledge' => '在阅读与思考之间，建立属于自己的连接。',
      'reminders' => '给重要的事，留一个恰到好处的提醒。',
      'profiles' => '关于你，也关于这个空间的样子。',
      _ => '整理当下的记录，留住每一点积累。',
    };
    final eyebrow = switch (widget.kind) {
      'tasks' => 'MAKE ROOM FOR WHAT MATTERS',
      'projects' => 'ONE STEP AT A TIME',
      'quick_notes' => 'LITTLE THOUGHTS, BIG POSSIBILITIES',
      'knowledge' => 'YOUR KNOWLEDGE GARDEN',
      _ => 'YOUR PERSONAL SPACE',
    };
    return LayoutBuilder(
      builder: (context, bounds) {
        final inset = bounds.maxWidth < 600 ? 20.0 : 30.0,
            tight = bounds.maxHeight < 480;
        final grid = [
          'projects',
          'quick_notes',
          'knowledge',
        ].contains(widget.kind);
        final add = spec.fields.isEmpty
            ? null
            : FilledButton.icon(
                onPressed: c.saving ? null : () => _create(all),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(
                  ['profiles', 'resumes'].contains(widget.kind) &&
                          all.isNotEmpty
                      ? '编辑'
                      : '新建',
                ),
              );
        return Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1380),
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                inset,
                widget.embedded || tight ? 18 : 28,
                inset,
                0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!widget.embedded) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!tight) ...[
                                Text(
                                  eyebrow,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: AtlasColors.gold,
                                    letterSpacing: 1.7,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 8),
                              ],
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      spec.label,
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineMedium
                                          ?.copyWith(fontSize: tight ? 21 : 26),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  AtlasBadge(
                                    all.length.toString(),
                                    color: AtlasColors.gold,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (add != null) ...[const SizedBox(width: 12), add],
                      ],
                    ),
                    if (!tight) ...[
                      const SizedBox(height: 8),
                      Text(
                        description,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AtlasColors.muted,
                        ),
                      ),
                    ],
                    SizedBox(height: tight ? 16 : 24),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _search,
                          onChanged: (v) => setState(() => _query = v),
                          decoration: InputDecoration(
                            hintText: '搜索标题与内容',
                            prefixIcon: const Icon(
                              Icons.search_rounded,
                              size: 20,
                            ),
                            suffixIcon: _query.isEmpty
                                ? null
                                : IconButton(
                                    tooltip: '清空搜索',
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
                      ),
                      if (widget.embedded && add != null) ...[
                        const SizedBox(width: 12),
                        add,
                      ],
                    ],
                  ),
                  if (['applications', 'watchlist_items'].contains(widget.kind))
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: ListFilterButton(
                          title: spec.label,
                          filters: _listFilters,
                          fields: advancedFields,
                          dates: widget.kind == 'applications',
                          prices: widget.kind == 'watchlist_items',
                          onChanged: (value) => setState(() {
                            _listFilters = value;
                          }),
                        ),
                      ),
                    ),
                  if (!tight &&
                      (filterKey.isNotEmpty ||
                          const [
                            'tasks',
                            'reminders',
                          ].contains(widget.kind))) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                for (final filter in filters)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 7),
                                    child: ChoiceChip(
                                      showCheckmark: false,
                                      label: Text(filter),
                                      selected: filter == selected,
                                      onSelected: (_) => setState(() {
                                        _filter = filter;
                                        if (widget.kind == 'applications') {
                                          _listFilters = _listFilters.withValue(
                                            'status',
                                            filter == '全部' ? '' : filter,
                                          );
                                        }
                                      }),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        if (const [
                          'tasks',
                          'reminders',
                        ].contains(widget.kind)) ...[
                          const SizedBox(width: 8),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _taskState,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AtlasColors.text,
                              ),
                              borderRadius: BorderRadius.circular(12),
                              items: ['全部状态', '未完成', '已完成']
                                  .map(
                                    (s) => DropdownMenuItem(
                                      value: s,
                                      child: Text(s),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) => setState(() => _taskState = v!),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (!tight)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Text(
                        '共 ${items.length} 条记录${widget.kind == 'tasks' ? ' · ${items.where((e) => !e.flag('done')).length} 条待完成' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    )
                  else
                    const SizedBox(height: 14),
                  Expanded(
                    child: items.isEmpty
                        ? SingleChildScrollView(
                            child: AtlasEmptyState(
                              icon: spec.icon,
                              title:
                                  _listFilters.isEmpty &&
                                      _query.isEmpty &&
                                      selected == '全部' &&
                                      _taskState == '全部状态'
                                  ? '从第一条${spec.label}开始'
                                  : '没有匹配的记录',
                              description:
                                  _listFilters.isEmpty &&
                                      _query.isEmpty &&
                                      selected == '全部'
                                  ? '把此刻想做的、想记的，轻轻放在这里。'
                                  : '换一个关键词，或试试其他分类。',
                              action:
                                  !_listFilters.isEmpty ||
                                      _query.isNotEmpty ||
                                      selected != '全部' ||
                                      _taskState != '全部状态'
                                  ? TextButton(
                                      onPressed: () => setState(() {
                                        _filter = '全部';
                                        _listFilters = const ListFilters();
                                        _query = '';
                                        _taskState = '全部状态';
                                        _search.clear();
                                      }),
                                      child: const Text('清除筛选'),
                                    )
                                  : spec.fields.isNotEmpty
                                  ? TextButton.icon(
                                      onPressed: c.saving
                                          ? null
                                          : () => _create(all),
                                      icon: const Icon(Icons.add, size: 16),
                                      label: const Text('添加第一条'),
                                    )
                                  : null,
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: c.refresh,
                            child: grid
                                ? _grid(
                                    items,
                                    spec,
                                    bounds.maxWidth - 2 * inset,
                                  )
                                : _list(items, spec),
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _list(List<WorkspaceEntity> items, CollectionSpec spec) => Card(
    margin: const EdgeInsets.only(bottom: 20),
    clipBehavior: Clip.antiAlias,
    child: ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: items.length,
      separatorBuilder: (_, index) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 18),
        child: Divider(),
      ),
      itemBuilder: (_, index) => _row(items[index], spec),
    ),
  );

  Widget _row(WorkspaceEntity item, CollectionSpec spec) {
    final task = widget.kind == 'tasks', c = widget.controller;
    return InkWell(
      onTap: () => _open(item),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (task || widget.kind == 'reminders')
              SizedBox(
                width: 34,
                height: 42,
                child: Checkbox(
                  value: item.flag('done'),
                  onChanged:
                      c.saving ||
                          (task &&
                              item.text('repeat_rule', 'none') != 'none' &&
                              (parseDay(
                                    item.text('active_on'),
                                  )?.isAfter(dateOnly(DateTime.now())) ??
                                  false))
                      ? null
                      : (_) => runAction(context, () async {
                          final payload = task
                              ? toggleTask(item, DateTime.now())
                              : {...item.payload, 'done': !item.flag('done')};
                          await c.save(item, payload);
                          if (task &&
                              !item.flag('done') &&
                              item.text('repeat_rule', 'none') != 'none' &&
                              mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  '本次已完成，下次执行：${payload['active_on']}',
                                ),
                                action: SnackBarAction(
                                  label: '撤销',
                                  onPressed: () => runAction(context, () async {
                                    final latest = c.all
                                        .where((e) => e.id == item.id)
                                        .firstOrNull;
                                    if (latest == null ||
                                        latest.version != item.version + 1) {
                                      throw StateError('记录已更新，请打开详情核对后修改。');
                                    }
                                    await c.save(latest, item.payload);
                                  }),
                                ),
                              ),
                            );
                          }
                        }),
                ),
              )
            else
              Container(
                width: 39,
                height: 39,
                decoration: BoxDecoration(
                  color: AtlasColors.peach,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(spec.icon, size: 19, color: AtlasColors.gold),
              ),
            const SizedBox(width: 13),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.text(spec.titleKey, item.id).split('\n').first,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: task && item.flag('done')
                            ? AtlasColors.muted
                            : AtlasColors.text,
                        decoration: task && item.flag('done')
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                    if (item.text(spec.subtitleKey).isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        item.text(spec.subtitleKey),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AtlasColors.muted,
                          height: 1.7,
                        ),
                      ),
                    ],
                    if (task) ...[
                      const SizedBox(height: 9),
                      Wrap(
                        spacing: 7,
                        runSpacing: 6,
                        children: [
                          AtlasBadge(
                            item.flag('done')
                                ? '已完成'
                                : item.text('priority', '一般'),
                            color: item.flag('done')
                                ? AtlasColors.teal
                                : item.text('priority') == '优先'
                                ? AtlasColors.gold
                                : AtlasColors.muted,
                          ),
                          if (item.text('date').isNotEmpty)
                            AtlasBadge(
                              item.text('date'),
                              icon: Icons.event_outlined,
                              color: AtlasColors.blue,
                            ),
                          if (item.text('active_on').isNotEmpty)
                            AtlasBadge(
                              '执行 · ${item.text('active_on')}',
                              icon: Icons.today_outlined,
                            ),
                          if (_projectName(item).isNotEmpty)
                            AtlasBadge(
                              _projectName(item),
                              icon: Icons.folder_outlined,
                              color: AtlasColors.blue,
                            ),
                        ],
                      ),
                    ],
                    if (widget.kind == 'reminders') ...[
                      const SizedBox(height: 8),
                      AtlasBadge(
                        item.flag('done')
                            ? '已完成'
                            : displayTimestamp(item.text('remind_at', '未设置时间')),
                        icon: Icons.notifications_none,
                        color: item.flag('done')
                            ? AtlasColors.teal
                            : AtlasColors.gold,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(width: 6),
            const Padding(
              padding: EdgeInsets.only(top: 14),
              child: Icon(
                Icons.chevron_right_rounded,
                size: 17,
                color: AtlasColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _projectName(WorkspaceEntity task) {
    final matches = widget.controller
        .items('projects')
        .where(
          (e) => entityReference(e.id, e.legacyKey) == task.text('project_id'),
        );
    return matches.isEmpty ? '' : matches.first.text('title');
  }

  Widget _grid(List<WorkspaceEntity> items, CollectionSpec spec, double width) {
    final columns = width >= 1050
        ? 3
        : width >= 630
        ? 2
        : 1;
    final project = widget.kind == 'projects',
        note = widget.kind == 'quick_notes';
    final scale = MediaQuery.textScalerOf(
      context,
    ).scale(1).clamp(1.0, 1.6).toDouble();
    return GridView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        mainAxisExtent: (project ? 252.0 : 226.0) * scale,
      ),
      itemCount: items.length,
      itemBuilder: (_, index) {
        final item = items[index];
        final tint = note
            ? [
                const Color(0xFFFBF0D9),
                const Color(0xFFF1E9DC),
                const Color(0xFFEEEDDF),
              ][index % 3]
            : AtlasColors.surface;
        final date =
            item.updatedAt ?? DateTime.tryParse(item.text('created_at'));
        return Card(
          margin: EdgeInsets.zero,
          color: tint,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => _open(item),
            child: Padding(
              padding: const EdgeInsets.all(21),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: note
                              ? Colors.white.withValues(alpha: .55)
                              : AtlasColors.peach,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(
                          spec.icon,
                          size: 18,
                          color: project ? AtlasColors.gold : AtlasColors.blue,
                        ),
                      ),
                      const Spacer(),
                      AtlasBadge(
                        item.text(
                          project
                              ? 'status'
                              : note
                              ? 'status'
                              : 'primary_category',
                          project
                              ? '进行中'
                              : note
                              ? '待整理'
                              : '知识资料',
                        ),
                        color: project ? AtlasColors.gold : AtlasColors.blue,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (project) ...[
                    Text(
                      item.text('title'),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.text('stage', '规划与推进'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AtlasColors.muted,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        const Text(
                          '项目进度',
                          style: TextStyle(
                            fontSize: 10,
                            color: AtlasColors.muted,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${(projectProgress(item, widget.controller.items('tasks')) * 100).round()}%',
                          style: const TextStyle(
                            color: AtlasColors.gold,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 9),
                    LinearProgressIndicator(
                      value: projectProgress(
                        item,
                        widget.controller.items('tasks'),
                      ),
                      minHeight: 5,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    const SizedBox(height: 13),
                    Text(
                      item.text('next_milestone').isNotEmpty
                          ? '下一步 · ${item.text('next_milestone')}'
                          : item.text('due_date').isNotEmpty
                          ? '截止 · ${item.text('due_date')}'
                          : '到项目中记录下一步计划',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AtlasColors.muted,
                      ),
                    ),
                  ] else ...[
                    Expanded(
                      child: Text(
                        item.text(spec.titleKey),
                        maxLines: note ? 5 : 4,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: note ? 14 : 16,
                          height: 1.85,
                          fontWeight: note ? FontWeight.w400 : FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            date == null
                                ? (note ? '灵感随手记' : '阅读与思考')
                                : dayKey(date.toLocal()),
                            style: const TextStyle(
                              fontSize: 10,
                              color: AtlasColors.muted,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.north_east_rounded,
                          size: 15,
                          color: AtlasColors.blue,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class EntityDetailPage extends StatelessWidget {
  const EntityDetailPage({
    super.key,
    required this.controller,
    required this.entityId,
  });
  final WorkspaceController controller;
  final String entityId;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: controller,
    builder: (context, _) {
      final matches = controller.all.where(
        (e) => e.id == entityId && e.deletedAt == null,
      );
      if (matches.isEmpty) {
        return Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('此记录已移入回收站，或当前账号不可访问。')),
        );
      }
      final item = matches.first;
      final spec = specFor(item.kind);
      final reference = entityReference(item.id, item.legacyKey);
      final children = controller
          .items(item.kind == 'projects' ? 'tasks' : 'task_subtasks')
          .where(
            (e) =>
                e.text(item.kind == 'projects' ? 'project_id' : 'task_id') ==
                reference,
          )
          .toList();
      return Scaffold(
        appBar: AppBar(
          title: Text(spec.label),
          actions: [
            if (spec.fields.isNotEmpty)
              IconButton(
                tooltip: '编辑',
                onPressed: controller.saving
                    ? null
                    : () => editEntity(context, controller, spec, entity: item),
                icon: const Icon(Icons.edit_outlined),
              ),
            IconButton(
              tooltip: '移入回收站',
              onPressed: controller.saving
                  ? null
                  : () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('移入回收站？'),
                          content: const Text('可在“数据与恢复”中恢复此记录。'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: const Text('取消'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text('移入回收站'),
                            ),
                          ],
                        ),
                      );
                      if (confirmed == true && context.mounted) {
                        await runAction(context, () async {
                          await controller.delete(item);
                          if (context.mounted) Navigator.pop(context);
                        });
                      }
                    },
              icon: const Icon(Icons.delete_outline),
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SelectableText(
                    item.text(spec.titleKey, spec.label),
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '修订 ${item.version} · ${item.updatedAt?.toLocal().toString().split('.').first ?? ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 24),
                  for (final field in spec.fields.where(
                    (f) => f.key != spec.titleKey,
                  ))
                    if (item.text(field.key).isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              field.label,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            SelectableText(
                              field.type == FieldType.dateTime
                                  ? displayTimestamp(item.text(field.key))
                                  : item.text(field.key),
                            ),
                          ],
                        ),
                      ),
                  if (item.kind == 'quick_notes')
                    Wrap(
                      spacing: 12,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => editEntity(
                            context,
                            controller,
                            specFor('tasks'),
                            initial: {
                              'title': item.text('content').split('\n').first,
                              'detail': item.text('content'),
                            },
                          ),
                          icon: const Icon(Icons.add_task),
                          label: const Text('转为任务'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => editEntity(
                            context,
                            controller,
                            specFor('knowledge'),
                            initial: {
                              'title': item.text('content').split('\n').first,
                              'content': item.text('content'),
                            },
                          ),
                          icon: const Icon(Icons.library_add_outlined),
                          label: const Text('收录知识库'),
                        ),
                      ],
                    ),
                  if (item.kind == 'industry_articles')
                    Wrap(
                      spacing: 12,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => editEntity(
                            context,
                            controller,
                            specFor('knowledge'),
                            initial: {
                              'title': item.text('title'),
                              'summary': item.text('summary'),
                              'content': item.text('content_excerpt'),
                              'source': item.text('canonical_url'),
                              'source_type': '行业资讯',
                            },
                          ),
                          icon: const Icon(Icons.bookmark_add_outlined),
                          label: const Text('收录知识库'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final uri = Uri.tryParse(
                              item.text('canonical_url'),
                            );
                            if (uri != null &&
                                ['https', 'http'].contains(uri.scheme)) {
                              await launchUrl(
                                uri,
                                mode: LaunchMode.externalApplication,
                              );
                            }
                          },
                          icon: const Icon(Icons.open_in_new),
                          label: const Text('阅读原文'),
                        ),
                      ],
                    ),
                  if (item.kind == 'tasks' || item.kind == 'projects') ...[
                    if (item.kind == 'tasks' &&
                        item.list('completion_history').isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                '完成记录',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              const SizedBox(height: 12),
                              for (final record
                                  in item
                                      .list('completion_history')
                                      .whereType<Map>()
                                      .toList()
                                      .reversed
                                      .take(12))
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 6,
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.check_circle_outline,
                                        size: 18,
                                        color: AtlasColors.teal,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          (record['completedAt'] ??
                                                      record['completed_at']) !=
                                                  null
                                              ? displayTimestamp(
                                                  (record['completedAt'] ??
                                                          record['completed_at'])
                                                      .toString(),
                                                )
                                              : (record['completedOn'] ??
                                                        record['completed_on'] ??
                                                        '时间未记录')
                                                    .toString(),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.kind == 'tasks' ? '子任务' : '关联任务',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => editEntity(
                            context,
                            controller,
                            specFor(
                              item.kind == 'tasks' ? 'task_subtasks' : 'tasks',
                            ),
                            initial: {
                              item.kind == 'tasks' ? 'task_id' : 'project_id':
                                  reference,
                            },
                          ),
                          icon: const Icon(Icons.add),
                          label: const Text('添加'),
                        ),
                      ],
                    ),
                    for (final child in children)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(child.text('title')),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => EntityDetailPage(
                              controller: controller,
                              entityId: child.id,
                            ),
                          ),
                        ),
                        trailing: IconButton(
                          tooltip: '编辑子项',
                          icon: const Icon(Icons.edit_outlined, size: 19),
                          onPressed: controller.saving
                              ? null
                              : () => editEntity(
                                  context,
                                  controller,
                                  specFor(child.kind),
                                  entity: child,
                                ),
                        ),
                        leading: Checkbox(
                          value: child.flag('done'),
                          onChanged:
                              controller.saving ||
                                  (child.kind == 'tasks' &&
                                      child.text('repeat_rule', 'none') !=
                                          'none' &&
                                      (parseDay(
                                            child.text('active_on'),
                                          )?.isAfter(
                                            dateOnly(DateTime.now()),
                                          ) ??
                                          false))
                              ? null
                              : (_) => runAction(
                                  context,
                                  () => controller.save(
                                    child,
                                    child.kind == 'tasks'
                                        ? toggleTask(child, DateTime.now())
                                        : {
                                            ...child.payload,
                                            'done': !child.flag('done'),
                                          },
                                  ),
                                ),
                        ),
                      ),
                  ],
                  if (spec.fields.isEmpty)
                    for (final entry in item.payload.entries)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: SelectableText('${entry.key}: ${entry.value}'),
                      ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}
