export type Category = "food" | "treat" | "toy" | "groom" | "misc" | "weapon" | "shield" | "potion";
export type Rarity = "common" | "uncommon" | "rare";

export type Species = {
  id: string;
  slug: string;
  name: string;
  home: string;
  baseHue: number;
  blurb: string;
  /** Steward species. Hidden from public lists, and never released or traded. */
  exclusive?: boolean;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
};

export type Tint = {
  id: string;
  slug: string;
  name: string;
  hue: number;
  satMul: number;
  lightAdd: number;
  swatch: string;
  note: string;
};

export type Item = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  rarity: Rarity;
  description: string;
  hunger: number;
  mood: number;
  reusable: boolean;
  gearPower?: number;
};

export type StockLine = {
  itemSlug: string;
  price: number;
  target: number;
  batch: number;
};

export type ShopDef = {
  id: string;
  slug: string;
  name: string;
  keeper: string;
  land: string;
  blurb: string;
  restockMin: number;
  restockMax: number;
  stock: StockLine[];
  keeperSpecies?: string;
  greeting?: string;
};

export type Land = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
};

export type GameDef = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  how: string;
  scoreCap: number;
  minMs: number;
  sort: number;
};

export type BoardDef = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  sort: number;
};

export const LANDS: Land[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    slug: "harborlight",
    name: "Harborlight",
    tagline: "The lantern capital",
    blurb:
      "Painted quays, ferry bells, and the first light of the day. Hatchery, arcade, and the Morning Wick all sit on this waterfront.",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    slug: "mossglen",
    name: "Mossglen",
    tagline: "Tea steam and shade",
    blurb:
      "A mossy woodland of porches and paper rustle. Bracken keeps the kettle on, and the paths are padded soft.",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    slug: "cinderreach",
    name: "Cinderreach",
    tagline: "Cliffs and warm ovens",
    blurb:
      "Terracotta cliffs, dusk festivals, and ovens that never quite cool. Bring an appetite and a spare napkin.",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    slug: "silvershoal",
    name: "Silvershoal",
    tagline: "Tide pools and wind-bells",
    blurb:
      "Low islands, shell rattles, and pools that remember every pebble. The Tide Bowl is filled here each morning.",
  },
];

