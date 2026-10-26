import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/atlas_theme.dart';
import '../planning/planning.dart';

bool validKnowhowGuide(Map<String, dynamic> guide) {
  if (guide['title'] is! String ||
      guide['purpose'] is! String ||
      guide['example'] is! Map) {
    return false;
  }
  for (final key in [
    'preflight',
    'nodes',
    'steps',
    'problems',
    'deliverables',
    'references',
  ]) {
    if (guide[key] is! List || (guide[key] as List).isEmpty) return false;
  }
  return [
    'nodes',
    'steps',
    'problems',
    'references',
  ].every((key) => (guide[key] as List).every((e) => e is Map));
}

class KnowhowView extends StatefulWidget {
  const KnowhowView({super.key, required this.guide});
  final Map<String, dynamic> guide;
  @override
  State<KnowhowView> createState() => _KnowhowViewState();
}

class _KnowhowViewState extends State<KnowhowView> {
  int _step = 0;
  @override
  Widget build(BuildContext context) {
    final guide = widget.guide;
    final steps = (guide['steps'] as List).map(jsonObject).toList();
    final selected = steps[_step.clamp(0, steps.length - 1)];
    final example = jsonObject(guide['example']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _section(context, '动手前', Icons.checklist_rounded, [
          for (final item in guide['preflight'] as List)
            _bullet(item.toString()),
          const SizedBox(height: 10),
          Text(
            guide['boundary'].toString(),
            style: const TextStyle(
              fontSize: 12,
              height: 1.8,
              color: AtlasColors.muted,
            ),
          ),
        ]),
        const SizedBox(height: 20),
        _section(context, '看图理解', Icons.account_tree_outlined, [
          KnowhowDiagram(
            nodes: (guide['nodes'] as List).map(jsonObject).toList(),
          ),
          const SizedBox(height: 14),
          Text(
            guide['mapCaption'].toString(),
            style: const TextStyle(height: 1.8, color: AtlasColors.muted),
          ),
        ]),
        const SizedBox(height: 24),
        Text('按步骤动手', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, bounds) {
            final columns = bounds.maxWidth >= 740 ? 4 : 2;
            final width = (bounds.maxWidth - (columns - 1) * 10) / columns;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final (index, step) in steps.indexed)
                  SizedBox(
                    width: width,
                    child: Semantics(
                      selected: _step == index,
                      child: OutlinedButton(
                        key: ValueKey('knowhow-step-$index'),
                        onPressed: () => setState(() => _step = index),
                        style: OutlinedButton.styleFrom(
                          alignment: Alignment.centerLeft,
                          backgroundColor: _step == index
                              ? AtlasColors.peach
                              : AtlasColors.surface,
                          side: BorderSide(
                            color: _step == index
                                ? AtlasColors.gold
                                : AtlasColors.border,
                          ),
                          padding: const EdgeInsets.all(14),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (index + 1).toString().padLeft(2, '0'),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AtlasColors.gold,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              step['title'].toString(),
                              style: const TextStyle(fontSize: 13, height: 1.5),
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
        const SizedBox(height: 14),
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(23),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${_step + 1} / ${steps.length} · ${selected['title']}',
                  style: Theme.of(
                    context,
                  ).textTheme.titleMedium?.copyWith(color: AtlasColors.gold),
                ),
                const SizedBox(height: 13),
                SelectableText(
                  selected['action'].toString(),
                  style: const TextStyle(height: 1.9),
                ),
                const SizedBox(height: 18),
                const Text(
                  '通过标准',
                  style: TextStyle(
                    color: AtlasColors.teal,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                SelectableText(
                  selected['check'].toString(),
                  style: const TextStyle(height: 1.9),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: _step == 0
                          ? null
                          : () => setState(() => _step--),
                      icon: const Icon(Icons.arrow_back_rounded, size: 17),
                      label: const Text('上一步'),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: _step == steps.length - 1
                          ? null
                          : () => setState(() => _step++),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 17),
                      label: const Text('下一步'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        _section(context, '跟着做一个例子', Icons.science_outlined, [
          Text(
            example['title'].toString(),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 9),
          Text(
            example['given'].toString(),
            style: const TextStyle(height: 1.8),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AtlasColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AtlasColors.border),
            ),
            child: SelectableText(
              example['body'].toString(),
              style: const TextStyle(
                fontFamily: 'Consolas',
                fontFamilyFallback: ['Microsoft YaHei UI'],
                fontSize: 13,
                height: 1.9,
              ),
            ),
          ),
          if (example['plot'] == 'trajectory') ...[
            const SizedBox(height: 20),
            const TrajectoryExamplePlot(),
          ],
          const SizedBox(height: 16),
          SelectableText(
            example['result'].toString(),
            style: const TextStyle(height: 1.9),
          ),
          const SizedBox(height: 10),
          const Text(
            '教学示例 · 非实测记录',
            style: TextStyle(fontSize: 11, color: AtlasColors.muted),
          ),
        ]),
        const SizedBox(height: 24),
        Text('出错时，沿着证据查', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        for (final item in (guide['problems'] as List).map(jsonObject))
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ExpansionTile(
              tilePadding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 4,
              ),
              childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              leading: const Icon(
                Icons.troubleshoot_rounded,
                color: AtlasColors.gold,
              ),
              title: Text(
                item['symptom'].toString(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '先看什么',
                        style: TextStyle(
                          color: AtlasColors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SelectableText(
                        item['check'].toString(),
                        style: const TextStyle(height: 1.9),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '再怎么做',
                        style: TextStyle(
                          color: AtlasColors.teal,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SelectableText(
                        item['fix'].toString(),
                        style: const TextStyle(height: 1.9),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 14),
        _section(context, '完成后留下什么', Icons.inventory_2_outlined, [
          for (final item in guide['deliverables'] as List)
            _bullet(item.toString()),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              final text = [
                guide['title'],
                '',
                for (final (i, step) in steps.indexed)
                  '${i + 1}. ${step['title']}\n${step['action']}\n通过标准：${step['check']}',
                '',
                '交付物：',
                ...(guide['deliverables'] as List),
              ].join('\n');
              await Clipboard.setData(ClipboardData(text: text));
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('实操清单已复制')));
              }
            },
            icon: const Icon(Icons.copy_outlined, size: 17),
            label: const Text('复制清单'),
          ),
        ]),
        const SizedBox(height: 24),
        _section(context, '参考与追溯', Icons.menu_book_outlined, [
          for (final reference in (guide['references'] as List).map(jsonObject))
            Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 2,
                  ),
                ),
                onPressed: () async {
                  final uri = Uri.tryParse(reference['url'].toString());
                  var opened = false;
                  try {
                    if (uri?.scheme == 'https') {
                      opened = await launchUrl(
                        uri!,
                        mode: LaunchMode.externalApplication,
                      );
                    }
                  } catch (_) {
                    /* Surface a useful fallback below. */
                  }
                  if (!opened && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('暂时无法打开参考资料，请检查系统浏览器或网络。')),
                    );
                  }
                },
                icon: const Icon(Icons.open_in_new_rounded, size: 15),
                label: Text(reference['title'].toString()),
              ),
            ),
          const Text(
            '流程与排错建议为 WorkSpace 编辑整理；原理、公式和接口可在以上资料中追溯。',
            style: TextStyle(
              fontSize: 11,
              height: 1.8,
              color: AtlasColors.muted,
            ),
          ),
        ]),
      ],
    );
  }

  Widget _bullet(String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 5),
          child: Icon(Icons.check_rounded, size: 16, color: AtlasColors.teal),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(height: 1.8))),
      ],
    ),
  );

  Widget _section(
    BuildContext context,
    String title,
    IconData icon,
    List<Widget> children,
  ) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: const EdgeInsets.all(23),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 21, color: AtlasColors.gold),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ...children,
        ],
      ),
    ),
  );
}

