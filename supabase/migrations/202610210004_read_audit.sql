-- Capture Data API reads in PostgreSQL logs, including reads outside Next.js.
-- GET/HEAD transactions are READ ONLY in PostgREST: never INSERT from this hook.
-- Never record query strings, request bodies, IP addresses or case facts.
create function public.audit_api_access() returns void language plpgsql security definer set search_path='' as $$
declare entity text; begin
 if auth.uid() is null then return; end if;
 if current_setting('request.method',true) not in ('GET','HEAD') then return; end if;
 entity:=split_part(trim(leading '/' from current_setting('request.path',true)),'/',1);
 if entity=any(array['profiles','cases','messages','documents','appointments','tasks','case_events','invoices','notifications','privacy_requests']) then
   raise log '%', json_build_object('action','data_api_read','actor_id',auth.uid(),'entity_type',entity);
 end if;
end $$;
revoke execute on function public.audit_api_access() from public,anon;
grant execute on function public.audit_api_access() to authenticated,service_role;
-- Fresh Supabase projects have no pre-request hook. Refuse to overwrite one.
do $$ declare existing text; begin
 if exists(select 1 from pg_roles where rolname='authenticator') then
   select setting into existing from pg_roles r,unnest(r.rolconfig) setting where r.rolname='authenticator' and setting like 'pgrst.db_pre_request=%';
   if existing is not null and existing not in ('pgrst.db_pre_request=','pgrst.db_pre_request=public.audit_api_access') then raise exception 'An existing PostgREST hook must be combined with audit_api_access before applying this migration.'; end if;
   alter role authenticator set pgrst.db_pre_request='public.audit_api_access';
 end if;
end $$;
notify pgrst,'reload config';
