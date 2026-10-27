import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/widgets/collection_page.dart';
import '../auth/auth_service.dart';
import '../data/data_page.dart';
import '../learning/learning_page.dart';
import '../learning/language_hub_page.dart';
import '../reviews/reviews_page.dart';
import '../research/research_page.dart';
import '../industry/industry_page.dart';
import '../ai/ai_page.dart';
import '../knowledge/knowledge_page.dart';
import '../career/career_page.dart';
import '../market/market_page.dart';
import '../updates/update_page.dart';
import '../updates/update_backup.dart';
import '../../core/config/app_config.dart';
import '../../shared/file_io.dart';
import 'dashboard_page.dart';
import 'workspace_controller.dart';
import 'workspace_frame.dart';
import 'workspace_repository.dart';

class WorkspaceShell extends StatefulWidget {
  const WorkspaceShell({super.key, required this.client, required this.userId});
  final SupabaseClient client;
  final String userId;
  @override
  State<WorkspaceShell> createState() => _WorkspaceShellState();
}

class _WorkspaceShellState extends State<WorkspaceShell>
    with WidgetsBindingObserver {
  late final WorkspaceController _controller;
  late final UpdateProtection _updateProtection;
  String _page = 'home';
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = WorkspaceController(
      SupabaseWorkspaceRepository(widget.client, widget.userId),
    );
    _updateProtection = UpdateProtection(
      _controller,
      UpdateBackupStore(
        scope: '${Uri.parse(AppConfig.environment.url).host}|${widget.userId}',
      ),
    );
    unawaited(_controller.start());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_controller.refresh());
  }

  String get _userName {
    final profile = _controller.items('profiles');
    if (profile.isNotEmpty &&
        profile.first.text('display_name').trim().isNotEmpty) {
      return profile.first.text('display_name').trim();
    }
    final metadata = widget.client.auth.currentUser?.userMetadata;
    return (metadata?['display_name'] ?? metadata?['username'] ?? '我的空间')
        .toString();
  }

  void _navigate(String page) => setState(() => _page = page);
  Future<String> _prepareUpdate() async {
    final receipt = await _updateProtection.prepare();
    return '已完成更新前加密备份，共 ${receipt.records} 条记录。';
  }

  Future<bool> _exportUpdateBackup() async {
    await _updateProtection.prepare();
    if (!mounted) return false;
    final bytes = await _updateProtection.store.readLatest();
    if (!mounted) return false;
    return saveFile(
      'WorkSpace-update-backup-${DateTime.now().millisecondsSinceEpoch}.json',
      bytes,
    );
  }

  Widget _content() => switch (_page) {
    'knowledge' => KnowledgePage(controller: _controller),
    'home' => DashboardPage(
      key: const ValueKey('home'),
      controller: _controller,
      userName: _userName,
      onNavigate: _navigate,
    ),
    'data' => DataPage(controller: _controller, userId: widget.userId),
    'updates' => AppUpdatePage(
      beforeDownload: _prepareUpdate,
      exportBackup: _exportUpdateBackup,
    ),
    'languages' => LanguageHubPage(
      controller: _controller,
      onNavigate: _navigate,
    ),
    'en' || 'ja' => LanguageFeatureFrame(
      key: ValueKey(_page),
      language: _page,
      onNavigate: _navigate,
      child: LearningPage(
        controller: _controller,
        client: widget.client,
        language: _page,
      ),
    ),
    'weekly_reviews' => ReviewsPage(controller: _controller),
    'research' => ResearchPage(controller: _controller),
    'industry_articles' => IndustryPage(controller: _controller),
    'ai' => AIPage(controller: _controller, client: widget.client),
    'applications' => CareerPage(controller: _controller),
    'watchlist_items' => MarketPage(controller: _controller),
    _ => CollectionPage(
      key: ValueKey(_page),
      controller: _controller,
      kind: _page,
    ),
  };
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _controller,
    builder: (context, _) => WorkspaceFrame(
      controller: _controller,
      page: _page,
      userName: _userName.isEmpty ? '我的空间' : _userName,
      onNavigate: _navigate,
      onLogout: () =>
          runAction(context, () => AuthService(widget.client).logout()),
      child: _content(),
    ),
  );
}
