import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/theme/atlas_theme.dart';
import 'package:atlas_workspace/core/asset_catalog.dart';
import 'package:atlas_workspace/features/knowledge/knowledge_page.dart';
import 'package:atlas_workspace/features/learning/daily_lesson_page.dart';
import 'package:atlas_workspace/features/learning/language_hub_page.dart';
import 'package:atlas_workspace/features/knowledge/knowhow_view.dart';
import 'package:atlas_workspace/features/auth/login_page.dart';
import 'package:atlas_workspace/features/workspace/dashboard_page.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/workspace/workspace_frame.dart';
import 'package:atlas_workspace/shared/widgets/collection_page.dart';
import 'auth_test.dart' show TestAuthService;
import 'controller_test.dart' show FakeRepository;
import 'package:http/testing.dart';
import 'package:atlas_workspace/core/app_version.dart';
import 'package:atlas_workspace/features/updates/update_page.dart';
import 'package:atlas_workspace/features/updates/update_manifest.dart';
import 'package:atlas_workspace/features/updates/update_service.dart';
import 'helpers/update_fixture.dart';

// Fixtures stay in the test runner; they are never uploaded or shipped in the app.
FakeRepository previewRepository() => FakeRepository()
  ..rows.addAll([
    const WorkspaceEntity(
      id: 'profile',
      kind: 'profiles',
      payload: {'display_name': '体验账号', 'motto': '保持好奇，专注每一次小小的进步。'},
    ),
    const WorkspaceEntity(
      id: 'task1',
      kind: 'tasks',
      payload: {
        'title': '整理项目技术文档',
        'detail': '梳理关键问题，记录下一步的实施思路。',
        'priority': '优先',
        'horizon': '今日',
        'project_id': 'project1',
      },
    ),
    const WorkspaceEntity(
      id: 'task2',
      kind: 'tasks',
      payload: {'title': '阅读一篇专业资料并记录心得', 'priority': '一般', 'horizon': '本周'},
    ),
    const WorkspaceEntity(
      id: 'task3',
      kind: 'tasks',
      payload: {'title': '准备本周的进展回顾', 'priority': '一般', 'horizon': '本周'},
    ),
    const WorkspaceEntity(
      id: 'task4',
      kind: 'tasks',
      payload: {'title': '归档已完成的工作', 'done': true, 'horizon': '今日'},
    ),
    const WorkspaceEntity(
      id: 'project1',
      kind: 'projects',
      payload: {
        'title': '个人知识体系整理',
        'status': '进行中',
        'stage': '资料整理',
        'next_milestone': '完成第一阶段的分类',
        'progress': 35,
      },
    ),
    const WorkspaceEntity(
      id: 'project2',
      kind: 'projects',
      payload: {
        'title': '新工具探索与实践',
        'status': '进行中',
        'stage': '方案设计',
        'progress': 60,
      },
    ),
    const WorkspaceEntity(
      id: 'knowledge1',
      kind: 'knowledge',
      payload: {'title': '从问题出发，建立知识之间的联系', 'primary_category': '学习方法'},
    ),
    const WorkspaceEntity(
      id: 'knowledge2',
      kind: 'knowledge',
      payload: {'title': '项目复盘中的三个关键问题', 'primary_category': '项目管理'},
    ),
    const WorkspaceEntity(
      id: 'note1',
      kind: 'quick_notes',
      payload: {'content': '把零散的想法整理成可执行的下一步。', 'status': '待整理'},
    ),
  ]);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final evidence = Platform.environment['ATLAS_UI_EVIDENCE'];
  setUpAll(() async {
    await AssetCatalog.load();
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
    final codeFont = await File('C:/Windows/Fonts/consola.ttf').readAsBytes();
    await (FontLoader(
      'Consolas',
    )..addFont(Future.value(ByteData.sublistView(codeFont)))).load();
  });

  Future<void> capture(WidgetTester tester, GlobalKey key, String name) async {
    if (evidence == null) return;
    // Asset decoding runs outside the fake test clock. Wait for visible images
    // before capturing so the first screenshot includes the brand artwork.
    await tester.runAsync(() async {
      for (final element in find.byType(Image).evaluate()) {
        await precacheImage((element.widget as Image).image, element);
      }
    });
    await tester.pump();
    await tester.runAsync(() async {
      final boundary =
          key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 1.5);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory(evidence).create(recursive: true);
      await File(
        '$evidence/$name.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
      image.dispose();
    });
  }

  Widget application(GlobalKey key, Widget home, {double scale = 1}) =>
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
                  primaryTextTheme: buildAtlasTheme().primaryTextTheme.apply(
                    fontFamily: 'Microsoft YaHei UI',
                  ),
                  appBarTheme: buildAtlasTheme().appBarTheme.copyWith(
                    titleTextStyle: buildAtlasTheme().appBarTheme.titleTextStyle
                        ?.copyWith(fontFamily: 'Microsoft YaHei UI'),
                  ),
                  chipTheme: buildAtlasTheme().chipTheme.copyWith(
                    labelStyle: const TextStyle(
                      fontFamily: 'Microsoft YaHei UI',
                      fontSize: 12,
                      color: AtlasColors.text,
                    ),
                  ),
                ),
          locale: const Locale('zh', 'CN'),
          supportedLocales: const [Locale('zh', 'CN')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: home,
        ),
      );

  for (final (size, scale, name) in [
    (const Size(1440, 1000), 1.0, 'updates-desktop'),
    (const Size(390, 844), 1.0, 'updates-phone'),
    (const Size(360, 800), 1.4, 'updates-large-text'),
  ]) {
    testWidgets('Update details and downloads fit $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final key = GlobalKey();
      final service = AppUpdateService(
        client: MockClient((_) async => updateResponse(updateFixture())),
      );
      await tester.pumpWidget(
        application(
          key,
          Scaffold(
            body: AppUpdatePage(
              service: service,
              versionLoader: () async =>
                  InstalledAppVersion(AppVersion.parse('0.5.2'), 9),
              platform: size.width > 800
                  ? UpdatePlatform.windows
                  : UpdatePlatform.android,
              openUrl: (_) async => true,
              beforeDownload: () async => '已完成更新前加密备份，共 31 条记录。',
              exportBackup: () async => true,
            ),
          ),
          scale: scale,
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('检查更新'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      expect(find.text('有新版本可以更新'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      if (size.width < 800) {
        await tester.ensureVisible(find.text('下载更新'));
        await tester.pumpAndSettle();
        await capture(tester, key, '$name-download');
      }
    });
  }

  for (final (size, scale, name) in [
    (const Size(1440, 1000), 1.0, 'dashboard-desktop'),
    (const Size(390, 844), 1.0, 'dashboard-phone'),
    (const Size(768, 1024), 1.0, 'dashboard-tablet'),
    (const Size(360, 800), 1.4, 'dashboard-large-text'),
  ]) {
    testWidgets('Workspace navigation and dashboard fit $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = WorkspaceController(previewRepository());
      await controller.start();
      var page = 'home';
      final key = GlobalKey();
      await tester.pumpWidget(
        application(
          key,
          StatefulBuilder(
            builder: (context, setState) => WorkspaceFrame(
              controller: controller,
              page: page,
              userName: '体验账号',
              onNavigate: (value) => setState(() => page = value),
              onLogout: () {},
              child: page == 'home'
                  ? DashboardPage(
                      controller: controller,
                      onNavigate: (value) => setState(() => page = value),
                    )
                  : CollectionPage(controller: controller, kind: page),
            ),
          ),
          scale: scale,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('待推进任务'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      if (size.width < 1080) {
        await tester.tap(find.byIcon(Icons.grid_view_rounded));
        await tester.pumpAndSettle();
        expect(find.byType(Drawer), findsOneWidget);
        await tester.scrollUntilVisible(
          find.text('数据与恢复'),
          200,
          scrollable: find.descendant(
            of: find.byType(Drawer),
            matching: find.byType(Scrollable),
          ),
        );
        await tester.tap(find.text('数据与恢复'));
        await tester.pumpAndSettle();
        expect(page, 'data');
        expect(find.byType(Drawer), findsNothing);
        expect(tester.takeException(), isNull);
      }
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    });
  }

  for (final (size, name) in [
    (const Size(1365, 900), 'login-desktop'),
    (const Size(390, 844), 'login-phone'),
  ]) {
    testWidgets('Username form remains usable on $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final key = GlobalKey();
      await tester.pumpWidget(
        application(key, LoginPage(auth: TestAuthService())),
      );
      await tester.pumpAndSettle();
      expect(find.byType(TextFormField), findsNWidgets(2));
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      if (size.width < 600) {
        tester.view.viewInsets = const FakeViewPadding(bottom: 300);
        await tester.tap(find.byType(TextFormField).last);
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.widgetWithText(FilledButton, '登录'));
        expect(tester.takeException(), isNull);
        tester.view.resetViewInsets();
      }
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('Task search can be cleared without hiding records', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = WorkspaceController(previewRepository());
    await controller.start();
    final key = GlobalKey();
    Widget tasks() => WorkspaceFrame(
      controller: controller,
      page: 'tasks',
      onNavigate: (_) {},
      onLogout: () {},
      child: CollectionPage(controller: controller, kind: 'tasks'),
    );
    await tester.pumpWidget(application(key, tasks()));
    await tester.pumpAndSettle();
    await capture(tester, key, 'tasks-phone');
    tester.view.physicalSize = const Size(360, 800);
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpWidget(application(key, tasks(), scale: 1.4));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '不存在的记录');
    await tester.pumpAndSettle();
    expect(find.text('没有匹配的记录'), findsOneWidget);
    await tester.tap(find.byTooltip('清空搜索'));
    await tester.pumpAndSettle();
    expect(find.text('整理项目技术文档'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });

  for (final (page, size, name) in [
    ('projects', const Size(1440, 1000), 'projects-desktop'),
    ('projects', const Size(390, 844), 'projects-phone'),
    ('quick_notes', const Size(1440, 1000), 'notes-desktop'),
    ('quick_notes', const Size(390, 844), 'notes-phone'),
    ('knowledge', const Size(1440, 1000), 'knowledge-desktop'),
    ('knowledge', const Size(390, 844), 'knowledge-phone'),
    ('en', const Size(1440, 1000), 'lesson-desktop'),
    ('home', const Size(1440, 1000), 'dashboard-empty-desktop'),
  ]) {
    testWidgets('Content-specific warm layout fits $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = WorkspaceController(
        page == 'home' ? FakeRepository() : previewRepository(),
      );
      await controller.start();
      final key = GlobalKey();
      final body = switch (page) {
        'knowledge' => KnowledgePage(controller: controller),
        'en' => DailyLessonPage(language: 'en', controller: controller),
        'home' => DashboardPage(controller: controller, onNavigate: (_) {}),
        _ => CollectionPage(controller: controller, kind: page),
      };
      await tester.pumpWidget(
        application(
          key,
          WorkspaceFrame(
            controller: controller,
            page: page,
            onNavigate: (_) {},
            onLogout: () {},
            child: body,
          ),
        ),
      );
      if (page == 'knowledge' || page == 'en') {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 300)),
        );
        await tester.pump();
      }
      await tester.pumpAndSettle();
      if (page == 'knowledge') {
        await tester.tap(find.text('Know-how').first);
        await tester.pump(const Duration(milliseconds: 400));
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 300)),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        // The target tab is built after its page animation completes. Allow its
        // cached asset future and image codecs to resolve outside the fake clock.
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 300)),
        );
        await tester.pump();
        await tester.pumpAndSettle();
        await tester.runAsync(() async {
          final context = tester.element(find.byType(KnowledgePage));
          await Future.wait(
            ['机械', '机器人', '嵌入式', '系统', '通用'].map(
              (category) => precacheImage(
                AssetImage('assets/images/${knowledgeCover(category)}'),
                context,
              ),
            ),
          );
        });
        await tester.pump();
        expect(find.text('打开阅读'), findsWidgets);
      }
      if (page == 'projects') expect(find.text('35%'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    });
  }

  for (final (size, scale, name) in [
    (const Size(1440, 1000), 1.0, 'knowhow-reader-desktop'),
    (const Size(390, 844), 1.0, 'knowhow-reader-phone'),
    (const Size(360, 800), 1.4, 'knowhow-reader-large-text'),
  ]) {
    testWidgets('Know-how reader diagrams and steps fit $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = WorkspaceController(FakeRepository());
      await controller.start();
      final catalog = await tester.runAsync(AssetCatalog.load);
      final book = Map<String, dynamic>.from(
        (catalog!['knowledge'] as List).first as Map,
      );
      final key = GlobalKey();
      await tester.pumpWidget(
        application(
          key,
          KnowledgeReaderPage(controller: controller, payload: book),
          scale: scale,
        ),
      );
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 200)),
      );
      await tester.pumpAndSettle();
      expect(find.byType(KnowhowView), findsOneWidget);
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      await tester.ensureVisible(find.text('看图理解'));
      await tester.pumpAndSettle();
      await capture(tester, key, '$name-diagram');
      await tester.ensureVisible(find.byKey(const ValueKey('knowhow-step-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('knowhow-step-1')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 4 · 生成初始轨迹'), findsOneWidget);
      await tester.ensureVisible(find.text('按步骤动手'));
      await tester.pumpAndSettle();
      await capture(tester, key, '$name-steps');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    });
  }

  for (final (size, scale, name) in [
    (const Size(1440, 1000), 1.0, 'languages-desktop'),
    (const Size(390, 844), 1.0, 'languages-phone'),
    (const Size(360, 800), 1.4, 'languages-large-text'),
  ]) {
    testWidgets('Language hub fits $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = WorkspaceController(previewRepository());
      await controller.start();
      final key = GlobalKey();
      await tester.pumpWidget(
        application(
          key,
          WorkspaceFrame(
            controller: controller,
            page: 'languages',
            onNavigate: (_) {},
            onLogout: () {},
            child: LanguageHubPage(controller: controller, onNavigate: (_) {}),
          ),
          scale: scale,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await capture(tester, key, name);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    });
  }
  testWidgets('Workspace search opens the matching saved record', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1440, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = WorkspaceController(previewRepository());
    await controller.start();
    await tester.pumpWidget(
      application(
        GlobalKey(),
        WorkspaceFrame(
          controller: controller,
          page: 'home',
          onNavigate: (_) {},
          onLogout: () {},
          child: DashboardPage(controller: controller, onNavigate: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.descendant(
        of: find.byType(Dialog),
        matching: find.byType(TextField),
      ),
      '技术文档',
    );
    await tester.pumpAndSettle();
    final result = find.descendant(
      of: find.byType(Dialog),
      matching: find.text('整理项目技术文档'),
    );
    expect(result, findsOneWidget);
    await tester.tap(result);
    await tester.pumpAndSettle();
    expect(find.byType(EntityDetailPage), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });
}
