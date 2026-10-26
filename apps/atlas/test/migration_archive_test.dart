import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/features/data/archive_service.dart';

void main() {
  const path = String.fromEnvironment('ATLAS_MIGRATION_ARCHIVES');
  test(
    'Read-only Node exports pass native checksum and schema validation',
    () async {
      final files = Directory(path)
          .listSync()
          .whereType<File>()
          .where(
            (file) =>
                file.path.contains('atlas-owner-') &&
                file.path.endsWith('.json'),
          )
          .toList();
      expect(files, isNotEmpty);
      for (final file in files) {
        final rows = ArchiveService.parse(await file.readAsBytes());
        expect(rows, isNotEmpty);
        for (final row in rows) {
          expect((row['payload'] as Map).containsKey('owner_id'), false);
        }
      }
    },
    skip: path.isEmpty
        ? 'Pass ATLAS_MIGRATION_ARCHIVES to validate private local export files.'
        : false,
  );
}
