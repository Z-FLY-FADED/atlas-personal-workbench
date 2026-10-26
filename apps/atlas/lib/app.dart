import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/atlas_theme.dart';
import 'features/auth/auth_service.dart';
import 'features/auth/login_page.dart';
import 'features/workspace/workspace_shell.dart';

class AtlasApp extends StatelessWidget {
  const AtlasApp({super.key, this.startupError});
  final String? startupError;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'WorkSpace',
    debugShowCheckedModeBanner: false,
    locale: const Locale('zh', 'CN'),
    supportedLocales: const [Locale('zh', 'CN'), Locale('en')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: buildAtlasTheme(),
    home: startupError != null
        ? Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.settings_outlined, size: 48),
                    const SizedBox(height: 20),
                    Text(startupError!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    const SelectableText(
                      '请使用 config/dev.json 配置，并通过 scripts/flutter-app.ps1 启动。',
                    ),
                  ],
                ),
              ),
            ),
          )
        : const _AuthGate(),
  );
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();
  @override
  Widget build(BuildContext context) {
    final client = Supabase.instance.client;
    return StreamBuilder<AuthState>(
      stream: client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = client.auth.currentSession;
        // Navigator is scoped to the account, clearing open detail/edit routes on logout.
        return Navigator(
          key: ValueKey(session?.user.id ?? 'signed-out'),
          onGenerateRoute: (_) => MaterialPageRoute<void>(
            builder: (_) => session == null
                ? LoginPage(auth: AuthService(client))
                : WorkspaceShell(
                    key: ValueKey(session.user.id),
                    client: client,
                    userId: session.user.id,
                  ),
          ),
        );
      },
    );
  }
}
