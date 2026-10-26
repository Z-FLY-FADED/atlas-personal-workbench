import 'dart:convert';
import 'package:archive/archive.dart';
import 'package:file_picker/file_picker.dart';
import 'package:xml/xml.dart';

class ImportedDocument {
  const ImportedDocument(this.name, this.content);
  final String name, content;
}

Future<ImportedDocument?> importDocument() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['txt', 'md', 'docx'],
    withData: true,
  );
  if (result == null) return null;
  final file = result.files.single;
  if (file.size > 10 * 1024 * 1024) {
    throw const FormatException('文档不能超过 10 MB。');
  }
  final bytes = file.bytes;
  if (bytes == null) throw const FormatException('文件无法读取。');
  String content;
  if (file.extension?.toLowerCase() == 'docx') {
    final archive = ZipDecoder().decodeBytes(bytes);
    final document = archive.findFile('word/document.xml');
    if (document == null || document.size > 16 * 1024 * 1024) {
      throw const FormatException('Word 文档正文无效或过大。');
    }
    final xml = XmlDocument.parse(utf8.decode(document.content));
    content = xml.descendants
        .whereType<XmlElement>()
        .where((e) => e.name.local == 'p')
        .map(
          (p) => p.descendants
              .whereType<XmlElement>()
              .where((e) => e.name.local == 't')
              .map((e) => e.innerText)
              .join(),
        )
        .join('\n');
  } else {
    content = utf8.decode(bytes, allowMalformed: true);
  }
  if (content.trim().isEmpty) throw const FormatException('未提取到正文，请手动粘贴文本。');
  return ImportedDocument(file.name, content.trim());
}
