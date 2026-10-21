-- No seeded clients, firms, prices or lawyer identities.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create type public.staff_role as enum ('admin', 'lawyer', 'assistant');
create type public.case_status as enum ('draft', 'submitted', 'conflict_review', 'accepted', 'declined', 'closed');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '', phone text not null default '', company text not null default '',
  address text not null default '', created_at timestamptz not null default now()
);
create table public.staff_members (
  user_id uuid primary key references auth.users on delete cascade,
  role public.staff_role not null, active boolean not null default true
);
create table public.settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('DA-' || upper(encode(gen_random_bytes(6), 'hex'))),
  client_id uuid not null references auth.users,
  practice text not null check (practice in ('strafrecht','steuerrecht','it-recht','online-betrug','unklar')),
  subject text not null default '', urgency text not null default 'normal' check (urgency in ('normal','zeitnah','dringend')),
  facts text not null default '', deadline date, opponent text not null default '',
  status public.case_status not null default 'draft',
  conflict_checked_at timestamptz, conflict_checked_by uuid references auth.users,
  conflict_result text check (conflict_result in ('clear','conflict')), mandate_terms_version text,
  submitted_at timestamptz, accepted_at timestamptz, closed_at timestamptz,
  retention_until date, legal_hold boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint accepted_needs_conflict_check check (status <> 'accepted' or (conflict_result='clear' and conflict_checked_at is not null and conflict_checked_by is not null))
);
create table public.case_members (
  case_id uuid references public.cases on delete cascade,
  user_id uuid references public.staff_members(user_id) on delete cascade,
  primary key(case_id,user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases on delete cascade,
  sender_id uuid not null references auth.users, body text not null check (char_length(body) between 1 and 10000),
  internal boolean not null default false, created_at timestamptz not null default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases on delete cascade,
  uploader_id uuid not null references auth.users, name text not null,
  path text not null unique, mime text not null, size integer not null check(size between 1 and 10485760),
  sha256 text not null, scan_status text not null check(scan_status='clean'), created_at timestamptz not null default now()
);
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(), staff_id uuid not null references public.staff_members(user_id),
  starts_at timestamptz not null, ends_at timestamptz not null,
  modes text[] not null default array['phone'], enabled boolean not null default true,
  check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours'),
  check(modes <@ array['phone','video']::text[] and cardinality(modes)>0),
  exclude using gist(staff_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(enabled)
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), slot_id uuid not null references public.availability_slots,
  client_id uuid not null references auth.users, case_id uuid references public.cases,
  mode text not null check(mode in ('phone','video')), status text not null default 'booked' check(status in ('booked','cancelled','completed')),
  video_url text, reminder_sent_at timestamptz, created_at timestamptz not null default now(),
  unique(id, client_id)
);
create unique index one_booking_per_slot on public.appointments(slot_id) where status='booked';
create table public.tasks (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases on delete cascade,
  title text not null, due_at timestamptz not null, kind text not null check(kind in ('task','deadline','followup')),
  assigned_to uuid references public.staff_members(user_id), completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.case_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases on delete cascade,
  status public.case_status not null, created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases,
  client_id uuid not null references auth.users, number text not null unique,
  service_id text not null, description text not null, amount integer not null check(amount>0 and amount<=10000000),
  tax_rate numeric not null check(tax_rate between 0 and 100), status text not null default 'open' check(status in ('open','paid','void')),
  stripe_session_id text unique, paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  title text not null, href text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references auth.users on delete set null,
  action text not null, entity_type text not null, entity_id text, created_at timestamptz not null default now()
);
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
  kind text not null check(kind in ('access','erasure')), status text not null default 'pending' check(status in ('pending','resolved','retained')),
  resolution text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.mail_outbox (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  kind text not null, reference text, dedup_key text not null unique,
  status text not null default 'pending' check(status in ('pending','sent')), attempts integer not null default 0,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create table public.rate_limits (key text primary key, count integer not null default 0, expires_at timestamptz not null);
create table public.stripe_events (id text primary key, created_at timestamptz not null default now());

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.staff_members where user_id=auth.uid() and active)
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_staff() and exists(select 1 from public.staff_members where user_id=auth.uid() and role='admin' and active)
$$;
create function public.can_access_case(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cases c where c.id=cid and (
   (c.client_id=auth.uid() and not exists(select 1 from public.staff_members s where s.user_id=auth.uid() and s.active)) or
   public.is_admin() or (public.is_staff() and exists(select 1 from public.case_members m where m.case_id=c.id and m.user_id=auth.uid()))))
$$;

-- Browser users have SELECT only. Every mutation is validated and authorized by the server.
do $$ declare t text; begin
 foreach t in array array['profiles','staff_members','settings','cases','case_members','messages','documents','availability_slots','appointments','tasks','case_events','invoices','notifications','audit_logs','privacy_requests','mail_outbox','rate_limits','stripe_events'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
   execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or (public.is_staff() and exists(select 1 from public.cases c where c.client_id=profiles.id and public.can_access_case(c.id))));
