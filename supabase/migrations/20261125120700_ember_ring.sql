-- The Ember Ring. Battle outcomes are decided only in these functions.
-- Review and apply manually. Do not grant these to anon.

alter table public.species add column if not exists base_hp integer not null default 30;
alter table public.species add column if not exists base_attack integer not null default 8;
alter table public.species add column if not exists base_defense integer not null default 8;
alter table public.species add column if not exists base_speed integer not null default 8;

update public.species as s set base_hp = v.hp, base_attack = v.atk, base_defense = v.def, base_speed = v.spd
from (values
  ('lumkin', 34, 9, 8, 8),
  ('quillora', 30, 11, 7, 12),
  ('puddlehop', 36, 8, 10, 7),
  ('pyrlit', 32, 13, 8, 11),
  ('nimblet', 28, 10, 6, 16),
  ('mallowgull', 33, 8, 9, 9),
  ('thornu', 38, 7, 13, 6),
  ('velune', 29, 12, 7, 14),
  ('glacibun', 35, 9, 11, 8),
  ('mosscrag', 42, 8, 14, 5),
  ('tidewing', 30, 11, 7, 15),
  ('cogwhisk', 31, 12, 9, 10),
  ('bramblebuzz', 29, 11, 7, 13),
  ('dunesprout', 33, 9, 10, 8),
  ('silkmoth', 28, 10, 6, 14),
  ('berrybop', 32, 10, 8, 9),
  ('stormuff', 36, 13, 9, 10),
  ('rubyclaw', 37, 12, 12, 7),
  ('crownwyrm', 46, 16, 13, 11)
) as v(slug, hp, atk, def, spd)
where s.slug = v.slug;

alter table public.companions add column if not exists level integer not null default 1;
alter table public.companions add column if not exists xp integer not null default 0;
alter table public.companions add column if not exists wins integer not null default 0;
alter table public.companions add column if not exists losses integer not null default 0;
alter table public.companions drop constraint if exists companions_level_range;
alter table public.companions add constraint companions_level_range check (level between 1 and 20 and xp >= 0 and wins >= 0 and losses >= 0);

alter table public.glim_ledger drop constraint if exists glim_ledger_reason_check;
alter table public.glim_ledger add constraint glim_ledger_reason_check
  check (reason in ('signup', 'morning_wick', 'game', 'shop_buy', 'shop_refund', 'trade', 'trade_refund', 'basket', 'steward', 'battle', 'other'));

create or replace function private.adjust_glims(
  p_profile uuid, p_delta integer, p_reason text, p_ref_type text, p_ref_id uuid, p_actor uuid
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare bal integer;
begin
  if p_reason not in ('signup', 'morning_wick', 'game', 'shop_buy', 'shop_refund', 'trade', 'trade_refund', 'basket', 'steward', 'battle', 'other') then
    raise exception 'Unknown ledger reason.';
  end if;
  update public.wallets set glims = glims + p_delta, updated_at = now()
  where profile_id = p_profile returning glims into bal;
  if not found then raise exception 'Wallet missing.'; end if;
  if bal < 0 then raise exception 'Not enough Glims.'; end if;
  insert into public.glim_ledger (profile_id, delta, balance_after, reason, ref_type, ref_id, actor_id)
  values (p_profile, p_delta, bal, p_reason, p_ref_type, p_ref_id, p_actor);
  return bal;
end;
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
    'level', c.level, 'xp', c.xp, 'wins', c.wins, 'losses', c.losses
  )
  from public.companions c
  join public.species s on s.id = c.species_id
  join public.tints t on t.id = c.tint_id
  left join public.profiles pr on pr.id = c.owner_id
  where c.id = p_id;
$$;

create table if not exists public.npc_challengers (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  species_slug text not null,
  tier integer not null,
  level integer not null,
  blurb text not null,
  sort_order integer not null
);

insert into public.npc_challengers (id, slug, name, species_slug, tier, level, blurb, sort_order) values
  ('91000000-0000-4000-8000-000000000001', 'brook-nim', 'Brook Nim', 'puddlehop', 1, 1, 'A splashy first bout by the shallows.', 1),
  ('91000000-0000-4000-8000-000000000002', 'petal-novice', 'Petal Novice', 'thornu', 1, 2, 'Shy, then surprisingly steady.', 2),
  ('91000000-0000-4000-8000-000000000003', 'wick-apprentice', 'Wick Apprentice', 'lumkin', 2, 4, 'Learns the ring between lantern shifts.', 3),
  ('91000000-0000-4000-8000-000000000004', 'chili-brawler', 'Chili Brawler', 'pyrlit', 3, 6, 'Hot-tempered and quick to strike.', 4),
  ('91000000-0000-4000-8000-000000000005', 'tide-glider', 'Tide Glider', 'tidewing', 4, 8, 'Circles once, then dives in.', 5),
  ('91000000-0000-4000-8000-000000000006', 'kiln-warden', 'Kiln Warden', 'rubyclaw', 5, 10, 'Keeps the ring when the cliffs go quiet.', 6)
