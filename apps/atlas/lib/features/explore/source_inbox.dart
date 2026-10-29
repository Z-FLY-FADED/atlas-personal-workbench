import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/runtime_policy.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../workspace/catalog.dart';
import '../workspace/entity.dart';
import '../workspace/workspace_controller.dart';
import 'server_api.dart';
import '../industry/industry_sources.dart';

const sourcePresets = <String, List<(String, String, String)>>{
  'career': [
    ('BOSS直聘', 'https://www.zhipin.com/', 'html'),
    ('智联招聘', 'https://www.zhaopin.com/', 'html'),
    ('国家公务员局', 'https://www.scs.gov.cn/', 'html'),
    ('人社部事业单位招聘', 'https://www.mohrss.gov.cn/', 'html'),
  ],
  'market': [('金十财经快讯', 'https://www.jin10.com/flash_newest.js', 'jin10')],
  'industry': [
    ('IT之家 · 科技资讯', 'https://www.ithome.com/rss/', 'feed'),
    ('36氪 · 科技行业', 'https://www.36kr.com/feed', 'feed'),
    (
      '央视网 · 科技报道',
      'https://news.cctv.cn/2019/07/gaiban/cmsdatainterface/page/tech_1.jsonp',
      'cctv',
    ),
    ('NVIDIA · 官方动态', 'https://blogs.nvidia.com/feed/', 'feed'),
  ],
};

class SourceInbox extends StatefulWidget {
  const SourceInbox({
    super.key,
    required this.controller,
    required this.purpose,
  });
  final WorkspaceController controller;
  final String purpose;
  @override
  State<SourceInbox> createState() => _SourceInboxState();
}

