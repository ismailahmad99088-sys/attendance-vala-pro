create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('super_admin','attendance_admin','attendance_manager','supervisor','employee','viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.can_view_all(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('super_admin','attendance_admin','attendance_manager','supervisor','viewer'))
$$;
create or replace function public.is_operator(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('super_admin','attendance_admin','attendance_manager','supervisor'))
$$;
create or replace function public.is_att_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('super_admin','attendance_admin'))
$$;
create or replace function public.can_approve(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('super_admin','attendance_admin','attendance_manager'))
$$;

create policy "own roles or admins" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_att_admin(auth.uid()));

-- Org settings (single row)
create table public.org_settings (
  id int primary key default 1 check (id = 1),
  org_name text not null,
  timezone text not null default 'UTC',
  is_demo boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select, update on public.org_settings to authenticated;
grant all on public.org_settings to service_role;
alter table public.org_settings enable row level security;
create policy "read settings" on public.org_settings for select to authenticated using (true);
create policy "admins update settings" on public.org_settings for update to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "read departments" on public.departments for select to authenticated using (true);
create policy "admins manage departments" on public.departments for all to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

create table public.attendance_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes int not null default 15 check (grace_minutes >= 0),
  expected_minutes int not null default 480 check (expected_minutes > 0),
  max_break_minutes int not null default 60 check (max_break_minutes >= 0),
  overtime_threshold_minutes int not null default 0 check (overtime_threshold_minutes >= 0),
  early_checkout_threshold_minutes int not null default 0 check (early_checkout_threshold_minutes >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.attendance_rules to authenticated;
grant all on public.attendance_rules to service_role;
alter table public.attendance_rules enable row level security;
create policy "read rules" on public.attendance_rules for select to authenticated using (true);
create policy "admins manage rules" on public.attendance_rules for all to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

create table public.attendance_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  radius_m int not null default 150 check (radius_m > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.attendance_locations to authenticated;
grant all on public.attendance_locations to service_role;
alter table public.attendance_locations enable row level security;
create policy "read locations" on public.attendance_locations for select to authenticated using (true);
create policy "admins manage locations" on public.attendance_locations for all to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

create table public.attendance_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_code text not null unique,
  device_type text not null check (device_type in ('FINGERPRINT','FACE','RFID','TERMINAL')),
  location_id uuid references public.attendance_locations(id) on delete set null,
  connection_ref text,
  status text not null default 'NOT_CONFIGURED' check (status in ('CONNECTED','DISCONNECTED','ERROR','NOT_CONFIGURED')),
  last_sync_at timestamptz,
  last_event_at timestamptz,
  events_received int not null default 0,
  events_processed int not null default 0,
  events_failed int not null default 0,
  events_duplicate int not null default 0,
  last_error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.attendance_devices to authenticated;
grant all on public.attendance_devices to service_role;
alter table public.attendance_devices enable row level security;
create policy "staff read devices" on public.attendance_devices for select to authenticated using (public.can_view_all(auth.uid()));
create policy "admins manage devices" on public.attendance_devices for all to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  email text,
  user_id uuid unique,
  department_id uuid references public.departments(id) on delete set null,
  rule_id uuid references public.attendance_rules(id) on delete set null,
  location_id uuid references public.attendance_locations(id) on delete set null,
  photo_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.employees(department_id);
grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "view employees" on public.employees for select to authenticated using (public.can_view_all(auth.uid()) or user_id = auth.uid());
create policy "admins manage employees" on public.employees for all to authenticated using (public.is_att_admin(auth.uid())) with check (public.is_att_admin(auth.uid()));

-- Immutable event log
create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null check (event_type in ('CHECK_IN','BREAK_START','BREAK_END','CHECK_OUT')),
  occurred_at timestamptz not null default now(),
  work_date date not null,
  source text not null check (source in ('WEB','MOBILE','QR','GPS','BIOMETRIC','DEVICE','MANUAL','CORRECTION','IMPORT')),
  device_id uuid references public.attendance_devices(id) on delete set null,
  location_id uuid references public.attendance_locations(id) on delete set null,
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  ip text,
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.attendance_events(work_date, employee_id);
create index on public.attendance_events(employee_id, occurred_at);
grant select on public.attendance_events to authenticated;
grant all on public.attendance_events to service_role;
alter table public.attendance_events enable row level security;
create policy "view events" on public.attendance_events for select to authenticated
  using (public.can_view_all(auth.uid()) or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()));

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  correction_type text not null check (correction_type in ('MISSING_CHECK_IN','MISSING_CHECK_OUT','INCORRECT_TIMESTAMP')),
  original_event_id uuid references public.attendance_events(id),
  original_value timestamptz,
  requested_value timestamptz not null,
  reason text not null check (length(trim(reason)) >= 5),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  resulting_event_id uuid references public.attendance_events(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.attendance_corrections to authenticated;
grant all on public.attendance_corrections to service_role;
alter table public.attendance_corrections enable row level security;
create policy "view corrections" on public.attendance_corrections for select to authenticated
  using (public.can_view_all(auth.uid()) or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()));

create table public.attendance_event_voids (
  event_id uuid primary key references public.attendance_events(id) on delete cascade,
  correction_id uuid not null references public.attendance_corrections(id),
  created_at timestamptz not null default now()
);
grant select on public.attendance_event_voids to authenticated;
grant all on public.attendance_event_voids to service_role;
alter table public.attendance_event_voids enable row level security;
create policy "view voids" on public.attendance_event_voids for select to authenticated using (true);

create table public.attendance_alerts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  alert_type text not null check (alert_type in ('LATE_ARRIVAL','MISSING_CHECK_IN','MISSING_CHECK_OUT','EARLY_CHECKOUT','LONG_BREAK','OVERTIME','DEVICE_OFFLINE','SYNC_FAILURE')),
  severity text not null default 'MEDIUM' check (severity in ('LOW','MEDIUM','HIGH')),
  work_date date,
  status text not null default 'OPEN' check (status in ('OPEN','RESOLVED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (employee_id, alert_type, work_date)
);
grant select, update on public.attendance_alerts to authenticated;
grant all on public.attendance_alerts to service_role;
alter table public.attendance_alerts enable row level security;
create policy "staff view alerts" on public.attendance_alerts for select to authenticated using (public.can_view_all(auth.uid()));
create policy "operators resolve alerts" on public.attendance_alerts for update to authenticated using (public.is_operator(auth.uid())) with check (public.is_operator(auth.uid()));

create table public.attendance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.attendance_audit_logs(created_at desc);
grant select on public.attendance_audit_logs to authenticated;
grant all on public.attendance_audit_logs to service_role;
alter table public.attendance_audit_logs enable row level security;
create policy "admins view audit" on public.attendance_audit_logs for select to authenticated using (public.is_att_admin(auth.uid()));

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null,
  backup_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant all on public.licenses to service_role;
alter table public.licenses enable row level security;

create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  reason text,
  created_at timestamptz not null default now()
);
create index on public.login_attempts(email, created_at desc);
grant all on public.login_attempts to service_role;
alter table public.login_attempts enable row level security;

create or replace function public.verify_license(_key text, _backup text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.licenses l where l.active
    and l.key_hash = extensions.crypt(_key, l.key_hash)
    and l.backup_hash = extensions.crypt(_backup, l.backup_hash))
$$;
revoke all on function public.verify_license(text, text) from public, anon, authenticated;
grant execute on function public.verify_license(text, text) to service_role;

-- Audit helper
create or replace function public.write_audit(_action text, _entity text, _entity_id text, _details jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare em text;
begin
  select (auth.jwt() ->> 'email') into em;
  insert into public.attendance_audit_logs(actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), em, _action, _entity, _entity_id, coalesce(_details, '{}'::jsonb));
end $$;
revoke all on function public.write_audit(text,text,text,jsonb) from public, anon, authenticated;

create or replace function public.audit_table_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit(tg_argv[0] || '_' || tg_op, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null),
    jsonb_build_object('old', case when tg_op <> 'INSERT' then to_jsonb(old) end, 'new', case when tg_op <> 'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;
create trigger audit_rules after insert or update or delete on public.attendance_rules for each row execute function public.audit_table_change('RULE');
create trigger audit_locations after insert or update or delete on public.attendance_locations for each row execute function public.audit_table_change('LOCATION');
create trigger audit_devices after insert or update or delete on public.attendance_devices for each row execute function public.audit_table_change('DEVICE');
create trigger audit_employees after insert or update or delete on public.employees for each row execute function public.audit_table_change('EMPLOYEE');
create trigger audit_roles after insert or update or delete on public.user_roles for each row execute function public.audit_table_change('PERMISSION');

create or replace function public.org_today()
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.org_settings where id = 1), 'UTC'))::date
$$;

