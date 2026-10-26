import 'dart:convert';

bool jsonEquivalent(Object? a, Object? b) {
  if (a is Map && b is Map) {
    return a.length == b.length &&
        a.keys.every(
          (key) => b.containsKey(key) && jsonEquivalent(a[key], b[key]),
        );
  }
  if (a is List && b is List) {
    return a.length == b.length &&
        List.generate(
          a.length,
          (i) => i,
        ).every((i) => jsonEquivalent(a[i], b[i]));
  }
  return a == b;
}

class WorkspaceEntity {
  const WorkspaceEntity({
    required this.id,
    required this.kind,
    required this.payload,
    this.version = 0,
    this.updatedAt,
    this.deletedAt,
    this.legacyKey,
  });
  final String id;
  final String kind;
  final Map<String, dynamic> payload;
  final int version;
  final DateTime? updatedAt;
  final DateTime? deletedAt;
  final String? legacyKey;

  factory WorkspaceEntity.fromJson(Map<String, dynamic> row) => WorkspaceEntity(
    id: row['id'] as String,
    kind: row['kind'] as String,
    payload: Map<String, dynamic>.from(row['payload'] as Map),
    version: (row['version'] as num).toInt(),
    updatedAt: DateTime.tryParse(row['updated_at']?.toString() ?? ''),
    deletedAt: DateTime.tryParse(row['deleted_at']?.toString() ?? ''),
    legacyKey: row['legacy_key'] as String?,
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'kind': kind,
    'payload': payload,
    'version': version,
    'updated_at': updatedAt?.toUtc().toIso8601String(),
    'deleted_at': deletedAt?.toUtc().toIso8601String(),
    'legacy_key': legacyKey,
  };
  String text(String key, [String fallback = '']) =>
      payload[key]?.toString() ?? fallback;
  bool flag(String key) =>
      payload[key] == true ||
      payload[key] == 1 ||
      const ['true', '1'].contains(payload[key]?.toString().toLowerCase());
  int number(String key, [int fallback = 0]) =>
      int.tryParse(text(key)) ?? fallback;
  List<dynamic> list(String key) {
    final value = payload[key];
    if (value is List) return List<dynamic>.from(value);
    try {
      final parsed = jsonDecode(value?.toString() ?? '[]');
      return parsed is List ? parsed : [];
    } catch (_) {
      return [];
    }
  }
}
