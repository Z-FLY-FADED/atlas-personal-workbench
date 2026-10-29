import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/asset_catalog.dart';
import 'package:atlas_workspace/core/theme/atlas_theme.dart';
import 'package:atlas_workspace/features/career/career_filters.dart';
import 'package:atlas_workspace/features/career/career_page.dart';
import 'package:atlas_workspace/features/market/market_filters.dart';
import 'package:atlas_workspace/features/market/market_page.dart';
import 'package:atlas_workspace/features/market/quote_service.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/shared/models/list_filters.dart';
import 'package:atlas_workspace/shared/widgets/collection_page.dart';
import 'controller_test.dart' show FakeRepository;

const records = [
  WorkspaceEntity(
    id: 'a',
    kind: 'applications',
    version: 1,
    payload: {
      'company': '甲公司',
      'role': '机械研发',
      'status': '已投递',
      'channel': '官网',
      'applied_at': '2026-10-28',
    },
  ),
  WorkspaceEntity(
    id: 'b',
    kind: 'applications',
    version: 1,
    payload: {
      'company': '甲公司',
      'role': '控制测试',
      'status': '面试',
      'channel': 'BOSS',
      'applied_at': '2026-10-29',
    },
  ),
  WorkspaceEntity(
    id: 'c',
    kind: 'applications',
    version: 1,
    payload: {
      'company': '乙公司',
      'role': '机械研发',
      'status': '已投递',
      'channel': '官网',
      'applied_at': '',
    },
  ),
];
Future<void> choose(WidgetTester tester, String label, String value) async {
  final field = find
      .ancestor(
        of: find.text(label),
        matching: find.byType(DropdownButtonFormField<String>),
      )
      .first;
  await tester.ensureVisible(field);
  await tester.tap(field);
  await settle(tester);
  await tester.tap(find.text(value).last);
  await settle(tester);
}

Future<void> type(WidgetTester tester, String label, String text) async {
  final field = find.ancestor(
    of: find.text(label),
    matching: find.byType(TextFormField),
  );
  await tester.ensureVisible(field);
  await tester.enterText(field, text);
}

