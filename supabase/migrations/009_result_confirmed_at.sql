-- Track when a match result was confirmed (for daily recap by confirmation date)

alter table public.matches
  add column if not exists result_confirmed_at timestamptz;

create or replace function public.set_match_result_confirmed_at()
returns trigger
language plpgsql
as $$
begin
  if new.result_confirmed = true then
    if tg_op = 'INSERT' or old.result_confirmed is distinct from true then
      new.result_confirmed_at := coalesce(new.result_confirmed_at, now());
    end if;
  else
    new.result_confirmed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_set_result_confirmed_at on public.matches;

create trigger matches_set_result_confirmed_at
  before insert or update on public.matches
  for each row
  execute function public.set_match_result_confirmed_at();

-- Best-effort backfill for already-confirmed fixtures (kickoff + ~105 min)
update public.matches
set result_confirmed_at = kickoff_at + interval '105 minutes'
where result_confirmed = true
  and result_confirmed_at is null;