export const SPECIES: Species[] = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    slug: "lumkin",
    name: "Lumkin",
    home: "harborlight",
    baseHue: 92,
    baseHp: 34,
    baseAtk: 9,
    baseDef: 8,
    baseSpd: 8,
    blurb:
      "A pear-shaped quay companion with lantern antlers and a warm glow in the belly. Curious, gentle, and usually first to the ferry.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    slug: "quillora",
    name: "Quillora",
    home: "mossglen",
    baseHue: 270,
    baseHp: 30,
    baseAtk: 11,
    baseDef: 7,
    baseSpd: 12,
    blurb:
      "A long-necked companion in violet, with a gold mane and ink-swirl markings. Quiet, a little proud, fond of shade.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    slug: "puddlehop",
    name: "Puddlehop",
    home: "silvershoal",
    baseHue: 196,
    baseHp: 36,
    baseAtk: 8,
    baseDef: 10,
    baseSpd: 7,
    blurb:
      "A round tide companion in aqua, with a pink ruff and white dew spots. Cheerful, splashy, and hard to fluster.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    slug: "pyrlit",
    name: "Pyrlit",
    home: "cinderreach",
    baseHue: 16,
    baseHp: 32,
    baseAtk: 13,
    baseDef: 8,
    baseSpd: 11,
    blurb:
      "A fiery cliff companion with ember ears, a plated back, and a flame at the tail. Warm-natured, and fond of ovens.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    slug: "nimblet",
    name: "Nimblet",
    home: "harborlight",
    baseHue: 50,
    baseHp: 28,
    baseAtk: 10,
    baseDef: 6,
    baseSpd: 16,
    blurb:
      "A lemon-bright runner with scoop ears and a red ribbon tail. Quick, playful, and always about to dash.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000006",
    slug: "mallowgull",
    name: "Mallowgull",
    home: "harborlight",
    baseHue: 332,
    baseHp: 33,
    baseAtk: 8,
    baseDef: 9,
    baseSpd: 9,
    blurb:
      "A bubblegum-pink puff with a cream cap, tiny wings, and blue feet. Affectionate, and a little vain about the fluff.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000007",
    slug: "thornu",
    name: "Thornu",
    home: "mossglen",
    baseHue: 22,
    baseHp: 38,
    baseAtk: 7,
    baseDef: 13,
    baseSpd: 6,
    blurb:
      "A shy, low companion in chocolate brown, tiled with magenta petals and a blossom at the tail.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000008",
    slug: "velune",
    name: "Velune",
    home: "silvershoal",
    baseHue: 242,
    baseHp: 29,
    baseAtk: 12,
    baseDef: 7,
    baseSpd: 14,
    blurb:
      "A slim night companion in indigo, dusted with stars and finished with a crescent tail. Calm at low tide.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000009",
    slug: "glacibun",
    name: "Glacibun",
    home: "silvershoal",
    baseHue: 200,
    baseHp: 35,
    baseAtk: 9,
    baseDef: 11,
    baseSpd: 8,
    blurb:
      "A round icy-blue companion with cloud-soft fur, long ears, and a crystal horn. It likes wind-bells and the cold edge of the shoals.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000010",
    slug: "mosscrag",
    name: "Mosscrag",
    home: "mossglen",
    baseHue: 78,
    baseHp: 42,
    baseAtk: 8,
    baseDef: 14,
    baseSpd: 5,
    blurb:
      "A stack of grey stones that learned to smile, with moss in the cracks and tiny flowers on top. Patient, and happiest in the shade.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000011",
    slug: "tidewing",
    name: "Tidewing",
    home: "silvershoal",
    baseHue: 178,
    baseHp: 30,
    baseAtk: 11,
    baseDef: 7,
    baseSpd: 15,
    blurb:
      "A teal flyer with wide gentle wings and a curl of a tail. It skims the pools and rarely hurries.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000012",
    slug: "cogwhisk",
    name: "Cogwhisk",
    home: "harborlight",
    baseHue: 28,
    baseHp: 31,
    baseAtk: 12,
    baseDef: 9,
    baseSpd: 10,
    blurb:
      "A copper clockwork companion with bright eyes, curled whiskers, and a gear at the tail. Precise, curious, and proud of its tick.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000013",
    slug: "bramblebuzz",
    name: "Bramblebuzz",
    home: "mossglen",
    baseHue: 42,
    baseHp: 29,
    baseAtk: 11,
    baseDef: 7,
    baseSpd: 13,
    blurb:
      "A black-and-honey bee-bear with a comb belly and small glass wings. Busy, sweet-tempered, and full of pollen gossip.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000014",
    slug: "dunesprout",
    name: "Dunesprout",
    home: "cinderreach",
    baseHue: 32,
    baseHp: 33,
    baseAtk: 9,
    baseDef: 10,
    baseSpd: 8,
    blurb:
      "A sandy companion with a striped tail and a crown of warm flowers. Sun-sleepy, and fond of cliff gardens.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000015",
    slug: "silkmoth",
    name: "Silkmoth",
    home: "harborlight",
    baseHue: 222,
    baseHp: 28,
    baseAtk: 10,
    baseDef: 6,
    baseSpd: 14,
    blurb:
      "A white fluff of a moth with navy wings patterned in moons. Soft-voiced, and awake when the quay lamps come on.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000016",
    slug: "berrybop",
    name: "Berrybop",
    home: "mossglen",
    baseHue: 352,
    baseHp: 32,
    baseAtk: 10,
    baseDef: 8,
    baseSpd: 9,
    blurb:
      "A raspberry-round companion with a leafy cap and a jam-bright smile. Eager, and easy to please.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000017",
    slug: "stormuff",
    name: "Stormuff",
    home: "cinderreach",
    baseHue: 208,
    baseHp: 36,
    baseAtk: 13,
    baseDef: 9,
    baseSpd: 10,
    blurb:
      "A dark cloud companion stitched with blue lightning. It rumbles, but the thunder is mostly for show.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000018",
    slug: "rubyclaw",
    name: "Rubyclaw",
    home: "cinderreach",
    baseHue: 355,
    baseHp: 37,
    baseAtk: 12,
    baseDef: 12,
    baseSpd: 7,
    blurb:
      "A red crab with ruby claws and a small shell crown. Proud of its pinch, and gentler than it looks.",
  },
  {
    id: "b0000000-0000-4000-8000-000000000019",
    slug: "crownwyrm",
    name: "Crownwyrm",
    home: "cinderreach",
    baseHue: 8,
    exclusive: true,
    baseHp: 46,
    baseAtk: 16,
    baseDef: 13,
    baseSpd: 11,
    blurb:
      "A black royal dragon veined with molten red, fiery wings spread, and a small gold crown. It keeps the cliff ovens and does not leave its keeper.",
  },
];

