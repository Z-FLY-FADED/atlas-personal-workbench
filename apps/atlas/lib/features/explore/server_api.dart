import 'package:supabase_flutter/supabase_flutter.dart';

Future<Map<String, dynamic>> invokeWorkspace(
  String function,
  Map<String, dynamic> body, {
  SupabaseClient? client,
}) async {
  try {
    final response = await (client ?? Supabase.instance.client).functions
        .invoke(function, body: body)
        .timeout(const Duration(seconds: 90));
    final data = response.data;
    if (data is! Map) throw StateError('服务器未返回有效内容。');
    if (data['error'] != null) throw StateError(data['error'].toString());
    return Map<String, dynamic>.from(data);
  } on FunctionException catch (e) {
    throw StateError(
      e.details is Map
          ? (e.details['error'] ?? '服务未就绪').toString()
          : '服务器功能尚未部署或连接失败。',
    );
  }
}
