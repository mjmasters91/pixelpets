import { CHALLENGERS, BATTLE_REWARD_CAP, BATTLE_REWARD_COUNT } from "../data/battle";
import { applyXp, resolveTurn, speciesStats, type EngineState, type Fighter } from "./battleEngine";
import {
  BOARDS,
  GAMES,
  ITEMS,
  LANDS,
  PET_CAP,
  PLAY_COOLDOWN_MS,
  SHOPS,
  SIGNUP_GLIMS,
  SPECIES,
  TINTS,
  findItem,
  findSpecies,
  gameBySlug,
  itemBySlug,
  shopBySlug,
  speciesBySlug,
  tintBySlug,
} from "../data/catalog";
import {
  addDays,
  awardScore,
  checkBio,
  checkCircleSlug,
  checkDisplayName,
  checkPetName,
  checkPostBody,
  checkTitle,
  checkUsername,
  decayed,
  morningPayout,
  nextStreak,
  payoutWithDailyCap,
  featuredGame,
  wickDateKey,
} from "./rules";
import type {
  BasketRow,
  BattleView,
  BoardView,
  CircleView,
  Companion,
  DailyStatus,
  FlaggedGame,
  InviteView,
  LedgerRow,
  PostView,
  Profile,
  PublicKeeper,
  ReportRow,
  ScoreRow,
  ShopView,
  Stack,
  StewardFile,
  ThreadView,
  TownApi,
  TradeView,
} from "./types";

const MIRA = "11111111-1111-4111-8111-0000000000a1";
const SENDER = "11111111-1111-4111-8111-0000000000a2";
const BRAMBLE = "11111111-1111-4111-8111-0000000000a3";
const PELL = "11111111-1111-4111-8111-0000000000a4";
const MINA = "11111111-1111-4111-8111-0000000000a5";
const SOOK = "11111111-1111-4111-8111-0000000000a6";

const NEST: Record<string, string> = {
  lumkin: "Lumen",
  quillora: "Sable",
  puddlehop: "Pebble",
  pyrlit: "Cinderbit",
  nimblet: "Zip",
  mallowgull: "Puff",
  thornu: "Bud",
  velune: "Vesper",
  glacibun: "Frostnip",
  mosscrag: "Crag",
  tidewing: "Skim",
  cogwhisk: "Tick",
  bramblebuzz: "Honeybell",
  dunesprout: "Sunny",
  silkmoth: "Moonlet",
  berrybop: "Jam",
  stormuff: "Rumble",
  rubyclaw: "Pinch",
};

type Person = Profile & { email: string };
type Pet = {
  id: string;
  name: string;
  speciesSlug: string;
  tintSlug: string;
  ownerId: string | null;
  hunger: number;
  mood: number;
  createdAt: string;
  lastTick: string;
  lastPlayedAt: string | null;
  lastFedAt: string | null;
  lastGroomedAt: string | null;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  rating?: number;
  pveWins?: number;
  pveLosses?: number;
  pveStreak?: number;
  pvpWins?: number;
  pvpLosses?: number;
  pvpStreak?: number;
};
type Bout = {
  id: string;
  at: string;
  challengerId: string;
  defenderId: string;
  challengerName: string;
  challengerOwner: string;
  defenderName: string;
  defenderOwner: string;
  challengerWon: boolean;
  rated: boolean;
  delta: number;
};
type Notice = { id: string; profileId: string; body: string; at: string };
type StackRow = { profileId: string; itemSlug: string; qty: number };
type Ledger = { id: string; profileId: string; delta: number; balanceAfter: number; reason: string; createdAt: string };
type Claim = { profileId: string; key: string; on: string; payload: Record<string, unknown> };
type Basket = { id: string; itemSlug: string; donorId: string | null };
type Stock = { shopSlug: string; itemSlug: string; qty: number };
type Clock = { shopSlug: string; nextAt: number };
type Trade = {
  id: string;
  sellerId: string;
  status: string;
  askGlims: number;
  wishlist: string;
  createdAt: string;
  expiresAt: string;
  lots: { itemSlug: string; qty: number }[];
};
type Offer = { id: string; tradeId: string; buyerId: string; glims: number; status: string; lots: { itemSlug: string; qty: number }[] };
type Session = { id: string; nonce: string; profileId: string; gameId: string; startedAt: number; status: string };
type Score = { id: string; profileId: string; gameSlug: string; score: number; glims: number; at: string };
type Thread = { id: string; boardSlug: string; circleSlug: string | null; authorId: string; title: string; locked: boolean; hidden: boolean; createdAt: string; lastPostAt: string };
type Post = { id: string; threadId: string; authorId: string; body: string; hidden: boolean; createdAt: string };
type Circle = { id: string; slug: string; name: string; motto: string; about: string; isOpen: boolean };
type Member = { circleId: string; profileId: string; role: string };
type Invite = { id: string; circleId: string; inviteeId: string; status: string };
type Report = { id: string; reporterId: string; targetType: string; targetId: string; reason: string; status: string; createdAt: string };
type State = {
  meId: string | null;
  people: Person[];
  pets: Pet[];
  stacks: StackRow[];
  ledger: Ledger[];
  claims: Claim[];
  basket: Basket[];
  stock: Stock[];
  clocks: Clock[];
  prices: { shopSlug: string; itemSlug: string; price: number }[];
  trades: Trade[];
  offers: Offer[];
  sessions: Session[];
  scores: Score[];
  threads: Thread[];
  posts: Post[];
  circles: Circle[];
  members: Member[];
  invites: Invite[];
  reports: Report[];
  rates: Record<string, number>;
  battles: DemoBattle[];
  bouts: Bout[];
  notices: Notice[];
};

type DemoBattle = {
  id: string;
  profileId: string;
  companionId: string;
  mode: "pve" | "pvp";
  engine: EngineState;
  rewardGlims: number;
  rewardXp: number;
  gearSlugs: string[];
  defenderId: string | null;
  rated: boolean;
  ratingDelta?: number;
};

let storageKey = "pixelpets-demo-v5";
let state: State = fresh(false);
let lastRaw = "";
const listeners = new Set<() => void>();

