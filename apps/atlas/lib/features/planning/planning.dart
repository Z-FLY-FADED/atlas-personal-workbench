import 'dart:convert';
import '../workspace/entity.dart';
import '../workspace/catalog.dart';

String dayKey(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
DateTime dateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);
DateTime? parseDay(String value) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return null;
  final parsed = DateTime.tryParse(value);
  return parsed != null && dayKey(parsed) == value ? parsed : null;
}

DateTime? parseTimestamp(String value) {
  final match = RegExp(
    r'^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$',
  ).firstMatch(value);
  if (match == null ||
      parseDay(match[1]!) == null ||
      int.parse(match[2]!) > 23 ||
      int.parse(match[3]!) > 59 ||
      int.parse(match[4] ?? '0') > 59) {
    return null;
  }
  return DateTime.tryParse(value);
}

String displayTimestamp(String value) {
  final local = DateTime.tryParse(value)?.toLocal();
  return local == null
      ? value
      : '${dayKey(local)} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

bool taskInScope(WorkspaceEntity task, String scope, DateTime now) {
  if (scope == '全部') return true;
  if (task.text('horizon', '今日') != scope) return false;
  final today = dateOnly(now);
  if (task.flag('done')) {
    final completed =
        parseDay(task.text('completed_on')) ??
        DateTime.tryParse(task.text('completed_at'))?.toLocal();
    if (completed == null) return false;
    return switch (scope) {
      '今日' => dayKey(completed) == dayKey(today),
      '本周' =>
        !completed.isBefore(weekStart(today)) &&
            completed.isBefore(weekStart(today).add(const Duration(days: 7))),
      '年度' => completed.year == today.year,
      _ => true,
    };
  }
  final active = parseDay(task.text('active_on'));
  if (active == null) return true;
  return switch (scope) {
    '今日' => !active.isAfter(today),
    '本周' => active.isBefore(weekStart(today).add(const Duration(days: 7))),
    '年度' => active.year <= today.year,
    _ => true,
  };
}

DateTime weekStart(DateTime value) =>
    dateOnly(value).subtract(Duration(days: value.weekday - 1));
String nextOccurrence(String rule, String activeOn, DateTime now) {
  if (rule == 'none' || rule.isEmpty) return '';
  final today = dateOnly(now);
  final start = parseDay(activeOn) ?? today;
  // Completing a future occurrence must not skip its scheduled date.
  var next = start.isAfter(today) ? start : today.add(const Duration(days: 1));
  if (rule == 'weekly') {
    next = start.isAfter(today)
        ? start
        : start.add(
            Duration(
              days:
                  ((today.difference(start).inDays / 7).floor() + 1).clamp(
                    1,
                    100000,
                  ) *
                  7,
            ),
          );
  }
  if (rule == 'weekdays') {
    while (next.weekday >= DateTime.saturday) {
      next = next.add(const Duration(days: 1));
    }
  }
  return dayKey(next);
}

Map<String, dynamic> toggleTask(WorkspaceEntity task, DateTime now) {
  final active = parseDay(task.text('active_on'));
  if (!task.flag('done') &&
      task.text('repeat_rule', 'none') != 'none' &&
      active != null &&
      active.isAfter(dateOnly(now))) {
    throw StateError('本次完成已记录，下次执行日期为 ${dayKey(active)}。');
  }
  final payload = {...task.payload};
  final done = !task.flag('done');
  payload['done'] = done;
  if (done) {
    final history = task.list('completion_history');
    history.add({
      'id': now.microsecondsSinceEpoch.toString(),
      'completedAt': now.toUtc().toIso8601String(),
      'completedOn': dayKey(now),
    });
    payload['completion_history'] = history;
    payload['completed_at'] = now.toUtc().toIso8601String();
    payload['completed_on'] = dayKey(now);
    final next = nextOccurrence(
      task.text('repeat_rule', 'none'),
      task.text('active_on'),
      now,
    );
    if (next.isNotEmpty) {
      payload['active_on'] = next;
      payload['done'] = false;
    }
  } else {
    payload['completed_at'] = '';
    payload['completed_on'] = '';
    payload['completion_history'] = task
        .list('completion_history')
        .where(
          (item) =>
              item is! Map || item['completedAt'] != task.text('completed_at'),
        )
        .toList();
  }
  return payload;
}

double projectProgress(WorkspaceEntity project, List<WorkspaceEntity> tasks) {
  if (project.text('progress_mode') != 'auto') {
    return (num.tryParse(project.text('progress')) ?? 0).clamp(0, 100) / 100;
  }
  final key = entityReference(project.id, project.legacyKey);
  final linked = tasks.where((t) => t.text('project_id') == key).toList();
  return linked.isEmpty
      ? 0
      : linked.where((t) => t.flag('done')).length / linked.length;
}

String weeklySummary(List<WorkspaceEntity> entities, DateTime now) {
  final start = weekStart(now);
  final end = start.add(const Duration(days: 7));
  bool inWeek(String value) {
    final date = DateTime.tryParse(value)?.toLocal();
    return date != null && !date.isBefore(start) && date.isBefore(end);
  }

  final tasks = entities
      .where((e) => e.kind == 'tasks' && e.deletedAt == null)
      .toList();
  final completions = <String>[];
  for (final task in tasks) {
    final history = task
        .list('completion_history')
        .whereType<Map>()
        .where(
          (h) => inWeek(
            h['completedOn']?.toString() ?? h['completed_on']?.toString() ?? '',
          ),
        )
        .length;
    if (history > 0) {
      completions.add('- ${task.text('title')}（$history 次）');
    } else if (inWeek(task.text('completed_on'))) {
      completions.add('- ${task.text('title')}');
    }
  }
  final focus = entities
      .where(
        (e) =>
            e.kind == 'focus_sessions' &&
            e.deletedAt == null &&
            inWeek(e.text('completed_at')),
      )
      .fold<int>(0, (sum, e) => sum + e.number('seconds'));
  final notes = entities
      .where(
        (e) =>
            e.kind == 'quick_notes' &&
            e.deletedAt == null &&
            inWeek(e.text('created_at')),
      )
      .length;
  return '# ${dayKey(start)} 每周总结\n\n完成任务：${completions.length} 项\n专注时间：${(focus / 60).floor()} 分钟\n新增笔记：$notes 条\n\n## 本周完成\n${completions.isEmpty ? '本周暂无完成记录。' : completions.join('\n')}\n\n## 待推进\n${tasks.where((t) => !t.flag('done')).take(10).map((t) => '- ${t.text('title')}').join('\n')}\n\n## 复盘与下周计划\n';
}

Map<String, dynamic> jsonObject(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  try {
    final result = jsonDecode(value?.toString() ?? '{}');
    return result is Map ? Map<String, dynamic>.from(result) : {};
  } catch (_) {
    return {};
  }
}
