import 'package:flutter/material.dart';

abstract final class AtlasColors {
  static const background = Color(0xFFF8F5EF);
  static const sidebar = Color(0xFFF0EAE0);
  static const surface = Color(0xFFFFFDFA);
  static const elevated = Color(0xFFF1EAE0);
  static const border = Color(0xFFE6DDD0);
  static const text = Color(0xFF3E352F);
  static const muted = Color(0xFF736458);
  static const gold = Color(0xFF995438);
  static const teal = Color(0xFF566847);
  static const blue = Color(0xFF815C36);
  static const amber = Color(0xFF8C672C);
  static const rose = Color(0xFF885B50);
  static const peach = Color(0xFFF3E4D5);
  static const sage = Color(0xFFECEDDF);
}

ThemeData buildAtlasTheme() {
  final scheme =
      ColorScheme.fromSeed(
        seedColor: AtlasColors.gold,
        brightness: Brightness.light,
        surface: AtlasColors.surface,
      ).copyWith(
        primary: AtlasColors.gold,
        onPrimary: const Color(0xFFFFFCF8),
        primaryContainer: const Color(0xFFF3E1D6),
        onPrimaryContainer: const Color(0xFF733C2A),
        secondary: AtlasColors.teal,
        onSecondary: Colors.white,
        secondaryContainer: AtlasColors.sage,
        onSecondaryContainer: const Color(0xFF414C35),
        tertiary: AtlasColors.amber,
        onSurface: AtlasColors.text,
        onSurfaceVariant: AtlasColors.muted,
        surfaceContainerHighest: AtlasColors.elevated,
        outline: const Color(0xFFCABDAD),
        outlineVariant: AtlasColors.border,
        error: const Color(0xFFAC4538),
      );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AtlasColors.background,
    fontFamilyFallback: const [
      'Microsoft YaHei UI',
      'Microsoft YaHei',
      'Noto Sans CJK SC',
      'sans-serif',
    ],
  );
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(12));
  return base.copyWith(
    textTheme: base.textTheme
        .copyWith(
          headlineLarge: const TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.w700,
            height: 1.4,
            letterSpacing: -.8,
          ),
          headlineMedium: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            height: 1.4,
            letterSpacing: -.4,
          ),
          headlineSmall: const TextStyle(
            fontSize: 23,
            fontWeight: FontWeight.w600,
            height: 1.45,
          ),
          titleLarge: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            height: 1.5,
          ),
          titleMedium: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            height: 1.55,
          ),
          bodyLarge: const TextStyle(fontSize: 15, height: 1.75),
          bodyMedium: const TextStyle(fontSize: 14, height: 1.65),
          labelLarge: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        )
        .apply(bodyColor: AtlasColors.text, displayColor: AtlasColors.text)
        .copyWith(
          bodySmall: base.textTheme.bodySmall?.copyWith(
            fontSize: 12,
            height: 1.65,
            color: AtlasColors.muted,
          ),
        ),
    cardTheme: CardThemeData(
      color: AtlasColors.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AtlasColors.border, width: .8),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFFAF7F2),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      hintStyle: const TextStyle(color: AtlasColors.muted, fontSize: 13),
      labelStyle: const TextStyle(color: AtlasColors.muted, fontSize: 13),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AtlasColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AtlasColors.gold, width: 1.5),
      ),
      prefixIconColor: AtlasColors.muted,
      suffixIconColor: AtlasColors.muted,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 46),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        shape: shape,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 46),
        foregroundColor: AtlasColors.text,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        side: const BorderSide(color: AtlasColors.border),
        shape: shape,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(44, 44),
        shape: shape,
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        minimumSize: const Size(44, 44),
        foregroundColor: AtlasColors.muted,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AtlasColors.background,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleSpacing: 20,
      titleTextStyle: TextStyle(
        color: AtlasColors.text,
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AtlasColors.border,
      thickness: .8,
      space: 1,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AtlasColors.surface,
      surfaceTintColor: Colors.transparent,
      height: 74,
      indicatorColor: const Color(0xFFF3E1D6),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w600
              : FontWeight.w400,
          color: states.contains(WidgetState.selected)
              ? AtlasColors.gold
              : AtlasColors.muted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 22,
          color: states.contains(WidgetState.selected)
              ? AtlasColors.gold
              : AtlasColors.muted,
        ),
      ),
    ),
    drawerTheme: const DrawerThemeData(
      backgroundColor: AtlasColors.sidebar,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: Colors.transparent,
      selectedColor: const Color(0xFFF0DFD2),
      side: const BorderSide(color: AtlasColors.border, width: .8),
      labelStyle: const TextStyle(fontSize: 12, color: AtlasColors.text),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        backgroundColor: AtlasColors.background,
        selectedBackgroundColor: const Color(0xFFF0DFD2),
        selectedForegroundColor: AtlasColors.gold,
        foregroundColor: AtlasColors.muted,
        side: const BorderSide(color: AtlasColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: AtlasColors.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AtlasColors.text,
      contentTextStyle: const TextStyle(color: AtlasColors.surface),
      shape: shape,
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: AtlasColors.muted,
      contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 5),
    ),
    checkboxTheme: CheckboxThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
      side: const BorderSide(color: Color(0xFFBBAC9A), width: 1.3),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AtlasColors.gold,
      linearTrackColor: AtlasColors.elevated,
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: AtlasColors.gold,
      unselectedLabelColor: AtlasColors.muted,
      dividerColor: Colors.transparent,
      indicatorSize: TabBarIndicatorSize.tab,
      indicator: BoxDecoration(
        color: const Color(0xFFF0E5D7),
        borderRadius: BorderRadius.circular(11),
      ),
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      unselectedLabelStyle: const TextStyle(fontSize: 13),
      overlayColor: WidgetStatePropertyAll(
        AtlasColors.gold.withValues(alpha: .04),
      ),
    ),
    scrollbarTheme: ScrollbarThemeData(
      thumbColor: WidgetStatePropertyAll(
        AtlasColors.muted.withValues(alpha: .3),
      ),
      radius: const Radius.circular(5),
      thickness: const WidgetStatePropertyAll(5),
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: AtlasColors.text,
        borderRadius: BorderRadius.circular(8),
      ),
      textStyle: const TextStyle(color: AtlasColors.surface, fontSize: 12),
    ),
    popupMenuTheme: const PopupMenuThemeData(
      color: AtlasColors.surface,
      surfaceTintColor: Colors.transparent,
    ),
    textSelectionTheme: TextSelectionThemeData(
      cursorColor: AtlasColors.gold,
      selectionColor: AtlasColors.gold.withValues(alpha: .18),
      selectionHandleColor: AtlasColors.gold,
    ),
  );
}