-- Server-stamped punch
create or replace function public.attendance_punch(
  _employee_id uuid, _event_type text, _source text default 'WEB',
  _lat double precision default null, _lng double precision default null,
  _accuracy double precision default null, _location_id uuid default null)
returns public.attendance_events
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); emp public.employees; tz text; d date;
  has_in boolean; has_out boolean; open_break boolean; rec public.attendance_events;
  loc public.attendance_locations; dist double precision;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into emp from public.employees where id = _employee_id;
  if not found then raise exception 'Employee not found'; end if;
  if emp.status <> 'ACTIVE' then raise exception 'Employee is inactive'; end if;
  if not (emp.user_id = uid or public.is_operator(uid)) then raise exception 'Not authorized to record attendance for this employee'; end if;
  if _event_type not in ('CHECK_IN','BREAK_START','BREAK_END','CHECK_OUT') then raise exception 'Invalid event type'; end if;
  if _source not in ('WEB','MOBILE','GPS') then raise exception 'Attendance method % is not configured', _source; end if;

  if _source = 'GPS' then
    if _lat is null or _lng is null then raise exception 'LOCATION NOT AVAILABLE'; end if;
    if _lat not between -90 and 90 or _lng not between -180 and 180 then raise exception 'Invalid GPS coordinates'; end if;
    if _location_id is not null then
      select * into loc from public.attendance_locations where id = _location_id and status = 'ACTIVE';
      if not found or loc.latitude is null then raise exception 'Attendance location not configured'; end if;
      dist := 6371000 * 2 * asin(sqrt(power(sin(radians(_lat - loc.latitude)/2),2) + cos(radians(loc.latitude))*cos(radians(_lat))*power(sin(radians(_lng - loc.longitude)/2),2)));
      if dist > loc.radius_m then raise exception 'Outside allowed radius: % m from %, limit % m', round(dist::numeric), loc.name, loc.radius_m; end if;
    end if;
  end if;

  select timezone into tz from public.org_settings where id = 1;
  d := (now() at time zone coalesce(tz,'UTC'))::date;
  perform pg_advisory_xact_lock(hashtext(_employee_id::text || d::text));

  select bool_or(event_type='CHECK_IN'), bool_or(event_type='CHECK_OUT') into has_in, has_out
  from public.attendance_events e where e.employee_id = _employee_id and e.work_date = d
    and not exists (select 1 from public.attendance_event_voids v where v.event_id = e.id);
  has_in := coalesce(has_in,false); has_out := coalesce(has_out,false);
  select coalesce((select event_type = 'BREAK_START' from public.attendance_events e
    where e.employee_id = _employee_id and e.work_date = d and e.event_type in ('BREAK_START','BREAK_END')
      and not exists (select 1 from public.attendance_event_voids v where v.event_id = e.id)
    order by occurred_at desc limit 1), false) into open_break;

  if _event_type = 'CHECK_IN' and has_in then raise exception 'Already checked in today'; end if;
  if _event_type = 'CHECK_OUT' then
    if not has_in then raise exception 'Valid check-in not found.'; end if;
    if has_out then raise exception 'Already checked out today'; end if;
    if open_break then raise exception 'End the active break before checking out'; end if;
  end if;
  if _event_type = 'BREAK_START' then
    if not has_in then raise exception 'Valid check-in not found.'; end if;
    if has_out then raise exception 'Already checked out today'; end if;
    if open_break then raise exception 'A break is already active'; end if;
  end if;
  if _event_type = 'BREAK_END' and not open_break then raise exception 'No active break to end'; end if;

  insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, location_id, latitude, longitude, accuracy_m, created_by, metadata)
  values (_employee_id, _event_type, now(), d, _source, coalesce(_location_id, emp.location_id), _lat, _lng, _accuracy, uid,
    case when dist is not null then jsonb_build_object('distance_m', round(dist::numeric)) else '{}'::jsonb end)
  returning * into rec;

  perform public.write_audit(_event_type, 'attendance_events', rec.id::text, jsonb_build_object('employee_id', _employee_id, 'source', _source));
  return rec;