export const TINTS: Tint[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    slug: "natural",
    name: "Natural",
    hue: 0,
    satMul: 1,
    lightAdd: 0,
    swatch: "conic-gradient(from 20deg, #7dae55, #f2c84b, #5ec8ef, #f48fb8, #7d5bd6, #7dae55)",
    note: "This species’ own colors.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    slug: "meadow",
    name: "Meadow",
    hue: 108,
    satMul: 1,
    lightAdd: 0,
    swatch: "#7dae55",
    note: "Shifts the coat toward leaf green.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    slug: "tide",
    name: "Tide",
    hue: 176,
    satMul: 1.05,
    lightAdd: 0.02,
    swatch: "#2eb6c7",
    note: "Shifts the coat toward sea teal.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    slug: "ember",
    name: "Ember",
    hue: 16,
    satMul: 1.12,
    lightAdd: 0,
    swatch: "#f07830",
    note: "Shifts the coat toward coral-orange.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    slug: "ink",
    name: "Ink",
    hue: 328,
    satMul: 0.72,
    lightAdd: -0.14,
    swatch: "#6d3b58",
    note: "A deeper plum, with the lights turned down.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    slug: "pearl",
    name: "Pearl",
    hue: 42,
    satMul: 0.28,
    lightAdd: 0.16,
    swatch: "#f4efe6",
    note: "A warm, pale coat. Cream, not steel.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000007",
    slug: "honey",
    name: "Honey",
    hue: 46,
    satMul: 1.08,
    lightAdd: 0.04,
    swatch: "#e6b143",
    note: "Shifts the coat toward golden buff.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000008",
    slug: "dusk",
    name: "Dusk",
    hue: 282,
    satMul: 0.95,
    lightAdd: -0.02,
    swatch: "#8a64c4",
    note: "Shifts the coat toward evening violet.",
  },
  {
    id: "c0000000-0000-4000-8000-000000000009",
    slug: "frost",
    name: "Frost",
    hue: 208,
    satMul: 0.48,
    lightAdd: 0.08,
    swatch: "#b7cfe2",
    note: "A cool silver-blue, soft rather than icy.",
  },
];