function uid() {
  return crypto.randomUUID();
}
function nowIso() {
  return new Date().toISOString();
}
function person(s: State, id: string | null) {
  return s.people.find((p) => p.id === id) ?? null;
}
function usernameOf(s: State, id: string | null) {
  return person(s, id)?.username ?? null;
}
function requireMe(s: State) {
  const me = person(s, s.meId);
  if (!me) throw new Error("Sign in to do that.");
  if (me.bannedAt) throw new Error("The quay has asked this keeper to step away.");
  return me;
}
function requireAdmin(s: State) {
  const me = requireMe(s);
  if (!me.isAdmin) throw new Error("The desk is locked.");
  return me;
}
function give(s: State, profileId: string, itemSlug: string, qty: number) {
  const row = s.stacks.find((r) => r.profileId === profileId && r.itemSlug === itemSlug);
  if (row) row.qty += qty;
  else s.stacks.push({ profileId, itemSlug, qty });
}
function take(s: State, profileId: string, itemSlug: string, qty: number) {
  const row = s.stacks.find((r) => r.profileId === profileId && r.itemSlug === itemSlug);
  if (!row || row.qty < qty) throw new Error("That is not in the satchel.");
  row.qty -= qty;
  if (row.qty <= 0) s.stacks = s.stacks.filter((r) => r !== row);
}
function pay(s: State, profileId: string, delta: number, reason: string) {
  const who = person(s, profileId);
  if (!who) throw new Error("Keeper not found.");
  const next = who.glims + delta;
  if (next < 0) throw new Error("Not enough Glims.");
  who.glims = next;
  s.ledger.unshift({ id: uid(), profileId, delta, balanceAfter: next, reason, createdAt: nowIso() });
  return next;
}
function viewPet(s: State, pet: Pet): Companion {
  const species = speciesBySlug(pet.speciesSlug);
  const tint = tintBySlug(pet.tintSlug);
  return {
    id: pet.id,
    name: pet.name,
    speciesSlug: pet.speciesSlug,
    speciesName: species.name,
    tintSlug: pet.tintSlug,
    tintName: tint.name,
    ownerId: pet.ownerId,
    ownerUsername: usernameOf(s, pet.ownerId),
    hunger: pet.hunger,
    mood: pet.mood,
    createdAt: pet.createdAt,
    lastPlayedAt: pet.lastPlayedAt,
    level: pet.level ?? 1,
    xp: pet.xp ?? 0,
    wins: pet.wins ?? 0,
    losses: pet.losses ?? 0,
    rating: pet.rating ?? 1000,
    pveWins: pet.pveWins ?? 0,
    pveLosses: pet.pveLosses ?? 0,
    pveStreak: pet.pveStreak ?? 0,
    pvpWins: pet.pvpWins ?? 0,
    pvpLosses: pet.pvpLosses ?? 0,
    pvpStreak: pet.pvpStreak ?? 0,
  };
}
function tickPet(pet: Pet) {
  const next = decayed(pet.hunger, pet.mood, pet.lastTick);
  if (!next.changed) return false;
  pet.hunger = next.hunger;
  pet.mood = next.mood;
  pet.lastTick = nowIso();
  return true;
}
function rate(s: State, id: string, action: string, ms: number) {
  const key = `${id}:${action}`;
  const prev = s.rates[key] ?? 0;
  if (Date.now() - prev < ms) throw new Error("Easy — give that another moment.");
  s.rates[key] = Date.now();
}
function restock(s: State, forceSlug?: string) {
  const now = Date.now();
  for (const shop of SHOPS) {
    const clock = s.clocks.find((c) => c.shopSlug === shop.slug);
    if (!clock) continue;
    const force = forceSlug === shop.slug;
    if (!force && clock.nextAt > now) continue;
    for (const line of shop.stock) {
      const row = s.stock.find((r) => r.shopSlug === shop.slug && r.itemSlug === line.itemSlug);
      if (!row) continue;
      if (force) row.qty = line.target;
      else if (row.qty < line.target) row.qty = Math.min(line.target, row.qty + line.batch);
    }
    const span = shop.restockMin + Math.floor(Math.random() * (shop.restockMax - shop.restockMin + 1));
    clock.nextAt = now + span * 60_000;
  }
}
function expireTrades(s: State) {
  const now = Date.now();
  for (const trade of s.trades) {
    if (trade.status !== "open" || new Date(trade.expiresAt).getTime() > now) continue;
    trade.status = "expired";
    for (const lot of trade.lots) give(s, trade.sellerId, lot.itemSlug, lot.qty);
    refundOffers(s, trade.id, null);
  }
}
function refundOffers(s: State, tradeId: string, except: string | null) {
  for (const offer of s.offers) {
    if (offer.tradeId !== tradeId || offer.status !== "open" || offer.id === except) continue;
    offer.status = "declined";
    if (offer.glims) pay(s, offer.buyerId, offer.glims, "trade_refund");
    for (const lot of offer.lots) give(s, offer.buyerId, lot.itemSlug, lot.qty);
  }
}
function stackViews(s: State, profileId: string): Stack[] {
  return s.stacks
    .filter((r) => r.profileId === profileId && r.qty > 0)
    .map((r) => {
      const item = itemBySlug(r.itemSlug);
      return { itemSlug: r.itemSlug, name: item.name, qty: r.qty, category: item.category, reusable: item.reusable, hunger: item.hunger, mood: item.mood };
    });
}
function shopViews(s: State): ShopView[] {
  return SHOPS.map((shop) => {
    const land = LANDS.find((l) => l.slug === shop.land)!;
    const clock = s.clocks.find((c) => c.shopSlug === shop.slug);
    return {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      keeper: shop.keeper,
      blurb: shop.blurb,
      landSlug: land.slug,
      landName: land.name,
      nextRestockAt: new Date(clock?.nextAt ?? Date.now()).toISOString(),
      lines: shop.stock.map((line) => {
        const item = itemBySlug(line.itemSlug);
        const qty = s.stock.find((r) => r.shopSlug === shop.slug && r.itemSlug === line.itemSlug)?.qty ?? 0;
        const price = s.prices.find((p) => p.shopSlug === shop.slug && p.itemSlug === line.itemSlug)?.price ?? line.price;
        return {
          itemId: item.id,
          itemSlug: item.slug,
          name: item.name,
          price,
          qty,
          category: item.category,
          rarity: item.rarity,
          description: item.description,
          hunger: item.hunger,
          mood: item.mood,
          reusable: item.reusable,
        };
      }),
    };
  });
}
function tradeView(s: State, trade: Trade): TradeView {
  return {
    id: trade.id,
    sellerId: trade.sellerId,
    seller: usernameOf(s, trade.sellerId) ?? "Keeper",
    status: trade.status,
    askGlims: trade.askGlims,
    wishlist: trade.wishlist,
    createdAt: trade.createdAt,
    expiresAt: trade.expiresAt,
    lots: trade.lots.map((lot) => ({ ...lot, name: itemBySlug(lot.itemSlug).name })),
    offers: s.offers
      .filter((o) => o.tradeId === trade.id && (o.status === "open" || o.status === "accepted"))
      .filter((o) => o.buyerId === s.meId || trade.sellerId === s.meId || person(s, s.meId)?.isAdmin)
      .map((o) => ({
        id: o.id,
        buyerId: o.buyerId,
        buyer: usernameOf(s, o.buyerId) ?? "Keeper",
        glims: o.glims,
        status: o.status,
        lots: o.lots.map((lot) => ({ ...lot, name: itemBySlug(lot.itemSlug).name })),
      })),
  };
}
function profileView(p: Person): Profile {
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    bio: p.bio,
    isAdmin: p.isAdmin,
    bannedAt: p.bannedAt,
    glims: p.glims,
    morningStreak: p.morningStreak,
    morningStreakOn: p.morningStreakOn,
  };
}
function findPersonName(s: State, username: string) {
  return s.people.find((p) => p.username.toLowerCase() === username.toLowerCase()) ?? null;
}
function circleViews(s: State): CircleView[] {
  return s.circles.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    motto: c.motto,
    about: c.about,
    isOpen: c.isOpen,
    members: s.members
      .filter((m) => m.circleId === c.id)
      .map((m) => ({ username: usernameOf(s, m.profileId) ?? "Keeper", role: m.role })),
  }));
}
function threadViews(s: State, rows: Thread[]): ThreadView[] {
  return rows
    .filter((t) => !t.hidden)
    .map((t) => ({
      id: t.id,
      title: t.title,
      author: usernameOf(s, t.authorId) ?? "Keeper",
      locked: t.locked,
      createdAt: t.createdAt,
      lastPostAt: t.lastPostAt,
    }));
}
function ownedCount(s: State, id: string) {
  return s.pets.filter((p) => p.ownerId === id).length;
}
function care(s: State, companionId: string, itemSlug: string, kind: "feed" | "play" | "groom") {
  const me = requireMe(s);
  const pet = s.pets.find((p) => p.id === companionId && p.ownerId === me.id);
  if (!pet) throw new Error("That companion is not with you.");
  tickPet(pet);
  const item = itemBySlug(itemSlug);
  if (kind === "feed" && item.category !== "food" && item.category !== "treat") throw new Error("That is not food.");
  if (kind === "play" && item.category !== "toy") throw new Error("That is for play, not this.");
  if (kind === "groom" && item.category !== "groom") throw new Error("That will not work as a brush.");
  if (kind === "play" && pet.lastPlayedAt && Date.now() - new Date(pet.lastPlayedAt).getTime() < PLAY_COOLDOWN_MS) {
    throw new Error("Give them a little rest before another game.");
  }
  if (!item.reusable) take(s, me.id, item.slug, 1);
  else if (!s.stacks.some((r) => r.profileId === me.id && r.itemSlug === item.slug && r.qty > 0)) {
    throw new Error("That is not in the satchel.");
  }
  if (kind === "feed") {
    pet.hunger = Math.min(100, pet.hunger + item.hunger);
    pet.mood = Math.min(100, pet.mood + item.mood);
    pet.lastFedAt = nowIso();
  } else if (kind === "play") {
    pet.mood = Math.min(100, pet.mood + item.mood);
    pet.lastPlayedAt = nowIso();
  } else {
    pet.mood = Math.min(100, pet.mood + item.mood);
    pet.lastGroomedAt = nowIso();
  }
}
function memberOf(s: State, profileId: string) {
  return s.members.find((m) => m.profileId === profileId) ?? null;
}

