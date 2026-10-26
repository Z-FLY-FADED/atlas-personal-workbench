import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';

class KnowledgeGraph extends StatefulWidget {
  const KnowledgeGraph({super.key, required this.items, required this.onOpen});
  final List<Map<String, dynamic>> items;
  final ValueChanged<Map<String, dynamic>> onOpen;
  @override
  State<KnowledgeGraph> createState() => _KnowledgeGraphState();
}

class _KnowledgeGraphState extends State<KnowledgeGraph> {
  double _rotation = .3;
  double _tilt = .2;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Wrap(
          spacing: 15,
          runSpacing: 8,
          children: [
            for (final (index, category)
                in widget.items
                    .map((e) => e['primary_category']?.toString() ?? '通用')
                    .toSet()
                    .indexed)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.circle,
                    size: 8,
                    color: _GraphPainter
                        .colors[index % _GraphPainter.colors.length],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    category,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AtlasColors.muted,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
      Expanded(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final painter = _GraphPainter(
              widget.items,
              _rotation,
              _tilt,
              AtlasColors.text,
            );
            final size = Size(constraints.maxWidth, constraints.maxHeight);
            return GestureDetector(
              onPanUpdate: (event) => setState(() {
                _rotation += event.delta.dx * .01;
                _tilt = (_tilt + event.delta.dy * .01).clamp(-1.2, 1.2);
              }),
              onTapUp: (event) {
                final positions = painter.positions(size);
                var nearest = -1;
                var distance = 24.0;
                for (var i = 0; i < positions.length; i++) {
                  final candidate =
                      (positions[i] - event.localPosition).distance;
                  if (candidate < distance) {
                    nearest = i;
                    distance = candidate;
                  }
                }
                if (nearest >= 0) widget.onOpen(widget.items[nearest]);
              },
              child: CustomPaint(size: size, painter: painter),
            );
          },
        ),
      ),
    ],
  );
}

class _GraphPainter extends CustomPainter {
  _GraphPainter(this.items, this.rotation, this.tilt, this.textColor);
  final List<Map<String, dynamic>> items;
  final double rotation, tilt;
  final Color textColor;
  static const colors = [
    Color(0xFFA65F43),
    Color(0xFF73845E),
    Color(0xFF9D7946),
    Color(0xFFB17A70),
    Color(0xFF93915C),
    Color(0xFF948074),
    Color(0xFF6F8A7D),
  ];
  List<String> get categories => items
      .map((e) => e['primary_category']?.toString() ?? '通用')
      .toSet()
      .toList();
  List<Offset> positions(Size size) {
    final radius = math.min(size.width, size.height) * .34;
    return List.generate(items.length, (i) {
      final theta = i * math.pi * (3 - math.sqrt(5));
      final y = 1 - (i + .5) / items.length * 2;
      final radial = math.sqrt(1 - y * y);
      final x = math.cos(theta) * radial;
      final z = math.sin(theta) * radial;
      final rx = x * math.cos(rotation) + z * math.sin(rotation);
      final rz = -x * math.sin(rotation) + z * math.cos(rotation);
      final ry = y * math.cos(tilt) - rz * math.sin(tilt);
      return Offset(
        size.width / 2 + rx * radius,
        size.height / 2 + ry * radius,
      );
    });
  }

  @override
  void paint(Canvas canvas, Size size) {
    final points = positions(size);
    final cats = categories;
    for (var i = 0; i < items.length; i++) {
      final color =
          colors[cats.indexOf(
                items[i]['primary_category']?.toString() ?? '通用',
              ) %
              colors.length];
      for (var j = i + 1; j < items.length; j++) {
        if (items[i]['primary_category'] == items[j]['primary_category']) {
          canvas.drawLine(
            points[i],
            points[j],
            Paint()
              ..color = color.withValues(alpha: .13)
              ..strokeWidth = 1,
          );
        }
      }
      canvas.drawCircle(points[i], 8, Paint()..color = color);
      final raw = items[i]['title']?.toString() ?? '';
      final title = raw.length > 12 ? '${raw.substring(0, 12)}…' : raw;
      final label = TextPainter(
        text: TextSpan(
          text: title,
          style: TextStyle(color: textColor, fontSize: 11),
        ),
        textDirection: TextDirection.ltr,
        maxLines: 1,
      )..layout(maxWidth: 130);
      label.paint(
        canvas,
        Offset(
          (points[i].dx - label.width / 2).clamp(
            0,
            math.max(0, size.width - label.width),
          ),
          points[i].dy + 13,
        ),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GraphPainter old) =>
      old.rotation != rotation || old.tilt != tilt || old.items != items;
}
