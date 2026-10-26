import 'package:flutter/material.dart';
import '../../core/asset_catalog.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import '../planning/planning.dart';
import '../workspace/workspace_controller.dart';

class DailyLessonPage extends StatefulWidget {
  const DailyLessonPage({
    super.key,
    required this.language,
    required this.controller,
  });
  final String language;
  final WorkspaceController controller;
  @override
  State<DailyLessonPage> createState() => _DailyLessonPageState();
}

class _DailyLessonPageState extends State<DailyLessonPage> {
  late final _catalog = AssetCatalog.load();
  bool _busy = false;
  String _status = '';
  Future<void> _addCards(List<Map> words) async {
    setState(() => _busy = true);
    try {
      final count = await widget.controller.importRows(
        words
            .map(
              (word) => {
                'kind': 'learning_cards',
                'legacy_key': 'lesson:${widget.language}:${word['term']}',
                'payload': {
                  'language': widget.language,
                  'front': word['term'],
                  'back':
                      '${word['meaning']}\n${word['example']}\n${word['translation']}',
                  'source_key': 'daily-lesson',
                  'due_at': DateTime.now().toUtc().toIso8601String(),
                },
              },
            )
            .toList(),
      );
      await widget.controller.refresh();
      if (mounted) {
        setState(
          () => _status = count == 0
              ? '这些词句已收录，可在全部卡片或回收站中查看。'
              : '新增 $count 张复习卡片',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: _catalog,
    builder: (context, snapshot) {
      if (snapshot.hasError) return const Center(child: Text('课程资源读取失败。'));
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final language = widget.language == 'en' ? '英语学习' : '日语学习';
      final bank = (snapshot.data!['words'][language] as List).cast<Map>(),
          cases = (snapshot.data!['cases'][language] as List).cast<Map>();
      final date = dayKey(DateTime.now()),
          seed = int.parse(dayKey(DateTime.now()).replaceAll('-', ''));
      final words = List.generate(6, (i) => bank[(seed + i) % bank.length]),
          study = cases[seed % cases.length];
      return LayoutBuilder(
        builder: (context, bounds) {
          final inset = bounds.maxWidth < 600 ? 20.0 : 30.0;
          return Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1260),
              child: ListView(
                padding: EdgeInsets.all(inset),
                children: [
                  AtlasPageHeader(
                    title: widget.language == 'en' ? '今天，读一点英语。' : '今日も、少しずつ。',
                    subtitle: '$date · 六个词句，一个真实的使用场景。',
                    eyebrow: widget.language == 'en'
                        ? 'A LITTLE ENGLISH, EVERY DAY'
                        : 'SMALL STEPS, EVERY DAY',
                    trailing: OutlinedButton.icon(
                      onPressed: _busy
                          ? null
                          : () => runAction(context, () => _addCards(words)),
                      icon: const Icon(Icons.playlist_add_rounded, size: 18),
                      label: Text(_busy ? '保存中…' : '加入今日词汇复习'),
                    ),
                  ),
                  if (_status.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: AtlasBadge(
                        _status,
                        color: AtlasColors.teal,
                        icon: Icons.check_circle_outline,
                      ),
                    ),
                  const SizedBox(height: 25),
                  LayoutBuilder(
                    builder: (context, width) {
                      final columns = width.maxWidth >= 650 ? 2 : 1;
                      return Wrap(
                        spacing: 16,
                        runSpacing: 16,
                        children: [
                          for (final (index, word) in words.indexed)
                            SizedBox(
                              width:
                                  (width.maxWidth - (columns - 1) * 16) /
                                  columns,
                              child: Card(
                                margin: EdgeInsets.zero,
                                child: Padding(
                                  padding: const EdgeInsets.all(22),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  word['term'].toString(),
                                                  style: const TextStyle(
                                                    fontSize: 24,
                                                    fontWeight: FontWeight.w500,
                                                    height: 1.4,
                                                    color: AtlasColors.gold,
                                                  ),
                                                ),
                                                if ((word['reading'] ?? '')
                                                    .toString()
                                                    .isNotEmpty)
                                                  Text(
                                                    word['reading'].toString(),
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      color: AtlasColors.muted,
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ),
                                          Text(
                                            (index + 1).toString().padLeft(
                                              2,
                                              '0',
                                            ),
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFFB9AA97),
                                              letterSpacing: 1,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        word['meaning'].toString(),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(
                                          vertical: 16,
                                        ),
                                        child: Divider(),
                                      ),
                                      SelectableText(
                                        word['example'].toString(),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          height: 1.8,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        word['translation'].toString(),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AtlasColors.muted,
                                          height: 1.8,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 26),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AtlasColors.sage,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const AtlasBadge(
                          '把词句，放进生活里',
                          color: AtlasColors.teal,
                          icon: Icons.forum_outlined,
                        ),
                        const SizedBox(height: 15),
                        Text(
                          study['title'].toString(),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 7),
                        Text(
                          study['scene'].toString(),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AtlasColors.muted,
                          ),
                        ),
                        const SizedBox(height: 20),
                        SelectableText(
                          study['original'].toString(),
                          style: const TextStyle(fontSize: 14, height: 1.9),
                        ),
                        const SizedBox(height: 13),
                        Text(
                          study['translation'].toString(),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AtlasColors.muted,
                            height: 1.9,
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Divider(),
                        const SizedBox(height: 16),
                        const Text(
                          '试着用一用',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AtlasColors.teal,
                          ),
                        ),
                        const SizedBox(height: 9),
                        for (final task in study['tasks'] as List)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 6),
                                  child: Icon(
                                    Icons.check_rounded,
                                    size: 13,
                                    color: AtlasColors.teal,
                                  ),
                                ),
                                const SizedBox(width: 9),
                                Expanded(
                                  child: Text(
                                    task.toString(),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      height: 1.8,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}
