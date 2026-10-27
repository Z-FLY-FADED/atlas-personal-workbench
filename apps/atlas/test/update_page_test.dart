import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:atlas_workspace/core/app_version.dart';
import 'package:atlas_workspace/core/theme/atlas_theme.dart';
import 'package:atlas_workspace/features/updates/update_manifest.dart';
import 'package:atlas_workspace/features/updates/update_page.dart';
import 'package:atlas_workspace/features/updates/update_service.dart';
import 'helpers/update_fixture.dart';
import 'package:atlas_workspace/features/updates/update_backup.dart';

Future<InstalledAppVersion> installed() async =>
    InstalledAppVersion(AppVersion.parse('0.5.2'), 9);
Widget application(Widget child, {double scale = 1}) => MaterialApp(
  theme: buildAtlasTheme(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: child!,
  ),
  home: Scaffold(body: child),
);

void main() {
  testWidgets(
    'A failed pre-update backup pauses downloads and a retry keeps the account intact',
    (tester) async {
      var backups = 0, downloads = 0;
      final service = AppUpdateService(
        client: MockClient((_) async => updateResponse(updateFixture())),
      );
      await tester.pumpWidget(
        application(
          AppUpdatePage(
            service: service,
            versionLoader: installed,
            platform: UpdatePlatform.android,
            beforeDownload: () async {
              if (++backups == 1) {
                throw const UpdateProtectionException('请先完成保存并同步。');
              }
              return '已完成更新前加密备份，共 31 条记录。';
            },
            openUrl: (_) async {
              downloads++;
              return true;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      for (var i = 0; i < 2; i++) {
        await tester.ensureVisible(find.text('下载更新'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('下载更新'));
        await tester.pumpAndSettle();
        expect(downloads, i);
      }
      expect(backups, 2);
    },
  );

  testWidgets('Data-incompatible updates never expose a package download', (
    tester,
  ) async {
    final payload = updateFixture();
    (payload['dataCompatibility'] as Map)['androidApplicationId'] =
        'different.app';
    final service = AppUpdateService(
      client: MockClient((_) async => updateResponse(payload)),
    );
    await tester.pumpWidget(
      application(AppUpdatePage(service: service, versionLoader: installed)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('检查更新'));
    await tester.pumpAndSettle();
    expect(find.textContaining('数据兼容性尚未确认'), findsOneWidget);
    expect(find.text('下载更新'), findsNothing);
  });
  testWidgets(
    'Updates are checked only on request and same versions show no download',
    (tester) async {
      var requests = 0;
      final service = AppUpdateService(
        client: MockClient((_) async {
          requests++;
          return updateResponse(updateFixture(version: '0.5.2', build: 9));
        }),
      );
      await tester.pumpWidget(
        application(AppUpdatePage(service: service, versionLoader: installed)),
      );
      await tester.pumpAndSettle();
      expect(requests, 0);
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      expect(requests, 1);
      expect(find.text('当前已是最新版本'), findsOneWidget);
      expect(find.text('下载更新'), findsNothing);
    },
  );

  for (final platform in UpdatePlatform.values) {
    testWidgets('New releases open the matching ${platform.name} package', (
      tester,
    ) async {
      final opened = <Uri>[];
      final service = AppUpdateService(
        client: MockClient((_) async => updateResponse(updateFixture())),
      );
      await tester.pumpWidget(
        application(
          AppUpdatePage(
            service: service,
            versionLoader: installed,
            platform: platform,
            openUrl: (url) async {
              opened.add(url);
              return true;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      expect(find.text('有新版本可以更新'), findsOneWidget);
      await tester.ensureVisible(find.text('下载更新'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('下载更新'));
      await tester.pumpAndSettle();
      expect(
        opened.single.path,
        endsWith(platform == UpdatePlatform.windows ? '.zip' : '.apk'),
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'Failed checks can retry and browser launch errors are reported',
    (tester) async {
      var requests = 0;
      final service = AppUpdateService(
        client: MockClient(
          (_) async => ++requests == 1
              ? http.Response('', 503)
              : updateResponse(updateFixture()),
        ),
      );
      await tester.pumpWidget(
        application(
          AppUpdatePage(
            service: service,
            versionLoader: installed,
            platform: UpdatePlatform.android,
            openUrl: (_) async => false,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      expect(find.textContaining('暂时无法检查更新'), findsOneWidget);
      await tester.tap(find.text('检查更新'));
      await tester.pumpAndSettle();
      expect(find.text('有新版本可以更新'), findsOneWidget);
      await tester.ensureVisible(find.text('下载更新'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('下载更新'));
      await tester.pumpAndSettle();
      expect(find.text('无法打开浏览器，请稍后重试。'), findsOneWidget);
    },
  );

  testWidgets('A pending check disables duplicate requests', (tester) async {
    final pending = Completer<http.Response>();
    var requests = 0;
    final service = AppUpdateService(
      client: MockClient((_) {
        requests++;
        return pending.future;
      }),
    );
    await tester.pumpWidget(
      application(AppUpdatePage(service: service, versionLoader: installed)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('检查更新'));
    await tester.pump();
    final button = tester.widget<FilledButton>(
      find.ancestor(
        of: find.text('正在检查…'),
        matching: find.byType(FilledButton),
      ),
    );
    expect(button.onPressed, isNull);
    expect(requests, 1);
    pending.complete(updateResponse(updateFixture()));
    await tester.pumpAndSettle();
  });

  testWidgets('Updates fit a narrow phone with larger text', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final service = AppUpdateService(
      client: MockClient((_) async => updateResponse(updateFixture())),
    );
    await tester.pumpWidget(
      application(
        AppUpdatePage(service: service, versionLoader: installed),
        scale: 1.4,
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('检查更新'));
    await tester.tap(find.text('检查更新'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('下载更新'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
