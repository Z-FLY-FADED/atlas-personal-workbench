import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  AuthService(this.client);
  final SupabaseClient client;
  static String normalizeUsername(String username) =>
      username.trim().toLowerCase();
  static String? usernameError(String username) {
    if (!RegExp(
      r'^[a-zA-Z0-9_\u4e00-\u9fff]{3,24}$',
      unicode: true,
    ).hasMatch(username.trim())) {
      return '用户名为3–24个中文、字母、数字或下划线';
    }
    return null;
  }

  static String? passwordError(String password) {
    if (password.length < 8) return '密码至少需要8个字符';
    if (password.length > 64 || utf8.encode(password).length > 72) {
      return '密码过长，请缩短后再试';
    }
    return null;
  }

  static String accountAddress(String username) {
    final digest = sha256
        .convert(utf8.encode(normalizeUsername(username)))
        .toString();
    return 'u_${digest.substring(0, 56)}@atlas-users.invalid';
  }

  Future<void> login(String username, String password) async {
    final value = username.trim();
    final invalidName = usernameError(value);
    if (!value.contains('@') && invalidName != null) {
      throw FormatException(invalidName);
    }
    await client.auth
        .signInWithPassword(
          email: value.contains('@') ? value : accountAddress(value),
          password: password,
        )
        .timeout(const Duration(seconds: 25));
  }

  Future<void> register(String username, String password) async {
    final name = username.trim();
    final invalidName = usernameError(name),
        invalidPassword = passwordError(password);
    if (invalidName != null) throw FormatException(invalidName);
    if (invalidPassword != null) throw FormatException(invalidPassword);
    final result = await client.auth
        .signUp(
          email: accountAddress(name),
          password: password,
          data: {'username': normalizeUsername(name), 'display_name': name},
        )
        .timeout(const Duration(seconds: 25));
    if (result.session == null) throw StateError('注册未完成：管理员需要关闭注册邮箱确认，然后重试。');
  }

  // Clear the local session even when the device is offline.
  Future<void> logout() => client.auth.signOut(scope: SignOutScope.local);
}