create policy staff_read on public.staff_members for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy settings_admin on public.settings for select to authenticated using(public.is_admin());
create policy case_read on public.cases for select to authenticated using(public.can_access_case(id));
create policy members_read on public.case_members for select to authenticated using(public.is_staff() and public.can_access_case(case_id));
create policy messages_read on public.messages for select to authenticated using(public.can_access_case(case_id) and (not internal or public.is_staff()));
create policy docs_read on public.documents for select to authenticated using(public.can_access_case(case_id));
create policy slots_read on public.availability_slots for select to authenticated using((enabled and starts_at>now()) or public.is_admin() or (public.is_staff() and staff_id=auth.uid()));
create policy appointments_read on public.appointments for select to authenticated using((client_id=auth.uid() and not public.is_staff()) or public.is_admin() or (public.is_staff() and exists(select 1 from public.availability_slots s where s.id=slot_id and s.staff_id=auth.uid())) or (public.is_staff() and public.can_access_case(case_id)));
create policy tasks_read on public.tasks for select to authenticated using(public.is_staff() and public.can_access_case(case_id));
create policy events_read on public.case_events for select to authenticated using(public.can_access_case(case_id));
create policy invoices_read on public.invoices for select to authenticated using(public.can_access_case(case_id));
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy audit_admin on public.audit_logs for select to authenticated using(public.is_admin());
create policy privacy_read on public.privacy_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
-- No policies for rate limits, outbox, or webhook receipts: service role only.
create index cases_client_idx on public.cases(client_id);
create index cases_status_idx on public.cases(status,created_at);
create index messages_case_idx on public.messages(case_id,created_at);
create index documents_case_idx on public.documents(case_id);
create index tasks_case_idx on public.tasks(case_id,due_at);
create index notifications_user_idx on public.notifications(user_id,created_at);
create index outbox_pending_idx on public.mail_outbox(status,created_at);
create index audit_created_idx on public.audit_logs(created_at);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('case-documents','case-documents',false,10485760,array['application/pdf','image/jpeg','image/png','text/plain']);
-- Deliberately no storage.objects client policies: server scans before writing;
-- downloads require server authorization + audit and expire after 60 seconds.

create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into public.rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when public.rate_limits.expires_at<now() then 1 else public.rate_limits.count+1 end,
 expires_at=case when public.rate_limits.expires_at<now() then now()+make_interval(secs=>p_seconds) else public.rate_limits.expires_at end
 returning count into n;
 return n<=p_limit;
end $$;

create function public.book_appointment(p_user uuid,p_slot uuid,p_mode text,p_case uuid default null,p_replace uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.availability_slots; aid uuid; begin
 -- Serialize per client to prevent cancellation/rescheduling races.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into s from public.availability_slots where id=p_slot and enabled for update;
 if not found or s.starts_at<now()+interval '2 hours' or not(p_mode=any(s.modes)) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if not exists(select 1 from public.staff_members where user_id=s.staff_id and active and role in ('admin','lawyer')) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if p_case is not null and not exists(select 1 from public.cases where id=p_case and client_id=p_user and status='accepted') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.appointments a join public.availability_slots x on x.id=a.slot_id where a.client_id=p_user and a.status='booked' and a.id is distinct from p_replace and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if p_replace is not null then
   update public.appointments a set status='cancelled' from public.availability_slots x where a.id=p_replace and a.client_id=p_user and a.status='booked' and x.id=a.slot_id and x.starts_at>now();
   if not found then raise exception 'FORBIDDEN'; end if;
 end if;
 insert into public.appointments(slot_id,client_id,case_id,mode) values(p_slot,p_user,p_case,p_mode) returning id into aid;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_user,case when p_replace is null then 'book' else 'reschedule' end,'appointment',aid::text);
 insert into public.mail_outbox(user_id,kind,dedup_key) values(p_user,'appointment_confirmed','appointment:'||aid::text);
 return aid;
end $$;

create function public.record_payment(p_event text,p_invoice uuid,p_session text,p_amount integer,p_currency text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 insert into public.stripe_events(id) values(p_event) on conflict do nothing;
 if not found then return false; end if;
 update public.invoices set status='paid',paid_at=now(),stripe_session_id=p_session
 where id=p_invoice and amount=p_amount and p_currency='eur' and status='open';
 if not found then raise exception 'PAYMENT_MISMATCH'; end if;
 insert into public.audit_logs(action,entity_type,entity_id) values('payment_verified','invoice',p_invoice::text);
 return true;
end $$;

-- Exposed RPCs are explicitly scoped. Internal functions cannot be called anonymously.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_staff(),public.is_admin(),public.can_access_case(uuid) to authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer),public.book_appointment(uuid,uuid,text,uuid,uuid),public.record_payment(text,uuid,text,integer,text) to service_role;
grant usage,select on all sequences in schema public to service_role;