class KnowhowDiagram extends StatelessWidget {
  const KnowhowDiagram({super.key, required this.nodes});
  final List<Map<String, dynamic>> nodes;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, bounds) {
      final horizontal =
          bounds.maxWidth >= 730 &&
          MediaQuery.textScalerOf(context).scale(1) <= 1.3;
      Widget box(int index) => Container(
        width: horizontal ? null : double.infinity,
        constraints: const BoxConstraints(minHeight: 92),
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: index.isEven ? AtlasColors.peach : AtlasColors.sage,
          borderRadius: BorderRadius.circular(13),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              nodes[index]['label'].toString(),
              style: const TextStyle(fontWeight: FontWeight.w600, height: 1.5),
            ),
            const SizedBox(height: 7),
            Text(
              nodes[index]['detail'].toString(),
              style: const TextStyle(
                fontSize: 12,
                color: AtlasColors.muted,
                height: 1.7,
              ),
            ),
          ],
        ),
      );
      if (horizontal) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            for (var i = 0; i < nodes.length; i++) ...[
              Expanded(child: box(i)),
              if (i < nodes.length - 1)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 3),
                  child: Icon(
                    Icons.arrow_forward_rounded,
                    size: 20,
                    color: AtlasColors.gold,
                  ),
                ),
            ],
          ],
        );
      }
      return Column(
        children: [
          for (var i = 0; i < nodes.length; i++) ...[
            box(i),
            if (i < nodes.length - 1)
              const Padding(
                padding: EdgeInsets.all(3),
                child: Icon(
                  Icons.arrow_downward_rounded,
                  size: 20,
                  color: AtlasColors.gold,
                ),
              ),
          ],
        ],
      );
    },
  );
}

