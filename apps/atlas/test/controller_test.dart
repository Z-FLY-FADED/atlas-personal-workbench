import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/workspace/workspace_repository.dart';

class FakeRepository implements WorkspaceRepository {
  final events = StreamController<void>.broadcast();
  final List<WorkspaceEntity> rows = [];
  Object? failure;
  Completer<List<WorkspaceEntity>>? pending;
  bool disposed = false;
  @override
  Future<List<WorkspaceEntity>> load() async {
    if (pending != null) return pending!.future;
    if (failure != null) throw failure!;
    return List.of(rows);
  }

  @override
  Stream<void> changes() => events.stream;
  @override
  Future<WorkspaceEntity> save(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
  ) async {
    if (failure != null) throw failure!;
    final index = rows.indexWhere((e) => e.id == entity.id);
    if (index >= 0 && rows[index].version != entity.version) {
      throw const PostgrestException(message: 'conflict', code: '40001');
    }
    if (index < 0 && entity.version != 0) {
      throw const PostgrestException(message: 'missing', code: '40001');
    }
    final result = WorkspaceEntity(
      id: entity.id,
      kind: entity.kind,
      payload: Map.of(payload),
      version: entity.version + 1,
      updatedAt: DateTime.now().toUtc(),
      legacyKey: entity.legacyKey,
    );
    if (index < 0) {
      rows.add(result);
    } else {
      rows[index] = result;
    }
    return result;
  }

  @override
  Future<void> setDeleted(WorkspaceEntity entity, bool deleted) async {
    if (failure != null) throw failure!;
    final index = rows.indexWhere(
      (e) => e.id == entity.id && e.version == entity.version,
    );
    if (index < 0) throw StateError('Revision conflict');
    rows[index] = WorkspaceEntity(
      id: entity.id,
      kind: entity.kind,
      payload: entity.payload,
      version: entity.version + 1,
      legacyKey: entity.legacyKey,
      updatedAt: DateTime.now().toUtc(),
      deletedAt: deleted ? DateTime.now().toUtc() : null,
    );
  }

  @override
  Future<int> importRows(List<Map<String, dynamic>> imports) async {
    if (failure != null) throw failure!;
    var count = 0;
    for (final row in imports) {
      if (rows.any(
        (e) => e.kind == row['kind'] && e.legacyKey == row['legacy_key'],
      )) {
        continue;
      }
      if (row['source_id'] != null &&
          rows.any((e) => e.id == row['source_id'])) {
        continue;
      }
      rows.add(
        WorkspaceEntity(
          id: 'import-${rows.length}',
          kind: row['kind'] as String,
          legacyKey: row['legacy_key'] as String?,
          payload: Map<String, dynamic>.from(row['payload'] as Map),
          version: 1,
        ),
      );
      count++;
    }
    return count;
  }

  @override
  Future<void> reviewCard(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
    Map<String, dynamic> log,
  ) async {
    await save(entity, payload);
    rows.add(
      WorkspaceEntity(
        id: 'review-${rows.length}',
        kind: 'learning_logs',
        payload: log,
        version: 1,
      ),
    );
  }

  @override
  Future<void> dispose() async {
    disposed = true;
    await events.close();
  }
}

void main() {
  test('Failed writes do not pretend to save locally', () async {
    final repo = FakeRepository();
    final c = WorkspaceController(repo);
    await c.start();
    repo.failure = StateError('offline');
    await expectLater(
      c.save(c.create('tasks'), {'title': 'unsaved'}),
      throwsStateError,
    );
    expect(c.items('tasks'), isEmpty);
    expect(c.saving, false);
    c.dispose();
  });
  test(
    'Read failure keeps last successful view and marks it disconnected',
    () async {
      final repo = FakeRepository()
        ..rows.add(
          const WorkspaceEntity(
            id: 'a',
            kind: 'tasks',
            payload: {'title': 'saved'},
          ),
        );
      final c = WorkspaceController(repo);
      await c.start();
      repo.failure = StateError('offline');
      await c.refresh();
      expect(c.items('tasks'), hasLength(1));
      expect(c.connected, false);
      expect(c.error, isNotNull);
      c.dispose();
    },
  );
  test(
    'Logout/disposal discards late responses and clears account data',
    () async {
      final repo = FakeRepository()
        ..pending = Completer<List<WorkspaceEntity>>();
      final c = WorkspaceController(repo);
      final start = c.start();
      c.dispose();
      repo.pending!.complete([
        const WorkspaceEntity(id: 'old', kind: 'tasks', payload: {}),
      ]);
      await start;
      expect(c.all, isEmpty);
      expect(repo.disposed, true);
    },
  );
}
