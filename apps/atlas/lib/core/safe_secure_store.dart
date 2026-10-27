import 'dart:async';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

// Keep backup-key writes and session refreshes from racing over the Windows
// read-modify-write store. The lock also covers other workspace instances.
class SecureStorageGate {
  SecureStorageGate({this.useFileLock = false, this.directory});
  final bool useFileLock;
  final Future<Directory> Function()? directory;
  Future<void> _tail = Future.value();

  Future<T> run<T>(Future<T> Function() action) {
    final next = _tail.then((_) => _locked(action));
    _tail = next.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return next;
  }

  Future<T> _locked<T>(Future<T> Function() action) async {
    if (!useFileLock) return action();
    final folder = await (directory ?? getApplicationSupportDirectory)();
    await folder.create(recursive: true);
    final handle = await File(
      '${folder.path}/.secure-storage.lock',
    ).open(mode: FileMode.append);
    var acquired = false;
    try {
      for (var attempt = 0; attempt < 100; attempt++) {
        try {
          await handle.lock(FileLock.exclusive);
          acquired = true;
          break;
        } on FileSystemException {
          if (attempt == 99) rethrow;
          await Future<void>.delayed(const Duration(milliseconds: 50));
        }
      }
      return await action();
    } finally {
      if (acquired) await handle.unlock();
      await handle.close();
    }
  }
}

class SafeSecureStore {
  static final _gate = SecureStorageGate(useFileLock: Platform.isWindows);
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static Future<String?> read(String key) =>
      _gate.run(() => _storage.read(key: key));
  static Future<void> write(String key, String value) =>
      _gate.run(() => _storage.write(key: key, value: value));
  static Future<void> delete(String key) =>
      _gate.run(() => _storage.delete(key: key));
  static Future<bool> contains(String key) =>
      _gate.run(() => _storage.containsKey(key: key));
}
