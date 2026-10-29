import '../../shared/models/list_filters.dart';
import '../planning/planning.dart';
import '../workspace/entity.dart';

bool matchesApplication(WorkspaceEntity item, ListFilters filters) {
  if (![
    'status',
    'company',
    'role',
    'channel',
  ].every((key) => filterEquals(filters, key, item.text(key)))) {
    return false;
  }
  if (filters.fromDay.isEmpty && filters.toDay.isEmpty) return true;
  final raw = item.text('applied_at').trim();
  final date = parseDay(raw) ?? parseTimestamp(raw)?.toLocal();
  if (date == null) return false;
  final day = dayKey(date);
  return (filters.fromDay.isEmpty || day.compareTo(filters.fromDay) >= 0) &&
      (filters.toDay.isEmpty || day.compareTo(filters.toDay) <= 0);
}

bool matchesJob(
  Map job,
  ListFilters filters, {
  required int matched,
  required int missing,
}) {
  if (![
    'industry',
    'function',
    'education',
    'organizationType',
  ].every((key) => filterEquals(filters, key, job[key]))) {
    return false;
  }
  final locations = job['locations'];
  if (filters.value('location').isNotEmpty &&
      !(locations is List &&
          locations
              .map((v) => v.toString())
              .contains(filters.value('location')))) {
    return false;
  }
  return switch (filters.value('match')) {
    'matched' => matched > 0,
    'complete' => matched > 0 && missing == 0,
    'missing' => missing > 0,
    'none' => matched == 0,
    _ => true,
  };
}
