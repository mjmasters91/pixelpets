-- Crownwyrm: a steward-only species. Not applied by the app; review and run this yourself.
-- Exclusive companions stay on their keeper's pages, and cannot be released or given away.

alter table public.species
  add column if not exists is_exclusive boolean not null default false;

comment on column public.species.is_exclusive is
  'Steward species. Hidden from public lists. Cannot be released, traded, or given to a non-admin.';

drop policy if exists species_read on public.species;
create policy species_read on public.species
  for select to anon, authenticated
  using (not is_exclusive or private.caller_is_admin());

insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order, is_exclusive)
select
  'b0000000-0000-4000-8000-000000000019',
  'crownwyrm',
  'Crownwyrm',
  'A black royal dragon veined with molten red, fiery wings spread, and a small gold crown. It keeps the cliff ovens and does not leave its keeper.',
  id,
  'art/species/crownwyrm.png',
  8,
  19,
  true
from public.lands
where slug = 'cinderreach'
on conflict (slug) do update
set
  name = excluded.name,
  blurb = excluded.blurb,
  home_land_id = excluded.home_land_id,
  art_base_path = excluded.art_base_path,
  base_hue = excluded.base_hue,
  sort_order = excluded.sort_order,
  is_exclusive = true,
  is_active = true;

-- Once a keeper has an exclusive companion, the owner cannot change.
-- An unowned one can be claimed only by a steward.
create or replace function private.guard_exclusive_companion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  exclusive boolean;
begin
  select s.is_exclusive into exclusive
  from public.species s
  where s.id = new.species_id;
  if coalesce(exclusive, false) and tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    if old.owner_id is not null then
      raise exception 'This companion stays with their keeper.';
    end if;
    if not private.caller_is_admin() then
      raise exception 'That companion is not in the Open Nest.';
    end if;
  end if;
  if coalesce(exclusive, false) and tg_op = 'INSERT' and new.owner_id is not null and not private.is_trusted_writer() and not private.caller_is_admin() then
    raise exception 'That species is kept for stewards.';
  end if;
  return new;
end;
$$;

drop trigger if exists companions_exclusive_guard on public.companions;
create trigger companions_exclusive_guard
before insert or update of owner_id, species_id on public.companions
for each row execute function private.guard_exclusive_companion();

revoke all on function private.guard_exclusive_companion() from public, anon, authenticated;

create or replace function public.list_open_nest()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pet_id uuid;
  steward boolean := private.caller_is_admin();
begin
  for pet_id in
    select c.id
    from public.companions c
    join public.species s on s.id = c.species_id
    where c.owner_id is null
      and (not s.is_exclusive or steward)
  loop
    perform private.tick_companion(pet_id);
  end loop;
  return coalesce((
    select jsonb_agg(private.companion_json(c.id) order by c.created_at)
    from public.companions c
    join public.species s on s.id = c.species_id
    where c.owner_id is null
      and (not s.is_exclusive or steward)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_companion(p_species_id uuid, p_tint_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  clean text := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
  new_id uuid := extensions.gen_random_uuid();
  exclusive boolean;
begin
  if (select count(*) from public.companions where owner_id = u) >= 4 then
    raise exception 'A keeper may only have four companions.';
  end if;
  if clean !~ '^[A-Za-z][A-Za-z0-9'' -]{1,19}$' then
    raise exception 'Names start with a letter and stay under 20 characters.';
  end if;
  select is_exclusive into exclusive from public.species where id = p_species_id and is_active;
  if exclusive is null then
    raise exception 'Pick a species and a tint.';
  end if;
  if not exists (select 1 from public.tints where id = p_tint_id) then
    raise exception 'Pick a species and a tint.';
  end if;
  if exclusive and not private.caller_is_admin() then
    raise exception 'That species is kept for stewards.';
  end if;
  if exclusive and not exists (select 1 from public.tints where id = p_tint_id and slug = 'natural') then
    raise exception 'This companion keeps its own colors.';
  end if;
  if exists (select 1 from public.companions where lower(name) = lower(clean)) then
    raise exception 'That name is already spoken in Lumenwick.';
  end if;
  insert into public.companions (id, owner_id, species_id, tint_id, name, hunger, mood, last_care_tick_at)
  values (new_id, u, p_species_id, p_tint_id, clean, 70, 70, now());
  return new_id;
end;
$$;

create or replace function public.adopt_companion(p_companion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  owner uuid;
  exclusive boolean;
begin
  if (select count(*) from public.companions where owner_id = u) >= 4 then
    raise exception 'A keeper may only have four companions.';
  end if;
  select c.owner_id, s.is_exclusive into owner, exclusive
  from public.companions c
  join public.species s on s.id = c.species_id
  where c.id = p_companion_id
  for update of c;
  if not found then
    raise exception 'That companion has already found a keeper.';
  end if;
  if owner is not null then
    raise exception 'That companion has already found a keeper.';
  end if;
  if exclusive and not private.caller_is_admin() then
    raise exception 'That companion is not in the Open Nest.';
  end if;
  update public.companions set owner_id = u, released_at = null where id = p_companion_id;
end;
$$;

create or replace function public.release_companion(p_companion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  exclusive boolean;
begin
  select s.is_exclusive into exclusive
  from public.companions c
  join public.species s on s.id = c.species_id
  where c.id = p_companion_id and c.owner_id = u;
  if not found then
    raise exception 'That companion is not with you.';
  end if;
  if exclusive then
    raise exception 'This companion stays with their keeper.';
  end if;
  update public.companions
  set owner_id = null, released_at = now()
  where id = p_companion_id and owner_id = u;
end;
$$;

-- One-off gift. This block is not SECURITY DEFINER; it runs as the migration role.
-- Skips quietly when Sender is missing, already keeps Ember King, or already has four companions.
do $ember$
declare
  v_owner uuid;
  v_species uuid;
  v_tint uuid;
  v_owned integer;
begin
  select id into v_owner from public.profiles where lower(username) = 'sender';
  if v_owner is null then
    raise notice 'crownwyrm: no Sender profile, skipped Ember King';
    return;
  end if;
  if exists (select 1 from public.companions where lower(name) = 'ember king') then
    raise notice 'crownwyrm: Ember King already exists';
    return;
  end if;
  select count(*) into v_owned from public.companions where owner_id = v_owner;
  if v_owned >= 4 then
    raise notice 'crownwyrm: Sender already has four companions, skipped Ember King';
    return;
  end if;
  select id into v_species from public.species where slug = 'crownwyrm';
  select id into v_tint from public.tints where slug = 'natural';
  insert into public.companions (owner_id, species_id, tint_id, name, hunger, mood, last_care_tick_at)
  values (v_owner, v_species, v_tint, 'Ember King', 100, 100, now());
end
$ember$;
