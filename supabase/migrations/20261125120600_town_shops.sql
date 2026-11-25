-- New town shops and goods. Review and apply manually.


alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (category in ('food', 'treat', 'toy', 'groom', 'misc', 'weapon', 'shield', 'potion'));
alter table public.items add column if not exists gear_power integer not null default 0;
alter table public.shops add column if not exists keeper_species text;
alter table public.shops add column if not exists greeting text;

update public.shops set keeper_species = 'lumkin', greeting = 'The buns are warm and the pencil is sharp. What will you carry home?' where slug = 'lantern-pantry';
update public.shops set keeper_species = 'quillora', greeting = 'The kettle is singing. Sit a moment, then choose a cup.' where slug = 'teacup-porch';
update public.shops set keeper_species = 'pyrlit', greeting = 'The chili stall is hot. Mind your whiskers, and pick a bun.' where slug = 'emberoven';
update public.shops set keeper_species = 'velune', greeting = 'Shells, string, and a rattle that knows the tide. Look around.' where slug = 'shell-and-string';

insert into public.items (id, slug, name, category, rarity, description, hunger_delta, mood_delta, reusable, gear_power) values
  ('d0000000-0000-4000-8000-000000000031', 'oat-round', 'Oat Round', 'food', 'common', 'A floury round from the loaf-roof bakery.', 22, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000032', 'sugar-knot', 'Sugar Knot', 'treat', 'common', 'A twisted sweet with a shiny sugar crust.', 10, 8, false, 0),
  ('d0000000-0000-4000-8000-000000000033', 'button-bear', 'Button Bear', 'toy', 'uncommon', 'A stitched bear with button eyes.', 0, 16, true, 0),
  ('d0000000-0000-4000-8000-000000000034', 'marble-hoop', 'Marble Hoop', 'toy', 'common', 'A hoop that rolls true across the quay stones.', 0, 14, true, 0),
  ('d0000000-0000-4000-8000-000000000035', 'foam-brush', 'Foam Brush', 'groom', 'common', 'A cloud-soft brush from the bubble dome.', 0, 12, true, 0),
  ('d0000000-0000-4000-8000-000000000036', 'scent-mist', 'Scent Mist', 'groom', 'common', 'A light mist that smells like clean linen.', 0, 10, true, 0),
  ('d0000000-0000-4000-8000-000000000037', 'wick-charm', 'Wick Charm', 'toy', 'common', 'A tiny lantern charm that clicks when shaken.', 0, 8, true, 0),
  ('d0000000-0000-4000-8000-000000000038', 'skillet-fish', 'Skillet Fish', 'food', 'common', 'A harbor fish, crisp at the edges.', 26, 3, false, 0),
  ('d0000000-0000-4000-8000-000000000039', 'salt-fritters', 'Salt Fritters', 'food', 'common', 'Little salty fritters from the shell-roof stall.', 18, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000040', 'spore-tea', 'Spore Tea', 'food', 'common', 'A mushroom-cap tea, earthy and kind.', 10, 10, false, 0),
  ('d0000000-0000-4000-8000-000000000041', 'puff-salve', 'Puff Salve', 'groom', 'common', 'A dab of salve for dusty paws.', 0, 8, true, 0),
  ('d0000000-0000-4000-8000-000000000042', 'seed-cake', 'Seed Cake', 'food', 'common', 'A dense cake packed with toasted seeds.', 16, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000043', 'sprout-biscuit', 'Sprout Biscuit', 'food', 'common', 'A green-flecked biscuit from the stump shop.', 14, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000044', 'acorn-top', 'Acorn Top', 'toy', 'common', 'A spinning top carved from an acorn cap.', 0, 15, true, 0),
  ('d0000000-0000-4000-8000-000000000045', 'paper-boat', 'Paper Boat', 'toy', 'common', 'A folded boat for quiet windowsill play.', 0, 8, true, 0),
  ('d0000000-0000-4000-8000-000000000046', 'coal-bun', 'Coal Bun', 'food', 'common', 'A dark, toasty bun from the stone forge.', 20, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000047', 'iron-rattle', 'Iron Rattle', 'toy', 'uncommon', 'A small rattle with a warm iron bell.', 0, 12, true, 0),
  ('d0000000-0000-4000-8000-000000000048', 'clay-whistle', 'Clay Whistle', 'toy', 'common', 'A kiln whistle with one clear note.', 0, 14, true, 0),
  ('d0000000-0000-4000-8000-000000000049', 'kiln-mug', 'Kiln Mug', 'food', 'common', 'A clay mug of spiced cocoa.', 14, 6, false, 0),
  ('d0000000-0000-4000-8000-000000000050', 'glimmer-shard', 'Glimmer Shard', 'misc', 'rare', 'A pretty crystal shard. Not for eating.', 0, 0, false, 0),
  ('d0000000-0000-4000-8000-000000000051', 'cave-candy', 'Cave Candy', 'treat', 'uncommon', 'A hard candy that tastes faintly of minerals.', 8, 10, false, 0),
  ('d0000000-0000-4000-8000-000000000052', 'pearl-bead', 'Pearl Bead', 'toy', 'uncommon', 'A loose pearl bead on a short cord.', 0, 12, true, 0),
  ('d0000000-0000-4000-8000-000000000053', 'brine-sweet', 'Brine Sweet', 'treat', 'common', 'A salty-sweet drop from the open clam.', 6, 10, false, 0),
  ('d0000000-0000-4000-8000-000000000054', 'bell-charm', 'Bell Charm', 'toy', 'common', 'A lighthouse charm with a tiny bell.', 0, 10, true, 0),
  ('d0000000-0000-4000-8000-000000000055', 'lamp-biscuit', 'Lamp Biscuit', 'food', 'common', 'A biscuit stamped with a little lamp.', 16, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000056', 'bubble-syrup', 'Bubble Syrup', 'treat', 'uncommon', 'A spoon of syrup that pops on the tongue.', 8, 12, false, 0),
  ('d0000000-0000-4000-8000-000000000057', 'tide-phial', 'Tide Phial', 'groom', 'common', 'A glass dab of cool tidewater scent.', 0, 8, true, 0),
  ('d0000000-0000-4000-8000-000000000058', 'plank-pretzel', 'Plank Pretzel', 'food', 'common', 'A knot of bread from the driftwood shack.', 18, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000059', 'smoke-crisp', 'Smoke Crisp', 'food', 'common', 'A crisp smoked over driftwood.', 16, 2, false, 0),
  ('d0000000-0000-4000-8000-000000000060', 'cinder-fang', 'Cinder Fang', 'weapon', 'uncommon', 'A short fang-shaped blade for the Ember Ring.', 0, 0, true, 4),
  ('d0000000-0000-4000-8000-000000000061', 'cliff-spear', 'Cliff Spear', 'weapon', 'rare', 'A light spear with a warm metal tip.', 0, 0, true, 6),
  ('d0000000-0000-4000-8000-000000000062', 'kiln-shield', 'Kiln Shield', 'shield', 'uncommon', 'A round shield fired in the dome kiln.', 0, 0, true, 4),
  ('d0000000-0000-4000-8000-000000000063', 'pocket-buckler', 'Pocket Buckler', 'shield', 'common', 'A small buckler that straps to a foreleg.', 0, 0, true, 2),
  ('d0000000-0000-4000-8000-000000000064', 'ember-tonic', 'Ember Tonic', 'potion', 'common', 'A sip that steadies a fighter mid-match.', 0, 0, false, 16),
  ('d0000000-0000-4000-8000-000000000065', 'coal-sip', 'Coal Sip', 'potion', 'common', 'A small bitter sip. It helps, a little.', 0, 0, false, 8),
  ('d0000000-0000-4000-8000-000000000066', 'oil-drop', 'Oil Drop', 'treat', 'common', 'A golden drop that tastes like a warm lamp.', 4, 6, false, 0)
on conflict (slug) do nothing;

insert into public.shops (id, land_id, slug, name, keeper_name, blurb, restock_min_minutes, restock_max_minutes, next_restock_at, keeper_species, greeting) values
  ('e0000000-0000-4000-8000-000000000005', (select id from public.lands where slug = 'harborlight'), 'hearth-loaf', 'The Hearth Loaf', 'Oat Miller', 'Fresh rounds and sugar knots under the bread-loaf roof.', 8, 16, now() + interval '12 minutes', 'nimblet', 'The ovens never really sleep. Take a round while it is soft.'),
  ('e0000000-0000-4000-8000-000000000006', (select id from public.lands where slug = 'harborlight'), 'bow-attic', 'The Bow Attic', 'Puff Ribbon', 'Stitched toys from the gift-box shop.', 8, 16, now() + interval '12 minutes', 'mallowgull', 'Every toy has a bow on it. Please do not eat the bows.'),
  ('e0000000-0000-4000-8000-000000000007', (select id from public.lands where slug = 'harborlight'), 'bubble-dome', 'The Bubble Dome', 'Mist Pell', 'Brushes and mists under the bubble dome.', 8, 16, now() + interval '12 minutes', 'silkmoth', 'Hold still. The foam brush is gentler than it looks.'),
  ('e0000000-0000-4000-8000-000000000008', (select id from public.lands where slug = 'harborlight'), 'wick-canvas', 'Wick & Canvas', 'Cog Bright', 'Little lantern charms from the striped tent.', 8, 16, now() + interval '12 minutes', 'cogwhisk', 'Charms, wicks, and a click you can hear.'),
  ('e0000000-0000-4000-8000-000000000009', (select id from public.lands where slug = 'harborlight'), 'pink-catch', 'The Pink Catch', 'Salt Gimble', 'Harbor fish and fritters under the shell roof.', 8, 16, now() + interval '12 minutes', 'mallowgull', 'The catch came in with the ferry. It will not wait.'),
  ('e0000000-0000-4000-8000-000000000010', (select id from public.lands where slug = 'mossglen'), 'cap-and-spore', 'Cap & Spore', 'Fern Thorn', 'Teas and salves from the mushroom hut.', 8, 16, now() + interval '12 minutes', 'thornu', 'The remedy hut smells like rain on bark.'),
  ('e0000000-0000-4000-8000-000000000011', (select id from public.lands where slug = 'mossglen'), 'stump-shelf', 'The Stump Shelf', 'Crag Moss', 'Seed cakes from the tree-stump shop.', 8, 16, now() + interval '12 minutes', 'mosscrag', 'Seeds, cakes, and patience. I have plenty of the last.'),
  ('e0000000-0000-4000-8000-000000000012', (select id from public.lands where slug = 'mossglen'), 'acorn-rattle', 'Acorn Rattle', 'Jam Button', 'Acorn toys beside the creek.', 8, 16, now() + interval '12 minutes', 'berrybop', 'Spin the top. If it falls, spin it again.'),
  ('e0000000-0000-4000-8000-000000000013', (select id from public.lands where slug = 'mossglen'), 'leaf-nook', 'The Leaf Nook', 'Buzz Page', 'A leaf-roof nook for small paper things.', 8, 16, now() + interval '12 minutes', 'bramblebuzz', 'Quiet books, folded boats, and no shouting.'),
  ('e0000000-0000-4000-8000-000000000014', (select id from public.lands where slug = 'cinderreach'), 'anvil-rest', 'Anvil Rest', 'Soot Pyr', 'Forge snacks and a warm iron rattle.', 8, 16, now() + interval '12 minutes', 'pyrlit', 'The forge is loud. The buns are not.'),
  ('e0000000-0000-4000-8000-000000000015', (select id from public.lands where slug = 'cinderreach'), 'clay-dome', 'The Clay Dome', 'Kiln Dora', 'Whistles and mugs from the pottery dome.', 8, 16, now() + interval '12 minutes', 'dunesprout', 'Everything here was warm an hour ago.'),
  ('e0000000-0000-4000-8000-000000000016', (select id from public.lands where slug = 'cinderreach'), 'ruby-vein', 'Ruby Vein', 'Gem Storm', 'Shards and candy from the gem cave.', 8, 16, now() + interval '12 minutes', 'stormuff', 'The crystals hum if you listen. Please do not lick them.'),
  ('e0000000-0000-4000-8000-000000000017', (select id from public.lands where slug = 'cinderreach'), 'shield-step', 'The Shield Step', 'Warden Pinch', 'Weapons, shields, and sips for the ring.', 8, 16, now() + interval '12 minutes', 'rubyclaw', 'Gear for the Ember Ring. Bring a steady paw.'),
  ('e0000000-0000-4000-8000-000000000018', (select id from public.lands where slug = 'silvershoal'), 'open-clam', 'The Open Clam', 'Pearl Glint', 'Pearl beads from the giant clam.', 8, 16, now() + interval '12 minutes', 'glacibun', 'Pearls, sweets, and a cool breeze off the pools.'),
  ('e0000000-0000-4000-8000-000000000019', (select id from public.lands where slug = 'silvershoal'), 'bell-lamp', 'Bell Lamp', 'Keeper North', 'Lighthouse gifts and little biscuits.', 8, 16, now() + interval '12 minutes', 'tidewing', 'The lamp is lit. The charms are cheaper than a ferry.'),
  ('e0000000-0000-4000-8000-000000000020', (select id from public.lands where slug = 'silvershoal'), 'tide-phials', 'Tide Phials', 'Bubble Ivo', 'Phials and syrup under the glass dome.', 8, 16, now() + interval '12 minutes', 'puddlehop', 'The glass is cool. The syrup pops.'),
  ('e0000000-0000-4000-8000-000000000021', (select id from public.lands where slug = 'silvershoal'), 'drift-shack', 'The Drift Shack', 'Plank Sook', 'Snacks from the driftwood shack.', 8, 16, now() + interval '12 minutes', 'puddlehop', 'Driftwood smoke and a pretzel that travels well.')
on conflict (slug) do nothing;

insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000031', 8, 36, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000032', 6, 48, 6, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000033', 2, 110, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000034', 3, 95, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000035', 3, 90, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000036', 4, 70, 4, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000037', 4, 60, 4, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000066', 6, 40, 6, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000038', 6, 42, 6, 3) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000039', 8, 30, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000040', 6, 34, 6, 3) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000041', 3, 55, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000042', 8, 28, 8, 3) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000043', 8, 24, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000044', 3, 100, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000011', 4, 60, 4, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000045', 4, 45, 4, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000030', 2, 80, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000046', 8, 32, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000047', 2, 85, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000048', 3, 75, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000049', 6, 36, 6, 3) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000050', 1, 140, 1, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000051', 4, 52, 4, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000060', 2, 180, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000061', 1, 260, 1, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000062', 2, 160, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000063', 3, 90, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000064', 6, 50, 6, 3) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000065', 8, 28, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000052', 2, 120, 2, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000053', 5, 44, 5, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000054', 3, 70, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000055', 8, 28, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000056', 4, 48, 4, 2) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000057', 3, 60, 3, 1) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000058', 8, 26, 8, 4) on conflict do nothing;
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000059', 8, 24, 8, 4) on conflict do nothing;
