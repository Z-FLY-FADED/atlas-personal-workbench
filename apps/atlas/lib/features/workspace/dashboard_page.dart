import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../planning/planning.dart';
import 'catalog.dart';
import 'entity.dart';
import 'workspace_controller.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({
    super.key,
    required this.controller,
    required this.onNavigate,
    this.userName = '',
  });
  final WorkspaceController controller;
  final ValueChanged<String> onNavigate;
  final String userName;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now(), today = dayKey(DateTime.now());
    final tasks = controller.items('tasks');
    final pending = tasks
        .where(
          (t) =>
              !t.flag('done') &&
              (t.text('active_on').isEmpty ||
                  t.text('active_on').compareTo(today) <= 0),
        )
        .toList();
    final projects = controller
        .items('projects')
        .where((e) => !['已完成', '已暂停'].contains(e.text('status')))
        .toList();
    final profiles = controller.items('profiles');
    final name = profiles.isNotEmpty
        ? profiles.first.text('display_name', userName)
        : userName;
    final greeting = now.hour < 6
        ? '夜深了'
        : now.hour < 12
        ? '上午好'
        : now.hour < 18
        ? '下午好'
        : '晚上好';
    final weekday = [
      '星期一',
      '星期二',
      '星期三',
      '星期四',
      '星期五',
      '星期六',
      '星期日',
    ][now.weekday - 1];
    return LayoutBuilder(
      builder: (context, bounds) {
        final compact = bounds.maxWidth < 600,
            twoColumns = bounds.maxWidth >= 900;
        return RefreshIndicator(
          onRefresh: controller.refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.all(compact ? 20 : 30),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1320),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name.isEmpty || name == '我的空间'
                                      ? '$greeting，欢迎回到自己的空间。'
                                      : '$greeting，$name',
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineMedium
                                      ?.copyWith(fontSize: compact ? 23 : 26),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  profiles.isNotEmpty &&
                                          profiles.first
                                              .text('motto')
                                              .isNotEmpty
                                      ? profiles.first.text('motto')
                                      : '每一个小小的行动，都在让生活慢慢变好。',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AtlasColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!compact) ...[
                            const SizedBox(width: 20),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${now.month}月${now.day}日',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  weekday,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AtlasColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 24),
                      _welcome(
                        context,
                        pending.length,
                        compact: compact,
                        showFocus: twoColumns,
                        showArt: bounds.maxWidth >= 1150,
                      ),
                      const SizedBox(height: 20),
                      _metrics(context, pending.length, projects.length),
                      const SizedBox(height: 24),
                      if (twoColumns)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 7,
                              child: Column(
                                children: [
                                  _tasks(context, pending),
                                  const SizedBox(height: 22),
                                  _projects(context, projects, tasks),
                                ],
                              ),
                            ),
                            const SizedBox(width: 22),
                            Expanded(
                              flex: 4,
                              child: Column(
                                children: [
                                  _growth(context),
                                  const SizedBox(height: 22),
                                  _notes(context),
                                  const SizedBox(height: 22),
                                  _reminders(context),
                                ],
                              ),
                            ),
                          ],
                        )
                      else ...[
                        _tasks(context, pending),
                        const SizedBox(height: 20),
                        _focus(context),
                        const SizedBox(height: 20),
                        _growth(context),
                        const SizedBox(height: 20),
                        _projects(context, projects, tasks),
                        const SizedBox(height: 20),
                        _notes(context),
                        const SizedBox(height: 20),
                        _reminders(context),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14),
                            child: Text(
                              '慢慢积累，慢慢成为',
                              style: TextStyle(
                                fontSize: 10,
                                color: AtlasColors.muted,
                                letterSpacing: 2,
                              ),
                            ),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _welcome(
    BuildContext context,
    int count, {
    required bool compact,
    required bool showFocus,
    required bool showArt,
  }) => Container(
    padding: EdgeInsets.all(compact ? 22 : 26),
    decoration: BoxDecoration(
      color: AtlasColors.peach,
      borderRadius: BorderRadius.circular(23),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TODAY, AT YOUR PACE',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  color: AtlasColors.gold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '从一件重要的小事开始。',
                style: TextStyle(
                  fontSize: compact ? 22 : 25,
                  fontWeight: FontWeight.w600,
                  height: 1.5,
                  color: AtlasColors.text,
                ),
              ),
              const SizedBox(height: 9),
              Text(
                count > 0
                    ? '今天有 $count 件事等待推进，选一件，专注地完成。'
                    : '写下今天的计划，为时间找到一个温柔的方向。',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF795C49),
                  height: 1.8,
                ),
              ),
              const SizedBox(height: 22),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    onPressed: controller.saving
                        ? null
                        : () =>
                              editEntity(context, controller, specFor('tasks')),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('添加任务'),
                  ),
                  TextButton.icon(
                    onPressed: controller.saving
                        ? null
                        : () => editEntity(
                            context,
                            controller,
                            specFor('quick_notes'),
                          ),
                    icon: const Icon(Icons.edit_note_rounded, size: 20),
                    label: const Text('记录灵感'),
                    style: TextButton.styleFrom(
                      foregroundColor: AtlasColors.gold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (showArt) ...[
          const SizedBox(width: 12),
          const SizedBox(width: 190, height: 170, child: AtlasPaperArt()),
        ],
        if (showFocus) ...[
          const SizedBox(width: 24),
          SizedBox(width: 238, child: _focus(context, embedded: true)),
        ],
      ],
    ),
  );

  Widget _metrics(BuildContext context, int pending, int projects) {
    final metrics = [
      (pending, '待推进任务', Icons.check_circle_outline, 'tasks', AtlasColors.gold),
      (projects, '进行中项目', Icons.folder_outlined, 'projects', AtlasColors.blue),
      (
        controller.items('knowledge').length,
        '知识资料',
        Icons.auto_stories_outlined,
        'knowledge',
        AtlasColors.teal,
      ),
      (
        controller.items('quick_notes').length,
        '随手笔记',
        Icons.edit_note_outlined,
        'quick_notes',
        AtlasColors.rose,
      ),
    ];
    return LayoutBuilder(
      builder: (context, c) {
        final count = c.maxWidth >= 640 ? 4 : 2;
        return Container(
          decoration: BoxDecoration(
            color: AtlasColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AtlasColors.border, width: .7),
          ),
          child: Wrap(
            children: [
              for (final m in metrics)
                SizedBox(
                  width: (c.maxWidth - 2) / count,
                  child: InkWell(
                    onTap: () => onNavigate(m.$4),
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 17,
                        vertical: 17,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: m.$5.withValues(alpha: .08),
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Icon(m.$3, size: 18, color: m.$5),
                          ),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  m.$1.toString(),
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w600,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  m.$2,
                                  style: const TextStyle(
                                    color: AtlasColors.muted,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _open(BuildContext context, WorkspaceEntity e) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => EntityDetailPage(controller: controller, entityId: e.id),
    ),
  );

  Widget _tasks(BuildContext context, List<WorkspaceEntity> tasks) =>
      AtlasPanel(
        title: '今日待办',
        icon: Icons.wb_sunny_outlined,
        subtitle: '把注意力放在此刻，一件一件慢慢来。',
        action: TextButton(
          onPressed: () => onNavigate('tasks'),
          child: const Text('全部任务', style: TextStyle(fontSize: 11)),
        ),
        child: tasks.isEmpty
            ? AtlasEmptyState(
                icon: Icons.check_rounded,
                title: '今天，想完成什么？',
                description: '一个清晰的小目标，就是很好的开始。',
                action: TextButton.icon(
                  onPressed: controller.saving
                      ? null
                      : () => editEntity(context, controller, specFor('tasks')),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('写下第一件事'),
                ),
              )
            : Column(
                children: [
                  for (final (i, task) in tasks.take(5).indexed) ...[
                    if (i > 0) const Divider(height: 21),
                    InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => _open(context, task),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 35,
                            height: 45,
                            child: Checkbox(
                              value: false,
                              onChanged: controller.saving
                                  ? null
                                  : (_) => runAction(
                                      context,
                                      () => controller.save(
                                        task,
                                        toggleTask(task, DateTime.now()),
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 9),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    task.text('title'),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 7,
                                    runSpacing: 6,
                                    children: [
                                      AtlasBadge(
                                        task.text('priority', '一般'),
                                        color: task.text('priority') == '优先'
                                            ? AtlasColors.gold
                                            : AtlasColors.muted,
                                      ),
                                      if (task.text('horizon').isNotEmpty)
                                        AtlasBadge(
                                          task.text('horizon'),
                                          color: AtlasColors.blue,
                                        ),
                                      if (task.text('date').isNotEmpty)
                                        AtlasBadge(
                                          task.text('date'),
                                          icon: Icons.event_outlined,
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 17,
                              color: AtlasColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
      );

  Widget _focus(BuildContext context, {bool embedded = false}) {
    final minutes = (controller.focusSeconds ~/ 60).toString().padLeft(2, '0'),
        seconds = (controller.focusSeconds % 60).toString().padLeft(2, '0');
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(embedded ? 20 : 23),
      decoration: BoxDecoration(
        color: embedded ? const Color(0xFFFFF9EF) : AtlasColors.sage,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.timelapse_rounded,
                size: 17,
                color: AtlasColors.teal,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  '专注时刻',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
              if (controller.isFocusing)
                const AtlasBadge('进行中', color: AtlasColors.teal),
            ],
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              '$minutes:$seconds',
              style: TextStyle(
                fontSize: embedded ? 36 : 43,
                fontWeight: FontWeight.w300,
                height: 1.2,
                letterSpacing: 3,
                color: const Color(0xFF676548),
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          const SizedBox(height: 7),
          Center(
            child: Text(
              controller.isFocusing ? '留一点安静，给正在做的事。' : '一次只做一件事，就很好。',
              style: const TextStyle(fontSize: 10, color: AtlasColors.muted),
            ),
          ),
          const SizedBox(height: 17),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonalIcon(
              icon: Icon(
                controller.isFocusing
                    ? Icons.stop_rounded
                    : Icons.play_arrow_rounded,
                size: 18,
              ),
              label: Text(controller.isFocusing ? '结束并保存' : '开始专注'),
              onPressed: controller.saving
                  ? null
                  : () => runAction(context, () async {
                      if (controller.isFocusing) {
                        await controller.finishFocus();
                      } else {
                        controller.startFocus();
                      }
                    }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _projects(
    BuildContext context,
    List<WorkspaceEntity> projects,
    List<WorkspaceEntity> tasks,
  ) => AtlasPanel(
    title: '正在推进',
    icon: Icons.folder_open_outlined,
    action: TextButton(
      onPressed: () => onNavigate('projects'),
      child: const Text('全部项目', style: TextStyle(fontSize: 11)),
    ),
    child: projects.isEmpty
        ? AtlasEmptyState(
            icon: Icons.route_outlined,
            title: '把远处的目标，拆成眼前的路',
            description: '用项目连接任务，为每一步留下进展。',
            action: TextButton(
              onPressed: () => onNavigate('projects'),
              child: const Text('规划一个项目'),
            ),
          )
        : Column(
            children: [
              for (final (index, project) in projects.take(3).indexed) ...[
                if (index > 0) const SizedBox(height: 22),
                InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => _open(context, project),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AtlasColors.peach,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.folder_outlined,
                              size: 18,
                              color: AtlasColors.gold,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  project.text('title'),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (project.text('stage').isNotEmpty)
                                  Text(
                                    project.text('stage'),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AtlasColors.muted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '${(projectProgress(project, tasks) * 100).round()}%',
                            style: const TextStyle(
                              color: AtlasColors.gold,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 13),
                      LinearProgressIndicator(
                        value: projectProgress(project, tasks),
                        minHeight: 5,
                        color: AtlasColors.gold,
                        borderRadius: BorderRadius.circular(5),
                      ),
                      if (project.text('next_milestone').isNotEmpty) ...[
                        const SizedBox(height: 9),
                        Text(
                          '下一步 · ${project.text('next_milestone')}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AtlasColors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
  );

  Widget _growth(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    color: AtlasColors.sage,
    child: Padding(
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.spa_outlined, size: 18, color: AtlasColors.teal),
              SizedBox(width: 9),
              Text(
                '给成长留一点时间',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            '不必很多，每天一点就好。',
            style: TextStyle(fontSize: 11, color: AtlasColors.muted),
          ),
          const SizedBox(height: 13),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => onNavigate('languages'),
              icon: const Icon(Icons.translate_rounded, size: 17),
              label: const Text('语言学习'),
              style: TextButton.styleFrom(foregroundColor: AtlasColors.teal),
            ),
          ),
          for (final lang in [('en', 'EN', '英语学习'), ('ja', 'あ', '日语学习')])
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                width: 39,
                height: 39,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AtlasColors.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  lang.$2,
                  style: const TextStyle(
                    fontSize: 15,
                    color: AtlasColors.teal,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              title: Text(
                lang.$3,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              subtitle: Text(
                _reviewCaption(lang.$1),
                style: const TextStyle(fontSize: 10, color: AtlasColors.muted),
              ),
              trailing: const Icon(
                Icons.arrow_forward_rounded,
                size: 16,
                color: AtlasColors.teal,
              ),
              onTap: () => onNavigate(lang.$1),
            ),
          const Divider(height: 20),
          InkWell(
            onTap: () => onNavigate('knowledge'),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.auto_stories_outlined,
                    size: 20,
                    color: AtlasColors.teal,
                  ),
                  SizedBox(width: 11),
                  Expanded(
                    child: Text('打开你的知识书架', style: TextStyle(fontSize: 12)),
                  ),
                  Icon(
                    Icons.north_east_rounded,
                    size: 15,
                    color: AtlasColors.teal,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );

  String _reviewCaption(String lang) {
    final count = controller
        .items('learning_cards')
        .where(
          (e) =>
              [
                lang,
                lang == 'en' ? '英语学习' : '日语学习',
              ].contains(e.text('language')) &&
              !(DateTime.tryParse(e.text('due_at')) ?? DateTime(1970)).isAfter(
                DateTime.now(),
              ),
        )
        .length;
    return count > 0 ? '有 $count 张卡片等待复习' : '每日课程 · 词句与场景练习';
  }

  Widget _notes(BuildContext context) {
    final notes = controller.items('quick_notes');
    return Card(
      margin: EdgeInsets.zero,
      color: const Color(0xFFFBF0D9),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.edit_note_rounded,
                  size: 21,
                  color: AtlasColors.blue,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    '灵感小笺',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
                IconButton(
                  tooltip: '新建笔记',
                  onPressed: controller.saving
                      ? null
                      : () => editEntity(
                          context,
                          controller,
                          specFor('quick_notes'),
                        ),
                  icon: const Icon(Icons.add_rounded, size: 18),
                ),
              ],
            ),
            if (notes.isEmpty) ...[
              const SizedBox(height: 8),
              const Text('有些想法，值得被轻轻接住。', style: TextStyle(fontSize: 13)),
              const SizedBox(height: 8),
              const Text(
                '记下一句灵感、一段感受，或一个待探索的问题。',
                style: TextStyle(
                  fontSize: 11,
                  color: AtlasColors.muted,
                  height: 1.8,
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: controller.saving
                      ? null
                      : () => editEntity(
                          context,
                          controller,
                          specFor('quick_notes'),
                        ),
                  child: const Text('随手记一笔 →'),
                ),
              ),
            ] else ...[
              for (final (index, note) in notes.take(2).indexed) ...[
                if (index > 0) const Divider(height: 20),
                InkWell(
                  onTap: () => _open(context, note),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    child: Text(
                      note.text('content'),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, height: 1.9),
                    ),
                  ),
                ),
              ],
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => onNavigate('quick_notes'),
                  child: const Text('查看全部笔记 →', style: TextStyle(fontSize: 11)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _reminders(BuildContext context) {
    final reminders =
        controller.items('reminders').where((e) => !e.flag('done')).toList()
          ..sort(
            (a, b) => (DateTime.tryParse(a.text('remind_at')) ?? DateTime(2100))
                .compareTo(
                  DateTime.tryParse(b.text('remind_at')) ?? DateTime(2100),
                ),
          );
    if (reminders.isEmpty) {
      return TextButton.icon(
        onPressed: controller.saving
            ? null
            : () => editEntity(context, controller, specFor('reminders')),
        icon: const Icon(Icons.notifications_none, size: 18),
        label: const Text('为重要的事，留一个提醒', style: TextStyle(fontSize: 11)),
      );
    }
    return AtlasPanel(
      title: '接下来',
      icon: Icons.notifications_none,
      child: Column(
        children: [
          for (final item in reminders.take(3))
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: Text(
                item.text('title'),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12),
              ),
              subtitle: Text(
                displayTimestamp(item.text('remind_at')),
                style: const TextStyle(fontSize: 10),
              ),
              onTap: () => onNavigate('reminders'),
            ),
        ],
      ),
    );
  }
}
