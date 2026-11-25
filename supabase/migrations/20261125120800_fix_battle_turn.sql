-- Fix: 'status' variable clashed with battles.status, so every Ember Ring turn failed.
create or replace function public.battle_turn(p_battle_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_variable
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