class _SourceInboxState extends State<SourceInbox> {
  bool _busy = false;
  String _query = '', _status = '', _channel = '', _topic = '';
  int _days = 0;
  bool _manage = false;
  bool belongs(WorkspaceEntity e) =>
      e.text('purpose', 'industry') == widget.purpose;
  Future<void> editSource([WorkspaceEntity? existing]) async {
    final name = TextEditingController(text: existing?.text('name'));
    final url = TextEditingController(text: existing?.text('url'));
    final keywords = TextEditingController(text: existing?.text('keywords'));
    var adapter = existing?.text('adapter', 'feed') ?? 'feed';
    var channel = existing?.text('source_channel', 'custom') ?? 'tech_wechat';
    final publisher = TextEditingController(
      text: existing?.text('publisher') ?? '',
    );
    final focus = existing == null
        ? industryTopics.toSet()
        : existing.list('focus_topics').whereType<String>().toSet();
    try {
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, update) => AlertDialog(
            title: Text(existing == null ? '添加采集来源' : '编辑来源'),
            content: SizedBox(
              width: 520,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (existing == null)
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final preset
                              in sourcePresets[widget.purpose] ??
                                  <(String, String, String)>[])
                            ActionChip(
                              label: Text(preset.$1),
                              onPressed: () => update(() {
                                name.text = preset.$1;
                                url.text = preset.$2;
                                adapter = preset.$3;
                                if (widget.purpose == 'industry') {
                                  channel =
                                      industryFeedDefaults[preset
                                          .$2]?['channel'] ??
                                      'custom';
                                  publisher.text =
                                      industryFeedDefaults[preset
                                          .$2]?['publisher'] ??
                                      preset.$1;
                                }
                              }),
                            ),
                        ],
                      ),
                    if (widget.purpose == 'industry') ...[
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final account in [
                            '机器之心',
                            '量子位',
                            '极客公园',
                            '华为',
                            '腾讯',
                            '小米',
                          ])
                            ActionChip(
                              label: Text('$account公众号'),
                              onPressed: () => update(() {
                                name.text = account;
                                publisher.text = account;
                                url.clear();
                                channel = ['华为', '腾讯', '小米'].contains(account)
                                    ? 'company_wechat'
                                    : 'tech_wechat';
                                adapter = 'feed';
                              }),
                            ),
                        ],
                      ),
                      DropdownButtonFormField<String>(
                        key: ValueKey('channel-$channel'),
                        isExpanded: true,
                        initialValue: channel,
                        decoration: const InputDecoration(labelText: '来源类别'),
                        items: [
                          for (final e in industryChannels.entries)
                            DropdownMenuItem(
                              value: e.key,
                              child: Text(e.value),
                            ),
                        ],
                        onChanged: (v) => update(() {
                          channel = v!;
                          if (wechatChannel(channel) &&
                              !['feed', 'wechat_article'].contains(adapter)) {
                            adapter = 'feed';
                          }
                        }),
                      ),
                    ],
                    TextField(
                      controller: name,
                      decoration: const InputDecoration(labelText: '来源名称'),
                    ),
                    TextField(
                      controller: url,
                      decoration: InputDecoration(
                        labelText: widget.purpose == 'industry'
                            ? 'HTTPS 订阅源 / 微信文章 / 新闻栏目网址'
                            : 'HTTPS 订阅 / 公司招聘页 / 公告列表网址',
                      ),
                    ),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      key: ValueKey(adapter),
                      initialValue: adapter,
                      items: [
                        DropdownMenuItem(
                          value: 'feed',
                          child: Text('RSS / Atom / 自建 RSSHub'),
                        ),
                        DropdownMenuItem(
                          value: 'html',
                          child: Text('公开网页 / 新闻栏目'),
                        ),
                        if (widget.purpose != 'industry')
                          const DropdownMenuItem(
                            value: 'jin10',
                            child: Text('金十快讯'),
                          ),
                        if (widget.purpose == 'industry') ...[
                          const DropdownMenuItem(
                            value: 'cctv',
                            child: Text('央视科技公开数据'),
                          ),
                          const DropdownMenuItem(
                            value: 'wechat_article',
                            child: Text('微信单篇正文直采'),
                          ),
                        ],
                      ],
                      onChanged: (v) => update(() => adapter = v!),
                      decoration: const InputDecoration(labelText: '采集方式'),
                    ),
                    if (widget.purpose == 'industry') ...[
                      TextField(
                        controller: publisher,
                        decoration: const InputDecoration(
                          labelText: '公众号 / 发布机构',
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text('关注方向（不选则收录该来源全部内容）'),
                      ),
                      Wrap(
                        spacing: 6,
                        children: [
                          for (final topic in industryTopics)
                            FilterChip(
                              label: Text(topic),
                              selected: focus.contains(topic),
                              onSelected: (v) => update(() {
                                v ? focus.add(topic) : focus.remove(topic);
                              }),
                            ),
                        ],
                      ),
                    ],
                    TextField(
                      controller: keywords,
                      decoration: const InputDecoration(
                        labelText: '关键词，空格分隔；留空收录全部',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.purpose == 'industry'
                          ? '公众号可填写已授权订阅服务的 RSS/Atom/JSON Feed 地址，或选择微信单篇正文直采。单篇不会自动发现新推文；官网动态单独标注，不替代公众号。'
                          : '招聘平台可保存具体公开搜索页；公司主页和各地人社考试公告可自定义。需要登录或验证码时使用原站入口。',
                    ),
                    if (widget.purpose == 'industry')
                      TextButton(
                        onPressed: () async {
                          final u = Uri.https('weixin.sogou.com', '/weixin', {
                            'type': '2',
                            'query': publisher.text.trim().isEmpty
                                ? name.text.trim()
                                : publisher.text.trim(),
                          });
                          await launchUrl(
                            u,
                            mode: LaunchMode.externalApplication,
                          );
                        },
                        child: const Text('打开公众号公开检索（手动核对）'),
                      ),
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
                  final uri = Uri.tryParse(url.text.trim());
                  if (name.text.trim().isEmpty ||
                      uri == null ||
                      uri.scheme != 'https' ||
                      uri.host.isEmpty) {
                    throw const FormatException('请输入名称与有效 HTTPS 地址。');
                  }
                  if (widget.purpose == 'industry' &&
                      wechatChannel(channel) &&
                      uri.host == 'mp.weixin.qq.com' &&
                      adapter != 'wechat_article') {
                    throw const FormatException(
                      '单篇微信链接请选择“微信单篇正文直采”；持续更新请填写公众号订阅源。',
                    );
                  }
                  if (widget.purpose == 'industry' &&
                      wechatChannel(channel) &&
                      !['feed', 'wechat_article'].contains(adapter)) {
                    throw const FormatException('公众号请选择 RSS 订阅源或微信单篇正文直采。');
                  }
                  await widget.controller.save(
                    existing ?? widget.controller.create('industry_sources'),
                    {
                      ...?existing?.payload,
                      'name': name.text.trim(),
                      'url': uri.toString(),
                      'adapter': adapter,
                      'purpose': widget.purpose,
                      'keywords': keywords.text.trim(),
                      'enabled': existing?.flag('enabled') ?? true,
                      if (widget.purpose == 'industry') ...{
                        'source_channel': channel,
                        'publisher': publisher.text.trim(),
                        'focus_topics': focus.toList(),
                      },
                    },
                  );
                  if (dialogContext.mounted) Navigator.pop(dialogContext);
                }),
                child: const Text('保存来源'),
              ),
            ],
          ),
        ),
      );
    } finally {
      // Dialog removal animations may still reference the controllers.
      Future<void>.delayed(const Duration(seconds: 1), () {
        name.dispose();
        url.dispose();
        keywords.dispose();
        publisher.dispose();
      });
    }
  }

  Future<void> collect() async {
    if (!RuntimePolicy.read(widget.controller.all).allowsPublic) {
      throw StateError('外部来源已关闭，请到 AI 助手页启用公开来源。');
    }
    final sources = widget.controller
        .items('industry_sources')
        .where((s) => belongs(s) && s.flag('enabled'))
        .toList();
    if (sources.isEmpty) throw StateError('请先添加并启用来源。');
    setState(() => _busy = true);
    final statuses = <String>[];
    try {
      for (final source in sources) {
        try {
          final data = await invokeWorkspace('atlas-collect', {
            'source_id': source.id,
          });
          statuses.add('${source.text('name')}：${data['message']}');
        } catch (e) {
          statuses.add('${source.text('name')}：$e');
        }
        if (mounted) setState(() => _status = statuses.join('\n'));
      }
      await widget.controller.refresh();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> addRecommended() async {
    final known = widget.controller
        .items('industry_sources')
        .map((e) => e.text('url'))
        .toSet();
    final rows = <Map<String, dynamic>>[];
    for (final preset in sourcePresets['industry']!) {
      if (known.contains(preset.$2)) continue;
      final meta = industryFeedDefaults[preset.$2]!;
      rows.add({
        'kind': 'industry_sources',
        'legacy_key': 'industry-default:${preset.$2}',
        'payload': {
          'name': preset.$1,
          'url': preset.$2,
          'adapter': preset.$3,
          'purpose': 'industry',
          'enabled': true,
          'source_channel': meta['channel'],
          'publisher': meta['publisher'],
          'focus_topics': industryTopics,
        },
      });
    }
    if (rows.isNotEmpty) await widget.controller.importRows(rows);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final unsortedArticles = c
        .items('industry_articles')
        .where(
          (e) =>
              belongs(e) &&
              e.payload.values
                  .join(' ')
                  .toLowerCase()
                  .contains(_query.toLowerCase()),
        )
        .toList();
    final articles = widget.purpose == 'industry'
        ? industryArticles(
            unsortedArticles,
            channel: _channel,
            topic: _topic,
            days: _days,
          )
        : unsortedArticles;
    final sources = c.items('industry_sources').where(belongs).toList();
    final runs = c.items('industry_ingestion_runs').where(belongs).take(10);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: [
            FilledButton.icon(
              onPressed: _busy ? null : () => runAction(context, collect),
              icon: const Icon(Icons.refresh),
              label: Text(_busy ? '采集中…' : '更新来源'),
            ),
            OutlinedButton.icon(
              onPressed: () => editSource(),
              icon: const Icon(Icons.add),
              label: const Text('添加来源'),
            ),
            if (widget.purpose == 'industry')
              OutlinedButton(
                onPressed: widget.controller.saving
                    ? null
                    : () => runAction(context, addRecommended),
                child: const Text('添加推荐新闻源'),
              ),
            FilterChip(
              selected: _manage,
              onSelected: (v) => setState(() => _manage = v),
              label: const Text('来源与采集记录'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          widget.purpose == 'industry'
              ? '关注 AI、机器人、智能制造、新能源。公众号、官网与新闻频道分别标注，按发布时间排列。'
              : '采集结果保存到个人云端空间。显示原文来源与采集时间；动态网页可能无法直接提取。',
        ),
        if (widget.purpose == 'industry') ...[
          if (sources.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                '添加科技/大厂公众号订阅源，或粘贴微信文章直采；新闻可使用 IT之家、36氪、央视科技和 NVIDIA 官方动态模板。',
              ),
            ),
          Wrap(
            spacing: 6,
            children: [
              ChoiceChip(
                label: const Text('全部方向'),
                selected: _topic.isEmpty,
                onSelected: (_) => setState(() => _topic = ''),
              ),
              for (final topic in industryTopics)
                ChoiceChip(
                  label: Text(topic),
                  selected: _topic == topic,
                  onSelected: (_) => setState(() => _topic = topic),
                ),
            ],
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            key: ValueKey('inbox-channel-$_channel'),
            initialValue: _channel,
            isExpanded: true,
            decoration: const InputDecoration(labelText: '按来源类别查看'),
            items: [
              const DropdownMenuItem(value: '', child: Text('全部来源')),
              for (final e in industryChannels.entries)
                DropdownMenuItem(value: e.key, child: Text(e.value)),
            ],
            onChanged: (v) => setState(() => _channel = v!),
          ),
          Wrap(
            spacing: 6,
            children: [
              for (final option in [
                (0, '不限时间'),
                (1, '近24小时'),
                (7, '近7天'),
                (30, '近30天'),
              ])
                ChoiceChip(
                  label: Text(option.$2),
                  selected: _days == option.$1,
                  onSelected: (_) => setState(() => _days = option.$1),
                ),
            ],
          ),
          Text('显示 ${articles.length} 条 · 发布时间未知的文章不计入“近期”筛选'),
        ],
        if (_status.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: SelectableText(_status),
          ),
        if (_manage) ...[
          for (final source in sources)
            Card(
              child: ListTile(
                title: Text(source.text('name')),
                subtitle: Text(
                  widget.purpose == 'industry'
                      ? '${industryChannels[source.text('source_channel', 'custom')]} · ${source.text('adapter') == 'wechat_article' ? '单篇直采，不发现新推文' : '持续订阅 / 栏目采集'}\n${source.text('url')}'
                      : source.text('url'),
                ),
                leading: Checkbox(
                  value: source.flag('enabled'),
                  onChanged: _busy
                      ? null
                      : (v) => runAction(
                          context,
                          () =>
                              c.save(source, {...source.payload, 'enabled': v}),
                        ),
                ),
                trailing: Wrap(
                  children: [
                    IconButton(
                      tooltip: '编辑来源',
                      onPressed: () => editSource(source),
                      icon: const Icon(Icons.edit_outlined),
                    ),
                    IconButton(
                      tooltip: '移至回收站',
                      onPressed: () =>
                          runAction(context, () => c.delete(source)),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              ),
            ),
          for (final run in runs)
            ListTile(
              title: Text('${run.text('source_name')} · ${run.text('status')}'),
              subtitle: Text(
                '${run.text('finished_at')}\n${run.text('message')}',
              ),
            ),
        ],
        const SizedBox(height: 12),
        TextField(
          decoration: InputDecoration(
            labelText: widget.purpose == 'industry'
                ? '搜索文章、公众号、发布机构、正文'
                : '搜索标题、公司、地点、正文',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() => _query = v),
        ),
        const SizedBox(height: 12),
        if (articles.isEmpty)
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text('暂无采集结果。添加来源后更新，或调整搜索关键词。'),
          ),
        for (final item in articles)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.text('title'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    widget.purpose == 'industry'
                        ? '${industryChannels[item.text('source_channel', 'custom')]} · ${item.text('publisher', item.text('source_name'))}\n发布时间：${industryPublishedAt(item.text('published_at'))?.toLocal().toString().split('.').first ?? '未知'} · 采集：${item.text('fetched_at', '未知')}'
                        : '${item.text('source_name')} · ${item.text('record_type')}\n发布时间：${item.text('published_at', '未知')} · 采集：${item.text('fetched_at', '未知')}',
                  ),
                  if (item.text('deadline').isNotEmpty)
                    Text('截止：${item.text('deadline')}'),
                  if (widget.purpose == 'career')
                    Text('简历命中：${_matches(item)}'),
                  const SizedBox(height: 8),
                  Text(
                    item.text('summary'),
                    maxLines: 6,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Wrap(
                    spacing: 8,
                    children: [
                      TextButton(
                        onPressed: () => runAction(context, () async {
                          final u = Uri.tryParse(item.text('canonical_url'));
                          if (u != null &&
                              ['https', 'http'].contains(u.scheme)) {
                            await launchUrl(
                              u,
                              mode: LaunchMode.externalApplication,
                            );
                          }
                        }),
                        child: const Text('查看原文'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => EntityDetailPage(
                              controller: c,
                              entityId: item.id,
                            ),
                          ),
                        ),
                        child: const Text('阅读全文与编辑'),
                      ),
                      TextButton(
                        onPressed: () => editEntity(
                          context,
                          c,
                          specFor('knowledge'),
                          initial: {
                            'title': item.text('title'),
                            'content': item.text(
                              'content_excerpt',
                              item.text('summary'),
                            ),
                            'source': item.text('canonical_url'),
                            'source_type': '行业资讯',
                          },
                        ),
                        child: const Text('收录知识库'),
                      ),
                      if (widget.purpose == 'career')
                        TextButton(
                          onPressed: () => editEntity(
                            context,
                            c,
                            specFor('applications'),
                            initial: {
                              'company': item.text(
                                'company',
                                item.text('source_name'),
                              ),
                              'role': item.text('role', item.text('title')),
                              'channel': item.text('canonical_url'),
                              'status': '待投递',
                            },
                          ),
                          child: const Text('记录投递'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  String _matches(WorkspaceEntity item) {
    final resume = widget.controller
        .items('resumes')
        .map((e) => e.text('content'))
        .join(' ')
        .toLowerCase();
    final text = item.payload.values.join(' ').toLowerCase();
    final words = [
      '机械',
      '电气',
      '自动化',
      '研发',
      '测试',
      'matlab',
      'python',
      'solidworks',
      'java',
      'flutter',
      '硕士',
      '本科',
    ];
    final matches = words.where((w) => text.contains(w) && resume.contains(w));
    return matches.isEmpty ? '暂无共同关键词' : matches.join('、');
  }
}
