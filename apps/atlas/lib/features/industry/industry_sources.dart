import 'dart:io';
import '../workspace/entity.dart';

DateTime? industryPublishedAt(String value) {
  if (value.trim().isEmpty) return null;
  final iso = DateTime.tryParse(value);
  if (iso != null) return iso;
  try {
    return HttpDate.parse(value);
  } on FormatException {
    return null;
  } on HttpException {
    return null;
  }
}

const industryChannels = <String, String>{
  'tech_wechat': '科技公众号',
  'company_wechat': '大厂公众号',
  'news_channel': '新闻频道',
  'official_news': '大厂官网新闻',
  'tech_media': '科技媒体',
  'custom': '其他来源',
};
const industryTopics = ['AI', '机器人', '智能制造', '新能源'];
const industryFeedDefaults = <String, Map<String, String>>{
  'https://www.ithome.com/rss/': {'channel': 'tech_media', 'publisher': 'IT之家'},
  'https://www.36kr.com/feed': {'channel': 'tech_media', 'publisher': '36氪'},
  'https://news.cctv.cn/2019/07/gaiban/cmsdatainterface/page/tech_1.jsonp': {
    'channel': 'news_channel',
    'publisher': '央视网',
  },
  'https://blogs.nvidia.com/feed/': {
    'channel': 'official_news',
    'publisher': 'NVIDIA',
  },
};
List<String> articleTopics(WorkspaceEntity row) {
  final saved = row.list('topic_tags').whereType<String>().toList();
  if (saved.isNotEmpty) return saved;
  final text = '${row.text('title')} ${row.text('summary')}';
  return [
    if (RegExp(
      r'人工智能|大模型|机器学习|深度学习|\bAI\b|\bLLM\b|GPU|算力|智能体',
      caseSensitive: false,
    ).hasMatch(text))
      'AI',
    if (RegExp(
      r'机器人|robot|具身智能|机械臂|自动驾驶|无人机|无人系统|潜水器',
      caseSensitive: false,
    ).hasMatch(text))
      '机器人',
    if (RegExp(
      r'智能制造|工业|制造|manufactur|工业互联网|数字工厂|半导体|芯片|自动化|机加工|控制系统',
      caseSensitive: false,
    ).hasMatch(text))
      '智能制造',
    if (RegExp(
      r'新能源|动力电池|锂电|氢能|储能|光伏|风电|电动汽车|solar|battery|hydrogen',
      caseSensitive: false,
    ).hasMatch(text))
      '新能源',
  ];
}

List<WorkspaceEntity> industryArticles(
  Iterable<WorkspaceEntity> rows, {
  String channel = '',
  String topic = '',
  int days = 0,
  DateTime? now,
}) {
  final cutoff = (now ?? DateTime.now()).subtract(Duration(days: days));
  final result = rows.where((e) {
    if (channel.isNotEmpty && e.text('source_channel', 'custom') != channel) {
      return false;
    }
    if (topic.isNotEmpty && !articleTopics(e).contains(topic)) return false;
    final date = industryPublishedAt(e.text('published_at'));
    if (days > 0 && (date == null || date.isBefore(cutoff))) return false;
    return true;
  }).toList();
  result.sort((a, b) {
    final da = industryPublishedAt(a.text('published_at')),
        db = industryPublishedAt(b.text('published_at'));
    if (da == null && db != null) return 1;
    if (da != null && db == null) return -1;
    return (db ?? DateTime(1900)).compareTo(da ?? DateTime(1900)) != 0
        ? (db ?? DateTime(1900)).compareTo(da ?? DateTime(1900))
        : (b.updatedAt ?? DateTime(1900)).compareTo(
            a.updatedAt ?? DateTime(1900),
          );
  });
  return result;
}

bool wechatChannel(String value) =>
    ['tech_wechat', 'company_wechat'].contains(value);
