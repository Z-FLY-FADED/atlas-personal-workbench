import 'package:flutter/material.dart';
import '../explore/source_inbox.dart';
import '../../shared/models/list_filters.dart';
import '../../shared/widgets/list_filter_button.dart';
import 'career_filters.dart';
import '../../shared/widgets/atlas_widgets.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/asset_catalog.dart';
import '../../shared/document_import.dart';
import '../../shared/widgets/collection_page.dart';
import '../../shared/widgets/entity_editor.dart';
import '../workspace/catalog.dart';
import '../workspace/workspace_controller.dart';

class CareerPage extends StatefulWidget {
  const CareerPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  State<CareerPage> createState() => _CareerPageState();
}

class _CareerPageState extends State<CareerPage> {
  final _catalog = AssetCatalog.load();
  String _query = '';
  ListFilters _filters = const ListFilters();
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 5,
    child: Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 17),
          child: AtlasPageHeader(
            title: '职业与机会',
            subtitle: '整理自己的经历，让每一次投递都有准备。',
            eyebrow: 'YOUR NEXT CHAPTER',
          ),
        ),
        const TabBar(
          isScrollable: true,
          tabs: [
            Tab(text: '投递记录'),
            Tab(text: '实时岗位与公告'),
            Tab(text: '岗位与匹配'),
            Tab(text: '主简历'),
            Tab(text: '简历版本'),
          ],
        ),
        Expanded(
          child: TabBarView(
            children: [
              CollectionPage(
                embedded: true,
                controller: widget.controller,
                kind: 'applications',
              ),
              SourceInbox(controller: widget.controller, purpose: 'career'),
              FutureBuilder<Map<String, dynamic>>(
                future: _catalog,
                initialData: AssetCatalog.cached,
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final resumes = widget.controller.items('resumes');
                  final resume = resumes.isEmpty
                      ? ''
                      : resumes.first.text('content');
                  final skills = (snapshot.data!['skills'] as List)
                      .cast<String>();
                  final allJobs = (snapshot.data!['jobs'] as List).cast<Map>();
                  final jobs =
                      (snapshot.data!['jobs'] as List)
                          .cast<Map>()
                          .where(
                            (job) => job.values
                                .join(' ')
                                .toLowerCase()
                                .contains(_query.toLowerCase()),
                          )
                          .map((job) {
                            final text =
                                '${job['role']} ${job['industry']} ${job['function']} ${job['tags']} ${job['summary']}'
                                    .toLowerCase();
                            final desired = skills
                                .where(
                                  (skill) => text.contains(skill.toLowerCase()),
                                )
                                .toList();
                            final matched = desired
                                .where(
                                  (skill) => resume.toLowerCase().contains(
                                    skill.toLowerCase(),
                                  ),
                                )
                                .toList();
                            return (
                              job: job,
                              matched: matched,
                              missing: desired
                                  .where((skill) => !matched.contains(skill))
                                  .toList(),
                            );
                          })
                          .where(
                            (item) => matchesJob(
                              item.job,
                              _filters,
                              matched: item.matched.length,
                              missing: item.missing.length,
                            ),
                          )
                          .toList()
                        ..sort(
                          (a, b) =>
                              b.matched.length.compareTo(a.matched.length),
                        );
                  return Column(
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
                        child: Text(
                          '保留原项目岗位目录。开放状态、条件和截止日期请以企业官网为准。匹配按简历关键词计算。',
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: TextField(
                          decoration: const InputDecoration(
                            labelText: '搜索公司、岗位与技能',
                            prefixIcon: Icon(Icons.search),
                          ),
                          onChanged: (v) => setState(() => _query = v),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                        child: Wrap(
                          spacing: 12,
                          runSpacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            ListFilterButton(
                              title: '岗位与匹配',
                              filters: _filters,
                              fields: [
                                FilterField(
                                  'industry',
                                  '行业',
                                  filterOptions(
                                    allJobs.map((e) => e['industry']),
                                  ),
                                ),
                                FilterField(
                                  'function',
                                  '职能',
                                  filterOptions(
                                    allJobs.map((e) => e['function']),
                                  ),
                                ),
                                FilterField(
                                  'location',
                                  '工作地点',
                                  filterOptions(
                                    allJobs.expand(
                                      (e) =>
                                          (e['locations'] as List? ?? const []),
                                    ),
                                  ),
                                ),
                                FilterField(
                                  'education',
                                  '学历要求',
                                  filterOptions(
                                    allJobs.map((e) => e['education']),
                                  ),
                                ),
                                FilterField(
                                  'organizationType',
                                  '单位类型',
                                  filterOptions(
                                    allJobs.map((e) => e['organizationType']),
                                  ),
                                ),
                                const FilterField('match', '简历匹配', [
                                  FilterOption('matched', '有关键词匹配'),
                                  FilterOption('complete', '全部要求关键词已命中'),
                                  FilterOption('missing', '有待补充关键词'),
                                  FilterOption('none', '无关键词匹配'),
                                ]),
                              ],
                              onChanged: (value) =>
                                  setState(() => _filters = value),
                            ),
                            Text('显示 ${jobs.length} / ${allJobs.length} 个岗位'),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          children: [
                            if (jobs.isEmpty)
                              const Padding(
                                padding: EdgeInsets.all(20),
                                child: Text('没有匹配的岗位，请调整搜索或筛选条件。'),
                              ),
                            for (final item in jobs)
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${item.job['company']} · ${item.job['role']}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleLarge,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(item.job['summary'].toString()),
                                      const SizedBox(height: 8),
                                      Text(
                                        '匹配：${item.matched.isEmpty ? '暂无' : item.matched.join('、')}',
                                      ),
                                      Text(
                                        '待补充：${item.missing.isEmpty ? '暂无' : item.missing.join('、')}',
                                      ),
                                      const SizedBox(height: 12),
                                      Wrap(
                                        spacing: 10,
                                        runSpacing: 10,
                                        children: [
                                          OutlinedButton.icon(
                                            onPressed: () async {
                                              final url = Uri.tryParse(
                                                item.job['applyUrl'].toString(),
                                              );
                                              if (url != null &&
                                                  url.scheme == 'https') {
                                                await launchUrl(
                                                  url,
                                                  mode: LaunchMode
                                                      .externalApplication,
                                                );
                                              }
                                            },
                                            icon: const Icon(Icons.open_in_new),
                                            label: const Text('企业原始链接'),
                                          ),
                                          OutlinedButton(
                                            onPressed: () => editEntity(
                                              context,
                                              widget.controller,
                                              specFor('applications'),
                                              initial: {
                                                'company': item.job['company'],
                                                'role': item.job['role'],
                                                'channel': item.job['applyUrl'],
                                                'status': '待投递',
                                              },
                                            ),
                                            child: const Text('记录投递'),
                                          ),
                                          OutlinedButton(
                                            onPressed: () => editEntity(
                                              context,
                                              widget.controller,
                                              specFor('resume_versions'),
                                              initial: {
                                                'title':
                                                    '${item.job['company']}-${item.job['role']}',
                                                'company': item.job['company'],
                                                'role': item.job['role'],
                                                'content': resume,
                                              },
                                            ),
                                            child: const Text('建立岗位简历'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: OutlinedButton.icon(
                      onPressed: () => runAction(context, () async {
                        final document = await importDocument();
                        if (document == null || !context.mounted) return;
                        await editEntity(
                          context,
                          widget.controller,
                          specFor('resumes'),
                          initial: {
                            'file_name': document.name,
                            'content': document.content,
                          },
                        );
                      }),
                      icon: const Icon(Icons.upload_file),
                      label: const Text('导入 Word / TXT / Markdown'),
                    ),
                  ),
                  Expanded(
                    child: CollectionPage(
                      embedded: true,
                      controller: widget.controller,
                      kind: 'resumes',
                    ),
                  ),
                ],
              ),
              CollectionPage(
                embedded: true,
                controller: widget.controller,
                kind: 'resume_versions',
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
