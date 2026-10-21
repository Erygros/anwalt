alter table public.cases add column purging_at timestamptz;
create function public.claim_retention_purge(p_case uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.cases; begin
 select * into c from public.cases where id=p_case for update;
 if not found or c.legal_hold or exists(select 1 from public.invoices where case_id=p_case) then return false; end if;
 if not ((c.status='draft' and c.created_at<now()-interval '30 days') or (c.status in ('closed','declined') and c.retention_until<current_date)) then return false; end if;
 update public.cases set purging_at=coalesce(purging_at,now()) where id=p_case;
 insert into public.audit_logs(action,entity_type,entity_id) values('retention_purge_claimed','case',p_case::text);
 return true;
end $$;
revoke execute on function public.claim_retention_purge(uuid) from public,anon,authenticated;
grant execute on function public.claim_retention_purge(uuid) to service_role;
create function public.prevent_purge_changes() returns trigger language plpgsql set search_path='' as $$
begin
 if old.purging_at is not null and (new.legal_hold is distinct from old.legal_hold or new.status is distinct from old.status or new.retention_until is distinct from old.retention_until) then raise exception 'PURGE_IN_PROGRESS'; end if;
 return new;
end $$;
create trigger protect_purge before update on public.cases for each row execute function public.prevent_purge_changes();
revoke execute on function public.prevent_purge_changes() from public,anon,authenticated;
-- Account erasure is allowed only after explicit staff review. History with an
-- accounting/legal retention requirement prevents deletion at the application layer.
alter table public.privacy_requests drop constraint privacy_requests_user_id_fkey;
alter table public.privacy_requests alter column user_id drop not null;
alter table public.privacy_requests add constraint privacy_requests_user_id_fkey foreign key(user_id) references auth.users on delete set null;
alter table public.appointments drop constraint appointments_client_id_fkey;
alter table public.appointments add constraint appointments_client_id_fkey foreign key(client_id) references auth.users on delete cascade;
