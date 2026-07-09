-- Track which feature announcements each user has dismissed

alter table profiles
  add column if not exists dismissed_announcements text[] not null default '{}';
