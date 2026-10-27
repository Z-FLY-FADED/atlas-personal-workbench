import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import 'workspace_controller.dart';
import 'workspace_search.dart';

const workspaceNavigation = [
  ('home', '工作台', Icons.space_dashboard_outlined, '计划与记录'),
  ('tasks', '个人任务', Icons.check_circle_outline, '计划与记录'),
  ('projects', '项目', Icons.folder_outlined, '计划与记录'),
  ('quick_notes', '笔记', Icons.edit_note_outlined, '计划与记录'),
  ('reminders', '提醒', Icons.notifications_none, '计划与记录'),
  ('knowledge', '知识库', Icons.auto_stories_outlined, '学习与成长'),
  ('languages', '语言学习', Icons.translate_rounded, '学习与成长'),
  ('en', '英语学习', Icons.language, '语言学习'),
  ('ja', '日语学习', Icons.translate, '语言学习'),
  ('weekly_reviews', '每周总结', Icons.insights_outlined, '学习与成长'),
  ('applications', '简历投递', Icons.work_outline, '探索与工具'),
  ('watchlist_items', '股票', Icons.candlestick_chart_outlined, '探索与工具'),
  ('industry_articles', '行业速览', Icons.newspaper_outlined, '探索与工具'),
  ('research', '资料检索', Icons.manage_search, '探索与工具'),
  ('ai', 'AI 助手', Icons.auto_awesome_outlined, '探索与工具'),
  ('profiles', '个人设置', Icons.tune_outlined, '设置'),
  ('data', '数据与恢复', Icons.cloud_sync_outlined, '设置'),
  ('updates', '关于与更新', Icons.system_update_alt_rounded, '设置'),
];

class WorkspaceFrame extends StatelessWidget {
  const WorkspaceFrame({
    super.key,
    required this.controller,
    required this.page,
    required this.onNavigate,
    required this.onLogout,
    required this.child,
    this.userName = '我的空间',
  });
  final WorkspaceController controller;
  final String page, userName;
  final ValueChanged<String> onNavigate;
  final VoidCallback onLogout;
  final Widget child;

