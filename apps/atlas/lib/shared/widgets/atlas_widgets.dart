import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';

class AtlasBrand extends StatelessWidget {
  const AtlasBrand({super.key, this.compact = false});
  final bool compact;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: compact ? 35 : 43,
        height: compact ? 35 : 43,
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7EB),
          borderRadius: BorderRadius.circular(compact ? 11 : 13),
        ),
        child: Image.asset(
          'assets/branding/workspace-logo.png',
          semanticLabel: 'WorkSpace Logo',
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          cacheWidth: compact ? 128 : 192,
        ),
      ),
      const SizedBox(width: 12),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'WorkSpace',
            style: TextStyle(
              fontSize: compact ? 20 : 26,
              fontWeight: FontWeight.w700,
              letterSpacing: .2,
              height: 1.2,
              color: AtlasColors.text,
            ),
          ),
          if (!compact)
            const Padding(
              padding: EdgeInsets.only(top: 5),
              child: Text(
                '给成长一点空间',
                style: TextStyle(
                  color: AtlasColors.muted,
                  fontSize: 11,
                  letterSpacing: 1.5,
                ),
              ),
            ),
        ],
      ),
    ],
  );
}

class AtlasBadge extends StatelessWidget {
  const AtlasBadge(
    this.label, {
    super.key,
    this.color = AtlasColors.muted,
    this.icon,
  });
  final String label;
  final Color color;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .09),
      borderRadius: BorderRadius.circular(7),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
        ],
        Flexible(
          child: Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    ),
  );
}

class AtlasPanel extends StatelessWidget {
  const AtlasPanel({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.action,
    this.icon,
    this.padding = const EdgeInsets.all(22),
  });
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? action;
  final IconData? icon;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 19, color: AtlasColors.gold),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              ?action,
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 5),
            Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 20),
          child,
        ],
      ),
    ),
  );
}

class AtlasPageHeader extends StatelessWidget {
  const AtlasPageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.eyebrow,
    this.trailing,
  });
  final String title, subtitle;
  final String? eyebrow;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final heading = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (eyebrow != null) ...[
            Text(
              eyebrow!,
              style: const TextStyle(
                color: AtlasColors.gold,
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 7),
          ],
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 7),
          Text(
            subtitle,
            style: const TextStyle(
              color: AtlasColors.muted,
              fontSize: 13,
              height: 1.7,
            ),
          ),
        ],
      );
      return constraints.maxWidth < 560
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                heading,
                if (trailing != null) ...[
                  const SizedBox(height: 16),
                  trailing!,
                ],
              ],
            )
          : Row(
              children: [
                Expanded(child: heading),
                if (trailing != null) ...[const SizedBox(width: 24), trailing!],
              ],
            );
    },
  );
}

class AtlasEmptyState extends StatelessWidget {
  const AtlasEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.action,
  });
  final IconData icon;
  final String title;
  final String? description;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: const BoxDecoration(
            color: AtlasColors.elevated,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AtlasColors.gold, size: 25),
        ),
        const SizedBox(height: 14),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (description != null) ...[
          const SizedBox(height: 6),
          Text(
            description!,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        if (action != null) ...[const SizedBox(height: 12), action!],
      ],
    ),
  );
}

/// Decorative paper, book and plant shapes; no personal data or progress is implied.
class AtlasPaperArt extends StatelessWidget {
  const AtlasPaperArt({super.key});
  @override
  Widget build(BuildContext context) =>
      const CustomPaint(painter: _PaperPainter(), size: Size(300, 220));
}

class _PaperPainter extends CustomPainter {
  const _PaperPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 300, size.height / 220);
    final fill = Paint();
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    fill.color = const Color(0xFFE8D4B8);
    canvas.drawOval(const Rect.fromLTWH(25, 185, 255, 16), fill);
    fill.color = const Color(0xFFDFB779);
    canvas.drawCircle(const Offset(220, 49), 28, fill);
    line.color = const Color(0xFFCFA878);
    for (var i = 0; i < 9; i++) {
      final a = i * math.pi * 2 / 9;
      canvas.drawLine(
        Offset(220 + 35 * math.cos(a), 49 + 35 * math.sin(a)),
        Offset(220 + 41 * math.cos(a), 49 + 41 * math.sin(a)),
        line,
      );
    }
    canvas.save();
    canvas.translate(74, 44);
    canvas.rotate(-.12);
    fill.color = const Color(0xFFE8C7A8);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(0, 0, 111, 137),
        const Radius.circular(8),
      ),
      fill,
    );
    fill.color = const Color(0xFFFFFCF4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(7, -6, 111, 137),
        const Radius.circular(8),
      ),
      fill,
    );
    line.color = const Color(0xFFD8C5AC);
    for (var i = 0; i < 5; i++) {
      canvas.drawLine(
        Offset(26, 27 + i * 16),
        Offset(i == 4 ? 72 : 95, 27 + i * 16),
        line,
      );
    }
    fill.color = AtlasColors.gold.withValues(alpha: .65);
    canvas.drawCircle(const Offset(22, 112), 4, fill);
    canvas.restore();
    final left = Path()
      ..moveTo(26, 133)
      ..quadraticBezierTo(74, 117, 119, 142)
      ..lineTo(119, 191)
      ..quadraticBezierTo(70, 171, 26, 184)
      ..close();
    final right = Path()
      ..moveTo(119, 142)
      ..quadraticBezierTo(166, 117, 210, 133)
      ..lineTo(210, 184)
      ..quadraticBezierTo(166, 171, 119, 191)
      ..close();
    fill.color = const Color(0xFFFFFBF0);
    canvas.drawPath(left, fill);
    fill.color = const Color(0xFFF4E7D2);
    canvas.drawPath(right, fill);
    line.color = const Color(0xFFC5A783);
    canvas.drawPath(left, line);
    canvas.drawPath(right, line);
    canvas.drawLine(const Offset(119, 143), const Offset(119, 189), line);
    line.color = const Color(0xFFDAC7AC);
    for (var i = 0; i < 3; i++) {
      canvas.drawLine(Offset(39, 147 + i * 10), Offset(102, 154 + i * 9), line);
      canvas.drawLine(
        Offset(137, 154 + i * 9),
        Offset(195, 147 + i * 10),
        line,
      );
    }
    fill.color = const Color(0xFFB18368);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(236, 151, 35, 39),
        const Radius.circular(7),
      ),
      fill,
    );
    line.color = const Color(0xFF7F8A68);
    line.strokeWidth = 2;
    canvas.drawPath(
      Path()
        ..moveTo(254, 155)
        ..quadraticBezierTo(245, 124, 257, 93),
      line,
    );
    fill.color = const Color(0xFF8C9776);
    canvas.drawPath(
      Path()
        ..moveTo(251, 136)
        ..quadraticBezierTo(224, 137, 232, 117)
        ..quadraticBezierTo(251, 116, 251, 136),
      fill,
    );
    canvas.drawPath(
      Path()
        ..moveTo(251, 122)
        ..quadraticBezierTo(277, 122, 275, 101)
        ..quadraticBezierTo(256, 103, 251, 122),
      fill,
    );
    fill.color = const Color(0xFFA4AC8B);
    canvas.drawPath(
      Path()
        ..moveTo(255, 106)
        ..quadraticBezierTo(238, 97, 245, 81)
        ..quadraticBezierTo(262, 83, 255, 106),
      fill,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
