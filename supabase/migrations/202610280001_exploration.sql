begin;
create table public.atlas_ai_credentials (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80),
 base_url text not null, model text not null,
 encrypted_key text not null, updated_at timestamptz not null default now()
);
alter table public.atlas_ai_credentials enable row level security;
revoke all on public.atlas_ai_credentials from public, anon, authenticated;
grant all on public.atlas_ai_credentials to service_role;
create or replace function public.atlas_search_materials(p_query text, p_limit integer default 8)
returns setof public.atlas_entities language sql stable security invoker set search_path='' as $$
 select e.* from public.atlas_entities e
 where e.user_id=auth.uid() and e.deleted_at is null
 and e.kind in ('knowledge','quick_notes','industry_articles')
 and exists(select 1 from regexp_split_to_table(lower(left(p_query,500)), '\s+') t
   where length(t)>0 and strpos(lower(e.payload::text),t)>0)
 order by (strpos(lower(coalesce(e.payload->>'title','')),lower(p_query))>0) desc, e.updated_at desc
 limit greatest(1,least(p_limit,12));
$$;
revoke all on function public.atlas_search_materials(text,integer) from public,anon;
grant execute on function public.atlas_search_materials(text,integer) to authenticated;
commit;
