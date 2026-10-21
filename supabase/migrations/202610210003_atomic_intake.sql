-- Submission, receipt, event and audit are one transaction. Retrying a submitted
-- draft cannot create a second submission or lose the acknowledgement email.
create function public.submit_intake(p_user uuid,p_draft uuid,p_practice text,p_subject text,p_urgency text,p_facts text,p_deadline date,p_opponent text,p_name text,p_phone text,p_company text)
returns table(id uuid,reference text) language plpgsql security definer set search_path='' as $$
declare c public.cases; begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from auth.users where auth.users.id=p_user and email_confirmed_at is not null)
 or exists(select 1 from public.staff_members where user_id=p_user and active) then raise exception 'FORBIDDEN'; end if;
 if p_draft is null then
   insert into public.cases(client_id,practice) values(p_user,p_practice) returning * into c;
 else
   select * into c from public.cases where cases.id=p_draft and client_id=p_user and status='draft' for update;
   if not found then raise exception 'INVALID_DRAFT'; end if;
 end if;
 update public.profiles set full_name=p_name,phone=p_phone,company=p_company where profiles.id=p_user;
 update public.cases set practice=p_practice,subject=p_subject,urgency=p_urgency,facts=p_facts,deadline=p_deadline,opponent=p_opponent,status='submitted',submitted_at=now(),updated_at=now() where cases.id=c.id;
 insert into public.case_events(case_id,status) values(c.id,'submitted');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_user,'submit','case',c.id::text);
 insert into public.mail_outbox(user_id,kind,reference,dedup_key) values(p_user,'intake',c.reference,'intake:'||c.id::text);
 insert into public.notifications(user_id,title,href) values(p_user,'Ihre Anfrage ist eingegangen.','/portal/akten/'||c.id::text);
 insert into public.mail_outbox(user_id,kind,dedup_key) select user_id,'new_intake','staff-intake:'||c.id::text||':'||user_id::text from public.staff_members where active and role='admin';
 return query select c.id,c.reference;
end $$;
revoke execute on function public.submit_intake(uuid,uuid,text,text,text,text,date,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_intake(uuid,uuid,text,text,text,text,date,text,text,text,text) to service_role;
