import 'dart:async';
import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

bool mayHaveCommitted(Object error) =>
    error is TimeoutException ||
    error is SocketException ||
    (error is PostgrestException && error.code == '23505');

String errorMessage(Object error) {
  if (error is TimeoutException) return '请求超时，保存状态尚未确认。请刷新核对后重试。';
  if (error is SocketException) return '网络不可用，请恢复网络后重新加载。尚未确认保存的内容请保留。';
  if (error is AuthException) {
    if (error.code == 'invalid_credentials') return '用户名或密码不正确。';
    if (error.code == 'user_already_exists' || error.code == 'email_exists') {
      return '这个用户名已被注册，请换一个或直接登录。';
    }
    if (error.code == 'weak_password') return '密码不符合安全要求，请使用更长的密码。';
    if (error.code == 'signup_disabled') return '注册暂未开放，请联系管理员。';
    if (error.code == 'over_request_rate_limit' ||
        error.code == 'over_email_send_rate_limit') {
      return '操作过于频繁，请稍后重试。';
    }
    if (error.code == 'email_not_confirmed') return '此账号暂未完成注册，请联系管理员检查注册设置。';
    return '账号操作未完成，请检查用户名、密码和网络后重试。';
  }
  if (error is PostgrestException) {
    if (error.code == '40001') {
      return '此记录已在其他设备更新，请重新加载后合并修改。';
    }
    if (error.code == '23505') return '已存在相同的唯一记录，请编辑已有内容。恢复回收站记录前，请先处理当前记录。';
    if (error.code == '42P01' ||
        error.code == 'PGRST205' ||
        error.code == 'PGRST202') {
      return '云数据库尚未初始化，请执行项目 supabase/migrations 内的数据库迁移。';
    }
    if (error.code == '42501') return '没有操作权限，请重新登录并检查数据库 RLS。';
    return '云端操作失败（${error.code ?? 'unknown'}），请重试。';
  }
  if (error is FormatException) return error.message;
  if (error is StateError) return error.message;
  return '操作未完成，请检查连接后重试。';
}