end $$;
revoke all on function public.attendance_punch(uuid,text,text,double precision,double precision,double precision,uuid) from public, anon;
grant execute on function public.attendance_punch(uuid,text,text,double precision,double precision,double precision,uuid) to authenticated;

-- Manual attendance (admin)
create or replace function public.manual_attendance(_employee_id uuid, _work_date date, _check_in time, _check_out time, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); tz text; ci timestamptz; co timestamptz;
begin
  if not public.is_att_admin(uid) then raise exception 'Not authorized'; end if;
  if _reason is null or length(trim(_reason)) < 5 then raise exception 'Reason is required (min 5 characters)'; end if;
  if _work_date > public.org_today() then raise exception 'Cannot record future attendance'; end if;
  select timezone into tz from public.org_settings where id = 1;
  ci := (_work_date + _check_in) at time zone tz;
  if ci > now() then raise exception 'Check-in time is in the future'; end if;
  if _check_out is not null then
    co := (_work_date + _check_out) at time zone tz;
    if co <= ci then raise exception 'Check-out must be after check-in'; end if;
    if co > now() then raise exception 'Check-out time is in the future'; end if;
  end if;
  if exists (select 1 from public.attendance_events e where e.employee_id = _employee_id and e.work_date = _work_date and e.event_type = 'CHECK_IN'
    and not exists (select 1 from public.attendance_event_voids v where v.event_id = e.id)) then
    raise exception 'A check-in already exists for this date. Use a correction instead.';
  end if;
  insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, created_by, metadata)
  values (_employee_id, 'CHECK_IN', ci, _work_date, 'MANUAL', uid, jsonb_build_object('reason', _reason));
  if co is not null then
    insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, created_by, metadata)
    values (_employee_id, 'CHECK_OUT', co, _work_date, 'MANUAL', uid, jsonb_build_object('reason', _reason));
  end if;
  perform public.write_audit('MANUAL_ATTENDANCE', 'employees', _employee_id::text, jsonb_build_object('date', _work_date, 'reason', _reason));