const item = (
  n: number,
  slug: string,
  name: string,
  category: Category,
  rarity: Rarity,
  hunger: number,
  mood: number,
  reusable: boolean,
  description: string,
  gearPower = 0,
): Item => ({
  id: `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  slug,
  name,
  category,
  rarity,
  hunger,
  mood,
  reusable,
  description,
  gearPower,
});

export const ITEMS: Item[] = [
  item(1, "tide-broth", "Tide Broth", "food", "common", 28, 4, false, "A modest kettle from the Tide Bowl. Not sold in shops."),
  item(2, "harbor-bun", "Harbor Bun", "food", "common", 26, 2, false, "A soft quay bun with a shiny top."),
  item(3, "milk-drop", "Milk Drop", "food", "common", 16, 2, false, "A little sealed cup of warm milk."),
  item(4, "quay-cracker", "Quay Cracker", "food", "common", 18, 0, false, "A crisp cracker that travels well in a pocket."),
  item(5, "berry-pocket", "Berry Pocket", "treat", "uncommon", 12, 10, false, "A folded pastry leaking berry jam."),
  item(6, "glim-cookie", "Glim Cookie", "treat", "uncommon", 8, 14, false, "A gold-iced cookie that makes companions beam."),
  item(7, "lantern-crust", "Lantern Crust", "food", "common", 30, 2, false, "A hearty hand pie from the night bakers."),
  item(8, "honey-roll", "Honey Roll", "food", "common", 24, 4, false, "A spiral roll glazed with quay honey."),
  item(9, "moss-tea", "Moss Tea", "food", "common", 12, 8, false, "A green cup of woodland tea, still steaming."),
  item(10, "fern-cake", "Fern Cake", "food", "common", 22, 3, false, "A slice of pale cake pressed with a fern."),
  item(11, "acorn-tart", "Acorn Tart", "treat", "uncommon", 14, 12, false, "A nutty tart from the moss kitchens."),
  item(12, "clover-sandwich", "Clover Sandwich", "food", "common", 20, 2, false, "Soft bread, herbs, and a clover on top."),
  item(13, "ribbon-ball", "Ribbon Ball", "toy", "uncommon", 0, 18, true, "A stitched ball with a long ribbon tail."),
  item(14, "leaf-kite", "Leaf Kite", "toy", "uncommon", 0, 16, true, "A tiny kite that tugs cheerfully on its string."),
  item(15, "night-mint", "Night Mint", "treat", "uncommon", 6, 12, false, "A cool sweet wrapped in a dark leaf."),
  item(16, "blossom-brush", "Blossom Brush", "groom", "uncommon", 0, 13, true, "A soft brush with a blossom on the handle."),
  item(17, "spice-bun", "Spice Bun", "food", "common", 28, 3, false, "A warm bun dusted with cliff spice."),
  item(18, "ember-tart", "Ember Tart", "treat", "uncommon", 12, 14, false, "A jam tart with a toasted, glowing edge."),
  item(19, "sunstone-biscuit", "Sunstone Biscuit", "food", "common", 24, 2, false, "A round biscuit baked on a warm stone."),
  item(20, "cocoa-cup", "Cocoa Cup", "food", "common", 14, 10, false, "A small cup of cinnamon cocoa."),
  item(21, "warm-puff", "Warm Puff", "groom", "uncommon", 0, 14, true, "A heated powder puff for dusty coats."),
  item(22, "kiln-bell", "Kiln Bell", "toy", "uncommon", 0, 16, true, "A clay bell that rings a low, cozy note."),
  item(23, "tide-crisp", "Tide Crisp", "food", "common", 18, 2, false, "A salty crisp dried above the shoals."),
  item(24, "kelp-wrap", "Kelp Wrap", "food", "common", 22, 3, false, "Rice and greens folded in a ribbon of kelp."),
  item(25, "pearl-candy", "Pearl Candy", "treat", "uncommon", 8, 12, false, "A smooth candy with a pearly shine."),
  item(26, "shell-rattle", "Shell Rattle", "toy", "uncommon", 0, 18, true, "Two shells on a string. A classic shoal toy."),
  item(27, "tide-comb", "Tide Comb", "groom", "common", 0, 14, true, "A wide comb carved from pale shell."),
  item(28, "foam-bun", "Foam Bun", "food", "common", 20, 4, false, "A light bun that tastes a little of sea air."),
  item(29, "pebble-marble", "Pebble Marble", "toy", "common", 0, 15, true, "A polished pebble that rolls true."),
  item(30, "paper-star", "Paper Star", "misc", "rare", 0, 0, false, "A folded star. Nice to pass along, not to eat."),
  item(31, "oat-round", "Oat Round", "food", "common", 22, 2, false, "A floury round from the loaf-roof bakery."),
  item(32, "sugar-knot", "Sugar Knot", "treat", "common", 10, 8, false, "A twisted sweet with a shiny sugar crust."),
  item(33, "button-bear", "Button Bear", "toy", "uncommon", 0, 16, true, "A stitched bear with button eyes."),
  item(34, "marble-hoop", "Marble Hoop", "toy", "common", 0, 14, true, "A hoop that rolls true across the quay stones."),
  item(35, "foam-brush", "Foam Brush", "groom", "common", 0, 12, true, "A cloud-soft brush from the bubble dome."),
  item(36, "scent-mist", "Scent Mist", "groom", "common", 0, 10, true, "A light mist that smells like clean linen."),
  item(37, "wick-charm", "Wick Charm", "toy", "common", 0, 8, true, "A tiny lantern charm that clicks when shaken."),
  item(38, "skillet-fish", "Skillet Fish", "food", "common", 26, 3, false, "A harbor fish, crisp at the edges."),
  item(39, "salt-fritters", "Salt Fritters", "food", "common", 18, 2, false, "Little salty fritters from the shell-roof stall."),
  item(40, "spore-tea", "Spore Tea", "food", "common", 10, 10, false, "A mushroom-cap tea, earthy and kind."),
  item(41, "puff-salve", "Puff Salve", "groom", "common", 0, 8, true, "A dab of salve for dusty paws."),
  item(42, "seed-cake", "Seed Cake", "food", "common", 16, 2, false, "A dense cake packed with toasted seeds."),
  item(43, "sprout-biscuit", "Sprout Biscuit", "food", "common", 14, 2, false, "A green-flecked biscuit from the stump shop."),
  item(44, "acorn-top", "Acorn Top", "toy", "common", 0, 15, true, "A spinning top carved from an acorn cap."),
  item(45, "paper-boat", "Paper Boat", "toy", "common", 0, 8, true, "A folded boat for quiet windowsill play."),
  item(46, "coal-bun", "Coal Bun", "food", "common", 20, 2, false, "A dark, toasty bun from the stone forge."),
  item(47, "iron-rattle", "Iron Rattle", "toy", "uncommon", 0, 12, true, "A small rattle with a warm iron bell."),
  item(48, "clay-whistle", "Clay Whistle", "toy", "common", 0, 14, true, "A kiln whistle with one clear note."),
  item(49, "kiln-mug", "Kiln Mug", "food", "common", 14, 6, false, "A clay mug of spiced cocoa."),
  item(50, "glimmer-shard", "Glimmer Shard", "misc", "rare", 0, 0, false, "A pretty crystal shard. Not for eating."),
  item(51, "cave-candy", "Cave Candy", "treat", "uncommon", 8, 10, false, "A hard candy that tastes faintly of minerals."),
  item(52, "pearl-bead", "Pearl Bead", "toy", "uncommon", 0, 12, true, "A loose pearl bead on a short cord."),
  item(53, "brine-sweet", "Brine Sweet", "treat", "common", 6, 10, false, "A salty-sweet drop from the open clam."),
  item(54, "bell-charm", "Bell Charm", "toy", "common", 0, 10, true, "A lighthouse charm with a tiny bell."),
  item(55, "lamp-biscuit", "Lamp Biscuit", "food", "common", 16, 2, false, "A biscuit stamped with a little lamp."),
  item(56, "bubble-syrup", "Bubble Syrup", "treat", "uncommon", 8, 12, false, "A spoon of syrup that pops on the tongue."),
  item(57, "tide-phial", "Tide Phial", "groom", "common", 0, 8, true, "A glass dab of cool tidewater scent."),
  item(58, "plank-pretzel", "Plank Pretzel", "food", "common", 18, 2, false, "A knot of bread from the driftwood shack."),
  item(59, "smoke-crisp", "Smoke Crisp", "food", "common", 16, 2, false, "A crisp smoked over driftwood."),
  item(60, "cinder-fang", "Cinder Fang", "weapon", "uncommon", 0, 0, true, "A short fang-shaped blade for the Ember Ring.", 4),
  item(61, "cliff-spear", "Cliff Spear", "weapon", "rare", 0, 0, true, "A light spear with a warm metal tip.", 6),
  item(62, "kiln-shield", "Kiln Shield", "shield", "uncommon", 0, 0, true, "A round shield fired in the dome kiln.", 4),
  item(63, "pocket-buckler", "Pocket Buckler", "shield", "common", 0, 0, true, "A small buckler that straps to a foreleg.", 2),
  item(64, "ember-tonic", "Ember Tonic", "potion", "common", 0, 0, false, "A sip that steadies a fighter mid-match.", 16),
  item(65, "coal-sip", "Coal Sip", "potion", "common", 0, 0, false, "A small bitter sip. It helps, a little.", 8),
  item(66, "oil-drop", "Oil Drop", "treat", "common", 4, 6, false, "A golden drop that tastes like a warm lamp."),
];

function shop(
  n: number,
  slug: string,
  name: string,
  keeper: string,
  keeperSpecies: string,
  greeting: string,
  land: string,
  blurb: string,
  stock: [string, number, number, number][],
): ShopDef {
  return {
    id: `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    slug,
    name,
    keeper,
    keeperSpecies,
    greeting,
    land,
    blurb,
    restockMin: 8,
    restockMax: 16,
    stock: stock.map(([itemSlug, price, target, batch]) => ({ itemSlug, price, target, batch })),
  };
}

