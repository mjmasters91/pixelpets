-- Crownwyrm power, Inferno Crown, and a real rename of the battle status variable.
-- The previous migration papered over `status` with #variable_conflict. This replaces
-- battle_turn so the variable is v_status and cannot clash with battles.status.
-- Battle numbers live on species, not on each companion. Ember King picks them up
-- from Crownwyrm on the next bout; there is no per-companion combat snapshot to rewrite.
-- Review and apply manually.

update public.species
set base_hp = 63,
    base_attack = 20,
    base_defense = 16,
    base_speed = 12
where slug = 'crownwyrm';

do $ember$
begin
  if exists (
    select 1
    from public.companions c
    join public.species s on s.id = c.species_id
    where s.slug = 'crownwyrm' and lower(c.name) = 'ember king'
  ) then
    raise notice 'Ember King uses Crownwyrm species stats (63/20/16/12 plus level). No per-companion combat columns to update.';
  else
    raise notice 'No Ember King row yet. Crownwyrm species stats are updated for the next hatch.';
  end if;
end
$ember$;

create or replace function public.list_pvp_targets()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'speciesSlug', s.slug,
      'owner', p.username, 'level', c.level
    ) order by p.username, c.name)
    from public.companions c
    join public.species s on s.id = c.species_id
    join public.profiles p on p.id = c.owner_id
    where c.owner_id is not null
      and c.owner_id <> v_user
      and s.slug <> 'crownwyrm'
  ), '[]'::jsonb);
end;
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
    'losses', coalesce(v_pet.losses, 0)
  );
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
  v_stats jsonb;
  v_battle_id uuid := extensions.gen_random_uuid();
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
      if not found then
        raise exception 'That gear is not in the satchel.';
      end if;
      if not exists (select 1 from public.satchel_stacks where profile_id = v_user and item_id = v_gear and qty > 0) then
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
  else
    select c.name, s.slug, c.level into v_foe_name, v_foe_species, v_foe_level
    from public.companions c
    join public.species s on s.id = c.species_id
    where c.id = p_defender_id and c.owner_id is not null and c.owner_id <> v_user;
    if v_foe_name is null then
      raise exception 'That companion is not waiting for a challenge.';
    end if;
    if v_foe_species = 'crownwyrm' then
      raise exception 'Crownwyrm bouts stay out of keeper challenges.';
    end if;
  end if;
  v_stats := private.battle_block(v_foe_species, v_foe_level);
  v_foe := jsonb_build_object(
    'name', v_foe_name, 'speciesSlug', v_foe_species,
    'hp', (v_stats ->> 'maxHp')::int, 'maxHp', (v_stats ->> 'maxHp')::int,
    'atk', (v_stats ->> 'atk')::int, 'def', (v_stats ->> 'def')::int, 'spd', (v_stats ->> 'spd')::int,
    'defending', false, 'weapon', 0, 'shield', 0, 'potionHeal', 0, 'potionLeft', false, 'burn', 0
  );
  insert into public.battles (id, profile_id, companion_id, mode, status, state)
  values (
    v_battle_id, v_user, v_pet.id, p_mode, 'active',
    jsonb_build_object(
      'round', 1, 'you', v_you, 'foe', v_foe,
      'log', jsonb_build_array(v_pet.name || ' steps into the Ember Ring against ' || v_foe_name || '.')
    )
  );
  return private.battle_public(v_battle_id);
end;
$$;

