import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../../core/config/app_config.dart';

const androidUpdateApplicationId = 'com.compus.atlas_workspace';
const androidUpdateCertificate =
    'f08c5e9dae09c634aaf57cf441fbb1dee53e5840267369e87a2f9022c4aa85ad';

String? configuredUpdateBackend() {
  final uri = Uri.tryParse(AppConfig.environment.url);
  return uri == null || uri.scheme != 'https' || uri.host.isEmpty
      ? null
      : sha256.convert(utf8.encode(uri.origin.toLowerCase())).toString();
}

class UpdateCompatibilityException implements Exception {
  const UpdateCompatibilityException();
}

void verifyUpdateCompatibility(dynamic value, {String? backendHash}) {
  if (value is! Map ||
      value['dataSchema'] != 1 ||
      value['androidApplicationId'] != androidUpdateApplicationId ||
      value['androidSigningSha256'] != androidUpdateCertificate ||
      value['windowsProductName'] != 'WorkSpace' ||
      value['windowsCompanyName'] != 'com.compus' ||
      value['backendSha256'] is! String ||
      !RegExp(r'^[a-f0-9]{64}$').hasMatch(value['backendSha256'] as String) ||
      (backendHash != null && value['backendSha256'] != backendHash)) {
    throw const UpdateCompatibilityException();
  }
}