Future<void> settle(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 100)),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final evidence = Platform.environment['ATLAS_UI_EVIDENCE'];
  setUpAll(() async {
    await AssetCatalog.load();
    if (evidence != null) {
      final bytes = await File('C:/Windows/Fonts/msyh.ttc').readAsBytes();
      for (final family in ['Roboto', 'Microsoft YaHei UI']) {
        await (FontLoader(
          family,
        )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
      }
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    }
  });
  Widget host(Widget page, {GlobalKey? screenshotKey}) {
    final base = buildAtlasTheme();
    final theme = evidence == null
        ? base
        : base.copyWith(
            textTheme: base.textTheme.apply(fontFamily: 'Microsoft YaHei UI'),
            primaryTextTheme: base.primaryTextTheme.apply(
              fontFamily: 'Microsoft YaHei UI',
            ),
            chipTheme: base.chipTheme.copyWith(
              labelStyle: base.chipTheme.labelStyle?.copyWith(
                fontFamily: 'Microsoft YaHei UI',
              ),
            ),
          );
    final app = MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: theme,
      locale: const Locale('zh', 'CN'),
      supportedLocales: const [Locale('zh', 'CN')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: Scaffold(body: page),
    );
    return screenshotKey == null
        ? app
        : RepaintBoundary(key: screenshotKey, child: app);
  }

  Future<void> capture(WidgetTester tester, GlobalKey key, String name) async {
    if (evidence == null) return;
    await tester.runAsync(() async {
      final image =
          await (key.currentContext!.findRenderObject()!
                  as RenderRepaintBoundary)
              .toImage(pixelRatio: 1);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      await Directory(evidence).create(recursive: true);
      await File('$evidence/$name.png').writeAsBytes(png!.buffer.asUint8List());
    });
  }

  test(
    'Application filters combine with inclusive dates and keep undated records unless dates are active',
    () {
      const filters = ListFilters(
        values: {'company': '甲公司', 'status': '已投递', 'channel': '官网'},
        fromDay: '2026-10-28',
        toDay: '2026-10-28',
      );
      expect(
        records.where((e) => matchesApplication(e, filters)).map((e) => e.id),
        ['a'],
      );
      expect(matchesApplication(records.last, const ListFilters()), true);
      expect(
        matchesApplication(
          const WorkspaceEntity(
            id: 'invalid',
            kind: 'applications',
            payload: {'applied_at': '2026-02-30'},
          ),
          const ListFilters(fromDay: '2026-01-01'),
        ),
        false,
      );

      expect(
        matchesApplication(
          records.last,
          const ListFilters(fromDay: '2026-10-01'),
        ),
        false,
      );
      expect(
        matchesApplication(
          records.first,
          const ListFilters(toDay: '2026-10-27'),
        ),
        false,
      );
    },
  );
  test(
    'Multi-city jobs and match requirements do not turn missing requirements into complete matches',
    () {
      const job = {
        'industry': '制造',
        'function': '研发',
        'locations': ['上海', '深圳'],
        'education': '硕士',
      };
      expect(
        matchesJob(
          job,
          const ListFilters(
            values: {
              'industry': '制造',
              'location': '深圳',
              'education': '硕士',
              'match': 'matched',
            },
          ),
          matched: 1,
          missing: 2,
        ),
        true,
      );
      expect(
        matchesJob(
          job,
          const ListFilters(values: {'location': '北京'}),
          matched: 1,
          missing: 2,
        ),
        false,
      );
      expect(
        matchesJob(
          job,
          const ListFilters(values: {'match': 'complete'}),
          matched: 0,
          missing: 0,
        ),
        false,
      );
      expect(
        matchesJob(
          job,
          const ListFilters(values: {'match': 'complete'}),
          matched: 2,
          missing: 0,
        ),
        true,
      );
    },
  );
  test(
    'Stocks distinguish absent quotes from zero change and respect numeric price boundaries',
    () {
      const row = {'market': 'A股', 'industry': '汽车', 'risk': '中高'};
      const filters = ListFilters(
        values: {
          'market': 'A股',
          'industry': '汽车',
          'risk': '中高',
          'watched': 'yes',
          'direction': 'flat',
        },
        minPrice: 10,
        maxPrice: 10,
      );
      expect(
        matchesMarket(
          row,
          filters,
          watched: true,
          quote: {'price': 10, 'change': 0},
        ),
        true,
      );
      expect(matchesMarket(row, filters, watched: true), false);
      expect(
        matchesMarket(
          row,
          filters,
          watched: false,
          quote: {'price': 10, 'change': 0},
        ),
        false,
      );
      expect(
        matchesMarket(
          row,
          filters,
          watched: true,
          quote: {'price': 9, 'change': 0},
        ),
        false,
      );
      expect(
        matchesMarket(
          row,
          const ListFilters(values: {'quote': 'available'}),
          watched: true,
          quote: {'price': double.nan},
        ),
        false,
      );
      expect(
        matchesMarket(
          row,
          const ListFilters(values: {'direction': 'flat'}),
          watched: true,
          quote: {'price': 10, 'change': null},
        ),
        false,
      );
      expect(
        matchesMarket(
          row,
          const ListFilters(values: {'direction': 'up'}),
          watched: true,
          quote: {'price': 10, 'change': 1},
        ),
        true,
      );
    },
  );
  testWidgets(
    'Applications combine advanced filters, reject reversed dates, cancel and clear without changing records',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = FakeRepository()..rows.addAll(records);
      final c = WorkspaceController(repo);
      await c.start();
      await tester.pumpWidget(
        host(
          ListenableBuilder(
            listenable: c,
            builder: (_, child) => CollectionPage(
              controller: c,
              kind: 'applications',
              embedded: true,
            ),
          ),
        ),
      );
      await tester.tap(find.text('筛选'));
      await settle(tester);
      await choose(tester, '公司', '甲公司');
      await choose(tester, '投递进展', '已投递');
      await type(tester, '投递开始日期', '2026-10-29');
      await type(tester, '投递结束日期', '2026-10-28');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('结束日期不能早于开始日期'), findsOneWidget);
      await type(tester, '投递开始日期', '2026-10-28');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('共 1 条记录'), findsOneWidget);
      expect(find.text('乙公司'), findsNothing);
      await tester.tap(find.text('筛选 · 3'));
      await settle(tester);
      await choose(tester, '公司', '乙公司');
      await tester.tap(find.byTooltip('取消筛选'));
      await settle(tester);
      expect(find.text('共 1 条记录'), findsOneWidget);
      await tester.tap(find.text('筛选 · 3'));
      await settle(tester);
      await tester.tap(find.text('清空筛选'));
      await settle(tester);
      expect(find.text('共 3 条记录'), findsOneWidget);
      expect(repo.rows.map((e) => e.toJson()), records.map((e) => e.toJson()));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  testWidgets(
    'A remote refresh removing selected options keeps the filter narrow until reset',
    (tester) async {
      final repo = FakeRepository()..rows.addAll(records);
      final c = WorkspaceController(repo);
      await c.start();
      await tester.pumpWidget(
        host(
          ListenableBuilder(
            listenable: c,
            builder: (_, child) => CollectionPage(
              controller: c,
              kind: 'applications',
              embedded: true,
            ),
          ),
        ),
      );
      await tester.tap(find.text('筛选'));
      await settle(tester);
      await choose(tester, '公司', '乙公司');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('共 1 条记录'), findsOneWidget);
      repo.rows.removeWhere((e) => e.id == 'c');
      await c.refresh();
      await settle(tester);
      expect(find.text('共 0 条记录'), findsOneWidget);
      await tester.tap(find.text('筛选 · 1'));
      await settle(tester);
      expect(find.text('乙公司（当前无记录）'), findsOneWidget);
      await tester.tap(find.text('清空筛选'));
      await settle(tester);
      expect(find.text('共 2 条记录'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  testWidgets(
    'Jobs filter by industry and multi-city location while keeping search combinable',
    (tester) async {
      final c = WorkspaceController(FakeRepository());
      await c.start();
      await tester.pumpWidget(host(CareerPage(controller: c)));
      await settle(tester);
      await tester.tap(find.text('岗位与匹配'));
      await settle(tester);
      await tester.tap(find.text('筛选'));
      await settle(tester);
      await choose(tester, '行业', '科技');
      await choose(tester, '工作地点', '上海');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      final all = (AssetCatalog.cached!['jobs'] as List).cast<Map>();
      final expected = all
          .where(
            (j) =>
                j['industry'] == '科技' &&
                (j['locations'] as List).contains('上海'),
          )
          .length;
      expect(find.text('显示 $expected / ${all.length} 个岗位'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, '不存在的公司');
      await settle(tester);
      expect(find.text('显示 0 / ${all.length} 个岗位'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  testWidgets(
    'Stocks combine watchlist, quote direction and price; invalid numeric ranges stay editable',
    (tester) async {
      final all = (AssetCatalog.cached!['market'] as List).cast<Map>();
      final target = all.first;
      final repo = FakeRepository()
        ..rows.addAll([
          WorkspaceEntity(
            id: 'star',
            kind: 'watchlist_items',
            payload: {'instrument_id': QuoteService.identity(target)},
          ),
          WorkspaceEntity(
            id: 'cache',
            kind: 'workspace_settings',
            payload: {
              'key': 'market-cache',
              'value': {
                'source': 'test fixture',
                'fetched_at': '2026-10-29',
                'quotes': {
                  target['secid']: {'price': 10, 'change': 1},
                },
              },
            },
          ),
        ]);
      final c = WorkspaceController(repo);
      await c.start();
      await tester.pumpWidget(host(MarketPage(controller: c)));
      await settle(tester);
      await tester.tap(find.text('筛选'));
      await settle(tester);
      await choose(tester, '自选状态', '已自选');
      await choose(tester, '涨跌', '上涨');
      await type(tester, '价格下限（标的原币）', '20');
      await type(tester, '价格上限（标的原币）', '10');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('价格上限不能小于下限'), findsOneWidget);
      await type(tester, '价格下限（标的原币）', '10');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('显示 1 / ${all.length} 个标的'), findsOneWidget);
      await tester.tap(find.text('筛选 · 3'));
      await settle(tester);
      await tester.tap(find.text('清空筛选'));
      await settle(tester);
      expect(find.text('显示 ${all.length} / ${all.length} 个标的'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  testWidgets(
    'My watchlist filters legacy group references without dropping unknown instruments',
    (tester) async {
      final row = (AssetCatalog.cached!['market'] as List).cast<Map>().first;
      final repo = FakeRepository()
        ..rows.addAll([
          const WorkspaceEntity(
            id: 'group',
            legacyKey: 'legacy-group',
            kind: 'watchlists',
            payload: {'name': '长期观察'},
          ),
          WorkspaceEntity(
            id: 's1',
            kind: 'watchlist_items',
            payload: {
              'instrument_id': QuoteService.identity(row),
              'watchlist_id': 'legacy-group',
            },
          ),
          const WorkspaceEntity(
            id: 's2',
            kind: 'watchlist_items',
            payload: {'instrument_id': 'unknown-symbol'},
          ),
        ]);
      final c = WorkspaceController(repo);
      await c.start();
      await tester.pumpWidget(
        host(
          CollectionPage(
            controller: c,
            kind: 'watchlist_items',
            embedded: true,
          ),
        ),
      );
      await settle(tester);
      expect(find.text('共 2 条记录'), findsOneWidget);
      await tester.tap(find.text('筛选'));
      await settle(tester);
      await choose(tester, '自选分组', '长期观察');
      await tester.tap(find.text('应用筛选'));
      await settle(tester);
      expect(find.text('共 1 条记录'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      c.dispose();
    },
  );
  for (final width in [390.0, 1440.0]) {
    for (final page in ['applications', 'jobs', 'market']) {
      testWidgets('Filter panel $page fits $width', (tester) async {
        tester.view.physicalSize = Size(width, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final c = WorkspaceController(FakeRepository()..rows.addAll(records));
        await c.start();
        final key = GlobalKey();
        final content = page == 'applications'
            ? CollectionPage(
                controller: c,
                kind: 'applications',
                embedded: true,
              )
            : page == 'jobs'
            ? CareerPage(controller: c)
            : MarketPage(controller: c);
        await tester.pumpWidget(host(content, screenshotKey: key));
        await settle(tester);
        if (page == 'jobs') {
          await tester.tap(find.text('岗位与匹配'));
          await settle(tester);
        }
        await tester.tap(find.text('筛选'));
        await settle(tester);
        expect(tester.takeException(), isNull);
        await capture(tester, key, 'filters-$page-${width.toInt()}');
        await tester.pumpWidget(const SizedBox());
        c.dispose();
      });
    }
  }
}
