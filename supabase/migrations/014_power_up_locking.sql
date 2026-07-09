-- Sneak peek locks on assignment; double points lock when the match kicks off

drop policy if exists "Users can update power ups before assigned match kicks off"
  on user_power_ups;

drop policy if exists "Users can remove power ups before assigned match kicks off"
  on user_power_ups;

create policy "Users can update double points before kickoff"
on user_power_ups for update
using (
  auth.uid() = user_id
  and power_up_type = 'double_points'
  and exists (
    select 1
    from matches m
    where m.id = user_power_ups.match_id
      and m.kickoff_at > now()
  )
)
with check (
  auth.uid() = user_id
  and power_up_type = 'double_points'
  and exists (
    select 1
    from matches m
    where m.id = match_id
      and m.stage = 'qf'
      and m.kickoff_at > now()
  )
);
