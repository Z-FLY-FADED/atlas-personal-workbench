# ATLAS native app

The primary native app targets Windows and Android using Flutter and Supabase.
Keep pages, business rules and repositories separate. All entity writes go through
the repository and revision-checked PostgreSQL functions. Do not embed elevated
Supabase keys or model API keys. AI stays off until the user enables it.

Preserve legacy fields and relation keys during migration. Export each old owner
separately; never merge owners or upload private archives automatically. Do not
modify the original D1 database or remove the React/Electron app during migration.

Run `flutter analyze`, `flutter test`, and platform builds. Verify RLS with
`supabase/tests/workspace_rls.sql` in a rollback transaction. Separate successful
builds from physical-device and live cross-device verification in reports.
Android release builds require a persistent signing key; never use debug signing
as a release fallback. Windows distribution must include DLLs and `data/`.
