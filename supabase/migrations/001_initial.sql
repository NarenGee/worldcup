-- World Cup 2026 Prediction Game — initial schema

-- User profiles
create table profiles (
  id uuid references auth.users primary key,
  display_name text not null,
  avatar_url text,
  is_admin boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Matches (auto-populated from API + manual admin override)
create table matches (
  id serial primary key,
  stage text not null check (stage in ('group', 'r16', 'qf', 'sf', 'final')),
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  result_confirmed boolean default false,
  external_id text unique
);

-- Predictions (locked at kickoff)
create table predictions (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  match_id int references matches(id) on delete cascade,
  predicted_home int not null check (predicted_home >= 0 and predicted_home <= 9),
  predicted_away int not null check (predicted_away >= 0 and predicted_away <= 9),
  submitted_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Tournament-long prop bets
create table props (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  champion text,
  top_scorer text,
  submitted_at timestamptz default now(),
  unique(user_id)
);

-- Admin-set tournament results for props scoring
create table tournament_results (
  id int primary key default 1 check (id = 1),
  champion text,
  top_scorer text,
  updated_at timestamptz default now()
);

insert into tournament_results (id) values (1);

-- Scoring function (mirrored client-side in lib/scoring.ts)
create or replace function calculate_match_points(
  predicted_home int,
  predicted_away int,
  home_score int,
  away_score int,
  result_confirmed boolean
) returns int
language plpgsql
immutable
as $$
begin
  if not result_confirmed or home_score is null or away_score is null then
    return 0;
  end if;

  if predicted_home = home_score and predicted_away = away_score then
    return 3;
  end if;

  if sign(predicted_home - predicted_away) = sign(home_score - away_score) then
    return 1;
  end if;

  return 0;
end;
$$;

-- Leaderboard view with match + props scoring
create view leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(
    calculate_match_points(
      pr.predicted_home,
      pr.predicted_away,
      m.home_score,
      m.away_score,
      m.result_confirmed
    )
  ), 0)
  + case when prop.champion is not null and prop.champion = tr.champion then 5 else 0 end
  + case when prop.top_scorer is not null and prop.top_scorer = tr.top_scorer then 3 else 0 end
  as score,
  count(pr.id) filter (where m.result_confirmed) as matches_scored,
  count(pr.id) as matches_predicted
from profiles p
left join predictions pr on pr.user_id = p.id
left join matches m on m.id = pr.match_id
left join props prop on prop.user_id = p.id
cross join tournament_results tr
where p.is_active = true
group by p.id, p.display_name, p.avatar_url, prop.champion, prop.top_scorer, tr.champion, tr.top_scorer
order by score desc;

-- Row Level Security
alter table profiles enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table props enable row level security;
alter table tournament_results enable row level security;

-- Profiles
create policy "Users can read all profiles"
on profiles for select using (true);

create policy "Users can insert own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update using (auth.uid() = id);

create policy "Admins can update all profiles"
on profiles for update
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Predictions
create policy "Users can read all predictions"
on predictions for select using (true);

create policy "Users can insert own predictions before kickoff"
on predictions for insert
with check (
  auth.uid() = user_id and
  (select kickoff_at from matches where id = match_id) > now()
);

create policy "Users can update own predictions before kickoff"
on predictions for update
using (
  auth.uid() = user_id and
  (select kickoff_at from matches where id = match_id) > now()
);

-- Props
create policy "Users can read all props"
on props for select using (true);

create policy "Users can insert own props before tournament start"
on props for insert
with check (
  auth.uid() = user_id and
  now() < coalesce((select min(kickoff_at) from matches where stage = 'group'), 'infinity'::timestamptz)
);

create policy "Users can update own props before tournament start"
on props for update
using (
  auth.uid() = user_id and
  now() < coalesce((select min(kickoff_at) from matches where stage = 'group'), 'infinity'::timestamptz)
);

-- Matches
create policy "All users can read matches"
on matches for select using (true);

create policy "Only admins can write matches"
on matches for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Tournament results
create policy "All users can read tournament results"
on tournament_results for select using (true);

create policy "Only admins can write tournament results"
on tournament_results for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users upload own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatars are public"
on storage.objects for select
using (bucket_id = 'avatars');

-- Extensions for cron (enable in Supabase dashboard if not already)
-- create extension if not exists pg_cron with schema pg_catalog;
-- create extension if not exists pg_net;

-- Cron job snippet (run manually after deploying edge function; store secrets in Vault):
-- select cron.schedule(
--   'sync-wc-results',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-results',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
