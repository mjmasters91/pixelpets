-- Local proof that start_battle and battle_turn run. Not applied to production.
-- Expects auth.uid() to read pixelpets.uid. Each statement commits so now() moves
-- past the ring rate limits (2s to start, 0.4s per turn).

\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'ring-test@example.com',
  '{"username":"RingTest","display_name":"Ring Test"}'::jsonb,
  now()
);

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'other-test@example.com',
  '{"username":"OtherTest","display_name":"Other"}'::jsonb,
  now()
);

select set_config('pixelpets.uid', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

insert into public.companions (id, owner_id, species_id, tint_id, name, hunger, mood, level)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.species where slug = 'lumkin'),
  (select id from public.tints where slug = 'natural'),
  'Testlum',
  80, 80, 2
);

insert into public.companions (id, owner_id, species_id, tint_id, name, hunger, mood, level)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.species where slug = 'crownwyrm'),
  (select id from public.tints where slug = 'natural'),
  'Testwyrm',
  100, 100, 1
);

insert into public.companions (id, owner_id, species_id, tint_id, name, hunger, mood, level)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  (select id from public.species where slug = 'crownwyrm'),
  (select id from public.tints where slug = 'natural'),
  'Hidden Wyrm',
  100, 100, 1
);

insert into public.satchel_stacks (profile_id, item_id, qty)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.items where slug = 'ember-tonic'),
  2
);

do $$
declare targets jsonb;
begin
  targets := public.list_pvp_targets();
  if targets::text ilike '%crownwyrm%' or targets::text ilike '%Hidden Wyrm%' then
    raise exception 'list_pvp_targets leaked a Crownwyrm: %', targets;
  end if;
  raise notice 'pvp targets ok: %', targets;
end $$;

do $$
begin
  perform public.start_battle(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'pvp',
    null,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '{}'::uuid[]
  );
  raise exception 'start_battle allowed Crownwyrm into PvP';
exception
  when others then
    if sqlerrm not ilike '%keeper challenges%' then
      raise;
    end if;
    raise notice 'crownwyrm pvp blocked: %', sqlerrm;
end $$;

select pg_sleep(2.1);

create temp table ring_last (payload jsonb);
insert into ring_last
select public.start_battle(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'pve',
  'brook-nim',
  null,
  array[(select id from public.items where slug = 'ember-tonic')]
);

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'attack');
do $$ begin
  if (select payload ->> 'status' from ring_last) is distinct from 'active' then
    raise exception 'attack ended the bout too soon: %', (select payload ->> 'log' from ring_last);
  end if;
  raise notice 'attack: %', (select payload ->> 'status' from ring_last);
end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'defend');
do $$ begin raise notice 'defend: %', (select payload ->> 'status' from ring_last); end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'item');
do $$ begin
  if (select payload ->> 'log' from ring_last) not ilike '%drinks and recovers%' then
    raise exception 'item did not heal: %', (select payload ->> 'log' from ring_last);
  end if;
  raise notice 'item: %', (select payload #>> '{you,hp}' from ring_last);
end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'inferno');
do $$ begin
  if (select payload ->> 'log' from ring_last) not ilike '%Only a Crownwyrm%' then
    raise exception 'non-crownwyrm inferno was not refused: %', (select payload ->> 'log' from ring_last);
  end if;
  raise notice 'non-crownwyrm inferno refused';
end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'flee');
do $$ begin raise notice 'flee: %', (select payload ->> 'status' from ring_last); end $$;

update public.battles set status = 'fled'
where id = (select (payload ->> 'id')::uuid from ring_last) and status = 'active';

select pg_sleep(2.1);
delete from ring_last;
insert into ring_last
select public.start_battle(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'pve',
  'kiln-warden',
  null,
  '{}'::uuid[]
);

do $$ begin
  if coalesce((select (payload #>> '{you,maxHp}')::int from ring_last), 0) < 60 then
    raise exception 'Crownwyrm HP is not raised: %', (select payload #>> '{you,maxHp}' from ring_last);
  end if;
  raise notice 'crownwyrm maxHp %', (select payload #>> '{you,maxHp}' from ring_last);
end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'inferno');
do $$ begin
  if (select payload ->> 'log' from ring_last) not ilike '%Inferno Crown%' then
    raise exception 'inferno did not fire: %', (select payload ->> 'log' from ring_last);
  end if;
  if coalesce((select (payload #>> '{you,infernoCd}')::int from ring_last), 0) <> 3 then
    raise exception 'inferno cooldown not set: %', (select payload #>> '{you,infernoCd}' from ring_last);
  end if;
  if coalesce((select (payload #>> '{foe,burn}')::int from ring_last), 0) <> 2 then
    raise exception 'burn not applied: %', (select payload #>> '{foe,burn}' from ring_last);
  end if;
  raise notice 'inferno: %', (select payload ->> 'log' from ring_last);
end $$;

select pg_sleep(0.5);
update ring_last set payload = public.battle_turn((payload ->> 'id')::uuid, 'inferno');
do $$ begin
  if (select payload ->> 'log' from ring_last) not ilike '%still gathering%' then
    raise exception 'second inferno was not on cooldown: %', (select payload ->> 'log' from ring_last);
  end if;
  if (select payload ->> 'log' from ring_last) not ilike '%keeps burning%' then
    raise exception 'burn did not tick: %', (select payload ->> 'log' from ring_last);
  end if;
  if coalesce((select (payload #>> '{you,infernoCd}')::int from ring_last), 99) <> 2 then
    raise exception 'cooldown did not tick: %', (select payload #>> '{you,infernoCd}' from ring_last);
  end if;
  raise notice 'cooldown and burn ok';
end $$;
