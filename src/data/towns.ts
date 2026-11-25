export type Hotspot = {
  shopSlug: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const TOWNS: { slug: string; name: string; spots: Hotspot[] }[] = [
  {
    slug: "harborlight",
    name: "Harborlight",
    spots: [
      { shopSlug: "hearth-loaf", label: "Hearth Loaf", hint: "Bakery under the bread-loaf roof.", x: 3, y: 6, w: 26, h: 34 },
      { shopSlug: "bow-attic", label: "Bow Attic", hint: "Toys inside the giant gift box.", x: 33, y: 3, w: 22, h: 32 },
      { shopSlug: "bubble-dome", label: "Bubble Dome", hint: "Grooming under the bubble roof.", x: 63, y: 4, w: 28, h: 34 },
      { shopSlug: "lantern-pantry", label: "Lantern Pantry", hint: "Everyday goods, green roof, striped awning.", x: 3, y: 44, w: 30, h: 30 },
      { shopSlug: "wick-canvas", label: "Wick & Canvas", hint: "Lantern charms in the striped tent.", x: 40, y: 34, w: 24, h: 32 },
      { shopSlug: "pink-catch", label: "Pink Catch", hint: "Fish and fritters under the shell roof.", x: 68, y: 40, w: 26, h: 32 },
    ],
  },
  {
    slug: "mossglen",
    name: "Mossglen",
    spots: [
      { shopSlug: "teacup-porch", label: "Teacup Porch", hint: "Tea in the giant teapot house.", x: 6, y: 4, w: 32, h: 34 },
      { shopSlug: "cap-and-spore", label: "Cap & Spore", hint: "Remedies in the mushroom hut.", x: 54, y: 2, w: 34, h: 36 },
      { shopSlug: "stump-shelf", label: "Stump Shelf", hint: "Seed cakes in the tree stump.", x: 2, y: 44, w: 28, h: 34 },
      { shopSlug: "acorn-rattle", label: "Acorn Rattle", hint: "Toys in the acorn house.", x: 40, y: 48, w: 26, h: 32 },
      { shopSlug: "leaf-nook", label: "Leaf Nook", hint: "Paper things under the leaf roof.", x: 70, y: 36, w: 26, h: 36 },
    ],
  },
  {
    slug: "cinderreach",
    name: "Cinderreach",
    spots: [
      { shopSlug: "anvil-rest", label: "Anvil Rest", hint: "The stone forge on the left cliff.", x: 2, y: 28, w: 26, h: 30 },
      { shopSlug: "emberoven", label: "Emberoven", hint: "Chili-roof stall of spice buns.", x: 32, y: 16, w: 26, h: 26 },
      { shopSlug: "clay-dome", label: "Clay Dome", hint: "Pottery under the round kiln.", x: 30, y: 52, w: 28, h: 28 },
      { shopSlug: "ruby-vein", label: "Ruby Vein", hint: "Crystals in the gem cave.", x: 62, y: 10, w: 32, h: 34 },
      { shopSlug: "shield-step", label: "Shield Step", hint: "Battle gear for the Ember Ring.", x: 64, y: 50, w: 30, h: 30 },
    ],
  },
  {
    slug: "silvershoal",
    name: "Silvershoal",
    spots: [
      { shopSlug: "shell-and-string", label: "Shell & String", hint: "Rattles and combs in the spiral shell.", x: 2, y: 40, w: 26, h: 32 },
      { shopSlug: "open-clam", label: "Open Clam", hint: "Pearls in the giant clam.", x: 24, y: 6, w: 28, h: 30 },
      { shopSlug: "bell-lamp", label: "Bell Lamp", hint: "Gifts at the lighthouse.", x: 64, y: 4, w: 24, h: 34 },
      { shopSlug: "tide-phials", label: "Tide Phials", hint: "Syrup and scent under the glass dome.", x: 42, y: 38, w: 26, h: 28 },
      { shopSlug: "drift-shack", label: "Drift Shack", hint: "Snacks at the driftwood stall.", x: 68, y: 48, w: 26, h: 28 },
    ],
  },
];
