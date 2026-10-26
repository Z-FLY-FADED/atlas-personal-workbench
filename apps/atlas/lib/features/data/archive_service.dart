import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import '../workspace/catalog.dart';
import '../workspace/entity.dart';

const maxArchiveBytes = 50 * 1024 * 1024;
const _secrets = {
  'api_key',
  'apiKey',
  'secret_key',
  'service_role',
  'access_token',
  'refresh_token',
  'owner_id',
  'ownerId',
  'user_id',
};

class ArchiveService {
  static Uint8List export(List<WorkspaceEntity> entities) {
    final rows = entities
        .map(
          (e) => {
            'kind': e.kind,
            'source_id': e.id,
            'legacy_key': e.legacyKey ?? e.id,
            'payload': _clean(e.payload),
            'deleted_at': e.deletedAt?.toUtc().toIso8601String(),
          },
        )
        .toList();
    return Uint8List.fromList(
      utf8.encode(
        jsonEncode({
          'format': 'atlas-flutter',
          'version': 1,
          'created_at': DateTime.now().toUtc().toIso8601String(),
          'rows': rows,
          'checksum': _checksum(rows),
        }),
      ),
    );
  }

  static String _checksum(Object value) =>
      sha256.convert(utf8.encode(jsonEncode(value))).toString();
  static Map<String, dynamic> _clean(Map<String, dynamic> row) =>
      Map.fromEntries(row.entries.where((e) => !_secrets.contains(e.key)));
  static List<Map<String, dynamic>> parse(Uint8List bytes) {
    if (bytes.length > maxArchiveBytes) {
      throw const FormatException('备份不能超过 50 MB。');
    }
    final data = jsonDecode(utf8.decode(bytes));
    if (data is! Map || data['version'] != 1) {
      throw const FormatException('备份格式或版本不受支持。');
    }
    final rows = <Map<String, dynamic>>[];
    if (data['format'] == 'atlas-flutter') {
      if (data['rows'] is! List ||
          _checksum(data['rows']) != data['checksum']) {
        throw const FormatException('备份校验失败，文件可能已损坏。');
      }
      for (final raw in data['rows'] as List) {
        if (raw is! Map || raw['payload'] is! Map) {
          throw const FormatException('记录格式无效。');
        }
        rows.add({
          'kind': raw['kind'],
          'source_id': raw['source_id'],
          'legacy_key': raw['legacy_key'],
          'payload': _clean(Map<String, dynamic>.from(raw['payload'] as Map)),
          'deleted_at': raw['deleted_at'],
        });
      }
    } else if (data['format'] == 'atlas-workspace') {
      final tables = data['tables'];
      if (tables is! Map || _checksum(tables) != data['checksum']) {
        throw const FormatException('旧版备份校验失败。请从原工作台重新导出未加密 JSON。');
      }
      for (final entry in tables.entries) {
        if (!entityKinds.contains(entry.key)) {
          throw FormatException('备份包含未知数据表：${entry.key}');
        }
        if (entry.value is! List) throw const FormatException('备份数据表格式无效。');
        for (final raw in entry.value as List) {
          if (raw is! Map) throw const FormatException('旧版记录格式无效。');
          final row = Map<String, dynamic>.from(raw);
          final key =
              row['id']?.toString() ??
              row['knowledge_key']?.toString() ??
              'singleton';
          rows.add({
            'kind': entry.key,
            'legacy_key': key,
            'payload': _clean(row),
          });
        }
      }
    } else {
      throw const FormatException('请选择 WorkSpace JSON 备份。');
    }
    if (rows.length > 10000) throw const FormatException('单次最多导入 10000 条记录。');
    final keys = <String>{};
    for (final row in rows) {
      if (!entityKinds.contains(row['kind']) ||
          row['legacy_key'] is! String ||
          (row['legacy_key'] as String).isEmpty) {
        throw const FormatException('备份包含无效记录。');
      }
      if (!keys.add('${row['kind']}:${row['legacy_key']}')) {
        throw const FormatException('备份包含重复的记录标识。');
      }
    }
    return rows;
  }
}
