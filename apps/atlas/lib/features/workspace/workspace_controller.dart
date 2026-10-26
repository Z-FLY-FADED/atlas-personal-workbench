import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../../shared/error_message.dart';
import 'entity.dart';
import 'workspace_repository.dart';

class WorkspaceController extends ChangeNotifier {
  WorkspaceController(this.repository);
  final WorkspaceRepository repository;
  List<WorkspaceEntity> _entities = [];
  List<WorkspaceEntity> get all => List.unmodifiable(_entities);
  bool loading = true;
  bool saving = false;
  bool connected = false;
  String? error;
  DateTime? lastSynced;
  StreamSubscription<void>? _subscription;
  Timer? _timer;
  Timer? _debounce;
  Timer? _focusTicker;
  DateTime? _focusStarted;
  bool get isFocusing => _focusStarted != null;
  int get focusSeconds => _focusStarted == null
      ? 0
      : DateTime.now().difference(_focusStarted!).inSeconds.clamp(0, 8640000);
  void startFocus() {
    if (_disposed || isFocusing) return;
    _focusStarted = DateTime.now();
    _focusTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!_disposed) notifyListeners();
    });
    notifyListeners();
  }

  Future<void> finishFocus() async {
    if (!isFocusing || focusSeconds < 1) return;
    final seconds = focusSeconds;
    await save(create('focus_sessions'), {
      'seconds': seconds,
      'task_title': '专注时刻',
      'completed_at': DateTime.now().toUtc().toIso8601String(),
    });
    _focusStarted = null;
    _focusTicker?.cancel();
    if (!_disposed) notifyListeners();
  }

  bool _disposed = false;
  bool _loading = false;
  bool _reloadAgain = false;
  Completer<void>? _refreshDone;
  List<WorkspaceEntity> items(String kind) =>
      _entities.where((e) => e.kind == kind && e.deletedAt == null).toList()
        ..sort(
          (a, b) => (b.updatedAt ?? DateTime(1970)).compareTo(
            a.updatedAt ?? DateTime(1970),
          ),
        );

  Future<void> start() async {
    _subscription = repository.changes().listen((_) {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 250), refresh);
    });
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => refresh());
    await refresh();
  }

  Future<void> refresh() async {
    if (_disposed) return;
    if (_loading) {
      _reloadAgain = true;
      await _refreshDone?.future;
      return;
    }
    _loading = true;
    final done = _refreshDone = Completer<void>();
    try {
      do {
        _reloadAgain = false;
        try {
          final next = await repository.load();
          if (_disposed) return;
          _entities = next;
          connected = true;
          error = null;
          lastSynced = DateTime.now();
        } catch (e) {
          if (!_disposed) {
            connected = false;
            error = errorMessage(e);
          }
        }
        if (!_disposed) {
          loading = false;
          notifyListeners();
        }
      } while (_reloadAgain && !_disposed);
    } finally {
      _loading = false;
      done.complete();
    }
  }

  WorkspaceEntity create(String kind) =>
      WorkspaceEntity(id: const Uuid().v4(), kind: kind, payload: const {});
  Future<void> save(WorkspaceEntity entity, Map<String, dynamic> payload) =>
      _write(() async {
        WorkspaceEntity saved;
        try {
          saved = await repository.save(entity, payload);
        } catch (e) {
          if (!mayHaveCommitted(e)) {
            rethrow;
          }
          await refresh();
          final confirmed = _entities.where(
            (row) =>
                row.id == entity.id &&
                row.kind == entity.kind &&
                row.deletedAt == null &&
                row.version > entity.version &&
                jsonEquivalent(row.payload, payload),
          );
          if (!connected || confirmed.isEmpty) {
            rethrow;
          }
          saved = confirmed.first;
        }
        if (!_disposed) {
          _entities = [..._entities.where((e) => e.id != saved.id), saved];
          notifyListeners();
        }
      });
  Future<int> importRows(List<Map<String, dynamic>> rows) async {
    var count = 0;
    await _write(() async => count = await repository.importRows(rows));
    return count;
  }

  Future<void> delete(WorkspaceEntity entity) => _write(() async {
    await repository.setDeleted(entity, true);
    _acknowledgeMutation(entity, entity.payload, deleted: true);
  });
  Future<void> restore(WorkspaceEntity entity) => _write(() async {
    await repository.setDeleted(entity, false);
    _acknowledgeMutation(entity, entity.payload, deleted: false);
  });
  Future<void> reviewCard(
    WorkspaceEntity entity,
    Map<String, dynamic> payload,
    Map<String, dynamic> log,
  ) => _write(() async {
    await repository.reviewCard(entity, payload, log);
    _acknowledgeMutation(entity, payload);
  });

  void _acknowledgeMutation(
    WorkspaceEntity entity,
    Map<String, dynamic> payload, {
    bool? deleted,
  }) {
    if (_disposed) return;
    // These RPCs return void, but a successful transaction changes exactly one
    // revision via atlas_entity_revision. The subsequent read supplies its exact
    // server timestamp; a read failure must not resurrect already changed data.
    final saved = WorkspaceEntity(
      id: entity.id,
      kind: entity.kind,
      payload: payload,
      version: entity.version + 1,
      legacyKey: entity.legacyKey,
      updatedAt: entity.updatedAt,
      deletedAt: deleted == null
          ? entity.deletedAt
          : deleted
          ? DateTime.now().toUtc()
          : null,
    );
    _entities = [..._entities.where((e) => e.id != saved.id), saved];
    notifyListeners();
  }

  Future<void> _write(Future<void> Function() action) async {
    if (_disposed) throw StateError('工作台已关闭，请重新打开后再保存。');
    if (saving) throw StateError('正在保存，请稍候。');
    saving = true;
    notifyListeners();
    try {
      if (_loading) await _refreshDone?.future;
      if (_disposed) throw StateError('工作台已关闭，请重新打开后再保存。');
      await action();
      await refresh();
    } finally {
      if (!_disposed) {
        saving = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _debounce?.cancel();
    _focusTicker?.cancel();
    unawaited(_subscription?.cancel());
    unawaited(repository.dispose());
    _entities = [];
    super.dispose();
  }
}
