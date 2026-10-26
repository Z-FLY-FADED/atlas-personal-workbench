-- Executes against a migrated project. Test users and rows are rolled back.
begin;
insert into auth.users(id,email) values
 ('63acaf95-5077-4471-ab8a-7e653831959f','atlas-test-a@example.invalid'),
 ('676dd254-dad8-4a34-9613-c84ebcc5ef83','atlas-test-b@example.invalid');
set local role anon;
do $$ begin
 begin
  perform count(*) from public.atlas_entities;
  raise exception 'Anonymous reads were allowed';
 exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','63acaf95-5077-4471-ab8a-7e653831959f',true);
select public.atlas_save_entity('77d57503-b7fd-4307-91c1-38bc18bcafaa','tasks','{"title":"RLS test"}',0);
do $$ begin
 if (select count(*) from public.atlas_entities where id='77d57503-b7fd-4307-91c1-38bc18bcafaa')<>1 then raise exception 'Own read failed';end if;
 begin
  insert into public.atlas_entities(user_id,kind,payload) values('676dd254-dad8-4a34-9613-c84ebcc5ef83','tasks','{}');
  raise exception 'Foreign insert was allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','676dd254-dad8-4a34-9613-c84ebcc5ef83',true);
do $$ declare changed integer;begin
 if (select count(*) from public.atlas_entities where id='77d57503-b7fd-4307-91c1-38bc18bcafaa')<>0 then raise exception 'Foreign read was allowed';end if;
 update public.atlas_entities set payload='{}' where id='77d57503-b7fd-4307-91c1-38bc18bcafaa';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Foreign update was allowed';end if;
 begin
  perform public.atlas_set_deleted('77d57503-b7fd-4307-91c1-38bc18bcafaa',1,true);
  raise exception 'Foreign delete was allowed';
 exception when serialization_failure then null;end;
end $$;
select set_config('request.jwt.claim.sub','63acaf95-5077-4471-ab8a-7e653831959f',true);
select public.atlas_save_entity('77d57503-b7fd-4307-91c1-38bc18bcafaa','tasks','{"title":"Updated"}',1);
do $$ begin
 begin
  perform public.atlas_save_entity('77d57503-b7fd-4307-91c1-38bc18bcafaa','tasks','{}',1);
  raise exception 'Stale write was allowed';
 exception when serialization_failure then null;end;
 if public.atlas_import_entities('[{"kind":"quick_notes","legacy_key":"rls-import","payload":{"content":"test"}}]')<>1 then raise exception 'Import failed';end if;
 if public.atlas_import_entities('[{"kind":"quick_notes","legacy_key":"rls-import","payload":{"content":"changed"}}]')<>0 then raise exception 'Import was not idempotent';end if;
 if (select payload->>'content' from public.atlas_entities where legacy_key='rls-import')<>'test' then raise exception 'Import overwrote existing content';end if;
 if public.atlas_import_entities('[{"kind":"tasks","source_id":"77d57503-b7fd-4307-91c1-38bc18bcafaa","legacy_key":"new-backup-key","payload":{"title":"duplicate"}}]')<>0 then raise exception 'Native backup created a duplicate';end if;
 for iteration in 1..20 loop
  if public.atlas_consume_ai_budget()<>true then raise exception 'AI budget failed early';end if;
 end loop;
 if public.atlas_consume_ai_budget()<>false then raise exception 'AI budget allowed too many requests';end if;
end $$;
select public.atlas_set_deleted('77d57503-b7fd-4307-91c1-38bc18bcafaa',2,true);
select public.atlas_set_deleted('77d57503-b7fd-4307-91c1-38bc18bcafaa',3,false);
do $$ begin
 if (select version from public.atlas_entities where id='77d57503-b7fd-4307-91c1-38bc18bcafaa')<>4 then raise exception 'Revision or restore failed';end if;
end $$;
reset role;
rollback;
select 'PASS: anonymous denied, own CRUD, cross-account isolation, stale-write rejection, additive import, restore, native backup deduplication, AI quota; all test data rolled back' as result,
  (select count(*) from auth.users) as existing_app_users;
