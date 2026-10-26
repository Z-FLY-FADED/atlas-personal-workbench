import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/core/config/app_config.dart';
import 'package:atlas_workspace/core/runtime_policy.dart';
import 'package:atlas_workspace/features/data/archive_service.dart';
import 'package:atlas_workspace/features/learning/learning_service.dart';
import 'package:atlas_workspace/features/planning/planning.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';

void main() {
  test('Client config rejects elevated keys and insecure URLs', () {
    expect(
      const AppConfig(
        url: 'https://example.supabase.co',
        publishableKey: 'sb_publishable_test',
      ).error,
      isNull,
    );
    expect(
      const AppConfig(
        url: 'https://example.supabase.co',
        publishableKey: 'sb_secret_test',
      ).error,
      isNotNull,
    );
    expect(
      const AppConfig(
        url: 'http://example.supabase.co',
        publishableKey: 'sb_publishable_test',
      ).error,
      isNotNull,
    );
  });
  test(
    'Archive round trip preserves unknown fields and tombstones but removes identity and keys',
    () {
      final entities = [
        WorkspaceEntity(
          id: 'test',
          kind: 'knowledge',
          version: 7,
          deletedAt: DateTime.utc(2026, 10, 26),
          payload: {
            'title': '中文资料',
            'unknown': {'nested': true},
            'owner_id': 'old-owner',
            'api_key': 'not-exportable',
          },
        ),
      ];
      final rows = ArchiveService.parse(ArchiveService.export(entities));
      expect(rows.single['payload']['title'], '中文资料');
      expect(rows.single['payload']['unknown'], {'nested': true});
      expect(rows.single['payload'].containsKey('api_key'), false);
      expect(rows.single['payload'].containsKey('owner_id'), false);
      expect(rows.single['deleted_at'], '2026-10-26T00:00:00.000Z');
    },
  );
  test('Corrupt archives fail before import', () {
    final bytes = ArchiveService.export([
      const WorkspaceEntity(
        id: 'id',
        kind: 'tasks',
        payload: {'title': 'original'},
      ),
    ]);
    final data = jsonDecode(utf8.decode(bytes));
    data['rows'][0]['payload']['title'] = 'tampered';
    expect(
      () => ArchiveService.parse(
        Uint8List.fromList(utf8.encode(jsonEncode(data))),
      ),
      throwsFormatException,
    );
  });
  test('Recurrence advances workdays past the weekend', () {
    expect(
      nextOccurrence('weekdays', '2026-10-23', DateTime(2026, 10, 23)),
      '2026-10-26',
    );
    expect(
      nextOccurrence('weekly', '2026-10-19', DateTime(2026, 10, 26)),
      '2026-11-02',
    );
  });
  test(
    'Completing recurring tasks preserves history and creates next active date',
    () {
      const task = WorkspaceEntity(
        id: 'a',
        kind: 'tasks',
        payload: {
          'title': '每日复习',
          'repeat_rule': 'daily',
          'active_on': '2026-10-26',
          'completion_history': '[]',
        },
      );
      final result = toggleTask(task, DateTime(2026, 10, 26, 10));
      expect(result['active_on'], '2026-10-27');
      expect(result['done'], false);
      expect(result['completion_history'], hasLength(1));
      expect(task.payload['completion_history'], '[]');
    },
  );
  test('Undo completion removes the matching history entry', () {
    final now = DateTime(2026, 10, 26, 10);
    final complete = toggleTask(
      const WorkspaceEntity(id: 'a', kind: 'tasks', payload: {}),
      now,
    );
    final undone = toggleTask(
      WorkspaceEntity(id: 'a', kind: 'tasks', payload: complete),
      now,
    );
    expect(undone['completion_history'], isEmpty);
    expect(undone['done'], false);
  });
  test(
    'A failed task save cannot mutate an existing in-memory history list',
    () {
      final history = <dynamic>[];
      final task = WorkspaceEntity(
        id: 'a',
        kind: 'tasks',
        payload: {'completion_history': history},
      );
      final next = toggleTask(task, DateTime(2026, 10, 26));
      expect(history, isEmpty);
      expect(next['completion_history'], hasLength(1));
    },
  );
  test('Automatic project progress includes only linked tasks', () {
    const project = WorkspaceEntity(
      id: 'new',
      kind: 'projects',
      legacyKey: '1',
      payload: {'progress_mode': 'auto'},
    );
    expect(
      projectProgress(project, [
        const WorkspaceEntity(
          id: 'a',
          kind: 'tasks',
          payload: {'project_id': 1, 'done': 1},
        ),
        const WorkspaceEntity(
          id: 'b',
          kind: 'tasks',
          payload: {'project_id': 1, 'done': 0},
        ),
        const WorkspaceEntity(
          id: 'c',
          kind: 'tasks',
          payload: {'project_id': 2, 'done': 1},
        ),
      ]),
      .5,
    );
  });
  test('Weekly summary excludes deleted and other-week completions', () {
    final content = weeklySummary([
      const WorkspaceEntity(
        id: 'a',
        kind: 'tasks',
        payload: {'title': '本周任务', 'completed_on': '2026-10-26'},
      ),
      const WorkspaceEntity(
        id: 'b',
        kind: 'tasks',
        payload: {'title': '上周任务', 'completed_on': '2026-10-19'},
      ),
      WorkspaceEntity(
        id: 'c',
        kind: 'tasks',
        deletedAt: DateTime.now(),
        payload: const {'title': '删除任务', 'completed_on': '2026-10-26'},
      ),
    ], DateTime(2026, 10, 26));
    expect(content, contains('完成任务：1 项'));
  });
  test('AI defaults off and malformed policy fails closed', () {
    expect(RuntimePolicy.read([]).allowsAI, false);
    expect(
      RuntimePolicy.read([
        const WorkspaceEntity(
          id: 's',
          kind: 'workspace_settings',
          payload: {'key': 'runtime-policy', 'value': 'broken'},
        ),
      ]).allowsPublic,
      false,
    );
  });
  test('FSRS review keeps source history and produces a future due date', () {
    final now = DateTime.utc(2026, 10, 26, 10);
    final review = LearningService.review(
      const WorkspaceEntity(
        id: 'a',
        kind: 'learning_cards',
        payload: {'front': 'hello', 'card': '{"state":0}'},
      ),
      3,
      now,
    );
    expect(
      DateTime.parse(review.payload['due_at'] as String).isAfter(now),
      true,
    );
    expect(review.payload['card'], '{"state":0}');
    expect(review.log['rating'], 3);
  });
}
