class AppConfig {
  const AppConfig({required this.url, required this.publishableKey});
  final String url;
  final String publishableKey;

  static const environment = AppConfig(
    url: String.fromEnvironment('SUPABASE_URL'),
    publishableKey: String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
  );

  String? get error {
    final uri = Uri.tryParse(url);
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty) {
      return '请配置有效的 HTTPS Supabase 项目地址。';
    }
    if (!publishableKey.startsWith('sb_publishable_') ||
        publishableKey.contains('replace_me')) {
      return '请使用 Supabase Publishable Key；客户端不接受 Secret Key。';
    }
    return null;
  }
}
