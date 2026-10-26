import 'dart:convert';
import 'package:http/http.dart' as http;

class QuoteService {
  static Future<Map<String, dynamic>> fetch(List<Map> instruments) async {
    final uri = Uri.https('push2.eastmoney.com', '/api/qt/ulist.np/get', {
      'fltt': '2',
      'invt': '2',
      'fields': 'f12,f13,f14,f2,f3,f124',
      'secids': instruments.map((e) => e['secid']).join(','),
    });
    final response = await http.get(uri).timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) {
      throw const FormatException('行情来源暂不可用，请稍后重试。');
    }
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    final rows = data is Map && data['data'] is Map
        ? data['data']['diff']
        : null;
    if (rows is! List) throw const FormatException('来源没有返回有效行情。');
    final quotes = <String, dynamic>{};
    for (final row in rows.whereType<Map>()) {
      final price = double.tryParse(row['f2']?.toString() ?? '');
      if (price == null || !price.isFinite || price <= 0) continue;
      final timestamp = int.tryParse(row['f124']?.toString() ?? '');
      quotes['${row['f13']}.${row['f12']}'] = {
        'price': price,
        'change': double.tryParse(row['f3']?.toString() ?? ''),
        'provider_time': timestamp != null && timestamp > 0
            ? DateTime.fromMillisecondsSinceEpoch(
                timestamp * 1000,
                isUtc: true,
              ).toIso8601String()
            : null,
      };
    }
    if (quotes.isEmpty) throw const FormatException('暂无可用价格，未生成替代报价。');
    return {
      'quotes': quotes,
      'fetched_at': DateTime.now().toUtc().toIso8601String(),
      'source': '东方财富公开行情',
    };
  }

  static String identity(Map instrument) {
    final market = instrument['market'];
    final code = instrument['quoteCode'].toString();
    final region = market == 'A股'
        ? 'CN'
        : market == '港股'
        ? 'HK'
        : 'US';
    final exchange = market == 'A股'
        ? (code.startsWith('6')
              ? 'SSE'
              : RegExp(r'^[48]').hasMatch(code)
              ? 'BSE'
              : 'SZSE')
        : market == '港股'
        ? 'HKEX'
        : 'NASDAQ';
    return '$region:$exchange:$code';
  }
}
