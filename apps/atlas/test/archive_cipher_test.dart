import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/features/data/archive_cipher.dart';

void main() {
  test(
    'Decrypts the original Node/WebCrypto-compatible AES-GCM envelope',
    () async {
      final bytes = await File(
        'test/fixtures/webcrypto-backup.json',
      ).readAsBytes();
      final decoded = await ArchiveCipher.decode(bytes, 'test-password');
      expect(jsonDecode(utf8.decode(decoded)), {
        'title': '备份兼容测试',
        'value': 42,
      });
    },
  );
  test('Encrypted archives round trip and reject a wrong password', () async {
    final original = Uint8List.fromList(utf8.encode('{"title":"中文备份"}'));
    final encrypted = await ArchiveCipher.encode(original, 'test-password');
    expect(jsonDecode(utf8.decode(encrypted))['format'], 'atlas-encrypted');
    expect(await ArchiveCipher.decode(encrypted, 'test-password'), original);
    await expectLater(
      ArchiveCipher.decode(encrypted, 'wrong'),
      throwsFormatException,
    );
  });
  test('Plain JSON remains importable with no password', () async {
    final original = Uint8List.fromList(
      utf8.encode('{"format":"atlas-workspace"}'),
    );
    expect(await ArchiveCipher.decode(original, ''), original);
  });
}
