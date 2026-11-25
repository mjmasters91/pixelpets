-- Catalog seed only. No accounts, no passwords.

insert into public.lands (id, slug, name, tagline, blurb, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'harborlight', 'Harborlight', 'The lantern capital', 'Painted quays, ferry bells, and the first light of the day. Hatchery, arcade, and the Morning Wick all sit on this waterfront.', 0),
  ('a0000000-0000-4000-8000-000000000002', 'mossglen', 'Mossglen', 'Tea steam and shade', 'A mossy woodland of porches and paper rustle. Bracken keeps the kettle on, and the paths are padded soft.', 1),
  ('a0000000-0000-4000-8000-000000000003', 'cinderreach', 'Cinderreach', 'Cliffs and warm ovens', 'Terracotta cliffs, dusk festivals, and ovens that never quite cool. Bring an appetite and a spare napkin.', 2),
  ('a0000000-0000-4000-8000-000000000004', 'silvershoal', 'Silvershoal', 'Tide pools and wind-bells', 'Low islands, shell rattles, and pools that remember every pebble. The Tide Bowl is filled here each morning.', 3);

insert into public.tints (id, slug, name, hue, sat_mul, light_add, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'natural', 'Natural', 0, 1, 0, 0),
  ('c0000000-0000-4000-8000-000000000002', 'meadow', 'Meadow', 108, 1, 0, 1),
  ('c0000000-0000-4000-8000-000000000003', 'tide', 'Tide', 176, 1.05, 0.02, 2),
  ('c0000000-0000-4000-8000-000000000004', 'ember', 'Ember', 16, 1.12, 0, 3),
  ('c0000000-0000-4000-8000-000000000005', 'ink', 'Ink', 328, 0.72, -0.14, 4),
  ('c0000000-0000-4000-8000-000000000006', 'pearl', 'Pearl', 42, 0.28, 0.16, 5),
  ('c0000000-0000-4000-8000-000000000007', 'honey', 'Honey', 46, 1.08, 0.04, 6),
  ('c0000000-0000-4000-8000-000000000008', 'dusk', 'Dusk', 282, 0.95, -0.02, 7),
  ('c0000000-0000-4000-8000-000000000009', 'frost', 'Frost', 208, 0.48, 0.08, 8);

insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000001', 'lumkin', 'Lumkin', 'A pear-shaped quay companion with lantern antlers and a warm glow in the belly. Curious, gentle, and usually first to the ferry.', id, 'art/species/lumkin.png', 92, 1 from public.lands where slug = 'harborlight';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000002', 'quillora', 'Quillora', 'A long-necked companion in violet, with a gold mane and ink-swirl markings. Quiet, a little proud, fond of shade.', id, 'art/species/quillora.png', 270, 2 from public.lands where slug = 'mossglen';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000003', 'puddlehop', 'Puddlehop', 'A round tide companion in aqua, with a pink ruff and white dew spots. Cheerful, splashy, and hard to fluster.', id, 'art/species/puddlehop.png', 196, 3 from public.lands where slug = 'silvershoal';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000004', 'pyrlit', 'Pyrlit', 'A fiery cliff companion with ember ears, a plated back, and a flame at the tail. Warm-natured, and fond of ovens.', id, 'art/species/pyrlit.png', 16, 4 from public.lands where slug = 'cinderreach';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000005', 'nimblet', 'Nimblet', 'A lemon-bright runner with scoop ears and a red ribbon tail. Quick, playful, and always about to dash.', id, 'art/species/nimblet.png', 50, 5 from public.lands where slug = 'harborlight';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000006', 'mallowgull', 'Mallowgull', 'A bubblegum-pink puff with a cream cap, tiny wings, and blue feet. Affectionate, and a little vain about the fluff.', id, 'art/species/mallowgull.png', 332, 6 from public.lands where slug = 'harborlight';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000007', 'thornu', 'Thornu', 'A shy, low companion in chocolate brown, tiled with magenta petals and a blossom at the tail.', id, 'art/species/thornu.png', 22, 7 from public.lands where slug = 'mossglen';
insert into public.species (id, slug, name, blurb, home_land_id, art_base_path, base_hue, sort_order) select 'b0000000-0000-4000-8000-000000000008', 'velune', 'Velune', 'A slim night companion in indigo, dusted with stars and finished with a crescent tail. Calm at low tide.', id, 'art/species/velune.png', 242, 8 from public.lands where slug = 'silvershoal';

