-- A second factor protects direct database reads too, not just Next.js routes.
create function public.session_ready() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and (coalesce((auth.jwt()->>'aal')='aal2',false) or (
   not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
   and not exists(select 1 from public.staff_members where user_id=auth.uid() and active)))
$$;
revoke execute on function public.session_ready() from public,anon;
grant execute on function public.session_ready() to authenticated;
create or replace function public.can_access_case(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.session_ready() and exists(select 1 from public.cases c where c.id=cid and (
   (c.client_id=auth.uid() and not exists(select 1 from public.staff_members s where s.user_id=auth.uid() and s.active)) or
   public.is_admin() or (public.is_staff() and exists(select 1 from public.case_members m where m.case_id=c.id and m.user_id=auth.uid()))))
$$;
-- Restrictive policies combine with all permissive policies on these tables.
do $$ declare t text; begin
 foreach t in array array['profiles','staff_members','settings','cases','case_members','messages','documents','availability_slots','appointments','tasks','case_events','invoices','notifications','audit_logs','privacy_requests'] loop
 execute format('create policy verified_session on public.%I as restrictive for select to authenticated using(public.session_ready())',t);
 end loop;
end $$;
grant execute on function public.gen_random_bytes(integer) to service_role;
create or replace function public.record_payment(p_event text,p_invoice uuid,p_session text,p_amount integer,p_currency text)
returns boolean language plpgsql security definer set search_path='' as $$
declare invoice public.invoices; begin
 insert into public.stripe_events(id) values(p_event) on conflict do nothing;
 if not found then return false; end if;
 select * into invoice from public.invoices where id=p_invoice for update;
 if not found or invoice.amount<>p_amount or p_currency<>'eur' or invoice.stripe_session_id is distinct from p_session or invoice.status='void' then raise exception 'PAYMENT_MISMATCH'; end if;
 if invoice.status='paid' then return false; end if;
 update public.invoices set status='paid',paid_at=now() where id=p_invoice;
 insert into public.audit_logs(action,entity_type,entity_id) values('payment_verified','invoice',p_invoice::text);
 return true;
end $$;
