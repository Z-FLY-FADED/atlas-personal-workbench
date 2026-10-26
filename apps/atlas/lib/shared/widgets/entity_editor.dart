import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;
import '../error_message.dart';
import '../../features/workspace/catalog.dart';
import '../../features/workspace/entity.dart';
import '../../features/workspace/workspace_controller.dart';
import '../../features/planning/planning.dart';

WorkspaceEntity editorEntityFor(
  WorkspaceController controller,
  CollectionSpec spec,
  WorkspaceEntity? entity,
  Map<String, dynamic> initial,
) {
  if (entity == null || entity.version == 0) {
    if (spec.kind == 'knowledge' &&
        (entity?.text('stable_key') ?? '').isNotEmpty) {
      final existing = controller
          .items('knowledge')
          .where((e) => e.text('stable_key') == entity!.text('stable_key'));
      if (existing.isNotEmpty) return existing.first;
    }
    if (const ['profiles', 'resumes'].contains(spec.kind)) {
      final existing = controller.items(spec.kind);
      if (existing.isNotEmpty) return existing.first;
    }
    if (spec.kind == 'weekly_reviews' && initial['week_start'] != null) {
      final existing = controller
          .items(spec.kind)
          .where((e) => e.text('week_start') == initial['week_start']);
      if (existing.isNotEmpty) return existing.first;
    }
  }
  return entity ?? controller.create(spec.kind);
}

Future<void> editEntity(
  BuildContext context,
  WorkspaceController controller,
  CollectionSpec spec, {
  WorkspaceEntity? entity,
  Map<String, dynamic> initial = const {},
}) => showDialog<void>(
  context: context,
  barrierDismissible: false,
  builder: (_) => EntityEditor(
    controller: controller,
    spec: spec,
    entity: editorEntityFor(controller, spec, entity, initial),
    initial: initial,
  ),
);

class EntityEditor extends StatefulWidget {
  const EntityEditor({
    super.key,
    required this.controller,
    required this.spec,
    required this.entity,
    this.initial = const {},
  });
  final WorkspaceController controller;
  final CollectionSpec spec;
  final WorkspaceEntity entity;
  final Map<String, dynamic> initial;
  @override
  State<EntityEditor> createState() => _EntityEditorState();
}

