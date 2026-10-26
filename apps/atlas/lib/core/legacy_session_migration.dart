import 'dart:io';

// Windows secure storage derives its folder from ProductName. Preserve the
// existing DPAPI-encrypted file when the visible product name changes. Never
// decrypt it here, delete the legacy copy, or replace an existing new store.
Future<void> migrateLegacySessionStorage(Directory supportDirectory) async {
  final separator = Platform.pathSeparator;
  final target = File(
    '${supportDirectory.path}${separator}flutter_secure_storage.dat',
  );
  if (await target.exists()) return;
  final legacy = File(
    '${supportDirectory.parent.path}${separator}ATLAS Personal Workspace${separator}flutter_secure_storage.dat',
  );
  if (!await legacy.exists()) return;
  await supportDirectory.create(recursive: true);
  final lock = await File(
    '${supportDirectory.path}$separator.brand-session-migration.lock',
  ).open(mode: FileMode.append);
  File? temporary;
  try {
    await lock.lock(FileLock.exclusive);
    if (await target.exists()) return;
    temporary = File('${target.path}.migrating-$pid');
    await legacy.copy(temporary.path);
    await temporary.rename(target.path);
  } finally {
    if (temporary != null && await temporary.exists()) await temporary.delete();
    await lock.unlock();
    await lock.close();
  }
}