end $$;
revoke all on function public.manual_attendance(uuid,date,time,time,text) from public, anon;
grant execute on function public.manual_attendance(uuid,date,time,time,text) to authenticated;

-- Corrections
create or replace function public.request_correction(_employee_id uuid, _work_date date, _type text, _original_event_id uuid, _requested_time time, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); emp public.employees; tz text; ov timestamptz; rid uuid; rv timestamptz; oe public.attendance_events;
begin
  select * into emp from public.employees where id = _employee_id;
  if not found then raise exception 'Employee not found'; end if;
  if not (emp.user_id = uid or public.is_operator(uid)) then raise exception 'Not authorized'; end if;
  if _type not in ('MISSING_CHECK_IN','MISSING_CHECK_OUT','INCORRECT_TIMESTAMP') then raise exception 'Invalid correction type'; end if;
  if _reason is null or length(trim(_reason)) < 5 then raise exception 'Reason is required (min 5 characters)'; end if;
  select timezone into tz from public.org_settings where id = 1;
  rv := (_work_date + _requested_time) at time zone tz;
  if rv > now() then raise exception 'Requested time is in the future'; end if;
  if _type = 'INCORRECT_TIMESTAMP' then
    select * into oe from public.attendance_events where id = _original_event_id and employee_id = _employee_id and work_date = _work_date;
    if not found then raise exception 'Original event not found'; end if;
    ov := oe.occurred_at;
  end if;
  insert into public.attendance_corrections(employee_id, work_date, correction_type, original_event_id, original_value, requested_value, reason, requested_by)
  values (_employee_id, _work_date, _type, case when _type='INCORRECT_TIMESTAMP' then _original_event_id end, ov, rv, _reason, uid)
  returning id into rid;
  perform public.write_audit('CORRECTION_REQUEST', 'attendance_corrections', rid::text, jsonb_build_object('type', _type, 'date', _work_date));
  return rid;
end $$;
grant execute on function public.request_correction(uuid,date,text,uuid,time,text) to authenticated;

