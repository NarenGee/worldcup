-- Add correct prediction rate to leaderboard (outcome correct = 1+ match points)

create or replace view leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(
    calculate_match_points(
      coalesce(pr.predicted_home, 1),
      coalesce(pr.predicted_away, 1),
      m.home_score,
      m.away_score,
      m.result_confirmed
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
      and calculate_match_points(
        coalesce(pr.predicted_home, 1),
        coalesce(pr.predicted_away, 1),
        m.home_score,
        m.away_score,
        m.result_confirmed
      ) > 0
  ) as correct_predictions,
  case
    when count(*) filter (where m.result_confirmed and m.kickoff_at <= now()) > 0
    then round(
      100.0 * count(*) filter (
        where m.result_confirmed
          and m.kickoff_at <= now()
          and calculate_match_points(
            coalesce(pr.predicted_home, 1),
            coalesce(pr.predicted_away, 1),
            m.home_score,
            m.away_score,
            m.result_confirmed
          ) > 0
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
