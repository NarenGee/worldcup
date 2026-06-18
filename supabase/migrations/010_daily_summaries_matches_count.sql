alter table public.daily_summaries
  add column if not exists matches_count int not null default 0;