insert into public.items (id, slug, name, category, rarity, description, hunger_delta, mood_delta, reusable) values
  ('d0000000-0000-4000-8000-000000000001', 'tide-broth', 'Tide Broth', 'food', 'common', 'A modest kettle from the Tide Bowl. Not sold in shops.', 28, 4, false),
  ('d0000000-0000-4000-8000-000000000002', 'harbor-bun', 'Harbor Bun', 'food', 'common', 'A soft quay bun with a shiny top.', 26, 2, false),
  ('d0000000-0000-4000-8000-000000000003', 'milk-drop', 'Milk Drop', 'food', 'common', 'A little sealed cup of warm milk.', 16, 2, false),
  ('d0000000-0000-4000-8000-000000000004', 'quay-cracker', 'Quay Cracker', 'food', 'common', 'A crisp cracker that travels well in a pocket.', 18, 0, false),
  ('d0000000-0000-4000-8000-000000000005', 'berry-pocket', 'Berry Pocket', 'treat', 'uncommon', 'A folded pastry leaking berry jam.', 12, 10, false),
  ('d0000000-0000-4000-8000-000000000006', 'glim-cookie', 'Glim Cookie', 'treat', 'uncommon', 'A gold-iced cookie that makes companions beam.', 8, 14, false),
  ('d0000000-0000-4000-8000-000000000007', 'lantern-crust', 'Lantern Crust', 'food', 'common', 'A hearty hand pie from the night bakers.', 30, 2, false),
  ('d0000000-0000-4000-8000-000000000008', 'honey-roll', 'Honey Roll', 'food', 'common', 'A spiral roll glazed with quay honey.', 24, 4, false),
  ('d0000000-0000-4000-8000-000000000009', 'moss-tea', 'Moss Tea', 'food', 'common', 'A green cup of woodland tea, still steaming.', 12, 8, false),
  ('d0000000-0000-4000-8000-000000000010', 'fern-cake', 'Fern Cake', 'food', 'common', 'A slice of pale cake pressed with a fern.', 22, 3, false),
  ('d0000000-0000-4000-8000-000000000011', 'acorn-tart', 'Acorn Tart', 'treat', 'uncommon', 'A nutty tart from the moss kitchens.', 14, 12, false),
  ('d0000000-0000-4000-8000-000000000012', 'clover-sandwich', 'Clover Sandwich', 'food', 'common', 'Soft bread, herbs, and a clover on top.', 20, 2, false),
  ('d0000000-0000-4000-8000-000000000013', 'ribbon-ball', 'Ribbon Ball', 'toy', 'uncommon', 'A stitched ball with a long ribbon tail.', 0, 18, true),
  ('d0000000-0000-4000-8000-000000000014', 'leaf-kite', 'Leaf Kite', 'toy', 'uncommon', 'A tiny kite that tugs cheerfully on its string.', 0, 16, true),
  ('d0000000-0000-4000-8000-000000000015', 'night-mint', 'Night Mint', 'treat', 'uncommon', 'A cool sweet wrapped in a dark leaf.', 6, 12, false),
  ('d0000000-0000-4000-8000-000000000016', 'blossom-brush', 'Blossom Brush', 'groom', 'uncommon', 'A soft brush with a blossom on the handle.', 0, 13, true),
  ('d0000000-0000-4000-8000-000000000017', 'spice-bun', 'Spice Bun', 'food', 'common', 'A warm bun dusted with cliff spice.', 28, 3, false),
  ('d0000000-0000-4000-8000-000000000018', 'ember-tart', 'Ember Tart', 'treat', 'uncommon', 'A jam tart with a toasted, glowing edge.', 12, 14, false),
  ('d0000000-0000-4000-8000-000000000019', 'sunstone-biscuit', 'Sunstone Biscuit', 'food', 'common', 'A round biscuit baked on a warm stone.', 24, 2, false),
  ('d0000000-0000-4000-8000-000000000020', 'cocoa-cup', 'Cocoa Cup', 'food', 'common', 'A small cup of cinnamon cocoa.', 14, 10, false),
  ('d0000000-0000-4000-8000-000000000021', 'warm-puff', 'Warm Puff', 'groom', 'uncommon', 'A heated powder puff for dusty coats.', 0, 14, true),
  ('d0000000-0000-4000-8000-000000000022', 'kiln-bell', 'Kiln Bell', 'toy', 'uncommon', 'A clay bell that rings a low, cozy note.', 0, 16, true),
  ('d0000000-0000-4000-8000-000000000023', 'tide-crisp', 'Tide Crisp', 'food', 'common', 'A salty crisp dried above the shoals.', 18, 2, false),
  ('d0000000-0000-4000-8000-000000000024', 'kelp-wrap', 'Kelp Wrap', 'food', 'common', 'Rice and greens folded in a ribbon of kelp.', 22, 3, false),
  ('d0000000-0000-4000-8000-000000000025', 'pearl-candy', 'Pearl Candy', 'treat', 'uncommon', 'A smooth candy with a pearly shine.', 8, 12, false),
  ('d0000000-0000-4000-8000-000000000026', 'shell-rattle', 'Shell Rattle', 'toy', 'uncommon', 'Two shells on a string. A classic shoal toy.', 0, 18, true),
  ('d0000000-0000-4000-8000-000000000027', 'tide-comb', 'Tide Comb', 'groom', 'common', 'A wide comb carved from pale shell.', 0, 14, true),
  ('d0000000-0000-4000-8000-000000000028', 'foam-bun', 'Foam Bun', 'food', 'common', 'A light bun that tastes a little of sea air.', 20, 4, false),
  ('d0000000-0000-4000-8000-000000000029', 'pebble-marble', 'Pebble Marble', 'toy', 'common', 'A polished pebble that rolls true.', 0, 15, true),
  ('d0000000-0000-4000-8000-000000000030', 'paper-star', 'Paper Star', 'misc', 'rare', 'A folded star. Nice to pass along, not to eat.', 0, 0, false);

