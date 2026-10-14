-- LiMiTeD POO stockroom
-- Run this in the Supabase SQL editor after creating a project.
-- Then: Authentication → URL configuration
--   Site URL: your GitHub Pages URL (https://USER.github.io/limited-poo/)
--   Redirect URLs also include:
--     http://127.0.0.1:4173/**
--     http://localhost:4173/**
--     https://USER.github.io/limited-poo/**
-- Authentication → Sign In / Providers → Email: leave Email enabled.
-- There is no separate "Magic Link" switch. signInWithOtp sends a magic link by default.
-- Optional mall cop: insert your login email below so you can delete anyone's spam.

create table if not exists public.mall_cops (
  email text primary key
);

-- insert into public.mall_cops (email) values ('you@example.com');

create table if not exists public.pups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  name text not null,
  name_key text generated always as (lower(trim(name))) stored unique,
  breed text not null default '',
  vibe text not null check (vibe in ('quit', 'compete', 'yammer')),
  bio text not null default '',
  emoji text not null default '🐾',
  color text not null default '#ffd1ec',
  locked boolean not null default false,
  is_founder boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.streaks (
  pup_id uuid primary key references public.pups (id) on delete cascade,
  days int not null default 0,
  last_slip text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  pup_id uuid not null references public.pups (id) on delete cascade,
  event text not null,
  points int not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  pup_id uuid not null references public.pups (id) on delete cascade,
  board text not null check (board in ('quit', 'scores', 'yammer')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_stats (
  id int primary key default 1 check (id = 1),
  visits int not null default 284019
);

insert into public.site_stats (id, visits) values (1, 284019) on conflict (id) do nothing;

create or replace function public.i_am_mall_cop()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mall_cops
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.bump_visits()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  update public.site_stats set visits = visits + 1 where id = 1 returning visits into v;
  return v;
end;
$$;

create or replace function public.touch_streak()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists streaks_touch on public.streaks;
create trigger streaks_touch before update on public.streaks
for each row execute function public.touch_streak();

-- Seed mall regulars (locked so nobody can claim their names)
insert into public.pups (id, name, breed, vibe, bio, emoji, color, locked, is_founder) values
  ('00000000-0000-4000-8000-000000000001', 'Millie', 'cream cloud mix', 'quit',
    'Founder. Professional sofa model. Currently negotiating with her own nose.',
    '🐶', '#ffe8a3', true, true),
  ('00000000-0000-4000-8000-000000000002', 'Scoops McGee', 'beagle diplomat', 'compete',
    'Still chasing a personal best. Claims the driveway counts as an away game.',
    '🥇', '#ffd1ec', true, false),
  ('00000000-0000-4000-8000-000000000003', 'Brutus', 'velvet tank', 'quit',
    '91 days snack-free. Sponsor to three other tanks. Cries at kibble commercials.',
    '💪', '#d9f8ff', true, false),
  ('00000000-0000-4000-8000-000000000004', 'Glitter Cupcake', 'yorkie tornado', 'compete',
    'Tiny body. Historic audacity. Once scored in a wedding photo.',
    '✨', '#e7ffc4', true, false),
  ('00000000-0000-4000-8000-000000000005', 'Mochi', 'pom puff', 'quit',
    'Quit Crew greeter. Sends encouraging woofs at 5am whether you asked or not.',
    '🍡', '#ffe0ff', true, false),
  ('00000000-0000-4000-8000-000000000006', 'Bean', 'corgi loaf', 'yammer',
    'Yammer moderator. Deletes posts that glorify cat-box cuisine. We have standards.',
    '🍞', '#fff3c4', true, false)
on conflict (id) do nothing;

insert into public.streaks (pup_id, days, last_slip) values
  ('00000000-0000-4000-8000-000000000001', 4, 'sniffed a mystery log, walked away'),
  ('00000000-0000-4000-8000-000000000003', 91, 'a picnic platter in 2024'),
  ('00000000-0000-4000-8000-000000000005', 12, 'four-second sidewalk sniff')
on conflict (pup_id) do nothing;

insert into public.scores (pup_id, event, points, note)
select * from (values
  ('00000000-0000-4000-8000-000000000004'::uuid, 'Wedding recessional', 940, 'White dress. Dark secret.'),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Driveway deluxe', 720, 'Two laps, one trophy.'),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Living-room almost', 15, 'Sniffed. Humans screamed. Growth.')
) as seed(pup_id, event, points, note)
where not exists (select 1 from public.scores limit 1);

insert into public.posts (pup_id, board, title, body)
select * from (values
  ('00000000-0000-4000-8000-000000000005'::uuid, 'quit', 'day 12 check-in',
    'The yard smelled like a buffet and I walked PAST it. I am basically a monk now.'),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'scores', 'is freshness a skill issue',
    'Some of you are scoring on day-old material and calling it sport. Be serious.'),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'yammer', 'club rules (the cute ones)',
    'No shaming pups who are trying. Shaming the snack itself is encouraged. Also: wipe your snout.')
) as seed(pup_id, board, title, body)
where not exists (select 1 from public.posts limit 1);

alter table public.mall_cops enable row level security;
alter table public.pups enable row level security;
alter table public.streaks enable row level security;
alter table public.scores enable row level security;
alter table public.posts enable row level security;
alter table public.site_stats enable row level security;

create policy "cops hidden" on public.mall_cops for select using (false);

create policy "pups readable" on public.pups for select using (true);
create policy "claim one pup" on public.pups for insert to authenticated
  with check (user_id = auth.uid() and locked = false and is_founder = false);
create policy "edit own pup" on public.pups for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and locked = false);

create policy "streaks readable" on public.streaks for select using (true);
create policy "insert own streak" on public.streaks for insert to authenticated
  with check (exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid()));
create policy "update own streak" on public.streaks for update to authenticated
  using (exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid()));

create policy "scores readable" on public.scores for select using (true);
create policy "log own score" on public.scores for insert to authenticated
  with check (exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid()));
create policy "delete score" on public.scores for delete to authenticated
  using (
    public.i_am_mall_cop()
    or exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid())
  );

create policy "posts readable" on public.posts for select using (true);
create policy "woof as self" on public.posts for insert to authenticated
  with check (exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid()));
create policy "delete post" on public.posts for delete to authenticated
  using (
    public.i_am_mall_cop()
    or exists (select 1 from public.pups p where p.id = pup_id and p.user_id = auth.uid())
  );

create policy "stats readable" on public.site_stats for select using (true);

grant execute on function public.bump_visits() to anon, authenticated;
grant execute on function public.i_am_mall_cop() to authenticated, anon;
