import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'legacy_session_migration.dart';
import 'safe_secure_store.dart';

class SecureSessionStorage extends LocalStorage {
  const SecureSessionStorage(this.namespace);
  final String namespace;
  String get _key => 'atlas.session.$namespace';
  @override
  Future<void> initialize() async {
    if (Platform.isWindows) {
      await migrateLegacySessionStorage(await getApplicationSupportDirectory());
    }
  }

  @override
  Future<bool> hasAccessToken() => SafeSecureStore.contains(_key);
  @override
  Future<String?> accessToken() => SafeSecureStore.read(_key);
  @override
  Future<void> persistSession(String persistSessionString) =>
      SafeSecureStore.write(_key, persistSessionString);
  @override
  Future<void> removePersistedSession() => SafeSecureStore.delete(_key);
}
