-- Security definer RPCs. Clients never write Glims, hunger, mood, or ownership directly.
-- search_path is empty. private is not part of the Data API.

create or replace function private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise exception 'Sign in to do that.';
  end if;
  if exists (select 1 from public.profiles p where p.id = u and p.banned_at is not null) then
    raise exception 'The quay has asked this keeper to step away.';
  end if;
  return u;
end;
$$;

create or replace function private.wick_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (timezone('America/Chicago', now()))::date;
$$;

create or replace function private.wick_start(p_day date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select p_day::timestamp at time zone 'America/Chicago';
$$;

create or replace function private.adjust_glims(
  p_profile uuid,
  p_delta integer,
  p_reason text,
  p_ref_type text,
  p_ref_id uuid,
  p_actor uuid
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  bal integer;
begin
  if p_reason not in ('signup', 'morning_wick', 'game', 'shop_buy', 'shop_refund', 'trade', 'trade_refund', 'basket', 'steward', 'other') then
    raise exception 'Unknown ledger reason.';
  end if;
  update public.wallets
  set glims = glims + p_delta, updated_at = now()
  where profile_id = p_profile
  returning glims into bal;
  if not found then
    raise exception 'Wallet missing.';
  end if;
  if bal < 0 then
    raise exception 'Not enough Glims.';
  end if;
  insert into public.glim_ledger (profile_id, delta, balance_after, reason, ref_type, ref_id, actor_id)
  values (p_profile, p_delta, bal, p_reason, p_ref_type, p_ref_id, p_actor);
  return bal;
end;
$$;

create or replace function private.give_stack(p_profile uuid, p_item uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;
  insert into public.satchel_stacks (profile_id, item_id, qty)
  values (p_profile, p_item, p_qty)
  on conflict (profile_id, item_id) do update set qty = public.satchel_stacks.qty + excluded.qty;
end;
$$;

create or replace function private.take_stack(p_profile uuid, p_item uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  have integer;
begin
  if p_qty < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;
  select qty into have from public.satchel_stacks where profile_id = p_profile and item_id = p_item for update;
  if have is null or have < p_qty then
    raise exception 'That is not in the satchel.';
  end if;
  if have = p_qty then
    delete from public.satchel_stacks where profile_id = p_profile and item_id = p_item;
  else
    update public.satchel_stacks set qty = qty - p_qty where profile_id = p_profile and item_id = p_item;
  end if;
end;
$$;

create or replace function private.rate_limit(p_profile uuid, p_action text, p_seconds numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.rate_limits as r (profile_id, action, acted_at)
  values (p_profile, p_action, now())
  on conflict (profile_id, action) do update
    set acted_at = now()
    where r.acted_at <= now() - make_interval(secs => p_seconds);
  if not found then
    raise exception 'Easy — give that another moment.';
  end if;
end;
$$;

create or replace function private.assert_clean(p_text text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_text ~* '(https?://|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})' then
    raise exception 'Keep it on the quay — no links or outside contact.';
  end if;
  if p_text ~* '\m(fuck|shit|bitch|asshole|cunt|nigger|faggot|retard)\M' then
    raise exception 'That wording does not belong on the boards.';
  end if;
end;
$$;

create or replace function private.tick_companion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.companions%rowtype;
  secs numeric;
  h_drop integer;
  m_drop integer;
  new_hunger integer;
begin
  select * into c from public.companions where id = p_id for update;
  if not found then
    return;
  end if;
  secs := extract(epoch from (now() - c.last_care_tick_at));
  h_drop := least(c.hunger, floor(secs * 5 / 3600.0)::int);
  new_hunger := c.hunger - h_drop;
  m_drop := floor(secs * 3 / 3600.0)::int;
  if new_hunger < 35 then
    m_drop := m_drop + floor(secs * 2 / 3600.0)::int;
  end if;
  m_drop := least(c.mood, m_drop);
  if h_drop = 0 and m_drop = 0 then
    return;
  end if;
  update public.companions
  set hunger = new_hunger,
      mood = c.mood - m_drop,
      last_care_tick_at = now()
  where id = p_id;
end;
$$;

create or replace function private.companion_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'speciesSlug', s.slug,
    'speciesName', s.name,
    'tintSlug', t.slug,
    'tintName', t.name,
    'ownerId', c.owner_id,
    'ownerUsername', pr.username,
    'hunger', c.hunger,
    'mood', c.mood,
    'createdAt', c.created_at,
    'lastPlayedAt', c.last_played_at
  )
  from public.companions c
  join public.species s on s.id = c.species_id
  join public.tints t on t.id = c.tint_id
  left join public.profiles pr on pr.id = c.owner_id
  where c.id = p_id;
$$;

create or replace function private.grant_signup_glims(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.glim_ledger where profile_id = p_id and reason = 'signup') then
    return;
  end if;
  perform private.adjust_glims(p_id, 500, 'signup', 'profile', p_id, null);
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := coalesce(new.raw_user_meta_data ->> 'username', '');
  v_display text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  -- is_admin is never copied from user metadata.
  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Usernames are 3–20 letters, numbers, or underscores.';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    raise exception 'That username is already taken.';
  end if;
  if v_display = '' then
    v_display := v_username;
  end if;
  if char_length(v_display) > 40 then
    raise exception 'Display names stay under 40 characters.';
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display);
  insert into public.wallets (profile_id, glims) values (new.id, 0);
  if new.email_confirmed_at is not null then
    perform private.grant_signup_glims(new.id);
  end if;
  return new;
end;
$$;

create or replace function private.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform private.grant_signup_glims(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update of email_confirmed_at on auth.users
for each row execute function private.handle_user_confirmed();

create or replace function private.restock_due()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop record;
  line record;
  add_qty integer;
  minutes integer;
begin
  for shop in
    select * from public.shops
    where next_restock_at <= now()
    order by id
    for update
  loop
    for line in
      select * from public.shop_stock where shop_id = shop.id order by item_id for update
    loop
      if line.qty < line.restock_target then
        add_qty := least(line.restock_batch, line.restock_target - line.qty);
        update public.shop_stock set qty = qty + add_qty where shop_id = line.shop_id and item_id = line.item_id;
      end if;
    end loop;
    minutes := shop.restock_min_minutes + floor(random() * (shop.restock_max_minutes - shop.restock_min_minutes + 1))::int;
    update public.shops set next_restock_at = now() + make_interval(mins => minutes) where id = shop.id;
  end loop;
end;
$$;

create or replace function private.refund_offers(p_trade uuid, p_except uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer record;
  lot record;
begin
  for offer in
    select * from public.trade_offers
    where trade_id = p_trade and status = 'open' and (p_except is null or id <> p_except)
    for update
  loop
    update public.trade_offers set status = 'declined' where id = offer.id;
    if offer.glims > 0 then
      perform private.adjust_glims(offer.buyer_id, offer.glims, 'trade_refund', 'trade', p_trade, null);
    end if;
    for lot in select * from public.trade_offer_items where offer_id = offer.id loop
      perform private.give_stack(offer.buyer_id, lot.item_id, lot.qty);
    end loop;
  end loop;
end;
$$;

create or replace function private.return_lots(p_trade uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lot record;
begin
  for lot in select * from public.trade_lots where trade_id = p_trade loop
    perform private.give_stack(p_profile, lot.item_id, lot.qty);
  end loop;
end;
$$;

create or replace function public.list_my_companions()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  pet_id uuid;
begin
  for pet_id in select id from public.companions where owner_id = u loop
    perform private.tick_companion(pet_id);
  end loop;
  return coalesce((
    select jsonb_agg(private.companion_json(c.id) order by c.created_at)
    from public.companions c where c.owner_id = u
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_companion(p_companion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.tick_companion(p_companion_id);
  return private.companion_json(p_companion_id);
end;
$$;

create or replace function public.list_open_nest()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pet_id uuid;
begin
  for pet_id in select id from public.companions where owner_id is null loop
    perform private.tick_companion(pet_id);
  end loop;
  return coalesce((
    select jsonb_agg(private.companion_json(c.id) order by c.created_at)
    from public.companions c where c.owner_id is null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_companions_of(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
  pet_id uuid;
begin
  select id into u from public.profiles where lower(username) = lower(p_username);
  if u is null then
    return '[]'::jsonb;
  end if;
  for pet_id in select id from public.companions where owner_id = u loop
    perform private.tick_companion(pet_id);
  end loop;
  return coalesce((
    select jsonb_agg(private.companion_json(c.id) order by c.created_at)
    from public.companions c where c.owner_id = u
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
begin
  if (select count(*) from public.companions where owner_id = u) >= 4 then
    raise exception 'A keeper may only have four companions.';
  end if;
  if clean !~ '^[A-Za-z][A-Za-z0-9'' -]{1,19}$' then
    raise exception 'Names start with a letter and stay under 20 characters.';
  end if;
  if not exists (select 1 from public.species where id = p_species_id and is_active) then
    raise exception 'Pick a species and a tint.';
  end if;
  if not exists (select 1 from public.tints where id = p_tint_id) then
    raise exception 'Pick a species and a tint.';
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
begin
  if (select count(*) from public.companions where owner_id = u) >= 4 then
    raise exception 'A keeper may only have four companions.';
  end if;
  select owner_id into owner from public.companions where id = p_companion_id for update;
  if owner is null and not found then
    raise exception 'That companion has already found a keeper.';
  end if;
  if owner is not null then
    raise exception 'That companion has already found a keeper.';
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
begin
  update public.companions
  set owner_id = null, released_at = now()
  where id = p_companion_id and owner_id = u;
  if not found then
    raise exception 'That companion is not with you.';
  end if;
end;
$$;

create or replace function private.apply_care(p_companion uuid, p_item uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  item public.items%rowtype;
  pet public.companions%rowtype;
begin
  select * into pet from public.companions where id = p_companion and owner_id = u for update;
  if not found then
    raise exception 'That companion is not with you.';
  end if;
  perform private.tick_companion(pet.id);
  select * into pet from public.companions where id = p_companion;
  select * into item from public.items where id = p_item and is_active;
  if not found then
    raise exception 'Unknown item.';
  end if;
  if p_kind = 'feed' and item.category not in ('food', 'treat') then
    raise exception 'That is not food.';
  elsif p_kind = 'play' and item.category <> 'toy' then
    raise exception 'That is for play, not this.';
  elsif p_kind = 'groom' and item.category <> 'groom' then
    raise exception 'That will not work as a brush.';
  end if;
  if p_kind = 'play' and pet.last_played_at is not null and pet.last_played_at > now() - interval '15 minutes' then
    raise exception 'Give them a little rest before another game.';
  end if;
  if item.reusable then
    if not exists (select 1 from public.satchel_stacks where profile_id = u and item_id = item.id and qty > 0) then
      raise exception 'That is not in the satchel.';
    end if;
  else
    perform private.take_stack(u, item.id, 1);
  end if;
  if p_kind = 'feed' then
    update public.companions
    set hunger = least(100, hunger + item.hunger_delta),
        mood = least(100, mood + item.mood_delta),
        last_fed_at = now()
    where id = pet.id;
  elsif p_kind = 'play' then
    update public.companions
    set mood = least(100, mood + item.mood_delta), last_played_at = now()
    where id = pet.id;
  else
    update public.companions
    set mood = least(100, mood + item.mood_delta), last_groomed_at = now()
    where id = pet.id;
  end if;
end;
$$;

create or replace function public.feed_companion(p_companion_id uuid, p_item_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin perform private.apply_care(p_companion_id, p_item_id, 'feed'); end; $$;

create or replace function public.play_companion(p_companion_id uuid, p_item_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin perform private.apply_care(p_companion_id, p_item_id, 'play'); end; $$;

create or replace function public.groom_companion(p_companion_id uuid, p_item_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin perform private.apply_care(p_companion_id, p_item_id, 'groom'); end; $$;

create or replace function public.claim_morning_wick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  today date := private.wick_today();
  prev_streak integer;
  prev_on date;
  streak integer;
  gift integer;
  inserted integer;
begin
  perform private.rate_limit(u, 'morning', 2);
  select morning_streak, morning_streak_on into prev_streak, prev_on from public.profiles where id = u for update;
  if prev_on = today then
    streak := prev_streak;
  elsif prev_on = today - 1 then
    streak := prev_streak + 1;
  else
    streak := 1;
  end if;
  gift := least(200 + (streak - 1) * 50, 500);
  insert into public.daily_claims (profile_id, daily_key, claimed_on, payload)
  values (u, 'morning_wick', today, jsonb_build_object('streak', streak, 'glims', gift))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    raise exception 'The Morning Wick is already lit today.';
  end if;
  update public.profiles set morning_streak = streak, morning_streak_on = today where id = u;
  perform private.adjust_glims(u, gift, 'morning_wick', 'daily', null, null);
  return jsonb_build_object('glims', gift, 'streak', streak);
end;
$$;

create or replace function public.claim_tide_bowl(p_companion_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  today date := private.wick_today();
  broth uuid;
  inserted integer;
begin
  insert into public.daily_claims (profile_id, daily_key, claimed_on)
  values (u, 'tide_bowl', today)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    raise exception 'The Tide Bowl was already used today.';
  end if;
  select id into broth from public.items where slug = 'tide-broth';
  if p_companion_id is null then
    perform private.give_stack(u, broth, 1);
  else
    perform private.tick_companion(p_companion_id);
    update public.companions c
    set hunger = least(100, c.hunger + i.hunger_delta),
        mood = least(100, c.mood + i.mood_delta),
        last_fed_at = now()
    from public.items i
    where c.id = p_companion_id and c.owner_id = u and i.id = broth;
    if not found then
      raise exception 'Choose one of your companions.';
    end if;
  end if;
end;
$$;

create or replace function public.donate_to_basket(p_item_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  n integer;
begin
  if p_qty < 1 or p_qty > 10 then
    raise exception 'Donate between 1 and 10.';
  end if;
  perform private.take_stack(u, p_item_id, p_qty);
  for n in 1..p_qty loop
    insert into public.basket_items (item_id, donated_by) values (p_item_id, u);
  end loop;
end;
$$;

create or replace function public.take_from_basket(p_basket_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  today date := private.wick_today();
  item uuid;
  count_now integer;
begin
  select coalesce((payload ->> 'count')::int, 0) into count_now
  from public.daily_claims
  where profile_id = u and daily_key = 'basket' and claimed_on = today
  for update;
  if coalesce(count_now, 0) >= 3 then
    raise exception 'The Shared Basket allows three takes a day.';
  end if;
  delete from public.basket_items where id = p_basket_item_id returning item_id into item;
  if item is null then
    raise exception 'Someone else took that.';
  end if;
  perform private.give_stack(u, item, 1);
  insert into public.daily_claims (profile_id, daily_key, claimed_on, payload)
  values (u, 'basket', today, jsonb_build_object('count', 1))
  on conflict (profile_id, daily_key, claimed_on)
  do update set payload = jsonb_build_object('count', coalesce((public.daily_claims.payload ->> 'count')::int, 0) + 1);
end;
$$;

create or replace function public.restock_shops()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.restock_due();
end;
$$;

create or replace function public.buy_from_shop(p_shop_id uuid, p_item_id uuid, p_qty integer, p_quoted_price integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  have integer;
  cost integer;
begin
  if p_qty < 1 or p_qty > 10 then
    raise exception 'That shelf does not have it.';
  end if;
  perform private.rate_limit(u, 'buy', 2);
  perform private.restock_due();
  perform 1 from public.wallets where profile_id = u for update;
  select qty, price into have, cost from public.shop_stock where shop_id = p_shop_id and item_id = p_item_id for update;
  if have is null then
    raise exception 'That shelf does not have it.';
  end if;
  if p_quoted_price is distinct from cost then
    raise exception 'The price changed — have another look.';
  end if;
  if have < p_qty then
    raise exception 'Sold out — the next restock is on its way.';
  end if;
  perform private.adjust_glims(u, -(cost * p_qty), 'shop_buy', 'shop', p_shop_id, null);
  update public.shop_stock set qty = qty - p_qty where shop_id = p_shop_id and item_id = p_item_id;
  perform private.give_stack(u, p_item_id, p_qty);
end;
$$;

create or replace function public.expire_trades()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  trade record;
begin
  for trade in
    select * from public.trades where status = 'open' and expires_at <= now() order by id for update
  loop
    update public.trades set status = 'expired', closed_at = now() where id = trade.id;
    perform private.return_lots(trade.id, trade.seller_id);
    perform private.refund_offers(trade.id, null);
  end loop;
end;
$$;

create or replace function public.create_trade(p_lines jsonb, p_ask_glims integer, p_wishlist text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  trade_id uuid := extensions.gen_random_uuid();
  line record;
  n integer;
  wish text := left(trim(coalesce(p_wishlist, '')), 200);
begin
  if p_ask_glims < 0 then
    raise exception 'Asking price cannot be negative.';
  end if;
  n := jsonb_array_length(coalesce(p_lines, '[]'::jsonb));
  if n < 1 or n > 5 then
    raise exception 'List between 1 and 5 stacks.';
  end if;
  if wish <> '' then
    perform private.assert_clean(wish);
  end if;
  insert into public.trades (id, seller_id, ask_glims, wishlist, expires_at)
  values (trade_id, u, p_ask_glims, wish, now() + interval '3 days');
  for line in
    select * from jsonb_to_recordset(p_lines) as x(item_id uuid, qty integer)
  loop
    if line.qty < 1 then
      raise exception 'Quantity must be at least 1.';
    end if;
    perform private.take_stack(u, line.item_id, line.qty);
    insert into public.trade_lots (trade_id, item_id, qty) values (trade_id, line.item_id, line.qty);
  end loop;
  return trade_id;
end;
$$;

create or replace function public.cancel_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
begin
  update public.trades set status = 'cancelled', closed_at = now()
  where id = p_trade_id and seller_id = u and status = 'open';
  if not found then
    raise exception 'That listing is not open.';
  end if;
  perform private.return_lots(p_trade_id, u);
  perform private.refund_offers(p_trade_id, null);
end;
$$;

create or replace function public.buy_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  trade public.trades%rowtype;
  lot record;
begin
  select * into trade from public.trades where id = p_trade_id and status = 'open' for update;
  if not found then
    raise exception 'That listing is gone.';
  end if;
  if trade.seller_id = u then
    raise exception 'You cannot buy your own listing.';
  end if;
  if trade.ask_glims > 0 then
    perform private.adjust_glims(u, -trade.ask_glims, 'trade', 'trade', trade.id, null);
    perform private.adjust_glims(trade.seller_id, trade.ask_glims, 'trade', 'trade', trade.id, null);
  end if;
  for lot in select * from public.trade_lots where trade_id = trade.id loop
    perform private.give_stack(u, lot.item_id, lot.qty);
  end loop;
  update public.trades set status = 'completed', closed_at = now() where id = trade.id;
  perform private.refund_offers(trade.id, null);
end;
$$;

create or replace function public.offer_trade(p_trade_id uuid, p_glims integer, p_lines jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  trade public.trades%rowtype;
  offer_id uuid := extensions.gen_random_uuid();
  line record;
  n integer;
begin
  if p_glims < 0 then
    raise exception 'Offer Glims cannot be negative.';
  end if;
  select * into trade from public.trades where id = p_trade_id and status = 'open' for update;
  if not found then
    raise exception 'That listing is gone.';
  end if;
  if trade.seller_id = u then
    raise exception 'You cannot offer on your own listing.';
  end if;
  n := jsonb_array_length(coalesce(p_lines, '[]'::jsonb));
  if p_glims = 0 and n = 0 then
    raise exception 'Offer Glims, items, or both.';
  end if;
  if n > 5 then
    raise exception 'An offer holds up to 5 stacks.';
  end if;
  if p_glims > 0 then
    perform private.adjust_glims(u, -p_glims, 'trade', 'trade', trade.id, null);
  end if;
  insert into public.trade_offers (id, trade_id, buyer_id, glims) values (offer_id, trade.id, u, p_glims);
  for line in select * from jsonb_to_recordset(coalesce(p_lines, '[]'::jsonb)) as x(item_id uuid, qty integer) loop
    perform private.take_stack(u, line.item_id, line.qty);
    insert into public.trade_offer_items (offer_id, item_id, qty) values (offer_id, line.item_id, line.qty);
  end loop;
  return offer_id;
end;
$$;

create or replace function public.withdraw_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  offer public.trade_offers%rowtype;
  lot record;
begin
  select * into offer from public.trade_offers where id = p_offer_id and buyer_id = u and status = 'open' for update;
  if not found then
    raise exception 'That offer is not open.';
  end if;
  update public.trade_offers set status = 'withdrawn' where id = offer.id;
  if offer.glims > 0 then
    perform private.adjust_glims(u, offer.glims, 'trade_refund', 'trade', offer.trade_id, null);
  end if;
  for lot in select * from public.trade_offer_items where offer_id = offer.id loop
    perform private.give_stack(u, lot.item_id, lot.qty);
  end loop;
end;
$$;

create or replace function public.accept_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  offer public.trade_offers%rowtype;
  trade public.trades%rowtype;
  lot record;
begin
  select * into offer from public.trade_offers where id = p_offer_id and status = 'open' for update;
  if not found then
    raise exception 'That offer cannot be accepted.';
  end if;
  select * into trade from public.trades where id = offer.trade_id and status = 'open' and seller_id = u for update;
  if not found then
    raise exception 'That offer cannot be accepted.';
  end if;
  for lot in select * from public.trade_lots where trade_id = trade.id loop
    perform private.give_stack(offer.buyer_id, lot.item_id, lot.qty);
  end loop;
  for lot in select * from public.trade_offer_items where offer_id = offer.id loop
    perform private.give_stack(u, lot.item_id, lot.qty);
  end loop;
  if offer.glims > 0 then
    perform private.adjust_glims(u, offer.glims, 'trade', 'trade', trade.id, null);
  end if;
  update public.trade_offers set status = 'accepted' where id = offer.id;
  update public.trades set status = 'completed', closed_at = now(), accepted_offer_id = offer.id where id = trade.id;
  perform private.refund_offers(trade.id, offer.id);
end;
$$;

create or replace function public.start_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  sid uuid := extensions.gen_random_uuid();
  nonce uuid := extensions.gen_random_uuid();
begin
  if not exists (select 1 from public.minigames where id = p_game_id) then
    raise exception 'Unknown game.';
  end if;
  perform private.rate_limit(u, 'game', 2);
  update public.game_sessions
  set status = 'expired', ended_at = now()
  where profile_id = u and status = 'open' and started_at < now() - interval '20 minutes';
  insert into public.game_sessions (id, profile_id, game_id, nonce)
  values (sid, u, p_game_id, nonce);
  return jsonb_build_object('session_id', sid, 'nonce', nonce);
end;
$$;

create or replace function public.submit_game(p_session_id uuid, p_nonce uuid, p_client_score integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  session public.game_sessions%rowtype;
  game public.minigames%rowtype;
  elapsed integer;
  awarded integer;
  plays integer;
  already integer;
  gift integer;
  today date := private.wick_today();
  featured boolean;
begin
  select * into session from public.game_sessions where id = p_session_id and profile_id = u for update;
  if not found or session.status <> 'open' or session.nonce <> p_nonce then
    raise exception 'That play is not open.';
  end if;
  select * into game from public.minigames where id = session.game_id;
  elapsed := floor(extract(epoch from (now() - session.started_at)) * 1000)::int;
  if elapsed > 20 * 60 * 1000 then
    update public.game_sessions set status = 'expired', ended_at = now(), duration_ms = elapsed where id = session.id;
    raise exception 'That play expired.';
  end if;
  if elapsed < game.min_duration_ms then
    update public.game_sessions set status = 'rejected', ended_at = now(), duration_ms = elapsed, client_score = p_client_score where id = session.id;
    raise exception 'That run was too short to count.';
  end if;
  if p_client_score is null or p_client_score < 0 or p_client_score > game.score_cap then
    update public.game_sessions set status = 'rejected', ended_at = now(), duration_ms = elapsed, client_score = p_client_score where id = session.id;
    raise exception 'That score is past what this game will count.';
  end if;
  select count(*) into plays
  from public.game_sessions
  where profile_id = u and game_id = game.id and status = 'submitted'
    and ended_at >= private.wick_start(today)
    and ended_at < private.wick_start(today + 1);
  if plays >= game.max_submits_per_day then
    update public.game_sessions set status = 'rejected', ended_at = now(), duration_ms = elapsed, client_score = p_client_score where id = session.id;
    raise exception 'Three scores are already in for this game today.';
  end if;
  featured := game.sort_order = ((extract(doy from today)::int - 1) % 4);
  awarded := p_client_score;
  if featured then
    awarded := least(floor(awarded * 1.5)::int, game.score_cap);
  end if;
  select coalesce(sum(awarded_glims), 0) into already
  from public.game_sessions
  where profile_id = u and status = 'submitted'
    and ended_at >= private.wick_start(today)
    and ended_at < private.wick_start(today + 1);
  gift := least(floor(awarded / game.points_per_glim)::int, game.glim_cap_per_play, greatest(0, 3000 - already));
  if gift > 0 then
    perform private.adjust_glims(u, gift, 'game', 'game', session.id, null);
  end if;
  update public.game_sessions
  set status = 'submitted',
      ended_at = now(),
      duration_ms = elapsed,
      client_score = p_client_score,
      awarded_score = awarded,
      awarded_glims = gift,
      flagged = awarded >= floor(game.score_cap * 0.97),
      user_agent = null
  where id = session.id;
  return jsonb_build_object('awarded', awarded, 'glims', gift);
end;
$$;

create or replace function public.create_thread(p_board_id uuid, p_title text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  title text := trim(regexp_replace(p_title, '\s+', ' ', 'g'));
  body text := trim(p_body);
  thread_id uuid := extensions.gen_random_uuid();
  circle uuid;
begin
  if char_length(title) < 1 or char_length(title) > 80 then
    raise exception 'Titles stay under 80 characters.';
  end if;
  if char_length(body) < 1 or char_length(body) > 4000 then
    raise exception 'Posts stay between 1 and 4,000 characters.';
  end if;
  perform private.assert_clean(title);
  perform private.assert_clean(body);
  select circle_id into circle from public.forum_boards where id = p_board_id;
  if not found then
    raise exception 'Unknown board.';
  end if;
  if circle is not null and not exists (
    select 1 from public.circle_members m where m.circle_id = circle and m.profile_id = u
  ) and not private.caller_is_admin() then
    raise exception 'That board is for circle members.';
  end if;
  insert into public.forum_threads (id, board_id, author_id, title) values (thread_id, p_board_id, u, title);
  insert into public.forum_posts (thread_id, author_id, body) values (thread_id, u, body);
  return thread_id;
end;
$$;

create or replace function public.create_circle_thread(p_circle_id uuid, p_title text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  board uuid;
begin
  select id into board from public.forum_boards where circle_id = p_circle_id;
  if board is null then
    raise exception 'Unknown circle.';
  end if;
  return public.create_thread(board, p_title, p_body);
end;
$$;

create or replace function public.create_post(p_thread_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  body text := trim(p_body);
  thread public.forum_threads%rowtype;
  circle uuid;
  post_id uuid := extensions.gen_random_uuid();
begin
  if char_length(body) < 1 or char_length(body) > 4000 then
    raise exception 'Posts stay between 1 and 4,000 characters.';
  end if;
  perform private.assert_clean(body);
  select * into thread from public.forum_threads where id = p_thread_id and not is_hidden;
  if not found then
    raise exception 'That thread is gone.';
  end if;
  if thread.is_locked then
    raise exception 'This thread is locked.';
  end if;
  select circle_id into circle from public.forum_boards where id = thread.board_id;
  if circle is not null and not exists (
    select 1 from public.circle_members m where m.circle_id = circle and m.profile_id = u
  ) then
    raise exception 'That board is for circle members.';
  end if;
  insert into public.forum_posts (id, thread_id, author_id, body) values (post_id, thread.id, u, body);
  update public.forum_threads set last_post_at = now() where id = thread.id;
  return post_id;
end;
$$;

create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  reason text := trim(p_reason);
  rid uuid := extensions.gen_random_uuid();
begin
  if char_length(reason) < 1 or char_length(reason) > 4000 then
    raise exception 'Posts stay between 1 and 4,000 characters.';
  end if;
  perform private.assert_clean(reason);
  insert into public.reports (id, reporter_id, target_type, target_id, reason)
  values (rid, u, left(p_target_type, 40), p_target_id, reason);
  return rid;
end;
$$;

create or replace function public.create_circle(p_name text, p_slug text, p_motto text, p_about text, p_is_open boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  slug text := lower(trim(p_slug));
  name text := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
  motto text := trim(p_motto);
  about text := trim(coalesce(p_about, ''));
  cid uuid := extensions.gen_random_uuid();
begin
  if exists (select 1 from public.circle_members where profile_id = u) then
    raise exception 'You already keep a Circle. Leave it before starting another.';
  end if;
  if slug !~ '^[a-z0-9-]{3,32}$' then
    raise exception 'Circle links use 3–32 lowercase letters, numbers, or dashes.';
  end if;
  if char_length(name) < 1 or char_length(name) > 40 then
    raise exception 'Display names stay between 1 and 40 characters.';
  end if;
  if char_length(motto) < 1 or char_length(motto) > 80 then
    raise exception 'Titles stay under 80 characters.';
  end if;
  if char_length(about) > 400 then
    raise exception 'Bios stay under 400 characters.';
  end if;
  perform private.assert_clean(name);
  perform private.assert_clean(motto);
  perform private.assert_clean(about);
  insert into public.circles (id, name, slug, motto, about, is_open, created_by)
  values (cid, name, slug, motto, about, coalesce(p_is_open, true), u);
  insert into public.circle_members (circle_id, profile_id, role) values (cid, u, 'keeper');
  insert into public.forum_boards (slug, title, blurb, sort_order, circle_id)
  values ('circle-' || slug, name, motto, 100, cid);
  return cid;
end;
$$;

create or replace function public.join_circle(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
begin
  if exists (select 1 from public.circle_members where profile_id = u) then
    raise exception 'You already keep a Circle. Leave it before joining another.';
  end if;
  if not exists (select 1 from public.circles where id = p_circle_id and is_open) then
    raise exception 'This circle is not taking new keepers.';
  end if;
  insert into public.circle_members (circle_id, profile_id, role) values (p_circle_id, u, 'member');
end;
$$;

create or replace function public.leave_circle(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  old_role text;
begin
  select role into old_role from public.circle_members where circle_id = p_circle_id and profile_id = u;
  if old_role is null then
    raise exception 'You are not in that circle.';
  end if;
  delete from public.circle_members where circle_id = p_circle_id and profile_id = u;
  if old_role = 'keeper' and not exists (
    select 1 from public.circle_members where circle_id = p_circle_id and role = 'keeper'
  ) then
    update public.circle_members
    set role = 'keeper'
    where circle_id = p_circle_id
      and profile_id = (
        select profile_id from public.circle_members where circle_id = p_circle_id order by joined_at limit 1
      );
  end if;
end;
$$;

create or replace function public.invite_to_circle(p_circle_id uuid, p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  who uuid;
  iid uuid := extensions.gen_random_uuid();
begin
  if not exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id and profile_id = u and role in ('keeper', 'guide')
  ) then
    raise exception 'Only a keeper or guide can invite.';
  end if;
  select id into who from public.profiles where lower(username) = lower(trim(p_username));
  if who is null then
    raise exception 'No keeper by that name.';
  end if;
  if exists (select 1 from public.circle_members where profile_id = who) then
    raise exception 'They already keep a Circle.';
  end if;
  insert into public.circle_invites (id, circle_id, inviter_id, invitee_id) values (iid, p_circle_id, u, who);
  return iid;
end;
$$;

create or replace function public.respond_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  invite public.circle_invites%rowtype;
begin
  select * into invite from public.circle_invites where id = p_invite_id and invitee_id = u and status = 'pending' for update;
  if not found then
    raise exception 'That invite is gone.';
  end if;
  if p_accept then
    if exists (select 1 from public.circle_members where profile_id = u) then
      raise exception 'You already keep a Circle.';
    end if;
    update public.circle_invites set status = 'accepted' where id = invite.id;
    insert into public.circle_members (circle_id, profile_id, role) values (invite.circle_id, u, 'member');
  else
    update public.circle_invites set status = 'declined' where id = invite.id;
  end if;
end;
$$;

create or replace function public.steward_adjust_glims(p_username text, p_delta integer, p_note text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  who uuid;
begin
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  perform private.assert_clean(coalesce(p_note, 'steward'));
  select id into who from public.profiles where lower(username) = lower(trim(p_username));
  if who is null then
    raise exception 'No keeper by that name.';
  end if;
  return private.adjust_glims(who, trunc(p_delta)::int, 'steward', 'note', null, u);
end;
$$;

create or replace function public.steward_grant_item(p_username text, p_item_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid;
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  select id into who from public.profiles where lower(username) = lower(trim(p_username));
  if who is null then
    raise exception 'No keeper by that name.';
  end if;
  if p_qty > 0 then
    perform private.give_stack(who, p_item_id, p_qty);
  elsif p_qty < 0 then
    perform private.take_stack(who, p_item_id, -p_qty);
  else
    raise exception 'Quantity cannot be zero.';
  end if;
end;
$$;

create or replace function public.steward_ban(p_username text, p_ban boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
  who uuid;
begin
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  select id into who from public.profiles where lower(username) = lower(trim(p_username));
  if who is null or who = u then
    raise exception 'That ban cannot be applied.';
  end if;
  update public.profiles set banned_at = case when p_ban then now() else null end where id = who;
  if coalesce(p_note, '') <> '' then
    insert into public.ban_notes (profile_id, note, created_by) values (who, left(p_note, 400), u);
  end if;
end;
$$;

create or replace function public.steward_hide_post(p_post_id uuid, p_hide boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  update public.forum_posts set is_hidden = p_hide where id = p_post_id;
  if not found then
    raise exception 'Post not found.';
  end if;
end;
$$;

create or replace function public.steward_lock_thread(p_thread_id uuid, p_lock boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  update public.forum_threads set is_locked = p_lock where id = p_thread_id;
  if not found then
    raise exception 'Thread not found.';
  end if;
end;
$$;

create or replace function public.steward_force_restock(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  update public.shops set next_restock_at = now() where id = p_shop_id;
  perform private.restock_due();
end;
$$;

create or replace function public.steward_set_price(p_shop_id uuid, p_item_id uuid, p_price integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  if p_price < 0 then
    raise exception 'Price could not be set.';
  end if;
  update public.shop_stock set price = p_price where shop_id = p_shop_id and item_id = p_item_id;
  if not found then
    raise exception 'Price could not be set.';
  end if;
end;
$$;

create or replace function public.steward_clear_basket(p_basket_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  delete from public.basket_items where id = p_basket_item_id;
end;
$$;

create or replace function public.steward_resolve_report(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := private.require_user();
begin
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'Unknown report status.';
  end if;
  update public.reports set status = p_status, resolved_by = u where id = p_report_id;
  if not found then
    raise exception 'Report not found.';
  end if;
end;
$$;

create or replace function public.steward_lookup(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who public.profiles%rowtype;
  coins integer;
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  select * into who from public.profiles where lower(username) = lower(trim(p_username));
  if not found then
    return null;
  end if;
  select glims into coins from public.wallets where profile_id = who.id;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', who.id,
      'username', who.username,
      'displayName', who.display_name,
      'bio', who.bio,
      'isAdmin', who.is_admin,
      'bannedAt', who.banned_at,
      'glims', coalesce(coins, 0),
      'morningStreak', who.morning_streak,
      'morningStreakOn', who.morning_streak_on
    ),
    'companions', coalesce((
      select jsonb_agg(private.companion_json(c.id)) from public.companions c where c.owner_id = who.id
    ), '[]'::jsonb),
    'satchel', coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemSlug', i.slug, 'name', i.name, 'qty', s.qty, 'category', i.category,
        'reusable', i.reusable, 'hunger', i.hunger_delta, 'mood', i.mood_delta
      ))
      from public.satchel_stacks s join public.items i on i.id = s.item_id
      where s.profile_id = who.id
    ), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'username', who.username, 'delta', l.delta, 'balanceAfter', l.balance_after,
        'reason', l.reason, 'createdAt', l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.glim_ledger where profile_id = who.id order by created_at desc limit 20
      ) l
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.steward_flagged_games()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.caller_is_admin() then
    raise exception 'The desk is locked.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'username', p.username,
      'gameSlug', g.slug,
      'score', s.awarded_score,
      'at', s.ended_at
    ) order by s.ended_at desc)
    from public.game_sessions s
    join public.profiles p on p.id = s.profile_id
    join public.minigames g on g.id = s.game_id
    where s.flagged and s.status = 'submitted'
  ), '[]'::jsonb);
end;
$$;

revoke all on function private.require_user() from public, anon, authenticated;
revoke all on function private.adjust_glims(uuid, integer, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.give_stack(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function private.take_stack(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function private.rate_limit(uuid, text, numeric) from public, anon, authenticated;
revoke all on function private.assert_clean(text) from public, anon, authenticated;
revoke all on function private.tick_companion(uuid) from public, anon, authenticated;
revoke all on function private.companion_json(uuid) from public, anon, authenticated;
revoke all on function private.grant_signup_glims(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.handle_user_confirmed() from public, anon, authenticated;
revoke all on function private.restock_due() from public, anon, authenticated;
revoke all on function private.refund_offers(uuid, uuid) from public, anon, authenticated;
revoke all on function private.return_lots(uuid, uuid) from public, anon, authenticated;
revoke all on function private.apply_care(uuid, uuid, text) from public, anon, authenticated;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'list_my_companions', 'get_companion', 'list_open_nest', 'list_companions_of',
        'create_companion', 'adopt_companion', 'release_companion',
        'feed_companion', 'play_companion', 'groom_companion',
        'claim_morning_wick', 'claim_tide_bowl', 'donate_to_basket', 'take_from_basket',
        'restock_shops', 'buy_from_shop', 'expire_trades', 'create_trade', 'cancel_trade',
        'buy_trade', 'offer_trade', 'withdraw_offer', 'accept_offer',
        'start_game', 'submit_game', 'create_thread', 'create_circle_thread', 'create_post',
        'report_content', 'create_circle', 'join_circle', 'leave_circle', 'invite_to_circle',
        'respond_invite', 'steward_adjust_glims', 'steward_grant_item', 'steward_ban',
        'steward_hide_post', 'steward_lock_thread', 'steward_force_restock', 'steward_set_price',
        'steward_clear_basket', 'steward_resolve_report', 'steward_lookup', 'steward_flagged_games'
      )
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;

grant execute on function public.get_companion(uuid), public.list_open_nest(), public.list_companions_of(text),
  public.restock_shops(), public.expire_trades()
to anon, authenticated;

grant execute on function public.list_my_companions(), public.create_companion(uuid, uuid, text),
  public.adopt_companion(uuid), public.release_companion(uuid),
  public.feed_companion(uuid, uuid), public.play_companion(uuid, uuid), public.groom_companion(uuid, uuid),
  public.claim_morning_wick(), public.claim_tide_bowl(uuid), public.donate_to_basket(uuid, integer),
  public.take_from_basket(uuid), public.buy_from_shop(uuid, uuid, integer, integer),
  public.create_trade(jsonb, integer, text), public.cancel_trade(uuid), public.buy_trade(uuid),
  public.offer_trade(uuid, integer, jsonb), public.withdraw_offer(uuid), public.accept_offer(uuid),
  public.start_game(uuid), public.submit_game(uuid, uuid, integer),
  public.create_thread(uuid, text, text), public.create_circle_thread(uuid, text, text), public.create_post(uuid, text),
  public.report_content(text, uuid, text), public.create_circle(text, text, text, text, boolean),
  public.join_circle(uuid), public.leave_circle(uuid), public.invite_to_circle(uuid, text), public.respond_invite(uuid, boolean),
  public.steward_adjust_glims(text, integer, text), public.steward_grant_item(text, uuid, integer),
  public.steward_ban(text, boolean, text), public.steward_hide_post(uuid, boolean), public.steward_lock_thread(uuid, boolean),
  public.steward_force_restock(uuid), public.steward_set_price(uuid, uuid, integer), public.steward_clear_basket(uuid),
  public.steward_resolve_report(uuid, text), public.steward_lookup(text), public.steward_flagged_games()
to authenticated;

grant execute on function private.caller_is_admin() to anon, authenticated, service_role;

revoke insert on public.reports from authenticated;
drop policy if exists reports_insert on public.reports;
