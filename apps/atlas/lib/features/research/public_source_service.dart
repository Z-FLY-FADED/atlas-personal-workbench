import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class PublicSourceService {
  static const maxBytes = 2 * 1024 * 1024;
  static Future<Uri> checkedUrl(String input) async {
    final uri = Uri.tryParse(input.trim());
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.port != 443) {
      throw const FormatException('请提供不含账号密码的 HTTPS 公网地址。');
    }
    final addresses = await InternetAddress.lookup(
      uri.host,
    ).timeout(const Duration(seconds: 10));
    if (addresses.isEmpty ||
        addresses.any((ip) {
          if (ip.isLoopback || ip.isLinkLocal) return true;
          final b = ip.rawAddress;
          if (b.length == 4) {
            return b[0] == 0 ||
                b[0] == 10 ||
                b[0] == 127 ||
                b[0] >= 224 ||
                (b[0] == 169 && b[1] == 254) ||
                (b[0] == 172 && b[1] >= 16 && b[1] <= 31) ||
                (b[0] == 192 && b[1] == 168) ||
                (b[0] == 100 && b[1] >= 64 && b[1] <= 127);
          }
          // Reject IPv4-mapped IPv6 and private/local IPv6 destinations.
          return b[0] >= 0xfc ||
              (b.take(10).every((v) => v == 0) && b[10] == 255 && b[11] == 255);
        })) {
      throw const FormatException('仅支持公网地址。');
    }
    return uri;
  }

  static Future<String> fetch(String input) async {
    final client = http.Client();
    try {
      var uri = await checkedUrl(input);
      for (var redirect = 0; redirect < 5; redirect++) {
        final request = http.Request('GET', uri)..followRedirects = false;
        final response = await client
            .send(request)
            .timeout(const Duration(seconds: 20));
        if ([301, 302, 303, 307, 308].contains(response.statusCode)) {
          final location = response.headers['location'];
          if (location == null) throw const FormatException('来源返回无效重定向。');
          await response.stream.drain<void>().timeout(
            const Duration(seconds: 5),
          );
          uri = await checkedUrl(uri.resolve(location).toString());
          continue;
        }
        if (response.statusCode != 200) {
          throw FormatException('来源暂不可用（HTTP ${response.statusCode}）。');
        }
        final bytes = <int>[];
        await for (final chunk in response.stream.timeout(
          const Duration(seconds: 20),
        )) {
          bytes.addAll(chunk);
          if (bytes.length > maxBytes) {
            throw const FormatException('来源超过 2 MB 限制。');
          }
        }
        return utf8.decode(bytes, allowMalformed: true);
      }
      throw const FormatException('来源重定向过多。');
    } finally {
      client.close();
    }
  }

  static String plainText(String html) => html
      .replaceAll(
        RegExp(
          r'<(script|style|nav|footer)\b[^>]*>[\s\S]*?</\1>',
          caseSensitive: false,
        ),
        ' ',
      )
      .replaceAll(
        RegExp(r'</(p|div|h[1-6]|li|article)>', caseSensitive: false),
        '\n',
      )
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll(RegExp(r'[ \t]+'), ' ')
      .replaceAll(RegExp(r'\n\s*\n+'), '\n\n')
      .trim();
}