export const SHOPS: ShopDef[] = [
  {
    id: "e0000000-0000-4000-8000-000000000001",
    slug: "lantern-pantry",
    name: "The Lantern Pantry",
    keeper: "Nim Salla",
    keeperSpecies: "lumkin",
    greeting: "The buns are warm and the pencil is sharp. What will you carry home?",
    land: "harborlight",
    blurb: "Everyday buns, crackers, and the odd shiny cookie.",
    restockMin: 8,
    restockMax: 16,
    stock: [
      { itemSlug: "harbor-bun", price: 40, target: 10, batch: 4 },
      { itemSlug: "milk-drop", price: 22, target: 10, batch: 4 },
      { itemSlug: "quay-cracker", price: 28, target: 8, batch: 4 },
      { itemSlug: "lantern-crust", price: 48, target: 6, batch: 3 },
      { itemSlug: "honey-roll", price: 44, target: 6, batch: 3 },
      { itemSlug: "berry-pocket", price: 55, target: 5, batch: 2 },
      { itemSlug: "glim-cookie", price: 72, target: 2, batch: 1 },
    ],
  },
  {
    id: "e0000000-0000-4000-8000-000000000002",
    slug: "teacup-porch",
    name: "The Teacup Porch",
    keeper: "Bracken Moss",
    keeperSpecies: "quillora",
    greeting: "The kettle is singing. Sit a moment, then choose a cup.",
    land: "mossglen",
    blurb: "Forest snacks, teas, and a couple of toys hung from the eaves.",
    restockMin: 8,
    restockMax: 16,
    stock: [
      { itemSlug: "moss-tea", price: 32, target: 8, batch: 4 },
      { itemSlug: "fern-cake", price: 42, target: 6, batch: 3 },
      { itemSlug: "clover-sandwich", price: 38, target: 6, batch: 3 },
      { itemSlug: "acorn-tart", price: 60, target: 4, batch: 2 },
      { itemSlug: "night-mint", price: 54, target: 2, batch: 1 },
      { itemSlug: "ribbon-ball", price: 120, target: 2, batch: 1 },
      { itemSlug: "leaf-kite", price: 145, target: 2, batch: 1 },
      { itemSlug: "blossom-brush", price: 115, target: 2, batch: 1 },
    ],
  },
  {
    id: "e0000000-0000-4000-8000-000000000003",
    slug: "emberoven",
    name: "Emberoven",
    keeper: "Soola Vint",
    keeperSpecies: "pyrlit",
    greeting: "The chili stall is hot. Mind your whiskers, and pick a bun.",
    land: "cinderreach",
    blurb: "Spice buns and cocoa from the pepper-roof stall.",
    restockMin: 8,
    restockMax: 16,
    stock: [
      { itemSlug: "spice-bun", price: 46, target: 8, batch: 4 },
      { itemSlug: "sunstone-biscuit", price: 40, target: 8, batch: 3 },
      { itemSlug: "cocoa-cup", price: 36, target: 8, batch: 4 },
      { itemSlug: "ember-tart", price: 68, target: 4, batch: 2 },
      { itemSlug: "warm-puff", price: 110, target: 2, batch: 1 },
      { itemSlug: "kiln-bell", price: 135, target: 2, batch: 1 },
    ],
  },
  {
    id: "e0000000-0000-4000-8000-000000000004",
    slug: "shell-and-string",
    name: "Shell & String",
    keeper: "Ivo Pell",
    keeperSpecies: "velune",
    greeting: "Shells, string, and a rattle that knows the tide. Look around.",
    land: "silvershoal",
    blurb: "Tide snacks, shell rattles, and combs from the spiral shell.",
    restockMin: 8,
    restockMax: 16,
    stock: [
      { itemSlug: "tide-crisp", price: 30, target: 8, batch: 4 },
      { itemSlug: "kelp-wrap", price: 40, target: 6, batch: 3 },
      { itemSlug: "foam-bun", price: 34, target: 8, batch: 4 },
      { itemSlug: "pearl-candy", price: 58, target: 4, batch: 2 },
      { itemSlug: "shell-rattle", price: 125, target: 2, batch: 1 },
      { itemSlug: "tide-comb", price: 100, target: 3, batch: 1 },
      { itemSlug: "pebble-marble", price: 90, target: 3, batch: 1 },
    ],
  },
  shop(5, "hearth-loaf", "The Hearth Loaf", "Oat Miller", "nimblet", "The ovens never really sleep. Take a round while it is soft.", "harborlight", "Fresh rounds and sugar knots under the bread-loaf roof.", [
    ["oat-round", 36, 8, 4], ["sugar-knot", 48, 6, 2],
  ]),
  shop(6, "bow-attic", "The Bow Attic", "Puff Ribbon", "mallowgull", "Every toy has a bow on it. Please do not eat the bows.", "harborlight", "Stitched toys from the gift-box shop.", [
    ["button-bear", 110, 2, 1], ["marble-hoop", 95, 3, 1],
  ]),
  shop(7, "bubble-dome", "The Bubble Dome", "Mist Pell", "silkmoth", "Hold still. The foam brush is gentler than it looks.", "harborlight", "Brushes and mists under the bubble dome.", [
    ["foam-brush", 90, 3, 1], ["scent-mist", 70, 4, 1],
  ]),
  shop(8, "wick-canvas", "Wick & Canvas", "Cog Bright", "cogwhisk", "Charms, wicks, and a click you can hear.", "harborlight", "Little lantern charms from the striped tent.", [
    ["wick-charm", 60, 4, 2], ["oil-drop", 40, 6, 2],
  ]),
  shop(9, "pink-catch", "The Pink Catch", "Salt Gimble", "mallowgull", "The catch came in with the ferry. It will not wait.", "harborlight", "Harbor fish and fritters under the shell roof.", [
    ["skillet-fish", 42, 6, 3], ["salt-fritters", 30, 8, 4],
  ]),
  shop(10, "cap-and-spore", "Cap & Spore", "Fern Thorn", "thornu", "The remedy hut smells like rain on bark.", "mossglen", "Teas and salves from the mushroom hut.", [
    ["spore-tea", 34, 6, 3], ["puff-salve", 55, 3, 1],
  ]),
  shop(11, "stump-shelf", "The Stump Shelf", "Crag Moss", "mosscrag", "Seeds, cakes, and patience. I have plenty of the last.", "mossglen", "Seed cakes from the tree-stump shop.", [
    ["seed-cake", 28, 8, 3], ["sprout-biscuit", 24, 8, 4],
  ]),
  shop(12, "acorn-rattle", "Acorn Rattle", "Jam Button", "berrybop", "Spin the top. If it falls, spin it again.", "mossglen", "Acorn toys beside the creek.", [
    ["acorn-top", 100, 3, 1], ["acorn-tart", 60, 4, 2],
  ]),
  shop(13, "leaf-nook", "The Leaf Nook", "Buzz Page", "bramblebuzz", "Quiet books, folded boats, and no shouting.", "mossglen", "A leaf-roof nook for small paper things.", [
    ["paper-boat", 45, 4, 2], ["paper-star", 80, 2, 1],
  ]),
  shop(14, "anvil-rest", "Anvil Rest", "Soot Pyr", "pyrlit", "The forge is loud. The buns are not.", "cinderreach", "Forge snacks and a warm iron rattle.", [
    ["coal-bun", 32, 8, 4], ["iron-rattle", 85, 2, 1],
  ]),
  shop(15, "clay-dome", "The Clay Dome", "Kiln Dora", "dunesprout", "Everything here was warm an hour ago.", "cinderreach", "Whistles and mugs from the pottery dome.", [
    ["clay-whistle", 75, 3, 1], ["kiln-mug", 36, 6, 3],
  ]),
  shop(16, "ruby-vein", "Ruby Vein", "Gem Storm", "stormuff", "The crystals hum if you listen. Please do not lick them.", "cinderreach", "Shards and candy from the gem cave.", [
    ["glimmer-shard", 140, 1, 1], ["cave-candy", 52, 4, 2],
  ]),
  shop(17, "shield-step", "The Shield Step", "Warden Pinch", "rubyclaw", "Gear for the Ember Ring. Bring a steady paw.", "cinderreach", "Weapons, shields, and sips for the ring.", [
    ["cinder-fang", 180, 2, 1], ["cliff-spear", 260, 1, 1], ["kiln-shield", 160, 2, 1], ["pocket-buckler", 90, 3, 1], ["ember-tonic", 50, 6, 3], ["coal-sip", 28, 8, 4],
  ]),
  shop(18, "open-clam", "The Open Clam", "Pearl Glint", "glacibun", "Pearls, sweets, and a cool breeze off the pools.", "silvershoal", "Pearl beads from the giant clam.", [
    ["pearl-bead", 120, 2, 1], ["brine-sweet", 44, 5, 2],
  ]),
  shop(19, "bell-lamp", "Bell Lamp", "Keeper North", "tidewing", "The lamp is lit. The charms are cheaper than a ferry.", "silvershoal", "Lighthouse gifts and little biscuits.", [
    ["bell-charm", 70, 3, 1], ["lamp-biscuit", 28, 8, 4],
  ]),
  shop(20, "tide-phials", "Tide Phials", "Bubble Ivo", "puddlehop", "The glass is cool. The syrup pops.", "silvershoal", "Phials and syrup under the glass dome.", [
    ["bubble-syrup", 48, 4, 2], ["tide-phial", 60, 3, 1],
  ]),
  shop(21, "drift-shack", "The Drift Shack", "Plank Sook", "puddlehop", "Driftwood smoke and a pretzel that travels well.", "silvershoal", "Snacks from the driftwood shack.", [
    ["plank-pretzel", 26, 8, 4], ["smoke-crisp", 24, 8, 4],
  ]),
];

