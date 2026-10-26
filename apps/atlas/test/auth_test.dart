import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:atlas_workspace/features/auth/auth_service.dart';
import 'package:atlas_workspace/features/auth/login_page.dart';

class TestPkceStorage extends GotrueAsyncStorage {
  final values = <String, String>{};
  @override
  Future<String?> getItem({required String key}) async => values[key];
  @override
  Future<void> setItem({required String key, required String value}) async {
    values[key] = value;
  }

  @override
  Future<void> removeItem({required String key}) async {
    values.remove(key);
  }
}

class TestAuthService implements AuthService {
  String? username, password;
  bool registered = false;
  @override
  SupabaseClient get client => throw UnimplementedError();
  @override
  Future<void> login(String username, String password) async {}
  @override
  Future<void> logout() async {}
  @override
  Future<void> register(String username, String password) async {
    this.username = username;
    this.password = password;
    registered = true;
  }
}

Map<String, dynamic> sessionResponse() {
  final now = DateTime.now().toUtc();
  String encode(Object value) =>
      base64Url.encode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
  final token =
      '${encode({'alg': 'HS256', 'typ': 'JWT'})}.${encode({'sub': 'eaa00377-2fd4-47e5-a26f-38a822c97bbf', 'exp': now.millisecondsSinceEpoch ~/ 1000 + 3600})}.test-signature';
  return {
    'access_token': token,
    'refresh_token': 'test-refresh-token',
    'expires_in': 3600,
    'token_type': 'bearer',
    'user': {
      'id': 'eaa00377-2fd4-47e5-a26f-38a822c97bbf',
      'aud': 'authenticated',
      'role': 'authenticated',
      'email': AuthService.accountAddress('测试用户'),
      'app_metadata': {
        'provider': 'email',
        'providers': ['email'],
      },
      'user_metadata': {'username': '测试用户'},
      'created_at': now.toIso8601String(),
    },
  };
}

void main() {
  test(
    'Username identities are stable across case and whitespace and accept Chinese',
    () {
      expect(
        AuthService.accountAddress(' User_123 '),
        AuthService.accountAddress('user_123'),
      );
      expect(
        AuthService.accountAddress('测试用户'),
        endsWith('@atlas-users.invalid'),
      );
      expect(
        AuthService.accountAddress('other_user'),
        isNot(AuthService.accountAddress('user_123')),
      );
      expect(AuthService.usernameError('测试用户'), isNull);
      expect(AuthService.usernameError('a@b.com'), isNotNull);
      expect(AuthService.usernameError('ab'), isNotNull);
      expect(AuthService.passwordError('short'), isNotNull);
    },
  );
  test(
    'Password login sends the same stable identity used by registration',
    () async {
      Map<String, dynamic>? body;
      final client = SupabaseClient(
        'https://test.supabase.co',
        'sb_publishable_test',
        authOptions: AuthClientOptions(
          autoRefreshToken: false,
          pkceAsyncStorage: TestPkceStorage(),
        ),
        httpClient: MockClient((request) async {
          body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(request.url.path, '/auth/v1/token');
          return http.Response(
            jsonEncode({
              'code': 'invalid_credentials',
              'msg': 'Invalid login credentials',
            }),
            400,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      await expectLater(
        AuthService(client).login('Test_User', 'a-strong-password'),
        throwsA(isA<AuthException>()),
      );
      expect(body!['email'], AuthService.accountAddress('test_user'));
      expect(body!['password'], 'a-strong-password');
    },
  );
  test(
    'Registration fails clearly when the project still requires email confirmation',
    () async {
      final client = SupabaseClient(
        'https://test.supabase.co',
        'sb_publishable_test',
        authOptions: AuthClientOptions(
          autoRefreshToken: false,
          pkceAsyncStorage: TestPkceStorage(),
        ),
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode(sessionResponse()['user']),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      await expectLater(
        AuthService(client).register('测试用户', 'a-strong-password'),
        throwsStateError,
      );
      expect(client.auth.currentSession, isNull);
    },
  );
  test(
    'Registration accepts an authenticated session and preserves username metadata',
    () async {
      Map<String, dynamic>? body;
      final client = SupabaseClient(
        'https://test.supabase.co',
        'sb_publishable_test',
        authOptions: AuthClientOptions(
          autoRefreshToken: false,
          pkceAsyncStorage: TestPkceStorage(),
        ),
        httpClient: MockClient((request) async {
          body = jsonDecode(request.body) as Map<String, dynamic>;
          return http.Response(
            jsonEncode(sessionResponse()),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      await AuthService(client).register('测试用户', 'a-strong-password');
      expect(body!['email'], AuthService.accountAddress('测试用户'));
      expect(body!['data']['username'], '测试用户');
      expect(client.auth.currentSession, isNotNull);
    },
  );
  testWidgets(
    'Registration needs only username and password and submits both fields',
    (tester) async {
      final auth = TestAuthService();
      await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
      await tester.tap(find.text('注册'));
      await tester.pumpAndSettle();
      expect(find.byType(TextFormField), findsNWidgets(2));
      expect(find.text('邮箱'), findsNothing);
      await tester.enterText(find.byType(TextFormField).first, '测试用户');
      await tester.enterText(
        find.byType(TextFormField).last,
        'a-strong-password',
      );
      await tester.ensureVisible(find.text('注册并进入工作台'));
      await tester.tap(find.text('注册并进入工作台'));
      await tester.pumpAndSettle();
      expect(auth.registered, true);
      expect(auth.username, '测试用户');
      expect(auth.password, 'a-strong-password');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
