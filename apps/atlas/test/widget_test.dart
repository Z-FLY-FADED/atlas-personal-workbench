import 'package:flutter_test/flutter_test.dart';
import 'package:atlas_workspace/app.dart';

void main() {
  testWidgets('Unconfigured app shows a recoverable setup screen', (
    tester,
  ) async {
    await tester.pumpWidget(const AtlasApp(startupError: '请配置项目地址'));
    expect(find.text('请配置项目地址'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