create or replace function public.review_correction(_id uuid, _approve boolean, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.attendance_corrections; et text; oe public.attendance_events; newid uuid;
begin
  if not public.can_approve(uid) then raise exception 'Not authorized to review corrections'; end if;
  select * into c from public.attendance_corrections where id = _id for update;
  if not found then raise exception 'Correction not found'; end if;
  if c.status <> 'PENDING' then raise exception 'Correction already reviewed'; end if;
  if c.requested_by = uid then raise exception 'You cannot review your own correction request'; end if;
  if not _approve then
    update public.attendance_corrections set status='REJECTED', reviewed_by=uid, reviewed_at=now(), review_note=_note where id=_id;
    perform public.write_audit('CORRECTION_REJECTED', 'attendance_corrections', _id::text, jsonb_build_object('note', _note));
    return;
  end if;
  if c.correction_type = 'MISSING_CHECK_IN' then et := 'CHECK_IN';
  elsif c.correction_type = 'MISSING_CHECK_OUT' then et := 'CHECK_OUT';
  else
    select * into oe from public.attendance_events where id = c.original_event_id;
    et := oe.event_type;
    insert into public.attendance_event_voids(event_id, correction_id) values (c.original_event_id, c.id) on conflict do nothing;
  end if;
  insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, created_by, metadata)
  values (c.employee_id, et, c.requested_value, c.work_date, 'CORRECTION', uid, jsonb_build_object('correction_id', c.id, 'reason', c.reason))
  returning id into newid;
  update public.attendance_corrections set status='APPROVED', reviewed_by=uid, reviewed_at=now(), review_note=_note, resulting_event_id=newid where id=_id;
  perform public.write_audit('CORRECTION_APPROVED', 'attendance_corrections', _id::text, jsonb_build_object('event_id', newid));
end $$;
grant execute on function public.review_correction(uuid,boolean,text) to authenticated;

-- Derived daily summary (all calculation server-side)
create or replace function public.attendance_day_summary(_date date)
returns table(
  employee_id uuid, check_in timestamptz, check_out timestamptz, check_in_method text,
  break_minutes int, on_break boolean, break_started_at timestamptz,
  gross_minutes int, net_minutes int, expected_minutes int,
  rule_start time, rule_end time,
  is_late boolean, late_minutes int, is_early boolean, overtime_minutes int,
  status text, last_activity timestamptz, event_count int)
language sql stable security definer set search_path = public as $$
with s as (select coalesce((select timezone from org_settings where id=1),'UTC') tz),
t as (select (now() at time zone (select tz from s))::date today),
emps as (
  select e.id, r.start_time, r.end_time, coalesce(r.grace_minutes,0) grace, coalesce(r.expected_minutes,480) expected,
    coalesce(r.overtime_threshold_minutes,0) ot_thr, coalesce(r.early_checkout_threshold_minutes,0) early_thr
  from employees e left join attendance_rules r on r.id = e.rule_id
  where e.status='ACTIVE' and (public.can_view_all(auth.uid()) or e.user_id = auth.uid())
),
ev as (
  select x.* from attendance_events x
  where x.work_date = _date and x.employee_id in (select id from emps)
    and not exists (select 1 from attendance_event_voids v where v.event_id = x.id)
),
br as (
  select employee_id, event_type, occurred_at,
    lead(occurred_at) over w nxt, lead(event_type) over w nxt_type
  from ev where event_type in ('BREAK_START','BREAK_END')
  window w as (partition by employee_id order by occurred_at)
),
brs as (
  select employee_id,
    coalesce(sum(extract(epoch from nxt - occurred_at)/60) filter (where event_type='BREAK_START' and nxt_type='BREAK_END'),0)::int mins,
    max(occurred_at) filter (where event_type='BREAK_START' and nxt is null) open_at
  from br group by employee_id
),
agg as (
  select employee_id,
    min(occurred_at) filter (where event_type='CHECK_IN') ci,
    max(occurred_at) filter (where event_type='CHECK_OUT') co,
    max(occurred_at) last_act, count(*)::int cnt
  from ev group by employee_id
),
calc as (
  select e.*, a.ci, a.co, a.last_act, coalesce(a.cnt,0) cnt,
    coalesce(b.mins,0) bmins, b.open_at,
    (select source from ev where ev.employee_id=e.id and event_type='CHECK_IN' order by occurred_at limit 1) src,
    case when a.ci is null then null
         when a.co is not null then (extract(epoch from a.co - a.ci)/60)::int
         when _date = (select today from t) then (extract(epoch from now() - a.ci)/60)::int
         else null end gross,
    case when a.ci is not null and e.start_time is not null
      then greatest(0, (extract(epoch from ((a.ci at time zone (select tz from s))::time - e.start_time))/60)::int) end late_raw
  from emps e left join agg a on a.employee_id = e.id left join brs b on b.employee_id = e.id
),
fin as (
  select c.*,
    case when c.gross is null then null else greatest(0, c.gross - c.bmins
      - case when c.open_at is not null and c.co is null then (extract(epoch from now() - c.open_at)/60)::int else 0 end) end net,
    coalesce(c.late_raw > c.grace, false) late,
    coalesce(c.co is not null and e2.end_time is not null and (c.co at time zone (select tz from s))::time < e2.end_time - make_interval(mins => c.early_thr), false) early
  from calc c join emps e2 on e2.id = c.id
),
fin2 as (
  select f.*, case when f.co is not null and f.net > f.expected + f.ot_thr then f.net - f.expected else 0 end ot from fin f
)
select f.id, f.ci, f.co, f.src, f.bmins, f.open_at is not null and f.co is null, f.open_at,
  f.gross, f.net, f.expected, f.start_time, f.end_time,
  f.late, case when f.late then f.late_raw else 0 end, f.early, f.ot,
  case
    when f.ci is null then case when extract(isodow from _date) in (6,7) then 'OFF'
                                when _date < (select today from t) then 'ABSENT' else 'NOT_MARKED' end
    when f.co is not null then case when f.ot > 0 then 'OVERTIME' when f.early then 'EARLY_CHECKOUT' else 'CHECKED_OUT' end
    when f.open_at is not null then 'ON_BREAK'
    when _date < (select today from t) then 'MISSING_CHECKOUT'
    when f.late then 'LATE'
    else 'PRESENT' end,
  f.last_act, f.cnt
