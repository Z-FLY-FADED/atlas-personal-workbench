import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../workspace/workspace_controller.dart';

class LanguageHubPage extends StatelessWidget {
  const LanguageHubPage({
    super.key,
    required this.controller,
    required this.onNavigate,
  });
  final WorkspaceController controller;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, bounds) {
      final inset = bounds.maxWidth < 600 ? 20.0 : 30.0;
      final columns = bounds.maxWidth >= 760 ? 2 : 1;
      final cardWidth =
          (bounds.maxWidth - inset * 2 - 18 * (columns - 1)) / columns;
      return ListView(
        padding: EdgeInsets.all(inset),
        children: [
          const AtlasPageHeader(
            title: '语言学习',
            subtitle: '把一句新表达，慢慢变成自己的声音。',
            eyebrow: 'LEARN · SPEAK · REMEMBER',
          ),
          const SizedBox(height: 24),
          Card(
            margin: EdgeInsets.zero,
            color: AtlasColors.sage,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Wrap(
                spacing: 28,
                runSpacing: 16,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Icon(
                    Icons.forum_outlined,
                    size: 35,
                    color: AtlasColors.teal,
                  ),
                  SizedBox(
                    width: (bounds.maxWidth - inset * 2 - 135).clamp(
                      180.0,
                      600.0,
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '从听懂、会说，到记得住。',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 9),
                        Text(
                          '选一门语言，学习今天的词句与场景，再用间隔复习巩固。自己的卡片和学习记录都在这里。',
                          style: TextStyle(height: 1.7),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 23),
          Wrap(
            spacing: 18,
            runSpacing: 18,
            children: [
              for (final language in const [
                ('en', 'EN', '英语学习', 'English', '用英语读资料、聊工作，也表达日常。'),
                ('ja', 'あ', '日语学习', '日本語', '从日常问候开始，积累词句和场景表达。'),
              ])
                SizedBox(
                  width: cardWidth,
                  child: _languageCard(context, language),
                ),
            ],
          ),
        ],
      );
    },
  );

  Widget _languageCard(
    BuildContext context,
    (String, String, String, String, String) language,
  ) {
    final cards = controller
        .items('learning_cards')
        .where((e) => [language.$1, language.$3].contains(e.text('language')))
        .toList();
    final now = DateTime.now();
    final due = cards
        .where(
          (e) => !(DateTime.tryParse(e.text('due_at')) ?? DateTime(1970))
              .isAfter(now),
        )
        .length;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: language.$1 == 'en'
                        ? AtlasColors.peach
                        : AtlasColors.sage,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    language.$2,
                    style: const TextStyle(
                      fontSize: 24,
                      color: AtlasColors.gold,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        language.$3,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        language.$4,
                        style: const TextStyle(color: AtlasColors.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(language.$5, style: const TextStyle(height: 1.7)),
            const SizedBox(height: 18),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AtlasBadge('${cards.length} 张个人卡片', icon: Icons.style_outlined),
                AtlasBadge(
                  '$due 张待复习',
                  color: AtlasColors.teal,
                  icon: Icons.schedule_rounded,
                ),
              ],
            ),
            const SizedBox(height: 23),
            FilledButton.icon(
              key: ValueKey('open-${language.$1}'),
              onPressed: () => onNavigate(language.$1),
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: Text('进入${language.$3}'),
            ),
          ],
        ),
      ),
    );
  }
}

class LanguageFeatureFrame extends StatelessWidget {
  const LanguageFeatureFrame({
    super.key,
    required this.language,
    required this.onNavigate,
    required this.child,
  });
  final String language;
  final ValueChanged<String> onNavigate;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Wrap(
          spacing: 20,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            TextButton.icon(
              onPressed: () => onNavigate('languages'),
              icon: const Icon(Icons.arrow_back_rounded, size: 17),
              label: const Text('语言学习'),
            ),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'en',
                  label: Text('英语'),
                  icon: Icon(Icons.language, size: 17),
                ),
                ButtonSegment(
                  value: 'ja',
                  label: Text('日语'),
                  icon: Icon(Icons.translate, size: 17),
                ),
              ],
              selected: {language},
              onSelectionChanged: (value) => onNavigate(value.single),
            ),
          ],
        ),
      ),
      Expanded(child: child),
    ],
  );
}