create or replace function public.battle_turn(p_battle_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := private.require_user();
  v_battle public.battles%rowtype;
  v_you jsonb;
  v_foe jsonb;
  v_log jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_you_first boolean;
  v_status text;
  v_dmg int;
  v_roll int;
  v_guard int;
  v_chance numeric;
  v_healed int;
  v_tier int;
  v_gift int := 0;
  v_xp int := 0;
  v_today date := private.wick_today();
  v_claim jsonb;
  v_count int;
  v_already int;
  v_level int;
  v_pet_xp int;
begin
  if p_action not in ('attack', 'defend', 'item', 'flee', 'inferno') then
    raise exception 'That is not a ring action.';
  end if;
  perform private.rate_limit(v_user, 'battle-turn', 0.4);
  select * into v_battle from public.battles where id = p_battle_id and profile_id = v_user for update;
  if not found or v_battle.status <> 'active' then
    raise exception 'That bout is over.';
  end if;
  v_you := v_battle.state -> 'you';
  v_foe := v_battle.state -> 'foe';
  v_log := coalesce(v_battle.state -> 'log', '[]'::jsonb);
  v_status := 'active';

  if coalesce((v_you ->> 'infernoCd')::int, 0) > 0 then
    v_you := jsonb_set(v_you, '{infernoCd}', to_jsonb((v_you ->> 'infernoCd')::int - 1));
  end if;
  if coalesce((v_foe ->> 'burn')::int, 0) > 0 and (v_foe ->> 'hp')::int > 0 then
    v_foe := jsonb_set(v_foe, '{hp}', to_jsonb(greatest(0, (v_foe ->> 'hp')::int - 8)));
    v_foe := jsonb_set(v_foe, '{burn}', to_jsonb((v_foe ->> 'burn')::int - 1));
    v_lines := v_lines || jsonb_build_array('Inferno Crown keeps burning ' || (v_foe ->> 'name') || ' for 8.');
    if (v_foe ->> 'hp')::int <= 0 then
      v_status := 'won';
    end if;
  end if;

  v_you_first := (v_you ->> 'spd')::int >= (v_foe ->> 'spd')::int;

  if p_action = 'flee' and v_status = 'active' then
    v_chance := greatest(0.2, least(0.9, 0.55 + ((v_you ->> 'spd')::int - (v_foe ->> 'spd')::int) * 0.03));
    if random() < v_chance then
      v_status := 'fled';
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' slips out of the ring.');
    else
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' cannot find a gap to flee.');
    end if;
  end if;

  if p_action <> 'flee' and v_you_first and v_status = 'active' and (v_you ->> 'hp')::int > 0 then
    if p_action = 'defend' then
      v_you := jsonb_set(v_you, '{defending}', 'true'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' braces for the next hit.');
    elsif p_action = 'item' then
      if coalesce((v_you ->> 'potionLeft')::boolean, false) and coalesce((v_you ->> 'potionHeal')::int, 0) > 0 then
        v_healed := least((v_you ->> 'potionHeal')::int, (v_you ->> 'maxHp')::int - (v_you ->> 'hp')::int);
        v_you := jsonb_set(jsonb_set(v_you, '{hp}', to_jsonb((v_you ->> 'hp')::int + v_healed)), '{potionLeft}', 'false'::jsonb);
        v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' drinks and recovers ' || v_healed || '.');
      else
        v_lines := v_lines || jsonb_build_array('No sip left in that gear.');
      end if;
    elsif p_action = 'inferno' then
      if coalesce(v_you ->> 'speciesSlug', '') <> 'crownwyrm' then
        v_lines := v_lines || jsonb_build_array('Only a Crownwyrm can call Inferno Crown.');
      elsif coalesce((v_you ->> 'infernoCd')::int, 0) > 0 then
        v_lines := v_lines || jsonb_build_array('Inferno Crown is still gathering (' || (v_you ->> 'infernoCd') || ').');
      else
        v_roll := 1 + floor(random() * 6)::int;
        v_guard := floor(coalesce((v_foe ->> 'def')::numeric, 0) / 4);
        v_dmg := greatest(14, (v_you ->> 'atk')::int + coalesce((v_you ->> 'weapon')::int, 0) + 10 + v_roll - v_guard);
        v_foe := jsonb_set(v_foe, '{hp}', to_jsonb(greatest(0, (v_foe ->> 'hp')::int - v_dmg)));
        v_foe := jsonb_set(v_foe, '{defending}', 'false'::jsonb);
        v_foe := jsonb_set(v_foe, '{burn}', '2'::jsonb);
        v_you := jsonb_set(v_you, '{infernoCd}', '3'::jsonb);
        v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' calls Inferno Crown. A red flame burst hits ' || (v_foe ->> 'name') || ' for ' || v_dmg || ', slipping past the guard.');
        if (v_foe ->> 'hp')::int <= 0 then v_status := 'won'; end if;
      end if;
    else
      v_roll := 1 + floor(random() * 6)::int;
      v_guard := (v_foe ->> 'def')::int + coalesce((v_foe ->> 'shield')::int, 0) + case when coalesce((v_foe ->> 'defending')::boolean, false) then (v_foe ->> 'def')::int else 0 end;
      v_dmg := greatest(1, (v_you ->> 'atk')::int + coalesce((v_you ->> 'weapon')::int, 0) + v_roll - floor(v_guard / 2.0)::int + case when v_roll = 6 then 3 else 0 end);
      v_foe := jsonb_set(jsonb_set(v_foe, '{hp}', to_jsonb(greatest(0, (v_foe ->> 'hp')::int - v_dmg))), '{defending}', 'false'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' strikes ' || (v_foe ->> 'name') || ' for ' || v_dmg || '.' || case when v_roll = 6 then ' A bright hit.' else '' end);
      if (v_foe ->> 'hp')::int <= 0 then v_status := 'won'; end if;
    end if;
  end if;

  if v_status = 'active' and (v_foe ->> 'hp')::int > 0 then
    v_roll := 1 + floor(random() * 6)::int;
    if (v_foe ->> 'hp')::int < (v_foe ->> 'maxHp')::int * 0.35 and v_roll <= 2 then
      v_foe := jsonb_set(v_foe, '{defending}', 'true'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_foe ->> 'name') || ' braces.');
    else
      v_guard := (v_you ->> 'def')::int + coalesce((v_you ->> 'shield')::int, 0) + case when coalesce((v_you ->> 'defending')::boolean, false) then (v_you ->> 'def')::int else 0 end;
      v_dmg := greatest(1, (v_foe ->> 'atk')::int + v_roll - floor(v_guard / 2.0)::int + case when v_roll = 6 then 3 else 0 end);
      v_you := jsonb_set(jsonb_set(v_you, '{hp}', to_jsonb(greatest(0, (v_you ->> 'hp')::int - v_dmg))), '{defending}', 'false'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_foe ->> 'name') || ' strikes ' || (v_you ->> 'name') || ' for ' || v_dmg || '.' || case when v_roll = 6 then ' A bright hit.' else '' end);
      if (v_you ->> 'hp')::int <= 0 then v_status := 'lost'; end if;
    end if;
  end if;

  if p_action <> 'flee' and not v_you_first and v_status = 'active' and (v_you ->> 'hp')::int > 0 then
    if p_action = 'defend' then
      v_you := jsonb_set(v_you, '{defending}', 'true'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' braces for the next hit.');
    elsif p_action = 'item' then
      if coalesce((v_you ->> 'potionLeft')::boolean, false) and coalesce((v_you ->> 'potionHeal')::int, 0) > 0 then
        v_healed := least((v_you ->> 'potionHeal')::int, (v_you ->> 'maxHp')::int - (v_you ->> 'hp')::int);
        v_you := jsonb_set(jsonb_set(v_you, '{hp}', to_jsonb((v_you ->> 'hp')::int + v_healed)), '{potionLeft}', 'false'::jsonb);
        v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' drinks and recovers ' || v_healed || '.');
      else
        v_lines := v_lines || jsonb_build_array('No sip left in that gear.');
      end if;
    elsif p_action = 'inferno' then
      if coalesce(v_you ->> 'speciesSlug', '') <> 'crownwyrm' then
        v_lines := v_lines || jsonb_build_array('Only a Crownwyrm can call Inferno Crown.');
      elsif coalesce((v_you ->> 'infernoCd')::int, 0) > 0 then
        v_lines := v_lines || jsonb_build_array('Inferno Crown is still gathering (' || (v_you ->> 'infernoCd') || ').');
      else
        v_roll := 1 + floor(random() * 6)::int;
        v_guard := floor(coalesce((v_foe ->> 'def')::numeric, 0) / 4);
        v_dmg := greatest(14, (v_you ->> 'atk')::int + coalesce((v_you ->> 'weapon')::int, 0) + 10 + v_roll - v_guard);
        v_foe := jsonb_set(v_foe, '{hp}', to_jsonb(greatest(0, (v_foe ->> 'hp')::int - v_dmg)));
        v_foe := jsonb_set(v_foe, '{defending}', 'false'::jsonb);
        v_foe := jsonb_set(v_foe, '{burn}', '2'::jsonb);
        v_you := jsonb_set(v_you, '{infernoCd}', '3'::jsonb);
        v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' calls Inferno Crown. A red flame burst hits ' || (v_foe ->> 'name') || ' for ' || v_dmg || ', slipping past the guard.');
        if (v_foe ->> 'hp')::int <= 0 then v_status := 'won'; end if;
      end if;
    else
      v_roll := 1 + floor(random() * 6)::int;
      v_guard := (v_foe ->> 'def')::int + coalesce((v_foe ->> 'shield')::int, 0) + case when coalesce((v_foe ->> 'defending')::boolean, false) then (v_foe ->> 'def')::int else 0 end;
      v_dmg := greatest(1, (v_you ->> 'atk')::int + coalesce((v_you ->> 'weapon')::int, 0) + v_roll - floor(v_guard / 2.0)::int + case when v_roll = 6 then 3 else 0 end);
      v_foe := jsonb_set(jsonb_set(v_foe, '{hp}', to_jsonb(greatest(0, (v_foe ->> 'hp')::int - v_dmg))), '{defending}', 'false'::jsonb);
      v_lines := v_lines || jsonb_build_array((v_you ->> 'name') || ' strikes ' || (v_foe ->> 'name') || ' for ' || v_dmg || '.' || case when v_roll = 6 then ' A bright hit.' else '' end);
      if (v_foe ->> 'hp')::int <= 0 then v_status := 'won'; end if;
    end if;
  end if;

  v_log := v_log || v_lines;
  if v_status <> 'active' then
    if v_status = 'won' then
      select tier into v_tier from public.npc_challengers where name = v_foe ->> 'name';
      v_tier := coalesce(v_tier, 3);
      v_gift := case when v_battle.mode = 'pve' then 40 + v_tier * 30 else 80 end;
      v_xp := case when v_battle.mode = 'pve' then 20 + v_tier * 10 else 30 end;
      select coalesce(payload, '{}'::jsonb) into v_claim from public.daily_claims
        where profile_id = v_user and daily_key = 'ember_ring' and claimed_on = v_today for update;
      v_claim := coalesce(v_claim, '{}'::jsonb);
      v_count := coalesce((v_claim ->> 'count')::int, 0);
      v_already := coalesce((v_claim ->> 'glims')::int, 0);
      if v_count >= 10 then v_gift := 0; else v_gift := least(v_gift, greatest(0, 1500 - v_already)); end if;
      insert into public.daily_claims (profile_id, daily_key, claimed_on, payload)
      values (v_user, 'ember_ring', v_today, jsonb_build_object('count', v_count + case when v_gift > 0 then 1 else 0 end, 'glims', v_already + v_gift))
      on conflict (profile_id, daily_key, claimed_on) do update set payload = excluded.payload;
      if v_gift > 0 then
        perform private.adjust_glims(v_user, v_gift, 'battle', 'battle', v_battle.id, null);
      end if;
      update public.companions set wins = wins + 1 where id = v_battle.companion_id;
      v_log := v_log || jsonb_build_array((v_you ->> 'name') || ' wins the bout.');
    elsif v_status = 'lost' then
      v_xp := 8;
      update public.companions set losses = losses + 1 where id = v_battle.companion_id;
      v_log := v_log || jsonb_build_array((v_you ->> 'name') || ' yields the ring.');
    else
      v_log := v_log || jsonb_build_array((v_you ->> 'name') || ' leaves the ring.');
    end if;
    select level, xp into v_level, v_pet_xp from public.companions where id = v_battle.companion_id;
    v_pet_xp := v_pet_xp + v_xp;
    while v_level < 20 and v_pet_xp >= v_level * 40 loop
      v_pet_xp := v_pet_xp - v_level * 40;
      v_level := v_level + 1;
    end loop;
    update public.companions set level = v_level, xp = v_pet_xp where id = v_battle.companion_id;
  end if;

  update public.battles
  set status = v_status,
      reward_glims = case when v_status = 'won' then coalesce(v_gift, 0) else reward_glims end,
      reward_xp = case when v_status <> 'active' then v_xp else reward_xp end,
      updated_at = now(),
      state = jsonb_build_object(
        'round', coalesce((v_battle.state ->> 'round')::int, 1) + 1,
        'you', v_you,
        'foe', v_foe,
        'log', v_log
      )
  where id = v_battle.id;
  return private.battle_public(v_battle.id);
end;
$$;

revoke all on function public.start_battle(uuid, text, text, uuid, uuid[]) from public, anon;
revoke all on function public.battle_turn(uuid, text) from public, anon;
revoke all on function public.list_pvp_targets() from public, anon;
grant execute on function public.start_battle(uuid, text, text, uuid, uuid[]), public.battle_turn(uuid, text), public.list_pvp_targets() to authenticated, service_role;
