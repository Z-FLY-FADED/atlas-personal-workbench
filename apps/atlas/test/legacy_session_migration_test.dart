import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/legacy_session_migration.dart';

void main() {
  late Directory sandbox;
  setUp(() async {
    sandbox = await Directory.systemTemp.createTemp('workspace-brand-session-');
  });
  tearDown(() async {
    final root = sandbox.absolute.path;
    expect(
      root.startsWith(
        '${Directory.systemTemp.absolute.path}${Platform.pathSeparator}workspace-brand-session-',
      ),
      true,
    );
    await sandbox.delete(recursive: true);
  });

  test(
    'Renaming copies opaque storage bytes and retains the original',
    () async {
      final legacy = Directory('${sandbox.path}/ATLAS Personal Workspace');
      await legacy.create();
      final original = File('${legacy.path}/flutter_secure_storage.dat');
      final bytes = List<int>.generate(256, (i) => i);
      await original.writeAsBytes(bytes);
      final current = Directory('${sandbox.path}/WorkSpace');
      await migrateLegacySessionStorage(current);
      expect(
        await File('${current.path}/flutter_secure_storage.dat').readAsBytes(),
        bytes,
      );
      expect(await original.readAsBytes(), bytes);
    },
  );

  test(
    'Existing WorkSpace storage is never replaced by legacy storage',
    () async {
      final current = Directory('${sandbox.path}/WorkSpace');
      final legacy = Directory('${sandbox.path}/ATLAS Personal Workspace');
      await current.create();
      await legacy.create();
      await File(
        '${legacy.path}/flutter_secure_storage.dat',
      ).writeAsBytes([1, 2, 3]);
      final target = File('${current.path}/flutter_secure_storage.dat');
      await target.writeAsBytes([9, 8, 7]);
      await migrateLegacySessionStorage(current);
      expect(await target.readAsBytes(), [9, 8, 7]);
    },
  );

  test(
    'A fresh installation does not create an artificial login store',
    () async {
      final current = Directory('${sandbox.path}/WorkSpace');
      await migrateLegacySessionStorage(current);
      expect(
        await File('${current.path}/flutter_secure_storage.dat').exists(),
        false,
      );
    },
  );
}
