import 'dart:convert';
import 'dart:isolate';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

// Interoperable with the original WebCrypto PBKDF2-SHA256 / AES-256-GCM envelope.
class ArchiveCipher {
  static Uint8List _random(int length) {
    final random = Random.secure();
    return Uint8List.fromList(
      List.generate(length, (_) => random.nextInt(256)),
    );
  }

  static Uint8List _key(String password, Uint8List salt) {
    final derive = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64))
      ..init(Pbkdf2Parameters(salt, 210000, 32));
    return derive.process(Uint8List.fromList(utf8.encode(password)));
  }

  static Future<Uint8List> encode(Uint8List plain, String password) =>
      Isolate.run(() {
        if (password.isEmpty) return plain;
        final salt = _random(16), iv = _random(12);
        final cipher = GCMBlockCipher(AESEngine())
          ..init(
            true,
            AEADParameters(
              KeyParameter(_key(password, salt)),
              128,
              iv,
              Uint8List(0),
            ),
          );
        return Uint8List.fromList(
          utf8.encode(
            jsonEncode({
              'format': 'atlas-encrypted',
              'version': 1,
              'salt': base64Encode(salt),
              'iv': base64Encode(iv),
              'data': base64Encode(cipher.process(plain)),
            }),
          ),
        );
      });
  static Future<Uint8List> decode(Uint8List bytes, String password) =>
      Isolate.run(() {
        final envelope = jsonDecode(utf8.decode(bytes));
        if (envelope is! Map || envelope['format'] != 'atlas-encrypted') {
          return bytes;
        }
        if (password.isEmpty) throw const FormatException('请填写备份密码。');
        try {
          if (envelope['version'] != 1) throw const FormatException('无效版本');
          final salt = base64Decode(envelope['salt'] as String),
              iv = base64Decode(envelope['iv'] as String),
              data = base64Decode(envelope['data'] as String);
          if (salt.length != 16 || iv.length != 12 || data.length < 16) {
            throw const FormatException('无效加密文件');
          }
          final cipher = GCMBlockCipher(AESEngine())
            ..init(
              false,
              AEADParameters(
                KeyParameter(_key(password, salt)),
                128,
                iv,
                Uint8List(0),
              ),
            );
          return cipher.process(data);
        } catch (_) {
          throw const FormatException('密码不正确或加密备份已损坏。');
        }
      });
}
