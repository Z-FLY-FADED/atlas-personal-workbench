import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:atlas_workspace/core/app_version.dart';
import 'package:atlas_workspace/features/updates/update_manifest.dart';
import 'package:atlas_workspace/features/updates/update_service.dart';
import 'package:atlas_workspace/features/updates/update_compatibility.dart';
import 'helpers/update_fixture.dart';

void main() {
  test(
    'Backend, app identity, signing and data schema must remain compatible',
    () {
      final expected = List.filled(64, 'b').join();
      expect(
        UpdateManifest.parse(
          updateFixture(),
          backendHash: expected,
        ).buildNumber,
        10,
      );
      for (final entry in [
        ('dataSchema', 2),
        ('backendSha256', List.filled(64, 'c').join()),
        ('androidApplicationId', 'other.app'),
        ('androidSigningSha256', List.filled(64, 'c').join()),
        ('windowsProductName', 'OtherApp'),
        ('windowsCompanyName', 'other.company'),
      ]) {
        final broken = updateFixture();
        (broken['dataCompatibility'] as Map)[entry.$1] = entry.$2;
        expect(
          () => UpdateManifest.parse(broken, backendHash: expected),
          throwsA(isA<UpdateCompatibilityException>()),
        );
      }
    },
  );
  if (Platform.environment['WORKSPACE_VERIFY_LIVE_UPDATE'] == '1') {
    test(
      'Published endpoint supports checking from an older installed version',
      () async {
        final endpoint = AppUpdateService.defaultEndpoint.replace(
          queryParameters: {
            'verify': DateTime.now().millisecondsSinceEpoch.toString(),
          },
        );
        final latest = await AppUpdateService(endpoint: endpoint).fetch();
        expect(
          latest.version.compareTo(AppVersion.parse('0.5.2')),
          greaterThanOrEqualTo(0),
        );
        expect(
          latest.isNewerThan(InstalledAppVersion(AppVersion.parse('0.5.1'), 8)),
          isTrue,
        );
        expect(latest.platforms.keys.toSet(), UpdatePlatform.values.toSet());
      },
    );
  }
  test(
    'Version ordering handles multi-digit parts, prereleases and metadata',
    () {
      for (final pair in [
        ('0.5.10', '0.5.2'),
        ('1.0.0', '1.0.0-rc.1'),
        ('1.0.0-rc.10', '1.0.0-rc.2'),
        ('1.0.0-alpha.a', '1.0.0-alpha.2'),
        ('1.0.0-alpha.1', '1.0.0-alpha'),
      ]) {
        expect(
          AppVersion.parse(pair.$1).compareTo(AppVersion.parse(pair.$2)),
          greaterThan(0),
        );
      }
      expect(
        AppVersion.parse('1.2.3+9').compareTo(AppVersion.parse('1.2.3+8')),
        0,
      );
      for (final value in ['1.2', '01.2.3', '1.2.3-01', 'invalid', '-1.2.3']) {
        expect(() => AppVersion.parse(value), throwsFormatException);
      }
    },
  );

  test(
    'Same-version build updates are detected and older versions never downgrade',
    () {
      final installed = InstalledAppVersion(AppVersion.parse('0.5.2'), 9);
      expect(
        UpdateManifest.parse(
          updateFixture(version: '0.5.2', build: 10),
        ).isNewerThan(installed),
        isTrue,
      );
      expect(
        UpdateManifest.parse(
          updateFixture(version: '0.5.2', build: 9),
        ).isNewerThan(installed),
        isFalse,
      );
      expect(
        UpdateManifest.parse(
          updateFixture(version: '0.5.1', build: 100),
        ).isNewerThan(installed),
        isFalse,
      );
    },
  );

  test('Download metadata includes separate Windows and Android assets', () {
    final release = UpdateManifest.parse(updateFixture());
    expect(
      release.platforms[UpdatePlatform.windows]!.url.path,
      endsWith('Windows-x64.zip'),
    );
    expect(
      release.platforms[UpdatePlatform.android]!.url.path,
      endsWith('Android.apk'),
    );
    final partial = updateFixture();
    (partial['platforms'] as Map).remove('windows');
    expect(
      UpdateManifest.parse(partial).platforms[UpdatePlatform.windows],
      isNull,
    );
  });

  test('Only matching HTTPS downloads in the configured repository are accepted', () {
    for (final url in [
      'http://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v0.6.0',
      'https://github.com.evil.test/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v0.6.0',
      'https://github.com/other/repository/releases/tag/v0.6.0',
      'https://someone@github.com/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v0.6.0',
      'https://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v0.5.1',
      'javascript:alert(1)',
    ]) {
      expect(
        () => UpdateManifest.parse(updateFixture()..['releaseUrl'] = url),
        throwsFormatException,
      );
    }
    final broken = updateFixture();
    ((broken['platforms'] as Map)['windows'] as Map)['url'] =
        'https://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/download/v0.6.0/WorkSpace-0.6.0-Android.apk';
    expect(() => UpdateManifest.parse(broken), throwsFormatException);
  });

  test(
    'Incomplete or unknown manifests cannot masquerade as valid updates',
    () {
      for (final entry in [
        ('schemaVersion', 2),
        ('buildNumber', 0),
        ('channel', 'unknown'),
        ('publishedAt', 'invalid'),
      ]) {
        expect(
          () => UpdateManifest.parse(updateFixture()..[entry.$1] = entry.$2),
          throwsFormatException,
        );
      }
      for (final entry in [('sha256', 'bad'), ('sizeBytes', -1)]) {
        final broken = updateFixture();
        ((broken['platforms'] as Map)['windows'] as Map)[entry.$1] = entry.$2;
        expect(() => UpdateManifest.parse(broken), throwsFormatException);
      }
    },
  );

  test(
    'Update requests contain no account credentials and parse a valid response',
    () async {
      final service = AppUpdateService(
        client: MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.headers.containsKey('authorization'), isFalse);
          expect(request.headers.containsKey('apikey'), isFalse);
          expect(request.followRedirects, isFalse);
          return updateResponse(updateFixture());
        }),
      );
      expect((await service.fetch()).version.text, '0.6.0');
    },
  );

  test(
    'Network errors, redirects and malformed JSON remain visible failures',
    () async {
      for (final response in [
        http.Response('', 503),
        http.Response('', 302),
        http.Response('not json', 200),
      ]) {
        final service = AppUpdateService(
          client: MockClient((_) async => response),
        );
        await expectLater(service.fetch(), throwsFormatException);
      }
      final insecure = AppUpdateService(
        endpoint: Uri.parse('http://example.test/latest.json'),
      );
      await expectLater(insecure.fetch(), throwsFormatException);
    },
  );

  test(
    'Oversized responses are rejected even without a content length',
    () async {
      final transport = MockClient.streaming(
        (_, _) async => http.StreamedResponse(
          Stream.fromIterable([List.filled(40000, 32), List.filled(40000, 32)]),
          200,
        ),
      );
      await expectLater(
        AppUpdateService(client: transport).fetch(),
        throwsFormatException,
      );
    },
  );

  test('A stalled update request has a bounded timeout', () async {
    final pending = Completer<http.Response>();
    final service = AppUpdateService(
      client: MockClient((_) => pending.future),
      timeout: const Duration(milliseconds: 10),
    );
    await expectLater(service.fetch(), throwsA(isA<TimeoutException>()));
    pending.complete(updateResponse(updateFixture()));
  });
}
