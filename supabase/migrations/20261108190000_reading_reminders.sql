create table public.push_config (
  id boolean primary key default true check (id),
  public_key text not null
);
alter table public.push_config enable row level security;
create policy "Signed-in users can read the public push key"
  on public.push_config for select to authenticated using (true);
grant select on public.push_config to authenticated;

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null
);
alter table public.push_subscriptions enable row level security;
create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;

create table public.reading_reminder_jobs (
  id bigint generated always as identity primary key,
  meal_id bigint not null references public.meals(id) on delete cascade,
  endpoint text not null references public.push_subscriptions(endpoint) on delete cascade,
  due_at timestamptz not null,
  available_at timestamptz not null,
  sent_at timestamptz,
  unique (meal_id, endpoint)
);
alter table public.reading_reminder_jobs enable row level security;
grant select, update on public.reading_reminder_jobs to service_role;
create index reading_reminder_jobs_due_idx
  on public.reading_reminder_jobs (available_at) where sent_at is null;

create function public.queue_reading_reminders() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.glucose_after is null then
    insert into public.reading_reminder_jobs (meal_id, endpoint, due_at, available_at)
    select new.id, s.endpoint, now() + interval '2 hours', now() + interval '2 hours'
    from public.push_subscriptions s where s.user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_reading_reminders() from public, anon, authenticated;
create trigger queue_reading_reminders
  after insert on public.meals for each row execute function public.queue_reading_reminders();

create function public.claim_reading_reminders()
returns table (job_id bigint, meal_id bigint, endpoint text, p256dh text, auth text)
language sql security definer set search_path = ''
as $$
  with due as (
    select j.id
    from public.reading_reminder_jobs j
    join public.meals m on m.id = j.meal_id
    where j.sent_at is null and j.available_at <= now()
      and j.due_at > now() - interval '24 hours'
      and m.glucose_after is null
    order by j.available_at
    limit 100
    for update of j skip locked
  ), claimed as (
    update public.reading_reminder_jobs j
    set available_at = now() + interval '5 minutes'
    from due where j.id = due.id
    returning j.id, j.meal_id, j.endpoint
  )
  select c.id, c.meal_id, c.endpoint, s.p256dh, s.auth
  from claimed c join public.push_subscriptions s on s.endpoint = c.endpoint;
$$;
revoke all on function public.claim_reading_reminders() from public, anon, authenticated;
grant execute on function public.claim_reading_reminders() to service_role;