function fresh(asSender: boolean): State {
  const today = wickDateKey();
  const stamp = nowIso();
  const owner = asSender ? SENDER : MIRA;
  const people: Person[] = [
    { id: MIRA, username: "Mira", displayName: "Mira Quay", bio: "I like buns and long walks on the boardwalk.", email: "mira@example.com", isAdmin: false, bannedAt: null, glims: asSender ? 420 : 860, morningStreak: 2, morningStreakOn: addDays(today, -1) },
    { id: SENDER, username: "Sender", displayName: "Sender", bio: "Keeper of the quay books.", email: "sender@example.com", isAdmin: true, bannedAt: null, glims: asSender ? 900 : 500, morningStreak: 4, morningStreakOn: addDays(today, -1) },
    { id: BRAMBLE, username: "Bramble", displayName: "Bramble", bio: "Tea first, trades second.", email: "bramble@example.com", isAdmin: false, bannedAt: null, glims: 240, morningStreak: 1, morningStreakOn: today },
    { id: PELL, username: "Pell", displayName: "Pell", bio: "Shells in every pocket.", email: "pell@example.com", isAdmin: false, bannedAt: null, glims: 310, morningStreak: 0, morningStreakOn: null },
    { id: MINA, username: "Mina", displayName: "Mina", bio: "Always looking for a fourth at pairs.", email: "mina@example.com", isAdmin: false, bannedAt: null, glims: 150, morningStreak: 0, morningStreakOn: null },
    { id: SOOK, username: "Sook", displayName: "Sook", bio: "Reads on the moss porch.", email: "sook@example.com", isAdmin: false, bannedAt: null, glims: 180, morningStreak: 0, morningStreakOn: null },
  ];
  const pets: Pet[] = [
    { id: "pet-luma", name: "Luma", speciesSlug: "lumkin", tintSlug: "natural", ownerId: owner, hunger: 82, mood: 86, createdAt: stamp, lastTick: stamp, lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null, level: 1, xp: 0, wins: 5, losses: 2, rating: 1260, pvpWins: 5, pvpLosses: 2, pvpStreak: 2 },
    { id: "pet-bub", name: "Bub", speciesSlug: "puddlehop", tintSlug: "natural", ownerId: owner, hunger: 44, mood: 63, createdAt: stamp, lastTick: stamp, lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null, level: 1, xp: 0, wins: 0, losses: 0 },
  ];
  pets.push({
    id: "pet-ember-king",
    name: "Ember King",
    speciesSlug: "crownwyrm",
    tintSlug: "natural",
    ownerId: SENDER,
    hunger: 100,
    mood: 100,
    level: 3,
    xp: 10,
    wins: 2,
    losses: 0,
    createdAt: stamp,
    lastTick: stamp,
    lastPlayedAt: null,
    lastFedAt: null,
    lastGroomedAt: null,
  });
  pets.push({
    id: "pet-inkwell",
    name: "Inkwell",
    speciesSlug: "quillora",
    tintSlug: "natural",
    ownerId: BRAMBLE,
    hunger: 70,
    mood: 70,
    createdAt: stamp,
    lastTick: stamp,
    lastPlayedAt: null,
    lastFedAt: null,
    lastGroomedAt: null,
    level: 3,
    xp: 0,
    wins: 8,
    losses: 3,
    rating: 1124,
    pvpWins: 6,
    pvpLosses: 2,
    pvpStreak: 2,
  });
  pets.push({
    id: "pet-coal", name: "Coal", speciesSlug: "pyrlit", tintSlug: "natural", ownerId: SOOK,
    hunger: 80, mood: 80, createdAt: stamp, lastTick: stamp, lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null,
    level: 4, xp: 10, wins: 11, losses: 4, rating: 1188, pvpWins: 8, pvpLosses: 3, pvpStreak: 3,
  });
  pets.push({
    id: "pet-pebble", name: "Pebble", speciesSlug: "glacibun", tintSlug: "natural", ownerId: PELL,
    hunger: 75, mood: 70, createdAt: stamp, lastTick: stamp, lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null,
    level: 2, xp: 4, wins: 5, losses: 4, rating: 1036, pvpWins: 4, pvpLosses: 4, pvpStreak: 1,
  });
  pets.push({
    id: "pet-nib", name: "Nib", speciesSlug: "silkmoth", tintSlug: "natural", ownerId: MINA,
    hunger: 66, mood: 80, createdAt: stamp, lastTick: stamp, lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null,
    level: 2, xp: 8, wins: 2, losses: 5, rating: 960, pvpWins: 2, pvpLosses: 5, pvpStreak: 0,
  });
  for (const species of SPECIES) {
    if (species.exclusive) continue;
    pets.push({
      id: `nest-${species.slug}`,
      name: NEST[species.slug] ?? species.name,
      speciesSlug: species.slug,
      tintSlug: "natural",
      ownerId: null,
      hunger: 70,
      mood: 70,
      createdAt: stamp,
      lastTick: stamp,
      lastPlayedAt: null,
      lastFedAt: null,
      lastGroomedAt: null, level: 1, xp: 0, wins: 0, losses: 0,
    });
  }
  const stacks: StackRow[] = [
    { profileId: owner, itemSlug: "harbor-bun", qty: 2 },
    { profileId: owner, itemSlug: "berry-pocket", qty: 1 },
    { profileId: owner, itemSlug: "ribbon-ball", qty: 1 },
    { profileId: owner, itemSlug: "tide-comb", qty: 1 },
    { profileId: owner, itemSlug: "moss-tea", qty: 1 },
    { profileId: owner, itemSlug: "cinder-fang", qty: 1 },
    { profileId: owner, itemSlug: "kiln-shield", qty: 1 },
    { profileId: owner, itemSlug: "ember-tonic", qty: 2 },
    { profileId: BRAMBLE, itemSlug: "moss-tea", qty: 2 },
  ];
  const stock: Stock[] = [];
  const prices: State["prices"] = [];
  const clocks: Clock[] = [];
  for (const shop of SHOPS) {
    clocks.push({ shopSlug: shop.slug, nextAt: Date.now() + 12 * 60_000 });
    for (const line of shop.stock) {
      stock.push({ shopSlug: shop.slug, itemSlug: line.itemSlug, qty: line.target });
      prices.push({ shopSlug: shop.slug, itemSlug: line.itemSlug, price: line.price });
    }
  }
  const threadId = "thread-lanterns";
  const compThread = "thread-paws";
  return {
    meId: owner,
    people,
    pets,
    stacks,
    ledger: [{ id: uid(), profileId: owner, delta: people.find((p) => p.id === owner)!.glims, balanceAfter: people.find((p) => p.id === owner)!.glims, reason: "signup", createdAt: stamp }],
    claims: [],
    basket: [
      { id: "bask-1", itemSlug: "paper-star", donorId: BRAMBLE },
      { id: "bask-2", itemSlug: "berry-pocket", donorId: MINA },
      { id: "bask-3", itemSlug: "moss-tea", donorId: SOOK },
    ],
    stock,
    clocks,
    prices,
    trades: [
      { id: "trade-rattle", sellerId: BRAMBLE, status: "open", askGlims: 80, wishlist: "", createdAt: stamp, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(), lots: [{ itemSlug: "shell-rattle", qty: 1 }] },
      { id: "trade-buns", sellerId: BRAMBLE, status: "open", askGlims: 40, wishlist: "A moss tea would be kind.", createdAt: stamp, expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(), lots: [{ itemSlug: "spice-bun", qty: 2 }] },
    ],
    offers: [],
    sessions: [],
    scores: [
      { id: "sc1", profileId: BRAMBLE, gameSlug: "lantern-catch", score: 8400, glims: 420, at: stamp },
      { id: "sc2", profileId: MINA, gameSlug: "shoal-pairs", score: 9100, glims: 455, at: stamp },
      { id: "sc3", profileId: PELL, gameSlug: "quay-dash", score: 12000, glims: 600, at: stamp },
      { id: "sc4", profileId: SOOK, gameSlug: "parcel-sort", score: 7000, glims: 350, at: stamp },
      { id: "sc5", profileId: owner, gameSlug: "lantern-catch", score: 6200, glims: 310, at: stamp },
    ],
    threads: [
      { id: threadId, boardSlug: "town-talk", circleSlug: null, authorId: BRAMBLE, title: "The lanterns were early today", locked: false, hidden: false, createdAt: stamp, lastPostAt: stamp },
      { id: compThread, boardSlug: "companions", circleSlug: null, authorId: MINA, title: "Show a paw from the quay", locked: false, hidden: false, createdAt: stamp, lastPostAt: stamp },
    ],
    posts: [
      { id: "post-1", threadId, authorId: BRAMBLE, body: "The Morning Wick caught before I finished my tea. Anyone else see it?", hidden: false, createdAt: stamp },
      { id: "post-2", threadId, authorId: MIRA, body: "Luma noticed first. The whole quay looked gold for a minute.", hidden: false, createdAt: stamp },
      { id: "post-3", threadId: compThread, authorId: MINA, body: "Bub is peckish and still cheerful. Post your lineup if you like.", hidden: false, createdAt: stamp },
    ],
    circles: [
      { id: "circle-lanterns", slug: "quay-lanterns", name: "Quay Lanterns", motto: "Light the long way home.", about: "A harbor circle for ferry watchers and early risers.", isOpen: true },
      { id: "circle-readers", slug: "mossglen-readers", name: "Mossglen Readers", motto: "Tea, then chapters.", about: "A quiet circle on the porch. Open to anyone who wipes their paws.", isOpen: true },
    ],
    members: [
      { circleId: "circle-lanterns", profileId: BRAMBLE, role: "keeper" },
      { circleId: "circle-lanterns", profileId: PELL, role: "member" },
      { circleId: "circle-readers", profileId: SOOK, role: "keeper" },
    ],
    invites: [],
    reports: [],
    rates: {},
    battles: [],
    bouts: [
      { id: "bout-1", at: stamp, challengerId: "pet-coal", defenderId: "pet-inkwell", challengerName: "Coal", challengerOwner: "Sook", defenderName: "Inkwell", defenderOwner: "Bramble", challengerWon: true, rated: true, delta: 14 },
      { id: "bout-2", at: stamp, challengerId: "pet-inkwell", defenderId: "pet-pebble", challengerName: "Inkwell", challengerOwner: "Bramble", defenderName: "Pebble", defenderOwner: "Pell", challengerWon: true, rated: true, delta: 11 },
      { id: "bout-3", at: stamp, challengerId: "pet-luma", defenderId: "pet-nib", challengerName: "Luma", challengerOwner: asSender ? "Sender" : "Mira", defenderName: "Nib", defenderOwner: "Mina", challengerWon: true, rated: true, delta: 18 },
      { id: "bout-4", at: stamp, challengerId: "pet-coal", defenderId: "pet-luma", challengerName: "Coal", challengerOwner: "Sook", defenderName: "Luma", defenderOwner: asSender ? "Sender" : "Mira", challengerWon: true, rated: true, delta: 9 },
    ],
    notices: [
      { id: "note-1", profileId: owner, body: "Luma defended against Coal: lost", at: stamp },
    ],
  };
}

