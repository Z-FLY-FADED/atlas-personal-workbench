import 'package:flutter/material.dart';
import '../../core/theme/atlas_theme.dart';
import '../../shared/error_message.dart';
import '../../shared/widgets/atlas_widgets.dart';
import 'auth_service.dart';
import '../updates/update_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.auth});
  final AuthService auth;
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  bool _registering = false;
  String? _error;
  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_registering) {
        await widget.auth.register(_username.text, _password.text);
      } else {
        await widget.auth.login(_username.text, _password.text);
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-.8, -.6),
          radius: 1.5,
          colors: [Color(0xFFF1E4D1), AtlasColors.background],
        ),
      ),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 920;
            return SingleChildScrollView(
              padding: EdgeInsets.all(wide ? 48 : 20),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: (constraints.maxHeight - (wide ? 96 : 40)).clamp(
                    0,
                    double.infinity,
                  ),
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1120),
                    child: wide
                        ? Row(
                            children: [
                              const Expanded(child: _WelcomeStory()),
                              const SizedBox(width: 72),
                              SizedBox(width: 424, child: _formCard(context)),
                            ],
                          )
                        : ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 440),
                            child: Column(
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 12, bottom: 30),
                                  child: AtlasBrand(),
                                ),
                                _formCard(context),
                                const Padding(
                                  padding: EdgeInsets.only(top: 26),
                                  child: Text(
                                    '专注当下，让成长有迹可循。',
                                    style: TextStyle(
                                      color: AtlasColors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ),
  );

  Widget _formCard(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: EdgeInsets.all(MediaQuery.sizeOf(context).width < 500 ? 24 : 32),
      child: AutofillGroup(
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _registering ? '开启新的旅程' : '继续你的进展',
                style: const TextStyle(
                  fontSize: 11,
                  color: AtlasColors.gold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                _registering ? '创建你的账号' : '欢迎回来',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                '在电脑和手机上，接续同一份工作。',
                style: TextStyle(color: AtlasColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 28),
              SegmentedButton<bool>(
                showSelectedIcon: false,
                style: SegmentedButton.styleFrom(
                  minimumSize: const Size(0, 46),
                ),
                segments: const [
                  ButtonSegment(value: false, label: Text('登录')),
                  ButtonSegment(value: true, label: Text('注册')),
                ],
                selected: {_registering},
                onSelectionChanged: _busy
                    ? null
                    : (selection) => setState(() {
                        _registering = selection.first;
                        _error = null;
                      }),
              ),
              const SizedBox(height: 26),
              TextFormField(
                controller: _username,
                enabled: !_busy,
                autofillHints: const [AutofillHints.username],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: '用户名',
                  hintText: '中文、字母、数字或下划线',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) => !_registering && (v ?? '').contains('@')
                    ? null
                    : AuthService.usernameError(v ?? ''),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _password,
                enabled: !_busy,
                autofillHints: [
                  _registering
                      ? AutofillHints.newPassword
                      : AutofillHints.password,
                ],
                obscureText: _obscure,
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: '密码',
                  hintText: _registering ? '至少8个字符' : null,
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    tooltip: _obscure ? '显示密码' : '隐藏密码',
                    onPressed: () => setState(() => _obscure = !_obscure),
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
                validator: (v) => _registering
                    ? AuthService.passwordError(v ?? '')
                    : (v ?? '').isEmpty
                    ? '请输入密码'
                    : null,
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.error.withValues(alpha: .08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(_registering ? '注册并进入工作台' : '登录'),
                          const SizedBox(width: 12),
                          const Icon(Icons.arrow_forward_rounded, size: 18),
                        ],
                      ),
              ),
              const SizedBox(height: 20),
              Text(
                _registering ? '只需用户名和密码。请记住这两个信息。' : '同一用户名可在电脑和手机登录，数据按账号隔离。',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => Scaffold(
                            appBar: AppBar(title: const Text('WorkSpace')),
                            body: const AppUpdatePage(),
                          ),
                        ),
                      ),
                child: const Text('关于与更新'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _WelcomeStory extends StatelessWidget {
  const _WelcomeStory();
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const AtlasBrand(),
      const SizedBox(height: 38),
      const Text(
        '让生活有一点秩序，\n也让想法有处安放。',
        style: TextStyle(
          fontSize: 38,
          height: 1.5,
          fontWeight: FontWeight.w600,
          letterSpacing: -.8,
          color: AtlasColors.text,
        ),
      ),
      const SizedBox(height: 18),
      const Text(
        '在计划、记录和学习之间，\n找到自己的节奏。',
        style: TextStyle(fontSize: 14, color: AtlasColors.muted, height: 1.9),
      ),
      const SizedBox(height: 12),
      const Align(
        alignment: Alignment.center,
        child: SizedBox(width: 330, height: 210, child: AtlasPaperArt()),
      ),
      const SizedBox(height: 12),
      const Divider(),
      const SizedBox(height: 22),
      Row(
        children: [
          for (final item in [
            (Icons.check_circle_outline, '有序计划', AtlasColors.gold),
            (Icons.auto_stories_outlined, '自在学习', AtlasColors.blue),
            (Icons.spa_outlined, '慢慢成长', AtlasColors.teal),
          ])
            Expanded(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(item.$1, color: item.$3, size: 18),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      item.$2,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AtlasColors.muted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      const SizedBox(height: 28),
      const Row(
        children: [
          Icon(Icons.devices_outlined, size: 16, color: AtlasColors.muted),
          SizedBox(width: 9),
          Text(
            'Windows 与 Android，接续同一份日常。',
            style: TextStyle(fontSize: 11, color: AtlasColors.muted),
          ),
        ],
      ),
    ],
  );
}
