-- Auto-lock missing predictions as 1-1 after kickoff

create or replace function apply_default_predictions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into predictions (user_id, match_id, predicted_home, predicted_away)
  select p.id, m.id, 1, 1
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

grant execute on function apply_default_predictions() to authenticated, service_role;

-- Score missed picks as 1-1 on the leaderboard
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
  count(*) filter (where m.kickoff_at <= now()) as matches_predicted
from profiles p
cross join matches m
left join predictions pr on pr.user_id = p.id and pr.match_id = m.id
left join props prop on prop.user_id = p.id
cross join tournament_results tr
where p.is_active = true
group by p.id, p.display_name, p.avatar_url, prop.champion, prop.top_scorer, tr.champion, tr.top_scorer
order by score desc;
