import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/theme/atlas_theme.dart';
import 'package:atlas_workspace/features/ai/ai_page.dart';
import 'package:atlas_workspace/features/explore/source_inbox.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'controller_test.dart' show FakeRepository;

void main() {
  final evidence = Platform.environment['ATLAS_UI_EVIDENCE'];
  setUpAll(() async {
    if (evidence == null) return;
    final bytes = await File('C:/Windows/Fonts/msyh.ttc').readAsBytes();
    for (final family in ['Roboto', 'Microsoft YaHei UI']) {
      await (FontLoader(
        family,
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    }
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  for (final width in [390.0, 1440.0]) {
    for (final page in ['career', 'market', 'industry', 'ai']) {
      testWidgets('Exploration $page fits $width', (tester) async {
        tester.view.physicalSize = Size(width, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repo = FakeRepository()
          ..rows.addAll([
            const WorkspaceEntity(
              id: 'doc',
              kind: 'knowledge',
              version: 1,
              payload: {'title': '我的机械设计与控制知识', 'content': '整理设计方法与验证记录。'},
            ),
            if (page != 'ai')
              WorkspaceEntity(
                id: 'article',
                kind: 'industry_articles',
                payload: {
                  'title': page == 'career' ? '机械研发工程师公开招聘公告' : '关注行业动态与技术变化',
                  'purpose': page,
                  'summary': '查看原始来源，核对条件、时间和信息。采集内容仅在自己的账号中保存。',
                  'source_name': '示例来源',
                  'record_type': 'announcement',
                  'fetched_at': '2026-10-28T08:00:00Z',
                  'canonical_url': 'https://example.com/source',
                },
              ),
          ]);
        final c = WorkspaceController(repo);
        await c.start();
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: MaterialApp(
              debugShowCheckedModeBanner: false,
              theme: evidence == null
                  ? buildAtlasTheme()
                  : buildAtlasTheme().copyWith(
                      textTheme: buildAtlasTheme().textTheme.apply(
                        fontFamily: 'Microsoft YaHei UI',
                      ),
                      primaryTextTheme: buildAtlasTheme().primaryTextTheme
                          .apply(fontFamily: 'Microsoft YaHei UI'),
                      chipTheme: buildAtlasTheme().chipTheme.copyWith(
                        labelStyle: buildAtlasTheme().chipTheme.labelStyle
                            ?.copyWith(fontFamily: 'Microsoft YaHei UI'),
                      ),
                    ),
              home: Scaffold(
                body: page == 'ai'
                    ? AIPage(
                        controller: c,
                        request: (body) async => {'connections': []},
                      )
                    : SourceInbox(controller: c, purpose: page),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        if (evidence != null) {
          final boundary =
              key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          await tester.runAsync(() async {
            final img = await boundary.toImage(pixelRatio: 1);
            final png = await img.toByteData(format: ui.ImageByteFormat.png);
            img.dispose();
            await Directory(evidence).create(recursive: true);
            await File(
              '$evidence/explore-$page-${width.toInt()}.png',
            ).writeAsBytes(png!.buffer.asUint8List());
          });
        }
        await tester.pumpWidget(const SizedBox());
        c.dispose();
      });
    }
  }
}
