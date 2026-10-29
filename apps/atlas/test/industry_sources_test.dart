import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/features/industry/industry_sources.dart';
import 'package:atlas_workspace/features/explore/source_inbox.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'controller_test.dart' show FakeRepository;

void main() {
  test(
    'Industry sorting uses publication dates, leaves unknown dates last and applies channel/topic/time together',
    () {
      final now = DateTime.utc(2026, 10, 29, 12);
      final rows = [
        const WorkspaceEntity(
          id: 'unknown',
          kind: 'industry_articles',
          payload: {'title': '机器人研究', 'source_channel': 'tech_wechat'},
        ),
        const WorkspaceEntity(
          id: 'old',
          kind: 'industry_articles',
          payload: {
            'title': '机器人研究',
            'published_at': '2021-10-29T09:00:00Z',
            'source_channel': 'tech_wechat',
          },
        ),
        const WorkspaceEntity(
          id: 'new',
          kind: 'industry_articles',
          payload: {
            'title': '机器人控制',
            'published_at': '2026-10-29T09:00:00Z',
            'source_channel': 'tech_wechat',
          },
        ),
        const WorkspaceEntity(
          id: 'company',
          kind: 'industry_articles',
          payload: {
            'title': '大模型发布',
            'published_at': '2026-10-29T10:00:00Z',
            'source_channel': 'official_news',
          },
        ),
      ];
      expect(industryArticles(rows).map((e) => e.id), [
        'company',
        'new',
        'old',
        'unknown',
      ]);
      expect(
        industryArticles(
          rows,
          channel: 'tech_wechat',
          topic: '机器人',
          days: 7,
          now: now,
        ).map((e) => e.id),
        ['new'],
      );
      expect(articleTopics(rows.last), contains('AI'));
    },
  );
  testWidgets(
    'Recommended news sources are personal, classified, and idempotent',
    (tester) async {
      final repo = FakeRepository(), c = WorkspaceController(repo);
      await c.start();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SourceInbox(controller: c, purpose: 'industry'),
          ),
        ),
      );
      await tester.tap(find.text('添加推荐新闻源'));
      await tester.pumpAndSettle();
      expect(repo.rows.length, 4);
      expect(
        repo.rows.map((r) => r.text('source_channel')),
        contains('news_channel'),
      );
      expect(
        repo.rows.map((r) => r.text('source_channel')),
        isNot(contains('company_wechat')),
      );
      await tester.tap(find.text('添加推荐新闻源'));
      await tester.pumpAndSettle();
      expect(repo.rows.length, 4);
      expect(
        industryPublishedAt('Thu, 29 Oct 2026 09:00:00 GMT'),
        DateTime.utc(2026, 10, 29, 9),
      );
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  testWidgets(
    'A Wechat article is saved as direct article collection instead of pretending to be a feed',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = FakeRepository();
      final controller = WorkspaceController(repo);
      await controller.start();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SourceInbox(controller: controller, purpose: 'industry'),
          ),
        ),
      );
      await tester.tap(find.text('添加来源'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('机器之心公众号'));
      await tester.pumpAndSettle();
      final fields = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.byType(TextField),
      );
      await tester.enterText(fields.at(1), 'https://mp.weixin.qq.com/s/test');
      await tester.ensureVisible(find.text('保存来源'));
      await tester.tap(find.text('保存来源'));
      await tester.pumpAndSettle();
      expect(repo.rows, isEmpty);
      expect(find.textContaining('单篇微信链接请选择'), findsOneWidget);
      await tester.ensureVisible(find.text('RSS / Atom / 自建 RSSHub'));
      await tester.tap(find.text('RSS / Atom / 自建 RSSHub'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('微信单篇正文直采').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('保存来源'));
      await tester.pumpAndSettle();
      expect(repo.rows.single.text('adapter'), 'wechat_article');
      expect(repo.rows.single.text('source_channel'), 'tech_wechat');
      expect(repo.rows.single.list('focus_topics'), contains('机器人'));
      await tester.pump(const Duration(seconds: 2));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );
  testWidgets('Industry inbox separates Wechat from official company news', (
    tester,
  ) async {
    final repo = FakeRepository()
      ..rows.addAll([
        const WorkspaceEntity(
          id: 'wx',
          kind: 'industry_articles',
          payload: {
            'title': '微信机器人推文',
            'source_channel': 'company_wechat',
            'published_at': '2026-10-29T09:00:00Z',
          },
        ),
        const WorkspaceEntity(
          id: 'web',
          kind: 'industry_articles',
          payload: {
            'title': '官网机器人新闻',
            'source_channel': 'official_news',
            'published_at': '2026-10-29T10:00:00Z',
          },
        ),
      ]);
    final c = WorkspaceController(repo);
    await c.start();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SourceInbox(controller: c, purpose: 'industry'),
        ),
      ),
    );
    await tester.tap(find.text('全部来源'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('大厂公众号').last);
    await tester.pumpAndSettle();
    expect(find.text('微信机器人推文'), findsOneWidget);
    expect(find.text('官网机器人新闻'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
}
