begin;
  insert into auth.users(id,email) values('63acaf95-5077-4471-ab8a-7e653831959f','a'),('676dd254-dad8-4a34-9613-c84ebcc5ef83','b');
  set local role authenticated;
  select set_config('request.jwt.claim.sub','63acaf95-5077-4471-ab8a-7e653831959f',true);
  select public.atlas_save_entity('77d57503-b7fd-4307-91c1-38bc18bcafaa','knowledge','{"title":"private-only-a","content":"mechanical"}',0);
  select public.atlas_save_entity('77d57503-b7fd-4307-91c1-38bc18bcafab','industry_sources','{"name":"source"}',0);
  do $$begin
   if (select count(*) from public.atlas_search_materials('private-only-a'))<>1 then raise exception 'Own search failed';end if;
   if public.atlas_claim_collection('77d57503-b7fd-4307-91c1-38bc18bcafab')<>true then raise exception 'First collection rejected';end if;
   if public.atlas_claim_collection('77d57503-b7fd-4307-91c1-38bc18bcafab')<>false then raise exception 'Duplicate collection allowed';end if;
   begin perform count(*) from public.atlas_ai_credentials;raise exception 'Credential read allowed';exception when insufficient_privilege then null;end;
  end $$;
  select set_config('request.jwt.claim.sub','676dd254-dad8-4a34-9613-c84ebcc5ef83',true);
  do $$begin
   if (select count(*) from public.atlas_search_materials('private-only-a'))<>0 then raise exception 'Cross-owner search leak';end if;
   if public.atlas_claim_collection('77d57503-b7fd-4307-91c1-38bc18bcafab')<>false then raise exception 'Cross-owner collection allowed';end if;
   begin insert into public.atlas_ai_credentials(user_id,name,base_url,model,encrypted_key)values(auth.uid(),'hack','https://example.com','m','key');raise exception 'Credential insert allowed';exception when insufficient_privilege then null;end;
  end $$;
  reset role;rollback;
select 'PASS: exploration ownership, credentials and collection lease; rolled back' as result;