  void _search(BuildContext context) => showDialog<void>(
    context: context,
    builder: (_) => WorkspaceSearch(
      controller: controller,
      navigation: workspaceNavigation,
      onNavigate: onNavigate,
      onOpenEntity: (id) => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              EntityDetailPage(controller: controller, entityId: id),
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 1080;
    final item = workspaceNavigation.firstWhere((e) => e.$1 == page);
    final content = Column(
      children: [
        if (controller.error != null)
          MaterialBanner(
            backgroundColor: const Color(0xFFFAECE3),
            content: Text(
              controller.error!,
              style: const TextStyle(fontSize: 12),
            ),
            leading: const Icon(Icons.cloud_off_outlined, size: 20),
            actions: [
              TextButton(
                onPressed: controller.refresh,
                child: const Text('重试'),
              ),
            ],
          ),
        if (controller.saving ||
            (controller.loading && controller.all.isNotEmpty))
          const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: controller.loading && controller.all.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : child,
        ),
      ],
    );
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyK, control: true): () =>
            _search(context),
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          appBar: wide
              ? null
              : AppBar(
                  title: Text(
                    item.$2,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  actions: [
                    IconButton(
                      tooltip: '搜索工作台',
                      onPressed: () => _search(context),
                      icon: const Icon(Icons.search_rounded, size: 22),
                    ),
                    _syncStatus(compact: true),
                    IconButton(
                      tooltip: '刷新',
                      onPressed: controller.loading ? null : controller.refresh,
                      icon: const Icon(Icons.refresh_rounded, size: 21),
                    ),
                    const SizedBox(width: 5),
                  ],
                ),
          drawer: wide
              ? null
              : Drawer(
                  width: 280,
                  child: SafeArea(child: _navigation(context, drawer: true)),
                ),
          body: SafeArea(
            child: wide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        width: 224,
                        decoration: const BoxDecoration(
                          color: AtlasColors.sidebar,
                          border: Border(
                            right: BorderSide(
                              color: AtlasColors.border,
                              width: .7,
                            ),
                          ),
                        ),
                        child: Material(
                          type: MaterialType.transparency,
                          child: _navigation(context),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            Container(
                              height: 72,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 30,
                              ),
                              decoration: const BoxDecoration(
                                color: AtlasColors.surface,
                                border: Border(
                                  bottom: BorderSide(
                                    color: AtlasColors.border,
                                    width: .7,
                                  ),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    item.$4 == '语言学习' ? '学习与成长' : item.$4,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: AtlasColors.muted,
                                    ),
                                  ),
                                  if (item.$4 == '语言学习') ...[
                                    const Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 9,
                                      ),
                                      child: Icon(
                                        Icons.chevron_right_rounded,
                                        size: 15,
                                        color: AtlasColors.muted,
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () => onNavigate('languages'),
                                      child: const Padding(
                                        padding: EdgeInsets.symmetric(
                                          vertical: 12,
                                        ),
                                        child: Text(
                                          '语言学习',
                                          style: TextStyle(fontSize: 13),
                                        ),
                                      ),
                                    ),
                                  ],
                                  const Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: 11,
                                    ),
                                    child: Icon(
                                      Icons.chevron_right_rounded,
                                      size: 15,
                                      color: AtlasColors.muted,
                                    ),
                                  ),
                                  Text(
                                    item.$2,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const Spacer(),
                                  SizedBox(
                                    width:
                                        MediaQuery.sizeOf(context).width >= 1350
                                        ? 280
                                        : 220,
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(10),
                                      onTap: () => _search(context),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 13,
                                          vertical: 10,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AtlasColors.background,
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          border: Border.all(
                                            color: AtlasColors.border,
                                            width: .7,
                                          ),
                                        ),
                                        child: const Row(
                                          children: [
                                            Icon(
                                              Icons.search_rounded,
                                              size: 17,
                                              color: AtlasColors.muted,
                                            ),
                                            SizedBox(width: 9),
                                            Expanded(
                                              child: Text(
                                                '搜索内容或功能',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: AtlasColors.muted,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 20),
                                  _syncStatus(),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    tooltip: '重新加载云端数据',
                                    onPressed: controller.loading
                                        ? null
                                        : controller.refresh,
                                    icon: const Icon(
                                      Icons.refresh_rounded,
                                      size: 20,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Expanded(child: content),
                          ],
                        ),
                      ),
                    ],
                  )
                : content,
          ),
          bottomNavigationBar: wide
              ? null
              : Builder(
                  builder: (scaffoldContext) => Container(
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: AtlasColors.border, width: .7),
                      ),
                    ),
                    child: NavigationBar(
                      selectedIndex: switch (page) {
                        'home' => 0,
                        'tasks' => 1,
                        'knowledge' => 2,
                        _ => 3,
                      },
                      onDestinationSelected: (index) {
                        if (index == 3) {
                          Scaffold.of(scaffoldContext).openDrawer();
                        } else {
                          onNavigate(['home', 'tasks', 'knowledge'][index]);
                        }
                      },
                      destinations: const [
                        NavigationDestination(
                          icon: Icon(Icons.space_dashboard_outlined),
                          selectedIcon: Icon(Icons.space_dashboard_rounded),
                          label: '工作台',
                        ),
                        NavigationDestination(
                          icon: Icon(Icons.check_circle_outline),
                          selectedIcon: Icon(Icons.check_circle),
                          label: '任务',
                        ),
                        NavigationDestination(
                          icon: Icon(Icons.auto_stories_outlined),
                          selectedIcon: Icon(Icons.auto_stories),
                          label: '知识库',
                        ),
                        NavigationDestination(
                          icon: Icon(Icons.grid_view_rounded),
                          label: '更多',
                        ),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _syncStatus({bool compact = false}) => Tooltip(
    message: controller.lastSynced == null
        ? '尚未同步'
        : '最近同步 ${controller.lastSynced!.toLocal().toString().split('.').first}',
    child: compact
        ? Padding(
            padding: const EdgeInsets.only(right: 2),
            child: Icon(
              controller.connected
                  ? Icons.cloud_done_outlined
                  : Icons.cloud_off_outlined,
              size: 18,
              color: controller.connected ? AtlasColors.teal : AtlasColors.gold,
            ),
          )
        : AtlasBadge(
            controller.loading
                ? '同步中'
                : controller.connected
                ? '已同步'
                : '未连接',
            color: controller.connected ? AtlasColors.teal : AtlasColors.gold,
            icon: controller.connected
                ? Icons.cloud_done_outlined
                : Icons.cloud_off_outlined,
          ),
  );

  Widget _navigation(BuildContext context, {bool drawer = false}) {
    void navigate(String value) {
      if (drawer) Navigator.pop(context);
      onNavigate(value);
    }

    Widget tile((String, String, IconData, String) item) {
      final selected =
          page == item.$1 ||
          (item.$1 == 'languages' && const ['en', 'ja'].contains(page));
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Semantics(
          selected: selected,
          button: true,
          child: Material(
            color: selected ? AtlasColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            child: InkWell(
              onTap: () => navigate(item.$1),
              borderRadius: BorderRadius.circular(11),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 11,
                ),
                child: Row(
                  children: [
                    Icon(
                      item.$3,
                      size: 19,
                      color: selected ? AtlasColors.gold : AtlasColors.muted,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        item.$2,
                        style: TextStyle(
                          fontSize: 13,
                          color: selected ? AtlasColors.gold : AtlasColors.text,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                    if (item.$1 == 'tasks' &&
                        controller
                            .items('tasks')
                            .where((e) => !e.flag('done'))
                            .isNotEmpty)
                      Text(
                        controller
                            .items('tasks')
                            .where((e) => !e.flag('done'))
                            .length
                            .toString(),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AtlasColors.gold,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    final rawGroup = workspaceNavigation.firstWhere((e) => e.$1 == page).$4;
    final activeGroup = rawGroup == '语言学习' ? '学习与成长' : rawGroup;
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(22, 28, 20, 24),
          child: Align(
            alignment: Alignment.centerLeft,
            child: AtlasBrand(compact: true),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 13),
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(13, 8, 0, 9),
                child: Text(
                  '计划与记录',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AtlasColors.text,
                    letterSpacing: .5,
                  ),
                ),
              ),
              for (final item in workspaceNavigation.where(
                (e) => e.$4 == '计划与记录',
              ))
                tile(item),
              const SizedBox(height: 15),
              for (final group in ['学习与成长', '探索与工具'])
                Theme(
                  data: Theme.of(
                    context,
                  ).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    key: ValueKey('$group-${activeGroup == group}'),
                    initiallyExpanded:
                        activeGroup == group ||
                        (group == '学习与成长' && activeGroup == '计划与记录'),
                    tilePadding: const EdgeInsets.fromLTRB(13, 0, 10, 0),
                    childrenPadding: const EdgeInsets.only(bottom: 8),
                    dense: true,
                    visualDensity: VisualDensity.compact,
                    title: Text(
                      group,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AtlasColors.text,
                        letterSpacing: .5,
                      ),
                    ),
                    iconColor: AtlasColors.muted,
                    collapsedIconColor: AtlasColors.muted,
                    children: [
                      for (final item in workspaceNavigation.where(
                        (e) => e.$4 == group,
                      ))
                        tile(item),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(14, 8, 12, 14),
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: AtlasColors.border, width: .8),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  for (final item in workspaceNavigation.where(
                    (e) => e.$4 == '设置' && e.$1 != 'updates',
                  ))
                    Expanded(
                      child: TextButton.icon(
                        onPressed: () => navigate(item.$1),
                        icon: Icon(item.$3, size: 15),
                        label: Text(
                          item.$2,
                          style: const TextStyle(fontSize: 10),
                        ),
                        style: TextButton.styleFrom(
                          foregroundColor: page == item.$1
                              ? AtlasColors.gold
                              : AtlasColors.muted,
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () => navigate('updates'),
                  icon: const Icon(Icons.system_update_alt_rounded, size: 15),
                  label: const Text('关于与更新', style: TextStyle(fontSize: 11)),
                  style: TextButton.styleFrom(
                    foregroundColor: page == 'updates'
                        ? AtlasColors.gold
                        : AtlasColors.muted,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
              const SizedBox(height: 7),
              Row(
                children: [
                  CircleAvatar(
                    radius: 17,
                    backgroundColor: const Color(0xFFE0D3C0),
                    child: Text(
                      userName.isEmpty ? 'A' : userName.characters.first,
                      style: const TextStyle(
                        color: AtlasColors.gold,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Text(
                          '一点一滴，皆是成长',
                          style: TextStyle(
                            fontSize: 9,
                            color: AtlasColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: '退出登录',
                    onPressed: onLogout,
                    icon: const Icon(Icons.logout_rounded, size: 16),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
