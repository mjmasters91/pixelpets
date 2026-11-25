export type Challenger = {
  id: string;
  slug: string;
  name: string;
  speciesSlug: string;
  tier: number;
  level: number;
  blurb: string;
};

export const CHALLENGERS: Challenger[] = [
  { id: "91000000-0000-4000-8000-000000000001", slug: "brook-nim", name: "Brook Nim", speciesSlug: "puddlehop", tier: 1, level: 1, blurb: "A splashy first bout by the shallows." },
  { id: "91000000-0000-4000-8000-000000000002", slug: "petal-novice", name: "Petal Novice", speciesSlug: "thornu", tier: 1, level: 2, blurb: "Shy, then surprisingly steady." },
  { id: "91000000-0000-4000-8000-000000000003", slug: "wick-apprentice", name: "Wick Apprentice", speciesSlug: "lumkin", tier: 2, level: 4, blurb: "Learns the ring between lantern shifts." },
  { id: "91000000-0000-4000-8000-000000000004", slug: "chili-brawler", name: "Chili Brawler", speciesSlug: "pyrlit", tier: 3, level: 6, blurb: "Hot-tempered and quick to strike." },
  { id: "91000000-0000-4000-8000-000000000005", slug: "tide-glider", name: "Tide Glider", speciesSlug: "tidewing", tier: 4, level: 8, blurb: "Circles once, then dives in." },
  { id: "91000000-0000-4000-8000-000000000006", slug: "kiln-warden", name: "Kiln Warden", speciesSlug: "rubyclaw", tier: 5, level: 10, blurb: "Keeps the ring when the cliffs go quiet." },
];

export const BATTLE_REWARD_CAP = 1500;
export const BATTLE_REWARD_COUNT = 10;

export function xpToLevel(level: number) {
  return 40 * Math.max(1, level);
}
