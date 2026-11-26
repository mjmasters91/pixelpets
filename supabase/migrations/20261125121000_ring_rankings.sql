-- Ember Ring rankings and rated keeper challenges.
-- Review and apply manually. Do not run this against production from the app.
-- Ratings move only on PvP wins and losses. Crownwyrm stays out of those boards.
-- A bout is unrated when the level gap is over 8, the rating gap is over 400,
-- or the same two companions already have three rated bouts today (Wick Time).
-- Same-owner pets cannot challenge each other. The defender's companion is still
-- played by the ring. Rewards stay inside the existing daily caps.

alter table public.companions add column if not exists rating integer not null default 1000;
alter table public.companions add column if not exists pve_wins integer not null default 0;
alter table public.companions add column if not exists pve_losses integer not null default 0;
alter table public.companions add column if not exists pvp_wins integer not null default 0;
alter table public.companions add column if not exists pvp_losses integer not null default 0;
alter table public.companions add column if not exists pve_streak integer not null default 0;
alter table public.companions add column if not exists pvp_streak integer not null default 0;

alter table public.battles add column if not exists defender_id uuid references public.companions (id);
alter table public.battles add column if not exists rated boolean not null default false;
alter table public.battles add column if not exists rating_delta integer not null default 0;

create table if not exists public.ring_results (
  id uuid primary key default extensions.gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  companion_id uuid not null references public.companions (id) on delete cascade,
  opponent_id uuid references public.companions (id) on delete set null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('pve', 'pvp')),
  outcome text not null check (outcome in ('win', 'loss')),
  rated boolean not null default false,
  rating_before integer not null,
  rating_after integer not null,
  created_at timestamptz not null default now()
);
create index if not exists ring_results_battle_idx on public.ring_results (battle_id);
create index if not exists ring_results_companion_idx on public.ring_results (companion_id, created_at desc);