from fin2 f
$$;
grant execute on function public.attendance_day_summary(date) to authenticated;

create or replace function public.attendance_range_summary(_from date, _to date)
returns table(work_date date, employee_id uuid, check_in timestamptz, check_out timestamptz, check_in_method text,
  break_minutes int, net_minutes int, gross_minutes int, expected_minutes int, is_late boolean, late_minutes int, is_early boolean,
  overtime_minutes int, status text)
language sql stable security definer set search_path = public as $$
  select d::date, s.employee_id, s.check_in, s.check_out, s.check_in_method, s.break_minutes, s.net_minutes, s.gross_minutes,
    s.expected_minutes, s.is_late, s.late_minutes, s.is_early, s.overtime_minutes, s.status
  from generate_series(_from, least(_to, _from + 92), interval '1 day') d
  cross join lateral public.attendance_day_summary(d::date) s
$$;
grant execute on function public.attendance_range_summary(date,date) to authenticated;

alter publication supabase_realtime add table public.attendance_events;
alter publication supabase_realtime add table public.attendance_corrections;

-- ================= DEMO SEED (is_demo = true) =================
insert into public.org_settings(id, org_name, timezone, is_demo) values (1, 'Software Vala — Demo Organization', 'Asia/Kolkata', true);

insert into public.departments(name, is_demo) values
 ('Engineering', true), ('Design', true), ('Operations', true), ('Customer Support', true), ('Quality Assurance', true);

insert into public.attendance_rules(name, start_time, end_time, grace_minutes, expected_minutes, max_break_minutes, overtime_threshold_minutes, early_checkout_threshold_minutes, is_demo) values
 ('General Shift (Demo)', '09:00', '18:00', 15, 480, 60, 0, 0, true),
 ('Late Shift (Demo)', '11:00', '20:00', 10, 480, 60, 15, 0, true);

insert into public.attendance_locations(name, address, latitude, longitude, radius_m, is_demo) values
 ('Demo HQ — Lucknow', 'Demo address, Gomti Nagar, Lucknow', 26.8467, 80.9462, 200, true),
 ('Demo Branch — Delhi', 'Demo address, Connaught Place, New Delhi', 28.6315, 77.2167, 150, true),
 ('Demo Branch — Bengaluru', 'Demo address, Koramangala, Bengaluru', 12.9352, 77.6245, 150, true);

