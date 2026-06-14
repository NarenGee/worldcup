-- Enable realtime updates for leaderboard refresh

do $$
begin
  alter publication supabase_realtime add table matches;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table predictions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table props;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table tournament_results;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table profiles;
exception
  when duplicate_object then null;
end $$;
