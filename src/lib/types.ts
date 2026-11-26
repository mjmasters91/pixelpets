export type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  isAdmin: boolean;
  bannedAt: string | null;
  glims: number;
  morningStreak: number;
  morningStreakOn: string | null;
};

export type Companion = {
  id: string;
  name: string;
  speciesSlug: string;
  speciesName: string;
  tintSlug: string;
  tintName: string;
  ownerId: string | null;
  ownerUsername: string | null;
  hunger: number;
  mood: number;
  createdAt: string;
  lastPlayedAt: string | null;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  rating: number;
  pveWins: number;
  pveLosses: number;
  pveStreak: number;
  pvpWins: number;
  pvpLosses: number;
  pvpStreak: number;
};

export type Stack = {
  itemSlug: string;
  name: string;
  qty: number;
  category: string;
  reusable: boolean;
  hunger: number;
  mood: number;
};

export type DailyStatus = {
  morningClaimed: boolean;
  streak: number;
  nextMorningGlims: number;
  tideClaimed: boolean;
  basketTaken: number;
};

export type BasketRow = {
  id: string;
  itemSlug: string;
  name: string;
  donor: string | null;
};

export type ShopLine = {
  itemId: string;
  itemSlug: string;
  name: string;
  price: number;
  qty: number;
  category: string;
  rarity: string;
  description: string;
  hunger: number;
  mood: number;
  reusable: boolean;
};

export type ShopView = {
  id: string;
  slug: string;
  name: string;
  keeper: string;
  blurb: string;
  landSlug: string;
  landName: string;
  nextRestockAt: string;
  lines: ShopLine[];
};

export type TradeLot = { itemSlug: string; name: string; qty: number };
export type TradeOffer = {
  id: string;
  buyerId: string;
  buyer: string;
  glims: number;
  status: string;
  lots: TradeLot[];
};

export type TradeView = {
  id: string;
  sellerId: string;
  seller: string;
  status: string;
  askGlims: number;
  wishlist: string;
  createdAt: string;
  expiresAt: string;
  lots: TradeLot[];
  offers: TradeOffer[];
};

export type ScoreRow = {
  id: string;
  username: string;
  gameSlug: string;
  score: number;
  glims: number;
  at: string;
};

export type BoardView = { id: string; slug: string; title: string; blurb: string };
export type ThreadView = {
  id: string;
  title: string;
  author: string;
  locked: boolean;
  createdAt: string;
  lastPostAt: string;
};
export type PostView = { id: string; author: string; authorId: string; body: string; createdAt: string };

export type CircleView = {
  id: string;
  slug: string;
  name: string;
  motto: string;
  about: string;
  isOpen: boolean;
  members: { username: string; role: string }[];
};

export type InviteView = { id: string; circleSlug: string; circleName: string };

export type PublicKeeper = {
  profile: Profile;
  companions: Companion[];
};

