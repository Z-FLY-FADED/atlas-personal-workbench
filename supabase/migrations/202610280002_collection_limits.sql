begin;
create table public.atlas_collection_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 source_id uuid not null references public.atlas_entities(id) on delete cascade,
 started_at timestamptz not null default now(), primary key(user_id,source_id)
);
alter table public.atlas_collection_limits enable row level security;
revoke all on public.atlas_collection_limits from public,anon,authenticated;
create function public.atlas_claim_collection(p_source uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare accepted boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.atlas_entities where id=p_source and user_id=auth.uid() and kind='industry_sources' and deleted_at is null) then return false; end if;
 insert into public.atlas_collection_limits as l(user_id,source_id) values(auth.uid(),p_source)
 on conflict(user_id,source_id) do update set started_at=now()
 where l.started_at<now()-interval '5 minutes' returning true into accepted;
 return coalesce(accepted,false);
end $$;
revoke all on function public.atlas_claim_collection(uuid) from public,anon;
grant execute on function public.atlas_claim_collection(uuid) to authenticated;
commit;