function commit(next: State) {
  const raw = JSON.stringify(next);
  if (raw === lastRaw) return;
  state = next;
  lastRaw = raw;
  localStorage.setItem(storageKey, raw);
  listeners.forEach((fn) => fn());
}
function draft(): State {
  return structuredClone(state);
}
function save(next: State) {
  commit(next);
}

export function subscribeDemo(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function resetDemo() {
  const asSender = state.people.find((p) => p.id === SENDER)?.isAdmin && state.meId === SENDER;
  const next = fresh(Boolean(asSender) || storageKey.endsWith("sender"));
  commit(next);
}
export function bootDemo(asSender: boolean) {
  storageKey = asSender ? "pixelpets-demo-v5-sender" : "pixelpets-demo-v5";
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      state = JSON.parse(saved) as State;
      lastRaw = saved;
      return;
    } catch {
      /* reseed */
    }
  }
  state = fresh(asSender);
  lastRaw = "";
  commit(state);
}

function dailyStatus(s: State, me: Person): DailyStatus {
  const today = wickDateKey();
  const morning = s.claims.find((c) => c.profileId === me.id && c.key === "morning_wick" && c.on === today);
  const tide = s.claims.find((c) => c.profileId === me.id && c.key === "tide_bowl" && c.on === today);
  const basket = s.claims.find((c) => c.profileId === me.id && c.key === "basket" && c.on === today);
  const streak = morning ? me.morningStreak : nextStreak(me.morningStreak, me.morningStreakOn, today);
  return {
    morningClaimed: Boolean(morning),
    streak: me.morningStreak,
    nextMorningGlims: morningPayout(streak),
    tideClaimed: Boolean(tide),
    basketTaken: Number(basket?.payload.count ?? 0),
  };
}

function eloDelta(mine: number, theirs: number, score: number) {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(32 * (score - expected));
}

function demoRankings(s: State, board: "pets" | "keepers" | "week") {
  const me = s.meId;
  const pets = s.pets.filter((pet) => pet.ownerId && pet.speciesSlug !== "crownwyrm");
  if (board === "keepers") {
    const groups = new Map<string, { owner: string; wins: number; rating: number; name: string; speciesSlug: string; yours: boolean }>();
    for (const pet of pets) {
      const key = pet.ownerId ?? "";
      const current = groups.get(key) ?? { owner: usernameOf(s, pet.ownerId) ?? "Keeper", wins: 0, rating: 0, name: pet.name, speciesSlug: pet.speciesSlug, yours: pet.ownerId === me };
      current.wins += pet.pvpWins ?? 0;
      if ((pet.rating ?? 1000) >= current.rating) {
        current.rating = pet.rating ?? 1000;
        current.name = pet.name;
        current.speciesSlug = pet.speciesSlug;
      }
      groups.set(key, current);
    }
    const rows = [...groups.values()].sort((a, b) => b.wins - a.wins || a.owner.localeCompare(b.owner)).slice(0, 40);
    return { board, rows: rows.map((row, index) => ({ rank: index + 1, name: row.name, speciesSlug: row.speciesSlug, owner: row.owner, rating: row.rating, pvpWins: row.wins, yours: row.yours })) };
  }
  if (board === "week") {
    const counts = new Map<string, number>();
    for (const bout of s.bouts ?? []) {
      const winner = bout.challengerWon ? bout.challengerId : bout.defenderId;
      counts.set(winner, (counts.get(winner) ?? 0) + 1);
    }
    const rows = [...counts.entries()].flatMap(([id, weekWins]) => {
      const pet = pets.find((item) => item.id === id);
      return pet ? [{ pet, weekWins }] : [];
    }).sort((a, b) => b.weekWins - a.weekWins || a.pet.name.localeCompare(b.pet.name)).slice(0, 40);
    return {
      board,
      rows: rows.map((row, index) => ({
        rank: index + 1,
        companionId: row.pet.id,
        name: row.pet.name,
        speciesSlug: row.pet.speciesSlug,
        owner: usernameOf(s, row.pet.ownerId) ?? "Keeper",
        rating: row.pet.rating ?? 1000,
        pvpWins: row.pet.pvpWins ?? 0,
        pvpLosses: row.pet.pvpLosses ?? 0,
        pvpStreak: row.pet.pvpStreak ?? 0,
        weekWins: row.weekWins,
        yours: row.pet.ownerId === me,
      })),
    };
  }
  const rows = [...pets].sort((a, b) => (b.rating ?? 1000) - (a.rating ?? 1000) || (b.pvpWins ?? 0) - (a.pvpWins ?? 0) || a.name.localeCompare(b.name)).slice(0, 40);
  return {
    board: "pets",
    rows: rows.map((pet, index) => ({
      rank: index + 1,
      companionId: pet.id,
      name: pet.name,
      speciesSlug: pet.speciesSlug,
      owner: usernameOf(s, pet.ownerId) ?? "Keeper",
      level: pet.level,
      rating: pet.rating ?? 1000,
      pvpWins: pet.pvpWins ?? 0,
      pvpLosses: pet.pvpLosses ?? 0,
      pvpStreak: pet.pvpStreak ?? 0,
      yours: pet.ownerId === me,
    })),
  };
}

