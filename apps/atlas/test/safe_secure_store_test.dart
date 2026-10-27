import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/safe_secure_store.dart';

void main() {
  test('Concurrent backup-key and session writes retain both values', () async {
    final gate = SecureStorageGate();
    var data = {'session': 'old-session'};
    Future<void> update(String key, String value) => gate.run(() async {
      final next = Map<String, String>.of(data);
      await Future<void>.delayed(const Duration(milliseconds: 2));
      next[key] = value;
      data = next;
    });
    await Future.wait([
      update('session', 'renewed-session'),
      update('backup-key', 'example-backup-key'),
    ]);
    expect(data, {
      'session': 'renewed-session',
      'backup-key': 'example-backup-key',
    });
    await expectLater(
      gate.run<void>(() async => throw StateError('disk failure')),
      throwsStateError,
    );
    expect(await gate.run(() async => data.length), 2);
  });

  test(
    'Separate storage gates coordinate file access and release after failure',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'workspace-secure-gate-',
      );
      try {
        final first = SecureStorageGate(
          useFileLock: true,
          directory: () async => root,
        );
        final second = SecureStorageGate(
          useFileLock: true,
          directory: () async => root,
        );
        var active = 0;
        Future<void> write(SecureStorageGate gate) => gate.run(() async {
          active++;
          expect(active, 1);
          await Future<void>.delayed(const Duration(milliseconds: 10));
          active--;
        });
        await Future.wait([write(first), write(second)]);
        await expectLater(
          first.run<void>(() async => throw StateError('failure')),
          throwsStateError,
        );
        expect(await second.run(() async => 'available'), 'available');
      } finally {
        if (!root.absolute.path.startsWith(
          '${Directory.systemTemp.absolute.path}${Platform.pathSeparator}workspace-secure-gate-',
        )) {
          throw StateError('Unexpected cleanup path');
        }
        await root.delete(recursive: true);
      }
    },
    skip: !Platform.isWindows,
  );
}
