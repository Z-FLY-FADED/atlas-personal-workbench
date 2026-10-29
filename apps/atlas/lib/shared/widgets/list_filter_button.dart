import 'package:flutter/material.dart';
import '../models/list_filters.dart';
import '../../features/planning/planning.dart';

class ListFilterButton extends StatelessWidget {
  const ListFilterButton({
    super.key,
    required this.title,
    required this.filters,
    required this.fields,
    required this.onChanged,
    this.dates = false,
    this.prices = false,
  });
  final String title;
  final ListFilters filters;
  final List<FilterField> fields;
  final ValueChanged<ListFilters> onChanged;
  final bool dates, prices;
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    icon: const Icon(Icons.filter_list, size: 18),
    label: Text(filters.isEmpty ? '筛选' : '筛选 · ${filters.count}'),
    onPressed: () async {
      final result = await showModalBottomSheet<ListFilters>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        constraints: const BoxConstraints(maxWidth: 680),
        builder: (_) => _FilterSheet(
          title: title,
          filters: filters,
          fields: fields,
          dates: dates,
          prices: prices,
        ),
      );
      if (result != null && context.mounted) onChanged(result);
    },
  );
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.title,
    required this.filters,
    required this.fields,
    required this.dates,
    required this.prices,
  });
  final String title;
  final ListFilters filters;
  final List<FilterField> fields;
  final bool dates, prices;
  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  final _form = GlobalKey<FormState>();
  late Map<String, String> _values;
  late TextEditingController _from, _to, _min, _max;
  @override
  void initState() {
    super.initState();
    _values = Map.of(widget.filters.values);
    _from = TextEditingController(text: widget.filters.fromDay);
    _to = TextEditingController(text: widget.filters.toDay);
    _min = TextEditingController(
      text: widget.filters.minPrice?.toString() ?? '',
    );
    _max = TextEditingController(
      text: widget.filters.maxPrice?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _from.dispose();
    _to.dispose();
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  String? dateError(String? value) =>
      value!.trim().isEmpty || parseDay(value.trim()) != null
      ? null
      : '日期格式应为 YYYY-MM-DD';
  String? priceError(String? value) {
    if (value!.trim().isEmpty) return null;
    final number = double.tryParse(value.trim());
    return number == null || !number.isFinite || number < 0
        ? '请输入非负有限数字'
        : null;
  }

  Future<void> pick(TextEditingController target) async {
    final typed = parseDay(target.text) ?? DateTime.now();
    final first = DateTime(1900), last = DateTime(2200);
    final date = await showDatePicker(
      context: context,
      initialDate: typed.isBefore(first)
          ? first
          : typed.isAfter(last)
          ? last
          : typed,
      firstDate: first,
      lastDate: last,
    );
    if (date != null && mounted) setState(() => target.text = dayKey(date));
  }

  void apply() {
    if (!_form.currentState!.validate()) return;
    Navigator.pop(
      context,
      ListFilters(
        values: Map.unmodifiable(_values),
        fromDay: _from.text.trim(),
        toDay: _to.text.trim(),
        minPrice: double.tryParse(_min.text.trim()),
        maxPrice: double.tryParse(_max.text.trim()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .85,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '筛选${widget.title}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: '取消筛选',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Form(
                key: _form,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final field in widget.fields)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('filter-${field.key}'),
                          initialValue: _values[field.key] ?? '',
                          isExpanded: true,
                          decoration: InputDecoration(labelText: field.label),
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('全部'),
                            ),
                            for (final option in field.options)
                              DropdownMenuItem(
                                value: option.value,
                                child: Text(
                                  option.label,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            if ((_values[field.key] ?? '').isNotEmpty &&
                                !field.options.any(
                                  (o) => o.value == _values[field.key],
                                ))
                              DropdownMenuItem(
                                value: _values[field.key],
                                child: Text('${_values[field.key]}（当前无记录）'),
                              ),
                          ],
                          onChanged: (value) =>
                              setState(() => _values[field.key] = value ?? ''),
                        ),
                      ),
                    if (widget.dates) ...[
                      TextFormField(
                        controller: _from,
                        decoration: InputDecoration(
                          labelText: '投递开始日期',
                          hintText: 'YYYY-MM-DD',
                          suffixIcon: IconButton(
                            tooltip: '选择开始日期',
                            onPressed: () => pick(_from),
                            icon: const Icon(Icons.calendar_today_outlined),
                          ),
                        ),
                        validator: dateError,
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _to,
                        decoration: InputDecoration(
                          labelText: '投递结束日期',
                          hintText: 'YYYY-MM-DD',
                          suffixIcon: IconButton(
                            tooltip: '选择结束日期',
                            onPressed: () => pick(_to),
                            icon: const Icon(Icons.calendar_today_outlined),
                          ),
                        ),
                        validator: (v) {
                          final error = dateError(v);
                          if (error != null) return error;
                          if (v!.trim().isNotEmpty &&
                              parseDay(_from.text.trim()) != null &&
                              v.trim().compareTo(_from.text.trim()) < 0) {
                            return '结束日期不能早于开始日期';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                    ],
                    if (widget.prices) ...[
                      TextFormField(
                        controller: _min,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: '价格下限（标的原币）',
                        ),
                        validator: priceError,
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _max,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: '价格上限（标的原币）',
                        ),
                        validator: (v) {
                          final error = priceError(v);
                          if (error != null) return error;
                          final min = double.tryParse(_min.text.trim()),
                              max = double.tryParse(v!.trim());
                          return min != null && max != null && max < min
                              ? '价格上限不能小于下限'
                              : null;
                        },
                      ),
                      const SizedBox(height: 14),
                      const Text('价格与涨跌按已有行情筛选，暂无行情的标的不会被视为零价或平盘。'),
                    ],
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context, const ListFilters()),
                  child: const Text('清空筛选'),
                ),
                const Spacer(),
                FilledButton(onPressed: apply, child: const Text('应用筛选')),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
