-- 48-team World Cup 2026 adds a Round of 32 knockout stage.
-- Allow 'r32' as a valid match stage.

alter table matches drop constraint if exists matches_stage_check;

alter table matches
  add constraint matches_stage_check
  check (stage in ('group', 'r32', 'r16', 'qf', 'sf', 'final'));
