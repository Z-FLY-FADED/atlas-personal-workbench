import '../../shared/models/list_filters.dart';
import '../workspace/entity.dart';
import 'quote_service.dart';

Map? watchlistInstrument(WorkspaceEntity item, Iterable<Map> catalog) => catalog
    .where((row) => QuoteService.identity(row) == item.text('instrument_id'))
    .firstOrNull;
bool matchesMarket(
  Map row,
  ListFilters filters, {
  required bool watched,
  Map quote = const {},
}) {
  if (![
    'market',
    'industry',
    'risk',
  ].every((key) => filterEquals(filters, key, row[key]))) {
    return false;
  }
  if (filters.value('watched') == 'yes' && !watched ||
      filters.value('watched') == 'no' && watched) {
    return false;
  }
  final price = double.tryParse(quote['price']?.toString() ?? '');
  final valid = price != null && price.isFinite && price > 0;
  if (filters.value('quote') == 'available' && !valid ||
      filters.value('quote') == 'missing' && valid) {
    return false;
  }
  if (filters.minPrice != null && (!valid || price < filters.minPrice!) ||
      filters.maxPrice != null && (!valid || price > filters.maxPrice!)) {
    return false;
  }
  final change = double.tryParse(quote['change']?.toString() ?? '');
  if (filters.value('direction').isNotEmpty) {
    if (!valid || change == null || !change.isFinite) return false;
    if (filters.value('direction') == 'up' && change <= 0 ||
        filters.value('direction') == 'down' && change >= 0 ||
        filters.value('direction') == 'flat' && change != 0) {
      return false;
    }
  }
  return true;
}
