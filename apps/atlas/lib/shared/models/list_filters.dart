class ListFilters {
  const ListFilters({
    this.values = const {},
    this.fromDay = '',
    this.toDay = '',
    this.minPrice,
    this.maxPrice,
  });
  final Map<String, String> values;
  final String fromDay, toDay;
  final double? minPrice, maxPrice;
  String value(String key) => values[key] ?? '';
  int get count =>
      values.values.where((v) => v.isNotEmpty).length +
      (fromDay.isNotEmpty || toDay.isNotEmpty ? 1 : 0) +
      (minPrice != null || maxPrice != null ? 1 : 0);
  bool get isEmpty => count == 0;
  ListFilters withValue(String key, String value) => ListFilters(
    values: {...values, key: value},
    fromDay: fromDay,
    toDay: toDay,
    minPrice: minPrice,
    maxPrice: maxPrice,
  );
}

class FilterOption {
  const FilterOption(this.value, this.label);
  final String value, label;
}

class FilterField {
  const FilterField(this.key, this.label, this.options);
  final String key, label;
  final List<FilterOption> options;
}

List<FilterOption> filterOptions(Iterable<Object?> values) {
  final sorted =
      values
          .map((e) => e?.toString().trim() ?? '')
          .where((e) => e.isNotEmpty)
          .toSet()
          .toList()
        ..sort();
  return sorted.map((v) => FilterOption(v, v)).toList();
}

bool filterEquals(ListFilters filters, String key, Object? actual) =>
    filters.value(key).isEmpty ||
    filters.value(key) == (actual?.toString().trim() ?? '');
