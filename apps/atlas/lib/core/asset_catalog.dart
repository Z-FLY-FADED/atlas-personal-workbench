import 'dart:convert';
import 'package:flutter/services.dart';

class AssetCatalog {
  static Future<Map<String, dynamic>>? _pending;
  static Map<String, dynamic>? _cached;
  static Map<String, dynamic>? get cached => _cached;
  static Future<Map<String, dynamic>> load() => _pending ??= _read();

  static Future<Map<String, dynamic>> _read() async {
    final text = await Future.wait([
      rootBundle.loadString('assets/catalog.json'),
      rootBundle.loadString('assets/knowhow.json'),
    ]);
    final catalog = Map<String, dynamic>.from(jsonDecode(text[0]) as Map);
    final pack = jsonDecode(text[1]) as Map;
    final guides = {
      for (final guide in pack['guides'] as List) guide['key']: guide,
    };
    catalog['knowledge'] = [
      for (final item in catalog['knowledge'] as List)
        {
          ...Map<String, dynamic>.from(item as Map),
          'knowhow': guides[item['stable_key']],
        },
    ];
    catalog['knowhow_note'] = pack['editorialNote'];
    return _cached = catalog;
  }
}
