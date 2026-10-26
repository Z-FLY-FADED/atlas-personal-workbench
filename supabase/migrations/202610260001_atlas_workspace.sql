-- Additive migration: does not read, overwrite or drop existing project tables.
begin;
create table if not exists public.atlas_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'tasks','task_subtasks','focus_sessions','projects','project_knowledge','quick_notes',
    'reminders','knowledge','knowledge_preferences','profiles','resumes','applications',
    'resume_versions','application_resume_links','career_attachments','weekly_reviews',
    'workspace_settings','learning_cards','learning_logs','industry_sources','industry_articles',
    'industry_article_actions','industry_ingestion_runs','instruments','instrument_aliases',
    'watchlists','watchlist_items','recycled_records','ai_connections','ai_schedules','ai_runs'
  )),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8388608),
  legacy_key text,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, kind, legacy_key)
);
create index if not exists atlas_entities_owner_kind on public.atlas_entities(user_id, kind);
alter table public.atlas_entities enable row level security;
revoke all on public.atlas_entities from anon, authenticated;
grant select, insert, update on public.atlas_entities to authenticated;
create policy atlas_read_own on public.atlas_entities for select to authenticated using (user_id = (select auth.uid()));
create policy atlas_insert_own on public.atlas_entities for insert to authenticated with check (user_id = (select auth.uid()));
create policy atlas_update_own on public.atlas_entities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No DELETE grant: tombstones support restore and filtered Realtime delivery.
create or replace function public.atlas_entity_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id <> old.id or new.user_id <> old.user_id or new.kind <> old.kind
      or new.legacy_key is distinct from old.legacy_key then
      raise exception 'Entity identity is immutable' using errcode = '42501';
    end if;
    new.version := old.version + 1;
    new.created_at := old.created_at;
  else
    new.version := 1;
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger atlas_entity_revision before insert or update on public.atlas_entities
for each row execute function public.atlas_entity_revision();

create or replace function public.atlas_save_entity(p_id uuid, p_kind text, p_payload jsonb, p_version bigint)
returns public.atlas_entities language plpgsql security invoker set search_path = '' as $$
declare result public.atlas_entities;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_version = 0 then
    insert into public.atlas_entities(id, kind, payload) values(p_id, p_kind, p_payload) returning * into result;
  else
    update public.atlas_entities set payload = p_payload
    where id = p_id and user_id = auth.uid() and kind = p_kind and version = p_version and deleted_at is null
    returning * into result;
    if not found then raise exception 'Revision conflict' using errcode = '40001'; end if;
  end if;
  return result;
end $$;
create or replace function public.atlas_set_deleted(p_id uuid, p_version bigint, p_deleted boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.atlas_entities set deleted_at = case when p_deleted then now() else null end
  where id = p_id and user_id = auth.uid() and version = p_version;
  if not found then raise exception 'Revision conflict' using errcode = '40001'; end if;
end $$;

-- Import is atomic and additive. Re-importing the same keys never overwrites edits.
create or replace function public.atlas_import_entities(p_rows jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; inserted integer; total integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 or octet_length(p_rows::text) > 52428800 then
    raise exception 'Invalid or oversized archive' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if coalesce(item->>'legacy_key','') = '' then raise exception 'Import key required' using errcode = '22023'; end if;
    if item->'payload' ?| array['api_key','apiKey','secret_key','service_role','access_token','refresh_token'] then
      raise exception 'Secrets must not be imported' using errcode = '22023';
    end if;
    insert into public.atlas_entities(user_id, kind, payload, legacy_key, deleted_at)
      values(auth.uid(), item->>'kind', item->'payload', item->>'legacy_key', (item->>'deleted_at')::timestamptz)
      on conflict (user_id, kind, legacy_key) do nothing;
    get diagnostics inserted = row_count;
    total := total + inserted;
  end loop;
  return total;
end $$;

-- Card and log commit together; an edit conflict rolls the entire review back.
create or replace function public.atlas_review_card(p_id uuid, p_version bigint, p_payload jsonb, p_log jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.atlas_save_entity(p_id, 'learning_cards', p_payload, p_version);
  insert into public.atlas_entities(kind,payload) values('learning_logs',p_log);
end $$;
revoke all on function public.atlas_save_entity(uuid,text,jsonb,bigint) from public, anon;
revoke all on function public.atlas_set_deleted(uuid,bigint,boolean) from public, anon;
revoke all on function public.atlas_import_entities(jsonb) from public, anon;
revoke all on function public.atlas_review_card(uuid,bigint,jsonb,jsonb) from public, anon;
grant execute on function public.atlas_save_entity(uuid,text,jsonb,bigint),
  public.atlas_set_deleted(uuid,bigint,boolean), public.atlas_import_entities(jsonb),
  public.atlas_review_card(uuid,bigint,jsonb,jsonb) to authenticated;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'atlas_entities') then
    alter publication supabase_realtime add table public.atlas_entities;
  end if;
end $$;
commit;