class _EntityEditorState extends State<EntityEditor> {
  final _form = GlobalKey<FormState>();
  final _text = <String, TextEditingController>{};
  final _values = <String, dynamic>{};
  bool _busy = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    for (final field in widget.spec.fields) {
      final value =
          widget.initial[field.key] ??
          widget.entity.payload[field.key] ??
          field.initial;
      var effective =
          widget.entity.version == 0 &&
              field.key == 'active_on' &&
              value.toString().isEmpty
          ? dayKey(DateTime.now())
          : value;
      if (field.type == FieldType.date &&
          effective.toString().length >= 10 &&
          parseDay(effective.toString().substring(0, 10)) != null) {
        final parsed = DateTime.tryParse(effective.toString())?.toLocal();
        if (parsed != null) effective = dayKey(parsed);
      }
      final time = field.type == FieldType.dateTime
          ? parseTimestamp(effective.toString())?.toLocal()
          : null;
      if (time != null) {
        effective =
            '${dayKey(time)} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
      }
      _values[field.key] = effective;
      _text[field.key] = TextEditingController(text: effective.toString());
    }
  }

  @override
  void dispose() {
    for (final controller in _text.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final matches = widget.controller.all.where(
        (e) => e.id == widget.entity.id && e.deletedAt == null,
      );
      final base = matches.isEmpty ? widget.entity : matches.first;
      final payload = {...base.payload};
      final conflicts = <({String label, String mine, String remote})>[];
      for (final field in widget.spec.fields) {
        final value = switch (field.type) {
          FieldType.toggle ||
          FieldType.choice ||
          FieldType.relation => _values[field.key],
          FieldType.number =>
            field.allowDecimal
                ? num.parse(_text[field.key]!.text)
                : int.parse(_text[field.key]!.text),
          FieldType.dateTime => parseTimestamp(
            _text[field.key]!.text == _values[field.key].toString() &&
                    !widget.initial.containsKey(field.key)
                ? widget.entity.text(field.key, _text[field.key]!.text).trim()
                : _text[field.key]!.text.trim(),
          )!.toUtc().toIso8601String(),
          _ => _text[field.key]!.text.trim(),
        };
        final original = widget.entity.payload[field.key] ?? field.initial;
        final remote = base.payload[field.key] ?? field.initial;
        String comparable(Object? value) => switch (field.type) {
          FieldType.date =>
            value.toString().length >= 10 &&
                    parseDay(value.toString().substring(0, 10)) != null
                ? dayKey(
                    (DateTime.tryParse(value.toString()) ??
                            parseDay(value.toString().substring(0, 10))!)
                        .toLocal(),
                  )
                : value.toString(),
          FieldType.dateTime =>
            parseTimestamp(
                  value?.toString() ?? '',
                )?.toUtc().toIso8601String() ??
                value.toString(),
          FieldType.number =>
            num.tryParse(value.toString())?.toDouble().toString() ??
                value.toString(),
          FieldType.toggle =>
            (value == true ||
                    value == 1 ||
                    const [
                      'true',
                      '1',
                    ].contains(value.toString().toLowerCase()))
                .toString(),
          _ => value?.toString().trim() ?? '',
        };
        final changed = comparable(value) != comparable(original);
        if (base.version != widget.entity.version &&
            changed &&
            comparable(remote) != comparable(original) &&
            comparable(remote) != comparable(value)) {
          conflicts.add((
            label: field.label,
            mine: value.toString(),
            remote: remote.toString(),
          ));
        }
        if (widget.entity.version == 0 || changed) payload[field.key] = value;
      }
      if (conflicts.isNotEmpty && mounted) {
        final confirmed = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Text('合并修改'),
            content: SizedBox(
              width: 560,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('以下字段已在其他设备更新，请核对后选择。未修改的字段会保留最新内容。'),
                    for (final conflict in conflicts) ...[
                      const SizedBox(height: 18),
                      Text(
                        conflict.label,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 9),
                      const Text('云端内容'),
                      SelectableText(conflict.remote),
                      const SizedBox(height: 9),
                      const Text('当前输入'),
                      SelectableText(conflict.mine),
                    ],
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('返回核对'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('保存当前输入'),
              ),
            ],
          ),
        );
        if (confirmed != true) return;
      }
      if (widget.spec.kind == 'projects') {
        final start = parseDay(payload['start_date']?.toString() ?? '');
        final end = parseDay(payload['due_date']?.toString() ?? '');
        if (start != null && end != null && end.isBefore(start)) {
          throw const FormatException('项目截止日期不能早于开始日期。');
        }
      }
      if (widget.spec.kind == 'weekly_reviews' &&
          widget.controller
              .items('weekly_reviews')
              .any(
                (e) =>
                    e.id != base.id &&
                    e.text('week_start') == payload['week_start'],
              )) {
        throw const FormatException('该周已有总结，请取消后编辑已有记录。');
      }
      if (widget.entity.version == 0) {
        payload['created_at'] = DateTime.now().toUtc().toIso8601String();
      }
      payload['updated_at'] = DateTime.now().toUtc().toIso8601String();
      if (widget.spec.kind == 'tasks') {
        payload.putIfAbsent('done', () => false);
      }
      if (widget.spec.kind == 'learning_cards') {
        payload.putIfAbsent(
          'due_at',
          () => DateTime.now().toUtc().toIso8601String(),
        );
      }
      await widget.controller.save(base, payload);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (e is PostgrestException && e.code == '40001') {
        await widget.controller.refresh();
      }
      if (mounted) {
        setState(
          () => _error = e is PostgrestException && e.code == '40001'
              ? (widget.controller.connected
                    ? '已获取最新版本，当前输入已保留。再次保存可核对修改。'
                    : '版本冲突，暂时无法重新加载。当前输入已保留，请恢复网络后重试。')
              : errorMessage(e),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(FieldSpec field) {
    final value = _values[field.key];
    if (field.type == FieldType.toggle) {
      return SwitchListTile(
        key: ValueKey('field-${field.key}'),
        contentPadding: EdgeInsets.zero,
        title: Text(field.label),
        value:
            value == true ||
            value == 1 ||
            const ['true', '1'].contains(value.toString().toLowerCase()),
        onChanged: _busy ? null : (v) => setState(() => _values[field.key] = v),
      );
    }
    if (field.type == FieldType.choice || field.type == FieldType.relation) {
      final options = <String, String>{};
      if (field.type == FieldType.choice) {
        for (final option in field.choices) {
          options[option] =
              const {
                'none': '不重复',
                'daily': '每天',
                'weekdays': '工作日',
                'weekly': '每周',
                'manual': '手动更新',
                'auto': '随任务完成情况计算',
                'en': '英语',
                'ja': '日语',
              }[option] ??
              option;
        }
      } else {
        options[''] = '未关联';
        final relationSpec = specFor(field.relation!);
        for (final item in widget.controller.items(field.relation!)) {
          options[entityReference(item.id, item.legacyKey)] = item.text(
            relationSpec.titleKey,
            item.id,
          );
        }
      }
      if (value != null && value.toString().isNotEmpty) {
        options.putIfAbsent(value.toString(), () => value.toString());
      }
      return DropdownButtonFormField<String>(
        key: ValueKey('field-${field.key}'),
        initialValue: options.containsKey(value?.toString())
            ? value.toString()
            : options.keys.first,
        isExpanded: true,
        decoration: InputDecoration(labelText: field.label),
        items: options.entries
            .map(
              (e) => DropdownMenuItem(
                value: e.key,
                child: Text(e.value, overflow: TextOverflow.ellipsis),
              ),
            )
            .toList(),
        validator: (v) =>
            field.required && (v ?? '').isEmpty ? '请选择${field.label}' : null,
        onChanged: _busy ? null : (v) => _values[field.key] = v,
      );
    }
    final isDate = field.type == FieldType.date;
    final isTimestamp = field.type == FieldType.dateTime;
    return TextFormField(
      key: ValueKey('field-${field.key}'),
      controller: _text[field.key],
      enabled: !_busy,
      minLines: field.type == FieldType.longText ? 3 : 1,
      maxLines: field.type == FieldType.longText ? 8 : 1,
      maxLength: field.type == FieldType.longText ? 200000 : 2000,
      keyboardType: field.type == FieldType.number
          ? TextInputType.numberWithOptions(decimal: field.allowDecimal)
          : TextInputType.multiline,
      decoration: InputDecoration(
        labelText: field.label,
        counterText: '',
        hintText: isTimestamp
            ? 'YYYY-MM-DD HH:mm'
            : isDate
            ? 'YYYY-MM-DD'
            : null,
        suffixIcon: isDate || isTimestamp
            ? IconButton(
                icon: const Icon(Icons.calendar_month_outlined),
                onPressed: () async {
                  final first = DateTime(2000), last = DateTime(2100, 12, 31);
                  final parsed =
                      (isTimestamp
                          ? parseTimestamp(
                              _text[field.key]!.text.trim(),
                            )?.toLocal()
                          : parseDay(_text[field.key]!.text.trim())) ??
                      DateTime.now();
                  final initial = parsed.isBefore(first)
                      ? first
                      : parsed.isAfter(last)
                      ? last
                      : parsed;
                  final chosen = await showDatePicker(
                    context: context,
                    initialDate: initial,
                    firstDate: first,
                    lastDate: last,
                  );
                  if (chosen != null && mounted) {
                    if (isTimestamp) {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.fromDateTime(parsed),
                      );
                      if (time != null && mounted) {
                        _text[field.key]!.text =
                            '${dayKey(chosen)} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
                      }
                    } else {
                      _text[field.key]!.text = dayKey(chosen);
                    }
                  }
                },
              )
            : null,
      ),
      validator: (v) {
        if (field.required && (v ?? '').trim().isEmpty) {
          return '请输入${field.label}';
        }
        if (field.type == FieldType.number &&
            (field.allowDecimal
                    ? num.tryParse(v ?? '')
                    : int.tryParse(v ?? '')) ==
                null) {
          return field.allowDecimal ? '请输入有效数值' : '请输入整数';
        }
        if (field.key == 'progress' &&
            ((num.tryParse(v ?? '') ?? -1) < 0 ||
                (num.tryParse(v ?? '') ?? 101) > 100 ||
                !(num.tryParse(v ?? '') ?? double.nan).isFinite)) {
          return '范围为 0–100';
        }
        final text = (v ?? '').trim();
        if (widget.spec.kind == 'industry_sources' && field.key == 'url') {
          final uri = Uri.tryParse(text);
          if (uri == null ||
              uri.scheme != 'https' ||
              uri.host.isEmpty ||
              uri.userInfo.isNotEmpty ||
              uri.port != 443) {
            return '请输入不含账号密码的 HTTPS 订阅地址';
          }
        }
        if (isDate && text.isNotEmpty && parseDay(text) == null) {
          return '请输入有效日期，格式为 YYYY-MM-DD';
        }
        if (field.key == 'week_start' &&
            parseDay(text)?.weekday != DateTime.monday) {
          return '请选择该周的周一';
        }
        if (isTimestamp && parseTimestamp(text) == null) {
          return '请输入日期时间，如 2026-11-01 09:00';
        }
        return null;
      },
    );
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(
        '${widget.entity.version == 0 ? '新建' : '编辑'} · ${widget.spec.label}',
      ),
      content: SizedBox(
        width: 600,
        child: SingleChildScrollView(
          child: Form(
            key: _form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final field in widget.spec.fields)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _field(field),
                  ),
                if (_error != null)
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(_busy ? '保存中…' : '保存'),
        ),
      ],
    ),
  );
}