insert into public.attendance_devices(name, device_code, device_type, location_id, status, is_demo)
select 'Demo Fingerprint Reader', 'DEMO-DEV-001', 'FINGERPRINT', id, 'NOT_CONFIGURED', true from public.attendance_locations where name like 'Demo HQ%'
union all
select 'Demo Face Terminal', 'DEMO-DEV-002', 'FACE', id, 'NOT_CONFIGURED', true from public.attendance_locations where name like 'Demo Branch — Delhi';

with names(n, nm) as (values
 (1,'Aarav Mehta'),(2,'Diya Kapoor'),(3,'Kabir Rao'),(4,'Ananya Iyer'),(5,'Vihaan Joshi'),(6,'Isha Malhotra'),
 (7,'Arjun Nair'),(8,'Meera Pillai'),(9,'Reyansh Gupta'),(10,'Saanvi Reddy'),(11,'Aditya Verma'),(12,'Kiara Singh'),
 (13,'Rohan Das'),(14,'Tara Menon'),(15,'Yash Patel'),(16,'Nisha Bose'),(17,'Dev Khanna'),(18,'Riya Chawla'),
 (19,'Aman Siddiqui'),(20,'Zara Qureshi'),(21,'Neel Bhatt'),(22,'Pooja Shetty'),(23,'Karan Arora'),(24,'Sneha Kulkarni'),
 (25,'Farhan Ali'),(26,'Leela Krishnan'),(27,'Omar Sheikh'),(28,'Priya Desai'),(29,'Ishaan Tiwari'),(30,'Mira Saxena'))
insert into public.employees(employee_code, full_name, email, department_id, rule_id, location_id, is_demo)
select 'DEMO-' || lpad(n::text,3,'0'), nm, 'demo.' || n || '@attendancevala.demo',
  (select id from public.departments order by name offset ((n-1) % 5) limit 1),
  (select id from public.attendance_rules order by name offset (case when n % 6 = 0 then 1 else 0 end) limit 1),
  (select id from public.attendance_locations order by name offset ((n-1) % 3) limit 1),
  true
from names;

do $$
declare e record; d date; h int; tz text := 'Asia/Kolkata'; today date := (now() at time zone 'Asia/Kolkata')::date;
  ci timestamptz; bs timestamptz; be timestamptz; co timestamptz; src text;
begin
  for e in select emp.id, r.start_time, r.end_time from public.employees emp join public.attendance_rules r on r.id = emp.rule_id loop
    for d in select g::date from generate_series(today - 34, today, interval '1 day') g loop
      if extract(isodow from d) in (6,7) then continue; end if;
      h := abs(hashtext(e.id::text || d::text));
      if h % 14 = 0 then continue; end if;
      if d = today and h % 8 = 0 then continue; end if;
      ci := ((d + e.start_time) + make_interval(mins => (h % 40) - 17)) at time zone tz;
      bs := ((d + e.start_time) + interval '4 hours' + make_interval(mins => (h / 7) % 25)) at time zone tz;
      be := bs + make_interval(mins => 25 + (h / 11) % 50);
      co := ((d + e.end_time) + make_interval(mins => ((h / 13) % 150) - 55)) at time zone tz;
      src := case when h % 5 = 0 then 'MOBILE' else 'WEB' end;
      if ci < now() then
        insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, is_demo, metadata) values (e.id, 'CHECK_IN', ci, d, src, true, '{"seed":true}');
      else continue; end if;
      if bs < now() then
        insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, is_demo, metadata) values (e.id, 'BREAK_START', bs, d, src, true, '{"seed":true}');
        if be < now() then
          insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, is_demo, metadata) values (e.id, 'BREAK_END', be, d, src, true, '{"seed":true}');
        end if;
      end if;
      if co < now() and be < now() and not (d < today and h % 19 = 0) then
        insert into public.attendance_events(employee_id, event_type, occurred_at, work_date, source, is_demo, metadata) values (e.id, 'CHECK_OUT', co, d, src, true, '{"seed":true}');
      end if;
    end loop;
  end loop;
end $$;

insert into public.attendance_corrections(employee_id, work_date, correction_type, requested_value, reason, status, is_demo)
select e.id, (now() at time zone 'Asia/Kolkata')::date - 3, 'MISSING_CHECK_OUT',
  (((now() at time zone 'Asia/Kolkata')::date - 3) + time '18:05') at time zone 'Asia/Kolkata',
  'Demo request: forgot to check out after team meeting', 'PENDING', true
from public.employees e where e.employee_code in ('DEMO-004','DEMO-011');