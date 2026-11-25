-- PixelPets schema, grants, and row level security.
-- Catalog only. Do not add passwords or service-role keys.
-- Apply in filename order in the Supabase SQL editor. Do not run a seed that creates login accounts.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
comment on schema private is 'Internal helpers. Do not expose this schema to the Data API.';

create extension if not exists pgcrypto with schema extensions;

create or replace function private.is_trusted_writer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'supabase_admin');
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.lands (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null,
  blurb text not null,
  sort_order integer not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  bio text not null default '',
  is_admin boolean not null default false,
  banned_at timestamptz,
  morning_streak integer not null default 0,
  morning_streak_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint profiles_display_len check (char_length(display_name) between 1 and 40),
  constraint profiles_bio_len check (char_length(bio) <= 400)
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.wallets (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  glims integer not null default 0 check (glims >= 0),
  updated_at timestamptz not null default now()
);

create table public.glim_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (reason in ('signup', 'morning_wick', 'game', 'shop_buy', 'shop_refund', 'trade', 'trade_refund', 'basket', 'steward', 'other')),
  ref_type text,
  ref_id uuid,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index glim_ledger_profile_idx on public.glim_ledger (profile_id, created_at desc);

create table public.species (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  blurb text not null,
  home_land_id uuid not null references public.lands (id),
  art_base_path text not null,
  base_hue integer not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.tints (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  hue integer not null,
  sat_mul numeric not null default 1,
  light_add numeric not null default 0,
  sort_order integer not null default 0
);

create table public.companions (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  species_id uuid not null references public.species (id),
  tint_id uuid not null references public.tints (id),
  name text not null,
  hunger integer not null check (hunger between 0 and 100),
  mood integer not null check (mood between 0 and 100),
  last_care_tick_at timestamptz not null default now(),
  last_fed_at timestamptz,
  last_played_at timestamptz,
  last_groomed_at timestamptz,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  constraint companions_name_format check (name ~ '^[A-Za-z][A-Za-z0-9'' -]{1,19}$')
);
create unique index companions_name_lower_idx on public.companions (lower(name));
create index companions_owner_idx on public.companions (owner_id);

create table public.items (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('food', 'treat', 'toy', 'groom', 'misc')),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare')),
  description text not null default '',
  hunger_delta integer not null default 0,
  mood_delta integer not null default 0,
  reusable boolean not null default false,
  icon_path text,
  is_active boolean not null default true
);

create table public.satchel_stacks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id),
  qty integer not null check (qty > 0),
  primary key (profile_id, item_id)
);

create table public.shops (
  id uuid primary key default extensions.gen_random_uuid(),
  land_id uuid not null references public.lands (id),
  slug text not null unique,
  name text not null,
  keeper_name text not null,
  blurb text not null,
  restock_min_minutes integer not null default 8,
  restock_max_minutes integer not null default 16,
  next_restock_at timestamptz not null default now()
);

create table public.shop_stock (
  shop_id uuid not null references public.shops (id) on delete cascade,
  item_id uuid not null references public.items (id),
  qty integer not null default 0 check (qty >= 0),
  price integer not null check (price >= 0),
  restock_target integer not null check (restock_target >= 0),
  restock_batch integer not null check (restock_batch > 0),
  primary key (shop_id, item_id)
);

create table public.basket_items (
  id uuid primary key default extensions.gen_random_uuid(),
  item_id uuid not null references public.items (id),
  donated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.daily_claims (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  daily_key text not null,
  claimed_on date not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (profile_id, daily_key, claimed_on)
);

create table public.trades (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled', 'expired')),
  ask_glims integer not null check (ask_glims >= 0),
  wishlist text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  accepted_offer_id uuid,
  constraint trades_wishlist_len check (char_length(wishlist) <= 200)
);

create table public.trade_lots (
  trade_id uuid not null references public.trades (id) on delete cascade,
  item_id uuid not null references public.items (id),
  qty integer not null check (qty > 0),
  primary key (trade_id, item_id)
);

create table public.trade_offers (
  id uuid primary key default extensions.gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  glims integer not null default 0 check (glims >= 0),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now()
);
create unique index trade_offers_one_open on public.trade_offers (trade_id, buyer_id) where status = 'open';

create table public.trade_offer_items (
  offer_id uuid not null references public.trade_offers (id) on delete cascade,
  item_id uuid not null references public.items (id),
  qty integer not null check (qty > 0),
  primary key (offer_id, item_id)
);

create table public.minigames (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  blurb text not null,
  score_cap integer not null,
  max_submits_per_day integer not null default 3,
  points_per_glim integer not null default 20,
  glim_cap_per_play integer not null default 1000,
  min_duration_ms integer not null,
  sort_order integer not null
);

create table public.game_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.minigames (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  nonce uuid not null,
  status text not null default 'open' check (status in ('open', 'submitted', 'rejected', 'expired')),
  client_score integer,
  awarded_score integer,
  awarded_glims integer,
  duration_ms integer,
  flagged boolean not null default false,
  user_agent text
);
create index game_sessions_player_idx on public.game_sessions (profile_id, game_id, ended_at);

create table public.forum_boards (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  title text not null,
  blurb text not null default '',
  sort_order integer not null default 0,
  circle_id uuid
);

create table public.forum_threads (
  id uuid primary key default extensions.gen_random_uuid(),
  board_id uuid not null references public.forum_boards (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  is_locked boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  constraint forum_threads_title_len check (char_length(title) between 1 and 80)
);
create index forum_threads_board_idx on public.forum_threads (board_id, last_post_at desc);

create table public.forum_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint forum_posts_body_len check (char_length(body) between 1 and 4000)
);
create index forum_posts_thread_idx on public.forum_posts (thread_id, created_at);

create table public.circles (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  motto text not null default '',
  about text not null default '',
  is_open boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint circles_slug_format check (slug ~ '^[a-z0-9-]{3,32}$')
);

alter table public.forum_boards
  add constraint forum_boards_circle_fk foreign key (circle_id) references public.circles (id) on delete cascade;

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('keeper', 'guide', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, profile_id)
);
create unique index circle_members_one_circle on public.circle_members (profile_id);