insert into public.shops (id, land_id, slug, name, keeper_name, blurb, restock_min_minutes, restock_max_minutes, next_restock_at) values
  ('e0000000-0000-4000-8000-000000000001', (select id from public.lands where slug = 'harborlight'), 'lantern-pantry', 'The Lantern Pantry', 'Nim Salla', 'Everyday buns, crackers, and the odd shiny cookie. Nim writes the prices in pencil.', 8, 16, now() + interval '12 minutes'),
  ('e0000000-0000-4000-8000-000000000002', (select id from public.lands where slug = 'mossglen'), 'teacup-porch', 'The Teacup Porch', 'Bracken Moss', 'Forest snacks, teas, and a couple of toys hung from the eaves.', 8, 16, now() + interval '12 minutes'),
  ('e0000000-0000-4000-8000-000000000003', (select id from public.lands where slug = 'cinderreach'), 'emberoven', 'Emberoven', 'Soola Vint', 'Spice buns, cocoa, and a grooming puff warmed on the kiln shelf.', 8, 16, now() + interval '12 minutes'),
  ('e0000000-0000-4000-8000-000000000004', (select id from public.lands where slug = 'silvershoal'), 'shell-and-string', 'Shell & String', 'Ivo Pell', 'Tide snacks, shell rattles, and combs strung above the counter.', 8, 16, now() + interval '12 minutes');

insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 10, 40, 10, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 10, 22, 10, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 8, 28, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', 6, 48, 6, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 6, 44, 6, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 5, 55, 5, 2);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 2, 72, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000009', 8, 32, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000010', 6, 42, 6, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000012', 6, 38, 6, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000011', 4, 60, 4, 2);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000015', 2, 54, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000013', 2, 120, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000014', 2, 145, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000016', 2, 115, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000017', 8, 46, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000019', 8, 40, 8, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000020', 8, 36, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000018', 4, 68, 4, 2);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000021', 2, 110, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000022', 2, 135, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000023', 8, 30, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000024', 6, 40, 6, 3);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000028', 8, 34, 8, 4);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000025', 4, 58, 4, 2);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000026', 2, 125, 2, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000027', 3, 100, 3, 1);
insert into public.shop_stock (shop_id, item_id, qty, price, restock_target, restock_batch) values ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000029', 3, 90, 3, 1);

insert into public.minigames (id, slug, name, blurb, score_cap, max_submits_per_day, points_per_glim, glim_cap_per_play, min_duration_ms, sort_order) values
  ('f0000000-0000-4000-8000-000000000001', 'lantern-catch', 'Lantern Catch', 'Catch drifting lanterns. Same-color streaks shine brighter. Clouds snuff a streak.', 25000, 3, 20, 1000, 10000, 0),
  ('f0000000-0000-4000-8000-000000000002', 'shoal-pairs', 'Shoal Pairs', 'Flip a tide-pool board and remember what hides under each shell.', 12000, 3, 20, 1000, 8000, 1),
  ('f0000000-0000-4000-8000-000000000003', 'parcel-sort', 'Parcel Sort', 'Sixty seconds of parcels, three stalls, and a combo that hates mistakes.', 18000, 3, 20, 1000, 20000, 2),
  ('f0000000-0000-4000-8000-000000000004', 'quay-dash', 'Quay Dash', 'A short boardwalk run. Collect sparks, hop crates, and try not to stumble.', 20000, 3, 20, 1000, 20000, 3);

insert into public.forum_boards (id, slug, title, blurb, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'town-talk', 'Town Talk', 'Ferry news, weather, and whatever the quay is chatting about.', 0),
  ('10000000-0000-4000-8000-000000000002', 'companions', 'Companions', 'Names, care, and showing off a lineup.', 1),
  ('10000000-0000-4000-8000-000000000003', 'greenboard-chatter', 'Greenboard Chatter', 'Wants, spare toys, and polite haggling. Trades themselves happen on the Greenboard.', 2),
  ('10000000-0000-4000-8000-000000000004', 'arcade', 'Arcade', 'High scores, near misses, and which game is the bright board today.', 3),
  ('10000000-0000-4000-8000-000000000005', 'circle-notices', 'Circle Notices', 'Public notes from Circles. Private circle boards stay with their members.', 4);