export function createDemoApi(asSender: boolean): TownApi {
  bootDemo(asSender);
  const api: TownApi = {
    mode: "demo",
    async getMe() {
      const me = person(state, state.meId);
      return me ? profileView(me) : null;
    },
    async signUp(input) {
      const s = draft();
      const username = checkUsername(input.username);
      const displayName = checkDisplayName(input.displayName);
      if (input.password.length < 8) throw new Error("Use at least 8 characters.");
      if (s.people.some((p) => p.username.toLowerCase() === username.toLowerCase())) throw new Error("That username is already taken.");
      const id = uid();
      s.people.push({ id, username, displayName, bio: "", email: input.email.trim(), isAdmin: false, bannedAt: null, glims: 0, morningStreak: 0, morningStreakOn: null });
      pay(s, id, SIGNUP_GLIMS, "signup");
      s.meId = id;
      save(s);
      return { needsConfirm: false };
    },
    async signIn(email) {
      const s = draft();
      const found = s.people.find((p) => p.email.toLowerCase() === email.trim().toLowerCase()) ?? s.people.find((p) => p.id === (storageKey.endsWith("sender") ? SENDER : MIRA));
      if (!found) throw new Error("No keeper by that mail in the sample town.");
      s.meId = found.id;
      save(s);
    },
    async signOut() {
      const s = draft();
      s.meId = null;
      save(s);
    },
    async requestReset() {
      return;
    },
    async updatePassword() {
      return;
    },
    async updateProfile(patch) {
      const s = draft();
      const me = requireMe(s);
      me.displayName = checkDisplayName(patch.displayName);
      me.bio = checkBio(patch.bio);
      save(s);
    },
    async myCompanions() {
      const s = draft();
      let changed = false;
      for (const pet of s.pets) if (pet.ownerId && pet.ownerId === s.meId) changed = tickPet(pet) || changed;
      if (changed) save(s);
      const source = changed ? s : state;
      return source.pets.filter((p) => p.ownerId && p.ownerId === source.meId).map((p) => viewPet(source, p));
    },
    async getCompanion(id) {
      const s = draft();
      const pet = s.pets.find((p) => p.id === id);
      if (!pet) return null;
      if (tickPet(pet)) save(s);
      const source = state;
      const current = source.pets.find((p) => p.id === id);
      return current ? viewPet(source, current) : null;
    },
    async listNest() {
      const s = draft();
      let changed = false;
      for (const pet of s.pets) if (!pet.ownerId) changed = tickPet(pet) || changed;
      if (changed) save(s);
      const source = changed ? s : state;
      const me = person(source, source.meId);
      return source.pets
        .filter((p) => !p.ownerId)
        .filter((p) => {
          const species = findSpecies(p.speciesSlug);
          return !species?.exclusive || Boolean(me?.isAdmin && !me.bannedAt);
        })
        .map((p) => viewPet(source, p));
    },
    async createCompanion(speciesId, tintId, name) {
      const s = draft();
      const me = requireMe(s);
      if (ownedCount(s, me.id) >= PET_CAP) throw new Error("A keeper may only have four companions.");
      const species = SPECIES.find((sp) => sp.id === speciesId);
      const tint = TINTS.find((t) => t.id === tintId);
      if (!species || !tint) throw new Error("Pick a species and a tint.");
      if (species.exclusive && (!me.isAdmin || me.bannedAt)) throw new Error("That species is kept for stewards.");
      if (species.exclusive && tint.slug !== "natural") throw new Error("This companion keeps its own colors.");
      const clean = checkPetName(name);
      if (s.pets.some((p) => p.name.toLowerCase() === clean.toLowerCase())) throw new Error("That name is already spoken in Lumenwick.");
      const id = uid();
      s.pets.push({ id, name: clean, speciesSlug: species.slug, tintSlug: tint.slug, ownerId: me.id, hunger: 70, mood: 70, createdAt: nowIso(), lastTick: nowIso(), lastPlayedAt: null, lastFedAt: null, lastGroomedAt: null, level: 1, xp: 0, wins: 0, losses: 0 });
      save(s);
      return id;
    },
    async adoptCompanion(id) {
      const s = draft();
      const me = requireMe(s);
      if (ownedCount(s, me.id) >= PET_CAP) throw new Error("A keeper may only have four companions.");
      const pet = s.pets.find((p) => p.id === id);
      if (!pet || pet.ownerId) throw new Error("That companion has already found a keeper.");
      const species = findSpecies(pet.speciesSlug);
      if (species?.exclusive && (!me.isAdmin || me.bannedAt)) throw new Error("That companion is not in the Open Nest.");
      pet.ownerId = me.id;
      save(s);
    },
    async releaseCompanion(id) {
      const s = draft();
      const me = requireMe(s);
      const pet = s.pets.find((p) => p.id === id && p.ownerId === me.id);
      if (!pet) throw new Error("That companion is not with you.");
      if (findSpecies(pet.speciesSlug)?.exclusive) throw new Error("This companion stays with their keeper.");
      pet.ownerId = null;
      save(s);
    },
    async feed(id, item) {
      const s = draft();
      care(s, id, item, "feed");
      save(s);
    },
    async play(id, item) {
      const s = draft();
      care(s, id, item, "play");
      save(s);
    },
    async groom(id, item) {
      const s = draft();
      care(s, id, item, "groom");
      save(s);
    },
    async getGlims() {
      return person(state, state.meId)?.glims ?? 0;
    },
    async satchel() {
      if (!state.meId) return [];
      return stackViews(state, state.meId);
    },
    async dailies() {
      const me = person(state, state.meId);
      if (!me) throw new Error("Sign in to do that.");
      return dailyStatus(state, me);
    },
    async claimMorning() {
      const s = draft();
      const me = requireMe(s);
      const today = wickDateKey();
      if (s.claims.some((c) => c.profileId === me.id && c.key === "morning_wick" && c.on === today)) {
        throw new Error("The Morning Wick is already lit today.");
      }
      const streak = nextStreak(me.morningStreak, me.morningStreakOn, today);
      const glims = morningPayout(streak);
      me.morningStreak = streak;
      me.morningStreakOn = today;
      s.claims.push({ profileId: me.id, key: "morning_wick", on: today, payload: { streak, glims } });
      pay(s, me.id, glims, "morning_wick");
      save(s);
      return { glims, streak };
    },
    async claimTide(companionId) {
      const s = draft();
      const me = requireMe(s);
      const today = wickDateKey();
      if (s.claims.some((c) => c.profileId === me.id && c.key === "tide_bowl" && c.on === today)) {
        throw new Error("The Tide Bowl was already used today.");
      }
      if (companionId) {
        const pet = s.pets.find((p) => p.id === companionId && p.ownerId === me.id);
        if (!pet) throw new Error("Choose one of your companions.");
        tickPet(pet);
        const broth = itemBySlug("tide-broth");
        pet.hunger = Math.min(100, pet.hunger + broth.hunger);
        pet.mood = Math.min(100, pet.mood + broth.mood);
        pet.lastFedAt = nowIso();
      } else give(s, me.id, "tide-broth", 1);
      s.claims.push({ profileId: me.id, key: "tide_bowl", on: today, payload: {} });
      save(s);
    },
    async basket() {
      return state.basket.map((row) => ({ id: row.id, itemSlug: row.itemSlug, name: itemBySlug(row.itemSlug).name, donor: usernameOf(state, row.donorId) }));
    },
    async donate(itemSlug, qty) {
      const s = draft();
      const me = requireMe(s);
      if (qty < 1 || qty > 10) throw new Error("Donate between 1 and 10.");
      findItem(itemSlug);
      take(s, me.id, itemSlug, qty);
      for (let i = 0; i < qty; i += 1) s.basket.push({ id: uid(), itemSlug, donorId: me.id });
      save(s);
    },
    async takeBasket(id) {
      const s = draft();
      const me = requireMe(s);
      const today = wickDateKey();
      const claim = s.claims.find((c) => c.profileId === me.id && c.key === "basket" && c.on === today);
      const count = Number(claim?.payload.count ?? 0);
      if (count >= 3) throw new Error("The Shared Basket allows three takes a day.");
      const row = s.basket.find((b) => b.id === id);
      if (!row) throw new Error("Someone else took that.");
      s.basket = s.basket.filter((b) => b.id !== id);
      give(s, me.id, row.itemSlug, 1);
      if (claim) claim.payload = { count: count + 1 };
      else s.claims.push({ profileId: me.id, key: "basket", on: today, payload: { count: 1 } });
      save(s);
    },
    async shops() {
      const s = draft();
      restock(s);
      save(s);
      return shopViews(state);
    },
    async buy(shopId, itemId, qty, quoted) {
      const s = draft();
      const me = requireMe(s);
      rate(s, me.id, "buy", 2000);
      const shop = SHOPS.find((sh) => sh.id === shopId);
      const item = ITEMS.find((it) => it.id === itemId);
      if (!shop || !item || qty < 1 || qty > 10) throw new Error("That shelf does not have it.");
      restock(s);
      const row = s.stock.find((r) => r.shopSlug === shop.slug && r.itemSlug === item.slug);
      const price = s.prices.find((p) => p.shopSlug === shop.slug && p.itemSlug === item.slug)?.price ?? 0;
      if (quoted !== price) throw new Error("The price changed — have another look.");
      if (!row || row.qty < qty) throw new Error("Sold out — the next restock is on its way.");
      pay(s, me.id, -price * qty, "shop_buy");
      row.qty -= qty;
      give(s, me.id, item.slug, qty);
      save(s);
    },
    async trades() {
      const s = draft();
      expireTrades(s);
      save(s);
      return state.trades.filter((t) => t.status === "open").map((t) => tradeView(state, t));
    },
    async getTrade(id) {
      const s = draft();
      expireTrades(s);
      save(s);
      const trade = state.trades.find((t) => t.id === id);
      return trade ? tradeView(state, trade) : null;
    },
    async createTrade(lines, askGlims, wishlist) {
      const s = draft();
      const me = requireMe(s);
      if (askGlims < 0) throw new Error("Asking price cannot be negative.");
      if (lines.length < 1 || lines.length > 5) throw new Error("List between 1 and 5 stacks.");
      const cleanWish = wishlist.trim();
      if (cleanWish) checkTitle(cleanWish.length > 80 ? cleanWish.slice(0, 80) : cleanWish);
      const lots = lines.map((line) => {
        if (line.qty < 1) throw new Error("Quantity must be at least 1.");
        take(s, me.id, line.itemSlug, line.qty);
        return { itemSlug: line.itemSlug, qty: line.qty };
      });
      const id = uid();
      s.trades.unshift({ id, sellerId: me.id, status: "open", askGlims, wishlist: cleanWish.slice(0, 200), createdAt: nowIso(), expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(), lots });
      save(s);
      return id;
    },
    async cancelTrade(id) {
      const s = draft();
      const me = requireMe(s);
      const trade = s.trades.find((t) => t.id === id && t.sellerId === me.id && t.status === "open");
      if (!trade) throw new Error("That listing is not open.");
      trade.status = "cancelled";
      for (const lot of trade.lots) give(s, me.id, lot.itemSlug, lot.qty);
      refundOffers(s, trade.id, null);
      save(s);
    },
    async buyTrade(id) {
      const s = draft();
      const me = requireMe(s);
      const trade = s.trades.find((t) => t.id === id && t.status === "open");
      if (!trade) throw new Error("That listing is gone.");
      if (trade.sellerId === me.id) throw new Error("You cannot buy your own listing.");
      if (trade.askGlims > 0) {
        pay(s, me.id, -trade.askGlims, "trade");
        pay(s, trade.sellerId, trade.askGlims, "trade");
      }
      for (const lot of trade.lots) give(s, me.id, lot.itemSlug, lot.qty);
      trade.status = "completed";
      refundOffers(s, trade.id, null);
      save(s);
    },
    async offerTrade(id, glims, lines) {
      const s = draft();
      const me = requireMe(s);
      const trade = s.trades.find((t) => t.id === id && t.status === "open");
      if (!trade) throw new Error("That listing is gone.");
      if (trade.sellerId === me.id) throw new Error("You cannot offer on your own listing.");
      if (s.offers.some((o) => o.tradeId === id && o.buyerId === me.id && o.status === "open")) {
        throw new Error("You already have an open offer here.");
      }
      if (glims < 0) throw new Error("Offer Glims cannot be negative.");
      if (glims === 0 && lines.length === 0) throw new Error("Offer Glims, items, or both.");
      if (lines.length > 5) throw new Error("An offer holds up to 5 stacks.");
      const lots = lines.map((line) => {
        take(s, me.id, line.itemSlug, line.qty);
        return line;
      });
      if (glims) pay(s, me.id, -glims, "trade");
      s.offers.push({ id: uid(), tradeId: id, buyerId: me.id, glims, status: "open", lots });
      save(s);
    },
    async withdrawOffer(offerId) {
      const s = draft();
      const me = requireMe(s);
      const offer = s.offers.find((o) => o.id === offerId && o.buyerId === me.id && o.status === "open");
      if (!offer) throw new Error("That offer is not open.");
      offer.status = "withdrawn";
      if (offer.glims) pay(s, me.id, offer.glims, "trade_refund");
      for (const lot of offer.lots) give(s, me.id, lot.itemSlug, lot.qty);
      save(s);
    },
    async acceptOffer(offerId) {
      const s = draft();
      const me = requireMe(s);
      const offer = s.offers.find((o) => o.id === offerId && o.status === "open");
      const trade = offer && s.trades.find((t) => t.id === offer.tradeId && t.status === "open");
      if (!offer || !trade || trade.sellerId !== me.id) throw new Error("That offer cannot be accepted.");
      for (const lot of trade.lots) give(s, offer.buyerId, lot.itemSlug, lot.qty);
      for (const lot of offer.lots) give(s, me.id, lot.itemSlug, lot.qty);
      if (offer.glims) pay(s, me.id, offer.glims, "trade");
      offer.status = "accepted";
      trade.status = "completed";
      refundOffers(s, trade.id, offer.id);
      save(s);
    },
    async scoreboard(gameSlug) {
      const today = wickDateKey();
      const rows: ScoreRow[] = state.scores
        .filter((sc) => sc.gameSlug === gameSlug)
        .map((sc) => ({ id: sc.id, username: usernameOf(state, sc.profileId) ?? "Keeper", gameSlug, score: sc.score, glims: sc.glims, at: sc.at }))
        .sort((a, b) => b.score - a.score);
      return { allTime: rows.slice(0, 10), today: rows.filter((r) => wickDateKey(new Date(r.at)) === today).slice(0, 10) };
    },
    async startGame(gameId) {
      const s = draft();
      const me = requireMe(s);
      rate(s, me.id, "game", 2000);
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) throw new Error("Unknown game.");
      const id = uid();
      const nonce = uid();
      s.sessions.push({ id, nonce, profileId: me.id, gameId, startedAt: Date.now(), status: "open" });
      save(s);
      return { sessionId: id, nonce };
    },
    async submitGame(sessionId, nonce, score) {
      const s = draft();
      const me = requireMe(s);
      const session = s.sessions.find((g) => g.id === sessionId && g.profileId === me.id);
      if (!session || session.status !== "open" || session.nonce !== nonce) throw new Error("That play is not open.");
      const game = GAMES.find((g) => g.id === session.gameId);
      if (!game) throw new Error("Unknown game.");
      const elapsed = Date.now() - session.startedAt;
      if (elapsed > 20 * 60_000) {
        session.status = "expired";
        save(s);
        throw new Error("That play expired.");
      }
      if (elapsed < game.minMs) {
        session.status = "rejected";
        save(s);
        throw new Error("That run was too short to count.");
      }
      const today = wickDateKey();
      const mine = s.scores.filter((sc) => sc.profileId === me.id && sc.gameSlug === game.slug && wickDateKey(new Date(sc.at)) === today);
      if (mine.length >= 3) {
        session.status = "rejected";
        save(s);
        throw new Error("Three scores are already in for this game today.");
      }
      const featured = featuredGame().slug === game.slug;
      let awarded = 0;
      try {
        awarded = awardScore(score, game.scoreCap, featured);
      } catch (error) {
        session.status = "rejected";
        save(s);
        throw error;
      }
      const already = s.scores.filter((sc) => sc.profileId === me.id && wickDateKey(new Date(sc.at)) === today).reduce((sum, sc) => sum + sc.glims, 0);
      const glims = payoutWithDailyCap(awarded, already);
      if (glims) pay(s, me.id, glims, "game");
      session.status = "submitted";
      s.scores.unshift({ id: uid(), profileId: me.id, gameSlug: game.slug, score: awarded, glims, at: nowIso() });
      save(s);
      return { awarded, glims };
    },
    async boards() {
      return BOARDS.map((b) => ({ id: b.id, slug: b.slug, title: b.title, blurb: b.blurb }));
    },
    async threads(boardSlug) {
      const board = BOARDS.find((b) => b.slug === boardSlug);
      if (!board) return [];
      return threadViews(state, state.threads.filter((t) => t.boardSlug === boardSlug && !t.circleSlug));
    },
    async posts(threadId) {
      const thread = state.threads.find((t) => t.id === threadId && !t.hidden);
      if (!thread) return null;
      const posts: PostView[] = state.posts
        .filter((p) => p.threadId === threadId && !p.hidden)
        .map((p) => ({ id: p.id, author: usernameOf(state, p.authorId) ?? "Keeper", authorId: p.authorId, body: p.body, createdAt: p.createdAt }));
      return { thread: threadViews(state, [thread])[0], boardSlug: thread.boardSlug, posts };
    },
    async createThread(boardSlug, title, body) {
      const s = draft();
      const me = requireMe(s);
      let circleSlug: string | null = null;
      let publicSlug = boardSlug;
      if (boardSlug.startsWith("circle:")) {
        circleSlug = boardSlug.slice(7);
        const circle = s.circles.find((c) => c.slug === circleSlug);
        if (!circle || !s.members.some((m) => m.circleId === circle.id && m.profileId === me.id)) {
          throw new Error("That board is for circle members.");
        }
        publicSlug = "circle-notices";
      } else if (!BOARDS.some((b) => b.slug === boardSlug)) throw new Error("Unknown board.");
      const id = uid();
      const cleanTitle = checkTitle(title);
      const cleanBody = checkPostBody(body);
      const stamp = nowIso();
      s.threads.unshift({ id, boardSlug: publicSlug, circleSlug, authorId: me.id, title: cleanTitle, locked: false, hidden: false, createdAt: stamp, lastPostAt: stamp });
      s.posts.push({ id: uid(), threadId: id, authorId: me.id, body: cleanBody, hidden: false, createdAt: stamp });
      save(s);
      return id;
    },
    async reply(threadId, body) {
      const s = draft();
      const me = requireMe(s);
      const thread = s.threads.find((t) => t.id === threadId && !t.hidden);
      if (!thread) throw new Error("That thread is gone.");
      if (thread.locked) throw new Error("This thread is locked.");
      if (thread.circleSlug) {
        const circle = s.circles.find((c) => c.slug === thread.circleSlug);
        if (!circle || !s.members.some((m) => m.circleId === circle.id && m.profileId === me.id)) {
          throw new Error("That board is for circle members.");
        }
      }
      const clean = checkPostBody(body);
      const stamp = nowIso();
      s.posts.push({ id: uid(), threadId, authorId: me.id, body: clean, hidden: false, createdAt: stamp });
      thread.lastPostAt = stamp;
      save(s);
    },
    async report(targetType, targetId, reason) {
      const s = draft();
      const me = requireMe(s);
      const clean = checkPostBody(reason);
      s.reports.unshift({ id: uid(), reporterId: me.id, targetType, targetId, reason: clean, status: "open", createdAt: nowIso() });
      save(s);
    },
    async circles() {
      return circleViews(state);
    },
    async circle(slug) {
      return circleViews(state).find((c) => c.slug === slug) ?? null;
    },
    async circleBoard(slug) {
      const s = state;
      const circle = s.circles.find((c) => c.slug === slug);
      if (!circle) return [];
      const me = person(s, s.meId);
      const allowed = me && (me.isAdmin || s.members.some((m) => m.circleId === circle.id && m.profileId === me.id));
      if (!allowed) return [];
      return threadViews(s, s.threads.filter((t) => t.circleSlug === slug));
    },
    async createCircle(input) {
      const s = draft();
      const me = requireMe(s);
      if (memberOf(s, me.id)) throw new Error("You already keep a Circle. Leave it before starting another.");
      const slug = checkCircleSlug(input.slug);
      const name = checkDisplayName(input.name);
      if (s.circles.some((c) => c.slug === slug)) throw new Error("That circle link is taken.");
      const motto = checkTitle(input.motto || name);
      const about = checkBio(input.about);
      const id = uid();
      s.circles.push({ id, slug, name, motto, about, isOpen: input.isOpen });
      s.members.push({ circleId: id, profileId: me.id, role: "keeper" });
      save(s);
    },
    async joinCircle(id) {
      const s = draft();
      const me = requireMe(s);
      if (memberOf(s, me.id)) throw new Error("You already keep a Circle. Leave it before joining another.");
      const circle = s.circles.find((c) => c.id === id);
      if (!circle || !circle.isOpen) throw new Error("This circle is not taking new keepers.");
      s.members.push({ circleId: id, profileId: me.id, role: "member" });
      save(s);
    },
    async leaveCircle(id) {
      const s = draft();
      const me = requireMe(s);
      const mine = s.members.find((m) => m.circleId === id && m.profileId === me.id);
      if (!mine) throw new Error("You are not in that circle.");
      s.members = s.members.filter((m) => m !== mine);
      const left = s.members.filter((m) => m.circleId === id);
      if (mine.role === "keeper" && left.length && !left.some((m) => m.role === "keeper")) left[0].role = "keeper";
      save(s);
    },
    async inviteCircle(id, username) {
      const s = draft();
      const me = requireMe(s);
      const role = s.members.find((m) => m.circleId === id && m.profileId === me.id);
      if (!role || (role.role !== "keeper" && role.role !== "guide")) throw new Error("Only a keeper or guide can invite.");
      const who = findPersonName(s, username);
      if (!who) throw new Error("No keeper by that name.");
      if (memberOf(s, who.id)) throw new Error("They already keep a Circle.");
      s.invites.push({ id: uid(), circleId: id, inviteeId: who.id, status: "pending" });
      save(s);
    },
    async invites() {
      if (!state.meId) return [];
      return state.invites
        .filter((i) => i.inviteeId === state.meId && i.status === "pending")
        .map((i) => {
          const circle = state.circles.find((c) => c.id === i.circleId);
          return { id: i.id, circleSlug: circle?.slug ?? "", circleName: circle?.name ?? "Circle" };
        });
    },
    async respondInvite(id, accept) {
      const s = draft();
      const me = requireMe(s);
      const invite = s.invites.find((i) => i.id === id && i.inviteeId === me.id && i.status === "pending");
      if (!invite) throw new Error("That invite is gone.");
      invite.status = accept ? "accepted" : "declined";
      if (accept) {
        if (memberOf(s, me.id)) throw new Error("You already keep a Circle.");
        s.members.push({ circleId: invite.circleId, profileId: me.id, role: "member" });
      }
      save(s);
    },
    async keeper(username) {
      const who = findPersonName(state, username);
      if (!who) return null;
      return { profile: profileView(who), companions: state.pets.filter((p) => p.ownerId === who.id).map((p) => viewPet(state, p)) };
    },
    async isAdmin() {
      return Boolean(person(state, state.meId)?.isAdmin);
    },
    async stewardLookup(username) {
      const s = state;
      requireAdmin(draft());
      const who = findPersonName(s, username);
      if (!who) return null;
      const file: StewardFile = {
        profile: profileView(who),
        companions: s.pets.filter((p) => p.ownerId === who.id).map((p) => viewPet(s, p)),
        satchel: stackViews(s, who.id),
        ledger: s.ledger.filter((l) => l.profileId === who.id).slice(0, 20).map((l) => ({ id: l.id, username: who.username, delta: l.delta, balanceAfter: l.balanceAfter, reason: l.reason, createdAt: l.createdAt })),
      };
      return file;
    },
    async stewardGlims(username, delta, note) {
      const s = draft();
      requireAdmin(s);
      checkTitle(note || "steward");
      const who = findPersonName(s, username);
      if (!who) throw new Error("No keeper by that name.");
      pay(s, who.id, Math.trunc(delta), "steward");
      save(s);
    },
    async stewardItem(username, itemSlug, qty) {
      const s = draft();
      requireAdmin(s);
      const who = findPersonName(s, username);
      if (!who) throw new Error("No keeper by that name.");
      findItem(itemSlug);
      if (qty === 0) throw new Error("Quantity cannot be zero.");
      if (qty > 0) give(s, who.id, itemSlug, qty);
      else take(s, who.id, itemSlug, -qty);
      save(s);
    },
    async stewardBan(username, ban, note) {
      const s = draft();
      const admin = requireAdmin(s);
      const who = findPersonName(s, username);
      if (!who || who.id === admin.id) throw new Error("That ban cannot be applied.");
      who.bannedAt = ban ? nowIso() : null;
      if (note) checkTitle(note);
      save(s);
    },
    async stewardHide(postId) {
      const s = draft();
      requireAdmin(s);
      const post = s.posts.find((p) => p.id === postId);
      if (!post) throw new Error("Post not found.");
      post.hidden = !post.hidden;
      save(s);
    },
    async stewardLock(threadId, lock) {
      const s = draft();
      requireAdmin(s);
      const thread = s.threads.find((t) => t.id === threadId);
      if (!thread) throw new Error("Thread not found.");
      thread.locked = lock;
      save(s);
    },
    async stewardRestock(shopId) {
      const s = draft();
      requireAdmin(s);
      const shop = SHOPS.find((sh) => sh.id === shopId) ?? shopBySlug(shopId);
      restock(s, shop.slug);
      save(s);
    },
    async stewardPrice(shopId, itemId, price) {
      const s = draft();
      requireAdmin(s);
      const shop = SHOPS.find((sh) => sh.id === shopId);
      const item = ITEMS.find((it) => it.id === itemId);
      if (!shop || !item || price < 0) throw new Error("Price could not be set.");
      const row = s.prices.find((p) => p.shopSlug === shop.slug && p.itemSlug === item.slug);
      if (row) row.price = price;
      save(s);
    },
    async stewardReports() {
      requireAdmin(draft());
      return state.reports.map((r) => ({
        id: r.id,
        reporter: usernameOf(state, r.reporterId) ?? "Keeper",
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      }));
    },
    async stewardResolve(id, status) {
      const s = draft();
      requireAdmin(s);
      const report = s.reports.find((r) => r.id === id);
      if (!report) throw new Error("Report not found.");
      report.status = status;
      save(s);
    },
    async stewardLedger() {
      requireAdmin(draft());
      return state.ledger.slice(0, 40).map((l) => ({
        id: l.id,
        username: usernameOf(state, l.profileId) ?? "Keeper",
        delta: l.delta,
        balanceAfter: l.balanceAfter,
        reason: l.reason,
        createdAt: l.createdAt,
      }));
    },
    async stewardFlags() {
      requireAdmin(draft());
      return state.scores
        .filter((sc) => {
          const game = gameBySlug(sc.gameSlug);
          return sc.score >= game.scoreCap * 0.97;
        })
        .map((sc) => ({ id: sc.id, username: usernameOf(state, sc.profileId) ?? "Keeper", gameSlug: sc.gameSlug, score: sc.score, at: sc.at }));
    },
    async stewardClearBasket(id) {
      const s = draft();
      requireAdmin(s);
      s.basket = s.basket.filter((b) => b.id !== id);
      save(s);
    },
    async battleOpponents() {
      const me = state.meId;
      return state.pets
        .filter((pet) => pet.ownerId && pet.ownerId !== me && pet.speciesSlug !== "crownwyrm")
        .map((pet) => ({
          id: pet.id,
          name: pet.name,
          speciesSlug: pet.speciesSlug,
          owner: usernameOf(state, pet.ownerId) ?? "Keeper",
          level: pet.level,
          rating: pet.rating ?? 1000,
          pvpWins: pet.pvpWins ?? 0,
          pvpLosses: pet.pvpLosses ?? 0,
          pvpStreak: pet.pvpStreak ?? 0,
        }))
        .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
    },
    async ringRankings(board) {
      return demoRankings(state, board);
    },
    async ringRecent() {
      return (state.bouts ?? []).slice(0, 20).map((bout) => ({
        id: bout.id,
        at: bout.at,
        challenger: bout.challengerName,
        challengerOwner: bout.challengerOwner,
        defender: bout.defenderName,
        defenderOwner: bout.defenderOwner,
        defenderWon: !bout.challengerWon,
        rated: bout.rated,
        ratingDelta: bout.delta,
      }));
    },
    async ringNotices() {
      const me = state.meId;
      return (state.notices ?? []).filter((note) => note.profileId === me).slice(0, 20);
    },
    async startBattle(input) {
      const s = draft();
      const me = requireMe(s);
      rate(s, me.id, "battle", 2000);
      const mine = s.pets.find((pet) => pet.id === input.companionId && pet.ownerId === me.id);
      if (!mine) throw new Error("That companion is not with you.");
      if (s.battles.some((battle) => battle.profileId === me.id && battle.engine.status === "active")) {
        throw new Error("Finish the bout already in the ring.");
      }
      const gear = input.gear.slice(0, 2);
      let weapon = 0;
      let shield = 0;
      let potionHeal = 0;
      for (const slug of gear) {
        const item = itemBySlug(slug);
        if (!s.stacks.some((row) => row.profileId === me.id && row.itemSlug === slug && row.qty > 0)) {
          throw new Error("That gear is not in the satchel.");
        }
        if (item.category === "weapon") weapon += item.gearPower ?? 0;
        else if (item.category === "shield") shield += item.gearPower ?? 0;
        else if (item.category === "potion") potionHeal = Math.max(potionHeal, item.gearPower ?? 0);
        else throw new Error("Only a weapon, a shield, or a sip can be carried in.");
      }
      if (input.mode === "pvp" && mine.speciesSlug === "crownwyrm") {
        throw new Error("Crownwyrm bouts stay out of keeper challenges.");
      }
      let defenderId: string | null = null;
      let rated = false;
      let unratedNote = "";
      const yours = speciesStats(mine.speciesSlug, mine.level);
      const you: Fighter = { name: mine.name, speciesSlug: mine.speciesSlug, hp: yours.maxHp, maxHp: yours.maxHp, atk: yours.atk, def: yours.def, spd: yours.spd, defending: false, weapon, shield, potionHeal, potionLeft: potionHeal > 0, infernoCd: 0, burn: 0 };
      let foe: Fighter;
      if (input.mode === "pve") {
        const challenger = CHALLENGERS.find((row) => row.slug === input.challengerSlug);
        if (!challenger) throw new Error("That challenger is not at the ring.");
        const stats = speciesStats(challenger.speciesSlug, challenger.level);
        foe = { name: challenger.name, speciesSlug: challenger.speciesSlug, hp: stats.maxHp, maxHp: stats.maxHp, atk: stats.atk, def: stats.def, spd: stats.spd, defending: false, weapon: 0, shield: 0, potionHeal: 0, potionLeft: false, infernoCd: 0, burn: 0 };
      } else {
        const defender = s.pets.find((pet) => pet.id === input.defenderId && pet.ownerId && pet.ownerId !== me.id);
        if (!defender) throw new Error("That companion is not waiting for a challenge.");
        if (defender.speciesSlug === "crownwyrm") throw new Error("Crownwyrm bouts stay out of keeper challenges.");
        if (defender.ownerId === me.id) throw new Error("You cannot challenge a companion from your own quay.");
        defenderId = defender.id;
        const today = wickDateKey();
        const pair = (s.bouts ?? []).filter((bout) => bout.rated && bout.at.slice(0, 10) === today && ((bout.challengerId === mine.id && bout.defenderId === defender.id) || (bout.challengerId === defender.id && bout.defenderId === mine.id))).length;
        rated = Math.abs(mine.level - defender.level) <= 8 && Math.abs((mine.rating ?? 1000) - (defender.rating ?? 1000)) <= 400 && pair < 3;
        if (!rated) unratedNote = " This bout will not move ratings.";
        const stats = speciesStats(defender.speciesSlug, defender.level);
        foe = { name: defender.name, speciesSlug: defender.speciesSlug, hp: stats.maxHp, maxHp: stats.maxHp, atk: stats.atk, def: stats.def, spd: stats.spd, defending: false, weapon: 0, shield: 0, potionHeal: 0, potionLeft: false, infernoCd: 0, burn: 0 };
      }
      const id = uid();
      const engine: EngineState = { round: 1, status: "active", you, foe, log: [`${you.name} steps into the Ember Ring against ${foe.name}.${unratedNote}`] };
      s.battles.unshift({ id, profileId: me.id, companionId: mine.id, defenderId, rated, mode: input.mode, engine, rewardGlims: 0, rewardXp: 0, gearSlugs: gear });
      save(s);
      return demoBattleView(state, id);
    },
    async battleTurn(battleId, action) {
      const s = draft();
      const me = requireMe(s);
      rate(s, me.id, "battle-turn", 400);
      const battle = s.battles.find((row) => row.id === battleId && row.profileId === me.id);
      if (!battle || battle.engine.status !== "active") throw new Error("That bout is over.");
      const pet = s.pets.find((row) => row.id === battle.companionId);
      if (!pet) throw new Error("That companion is not with you.");
      resolveTurn(battle.engine, action, () => Math.floor(Math.random() * 100));
      if (battle.engine.status !== "active") {
        const won = battle.engine.status === "won";
        const lost = battle.engine.status === "lost";
        let glims = 0;
        let xp = 0;
        if (won) {
          const tier = battle.mode === "pve" ? (CHALLENGERS.find((row) => row.name === battle.engine.foe.name)?.tier ?? 2) : 3;
          glims = battle.mode === "pve" ? 40 + tier * 30 : 80;
          xp = battle.mode === "pve" ? 20 + tier * 10 : 30;
          const today = wickDateKey();
          const claim = s.claims.find((row) => row.profileId === me.id && row.key === "ember_ring" && row.on === today);
          const count = Number(claim?.payload.count ?? 0);
          const already = Number(claim?.payload.glims ?? 0);
          if (count >= BATTLE_REWARD_COUNT) glims = 0;
          else glims = Math.min(glims, Math.max(0, BATTLE_REWARD_CAP - already));
          if (claim) claim.payload = { count: count + (glims > 0 ? 1 : 0), glims: already + glims };
          else s.claims.push({ profileId: me.id, key: "ember_ring", on: today, payload: { count: glims > 0 ? 1 : 0, glims } });
          pet.wins += 1;
          if (battle.mode === "pve") {
            pet.pveWins = (pet.pveWins ?? 0) + 1;
            pet.pveStreak = (pet.pveStreak ?? 0) + 1;
          }
        } else if (lost) {
          xp = 8;
          pet.losses += 1;
          if (battle.mode === "pve") {
            pet.pveLosses = (pet.pveLosses ?? 0) + 1;
            pet.pveStreak = 0;
          }
        }
        if (battle.mode === "pvp" && (won || lost)) {
          const foe = s.pets.find((row) => row.id === battle.defenderId);
          const delta = battle.rated && foe ? eloDelta(pet.rating ?? 1000, foe.rating ?? 1000, won ? 1 : 0) : 0;
          pet.rating = Math.max(100, (pet.rating ?? 1000) + delta);
          if (won) {
            pet.pvpWins = (pet.pvpWins ?? 0) + 1;
            pet.pvpStreak = (pet.pvpStreak ?? 0) + 1;
          } else {
            pet.pvpLosses = (pet.pvpLosses ?? 0) + 1;
            pet.pvpStreak = 0;
          }
          if (foe) {
            foe.rating = Math.max(100, (foe.rating ?? 1000) - delta);
            if (won) {
              foe.losses += 1;
              foe.pvpLosses = (foe.pvpLosses ?? 0) + 1;
              foe.pvpStreak = 0;
            } else {
              foe.wins += 1;
              foe.pvpWins = (foe.pvpWins ?? 0) + 1;
              foe.pvpStreak = (foe.pvpStreak ?? 0) + 1;
            }
            s.bouts.unshift({
              id: uid(),
              at: nowIso(),
              challengerId: pet.id,
              defenderId: foe.id,
              challengerName: pet.name,
              challengerOwner: usernameOf(s, me.id) ?? "Keeper",
              defenderName: foe.name,
              defenderOwner: usernameOf(s, foe.ownerId) ?? "Keeper",
              challengerWon: won,
              rated: battle.rated,
              delta,
            });
            if (foe.ownerId) {
              s.notices.unshift({
                id: uid(),
                profileId: foe.ownerId,
                at: nowIso(),
                body: `${foe.name} defended against ${pet.name}: ${won ? "lost" : "won"}${battle.rated ? "" : " (unrated)"}`,
              });
            }
          }
          battle.ratingDelta = delta;
          battle.engine.log.push(battle.rated
            ? `${pet.name} rating ${delta >= 0 ? "+" : ""}${delta} (${pet.rating}).`
            : "The gap is too wide, or this pair already fought three rated bouts today. Records move. Ratings stay.");
        }
        const leveled = applyXp(pet.level, pet.xp, xp);
        pet.level = leveled.level;
        pet.xp = leveled.xp;
        battle.rewardGlims = glims;
        battle.rewardXp = xp;
        if (glims) pay(s, me.id, glims, "other");
        battle.engine.log.push(won ? `${pet.name} wins the bout.` : lost ? `${pet.name} yields the ring.` : `${pet.name} leaves the ring.`);
      }
      save(s);
      return demoBattleView(state, battleId);
    },
    async getBattle(id) {
      return state.battles.some((battle) => battle.id === id) ? demoBattleView(state, id) : null;
    },
  };
  return api;
}