create table public.circle_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now()
);
create unique index circle_invites_one_pending on public.circle_invites (circle_id, invitee_id) where status = 'pending';

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id),
  constraint reports_reason_len check (char_length(reason) between 1 and 4000)
);

create table public.ban_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table private.rate_limits (
  profile_id uuid not null,
  action text not null,
  acted_at timestamptz not null,
  primary key (profile_id, action)
);

create or replace function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.banned_at := null;
    new.morning_streak := 0;
    new.morning_streak_on := null;
    return new;
  end if;
  if not private.is_trusted_writer() then
    new.is_admin := old.is_admin;
    new.banned_at := old.banned_at;
    new.morning_streak := old.morning_streak;
    new.morning_streak_on := old.morning_streak_on;
    new.username := old.username;
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_guard
before insert or update on public.profiles
for each row execute function private.guard_profile();

create or replace function private.reject_untrusted_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_trusted_writer() then
    raise exception 'That book is only written by the quay.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger wallets_guard before insert or update or delete on public.wallets
for each row execute function private.reject_untrusted_write();
create trigger ledger_guard before insert or update or delete on public.glim_ledger
for each row execute function private.reject_untrusted_write();
create trigger companions_guard before insert or update or delete on public.companions
for each row execute function private.reject_untrusted_write();
create trigger satchel_guard before insert or update or delete on public.satchel_stacks
for each row execute function private.reject_untrusted_write();
create trigger stock_guard before insert or update or delete on public.shop_stock
for each row execute function private.reject_untrusted_write();
create trigger basket_guard before insert or update or delete on public.basket_items
for each row execute function private.reject_untrusted_write();
create trigger claims_guard before insert or update or delete on public.daily_claims
for each row execute function private.reject_untrusted_write();
create trigger trades_guard before insert or update or delete on public.trades
for each row execute function private.reject_untrusted_write();
create trigger lots_guard before insert or update or delete on public.trade_lots
for each row execute function private.reject_untrusted_write();
create trigger offers_guard before insert or update or delete on public.trade_offers
for each row execute function private.reject_untrusted_write();
create trigger offer_items_guard before insert or update or delete on public.trade_offer_items
for each row execute function private.reject_untrusted_write();
create trigger sessions_guard before insert or update or delete on public.game_sessions
for each row execute function private.reject_untrusted_write();

create or replace function private.enforce_companion_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is not null then
    perform 1 from public.profiles where id = new.owner_id for update;
    if (select count(*) from public.companions where owner_id = new.owner_id) > 4 then
      raise exception 'A keeper may only have four companions.';
    end if;
  end if;
  return new;
end;
$$;

create trigger companions_cap
after insert or update of owner_id on public.companions
for each row execute function private.enforce_companion_cap();

alter table public.lands enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.glim_ledger enable row level security;
alter table public.species enable row level security;
alter table public.tints enable row level security;
alter table public.items enable row level security;
alter table public.companions enable row level security;
alter table public.satchel_stacks enable row level security;
alter table public.shops enable row level security;
alter table public.shop_stock enable row level security;
alter table public.basket_items enable row level security;
alter table public.daily_claims enable row level security;
alter table public.trades enable row level security;
alter table public.trade_lots enable row level security;
alter table public.trade_offers enable row level security;
alter table public.trade_offer_items enable row level security;
alter table public.minigames enable row level security;
alter table public.game_sessions enable row level security;
alter table public.forum_boards enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;
alter table public.reports enable row level security;
alter table public.ban_notes enable row level security;

create or replace function private.caller_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin and p.banned_at is null
  );
$$;

