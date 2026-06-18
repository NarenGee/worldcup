create table if not exists public.daily_summaries (
  summary_date text primary key,
  summary text not null,
  content_hash text not null,
  generated_at timestamptz not null default now()
);

alter table public.daily_summaries enable row level security;

create policy "Anyone can read daily summaries"
  on public.daily_summaries
  for select
  using (true);

create policy "Service role manages daily summaries"
  on public.daily_summaries
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
