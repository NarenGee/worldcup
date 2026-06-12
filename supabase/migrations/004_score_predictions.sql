-- Store per-prediction points and score them after results sync

alter table predictions
  add column if not exists points int check (points is null or (points >= 0 and points <= 3));

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
  set points = calculate_match_points(
    pr.predicted_home,
    pr.predicted_away,
    m.home_score,
    m.away_score,
    m.result_confirmed
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

grant execute on function score_predictions() to authenticated, service_role;

-- Leaderboard uses stored points when available (updated by score_predictions)
create or replace view leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(
    coalesce(
      pr.points,
      calculate_match_points(
        coalesce(pr.predicted_home, 1),
        coalesce(pr.predicted_away, 1),
        m.home_score,
        m.away_score,
        m.result_confirmed
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
      and coalesce(
        pr.points,
        calculate_match_points(
          coalesce(pr.predicted_home, 1),
          coalesce(pr.predicted_away, 1),
          m.home_score,
          m.away_score,
          m.result_confirmed
        )
      ) = 3
  ) as correct_predictions,
  case
    when count(*) filter (where m.result_confirmed and m.kickoff_at <= now()) > 0
    then round(
      100.0 * count(*) filter (
        where m.result_confirmed
          and m.kickoff_at <= now()
          and coalesce(
            pr.points,
            calculate_match_points(
              coalesce(pr.predicted_home, 1),
              coalesce(pr.predicted_away, 1),
              m.home_score,
              m.away_score,
              m.result_confirmed
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
