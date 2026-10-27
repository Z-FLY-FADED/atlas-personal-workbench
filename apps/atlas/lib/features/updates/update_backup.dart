import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import '../../core/safe_secure_store.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../data/archive_cipher.dart';
import '../data/archive_service.dart';
import '../workspace/entity.dart';
import '../workspace/workspace_controller.dart';

class UpdateBackupReceipt {
  const UpdateBackupReceipt(this.records, this.path);
  final int records;
  final String path;
}

class UpdateBackupStore {
  UpdateBackupStore({
    required String scope,
    Future<Directory> Function()? directory,
    Future<String?> Function(String)? readKey,
    Future<void> Function(String, String)? writeKey,
  }) : _scope = sha256.convert(utf8.encode(scope)).toString(),
       _directory = directory ?? getApplicationSupportDirectory,
       _readKey = readKey ?? ((key) => SafeSecureStore.read(key)),
       _writeKey =
           writeKey ?? ((key, value) => SafeSecureStore.write(key, value));

  final String _scope;
  final Future<Directory> Function() _directory;
  final Future<String?> Function(String) _readKey;
  final Future<void> Function(String, String) _writeKey;
  String get _keyName => 'workspace.update-backup.$_scope';

  Future<Directory> _folder() async => Directory(
    '${(await _directory()).path}${Platform.pathSeparator}update-backups${Platform.pathSeparator}$_scope',
  );

  Future<UpdateBackupReceipt> create(List<WorkspaceEntity> rows) async {
    final plain = ArchiveService.export(rows);
    if (ArchiveService.parse(plain).length != rows.length) {
      throw StateError('备份记录数不一致');
    }
    final folder = await _folder();
    await folder.create(recursive: true);
    final lock = await File(
      '${folder.path}/.backup.lock',
    ).open(mode: FileMode.append);
    var locked = false;
    File? pending;
    try {
      await lock.lock(FileLock.exclusive);
      locked = true;
      var key = await _readKey(_keyName);
      if (key == null) {
        final random = Random.secure();
        key = base64UrlEncode(List.generate(32, (_) => random.nextInt(256)));
        await _writeKey(_keyName, key);
        if (await _readKey(_keyName) != key) throw StateError('无法保存备份密钥');
      }
      if (key.isEmpty) throw StateError('备份密钥不可用');
      final cipher = await ArchiveCipher.encode(plain, key);
      final name =
          '${DateTime.now().toUtc().microsecondsSinceEpoch}-${const Uuid().v4()}.json.aes';
      pending = File('${folder.path}/$name.pending');
      await pending.writeAsBytes(cipher, flush: true);
      final verified = await ArchiveCipher.decode(
        await pending.readAsBytes(),
        key,
      );
      if (sha256.convert(verified).toString() !=
              sha256.convert(plain).toString() ||
          ArchiveService.parse(verified).length != rows.length) {
        throw StateError('更新前备份回读校验失败');
      }
      final saved = await pending.rename('${folder.path}/$name');
      return UpdateBackupReceipt(rows.length, saved.path);
    } finally {
      if (pending != null && await pending.exists()) await pending.delete();
      if (locked) await lock.unlock();
      await lock.close();
    }
  }

  Future<Uint8List> readLatest() async {
    final folder = await _folder();
    if (!await folder.exists()) throw StateError('当前账号还没有更新备份');
    final files = await folder
        .list(followLinks: false)
        .where(
          (entry) =>
              entry is File &&
              RegExp(
                r'^\d+-[a-f0-9-]+\.json\.aes$',
              ).hasMatch(entry.uri.pathSegments.last),
        )
        .cast<File>()
        .toList();
    if (files.isEmpty) throw StateError('当前账号还没有更新备份');
    files.sort((a, b) => b.path.compareTo(a.path));
    final key = await _readKey(_keyName);
    if (key == null || key.isEmpty) throw StateError('当前账号的备份密钥不可用');
    final plain = await ArchiveCipher.decode(
      await files.first.readAsBytes(),
      key,
    );
    ArchiveService.parse(plain);
    return plain;
  }
}

class UpdateProtectionException implements Exception {
  const UpdateProtectionException(this.message);
  final String message;
}

class UpdateProtection {
  const UpdateProtection(this.controller, this.store);
  final WorkspaceController controller;
  final UpdateBackupStore store;

  Future<UpdateBackupReceipt> prepare() async {
    if (controller.saving || controller.loading || controller.error != null) {
      throw const UpdateProtectionException('请先完成保存并处理工作台中的同步提示，再下载更新。');
    }
    if (controller.isFocusing) {
      throw const UpdateProtectionException('请先结束并保存当前专注记录，再下载更新。');
    }
    await controller.refresh();
    if (!controller.connected ||
        controller.error != null ||
        controller.saving) {
      throw const UpdateProtectionException('尚未同步到最新云端数据，请联网同步后再更新。');
    }
    final receipt = await store.create(controller.all);
    if (controller.saving) {
      throw const UpdateProtectionException('还有内容正在保存，请保存完成后重试。');
    }
    return receipt;
  }
}