class TrajectoryExamplePlot extends StatefulWidget {
  const TrajectoryExamplePlot({super.key});
  @override
  State<TrajectoryExamplePlot> createState() => _TrajectoryExamplePlotState();
}

class _TrajectoryExamplePlotState extends State<TrajectoryExamplePlot> {
  double _duration = 2;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Semantics(
        label: '五次多项式位置曲线，从 0 度到 90 度，运动时长 ${_duration.toStringAsFixed(1)} 秒',
        child: SizedBox(
          height: 190,
          child: CustomPaint(painter: _TrajectoryPainter(_duration)),
        ),
      ),
      const SizedBox(height: 10),
      Text(
        '运动时长 ${_duration.toStringAsFixed(1)} s · 峰值速度 ${(1.875 * math.pi / 2 / _duration).toStringAsFixed(3)} rad/s',
        style: const TextStyle(fontSize: 12, height: 1.7),
      ),
      Slider(
        semanticFormatterCallback: (value) => '${value.toStringAsFixed(1)} 秒',
        value: _duration,
        min: 1,
        max: 6,
        divisions: 10,
        label: '${_duration.toStringAsFixed(1)} s',
        onChanged: (value) => setState(() => _duration = value),
      ),
    ],
  );
}

class _TrajectoryPainter extends CustomPainter {
  _TrajectoryPainter(this.duration);
  final double duration;
  @override
  void paint(Canvas canvas, Size size) {
    final plot = Rect.fromLTRB(35, 16, size.width - 12, size.height - 28);
    final axis = Paint()
      ..color = AtlasColors.border
      ..strokeWidth = 1;
    void label(String text, Offset position) {
      final painter = TextPainter(
        text: TextSpan(
          text: text,
          style: const TextStyle(
            fontSize: 10,
            color: AtlasColors.muted,
            fontFamily: 'Microsoft YaHei UI',
            fontFamilyFallback: ['Noto Sans CJK SC', 'sans-serif'],
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(canvas, position);
    }

    for (final y in [0, 45, 90]) {
      final py = plot.bottom - y / 90 * plot.height;
      canvas.drawLine(Offset(plot.left, py), Offset(plot.right, py), axis);
      label('$y', Offset(4, py - 7));
    }
    canvas.drawLine(plot.topLeft, plot.bottomLeft, axis);
    for (final x in [0, 2, 4, 6]) {
      label('$x', Offset(plot.left + x / 6 * plot.width - 3, plot.bottom + 6));
    }
    label('deg', const Offset(2, 0));
    label('s', Offset(plot.right, plot.bottom + 6));
    final path = Path();
    for (var i = 0; i <= 120; i++) {
      final t = i / 120;
      final q = (10 * math.pow(t, 3) - 15 * math.pow(t, 4) + 6 * math.pow(t, 5))
          .toDouble();
      final point = Offset(
        plot.left + t * duration / 6 * plot.width,
        plot.bottom - q * plot.height,
      );
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = AtlasColors.gold
        ..strokeWidth = 3
        ..style = PaintingStyle.stroke,
    );
    canvas.drawCircle(
      Offset(plot.left + duration / 6 * plot.width, plot.top),
      4,
      Paint()..color = AtlasColors.gold,
    );
  }

  @override
  bool shouldRepaint(_TrajectoryPainter oldDelegate) =>
      oldDelegate.duration != duration;
}
