alter table public.profiles
  add column if not exists gender text,
  add column if not exists club_name text;

comment on column public.profiles.gender is 'Optional player gender used for coach directory filtering.';
comment on column public.profiles.club_name is 'Optional golf club used for coach directory filtering.';