export const GAMES: GameDef[] = [
  {
    id: "f0000000-0000-4000-8000-000000000001",
    slug: "lantern-catch",
    name: "Lantern Catch",
    blurb: "Catch drifting lanterns. Same-color streaks shine brighter. Clouds snuff a streak.",
    how: "Click a lantern before it floats away. Matching the last color builds a combo. Clicking a cloud, or letting a lantern leave, ends the streak. A round lasts 50 seconds.",
    scoreCap: 25000,
    minMs: 10000,
    sort: 0,
  },
  {
    id: "f0000000-0000-4000-8000-000000000002",
    slug: "shoal-pairs",
    name: "Shoal Pairs",
    blurb: "Flip a tide-pool board and remember what hides under each shell.",
    how: "Turn two cards at a time. Clear the board for a score that rewards leftover time and a light touch on the cards. You have 90 seconds.",
    scoreCap: 12000,
    minMs: 8000,
    sort: 1,
  },
  {
    id: "f0000000-0000-4000-8000-000000000003",
    slug: "parcel-sort",
    name: "Parcel Sort",
    blurb: "Sixty seconds of parcels, three stalls, and a combo that hates mistakes.",
    how: "Parcels fall toward the Pantry, the Porch, and the Oven. Press 1, 2, or 3 — or click a stall — to sort the lowest parcel. A mistake snaps the combo.",
    scoreCap: 18000,
    minMs: 20000,
    sort: 2,
  },
  {
    id: "f0000000-0000-4000-8000-000000000004",
    slug: "quay-dash",
    name: "Quay Dash",
    blurb: "A short boardwalk run. Collect sparks, hop crates, and try not to stumble.",
    how: "You run for 45 seconds. Press Space or tap the scene to hop. Sparks add to the score. One hit is a stumble. Three stumbles end the run.",
    scoreCap: 20000,
    minMs: 20000,
    sort: 3,
  },
];

