import 'dart:convert';
import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/collection_page.dart';
import '../workspace/workspace_controller.dart';

class AIPage extends StatefulWidget {
  const AIPage({super.key, required this.controller, required this.client});
  final WorkspaceController controller;
  final SupabaseClient client;
  @override
  State<AIPage> createState() => _AIPageState();
}

class _AIPageState extends State<AIPage> {
  final _prompt = TextEditingController();
  String _result = '';
  bool _busy = false;
  @override
  void dispose() {
    _prompt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final policy = RuntimePolicy.read(widget.controller.all);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const AtlasPageHeader(
          title: 'AI 助手',
          subtitle: '整理表达，打开思路。按需启用，保持自己的判断。',
          eyebrow: 'A LITTLE HELP WITH YOUR IDEAS',
        ),
        const SizedBox(height: 16),
        const Text('AI 默认关闭。启用后，仅主动发送的提问会交给模型服务。'),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          key: ValueKey(policy.mode),
          initialValue: policy.mode,
          decoration: const InputDecoration(labelText: '外部服务模式'),
          items: const [
            DropdownMenuItem(value: 'offline', child: Text('关闭外部来源（保留云端同步）')),
            DropdownMenuItem(value: 'public', child: Text('公开来源 · AI 关闭')),
            DropdownMenuItem(value: 'ai', child: Text('公开来源 + 主动 AI')),
          ],
          onChanged: widget.controller.saving
              ? null
              : (value) => runAction(context, () async {
                  final record =
                      RuntimePolicy.record(widget.controller.all) ??
                      widget.controller.create('workspace_settings');
                  await widget.controller.save(record, {
                    'key': 'runtime-policy',
                    'value': jsonEncode({'mode': value, 'automaticAI': false}),
                  });
                }),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _prompt,
          minLines: 4,
          maxLines: 10,
          maxLength: 12000,
          decoration: const InputDecoration(labelText: '输入你的问题'),
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: !policy.allowsAI || _busy
                ? null
                : () => runAction(context, () async {
                    if (_prompt.text.trim().isEmpty) {
                      throw const FormatException('请输入问题。');
                    }
                    setState(() => _busy = true);
                    try {
                      final prompt = _prompt.text.trim();
                      final response = await widget.client.functions
                          .invoke('atlas-assistant', body: {'prompt': prompt})
                          .timeout(const Duration(seconds: 60));
                      final data = response.data;
                      if (data is! Map || data['result'] is! String) {
                        throw StateError('AI 服务未返回有效内容，请检查 Edge Function 配置。');
                      }
                      if (mounted) {
                        setState(() => _result = data['result'] as String);
                      }
                      await widget.controller
                          .save(widget.controller.create('ai_runs'), {
                            'prompt': prompt,
                            'result': _result,
                            'status': 'success',
                            'finished_at': DateTime.now()
                                .toUtc()
                                .toIso8601String(),
                          });
                    } on FunctionException catch (e) {
                      throw StateError(
                        e.details is Map
                            ? (e.details['error'] ?? 'AI 服务未就绪').toString()
                            : 'AI 服务未就绪，请部署 atlas-assistant 并配置模型。',
                      );
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  }),
            icon: const Icon(Icons.send_outlined),
            label: Text(_busy ? '正在生成…' : '发送问题'),
          ),
        ),
        const SizedBox(height: 24),
        if (_result.isNotEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: SelectableText(_result),
            ),
          ),
        const SizedBox(height: 24),
        Text('最近提问', style: Theme.of(context).textTheme.titleLarge),
        for (final run in widget.controller.items('ai_runs').take(10))
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
            ],
          ),
      ],
    );
  }
}
