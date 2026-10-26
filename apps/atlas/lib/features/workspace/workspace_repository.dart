import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'entity.dart';

abstract class WorkspaceRepository {
  Future<List<WorkspaceEntity>> load();
  Stream<void> changes();
  Future<WorkspaceEntity> save(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
  );
  Future<void> setDeleted(WorkspaceEntity entity, bool deleted);
  Future<int> importRows(List<Map<String, dynamic>> rows);
  Future<void> reviewCard(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
    Map<String, dynamic> log,
  );
  Future<void> dispose();
}

class SupabaseWorkspaceRepository implements WorkspaceRepository {
  SupabaseWorkspaceRepository(this.client, this.userId);
  final SupabaseClient client;
  final String userId;
  RealtimeChannel? _channel;
  final _events = StreamController<void>.broadcast();
  bool _disposed = false;

  void _checkUser() {
    if (_disposed || client.auth.currentUser?.id != userId) {
      throw StateError('账号已改变，请重新加载。');
    }
  }

  @override
  Future<List<WorkspaceEntity>> load() async {
    _checkUser();
    final rows = <WorkspaceEntity>[];
    for (var offset = 0; ; offset += 500) {
      final batch = await client
          .from('atlas_entities')
          .select()
          .eq('user_id', userId)
          .order('id')
          .range(offset, offset + 499)
          .timeout(const Duration(seconds: 25));
      _checkUser();
      rows.addAll(batch.map(WorkspaceEntity.fromJson));
      if (batch.length < 500) break;
    }
    return rows;
  }

  @override
  Stream<void> changes() {
    _checkUser();
    _channel ??= client
        .channel('atlas:$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'atlas_entities',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (_) {
            if (!_disposed) _events.add(null);
          },
        )
        .subscribe((status, error) {
          if (!_disposed && status == RealtimeSubscribeStatus.subscribed) {
            _events.add(null);
          }
        });
    return _events.stream;
  }

  @override
  Future<WorkspaceEntity> save(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
  ) async {
    _checkUser();
    final result = await client
        .rpc(
          'atlas_save_entity',
          params: {
            'p_id': entity.id,
            'p_kind': entity.kind,
            'p_payload': payload,
            'p_version': entity.version,
          },
        )
        .timeout(const Duration(seconds: 25));
    _checkUser();
    final row = result is List && result.length == 1 ? result.single : result;
    if (row is! Map) {
      throw StateError('云端已响应，但未返回更新记录。请刷新核对保存结果。');
    }
    return WorkspaceEntity.fromJson(Map<String, dynamic>.from(row));
  }

  @override
  Future<void> setDeleted(WorkspaceEntity entity, bool deleted) async {
    _checkUser();
    await client
        .rpc(
          'atlas_set_deleted',
          params: {
            'p_id': entity.id,
            'p_version': entity.version,
            'p_deleted': deleted,
          },
        )
        .timeout(const Duration(seconds: 25));
    _checkUser();
  }

  @override
  Future<int> importRows(List<Map<String, dynamic>> rows) async {
    _checkUser();
    final result = await client
        .rpc('atlas_import_entities', params: {'p_rows': rows})
        .timeout(const Duration(seconds: 60));
    _checkUser();
    return (result as num).toInt();
  }

  @override
  Future<void> reviewCard(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
    Map<String, dynamic> log,
  ) async {
    _checkUser();
    await client
        .rpc(
          'atlas_review_card',
          params: {
            'p_id': entity.id,
            'p_version': entity.version,
            'p_payload': payload,
            'p_log': log,
          },
        )
        .timeout(const Duration(seconds: 25));
    _checkUser();
  }

  @override
  Future<void> dispose() async {
    _disposed = true;
    if (_channel != null) await client.removeChannel(_channel!);
    await _events.close();
  }
}