create policy lands_read on public.lands for select to anon, authenticated using (true);
create policy species_read on public.species for select to anon, authenticated using (true);
create policy tints_read on public.tints for select to anon, authenticated using (true);
create policy items_read on public.items for select to anon, authenticated using (is_active or private.caller_is_admin());
create policy shops_read on public.shops for select to anon, authenticated using (true);
create policy stock_read on public.shop_stock for select to anon, authenticated using (true);
create policy games_read on public.minigames for select to anon, authenticated using (true);
create policy companions_read on public.companions for select to anon, authenticated using (true);
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy wallets_read on public.wallets for select to anon, authenticated using (true);
create policy basket_read on public.basket_items for select to anon, authenticated using (true);
create policy trades_read on public.trades for select to anon, authenticated using (true);
create policy lots_read on public.trade_lots for select to anon, authenticated using (true);
create policy circles_read on public.circles for select to anon, authenticated using (true);
create policy members_read on public.circle_members for select to anon, authenticated using (true);

create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid()) and banned_at is null)
with check (id = (select auth.uid()));

create policy ledger_read on public.glim_ledger for select to authenticated
using (profile_id = (select auth.uid()) or private.caller_is_admin());

create policy satchel_read on public.satchel_stacks for select to authenticated
using (profile_id = (select auth.uid()) or private.caller_is_admin());

create policy claims_read on public.daily_claims for select to authenticated
using (profile_id = (select auth.uid()) or private.caller_is_admin());

create policy sessions_read on public.game_sessions for select to authenticated
using (profile_id = (select auth.uid()) or private.caller_is_admin());

create policy offers_read on public.trade_offers for select to anon, authenticated
using (
  buyer_id = (select auth.uid())
  or exists (select 1 from public.trades t where t.id = trade_id and t.seller_id = (select auth.uid()))
  or private.caller_is_admin()
);

create policy offer_items_read on public.trade_offer_items for select to anon, authenticated
using (
  exists (
    select 1 from public.trade_offers o
    join public.trades t on t.id = o.trade_id
    where o.id = offer_id
      and (o.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()) or private.caller_is_admin())
  )
);

create policy boards_read on public.forum_boards for select to anon, authenticated
using (
  circle_id is null
  or private.caller_is_admin()
  or exists (select 1 from public.circle_members m where m.circle_id = forum_boards.circle_id and m.profile_id = (select auth.uid()))
);

create policy threads_read on public.forum_threads for select to anon, authenticated
using (
  (not is_hidden or author_id = (select auth.uid()) or private.caller_is_admin())
  and exists (
    select 1 from public.forum_boards b
    where b.id = board_id
      and (
        b.circle_id is null
        or private.caller_is_admin()
        or exists (select 1 from public.circle_members m where m.circle_id = b.circle_id and m.profile_id = (select auth.uid()))
      )
  )
);

create policy posts_read on public.forum_posts for select to anon, authenticated
using (
  (not is_hidden or author_id = (select auth.uid()) or private.caller_is_admin())
  and exists (
    select 1 from public.forum_threads t
    join public.forum_boards b on b.id = t.board_id
    where t.id = thread_id
      and (
        b.circle_id is null
        or private.caller_is_admin()
        or exists (select 1 from public.circle_members m where m.circle_id = b.circle_id and m.profile_id = (select auth.uid()))
      )
  )
);

create policy invites_read on public.circle_invites for select to authenticated
using (
  invitee_id = (select auth.uid())
  or private.caller_is_admin()
  or exists (
    select 1 from public.circle_members m
    where m.circle_id = circle_invites.circle_id
      and m.profile_id = (select auth.uid())
      and m.role in ('keeper', 'guide')
  )
);

create policy reports_read on public.reports for select to authenticated
using (reporter_id = (select auth.uid()) or private.caller_is_admin());

create policy reports_insert on public.reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.banned_at is not null)
);

create policy ban_notes_read on public.ban_notes for select to authenticated
using (private.caller_is_admin());

create view public.game_scoreboard with (security_invoker = false) as
select
  s.id,
  s.profile_id,
  p.username,
  g.slug as game_slug,
  g.name as game_name,
  s.awarded_score,
  s.awarded_glims,
  s.ended_at
from public.game_sessions s
join public.profiles p on p.id = s.profile_id
join public.minigames g on g.id = s.game_id
where s.status = 'submitted';

grant usage on schema public to anon, authenticated, service_role;

grant select on public.lands, public.species, public.tints, public.items, public.shops, public.shop_stock,
  public.minigames, public.companions, public.profiles, public.wallets, public.basket_items, public.trades,
  public.trade_lots, public.circles, public.circle_members, public.game_scoreboard
to anon, authenticated;

grant select on public.forum_boards, public.forum_threads, public.forum_posts, public.trade_offers, public.trade_offer_items
to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.glim_ledger, public.satchel_stacks, public.daily_claims, public.game_sessions,
  public.circle_invites, public.reports, public.ban_notes
to authenticated;
grant insert on public.reports to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on public.game_scoreboard to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.caller_is_admin() to anon, authenticated, service_role;
