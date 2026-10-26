import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'legacy_session_migration.dart';

class SecureSessionStorage extends LocalStorage {
  const SecureSessionStorage(this.namespace);
  final String namespace;
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  String get _key => 'atlas.session.$namespace';
  @override
  Future<void> initialize() async {
    if (Platform.isWindows) {
      await migrateLegacySessionStorage(await getApplicationSupportDirectory());
    }
  }

  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _key);
  @override
  Future<String?> accessToken() => _storage.read(key: _key);
  @override
  Future<void> persistSession(String persistSessionString) =>
      _storage.write(key: _key, value: persistSessionString);
  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);
}