export const BOARDS: BoardDef[] = [
  { id: "10000000-0000-4000-8000-000000000001", slug: "town-talk", title: "Town Talk", blurb: "Ferry news, weather, and whatever the quay is chatting about.", sort: 0 },
  { id: "10000000-0000-4000-8000-000000000002", slug: "companions", title: "Companions", blurb: "Names, care, and showing off a lineup.", sort: 1 },
  { id: "10000000-0000-4000-8000-000000000003", slug: "greenboard-chatter", title: "Greenboard Chatter", blurb: "Wants, spare toys, and polite haggling. Trades themselves happen on the Greenboard.", sort: 2 },
  { id: "10000000-0000-4000-8000-000000000004", slug: "arcade", title: "Arcade", blurb: "High scores, near misses, and which game is the bright board today.", sort: 3 },
  { id: "10000000-0000-4000-8000-000000000005", slug: "circle-notices", title: "Circle Notices", blurb: "Public notes from Circles. Private circle boards stay with their members.", sort: 4 },
];

export const PET_CAP = 4;
export const DAILY_GAME_GLIM_CAP = 3000;
export const PLAYS_PER_GAME = 3;
export const GLIM_PER_SCORE = 20;
export const GLIM_CAP_PER_PLAY = 1000;
export const SIGNUP_GLIMS = 500;
export const PLAY_COOLDOWN_MS = 15 * 60 * 1000;

