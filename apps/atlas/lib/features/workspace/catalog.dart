import 'package:flutter/material.dart';

enum FieldType {
  text,
  longText,
  choice,
  number,
  date,
  dateTime,
  toggle,
  relation,
}

class FieldSpec {
  const FieldSpec(
    this.key,
    this.label, {
    this.type = FieldType.text,
    this.required = false,
    this.initial = '',
    this.choices = const [],
    this.relation,
    this.allowDecimal = false,
  });
  final String key, label;
  final FieldType type;
  final bool required;
  final bool allowDecimal;
  final Object initial;
  final List<String> choices;
  final String? relation;
}

class CollectionSpec {
  const CollectionSpec(
    this.kind,
    this.label,
    this.icon,
    this.titleKey,
    this.fields, {
    this.subtitleKey = '',
  });
  final String kind, label, titleKey, subtitleKey;
  final IconData icon;
  final List<FieldSpec> fields;
}

const collections = <CollectionSpec>[
  CollectionSpec('tasks', '个人任务', Icons.check_circle_outline, 'title', [
    FieldSpec('title', '任务名称', required: true),
    FieldSpec('detail', '任务说明', type: FieldType.longText),
    FieldSpec(
      'priority',
      '优先级',
      type: FieldType.choice,
      initial: '一般',
      choices: ['优先', '一般', '不重要'],
    ),
    FieldSpec(
      'horizon',
      '计划范围',
      type: FieldType.choice,
      initial: '今日',
      choices: ['今日', '本周', '年度'],
    ),
    FieldSpec('active_on', '执行日期', type: FieldType.date),
    FieldSpec('date', '截止日期', type: FieldType.date),
    FieldSpec(
      'repeat_rule',
      '重复',
      type: FieldType.choice,
      initial: 'none',
      choices: ['none', 'daily', 'weekdays', 'weekly'],
    ),
    FieldSpec(
      'project_id',
      '所属项目',
      type: FieldType.relation,
      relation: 'projects',
    ),
  ], subtitleKey: 'detail'),
  CollectionSpec('projects', '项目', Icons.folder_outlined, 'title', [
    FieldSpec('title', '项目名称', required: true),
    FieldSpec('stage', '阶段', initial: '规划中'),
    FieldSpec(
      'status',
      '状态',
      type: FieldType.choice,
      initial: '进行中',
      choices: ['进行中', '已暂停', '已完成'],
    ),
    FieldSpec(
      'progress',
      '进度（0–100）',
      type: FieldType.number,
      initial: 0,
      allowDecimal: true,
    ),
    FieldSpec(
      'progress_mode',
      '进度计算',
      type: FieldType.choice,
      initial: 'manual',
      choices: ['manual', 'auto'],
    ),
    FieldSpec('start_date', '开始日期', type: FieldType.date),
    FieldSpec('due_date', '截止日期', type: FieldType.date),
    FieldSpec('next_milestone', '下一里程碑'),
    FieldSpec('milestone_date', '里程碑日期', type: FieldType.date),
  ], subtitleKey: 'next_milestone'),
  CollectionSpec('quick_notes', '笔记', Icons.edit_note, 'content', [
    FieldSpec('content', '笔记内容', type: FieldType.longText, required: true),
    FieldSpec(
      'status',
      '整理状态',
      type: FieldType.choice,
      initial: '待整理',
      choices: ['待整理', '已整理', '已归档'],
    ),
  ], subtitleKey: 'status'),
  CollectionSpec('knowledge', '知识库', Icons.auto_stories_outlined, 'title', [
    FieldSpec('title', '资料标题', required: true),
    FieldSpec('summary', '摘要', type: FieldType.longText),
    FieldSpec('content', '正文', type: FieldType.longText),
    FieldSpec('primary_category', '一级分类', initial: '通用'),
    FieldSpec('secondary_category', '二级分类', initial: '未分类'),
    FieldSpec('source', '来源'),
    FieldSpec(
      'source_type',
      '收录方式',
      type: FieldType.choice,
      initial: '手动输入',
      choices: ['手动输入', '文档', '网址', '行业资讯'],
    ),
  ], subtitleKey: 'summary'),
  CollectionSpec('reminders', '提醒', Icons.notifications_none, 'title', [
    FieldSpec('title', '提醒内容', required: true),
    FieldSpec(
      'remind_at',
      '提醒时间',
      required: true,
      initial: '',
      type: FieldType.dateTime,
    ),
    FieldSpec('done', '已完成', type: FieldType.toggle, initial: false),
  ], subtitleKey: 'remind_at'),
  CollectionSpec('applications', '简历投递', Icons.work_outline, 'company', [
    FieldSpec('company', '公司', required: true),
    FieldSpec('role', '岗位', required: true),
    FieldSpec(
      'status',
      '进展',
      type: FieldType.choice,
      initial: '待投递',
      choices: ['待投递', '已投递', '笔试', '面试', 'Offer', '结束'],
    ),
    FieldSpec('channel', '渠道', initial: '手动记录'),
    FieldSpec('applied_at', '投递日期', type: FieldType.date),
    FieldSpec('next_action', '下一步', initial: '等待反馈'),
    FieldSpec('notes', '备注', type: FieldType.longText),
  ], subtitleKey: 'role'),
  CollectionSpec('resumes', '主简历', Icons.badge_outlined, 'file_name', [
    FieldSpec('file_name', '简历名称', required: true),
    FieldSpec('content', '简历正文', type: FieldType.longText, required: true),
  ], subtitleKey: 'content'),
  CollectionSpec('resume_versions', '简历版本', Icons.history_edu, 'title', [
    FieldSpec('title', '版本名称', required: true),
    FieldSpec('company', '公司'),
    FieldSpec('role', '岗位'),
    FieldSpec('content', '正文', type: FieldType.longText, required: true),
    FieldSpec('change_note', '修改说明', type: FieldType.longText),
  ], subtitleKey: 'role'),
  CollectionSpec('learning_cards', '复习卡片', Icons.translate, 'front', [
    FieldSpec(
      'language',
      '语言',
      type: FieldType.choice,
      initial: 'en',
      choices: ['en', 'ja'],
    ),
    FieldSpec('front', '正面', required: true),
    FieldSpec('back', '背面', type: FieldType.longText, required: true),
    FieldSpec('source_key', '来源'),
  ], subtitleKey: 'back'),
  CollectionSpec(
    'weekly_reviews',
    '每周总结',
    Icons.insights_outlined,
    'week_start',
    [
      FieldSpec('week_start', '周一日期', type: FieldType.date, required: true),
      FieldSpec('content', '总结正文', type: FieldType.longText, required: true),
    ],
    subtitleKey: 'content',
  ),
  CollectionSpec(
    'watchlist_items',
    '自选股票',
    Icons.candlestick_chart_outlined,
    'instrument_id',
    [
      FieldSpec('instrument_id', '股票（市场:代码）', required: true),
      FieldSpec(
        'watchlist_id',
        '自选分组',
        type: FieldType.relation,
        relation: 'watchlists',
      ),
      FieldSpec('note', '研究笔记', type: FieldType.longText),
    ],
    subtitleKey: 'note',
  ),
  CollectionSpec('watchlists', '自选分组', Icons.view_list_outlined, 'name', [
    FieldSpec('name', '分组名称', required: true),
  ]),
  CollectionSpec(
    'industry_articles',
    '行业速览',
    Icons.newspaper_outlined,
    'title',
    [
      FieldSpec('title', '标题', required: true),
      FieldSpec('summary', '摘要', type: FieldType.longText),
      FieldSpec('content_excerpt', '正文摘录', type: FieldType.longText),
      FieldSpec('canonical_url', '原文链接'),
      FieldSpec('source_name', '来源'),
      FieldSpec('industry', '行业', initial: '未分类'),
      FieldSpec('published_at', '发布日期'),
    ],
    subtitleKey: 'summary',
  ),
  CollectionSpec('industry_sources', '资讯来源', Icons.rss_feed, 'name', [
    FieldSpec('name', '来源名称', required: true),
    FieldSpec('url', 'RSS / Atom 地址', required: true),
    FieldSpec('industry', '行业', initial: '未分类'),
    FieldSpec('enabled', '启用', type: FieldType.toggle, initial: true),
  ], subtitleKey: 'url'),
  CollectionSpec('task_subtasks', '子任务', Icons.playlist_add_check, 'title', [
    FieldSpec('title', '子任务名称', required: true),
    FieldSpec(
      'task_id',
      '所属任务',
      type: FieldType.relation,
      relation: 'tasks',
      required: true,
    ),
    FieldSpec('done', '完成', type: FieldType.toggle, initial: false),
    FieldSpec('position', '排序', type: FieldType.number, initial: 0),
  ]),
  CollectionSpec('project_knowledge', '项目资料', Icons.link, 'title', [
    FieldSpec('title', '资料名称', required: true),
    FieldSpec(
      'project_id',
      '所属项目',
      type: FieldType.relation,
      relation: 'projects',
      required: true,
    ),
    FieldSpec(
      'knowledge_key',
      '知识资料',
      type: FieldType.relation,
      relation: 'knowledge',
      required: true,
    ),
    FieldSpec('source', '来源'),
  ]),
  CollectionSpec('profiles', '个人设置', Icons.person_outline, 'display_name', [
    FieldSpec('display_name', '显示名称', required: true),
    FieldSpec('motto', '座右铭', initial: '专注 · 自洽 · 成长'),
    FieldSpec('avatar_text', '头像文字'),
  ], subtitleKey: 'motto'),
];

const auxiliaryLabels = <String, String>{
  'focus_sessions': '专注记录',
  'knowledge_preferences': '知识偏好',
  'application_resume_links': '投递简历快照',
  'career_attachments': '求职附件',
  'workspace_settings': '工作台设置',
  'learning_logs': '复习历史',
  'industry_article_actions': '资讯阅读与收藏',
  'industry_ingestion_runs': '资讯采集记录',
  'instruments': '证券目录',
  'instrument_aliases': '证券别名',
  'recycled_records': '旧回收站',
  'ai_connections': '模型连接',
  'ai_schedules': '模型计划',
  'ai_runs': '模型执行记录',
};
Set<String> get entityKinds => {
  ...collections.map((e) => e.kind),
  ...auxiliaryLabels.keys,
};
CollectionSpec specFor(String kind) => collections.firstWhere(
  (e) => e.kind == kind,
  orElse: () => CollectionSpec(
    kind,
    auxiliaryLabels[kind] ?? kind,
    Icons.dataset_outlined,
    'title',
    const [],
  ),
);
String entityReference(String id, String? legacyKey) => legacyKey ?? id;
