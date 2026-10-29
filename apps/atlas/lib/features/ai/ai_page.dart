import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../../shared/widgets/collection_page.dart';
import '../explore/server_api.dart';
import '../workspace/workspace_controller.dart';

class AIPage extends StatefulWidget {
  const AIPage({
    super.key,
    required this.controller,
    this.client,
    this.request,
  });
  final WorkspaceController controller;
  final SupabaseClient? client;
  final Future<Map<String, dynamic>> Function(Map<String, dynamic>)? request;
  @override
  State<AIPage> createState() => _AIPageState();
}

class _AIPageState extends State<AIPage> {
  final _prompt = TextEditingController(),
      _query = TextEditingController(),
      _draft = TextEditingController();
  List<Map<String, dynamic>> _connections = [], _sources = [];
  String? _connection, _target;
  String _task = 'search', _result = '';
  Map<String, dynamic>? _proposal;
  bool _busy = false;
  @override
  void dispose() {
    _prompt.dispose();
    _query.dispose();
    _draft.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> call(Map<String, dynamic> body) =>
      widget.request?.call(body) ??
      invokeWorkspace('atlas-assistant', body, client: widget.client);
  Future<void> loadConnections() async {
    final data = await call({'action': 'connections'});
    if (mounted) {
      setState(() {
        _connections = (data['connections'] as List)
            .map((v) => Map<String, dynamic>.from(v as Map))
            .toList();
        if (!_connections.any((v) => v['id'] == _connection)) {
          _connection = _connections.isEmpty
              ? null
              : _connections.first['id'] as String;
        }
      });
    }
  }

  Future<void> addConnection() async {
    final name = TextEditingController(),
        base = TextEditingController(),
        model = TextEditingController(),
        key = TextEditingController();
    try {
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('添加个人 AI API'),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: '连接名称'),
                  ),
                  TextField(
                    controller: base,
                    decoration: const InputDecoration(
                      labelText: '兼容 Chat Completions 的 HTTPS API 根地址',
                      hintText: 'https://你的服务商/v1',
                    ),
                  ),
                  TextField(
                    controller: model,
                    decoration: const InputDecoration(labelText: '模型 ID'),
                  ),
                  TextField(
                    controller: key,
                    obscureText: true,
                    enableSuggestions: false,
                    autocorrect: false,
                    decoration: const InputDecoration(labelText: 'API Key'),
                  ),
                  const SizedBox(height: 12),
                  const Text('密钥加密保存到服务器，仅当前账号可使用。主动运行时，选中的资料片段会发送给该模型服务商。'),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => runAction(dialogContext, () async {
                await call({
                  'action': 'save_connection',
                  'name': name.text.trim(),
                  'base_url': base.text.trim(),
                  'model': model.text.trim(),
                  'api_key': key.text.trim(),
                });
                key.clear();
                await loadConnections();
                if (dialogContext.mounted) Navigator.pop(dialogContext);
              }),
              child: const Text('保存 API'),
            ),
          ],
        ),
      );
    } finally {
      Future<void>.delayed(const Duration(seconds: 1), () {
        name.dispose();
        base.dispose();
        model.dispose();
        key.dispose();
      });
    }
  }

  Future<void> ask() async {
    if (_connection == null) throw StateError('请先添加 API，或点击加载模型连接。');
    if (_prompt.text.trim().isEmpty) throw const FormatException('请输入问题或修改要求。');
    if (_task == 'rewrite' && _target == null) throw StateError('请先选择知识条目。');
    setState(() {
      _busy = true;
      _proposal = null;
      _result = '';
      _sources = [];
    });
    try {
      final data = await call({
        'prompt': _prompt.text.trim(),
        'query': _query.text.trim().isEmpty
            ? _prompt.text.trim()
            : _query.text.trim(),
        'task': _task,
        'target_id': _target,
        'connection_id': _connection,
      });
      final result = data['result'] as String;
      final sources = (data['sources'] as List)
          .map((v) => Map<String, dynamic>.from(v as Map))
          .toList();
      final proposal = data['proposal'] is Map
          ? Map<String, dynamic>.from(data['proposal'] as Map)
          : null;
      await widget.controller.save(widget.controller.create('ai_runs'), {
        'prompt': _prompt.text.trim(),
        'result': result,
        'task': _task,
        'sources': sources,
        'proposal': proposal,
        'original_content': proposal?['original_content'],
        'status': 'success',
        'finished_at': DateTime.now().toUtc().toIso8601String(),
      });
      if (mounted) {
        setState(() {
          _result = result;
          _sources = sources;
          _proposal = proposal;
          _draft.text = proposal?['content'] as String? ?? '';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> applyProposal() async {
    final proposal = _proposal;
    if (proposal == null) return;
    if (_draft.text.trim().isEmpty) throw const FormatException('正文不能为空。');
    await widget.controller.refresh();
    final rows = widget.controller
        .items('knowledge')
        .where((e) => e.id == proposal['id']);
    if (rows.isEmpty || rows.first.version != proposal['version']) {
      throw StateError('原文已被修改，请重新生成后核对。');
    }
    await widget.controller.save(rows.first, {
      ...rows.first.payload,
      'content': _draft.text,
    });
    if (mounted) setState(() => _proposal = null);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller,
        policy = RuntimePolicy.read(widget.controller.all);
    final knowledge = c.items('knowledge');
    if (_target != null && !knowledge.any((e) => e.id == _target)) {
      _target = null;
    }
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const AtlasPageHeader(
          title: 'AI 助手',
          subtitle: '连接自己的模型，检索、总结与整理个人资料。',
          eyebrow: 'YOUR PERSONAL KNOWLEDGE ASSISTANT',
        ),
        const SizedBox(height: 16),
        const Text('AI 默认关闭。个人知识库按账号保存在服务器；主动运行时仅发送本次检索或选择的资料。'),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          key: ValueKey(policy.mode),
          initialValue: policy.mode,
          decoration: const InputDecoration(labelText: '外部服务模式'),
          items: const [
            DropdownMenuItem(value: 'offline', child: Text('关闭外部来源（保留云端同步）')),
            DropdownMenuItem(value: 'public', child: Text('公开来源 · AI 关闭')),
            DropdownMenuItem(value: 'ai', child: Text('公开来源 + 主动 AI')),
          ],
          onChanged: _busy || c.saving
              ? null
              : (value) => runAction(context, () async {
                  await c.save(
                    RuntimePolicy.record(c.all) ??
                        c.create('workspace_settings'),
                    {
                      'key': 'runtime-policy',
                      'value': jsonEncode({
                        'mode': value,
                        'automaticAI': false,
                      }),
                    },
                  );
                }),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: _busy ? null : () => runAction(context, addConnection),
              icon: const Icon(Icons.add),
              label: const Text('添加 AI API'),
            ),
            TextButton(
              onPressed: _busy
                  ? null
                  : () => runAction(context, loadConnections),
              child: const Text('加载模型连接'),
            ),
          ],
        ),
        if (_connections.isNotEmpty) ...[
          DropdownButtonFormField<String>(
            key: ValueKey('connection:$_connection'),
            initialValue: _connection,
            isExpanded: true,
            decoration: const InputDecoration(labelText: '本次使用的模型'),
            items: [
              for (final item in _connections)
                DropdownMenuItem(
                  value: item['id'] as String,
                  child: Text(
                    '${item['name']} · ${item['model']}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _busy ? null : (v) => setState(() => _connection = v),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _busy
                  ? null
                  : () => runAction(context, () async {
                      await call({
                        'action': 'delete_connection',
                        'connection_id': _connection,
                      });
                      await loadConnections();
                    }),
              child: const Text('删除选中的 API 连接'),
            ),
          ),
        ],
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          key: const ValueKey('ai-task'),
          initialValue: _task,
          decoration: const InputDecoration(labelText: '任务'),
          items: const [
            DropdownMenuItem(value: 'search', child: Text('搜寻个人知识与资料')),
            DropdownMenuItem(value: 'summary', child: Text('总结资料')),
            DropdownMenuItem(value: 'rewrite', child: Text('修改知识正文（预览后保存）')),
            DropdownMenuItem(value: 'question', child: Text('自由提问')),
          ],
          onChanged: _busy
              ? null
              : (v) => setState(() {
                  _task = v!;
                  _proposal = null;
                }),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          key: ValueKey('target:$_target'),
          initialValue: _target,
          isExpanded: true,
          decoration: const InputDecoration(labelText: '指定知识条目（可选；修改时必选）'),
          items: [
            const DropdownMenuItem<String>(
              value: null,
              child: Text('按关键词检索个人资料'),
            ),
            for (final item in knowledge)
              DropdownMenuItem(
                value: item.id,
                child: Text(
                  item.text('title'),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
          onChanged: _busy
              ? null
              : (v) => setState(() {
                  _target = v;
                  _proposal = null;
                }),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _query,
          decoration: const InputDecoration(labelText: '检索关键词（空格分隔；不填使用提问文本）'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _prompt,
          minLines: 3,
          maxLines: 8,
          maxLength: 12000,
          decoration: const InputDecoration(labelText: '问题、总结要求或修改要求'),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: !policy.allowsAI || _busy
                ? null
                : () => runAction(context, ask),
            icon: const Icon(Icons.send_outlined),
            label: Text(_busy ? '正在处理…' : '运行所选任务'),
          ),
        ),
        if (_result.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: SelectableText(_result),
          ),
        for (final source in _sources)
          ListTile(
            title: Text('[${source['citation']}] ${source['title']}'),
            subtitle: Text('资料版本 ${source['version']}'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => EntityDetailPage(
                  controller: c,
                  entityId: source['id'] as String,
                ),
              ),
            ),
          ),
        if (_proposal != null) ...[
          const Divider(),
          const Text('修改预览：原文与建议正文。保存时会检查资料版本；原文保留在本次 AI 执行记录中。'),
          const SizedBox(height: 12),
          SelectableText(
            c
                .items('knowledge')
                .where((e) => e.id == _proposal!['id'])
                .map((e) => e.text('content'))
                .join(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _draft,
            minLines: 6,
            maxLines: 16,
            decoration: const InputDecoration(labelText: '建议正文（可继续编辑）'),
          ),
          Wrap(
            spacing: 12,
            children: [
              FilledButton(
                onPressed: c.saving
                    ? null
                    : () => runAction(context, applyProposal),
                child: const Text('确认保存到知识库'),
              ),
              TextButton(
                onPressed: () => setState(() => _proposal = null),
                child: const Text('放弃修改'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 24),
        Text('最近提问', style: Theme.of(context).textTheme.titleLarge),
        for (final run in c.items('ai_runs').take(10))
          ExpansionTile(
            title: Text(
              run.text('prompt'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: SelectableText(run.text('result')),
              ),
              if (run.text('original_content').isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SelectableText(
                    '修改前原文：\n${run.text('original_content')}',
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