export type LedgerRow = {
  id: string;
  username: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

export type ReportRow = {
  id: string;
  reporter: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export type StewardFile = {
  profile: Profile;
  companions: Companion[];
  satchel: Stack[];
  ledger: LedgerRow[];
};

export type FlaggedGame = {
  id: string;
  username: string;
  gameSlug: string;
  score: number;
  at: string;
};

export type TownApi = {
  mode: "demo" | "live";
  getMe(): Promise<Profile | null>;
  signUp(input: { email: string; password: string; username: string; displayName: string }): Promise<{ needsConfirm: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  updateProfile(patch: { displayName: string; bio: string }): Promise<void>;
  myCompanions(): Promise<Companion[]>;
  getCompanion(id: string): Promise<Companion | null>;
  listNest(): Promise<Companion[]>;
  createCompanion(speciesId: string, tintId: string, name: string): Promise<string>;
  adoptCompanion(id: string): Promise<void>;
  releaseCompanion(id: string): Promise<void>;
  feed(companionId: string, itemSlug: string): Promise<void>;
  play(companionId: string, itemSlug: string): Promise<void>;
  groom(companionId: string, itemSlug: string): Promise<void>;
  getGlims(): Promise<number>;
  satchel(): Promise<Stack[]>;
  dailies(): Promise<DailyStatus>;
  claimMorning(): Promise<{ glims: number; streak: number }>;
  claimTide(companionId: string | null): Promise<void>;
  basket(): Promise<BasketRow[]>;
  donate(itemSlug: string, qty: number): Promise<void>;
  takeBasket(id: string): Promise<void>;
  shops(): Promise<ShopView[]>;
  buy(shopId: string, itemId: string, qty: number, quotedPrice: number): Promise<void>;
  trades(): Promise<TradeView[]>;
  getTrade(id: string): Promise<TradeView | null>;
  createTrade(lines: { itemSlug: string; qty: number }[], askGlims: number, wishlist: string): Promise<string>;
  cancelTrade(id: string): Promise<void>;
  buyTrade(id: string): Promise<void>;
  offerTrade(id: string, glims: number, lines: { itemSlug: string; qty: number }[]): Promise<void>;
  withdrawOffer(offerId: string): Promise<void>;
  acceptOffer(offerId: string): Promise<void>;
  scoreboard(gameSlug: string): Promise<{ today: ScoreRow[]; allTime: ScoreRow[] }>;
  startGame(gameId: string): Promise<{ sessionId: string; nonce: string }>;
  submitGame(sessionId: string, nonce: string, score: number): Promise<{ awarded: number; glims: number }>;
  boards(): Promise<BoardView[]>;
  threads(boardSlug: string): Promise<ThreadView[]>;
  posts(threadId: string): Promise<{ thread: ThreadView; boardSlug: string; posts: PostView[] } | null>;
  createThread(boardSlug: string, title: string, body: string): Promise<string>;
  reply(threadId: string, body: string): Promise<void>;
  report(targetType: string, targetId: string, reason: string): Promise<void>;
  circles(): Promise<CircleView[]>;
  circle(slug: string): Promise<CircleView | null>;
  circleBoard(slug: string): Promise<ThreadView[]>;
  createCircle(input: { name: string; slug: string; motto: string; about: string; isOpen: boolean }): Promise<void>;
  joinCircle(id: string): Promise<void>;
  leaveCircle(id: string): Promise<void>;
  inviteCircle(id: string, username: string): Promise<void>;
  invites(): Promise<InviteView[]>;
  respondInvite(id: string, accept: boolean): Promise<void>;
  keeper(username: string): Promise<PublicKeeper | null>;
  isAdmin(): Promise<boolean>;
  stewardLookup(username: string): Promise<StewardFile | null>;
  stewardGlims(username: string, delta: number, note: string): Promise<void>;
  stewardItem(username: string, itemSlug: string, qty: number): Promise<void>;
  stewardBan(username: string, ban: boolean, note: string): Promise<void>;
  stewardHide(postId: string): Promise<void>;
  stewardLock(threadId: string, lock: boolean): Promise<void>;
  stewardRestock(shopId: string): Promise<void>;
  stewardPrice(shopId: string, itemId: string, price: number): Promise<void>;
  stewardReports(): Promise<ReportRow[]>;
  stewardResolve(id: string, status: "resolved" | "dismissed"): Promise<void>;
  stewardLedger(): Promise<LedgerRow[]>;
  stewardFlags(): Promise<FlaggedGame[]>;
  stewardClearBasket(id: string): Promise<void>;
  battleOpponents(): Promise<PvpTarget[]>;
  ringRankings(board: "pets" | "keepers" | "week"): Promise<RankingBoard>;
  ringRecent(): Promise<RecentBout[]>;
  ringNotices(): Promise<{ id: string; body: string; at: string }[]>;
  startBattle(input: { companionId: string; mode: "pve" | "pvp"; challengerSlug?: string; defenderId?: string; gear: string[] }): Promise<BattleView>;
  battleTurn(battleId: string, action: "attack" | "defend" | "item" | "flee" | "inferno"): Promise<BattleView>;
  getBattle(id: string): Promise<BattleView | null>;
};

export type BattleView = {
  id: string;
  status: "active" | "won" | "lost" | "fled";
  mode: "pve" | "pvp";
  round: number;
  you: { name: string; speciesSlug: string; hp: number; maxHp: number; infernoCd: number };
  foe: { name: string; speciesSlug: string; hp: number; maxHp: number; burn: number };
  log: string[];
  rewardGlims: number;
  rewardXp: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  rated?: boolean;
  ratingDelta?: number;
};

export type PvpTarget = {
  id: string;
  name: string;
  speciesSlug: string;
  owner: string;
  level: number;
  rating: number;
  pvpWins: number;
  pvpLosses: number;
  pvpStreak: number;
};

export type RankRow = {
  rank: number;
  companionId?: string;
  name: string;
  speciesSlug: string;
  owner: string;
  level?: number;
  rating: number;
  pvpWins: number;
  pvpLosses?: number;
  pvpStreak?: number;
  weekWins?: number;
  yours?: boolean;
};

export type RankingBoard = { board: string; rows: RankRow[] };

export type RecentBout = {
  id: string;
  at: string;
  challenger: string;
  challengerOwner: string;
  defender: string;
  defenderOwner: string;
  defenderWon: boolean;
  rated: boolean;
  ratingDelta: number;
};
