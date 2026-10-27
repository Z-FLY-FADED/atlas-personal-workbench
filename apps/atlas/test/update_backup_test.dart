import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/features/updates/update_backup.dart';
import 'package:atlas_workspace/features/workspace/catalog.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/data/archive_service.dart';
import 'controller_test.dart' show FakeRepository;

void main() {
  late Directory root;
  late Map<String, String> keys;
  setUp(() async {
    root = await Directory.systemTemp.createTemp('workspace-update-backup-');
    keys = {};
  });
  tearDown(() async {
    final target = root.absolute.path;
    if (!target.startsWith(
      '${Directory.systemTemp.absolute.path}${Platform.pathSeparator}workspace-update-backup-',
    )) {
      throw StateError('Unexpected test cleanup path');
    }
    await root.delete(recursive: true);
  });
  UpdateBackupStore store(String scope) => UpdateBackupStore(
    scope: scope,
    directory: () async => root,
    readKey: (key) async => keys[key],
    writeKey: (key, value) async {
      keys[key] = value;
    },
  );
  List<WorkspaceEntity> records() => [
    for (var i = 0; i < entityKinds.length; i++)
      WorkspaceEntity(
        id: '00000000-0000-4000-8000-${i.toString().padLeft(12, '0')}',
        kind: entityKinds.elementAt(i),
        legacyKey: 'legacy-$i',
        version: 4,
        deletedAt: i == 0 ? DateTime.utc(2026, 10, 26) : null,
        payload: {
          'title': '内容 $i',
          'content': '中文正文与编辑记录',
          'completed_dates': ['2026-10-26'],
          'nested': {'status': '保留', 'value': 42},
        },
      ),
  ];

  test(
    'Every business collection survives encrypted backup and app restart',
    () async {
      final original = records();
      final before = jsonEncode(original.map((e) => e.toJson()).toList());
      final receipt = await store('project-a|owner-a').create(original);
      expect(receipt.records, entityKinds.length);
      expect(
        utf8.decode(await File(receipt.path).readAsBytes()),
        isNot(contains('中文正文')),
      );
      // A fresh instance represents the same account after replacing the app.
      final restored = ArchiveService.parse(
        await store('project-a|owner-a').readLatest(),
      );
      expect(restored.length, original.length);
      for (var i = 0; i < original.length; i++) {
        expect(restored[i]['kind'], original[i].kind);
        expect(restored[i]['source_id'], original[i].id);
        expect(restored[i]['legacy_key'], original[i].legacyKey);
        expect(restored[i]['payload'], original[i].payload);
        expect(
          restored[i]['deleted_at'],
          original[i].deletedAt?.toUtc().toIso8601String(),
        );
      }
      expect(jsonEncode(original.map((e) => e.toJson()).toList()), before);
      expect(keys.length, 1);
    },
  );

  test(
    'New snapshots retain previous backups and the existing encryption key',
    () async {
      final account = store('project-a|owner-a');
      final first = await account.create(records());
      final key = keys.values.single;
      final second = await account.create([
        const WorkspaceEntity(
          id: 'new',
          kind: 'quick_notes',
          payload: {'content': '新内容'},
        ),
      ]);
      expect(first.path, isNot(second.path));
      expect(await File(first.path).exists(), isTrue);
      expect(keys.values.single, key);
      expect(
        ArchiveService.parse(await account.readLatest()).single['payload'],
        {'content': '新内容'},
      );
    },
  );

  test('Another account or backend cannot read the saved backup', () async {
    await store('project-a|owner-a').create(records());
    await expectLater(
      store('project-a|owner-b').readLatest(),
      throwsStateError,
    );
    await expectLater(
      store('project-b|owner-a').readLatest(),
      throwsStateError,
    );
  });

  test(
    'Unreadable storage and missing secure keys fail without replacing data',
    () async {
      final original = records();
      final collision = File('${root.path}/not-a-directory');
      await collision.writeAsString('preserve');
      final blocked = UpdateBackupStore(
        scope: 'owner',
        directory: () async => Directory(collision.path),
        readKey: (key) async => null,
        writeKey: (key, value) async {},
      );
      await expectLater(
        blocked.create(original),
        throwsA(isA<FileSystemException>()),
      );
      expect(await collision.readAsString(), 'preserve');
      final unusableKey = UpdateBackupStore(
        scope: 'owner',
        directory: () async => root,
        readKey: (_) async => null,
        writeKey: (_, _) async {},
      );
      await expectLater(unusableKey.create(original), throwsStateError);
      expect(original.length, entityKinds.length);
    },
  );

  test(
    'Pending saves, unsaved focus and offline refresh pause update preparation',
    () async {
      final repository = FakeRepository()..rows.addAll(records());
      final controller = WorkspaceController(repository);
      await controller.refresh();
      final protection = UpdateProtection(
        controller,
        store('project-a|owner-a'),
      );
      controller.saving = true;
      await expectLater(
        protection.prepare(),
        throwsA(isA<UpdateProtectionException>()),
      );
      controller.saving = false;
      controller.startFocus();
      await expectLater(
        protection.prepare(),
        throwsA(isA<UpdateProtectionException>()),
      );
      controller.dispose();
      expect(keys, isEmpty);
      final offline = WorkspaceController(
        FakeRepository()..failure = StateError('offline'),
      )..loading = false;
      await expectLater(
        UpdateProtection(offline, store('offline')).prepare(),
        throwsA(isA<UpdateProtectionException>()),
      );
      offline.dispose();
      expect(keys, isEmpty);
    },
  );

  test(
    'Update preparation only reads the repository and creates a recoverable snapshot',
    () async {
      final repository = FakeRepository()..rows.addAll(records());
      final controller = WorkspaceController(repository);
      await controller.refresh();
      final original = jsonEncode(
        repository.rows.map((e) => e.toJson()).toList(),
      );
      final protection = UpdateProtection(
        controller,
        store('project-a|owner-a'),
      );
      await protection.prepare();
      expect(
        jsonEncode(repository.rows.map((e) => e.toJson()).toList()),
        original,
      );
      expect(
        ArchiveService.parse(await protection.store.readLatest()).length,
        entityKinds.length,
      );
      controller.dispose();
    },
  );
}
