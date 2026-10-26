import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:atlas_workspace/core/asset_catalog.dart';
import 'package:atlas_workspace/core/theme/atlas_theme.dart';
import 'package:atlas_workspace/features/planning/planning.dart';
import 'package:atlas_workspace/features/workspace/catalog.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/workspace/workspace_repository.dart';
import 'package:atlas_workspace/features/workspace/workspace_frame.dart';
import 'package:atlas_workspace/features/workspace/dashboard_page.dart';
import 'package:atlas_workspace/features/knowledge/knowledge_page.dart';
import 'package:atlas_workspace/features/knowledge/knowhow_view.dart';
import 'package:atlas_workspace/features/learning/language_hub_page.dart';
import 'package:atlas_workspace/features/learning/learning_page.dart';
import 'package:atlas_workspace/features/learning/learning_service.dart';
import 'package:atlas_workspace/features/career/career_page.dart';
import 'package:atlas_workspace/features/market/market_page.dart';
import 'package:atlas_workspace/features/industry/industry_page.dart';
import 'package:atlas_workspace/features/research/research_page.dart';
import 'package:atlas_workspace/features/reviews/reviews_page.dart';
import 'package:atlas_workspace/features/data/data_page.dart';
import 'package:atlas_workspace/features/ai/ai_page.dart';
import 'package:atlas_workspace/shared/widgets/entity_editor.dart';
import 'package:atlas_workspace/shared/widgets/collection_page.dart';
import 'controller_test.dart' show FakeRepository;
import 'auth_test.dart' show sessionResponse, TestPkceStorage;

class OfflineClient extends Fake implements SupabaseClient {}

class CommitThenTimeout extends FakeRepository {
  @override
  Future<WorkspaceEntity> save(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
  ) async {
    await super.save(entity, payload);
    throw TimeoutException('Response lost after commit');
  }
}

class ReadFailsAfterSave extends FakeRepository {
  bool failReads = false;
  @override
  Future<List<WorkspaceEntity>> load() =>
      failReads ? Future.error(StateError('read offline')) : super.load();
  @override
  Future<WorkspaceEntity> save(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
  ) async {
    final saved = await super.save(entity, payload);
    failReads = true;
    return saved;
  }

  @override
  Future<void> setDeleted(WorkspaceEntity entity, bool deleted) async {
    await super.setDeleted(entity, deleted);
    failReads = true;
  }
}

Widget app(Widget child) => MaterialApp(
  theme: buildAtlasTheme(),
  locale: const Locale('zh', 'CN'),
  supportedLocales: const [Locale('zh', 'CN')],
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: child,
);

Finder input(String label) =>
    find.ancestor(of: find.text(label), matching: find.byType(TextFormField));
Future<void> enter(WidgetTester tester, String label, String text) async {
  await tester.ensureVisible(input(label));
  await tester.enterText(input(label), text);
}

Future<void> saveDialog(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FilledButton, '保存'));
  await tester.pumpAndSettle();
}