function demoBattleView(s: State, id: string): BattleView {
  const battle = s.battles.find((row) => row.id === id);
  if (!battle) throw new Error("That bout is gone.");
  const pet = s.pets.find((row) => row.id === battle.companionId);
  return {
    id: battle.id,
    status: battle.engine.status,
    mode: battle.mode,
    round: battle.engine.round,
    you: { name: battle.engine.you.name, speciesSlug: battle.engine.you.speciesSlug, hp: battle.engine.you.hp, maxHp: battle.engine.you.maxHp, infernoCd: battle.engine.you.infernoCd ?? 0 },
    foe: { name: battle.engine.foe.name, speciesSlug: battle.engine.foe.speciesSlug, hp: battle.engine.foe.hp, maxHp: battle.engine.foe.maxHp, burn: battle.engine.foe.burn ?? 0 },
    log: battle.engine.log,
    rewardGlims: battle.rewardGlims,
    rewardXp: battle.rewardXp,
    level: pet?.level ?? 1,
    xp: pet?.xp ?? 0,
    wins: pet?.wins ?? 0,
    losses: pet?.losses ?? 0,
    rated: battle.rated,
    ratingDelta: battle.ratingDelta ?? 0,
  };
}

export type { BasketRow, BoardView, CircleView, FlaggedGame, InviteView, LedgerRow, ReportRow, PublicKeeper };
