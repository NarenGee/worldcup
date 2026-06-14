-- Auto (default) picks earn half match points

alter table predictions
  add column if not exists is_default boolean not null default false;

-- Predictions inserted after kickoff were auto-applied (manual picks are blocked by RLS)
update predictions pr
set is_default = true
from matches m
where pr.match_id = m.id
  and pr.submitted_at >= m.kickoff_at;

create or replace function award_match_points(
  predicted_home int,
  predicted_away int,
  home_score int,
  away_score int,
  result_confirmed boolean,
  is_default boolean
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
  end;
$$;

create or replace function apply_default_predictions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into predictions (user_id, match_id, predicted_home, predicted_away, is_default)
  select p.id, m.id, 1, 1, true
  from profiles p
  cross join matches m
  where p.is_active = true
    and m.kickoff_at <= now()
    and not exists (
      select 1
      from predictions pr
      where pr.user_id = p.id
        and pr.match_id = m.id
    )
  on conflict (user_id, match_id) do nothing;
end;
$$;

-- Must drop the view before changing predictions.points type
drop view if exists leaderboard;

alter table predictions drop constraint if exists predictions_points_check;

alter table predictions
  alter column points type numeric(4, 1) using points::numeric(4, 1);

alter table predictions
  add constraint predictions_points_check
  check (points is null or (points >= 0 and points <= 3));

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
    pr.is_default
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
        coalesce(pr.is_default, m.kickoff_at <= now())
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
