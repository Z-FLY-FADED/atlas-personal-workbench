import 'package:flutter/material.dart';
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
  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 4,
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
              FutureBuilder<Map<String, dynamic>>(
                future: _catalog,
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
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          children: [
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
