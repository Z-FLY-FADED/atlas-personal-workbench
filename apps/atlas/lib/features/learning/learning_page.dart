import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';
import 'learning_service.dart';
import 'daily_lesson_page.dart';

class LearningPage extends StatefulWidget {
  const LearningPage({
    super.key,
    required this.controller,
    required this.client,
    required this.language,
  });
  final WorkspaceController controller;
  final SupabaseClient client;
  final String language;
  @override
  State<LearningPage> createState() => _LearningPageState();
}

class _LearningPageState extends State<LearningPage> {
  String? _revealed;
  @override
  Widget build(BuildContext context) {
    final due = widget.controller
        .items('learning_cards')
        .where(
          (e) =>
              [
                widget.language,
                widget.language == 'en' ? '英语学习' : '日语学习',
              ].contains(e.text('language')) &&
              !(DateTime.tryParse(e.text('due_at')) ?? DateTime(1970)).isAfter(
                DateTime.now(),
              ),
        )
        .toList();
    due.sort((a, b) => a.text('due_at').compareTo(b.text('due_at')));
    final card = due.isEmpty ? null : due.first;
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: '每日课程'),
              Tab(text: '今日复习'),
              Tab(text: '全部卡片'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                DailyLessonPage(
                  language: widget.language,
                  controller: widget.controller,
                ),
                ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    Text(
                      widget.language == 'en'
                          ? 'English · 每日一点积累'
                          : '日本語 · 毎日少しずつ',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    Text('待复习 ${due.length} 张 · FSRS 间隔复习'),
                    const SizedBox(height: 24),
                    if (card == null)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            children: [
                              const Icon(Icons.task_alt, size: 48),
                              const SizedBox(height: 16),
                              const Text('本轮已完成，可以添加自己的词句。'),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: () => editEntity(
                                  context,
                                  widget.controller,
                                  specFor('learning_cards'),
                                  initial: {'language': widget.language},
                                ),
                                child: const Text('添加卡片'),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(28),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SelectableText(
                                card.text('front'),
                                style: Theme.of(
                                  context,
                                ).textTheme.headlineMedium,
                              ),
                              const SizedBox(height: 32),
                              if (_revealed == card.id) ...[
                                SelectableText(
                                  card.text('back'),
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 32),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    for (var rating = 1; rating <= 4; rating++)
                                      OutlinedButton(
                                        onPressed: widget.controller.saving
                                            ? null
                                            : () =>
                                                  runAction(context, () async {
                                                    final review =
                                                        LearningService.review(
                                                          card,
                                                          rating,
                                                          DateTime.now(),
                                                        );
                                                    await widget.controller
                                                        .reviewCard(
                                                          card,
                                                          review.payload,
                                                          review.log,
                                                        );
                                                    if (mounted) {
                                                      setState(
                                                        () => _revealed = null,
                                                      );
                                                    }
                                                  }),
                                        child: Text(
                                          ['忘记', '困难', '记得', '轻松'][rating - 1],
                                        ),
                                      ),
                                  ],
                                ),
                              ] else
                                FilledButton(
                                  onPressed: () =>
                                      setState(() => _revealed = card.id),
                                  child: const Text('显示答案'),
                                ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                CollectionPage(
                  controller: widget.controller,
                  kind: 'learning_cards',
                  language: widget.language,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