export function speciesBySlug(slug: string) {
  const found = SPECIES.find((s) => s.slug === slug);
  if (!found) throw new Error("Unknown species.");
  return found;
}

export function tintBySlug(slug: string) {
  const found = TINTS.find((t) => t.slug === slug);
  if (!found) throw new Error("Unknown tint.");
  return found;
}

export function itemBySlug(slug: string) {
  const found = ITEMS.find((i) => i.slug === slug);
  if (!found) throw new Error("Unknown item.");
  return found;
}

export function shopBySlug(slug: string) {
  const found = SHOPS.find((s) => s.slug === slug);
  if (!found) throw new Error("Unknown shop.");
  return found;
}

export function landBySlug(slug: string) {
  const found = LANDS.find((l) => l.slug === slug);
  if (!found) throw new Error("Unknown land.");
  return found;
}

export function gameBySlug(slug: string) {
  const found = GAMES.find((g) => g.slug === slug);
  if (!found) throw new Error("Unknown game.");
  return found;
}

export function findSpecies(slug: string) {
  return SPECIES.find((s) => s.slug === slug) ?? null;
}

export function findItem(slug: string) {
  return ITEMS.find((i) => i.slug === slug) ?? null;
}

export function findTint(slug: string) {
  return TINTS.find((t) => t.slug === slug) ?? null;
}
