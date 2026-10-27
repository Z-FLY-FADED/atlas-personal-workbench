import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'update_manifest.dart';
import 'update_compatibility.dart';

class AppUpdateService {
  AppUpdateService({
    this.client,
    Uri? endpoint,
    this.timeout = const Duration(seconds: 12),
    this.repository = updateRepository,
    String? backendHash,
  }) : endpoint = endpoint ?? defaultEndpoint,
       backendHash = backendHash ?? configuredUpdateBackend();
  final String? backendHash;
  final http.Client? client;
  final Uri endpoint;
  final Duration timeout;
  final String repository;
  static const maxBytes = 65536;

  static Uri get defaultEndpoint {
    const override = String.fromEnvironment('UPDATE_MANIFEST_URL');
    return override.isEmpty
        ? Uri.https(
            'raw.githubusercontent.com',
            '/$updateRepository/main/updates/latest.json',
          )
        : Uri.parse(override);
  }

  Future<UpdateManifest> fetch() async {
    if (endpoint.scheme != 'https' ||
        endpoint.host.isEmpty ||
        endpoint.userInfo.isNotEmpty ||
        endpoint.hasFragment) {
      throw const FormatException('更新接口需要有效的 HTTPS 地址');
    }
    final transport = client ?? http.Client();
    try {
      return await (() async {
        final request = http.Request('GET', endpoint)
          ..followRedirects = false
          ..headers['Accept'] = 'application/json';
        final response = await transport.send(request);
        if (response.statusCode != 200) {
          throw const FormatException('更新服务暂不可用，请稍后再试');
        }
        if ((response.contentLength ?? 0) > maxBytes) {
          throw const FormatException('更新信息过大');
        }
        final bytes = BytesBuilder(copy: false);
        await for (final chunk in response.stream) {
          if (bytes.length + chunk.length > maxBytes) {
            throw const FormatException('更新信息过大');
          }
          bytes.add(chunk);
        }
        final json = jsonDecode(utf8.decode(bytes.takeBytes()));
        if (json is! Map<String, dynamic>) {
          throw const FormatException('更新信息格式不正确');
        }
        return UpdateManifest.parse(
          json,
          repository: repository,
          backendHash: backendHash,
        );
      })().timeout(timeout);
    } finally {
      if (client == null) transport.close();
    }
  }
}
