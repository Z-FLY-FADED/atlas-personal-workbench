import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'package:xml/xml.dart';
import '../research/public_source_service.dart';

class FeedService {
  static Future<List<Map<String, dynamic>>> read(
    String url,
    String source,
    String industry,
  ) async {
    final document = XmlDocument.parse(await PublicSourceService.fetch(url));
    final rows = <Map<String, dynamic>>[];
    String text(XmlElement element, String name) => element.childElements
        .where((e) => e.name.local == name)
        .map((e) => e.innerText.trim())
        .join(' ');
    for (final entry
        in document.descendants
            .whereType<XmlElement>()
            .where((e) => e.name.local == 'item' || e.name.local == 'entry')
            .take(100)) {
      var link = text(entry, 'link');
      if (link.isEmpty) {
        final links = entry.childElements.where((e) => e.name.local == 'link');
        if (links.isNotEmpty) link = links.first.getAttribute('href') ?? '';
      }
      final uri = Uri.tryParse(link);
      final title = text(entry, 'title');
      if (uri == null ||
          !['https', 'http'].contains(uri.scheme) ||
          title.isEmpty) {
        continue;
      }
      rows.add({
        'title': title,
        'summary': PublicSourceService.plainText(
          text(entry, 'description').isNotEmpty
              ? text(entry, 'description')
              : text(entry, 'summary'),
        ),
        'canonical_url': uri.toString(),
        'source_name': source,
        'industry': industry,
        'published_at': text(entry, 'pubDate').isNotEmpty
            ? text(entry, 'pubDate')
            : text(entry, 'published'),
        'url_hash': sha256.convert(utf8.encode(uri.toString())).toString(),
        'discovered_at': DateTime.now().toUtc().toIso8601String(),
      });
    }
    return rows;
  }
}