create table if not exists public.ring_notices (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid references public.battles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists ring_notices_profile_idx on public.ring_notices (profile_id, created_at desc);

drop trigger if exists ring_results_guard on public.ring_results;
create trigger ring_results_guard before insert or update or delete on public.ring_results
for each row execute function private.reject_untrusted_write();

drop trigger if exists ring_notices_guard on public.ring_notices;
create trigger ring_notices_guard before insert or update or delete on public.ring_notices
for each row execute function private.reject_untrusted_write();

alter table public.ring_results enable row level security;
alter table public.ring_notices enable row level security;
drop policy if exists ring_notices_read on public.ring_notices;
create policy ring_notices_read on public.ring_notices for select to authenticated
using (profile_id = (select auth.uid()));

create or replace function private.elo_delta(p_mine integer, p_theirs integer, p_score numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select round(32 * (
    p_score - (1.0 / (1.0 + pg_catalog.power(10::numeric, (p_theirs - p_mine) / 400.0)))
  ))::integer;
$$;

create or replace function private.companion_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name,
    'speciesSlug', s.slug, 'speciesName', s.name,
    'tintSlug', t.slug, 'tintName', t.name,
    'ownerId', c.owner_id, 'ownerUsername', pr.username,
    'hunger', c.hunger, 'mood', c.mood,
    'createdAt', c.created_at, 'lastPlayedAt', c.last_played_at,
    'level', c.level, 'xp', c.xp, 'wins', c.wins, 'losses', c.losses,
    'rating', c.rating,
    'pveWins', c.pve_wins, 'pveLosses', c.pve_losses, 'pveStreak', c.pve_streak,
    'pvpWins', c.pvp_wins, 'pvpLosses', c.pvp_losses, 'pvpStreak', c.pvp_streak
  )
  from public.companions c
  join public.species s on s.id = c.species_id
  join public.tints t on t.id = c.tint_id
  left join public.profiles pr on pr.id = c.owner_id
  where c.id = p_id;
$$;

create or replace function private.battle_public(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_battle public.battles%rowtype;
  v_pet public.companions%rowtype;
begin
  select * into v_battle from public.battles where id = p_id;
  if not found then return null; end if;
  select * into v_pet from public.companions where id = v_battle.companion_id;
  return jsonb_build_object(
    'id', v_battle.id,
    'status', v_battle.status,
    'mode', v_battle.mode,
    'round', coalesce((v_battle.state ->> 'round')::int, 1),
    'you', jsonb_build_object(
      'name', v_battle.state #>> '{you,name}',
      'speciesSlug', v_battle.state #>> '{you,speciesSlug}',
      'hp', (v_battle.state #>> '{you,hp}')::int,
      'maxHp', (v_battle.state #>> '{you,maxHp}')::int,
      'infernoCd', coalesce((v_battle.state #>> '{you,infernoCd}')::int, 0)
    ),
    'foe', jsonb_build_object(
      'name', v_battle.state #>> '{foe,name}',
      'speciesSlug', v_battle.state #>> '{foe,speciesSlug}',
      'hp', (v_battle.state #>> '{foe,hp}')::int,
      'maxHp', (v_battle.state #>> '{foe,maxHp}')::int,
      'burn', coalesce((v_battle.state #>> '{foe,burn}')::int, 0)
    ),
    'log', coalesce(v_battle.state -> 'log', '[]'::jsonb),
    'rewardGlims', v_battle.reward_glims,
    'rewardXp', v_battle.reward_xp,
    'level', coalesce(v_pet.level, 1),
    'xp', coalesce(v_pet.xp, 0),
    'wins', coalesce(v_pet.wins, 0),
    'losses', coalesce(v_pet.losses, 0),
    'rated', v_battle.rated,
    'ratingDelta', v_battle.rating_delta
  );
end;
$$;

create or replace function private.settle_ring_ranks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_you public.companions%rowtype;
  v_foe public.companions%rowtype;
  v_score numeric;
  v_delta integer := 0;
  v_you_after integer;
  v_foe_after integer;
  v_note text;
begin
  if old.status is distinct from 'active' or new.status not in ('won', 'lost') then
    return new;
  end if;
  if exists (select 1 from public.ring_results where battle_id = new.id) then
    return new;
  end if;
  select * into v_you from public.companions where id = new.companion_id;
  if not found then
    return new;
  end if;

  if new.mode = 'pve' then
    if new.status = 'won' then
      update public.companions
      set pve_wins = pve_wins + 1, pve_streak = pve_streak + 1
      where id = v_you.id;
    else
      update public.companions
      set pve_losses = pve_losses + 1, pve_streak = 0
      where id = v_you.id;
    end if;
    insert into public.ring_results (battle_id, companion_id, opponent_id, profile_id, mode, outcome, rated, rating_before, rating_after)
    values (
      new.id, v_you.id, null, new.profile_id, 'pve',
      case when new.status = 'won' then 'win' else 'loss' end,
      false, v_you.rating, v_you.rating
    );
    return new;
  end if;

  if new.defender_id is null then
    return new;
  end if;
  select * into v_foe from public.companions where id = new.defender_id;
  if not found or v_foe.owner_id is null then
    return new;
  end if;

  v_score := case when new.status = 'won' then 1 else 0 end;
  if new.rated then
    v_delta := private.elo_delta(v_you.rating, v_foe.rating, v_score);
  end if;
  v_you_after := greatest(100, v_you.rating + v_delta);
  v_foe_after := greatest(100, v_foe.rating - v_delta);

  if new.status = 'won' then
    update public.companions
    set pvp_wins = pvp_wins + 1, pvp_streak = pvp_streak + 1, rating = v_you_after
    where id = v_you.id;
    update public.companions
    set losses = losses + 1, pvp_losses = pvp_losses + 1, pvp_streak = 0, rating = v_foe_after
    where id = v_foe.id;
  else
    update public.companions
    set pvp_losses = pvp_losses + 1, pvp_streak = 0, rating = v_you_after
    where id = v_you.id;
    update public.companions
    set wins = wins + 1, pvp_wins = pvp_wins + 1, pvp_streak = pvp_streak + 1, rating = v_foe_after
    where id = v_foe.id;
  end if;

  insert into public.ring_results (battle_id, companion_id, opponent_id, profile_id, mode, outcome, rated, rating_before, rating_after)
  values
    (new.id, v_you.id, v_foe.id, new.profile_id, 'pvp', case when new.status = 'won' then 'win' else 'loss' end, new.rated, v_you.rating, v_you_after),
    (new.id, v_foe.id, v_you.id, v_foe.owner_id, 'pvp', case when new.status = 'won' then 'loss' else 'win' end, new.rated, v_foe.rating, v_foe_after);

  v_note := v_foe.name || ' defended against ' || v_you.name || ': ' || case when new.status = 'lost' then 'won' else 'lost' end;
  if not new.rated then
    v_note := v_note || ' (unrated)';
  end if;
  insert into public.ring_notices (profile_id, battle_id, body)
  values (v_foe.owner_id, new.id, v_note);

  update public.battles
  set rating_delta = v_delta,
      state = jsonb_set(
        state,
        '{log}',
        coalesce(state -> 'log', '[]'::jsonb) || jsonb_build_array(
          case
            when new.rated then v_you.name || ' rating ' || case when v_delta >= 0 then '+' else '' end || v_delta::text || ' (' || v_you_after || '). ' || v_foe.name || ' ' || case when v_delta <= 0 then '+' else '' end || (-v_delta)::text || '.'
            else 'The gap is too wide, or this pair already fought three rated bouts today. Records move. Ratings stay.'
          end
        )
      )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists battles_rank_settle on public.battles;
create trigger battles_rank_settle
after update of status on public.battles
for each row
when (old.status = 'active' and new.status in ('won', 'lost'))
execute function private.settle_ring_ranks();

create or replace function public.list_pvp_targets()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'speciesSlug', s.slug,
      'owner', p.username, 'level', c.level,
      'rating', c.rating, 'pvpWins', c.pvp_wins, 'pvpLosses', c.pvp_losses, 'pvpStreak', c.pvp_streak
    ) order by c.rating desc, p.username, c.name)
    from public.companions c
    join public.species s on s.id = c.species_id
    join public.profiles p on p.id = c.owner_id
    where c.owner_id is not null
      and c.owner_id <> v_user
      and s.slug <> 'crownwyrm'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.start_battle(
  p_companion_id uuid, p_mode text, p_challenger_slug text, p_defender_id uuid, p_gear uuid[]
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := private.require_user();
  v_pet public.companions%rowtype;
  v_spec public.species%rowtype;
  v_gear uuid;
  v_item public.items%rowtype;
  v_weapon int := 0;
  v_shield int := 0;
  v_potion int := 0;
  v_count int := 0;
  v_you jsonb;
  v_foe jsonb;
  v_foe_species text;
  v_foe_level int;
  v_foe_name text;
  v_foe_owner uuid;
  v_foe_rating int := 1000;
  v_stats jsonb;
  v_battle_id uuid := extensions.gen_random_uuid();
  v_rated boolean := false;
  v_pair integer := 0;
  v_today date := private.wick_today();
  v_note text := '';
begin
  if p_mode not in ('pve', 'pvp') then
    raise exception 'Unknown ring.';
  end if;
  perform private.rate_limit(v_user, 'battle', 2);
  select * into v_pet from public.companions where id = p_companion_id and owner_id = v_user;
  if not found then
    raise exception 'That companion is not with you.';
  end if;
  if exists (select 1 from public.battles where profile_id = v_user and status = 'active') then
    raise exception 'Finish the bout already in the ring.';
  end if;
  select * into v_spec from public.species where id = v_pet.species_id;
  if p_mode = 'pvp' and v_spec.slug = 'crownwyrm' then
    raise exception 'Crownwyrm bouts stay out of keeper challenges.';
  end if;
  if p_gear is not null then
    foreach v_gear in array p_gear loop
      v_count := v_count + 1;
      if v_count > 2 then
        raise exception 'Only two pieces of gear fit in the ring.';
      end if;
      select * into v_item from public.items where id = v_gear;
      if not found or not exists (
        select 1 from public.satchel_stacks where profile_id = v_user and item_id = v_gear and qty > 0
      ) then
        raise exception 'That gear is not in the satchel.';
      end if;
      if v_item.category = 'weapon' then v_weapon := v_weapon + v_item.gear_power;
      elsif v_item.category = 'shield' then v_shield := v_shield + v_item.gear_power;
      elsif v_item.category = 'potion' then v_potion := greatest(v_potion, v_item.gear_power);
      else raise exception 'Only a weapon, a shield, or a sip can be carried in.';
      end if;
    end loop;
  end if;
  v_stats := private.battle_block(v_spec.slug, v_pet.level);
  v_you := jsonb_build_object(
    'name', v_pet.name, 'speciesSlug', v_spec.slug,
    'hp', (v_stats ->> 'maxHp')::int, 'maxHp', (v_stats ->> 'maxHp')::int,
    'atk', (v_stats ->> 'atk')::int, 'def', (v_stats ->> 'def')::int, 'spd', (v_stats ->> 'spd')::int,
    'defending', false, 'weapon', v_weapon, 'shield', v_shield,
    'potionHeal', v_potion, 'potionLeft', v_potion > 0, 'infernoCd', 0
  );
  if p_mode = 'pve' then
    select name, species_slug, level into v_foe_name, v_foe_species, v_foe_level
    from public.npc_challengers where slug = p_challenger_slug;
    if v_foe_name is null then
      raise exception 'That challenger is not at the ring.';
    end if;
    p_defender_id := null;
  else
    select c.name, s.slug, c.level, c.owner_id, c.rating
      into v_foe_name, v_foe_species, v_foe_level, v_foe_owner, v_foe_rating
    from public.companions c
    join public.species s on s.id = c.species_id
    where c.id = p_defender_id and c.owner_id is not null;
    if v_foe_name is null then
      raise exception 'That companion is not waiting for a challenge.';
    end if;
    if v_foe_owner = v_user then
      raise exception 'You cannot challenge a companion from your own quay.';
    end if;
    if v_foe_species = 'crownwyrm' then
      raise exception 'Crownwyrm bouts stay out of keeper challenges.';
    end if;
    select count(distinct r.battle_id) into v_pair
    from public.ring_results r
    join public.ring_results o on o.battle_id = r.battle_id and o.companion_id = p_defender_id
    where r.companion_id = v_pet.id
      and r.mode = 'pvp'
      and r.rated
      and r.created_at >= private.wick_start(v_today)
      and r.created_at < private.wick_start(v_today + 1);
    v_rated := abs(v_pet.level - v_foe_level) <= 8
      and abs(v_pet.rating - v_foe_rating) <= 400
      and v_pair < 3;
    if not v_rated then
      v_note := ' This bout will not move ratings.';
    end if;
  end if;
  v_stats := private.battle_block(v_foe_species, v_foe_level);
  v_foe := jsonb_build_object(
    'name', v_foe_name, 'speciesSlug', v_foe_species,
    'hp', (v_stats ->> 'maxHp')::int, 'maxHp', (v_stats ->> 'maxHp')::int,
    'atk', (v_stats ->> 'atk')::int, 'def', (v_stats ->> 'def')::int, 'spd', (v_stats ->> 'spd')::int,
    'defending', false, 'weapon', 0, 'shield', 0, 'potionHeal', 0, 'potionLeft', false, 'burn', 0
  );
  insert into public.battles (id, profile_id, companion_id, defender_id, mode, status, rated, state)
  values (
    v_battle_id, v_user, v_pet.id, p_defender_id, p_mode, 'active', v_rated,
    jsonb_build_object(
      'round', 1, 'you', v_you, 'foe', v_foe,
      'log', jsonb_build_array(v_pet.name || ' steps into the Ember Ring against ' || v_foe_name || '.' || v_note)
    )
  );
  return private.battle_public(v_battle_id);
end;
$$;

create or replace function public.ring_rankings(p_board text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_board text := lower(coalesce(p_board, 'pets'));
  v_week date;
  v_me uuid := auth.uid();
begin
  if v_board not in ('pets', 'keepers', 'week') then
    raise exception 'Unknown board.';
  end if;
  v_week := pg_catalog.date_trunc('week', private.wick_today()::timestamp)::date;
  if v_board = 'keepers' then
    return jsonb_build_object('board', 'keepers', 'rows', coalesce((
      select jsonb_agg(q.obj order by q.ord)
      from (
        select jsonb_build_object(
          'rank', row_number() over (order by sum(c.pvp_wins) desc, p.username),
          'owner', p.username,
          'pvpWins', sum(c.pvp_wins),
          'rating', max(c.rating),
          'name', (array_agg(c.name order by c.rating desc))[1],
          'speciesSlug', (array_agg(s.slug order by c.rating desc))[1],
          'yours', bool_or(c.owner_id is not distinct from v_me)
        ) as obj,
        row_number() over (order by sum(c.pvp_wins) desc, p.username) as ord
        from public.companions c
        join public.species s on s.id = c.species_id
        join public.profiles p on p.id = c.owner_id
        where c.owner_id is not null and s.slug <> 'crownwyrm'
        group by p.id, p.username
        order by sum(c.pvp_wins) desc, p.username
        limit 40
      ) q
    ), '[]'::jsonb));
  elsif v_board = 'week' then
    return jsonb_build_object('board', 'week', 'rows', coalesce((
      select jsonb_agg(q.obj order by q.ord)
      from (
        select jsonb_build_object(
          'rank', row_number() over (order by count(*) desc, c.name),
          'companionId', c.id,
          'name', c.name,
          'speciesSlug', s.slug,
          'owner', p.username,
          'weekWins', count(*),
          'rating', c.rating,
          'pvpWins', c.pvp_wins,
          'pvpLosses', c.pvp_losses,
          'pvpStreak', c.pvp_streak,
          'yours', c.owner_id is not distinct from v_me
        ) as obj,
        row_number() over (order by count(*) desc, c.name) as ord
        from public.ring_results r
        join public.companions c on c.id = r.companion_id
        join public.species s on s.id = c.species_id
        join public.profiles p on p.id = c.owner_id
        where r.mode = 'pvp' and r.outcome = 'win'
          and s.slug <> 'crownwyrm'
          and r.created_at >= private.wick_start(v_week)
          and r.created_at < private.wick_start(v_week + 7)
        group by c.id, c.name, s.slug, p.username, c.rating, c.pvp_wins, c.pvp_losses, c.pvp_streak, c.owner_id
        order by count(*) desc, c.name
        limit 40
      ) q
    ), '[]'::jsonb));
  end if;
  return jsonb_build_object('board', 'pets', 'rows', coalesce((
    select jsonb_agg(q.obj order by q.ord)
    from (
      select jsonb_build_object(
        'rank', row_number() over (order by c.rating desc, c.pvp_wins desc, c.name),
        'companionId', c.id,
        'name', c.name,
        'speciesSlug', s.slug,
        'owner', p.username,
        'level', c.level,
        'rating', c.rating,
        'pvpWins', c.pvp_wins,
        'pvpLosses', c.pvp_losses,
        'pvpStreak', c.pvp_streak,
        'yours', c.owner_id is not distinct from v_me
      ) as obj,
      row_number() over (order by c.rating desc, c.pvp_wins desc, c.name) as ord
      from public.companions c
      join public.species s on s.id = c.species_id
      join public.profiles p on p.id = c.owner_id
      where c.owner_id is not null and s.slug <> 'crownwyrm'
      order by c.rating desc, c.pvp_wins desc, c.name
      limit 40
    ) q
  ), '[]'::jsonb));
end;
$$;

create or replace function public.ring_recent()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(q.obj order by q.at desc), '[]'::jsonb)
  from (
    select b.updated_at as at, jsonb_build_object(
      'id', b.id,
      'at', b.updated_at,
      'challenger', cy.name,
      'challengerOwner', py.username,
      'defender', cf.name,
      'defenderOwner', pf.username,
      'defenderWon', b.status = 'lost',
      'rated', b.rated,
      'ratingDelta', b.rating_delta
    ) as obj
    from public.battles b
    join public.companions cy on cy.id = b.companion_id
    join public.profiles py on py.id = cy.owner_id
    join public.companions cf on cf.id = b.defender_id
    join public.profiles pf on pf.id = cf.owner_id
    where b.mode = 'pvp' and b.status in ('won', 'lost')
    order by b.updated_at desc
    limit 20
  ) q;
$$;

create or replace function public.ring_notices()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'at', n.created_at) order by n.created_at desc)
    from (
      select id, body, created_at
      from public.ring_notices
      where profile_id = v_user
      order by created_at desc
      limit 20
    ) n
  ), '[]'::jsonb);
end;
$$;

revoke all on function private.elo_delta(integer, integer, numeric) from public, anon, authenticated;
revoke all on function private.settle_ring_ranks() from public, anon, authenticated;
revoke all on function public.ring_rankings(text) from public;
revoke all on function public.ring_recent() from public;
revoke all on function public.ring_notices() from public, anon;
grant execute on function public.ring_rankings(text), public.ring_recent() to anon, authenticated, service_role;
grant execute on function public.ring_notices() to authenticated, service_role;
