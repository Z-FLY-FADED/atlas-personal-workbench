import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/features/workspace/workspace_controller.dart';
import 'package:atlas_workspace/features/workspace/dashboard_page.dart';
import 'package:atlas_workspace/features/workspace/entity.dart';
import 'package:atlas_workspace/shared/widgets/collection_page.dart';
import 'controller_test.dart' show FakeRepository;

void main() {
  testWidgets(
    'Phone task flow validates input and saves through the repository',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = FakeRepository();
      final controller = WorkspaceController(repository);
      await controller.start();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListenableBuilder(
              listenable: controller,
              builder: (_, child) =>
                  CollectionPage(controller: controller, kind: 'tasks'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('新建'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('保存'));
      await tester.pumpAndSettle();
      expect(find.text('请输入任务名称'), findsOneWidget);
      await tester.enterText(find.byType(TextFormField).first, '原生任务流程');
      await tester.ensureVisible(find.text('保存'));
      await tester.tap(find.text('保存'));
      await tester.pumpAndSettle();
      expect(repository.rows.single.text('title'), '原生任务流程');
      expect(find.text('原生任务流程'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );
  testWidgets('Desktop dashboard displays real metrics without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1440, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeRepository()
      ..rows.add(
        const WorkspaceEntity(
          id: 'one',
          kind: 'tasks',
          payload: {'title': '验证任务'},
        ),
      );
    final controller = WorkspaceController(repository);
    await controller.start();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DashboardPage(controller: controller, onNavigate: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('验证任务'), findsOneWidget);
    expect(find.text('待推进任务'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    controller.dispose();
  });
}
