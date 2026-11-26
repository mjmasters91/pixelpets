-- Local proof for ring rankings. Not applied to production.
\set ON_ERROR_STOP on
create table if not exists public._smoke_battle (id uuid);

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rank-a@example.com', '{"username":"RankA","display_name":"Rank A"}'::jsonb, now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rank-b@example.com', '{"username":"RankB","display_name":"Rank B"}'::jsonb, now());

select set_config('pixelpets.uid', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

insert into public.companions (id, owner_id, species_id, tint_id, name, hunger, mood, level) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select id from public.species where slug = 'lumkin'), (select id from public.tints where slug = 'natural'), 'RankLum', 80, 80, 1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', (select id from public.species where slug = 'quillora'), (select id from public.tints where slug = 'natural'), 'RankQuill', 80, 80, 1),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', (select id from public.species where slug = 'crownwyrm'), (select id from public.tints where slug = 'natural'), 'RankWyrm', 100, 100, 5);

do $$
declare board jsonb;
begin
  board := public.ring_rankings('pets');
  if board::text ilike '%crownwyrm%' or board::text ilike '%RankWyrm%' then
    raise exception 'rankings leaked a Crownwyrm: %', board;
  end if;
  if board::text not ilike '%RankQuill%' then
    raise exception 'rankings missed RankQuill: %', board;
  end if;
  raise notice 'rankings pets ok';
end $$;

do $$
begin
  perform public.start_battle('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pvp', null, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '{}'::uuid[]);
  raise exception 'crownwyrm challenge was allowed';
exception when others then
  if sqlerrm not ilike '%keeper challenges%' then raise; end if;
  raise notice 'crownwyrm blocked';
end $$;

select pg_sleep(2.1);
do $$
begin
  perform public.start_battle('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pvp', null, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '{}'::uuid[]);
  raise exception 'self challenge was allowed';
exception when others then
  if sqlerrm not ilike '%own quay%' and sqlerrm not ilike '%not waiting%' then raise; end if;
  raise notice 'self challenge blocked';
end $$;

select pg_sleep(2.1);
insert into public._smoke_battle (id)
select (public.start_battle(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pvp', null,
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{}'::uuid[]
) ->> 'id')::uuid;
