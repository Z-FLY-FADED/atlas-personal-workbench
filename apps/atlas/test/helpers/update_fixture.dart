import 'dart:convert';
import 'package:http/http.dart' as http;

http.Response updateResponse(Map<String, dynamic> value) => http.Response.bytes(
  utf8.encode(jsonEncode(value)),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

Map<String, dynamic> updateFixture({
  String version = '0.6.0',
  int build = 10,
}) => {
  'schemaVersion': 1,
  'channel': 'preview',
  'version': version,
  'buildNumber': build,
  'dataCompatibility': {
    'dataSchema': 1,
    'androidApplicationId': 'com.compus.atlas_workspace',
    'androidSigningSha256': 'f08c5e9dae09c634aaf57cf441fbb1dee53e5840267369e87a2f9022c4aa85ad',
    'windowsProductName': 'WorkSpace', 'windowsCompanyName': 'com.compus',
    'backendSha256': List.filled(64, 'b').join(),
  },
  'publishedAt': '2026-10-27T00:00:00Z',
  'notes': '改进任务编辑与同步体验。',
  'releaseUrl':
      'https://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/tag/v$version',
  'platforms': {
    for (final platform in ['windows', 'android'])
      platform: {
        'url':
            'https://github.com/Z-FLY-FADED/atlas-personal-workbench/releases/download/v$version/WorkSpace-$version-${platform == 'windows' ? 'Windows-x64.zip' : 'Android.apk'}',
        'sha256': List.filled(64, 'a').join(),
        'sizeBytes': 10485760,
      },
  },
};
