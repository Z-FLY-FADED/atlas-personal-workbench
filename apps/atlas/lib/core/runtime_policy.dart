import '../features/planning/planning.dart';
import '../features/workspace/entity.dart';

class RuntimePolicy {
  const RuntimePolicy(this.mode);
  final String mode;
  bool get allowsPublic => mode == 'public' || mode == 'ai';
  bool get allowsAI => mode == 'ai';
  static WorkspaceEntity? record(List<WorkspaceEntity> entities) {
    final rows = entities.where(
      (e) =>
          e.kind == 'workspace_settings' &&
          e.deletedAt == null &&
          e.text('key') == 'runtime-policy',
    );
    return rows.isEmpty ? null : rows.first;
  }

  static RuntimePolicy read(List<WorkspaceEntity> entities) {
    final row = record(entities);
    if (row == null) return const RuntimePolicy('public');
    final value = jsonObject(row.payload['value']);
    return RuntimePolicy(
      ['public', 'ai', 'offline'].contains(value['mode'])
          ? value['mode'] as String
          : 'offline',
    );
  }
}
