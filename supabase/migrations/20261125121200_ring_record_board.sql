-- Ring Record board, and a one-time backfill of PvE wins from battles.
-- Review and apply manually. Do not run this against production from the app.
-- pve_wins and pve_losses are set from public.battles, not added, so a second
-- apply lands on the same numbers. The streak is the latest run of PvE wins.

update public.companions as c
set pve_wins = s.wins,
    pve_losses = s.losses
from (
  select c2.id,
    coalesce(b.wins, 0) as wins,
    coalesce(b.losses, 0) as losses
  from public.companions c2
  left join (
    select companion_id,
      count(*) filter (where status = 'won')::integer as wins,
      count(*) filter (where status = 'lost')::integer as losses
    from public.battles
    where mode = 'pve' and status in ('won', 'lost')
    group by companion_id
  ) b on b.companion_id = c2.id
) s
where c.id = s.id;

update public.companions as c
set pve_streak = coalesce((
  select count(*)::integer
  from (
    select status,
      sum(case when status = 'lost' then 1 else 0 end)
        over (order by updated_at desc, id desc) as losses_seen
    from public.battles
    where companion_id = c.id
      and mode = 'pve'
      and status in ('won', 'lost')
  ) recent
  where recent.status = 'won' and recent.losses_seen = 0
), 0);

create or replace function public.ring_rankings(p_board text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_board text := lower(coalesce(nullif(p_board, ''), 'ring'));
  v_week date;
  v_me uuid := auth.uid();
begin
  if v_board not in ('ring', 'pets', 'keepers', 'week') then
    raise exception 'Unknown board.';
  end if;
  v_week := pg_catalog.date_trunc('week', private.wick_today()::timestamp)::date;
  if v_board = 'ring' then
    return jsonb_build_object('board', 'ring', 'rows', coalesce((
      select jsonb_agg(q.obj order by q.ord)
      from (
        select jsonb_build_object(
          'rank', row_number() over (
            order by (c.pve_wins + c.pvp_wins) desc,
              case when (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses) = 0 then 0
                else (c.pve_wins + c.pvp_wins)::numeric / (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses)
              end desc,
              c.name
          ),
          'companionId', c.id,
          'name', c.name,
          'speciesSlug', s.slug,
          'owner', p.username,
          'level', c.level,
          'rating', c.rating,
          'pveWins', c.pve_wins,
          'pveLosses', c.pve_losses,
          'pveStreak', c.pve_streak,
          'pvpWins', c.pvp_wins,
          'pvpLosses', c.pvp_losses,
          'pvpStreak', c.pvp_streak,
          'yours', c.owner_id is not distinct from v_me
        ) as obj,
        row_number() over (
          order by (c.pve_wins + c.pvp_wins) desc,
            case when (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses) = 0 then 0
              else (c.pve_wins + c.pvp_wins)::numeric / (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses)
            end desc,
            c.name
        ) as ord
        from public.companions c
        join public.species s on s.id = c.species_id
        join public.profiles p on p.id = c.owner_id
        where c.owner_id is not null
        order by (c.pve_wins + c.pvp_wins) desc,
          case when (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses) = 0 then 0
            else (c.pve_wins + c.pvp_wins)::numeric / (c.pve_wins + c.pvp_wins + c.pve_losses + c.pvp_losses)
          end desc,
          c.name
        limit 40
      ) q
    ), '[]'::jsonb));
  elsif v_board = 'keepers' then
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
