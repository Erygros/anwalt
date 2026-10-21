create function public.review_case(p_actor uuid,p_case uuid,p_kind text,p_value text,p_terms text default null)
returns void language plpgsql security definer set search_path='' as $$
declare c public.cases; actor_role public.staff_role; begin
 select role into actor_role from public.staff_members where user_id=p_actor and active;
 if actor_role is null or actor_role='assistant' then raise exception 'FORBIDDEN'; end if;
 if actor_role<>'admin' and not exists(select 1 from public.case_members where case_id=p_case and user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into c from public.cases where id=p_case for update;
 if not found or c.purging_at is not null then raise exception 'INVALID_STATE'; end if;
 if p_kind='conflict' then
   if c.status not in ('submitted','conflict_review') or p_value not in ('clear','conflict') then raise exception 'INVALID_STATE'; end if;
   update public.cases set status='conflict_review',conflict_result=p_value,conflict_checked_at=now(),conflict_checked_by=p_actor,updated_at=now() where id=p_case;
   if c.status<>'conflict_review' then insert into public.case_events(case_id,status) values(p_case,'conflict_review'); end if;
   insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_actor,'conflict_'||p_value,'case',p_case::text);
 elsif p_kind='status' then
   if p_value='accepted' and (c.status<>'conflict_review' or c.conflict_result is distinct from 'clear' or nullif(p_terms,'') is null) then raise exception 'INVALID_STATE'; end if;
   if p_value='declined' and c.status not in ('submitted','conflict_review') then raise exception 'INVALID_STATE'; end if;
   if p_value='closed' and c.status<>'accepted' then raise exception 'INVALID_STATE'; end if;
   if p_value not in ('accepted','declined','closed') then raise exception 'INVALID_STATE'; end if;
   update public.cases set status=p_value::public.case_status,updated_at=now(),accepted_at=case when p_value='accepted' then now() else accepted_at end,closed_at=case when p_value='closed' then now() else closed_at end,mandate_terms_version=case when p_value='accepted' then p_terms else mandate_terms_version end where id=p_case;
   insert into public.case_events(case_id,status) values(p_case,p_value::public.case_status);
   insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_actor,'status_'||p_value,'case',p_case::text);
   insert into public.mail_outbox(user_id,kind,dedup_key) values(c.client_id,'status','status:'||p_case::text||':'||p_value) on conflict do nothing;
   insert into public.notifications(user_id,title,href) values(c.client_id,'Der Stand Ihrer Akte wurde aktualisiert.','/portal/akten/'||p_case::text);
 else raise exception 'INVALID_ACTION'; end if;
end $$;
revoke execute on function public.review_case(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_case(uuid,uuid,text,text,text) to service_role;
