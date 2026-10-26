import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/config/app_config.dart';
import 'core/secure_session_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  String? error = AppConfig.environment.error;
  if (error == null) {
    try {
      await Supabase.initialize(
        url: AppConfig.environment.url,
        publishableKey: AppConfig.environment.publishableKey,
        authOptions: FlutterAuthClientOptions(
          localStorage: SecureSessionStorage(
            Uri.parse(AppConfig.environment.url).host,
          ),
        ),
      );
    } catch (_) {
      error = '安全会话初始化失败，请重新启动应用并检查系统凭据存储。';
    }
  }
  runApp(AtlasApp(startupError: error));
}
