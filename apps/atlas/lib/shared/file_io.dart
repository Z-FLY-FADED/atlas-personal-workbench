import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';

Future<Uint8List?> pickJson() async {
  final files = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['json'],
    withData: true,
  );
  if (files == null || files.files.isEmpty) return null;
  final file = files.files.single;
  if (file.size > 50 * 1024 * 1024) {
    throw const FormatException('文件不能超过 50 MB。');
  }
  return file.bytes ??
      (file.path == null ? null : await File(file.path!).readAsBytes());
}

Future<bool> saveFile(String name, Uint8List bytes) async {
  final path = await FilePicker.platform.saveFile(
    dialogTitle: '导出备份',
    fileName: name,
    bytes: bytes,
  );
  if (path == null) return false;
  if (!Platform.isAndroid && !Platform.isIOS) {
    await File(path).writeAsBytes(bytes, flush: true);
  }
  return true;
}
