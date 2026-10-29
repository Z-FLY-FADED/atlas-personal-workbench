import 'package:flutter/material.dart';
import '../../shared/widgets/atlas_widgets.dart';
import '../workspace/workspace_controller.dart';
import '../explore/source_inbox.dart';

class IndustryPage extends StatelessWidget {
  const IndustryPage({super.key, required this.controller});
  final WorkspaceController controller;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      const Padding(
        padding: EdgeInsets.fromLTRB(24, 24, 24, 17),
        child: AtlasPageHeader(
          title: '行业速览',
          subtitle: '科技与大厂公众号、行业新闻，关注 AI、机器人、智能制造与新能源。',
          eyebrow: 'STAY CURIOUS, STAY INFORMED',
        ),
      ),
      Expanded(
        child: SourceInbox(controller: controller, purpose: 'industry'),
      ),
    ],
  );
}