on conflict (slug) do nothing;

create table if not exists public.battles (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  companion_id uuid not null references public.companions (id) on delete cascade,
  mode text not null check (mode in ('pve', 'pvp')),
  status text not null check (status in ('active', 'won', 'lost', 'fled')),
  state jsonb not null,
  reward_glims integer not null default 0,
  reward_xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists battles_profile_idx on public.battles (profile_id, created_at desc);

drop trigger if exists battles_guard on public.battles;
create trigger battles_guard before insert or update or delete on public.battles
for each row execute function private.reject_untrusted_write();

alter table public.battles enable row level security;
drop policy if exists battles_read on public.battles;
create policy battles_read on public.battles for select to authenticated
using (profile_id = (select auth.uid()) or private.caller_is_admin());
grant select on public.battles to authenticated;
grant select on public.npc_challengers to anon, authenticated;
alter table public.npc_challengers enable row level security;
drop policy if exists challengers_read on public.npc_challengers;
create policy challengers_read on public.npc_challengers for select to anon, authenticated using (true);

create or replace function private.battle_block(p_slug text, p_level integer)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'maxHp', base_hp + (least(greatest(p_level, 1), 20) - 1) * 6,
    'atk', base_attack + (least(greatest(p_level, 1), 20) - 1) * 2,
    'def', base_defense + (least(greatest(p_level, 1), 20) - 1),
    'spd', base_speed + (least(greatest(p_level, 1), 20) - 1)
  )
  from public.species where slug = p_slug;
$$;

create or replace function private.battle_public(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare b public.battles%rowtype; pet public.companions%rowtype;
begin
  select * into b from public.battles where id = p_id;
  if not found then return null; end if;
  select * into pet from public.companions where id = b.companion_id;
  return jsonb_build_object(
    'id', b.id, 'status', b.status, 'mode', b.mode, 'round', coalesce(b.state ->> 'round', '1')::int,
    'you', jsonb_build_object('name', b.state #>> '{you,name}', 'speciesSlug', b.state #>> '{you,speciesSlug}', 'hp', (b.state #>> '{you,hp}')::int, 'maxHp', (b.state #>> '{you,maxHp}')::int),
    'foe', jsonb_build_object('name', b.state #>> '{foe,name}', 'speciesSlug', b.state #>> '{foe,speciesSlug}', 'hp', (b.state #>> '{foe,hp}')::int, 'maxHp', (b.state #>> '{foe,maxHp}')::int),
    'log', coalesce(b.state -> 'log', '[]'::jsonb),
    'rewardGlims', b.reward_glims, 'rewardXp', b.reward_xp,
    'level', coalesce(pet.level, 1), 'xp', coalesce(pet.xp, 0), 'wins', coalesce(pet.wins, 0), 'losses', coalesce(pet.losses, 0)
  );
end;
$$;

create or replace function public.list_pvp_targets()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare u uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'speciesSlug', s.slug,
      'owner', p.username, 'level', c.level
    ) order by p.username, c.name)
    from public.companions c
    join public.species s on s.id = c.species_id
    join public.profiles p on p.id = c.owner_id
    where c.owner_id is not null and c.owner_id <> u
  ), '[]'::jsonb);
end;
$$;