Future<void> realAssets(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 100)),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() => AssetCatalog.load());

  test(
    'Know-how covers all 17 books with useful offline content and source links',
    () async {
      final catalog = await AssetCatalog.load();
      final books = catalog['knowledge'] as List;
      expect(books, hasLength(17));
      final keys = <String>{};
      var steps = 0;
      for (final book in books) {
        final guide = Map<String, dynamic>.from(book['knowhow'] as Map);
        expect(validKnowhowGuide(guide), true);
        expect(keys.add(guide['key'] as String), true);
        expect(guide['key'], book['stable_key']);
        for (final step in guide['steps'] as List) {
          expect((step['action'] as String).length, greaterThan(25));
          expect((step['check'] as String).length, greaterThan(10));
        }
        for (final source in guide['references'] as List) {
          expect(Uri.parse(source['url'] as String).scheme, 'https');
        }
        steps += (guide['steps'] as List).length;
      }
      expect(steps, 68);
    },
  );

  test(
    'Calendar validation rejects normalized invalid dates and invalid time',
    () {
      expect(parseDay('2026-02-30'), isNull);
      expect(parseDay('2026-13-01'), isNull);
      expect(parseDay('2028-02-29'), isNotNull);
      expect(parseTimestamp('2026-02-30 09:00'), isNull);
      expect(parseTimestamp('2026-10-26 24:00'), isNull);
      expect(parseTimestamp('2026-10-26T09:30:00+08:00'), isNotNull);
    },
  );

  test(
    'Today stops showing previous completions and future recurring occurrences',
    () {
      final today = DateTime(2026, 10, 27);
      WorkspaceEntity task(Map<String, dynamic> payload) => WorkspaceEntity(
        id: 'task',
        kind: 'tasks',
        payload: {'horizon': '今日', ...payload},
      );
      expect(
        taskInScope(
          task({'done': true, 'completed_on': '2026-10-26'}),
          '今日',
          today,
        ),
        false,
      );
      expect(
        taskInScope(
          task({'done': true, 'completed_on': '2026-10-27'}),
          '今日',
          today,
        ),
        true,
      );
      expect(
        taskInScope(task({'active_on': '2026-10-28'}), '今日', today),
        false,
      );
      expect(taskInScope(task({'active_on': '2026-10-26'}), '今日', today), true);
      expect(
        taskInScope(
          task({'done': true, 'completed_on': '2025-01-01'}),
          '全部',
          today,
        ),
        true,
      );
      expect(task({'done': 'true'}).flag('done'), true);
    },
  );

  test(
    'A repeated completion cannot be recorded again before the next date',
    () {
      const task = WorkspaceEntity(
        id: 'daily',
        kind: 'tasks',
        payload: {'repeat_rule': 'daily', 'active_on': '2026-10-26'},
      );
      final completed = toggleTask(task, DateTime(2026, 10, 26, 23, 59));
      final next = WorkspaceEntity(
        id: task.id,
        kind: task.kind,
        payload: completed,
      );
      expect(completed['active_on'], '2026-10-27');
      expect(
        () => toggleTask(next, DateTime(2026, 10, 26, 23, 59)),
        throwsStateError,
      );
      final nextDay = toggleTask(next, DateTime(2026, 10, 27, 0, 1));
      expect(nextDay['active_on'], '2026-10-28');
      expect(nextDay['completion_history'], hasLength(2));
      expect(
        nextOccurrence('weekly', '2026-11-02', DateTime(2026, 10, 26)),
        '2026-11-02',
      );
    },
  );

  test(
    'Acknowledged saves retain the server revision when the following read fails',
    () async {
      final repository = ReadFailsAfterSave();
      final controller = WorkspaceController(repository);
      await controller.start();
      final record = controller.create('quick_notes');
      await controller.save(record, {'content': '已确认保存'});
      expect(controller.items('quick_notes').single.version, 1);
      expect(controller.items('quick_notes').single.text('content'), '已确认保存');
      expect(controller.connected, false);
      repository.failReads = false;
      await controller.save(controller.items('quick_notes').single, {
        'content': '再次编辑',
      });
      expect(controller.items('quick_notes').single.version, 2);
      expect(repository.rows, hasLength(1));
      controller.dispose();
    },
  );

  test(
    'A lost response is reconciled against the exact saved ID and full payload',
    () async {
      final repository = CommitThenTimeout();
      final controller = WorkspaceController(repository);
      await controller.start();
      final record = controller.create('knowledge');
      await controller.save(record, {
        'title': '不能重复新增',
        'nested': {
          'a': [1, true],
        },
      });
      expect(controller.items('knowledge').single.id, record.id);
      expect(controller.items('knowledge').single.version, 1);
      expect(repository.rows, hasLength(1));
      controller.dispose();
    },
  );

  test(
    'Acknowledged recycling and restore stay visible correctly when refresh fails',
    () async {
      final repository = ReadFailsAfterSave();
      final controller = WorkspaceController(repository);
      await controller.start();
      await controller.save(controller.create('quick_notes'), {
        'content': '保留笔记',
      });
      repository.failReads = false;
      await controller.delete(controller.items('quick_notes').single);
      expect(controller.items('quick_notes'), isEmpty);
      final deleted = controller.all.single;
      expect(deleted.version, 2);
      repository.failReads = false;
      await controller.restore(deleted);
      expect(controller.items('quick_notes').single.text('content'), '保留笔记');
      expect(controller.items('quick_notes').single.version, 3);
      controller.dispose();
    },
  );

  test(
    'Writes wait for an overlapping refresh then load their committed result',
    () async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      repository.pending = Completer<List<WorkspaceEntity>>();
      final refreshing = controller.refresh();
      final writing = controller.save(controller.create('tasks'), {
        'title': '刷新中的新增',
      });
      await Future<void>.delayed(Duration.zero);
      expect(repository.rows, isEmpty);
      final pending = repository.pending!;
      repository.pending = null;
      pending.complete([]);
      await refreshing;
      await writing;
      expect(controller.items('tasks').single.text('title'), '刷新中的新增');
      controller.dispose();
    },
  );

  test(
    'Imports deduplicate, reviews reschedule, and recycle/restore preserve content',
    () async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      final row = {
        'kind': 'learning_cards',
        'legacy_key': 'lesson:en:hello',
        'payload': {'front': 'hello', 'back': '你好', 'language': 'en'},
      };
      expect(await controller.importRows([row]), 1);
      expect(await controller.importRows([row]), 0);
      final card = controller.items('learning_cards').single;
      final now = DateTime.now();
      final review = LearningService.review(card, 3, now);
      await controller.reviewCard(card, review.payload, review.log);
      expect(controller.items('learning_cards').single.version, 2);
      expect(
        DateTime.parse(
          controller.items('learning_cards').single.text('due_at'),
        ).isAfter(now),
        true,
      );
      expect(controller.items('learning_logs'), hasLength(1));
      await controller.delete(controller.items('learning_cards').single);
      expect(controller.items('learning_cards'), isEmpty);
      final deleted = controller.all.singleWhere(
        (e) => e.kind == 'learning_cards',
      );
      await controller.restore(deleted);
      expect(controller.items('learning_cards').single.text('front'), 'hello');
      controller.dispose();
    },
  );

  for (final arrayResponse in [false, true]) {
    test(
      'Repository reads the real RPC revision from ${arrayResponse ? 'row set' : 'object'} response',
      () async {
        final session = sessionResponse();
        final user = (session['user'] as Map)['id'] as String;
        final client = SupabaseClient(
          'https://test.supabase.co',
          'sb_publishable_test',
          authOptions: AuthClientOptions(
            autoRefreshToken: false,
            pkceAsyncStorage: TestPkceStorage(),
          ),
          httpClient: MockClient((request) async {
            if (request.url.path.startsWith('/auth/')) {
              return http.Response(
                jsonEncode(session),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            expect(request.url.path, '/rest/v1/rpc/atlas_save_entity');
            final body = jsonDecode(request.body) as Map;
            expect(body['p_version'], 4);
            final row = {
              'id': body['p_id'],
              'kind': body['p_kind'],
              'version': 5,
              'payload': body['p_payload'],
              'updated_at': '2026-10-26T00:00:00Z',
            };
            return http.Response(
              jsonEncode(arrayResponse ? [row] : row),
              200,
              headers: {'content-type': 'application/json'},
              request: request,
            );
          }),
        );
        addTearDown(client.dispose);
        await client.auth.recoverSession(jsonEncode(session));
        final repository = SupabaseWorkspaceRepository(client, user);
        final saved = await repository.save(
          const WorkspaceEntity(
            id: 'eaa00377-2fd4-47e5-a26f-38a822c97bbf',
            kind: 'quick_notes',
            payload: {},
            version: 4,
          ),
          {'content': '保存到正确版本'},
        );
        expect(saved.version, 5);
        expect(saved.text('content'), '保存到正确版本');
        await repository.dispose();
      },
    );
  }

  for (final spec in collections) {
    testWidgets(
      '${spec.kind}: create then edit the same record through its form',
      (tester) async {
        tester.view.physicalSize = const Size(1000, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repository = FakeRepository()
          ..rows.addAll([
            const WorkspaceEntity(
              id: 'related-task',
              kind: 'tasks',
              version: 1,
              payload: {'title': '关联基础任务'},
            ),
            const WorkspaceEntity(
              id: 'related-project',
              kind: 'projects',
              version: 1,
              payload: {'title': '关联基础项目'},
            ),
            const WorkspaceEntity(
              id: 'related-knowledge',
              kind: 'knowledge',
              version: 1,
              payload: {'title': '关联基础资料'},
            ),
          ]);
        final controller = WorkspaceController(repository);
        await controller.start();
        WorkspaceEntity? editing;
        await tester.pumpWidget(
          app(
            Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  key: const ValueKey('open-editor'),
                  onPressed: () =>
                      editEntity(context, controller, spec, entity: editing),
                  child: const Text('打开编辑器'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.byKey(const ValueKey('open-editor')));
        await tester.pumpAndSettle();
        for (final field in spec.fields.where((f) => f.required)) {
          if (field.type == FieldType.relation) {
            await tester.ensureVisible(
              find.byKey(ValueKey('field-${field.key}')),
            );
            await tester.tap(find.byKey(ValueKey('field-${field.key}')));
            await tester.pumpAndSettle();
            await tester.tap(
              find
                  .text(
                    field.relation == 'tasks'
                        ? '关联基础任务'
                        : field.relation == 'projects'
                        ? '关联基础项目'
                        : '关联基础资料',
                  )
                  .last,
            );
            await tester.pumpAndSettle();
          } else {
            final value = field.type == FieldType.date
                ? dayKey(weekStart(DateTime.now()))
                : field.type == FieldType.dateTime
                ? '2026-11-02 09:30'
                : field.key == 'url'
                ? 'https://example.com/feed.xml'
                : '新增-${field.key}';
            await enter(tester, field.label, value);
          }
        }
        if (spec.kind == 'projects') await enter(tester, '进度（0–100）', '35.5');
        await saveDialog(tester);
        expect(find.byType(EntityEditor), findsNothing, reason: spec.kind);
        final created = repository.rows.singleWhere(
          (e) => !e.id.startsWith('related-'),
        );
        expect(created.version, 1);
        if (spec.kind == 'projects') {
          expect(projectProgress(created, []), closeTo(.355, .0001));
        }
        editing = created;
        await tester.tap(find.byKey(const ValueKey('open-editor')));
        await tester.pumpAndSettle();
        final field = spec.fields.firstWhere((f) => f.key == spec.titleKey);
        final updated = field.type == FieldType.date
            ? dayKey(weekStart(DateTime.now()).add(const Duration(days: 7)))
            : '修改-${field.key}';
        await enter(tester, field.label, updated);
        await saveDialog(tester);
        final result = repository.rows.singleWhere((e) => e.id == created.id);
        expect(result.version, 2, reason: spec.kind);
        expect(result.text(spec.titleKey), updated);
        expect(
          repository.rows.where((e) => !e.id.startsWith('related-')),
          hasLength(1),
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        controller.dispose();
      },
    );
  }

  testWidgets(
    'Failed save keeps the draft; retry edits without losing unknown fields',
    (tester) async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      await controller.save(controller.create('knowledge'), {
        'title': '原始标题',
        'content': '原始正文',
        'unknown': {'legacy': true},
      });
      final record = controller.items('knowledge').single;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => editEntity(
                  context,
                  controller,
                  specFor('knowledge'),
                  entity: record,
                ),
                child: const Text('编辑'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('编辑'));
      await tester.pumpAndSettle();
      await enter(tester, '正文', '网络失败仍要保留的正文');
      repository.failure = StateError('测试写入失败');
      await saveDialog(tester);
      expect(find.text('测试写入失败'), findsOneWidget);
      expect(repository.rows.single.text('content'), '原始正文');
      expect(
        tester.widget<TextFormField>(input('正文')).controller!.text,
        '网络失败仍要保留的正文',
      );
      repository.failure = null;
      await saveDialog(tester);
      expect(repository.rows.single.text('content'), '网络失败仍要保留的正文');
      expect(repository.rows.single.payload['unknown'], {'legacy': true});
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );

  testWidgets(
    'Cross-device same-field edits require an explicit merge choice',
    (tester) async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      await controller.save(controller.create('quick_notes'), {
        'content': '原始笔记',
        'status': '待整理',
      });
      final original = controller.items('quick_notes').single;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => editEntity(
                  context,
                  controller,
                  specFor('quick_notes'),
                  entity: original,
                ),
                child: const Text('编辑'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('编辑'));
      await tester.pumpAndSettle();
      await enter(tester, '笔记内容', '当前输入笔记');
      await repository.save(original, {
        ...original.payload,
        'content': '另一设备笔记',
        'remote_extra': '保留',
      });
      await saveDialog(tester);
      expect(find.textContaining('已获取最新版本'), findsOneWidget);
      await saveDialog(tester);
      expect(find.text('合并修改'), findsOneWidget);
      expect(find.text('另一设备笔记'), findsOneWidget);
      await tester.tap(find.text('返回核对'));
      await tester.pumpAndSettle();
      expect(repository.rows.single.text('content'), '另一设备笔记');
      await saveDialog(tester);
      await tester.tap(find.text('保存当前输入'));
      await tester.pumpAndSettle();
      expect(repository.rows.single.text('content'), '当前输入笔记');
      expect(repository.rows.single.text('remote_extra'), '保留');
      expect(repository.rows.single.version, 3);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );

  testWidgets(
    'Importing an updated master resume edits the existing singleton',
    (tester) async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      await controller.save(controller.create('resumes'), {
        'file_name': '旧简历',
        'content': '旧正文',
      });
      final id = controller.items('resumes').single.id;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => editEntity(
                  context,
                  controller,
                  specFor('resumes'),
                  initial: {'file_name': '新版简历.docx', 'content': '导入后的新正文'},
                ),
                child: const Text('导入预览'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('导入预览'));
      await tester.pumpAndSettle();
      await saveDialog(tester);
      expect(repository.rows, hasLength(1));
      expect(repository.rows.single.id, id);
      expect(repository.rows.single.text('file_name'), '新版简历.docx');
      expect(repository.rows.single.text('content'), '导入后的新正文');
      expect(repository.rows.single.version, 2);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );

  testWidgets(
    'Saved knowledge opens an editable reader and displays the saved changes',
    (tester) async {
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      final book = Map<String, dynamic>.from(
        ((await tester.runAsync(AssetCatalog.load))!['knowledge'] as List).first
            as Map,
      );
      await controller.save(controller.create('knowledge'), book);
      final record = controller.items('knowledge').single;
      await tester.pumpWidget(
        app(
          KnowledgeReaderPage(
            controller: controller,
            payload: record.payload,
            entityId: record.id,
          ),
        ),
      );
      await realAssets(tester);
      await tester.tap(find.byKey(const ValueKey('edit-knowledge')));
      await tester.pumpAndSettle();
      await enter(tester, '正文', '新增的实操经验已经保存');
      await enter(tester, '摘要', '用户编辑后的摘要');
      await saveDialog(tester);
      expect(repository.rows.single.text('content'), '新增的实操经验已经保存');
      expect(find.text('用户编辑后的摘要'), findsOneWidget);
      expect(find.text('新增的实操经验已经保存'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );

  testWidgets('RSS publication timestamps do not prevent editing an article', (
    tester,
  ) async {
    final repository = FakeRepository();
    final controller = WorkspaceController(repository);
    await controller.start();
    await controller.save(controller.create('industry_articles'), {
      'title': '订阅资讯',
      'published_at': 'Mon, 26 Oct 2026 01:00:00 GMT',
    });
    final record = controller.items('industry_articles').single;
    await tester.pumpWidget(
      app(
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => editEntity(
                context,
                controller,
                specFor('industry_articles'),
                entity: record,
              ),
              child: const Text('编辑资讯'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('编辑资讯'));
    await tester.pumpAndSettle();
    await enter(tester, '摘要', '补充行业摘要');
    await saveDialog(tester);
    expect(find.byType(EntityEditor), findsNothing);
    expect(repository.rows.single.text('summary'), '补充行业摘要');
    expect(
      repository.rows.single.text('published_at'),
      'Mon, 26 Oct 2026 01:00:00 GMT',
    );
    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });

  testWidgets('An invalid calendar date is rejected before writing', (
    tester,
  ) async {
    final repository = FakeRepository();
    final controller = WorkspaceController(repository);
    await controller.start();
    await tester.pumpWidget(
      app(
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () =>
                  editEntity(context, controller, specFor('tasks')),
              child: const Text('新增'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('新增'));
    await tester.pumpAndSettle();
    await enter(tester, '任务名称', '校验日期');
    await enter(tester, '执行日期', '2026-02-30');
    await saveDialog(tester);
    expect(find.text('请输入有效日期，格式为 YYYY-MM-DD'), findsOneWidget);
    expect(repository.rows, isEmpty);
    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });

  testWidgets(
    'Task/reminder defaults hide completed history while filters keep it accessible',
    (tester) async {
      for (final kind in ['tasks', 'reminders']) {
        final repository = FakeRepository()
          ..rows.addAll([
            WorkspaceEntity(
              id: '$kind-done',
              kind: kind,
              version: 1,
              payload: {
                'title': '过去已完成',
                'done': 'true',
                'completed_on': '2025-01-01',
              },
            ),
            WorkspaceEntity(
              id: '$kind-pending',
              kind: kind,
              version: 1,
              payload: {'title': '未完成保留', 'done': false},
            ),
          ]);
        final controller = WorkspaceController(repository);
        await controller.start();
        await tester.pumpWidget(
          app(
            Scaffold(
              body: CollectionPage(controller: controller, kind: kind),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('过去已完成'), findsNothing);
        expect(find.text('未完成保留'), findsOneWidget);
        await tester.tap(find.byType(DropdownButton<String>).last);
        await tester.pumpAndSettle();
        await tester.tap(find.text('已完成').last);
        await tester.pumpAndSettle();
        expect(find.text('过去已完成'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        controller.dispose();
      }
    },
  );

  testWidgets(
    'English/Japanese live inside the language hub with working navigation',
    (tester) async {
      final controller = WorkspaceController(FakeRepository());
      await controller.start();
      String? selected;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: LanguageHubPage(
              controller: controller,
              onNavigate: (page) => selected = page,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const ValueKey('open-en')));
      await tester.tap(find.byKey(const ValueKey('open-en')));
      expect(selected, 'en');
      await tester.ensureVisible(find.byKey(const ValueKey('open-ja')));
      await tester.tap(find.byKey(const ValueKey('open-ja')));
      expect(selected, 'ja');
      await tester.pumpWidget(
        app(
          WorkspaceFrame(
            controller: controller,
            page: 'ja',
            onNavigate: (_) {},
            onLogout: () {},
            child: const SizedBox(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(workspaceNavigation.singleWhere((e) => e.$1 == 'en').$4, '语言学习');
      expect(
        workspaceNavigation.singleWhere((e) => e.$1 == 'languages').$4,
        '学习与成长',
      );
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );

  for (final module in [
    'home',
    'knowledge',
    'languages',
    'en',
    'ja',
    'weekly_reviews',
    'applications',
    'watchlist_items',
    'industry_articles',
    'research',
    'data',
    'ai',
  ]) {
    testWidgets('$module opens on phone without layout exceptions', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = WorkspaceController(FakeRepository());
      await controller.start();
      final page = switch (module) {
        'home' => DashboardPage(controller: controller, onNavigate: (_) {}),
        'knowledge' => KnowledgePage(controller: controller),
        'languages' => LanguageHubPage(
          controller: controller,
          onNavigate: (_) {},
        ),
        'en' || 'ja' => LanguageFeatureFrame(
          language: module,
          onNavigate: (_) {},
          child: LearningPage(
            controller: controller,
            client: OfflineClient(),
            language: module,
          ),
        ),
        'weekly_reviews' => ReviewsPage(controller: controller),
        'applications' => CareerPage(controller: controller),
        'watchlist_items' => MarketPage(controller: controller),
        'industry_articles' => IndustryPage(controller: controller),
        'research' => ResearchPage(controller: controller),
        'data' => DataPage(controller: controller, userId: 'isolated'),
        _ => AIPage(controller: controller, client: OfflineClient()),
      };
      await tester.pumpWidget(
        app(
          WorkspaceFrame(
            controller: controller,
            page: module,
            onNavigate: (_) {},
            onLogout: () {},
            child: page,
          ),
        ),
      );
      await realAssets(tester);
      expect(tester.takeException(), isNull, reason: module);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    });
  }
}
