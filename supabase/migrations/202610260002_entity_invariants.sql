begin;
create unique index if not exists atlas_setting_key on public.atlas_entities(user_id,(payload->>'key'))
where kind='workspace_settings' and deleted_at is null;
create unique index if not exists atlas_review_week on public.atlas_entities(user_id,(payload->>'week_start'))
where kind='weekly_reviews' and deleted_at is null;
create unique index if not exists atlas_singleton_kind on public.atlas_entities(user_id,kind)
where kind in ('profiles','resumes') and deleted_at is null;

create or replace function public.atlas_import_entities(p_rows jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; inserted integer; total integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 or octet_length(p_rows::text)>52428800 then
    raise exception 'Invalid or oversized archive' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if coalesce(item->>'legacy_key','')='' then raise exception 'Import key required' using errcode='22023'; end if;
    if item->'payload' ?| array['api_key','apiKey','secret_key','service_role','access_token','refresh_token'] then
      raise exception 'Secrets must not be imported' using errcode='22023';
    end if;
    if item->>'source_id' is not null and exists(select 1 from public.atlas_entities where user_id=auth.uid() and id=(item->>'source_id')::uuid) then continue; end if;
    insert into public.atlas_entities(user_id,kind,payload,legacy_key,deleted_at)
      values(auth.uid(),item->>'kind',item->'payload',item->>'legacy_key',(item->>'deleted_at')::timestamptz)
      on conflict do nothing;
    get diagnostics inserted=row_count;total:=total+inserted;
  end loop;
  return total;
end $$;

create table if not exists public.atlas_ai_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(), requests integer not null default 1
);
alter table public.atlas_ai_limits enable row level security;
revoke all on public.atlas_ai_limits from public,anon,authenticated;
create or replace function public.atlas_consume_ai_budget() returns boolean
language plpgsql security definer set search_path='' as $$
declare accepted boolean;
begin
  if auth.uid() is null then return false;end if;
  insert into public.atlas_ai_limits as limits(user_id) values(auth.uid())
  on conflict(user_id) do update set
    started_at=case when limits.started_at<now()-interval '1 hour' then now() else limits.started_at end,
    requests=case when limits.started_at<now()-interval '1 hour' then 1 else limits.requests+1 end
  where limits.started_at<now()-interval '1 hour' or limits.requests<20 returning true into accepted;
  return coalesce(accepted,false);
end $$;
revoke all on function public.atlas_consume_ai_budget() from public,anon;
grant execute on function public.atlas_consume_ai_budget() to authenticated;
commit;