create or replace function public.start_battle(
  p_companion_id uuid, p_mode text, p_challenger_slug text, p_defender_id uuid, p_gear uuid[]
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  u uuid := private.require_user();
  pet public.companions%rowtype;
  spec public.species%rowtype;
  gear uuid;
  item public.items%rowtype;
  weapon int := 0; shield int := 0; potion int := 0;
  n int := 0;
  you jsonb; foe jsonb; foe_species text; foe_level int; foe_name text;
  stats jsonb; bid uuid := extensions.gen_random_uuid();
begin
  if p_mode not in ('pve', 'pvp') then raise exception 'Unknown ring.'; end if;
  perform private.rate_limit(u, 'battle', 2);
  select * into pet from public.companions where id = p_companion_id and owner_id = u;
  if not found then raise exception 'That companion is not with you.'; end if;
  if exists (select 1 from public.battles where profile_id = u and status = 'active') then
    raise exception 'Finish the bout already in the ring.';
  end if;
  select * into spec from public.species where id = pet.species_id;
  if p_gear is not null then
    foreach gear in array p_gear loop
      n := n + 1;
      if n > 2 then raise exception 'Only two pieces of gear fit in the ring.'; end if;
      select * into item from public.items where id = gear;
      if not found then raise exception 'That gear is not in the satchel.'; end if;
      if not exists (select 1 from public.satchel_stacks where profile_id = u and item_id = gear and qty > 0) then
        raise exception 'That gear is not in the satchel.';
      end if;
      if item.category = 'weapon' then weapon := weapon + item.gear_power;
      elsif item.category = 'shield' then shield := shield + item.gear_power;
      elsif item.category = 'potion' then potion := greatest(potion, item.gear_power);
      else raise exception 'Only a weapon, a shield, or a sip can be carried in.';
      end if;
    end loop;
  end if;
  stats := private.battle_block(spec.slug, pet.level);
  you := jsonb_build_object(
    'name', pet.name, 'speciesSlug', spec.slug,
    'hp', (stats ->> 'maxHp')::int, 'maxHp', (stats ->> 'maxHp')::int,
    'atk', (stats ->> 'atk')::int, 'def', (stats ->> 'def')::int, 'spd', (stats ->> 'spd')::int,
    'defending', false, 'weapon', weapon, 'shield', shield, 'potionHeal', potion, 'potionLeft', potion > 0
  );
  if p_mode = 'pve' then
    select name, species_slug, level into foe_name, foe_species, foe_level from public.npc_challengers where slug = p_challenger_slug;
    if foe_name is null then raise exception 'That challenger is not at the ring.'; end if;
  else
    select c.name, s.slug, c.level into foe_name, foe_species, foe_level
    from public.companions c join public.species s on s.id = c.species_id
    where c.id = p_defender_id and c.owner_id is not null and c.owner_id <> u;
    if foe_name is null then raise exception 'That companion is not waiting for a challenge.'; end if;
  end if;
  stats := private.battle_block(foe_species, foe_level);
  foe := jsonb_build_object(
    'name', foe_name, 'speciesSlug', foe_species,
    'hp', (stats ->> 'maxHp')::int, 'maxHp', (stats ->> 'maxHp')::int,
    'atk', (stats ->> 'atk')::int, 'def', (stats ->> 'def')::int, 'spd', (stats ->> 'spd')::int,
    'defending', false, 'weapon', 0, 'shield', 0, 'potionHeal', 0, 'potionLeft', false
  );
  insert into public.battles (id, profile_id, companion_id, mode, status, state)
  values (bid, u, pet.id, p_mode, 'active', jsonb_build_object(
    'round', 1, 'you', you, 'foe', foe,
    'log', jsonb_build_array(pet.name || ' steps into the Ember Ring against ' || foe_name || '.')
  ));
  return private.battle_public(bid);
end;
$$;

create or replace function public.battle_turn(p_battle_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  u uuid := private.require_user();
  b public.battles%rowtype;
  you jsonb; foe jsonb; log jsonb; lines jsonb := '[]'::jsonb;
  you_first boolean; status text; dmg int; roll int; guard int;
  chance numeric; healed int; tier int; gift int; xp_gain int := 0;
  today date := private.wick_today(); claim jsonb; count_now int; already int;
  pet_level int; pet_xp int;
begin
  if p_action not in ('attack', 'defend', 'item', 'flee') then raise exception 'That is not a ring action.'; end if;
  perform private.rate_limit(u, 'battle-turn', 0.4);
  select * into b from public.battles where id = p_battle_id and profile_id = u for update;
  if not found or b.status <> 'active' then raise exception 'That bout is over.'; end if;
  you := b.state -> 'you'; foe := b.state -> 'foe'; log := coalesce(b.state -> 'log', '[]'::jsonb);
  status := 'active';
  you_first := (you ->> 'spd')::int >= (foe ->> 'spd')::int;

  -- local procedure via nested block repeated: player then foe depending on speed
  if p_action = 'flee' then
    chance := greatest(0.2, least(0.9, 0.55 + ((you ->> 'spd')::int - (foe ->> 'spd')::int) * 0.03));
    if random() < chance then
      status := 'fled';
      lines := lines || jsonb_build_array((you ->> 'name') || ' slips out of the ring.');
    else
      lines := lines || jsonb_build_array((you ->> 'name') || ' cannot find a gap to flee.');
    end if;
  elsif you_first then
    perform 1;
  end if;

  if p_action <> 'flee' and you_first and status = 'active' and (you ->> 'hp')::int > 0 then
    if p_action = 'defend' then
      you := jsonb_set(you, '{defending}', 'true'::jsonb);
      lines := lines || jsonb_build_array((you ->> 'name') || ' braces for the next hit.');
    elsif p_action = 'item' then
      if coalesce((you ->> 'potionLeft')::boolean, false) and coalesce((you ->> 'potionHeal')::int, 0) > 0 then
        healed := least((you ->> 'potionHeal')::int, (you ->> 'maxHp')::int - (you ->> 'hp')::int);
        you := jsonb_set(jsonb_set(you, '{hp}', to_jsonb((you ->> 'hp')::int + healed)), '{potionLeft}', 'false'::jsonb);
        lines := lines || jsonb_build_array((you ->> 'name') || ' drinks and recovers ' || healed || '.');
      else
        lines := lines || jsonb_build_array('No sip left in that gear.');
      end if;
    else
      roll := 1 + floor(random() * 6)::int;
      guard := (foe ->> 'def')::int + coalesce((foe ->> 'shield')::int, 0) + case when coalesce((foe ->> 'defending')::boolean, false) then (foe ->> 'def')::int else 0 end;
      dmg := greatest(1, (you ->> 'atk')::int + coalesce((you ->> 'weapon')::int, 0) + roll - floor(guard / 2.0)::int + case when roll = 6 then 3 else 0 end);
      foe := jsonb_set(jsonb_set(foe, '{hp}', to_jsonb(greatest(0, (foe ->> 'hp')::int - dmg))), '{defending}', 'false'::jsonb);
      lines := lines || jsonb_build_array((you ->> 'name') || ' strikes ' || (foe ->> 'name') || ' for ' || dmg || '.' || case when roll = 6 then ' A bright hit.' else '' end);
      if (foe ->> 'hp')::int <= 0 then status := 'won'; end if;
    end if;
  end if;

  if status = 'active' and (foe ->> 'hp')::int > 0 then
    roll := 1 + floor(random() * 6)::int;
    if (foe ->> 'hp')::int < (foe ->> 'maxHp')::int * 0.35 and roll <= 2 then
      foe := jsonb_set(foe, '{defending}', 'true'::jsonb);
      lines := lines || jsonb_build_array((foe ->> 'name') || ' braces.');
    else
      guard := (you ->> 'def')::int + coalesce((you ->> 'shield')::int, 0) + case when coalesce((you ->> 'defending')::boolean, false) then (you ->> 'def')::int else 0 end;
      dmg := greatest(1, (foe ->> 'atk')::int + roll - floor(guard / 2.0)::int + case when roll = 6 then 3 else 0 end);
      you := jsonb_set(jsonb_set(you, '{hp}', to_jsonb(greatest(0, (you ->> 'hp')::int - dmg))), '{defending}', 'false'::jsonb);
      lines := lines || jsonb_build_array((foe ->> 'name') || ' strikes ' || (you ->> 'name') || ' for ' || dmg || '.' || case when roll = 6 then ' A bright hit.' else '' end);
      if (you ->> 'hp')::int <= 0 then status := 'lost'; end if;
    end if;
  end if;

  if p_action <> 'flee' and not you_first and status = 'active' and (you ->> 'hp')::int > 0 then
    if p_action = 'defend' then
      you := jsonb_set(you, '{defending}', 'true'::jsonb);
      lines := lines || jsonb_build_array((you ->> 'name') || ' braces for the next hit.');
    elsif p_action = 'item' then
      if coalesce((you ->> 'potionLeft')::boolean, false) and coalesce((you ->> 'potionHeal')::int, 0) > 0 then
        healed := least((you ->> 'potionHeal')::int, (you ->> 'maxHp')::int - (you ->> 'hp')::int);
        you := jsonb_set(jsonb_set(you, '{hp}', to_jsonb((you ->> 'hp')::int + healed)), '{potionLeft}', 'false'::jsonb);
        lines := lines || jsonb_build_array((you ->> 'name') || ' drinks and recovers ' || healed || '.');
      else
        lines := lines || jsonb_build_array('No sip left in that gear.');
      end if;
    else
      roll := 1 + floor(random() * 6)::int;
      guard := (foe ->> 'def')::int + coalesce((foe ->> 'shield')::int, 0) + case when coalesce((foe ->> 'defending')::boolean, false) then (foe ->> 'def')::int else 0 end;
      dmg := greatest(1, (you ->> 'atk')::int + coalesce((you ->> 'weapon')::int, 0) + roll - floor(guard / 2.0)::int + case when roll = 6 then 3 else 0 end);
      foe := jsonb_set(jsonb_set(foe, '{hp}', to_jsonb(greatest(0, (foe ->> 'hp')::int - dmg))), '{defending}', 'false'::jsonb);
      lines := lines || jsonb_build_array((you ->> 'name') || ' strikes ' || (foe ->> 'name') || ' for ' || dmg || '.' || case when roll = 6 then ' A bright hit.' else '' end);
      if (foe ->> 'hp')::int <= 0 then status := 'won'; end if;
    end if;
  end if;

  log := log || lines;
  if status <> 'active' then
    if status = 'won' then
      select tier into tier from public.npc_challengers where name = foe ->> 'name';
      tier := coalesce(tier, 3);
      gift := case when b.mode = 'pve' then 40 + tier * 30 else 80 end;
      xp_gain := case when b.mode = 'pve' then 20 + tier * 10 else 30 end;
      select coalesce(payload, '{}'::jsonb) into claim from public.daily_claims
        where profile_id = u and daily_key = 'ember_ring' and claimed_on = today for update;
      claim := coalesce(claim, '{}'::jsonb);
      count_now := coalesce((claim ->> 'count')::int, 0);
      already := coalesce((claim ->> 'glims')::int, 0);
      if count_now >= 10 then gift := 0; else gift := least(gift, greatest(0, 1500 - already)); end if;
      insert into public.daily_claims (profile_id, daily_key, claimed_on, payload)
      values (u, 'ember_ring', today, jsonb_build_object('count', count_now + case when gift > 0 then 1 else 0 end, 'glims', already + gift))
      on conflict (profile_id, daily_key, claimed_on) do update
      set payload = excluded.payload;
      if gift > 0 then perform private.adjust_glims(u, gift, 'battle', 'battle', b.id, null); end if;
      update public.companions set wins = wins + 1 where id = b.companion_id;
      lines := lines || jsonb_build_array((you ->> 'name') || ' wins the bout.');
    elsif status = 'lost' then
      xp_gain := 8;
      update public.companions set losses = losses + 1 where id = b.companion_id;
      lines := lines || jsonb_build_array((you ->> 'name') || ' yields the ring.');
    else
      lines := lines || jsonb_build_array((you ->> 'name') || ' leaves the ring.');
    end if;
    log := log || jsonb_build_array(lines -> -1);
    select level, xp into pet_level, pet_xp from public.companions where id = b.companion_id;
    pet_xp := pet_xp + xp_gain;
    while pet_level < 20 and pet_xp >= pet_level * 40 loop
      pet_xp := pet_xp - pet_level * 40;
      pet_level := pet_level + 1;
    end loop;
    update public.companions set level = pet_level, xp = pet_xp where id = b.companion_id;
  end if;

  update public.battles set
    status = status,
    reward_glims = case when status = 'won' then coalesce(gift, 0) else reward_glims end,
    reward_xp = case when status <> 'active' then xp_gain else reward_xp end,
    updated_at = now(),
    state = jsonb_build_object('round', coalesce((b.state ->> 'round')::int, 1) + 1, 'you', you, 'foe', foe, 'log', log)
  where id = b.id;
  return private.battle_public(b.id);
end;
$$;

create or replace function public.get_battle(p_battle_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare u uuid := private.require_user();
begin
  if not exists (select 1 from public.battles where id = p_battle_id and (profile_id = u or private.caller_is_admin())) then
    return null;
  end if;
  return private.battle_public(p_battle_id);
end;
$$;

revoke all on function private.battle_block(text, integer) from public, anon, authenticated;
revoke all on function private.battle_public(uuid) from public, anon, authenticated;
revoke all on function private.adjust_glims(uuid, integer, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.companion_json(uuid) from public, anon, authenticated;

revoke all on function public.start_battle(uuid, text, text, uuid, uuid[]) from public, anon;
revoke all on function public.battle_turn(uuid, text) from public, anon;
revoke all on function public.get_battle(uuid) from public, anon;
revoke all on function public.list_pvp_targets() from public, anon;
grant execute on function public.start_battle(uuid, text, text, uuid, uuid[]), public.battle_turn(uuid, text), public.get_battle(uuid), public.list_pvp_targets() to authenticated, service_role;
