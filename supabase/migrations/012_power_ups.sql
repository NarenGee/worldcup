-- Quarter-final power-ups: one double-points and one sneak-peek per user

create table user_power_ups (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  power_up_type text not null check (power_up_type in ('double_points', 'sneak_peek')),
  match_id int references matches(id) on delete cascade not null,
  assigned_at timestamptz default now() not null,
  unique (user_id, power_up_type)
);

create index user_power_ups_match_id_idx on user_power_ups (match_id);

alter table user_power_ups enable row level security;

create policy "Users can read own power ups"
on user_power_ups for select
using (auth.uid() = user_id);

create policy "Users can assign power ups on open qf matches"
on user_power_ups for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from matches m
    where m.id = match_id
      and m.stage = 'qf'
      and m.kickoff_at > now()
  )
);

create policy "Users can update power ups before assigned match kicks off"
on user_power_ups for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from matches m
    where m.id = user_power_ups.match_id
      and m.kickoff_at > now()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from matches m
    where m.id = match_id
      and m.stage = 'qf'
      and m.kickoff_at > now()
  )
);

create policy "Users can remove power ups before assigned match kicks off"
on user_power_ups for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from matches m
    where m.id = user_power_ups.match_id
      and m.kickoff_at > now()
  )
);

-- Extend scoring to support doubled points (max 6 = 3 × 2)

create or replace function award_match_points(
  predicted_home int,
  predicted_away int,
  home_score int,
  away_score int,
  result_confirmed boolean,
  is_default boolean,
  is_doubled boolean default false
) returns numeric
language sql
immutable
as $$
  select case
    when is_default then calculate_match_points(
      predicted_home,
      predicted_away,
      home_score,
      away_score,
      result_confirmed
    )::numeric / 2
    else calculate_match_points(
      predicted_home,
      predicted_away,
      home_score,
      away_score,
      result_confirmed
    )::numeric
  end * case when is_doubled then 2 else 1 end;
$$;

alter table predictions drop constraint if exists predictions_points_check;

alter table predictions
  add constraint predictions_points_check
  check (points is null or (points >= 0 and points <= 6));

create or replace function score_predictions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  scored_count int;
begin
  update predictions pr
  set points = award_match_points(
    pr.predicted_home,
    pr.predicted_away,
    m.home_score,
    m.away_score,
    m.result_confirmed,
    pr.is_default,
    exists (
      select 1
      from user_power_ups up
      where up.user_id = pr.user_id
        and up.match_id = pr.match_id
        and up.power_up_type = 'double_points'
    )
  )
  from matches m
  where pr.match_id = m.id
    and m.result_confirmed = true
    and m.home_score is not null
    and m.away_score is not null;

  get diagnostics scored_count = row_count;

  update predictions pr
  set points = null
  from matches m
  where pr.match_id = m.id
    and not m.result_confirmed;

  return scored_count;
end;
$$;

drop view if exists leaderboard;

create view leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(
    coalesce(
      pr.points,
      award_match_points(
        coalesce(pr.predicted_home, 1),
        coalesce(pr.predicted_away, 1),
        m.home_score,
        m.away_score,
        m.result_confirmed,
        coalesce(pr.is_default, m.kickoff_at <= now()),
        exists (
          select 1
          from user_power_ups up
          where up.user_id = p.id
            and up.match_id = m.id
            and up.power_up_type = 'double_points'
        )
      )
    )
  ) filter (where m.kickoff_at <= now()), 0)
  + case when prop.champion is not null and prop.champion = tr.champion then 5 else 0 end
  + case when prop.top_scorer is not null and prop.top_scorer = tr.top_scorer then 3 else 0 end
  as score,
  count(*) filter (where m.result_confirmed and m.kickoff_at <= now()) as matches_scored,
  count(*) filter (where m.kickoff_at <= now()) as matches_predicted,
  count(*) filter (
    where m.result_confirmed
      and m.kickoff_at <= now()
      and coalesce(pr.is_default, false) = false
      and coalesce(
        pr.points,
        award_match_points(
          coalesce(pr.predicted_home, 1),
          coalesce(pr.predicted_away, 1),
          m.home_score,
          m.away_score,
          m.result_confirmed,
          false,
          false
        )
      ) = 3
  ) as correct_predictions,
  case
    when count(*) filter (where m.result_confirmed and m.kickoff_at <= now()) > 0
    then round(
      100.0 * count(*) filter (
        where m.result_confirmed
          and m.kickoff_at <= now()
          and coalesce(pr.is_default, false) = false
          and coalesce(
            pr.points,
            award_match_points(
              coalesce(pr.predicted_home, 1),
              coalesce(pr.predicted_away, 1),
              m.home_score,
              m.away_score,
              m.result_confirmed,
              false,
              false
            )
          ) = 3
      ) / count(*) filter (where m.result_confirmed and m.kickoff_at <= now()),
      1
    )
    else null
  end as correct_prediction_rate
from profiles p
cross join matches m
left join predictions pr on pr.user_id = p.id and pr.match_id = m.id
left join props prop on prop.user_id = p.id
cross join tournament_results tr
where p.is_active = true
group by p.id, p.display_name, p.avatar_url, prop.champion, prop.top_scorer, tr.champion, tr.top_scorer
order by score desc;

select score_predictions();
