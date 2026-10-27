import '../../core/app_version.dart';
import 'update_compatibility.dart';

enum UpdatePlatform { windows, android }

const updateRepository = String.fromEnvironment(
  'UPDATE_REPOSITORY',
  defaultValue: 'Z-FLY-FADED/atlas-personal-workbench',
);

Uri get allReleasesUrl =>
    Uri.https('github.com', '/$updateRepository/releases');

class UpdateAsset {
  const UpdateAsset({
    required this.url,
    required this.sha256,
    required this.sizeBytes,
  });
  final Uri url;
  final String sha256;
  final int sizeBytes;
}

class UpdateManifest {
  const UpdateManifest({
    required this.version,
    required this.buildNumber,
    required this.channel,
    required this.publishedAt,
    required this.notes,
    required this.releaseUrl,
    required this.platforms,
  });
  final AppVersion version;
  final int buildNumber;
  final String channel, notes;
  final DateTime publishedAt;
  final Uri releaseUrl;
  final Map<UpdatePlatform, UpdateAsset> platforms;

  bool isNewerThan(InstalledAppVersion installed) {
    final comparison = version.compareTo(installed.version);
    return comparison > 0 ||
        (comparison == 0 && buildNumber > installed.buildNumber);
  }

  factory UpdateManifest.parse(
    Map<String, dynamic> json, {
    String repository = updateRepository,
    String? backendHash,
  }) {
    if (json['schemaVersion'] != 1) throw const FormatException('暂不支持此更新接口版本');
    verifyUpdateCompatibility(
      json['dataCompatibility'],
      backendHash: backendHash,
    );
    final version = AppVersion.parse(_string(json, 'version', 80));
    final build = _positiveInt(json['buildNumber']);
    final channel = _string(json, 'channel', 20);
    if (!const ['preview', 'stable'].contains(channel)) {
      throw const FormatException('更新渠道不正确');
    }
    final publishedAt = DateTime.tryParse(_string(json, 'publishedAt', 60));
    if (publishedAt == null) throw const FormatException('更新日期不正确');
    final release = _trustedUrl(json['releaseUrl'], repository, version.text);
    final notes = _string(json, 'notes', 8000);
    final rawPlatforms = json['platforms'];
    if (rawPlatforms is! Map) throw const FormatException('缺少平台更新信息');
    final platforms = <UpdatePlatform, UpdateAsset>{};
    for (final platform in UpdatePlatform.values) {
      final raw = rawPlatforms[platform.name];
      if (raw == null) continue;
      if (raw is! Map) throw const FormatException('平台更新信息不正确');
      final url = _trustedUrl(
        raw['url'],
        repository,
        version.text,
        platform: platform,
      );
      final hash = raw['sha256'];
      if (hash is! String || !RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(hash)) {
        throw const FormatException('缺少安装包校验信息');
      }
      final size = _positiveInt(raw['sizeBytes']);
      if (size > 5368709120) throw const FormatException('安装包大小不正确');
      platforms[platform] = UpdateAsset(
        url: url,
        sha256: hash.toLowerCase(),
        sizeBytes: size,
      );
    }
    if (platforms.isEmpty) throw const FormatException('尚未提供平台安装包');
    return UpdateManifest(
      version: version,
      buildNumber: build,
      channel: channel,
      publishedAt: publishedAt,
      notes: notes,
      releaseUrl: release,
      platforms: Map.unmodifiable(platforms),
    );
  }
}

String _string(Map json, String key, int limit) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty || value.length > limit) {
    throw const FormatException('更新信息不完整');
  }
  return value;
}

int _positiveInt(dynamic value) {
  if (value is! int || value < 1) throw const FormatException('更新版本信息不正确');
  return value;
}

Uri _trustedUrl(
  dynamic value,
  String repository,
  String version, {
  UpdatePlatform? platform,
}) {
  if (value is! String || value.length > 1500) {
    throw const FormatException('更新地址不正确');
  }
  final uri = Uri.tryParse(value);
  final owner = repository.split('/');
  if (owner.length != 2 ||
      uri == null ||
      uri.scheme != 'https' ||
      uri.host != 'github.com' ||
      uri.port != 443 ||
      uri.userInfo.isNotEmpty ||
      uri.hasQuery ||
      uri.hasFragment) {
    throw const FormatException('更新地址不受信任');
  }
  final parts = uri.pathSegments;
  final expected = platform == null
      ? [...owner, 'releases', 'tag', 'v$version']
      : [
          ...owner,
          'releases',
          'download',
          'v$version',
          'WorkSpace-$version-${platform == UpdatePlatform.windows ? 'Windows-x64.zip' : 'Android.apk'}',
        ];
  if (parts.length != expected.length ||
      List.generate(
        parts.length,
        (i) => parts[i].toLowerCase() == expected[i].toLowerCase(),
      ).contains(false)) {
    throw const FormatException('安装包与发布版本不一致');
  }
  return uri;
}
