import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../planning/planning.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';

class ReviewsPage extends StatelessWidget {
  const ReviewsPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
        child: AtlasPageHeader(
          title: '每周回顾',
          subtitle: '回头看看走过的路，也为下一周留一点方向。',
          eyebrow: 'NOTICE YOUR PROGRESS',
          trailing: FilledButton.icon(
            onPressed: controller.saving
                ? null
                : () async {
                    final week = dayKey(weekStart(DateTime.now()));
                    final existing = controller
                        .items('weekly_reviews')
                        .where((e) => e.text('week_start') == week);
                    await editEntity(
                      context,
                      controller,
                      specFor('weekly_reviews'),
                      entity: existing.isEmpty ? null : existing.first,
                      initial: {
                        'week_start': week,
                        'content': existing.isEmpty
                            ? weeklySummary(controller.all, DateTime.now())
                            : existing.first.text('content'),
                      },
                    );
                  },
            icon: const Icon(Icons.insights_outlined, size: 18),
            label: const Text('生成本周初稿'),
          ),
        ),
      ),
      Expanded(
        child: CollectionPage(
          controller: controller,
          kind: 'weekly_reviews',
          embedded: true,
        ),
      ),
    ],
  );
}
