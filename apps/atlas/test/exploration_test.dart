import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atlas_workspace/features/ai/ai_page.dart';
import 'package:atlas_workspace/features/explore/source_inbox.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'controller_test.dart' show FakeRepository;

void main() {
  testWidgets(
    'Mobile source dialog saves personal company URL and keywords through repository',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = FakeRepository();
      final controller = WorkspaceController(repo);
      await controller.start();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SourceInbox(controller: controller, purpose: 'career'),
          ),
        ),
      );
      await tester.tap(find.text('添加来源'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).at(1), '示例公司');
      await tester.enterText(
        find.byType(TextField).at(2),
        'https://example.com/careers',
      );
      await tester.enterText(find.byType(TextField).at(3), '机械 研发');
      await tester.tap(find.text('保存来源'));
      await tester.pumpAndSettle();
      final row = repo.rows.single;
      expect(row.text('purpose'), 'career');
      expect(row.text('keywords'), '机械 研发');
      expect(row.flag('enabled'), true);
      await tester.pump(const Duration(seconds: 2));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );
  testWidgets('Career inbox filters out financial and industry results', (
    tester,
  ) async {
    final repo = FakeRepository()
      ..rows.addAll([
        for (final purpose in ['career', 'market', 'industry'])
          WorkspaceEntity(
            id: purpose,
            kind: 'industry_articles',
            payload: {
              'purpose': purpose,
              'title': 'title-$purpose',
              'summary': '正文',
              'canonical_url': 'https://example.com/$purpose',
            },
          ),
      ]);
    final c = WorkspaceController(repo);
    await c.start();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SourceInbox(controller: c, purpose: 'career'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('title-career'), findsOneWidget);
    expect(find.text('title-market'), findsNothing);
    expect(find.text('title-industry'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
  for (final conflict in [false, true]) {
    testWidgets(
      'AI rewrite preserves original and ${conflict ? 'rejects stale version' : 'saves reviewed text'}',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 1800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repo = FakeRepository()
          ..rows.addAll([
            const WorkspaceEntity(
              id: 'policy',
              kind: 'workspace_settings',
              payload: {'key': 'runtime-policy', 'value': '{"mode":"ai"}'},
            ),
            const WorkspaceEntity(
              id: 'doc',
              kind: 'knowledge',
              version: 1,
              payload: {
                'title': '个人知识',
                'content': '原始正文',
                'summary': '保持摘要',
                'source': '原始来源',
              },
            ),
          ]);
        Future<Map<String, dynamic>> request(Map<String, dynamic> body) async {
          if (body['action'] == 'connections') {
            return {
              'connections': [
                {'id': 'model', 'name': '个人模型', 'model': 'test'},
              ],
            };
          }
          expect(body['target_id'], 'doc');
          expect(body['task'], 'rewrite');
          expect(body['connection_id'], 'model');
          return {
            'result': '建议正文',
            'sources': [
              {'id': 'doc', 'title': '个人知识', 'version': 1, 'citation': 1},
            ],
            'proposal': {
              'id': 'doc',
              'version': 1,
              'content': '建议正文',
              'original_content': '原始正文',
            },
          };
        }

        final c = WorkspaceController(repo);
        await c.start();
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ListenableBuilder(
                listenable: c,
                builder: (_, child) => AIPage(controller: c, request: request),
              ),
            ),
          ),
        );
        await tester.tap(find.text('加载模型连接'));
        await tester.pumpAndSettle();

        expect(find.text('个人模型 · test'), findsOneWidget);
        await tester.tap(find.text('搜寻个人知识与资料'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('修改知识正文（预览后保存）').last);
        await tester.pumpAndSettle();
        await tester.tap(find.text('按关键词检索个人资料'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('个人知识').last);
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField).last, '改写正文');
        await tester.tap(find.text('运行所选任务'));
        await tester.pumpAndSettle();

        expect(
          c.items('ai_runs'),
          isNotEmpty,
          reason: tester
              .widgetList<Text>(find.byType(Text))
              .map((e) => e.data)
              .join('|'),
        );
        expect(c.items('ai_runs').single.text('original_content'), '原始正文');
        expect(c.items('knowledge').single.text('content'), '原始正文');
        if (conflict) {
          repo.rows[1] = const WorkspaceEntity(
            id: 'doc',
            kind: 'knowledge',
            version: 2,
            payload: {'title': '个人知识', 'content': '其他设备的新正文'},
          );
        }
        await tester.ensureVisible(find.text('确认保存到知识库'));
        await tester.tap(find.text('确认保存到知识库'));
        await tester.pumpAndSettle();
        expect(
          c.items('knowledge').single.text('content'),
          conflict ? '其他设备的新正文' : '建议正文',
        );
        if (!conflict) {
          expect(c.items('knowledge').single.text('summary'), '保持摘要');
          expect(c.items('knowledge').single.text('source'), '原始来源');
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        c.dispose();
      },
    );
  }
}
