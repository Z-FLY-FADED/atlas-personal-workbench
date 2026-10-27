import 'package:package_info_plus/package_info_plus.dart';

class AppVersion implements Comparable<AppVersion> {
  AppVersion._(this.text, this.numbers, this.prerelease);
  final String text;
  final List<int> numbers;
  final List<String> prerelease;

  factory AppVersion.parse(String text) {
    final match = RegExp(
      r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$',
    ).firstMatch(text);
    if (text.length > 80 || match == null) {
      throw const FormatException('版本号格式不正确');
    }
    final numbers = [for (var i = 1; i <= 3; i++) int.tryParse(match[i]!)];
    final prerelease = match[4]?.split('.') ?? <String>[];
    if (numbers.any((n) => n == null || n > 2147483647) ||
        prerelease.any((p) => RegExp(r'^0\d+$').hasMatch(p))) {
      throw const FormatException('版本号超出支持范围');
    }
    return AppVersion._(text, numbers.cast<int>(), prerelease);
  }

  @override
  int compareTo(AppVersion other) {
    for (var i = 0; i < 3; i++) {
      final result = numbers[i].compareTo(other.numbers[i]);
      if (result != 0) return result;
    }
    if (prerelease.isEmpty || other.prerelease.isEmpty) {
      return prerelease.isEmpty == other.prerelease.isEmpty
          ? 0
          : prerelease.isEmpty
          ? 1
          : -1;
    }
    for (var i = 0; i < prerelease.length && i < other.prerelease.length; i++) {
      final a = prerelease[i], b = other.prerelease[i];
      final an = RegExp(r'^\d+$').hasMatch(a);
      final bn = RegExp(r'^\d+$').hasMatch(b);
      final result = an && bn
          ? (a.length != b.length
                ? a.length.compareTo(b.length)
                : a.compareTo(b))
          : an != bn
          ? (an ? -1 : 1)
          : a.compareTo(b);
      if (result != 0) return result;
    }
    return prerelease.length.compareTo(other.prerelease.length);
  }

  @override
  String toString() => text;
}

class InstalledAppVersion {
  const InstalledAppVersion(this.version, this.buildNumber);
  final AppVersion version;
  final int buildNumber;
  String get label => '${version.text} ($buildNumber)';

  static Future<InstalledAppVersion> load() async {
    final info = await PackageInfo.fromPlatform();
    final build = int.tryParse(info.buildNumber);
    if (build == null || build < 1) {
      throw const FormatException('未能读取已安装的应用版本');
    }
    return InstalledAppVersion(AppVersion.parse(info.version), build);
  }
}
