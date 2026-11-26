import { BOARDS, GAMES, ITEMS, itemBySlug, shopBySlug } from "../data/catalog";
import { featuredGame, glimsForScore, morningPayout, nextStreak, wickDateKey, wickMidnight } from "./rules";
import { friendlyDb, getSupabase, readSession, redirectTo } from "./supabase";
import type {
  BasketRow,
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
  PvpTarget,
  RankingBoard,
  RecentBout,
  ReportRow,
  ScoreRow,
  ShopView,
  Stack,
  StewardFile,
  ThreadView,
  TownApi,
  TradeView,
} from "./types";

type DbError = { message: string } | null;

function fail(error: DbError) {
  if (error) throw new Error(friendlyDb(error.message));
}

async function rpc<T>(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await getSupabase().rpc(fn, args);
  fail(error);
  return data as T;
}

async function userId() {
  const session = await readSession();
  if (!session) throw new Error("Sign in to do that.");
  return session.user.id;
}

function asProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  const wallets = row.wallets as unknown as { glims?: number } | { glims?: number }[] | null;
  const glims = Array.isArray(wallets) ? wallets[0]?.glims ?? 0 : wallets?.glims ?? Number(row.glims ?? 0);
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name ?? row.displayName ?? row.username),
    bio: String(row.bio ?? ""),
    isAdmin: Boolean(row.is_admin ?? row.isAdmin),
    bannedAt: (row.banned_at as string | null) ?? (row.bannedAt as string | null) ?? null,
    glims,
    morningStreak: Number(row.morning_streak ?? row.morningStreak ?? 0),
    morningStreakOn: (row.morning_streak_on as string | null) ?? (row.morningStreakOn as string | null) ?? null,
  };
}

export function createLiveApi(): TownApi {
  const sb = () => getSupabase();
  return {
    mode: "live",
    async getMe() {
      const session = await readSession();
      if (!session) return null;
      const { data, error } = await sb().from("profiles").select("*, wallets(glims)").eq("id", session.user.id).maybeSingle();
      fail(error);
      return asProfile(data as Record<string, unknown> | null);
    },
    async signUp(input) {
      const { data, error } = await sb().auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { username: input.username.trim(), display_name: input.displayName.trim() },
          emailRedirectTo: redirectTo(),
        },
      });
      fail(error);
      return { needsConfirm: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
      fail(error);
    },
    async signOut() {
      const { error } = await sb().auth.signOut();
      fail(error);
    },
    async requestReset(email) {
      const { error } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
      fail(error);
    },
    async updatePassword(password) {
      const { error } = await sb().auth.updateUser({ password });
      fail(error);
    },
    async updateProfile(patch) {
      const id = await userId();
      const { error } = await sb().from("profiles").update({ display_name: patch.displayName, bio: patch.bio }).eq("id", id);
      fail(error);
    },
    async myCompanions() {
      return rpc<Companion[]>("list_my_companions");
    },
    async getCompanion(id) {
      return rpc<Companion | null>("get_companion", { p_companion_id: id });
    },
    async listNest() {
      return rpc<Companion[]>("list_open_nest");
    },
    async createCompanion(speciesId, tintId, name) {
      return rpc<string>("create_companion", { p_species_id: speciesId, p_tint_id: tintId, p_name: name });
    },
    async adoptCompanion(id) {
      await rpc("adopt_companion", { p_companion_id: id });
    },
    async releaseCompanion(id) {
      await rpc("release_companion", { p_companion_id: id });
    },
    async feed(companionId, itemSlug) {
      await rpc("feed_companion", { p_companion_id: companionId, p_item_id: itemBySlug(itemSlug).id });
    },
    async play(companionId, itemSlug) {
      await rpc("play_companion", { p_companion_id: companionId, p_item_id: itemBySlug(itemSlug).id });
    },
    async groom(companionId, itemSlug) {
      await rpc("groom_companion", { p_companion_id: companionId, p_item_id: itemBySlug(itemSlug).id });
    },
    async getGlims() {
      const id = await userId();
      const { data, error } = await sb().from("wallets").select("glims").eq("profile_id", id).maybeSingle();
      fail(error);
      return data?.glims ?? 0;
    },
    async satchel() {
      const id = await userId();
      const { data, error } = await sb().from("satchel_stacks").select("qty, item:item_id(slug, name, category, description, reusable, hunger_delta, mood_delta, gear_power)").eq("profile_id", id);
      fail(error);
      return ((data ?? []) as unknown as { qty: number; item: { slug: string; name: string; category: string; description: string; reusable: boolean; hunger_delta: number; mood_delta: number; gear_power: number } }[]).map((row) => ({
        itemSlug: row.item.slug,
        name: row.item.name,
        qty: row.qty,
        category: row.item.category,
        description: row.item.description,
        reusable: row.item.reusable,
        hunger: row.item.hunger_delta,
        mood: row.item.mood_delta,
        gearPower: row.item.gear_power,
      }));
    },
    async dailies() {
      const me = await this.getMe();
      if (!me) throw new Error("Sign in to do that.");
      const today = wickDateKey();
      const { data, error } = await sb().from("daily_claims").select("daily_key, payload").eq("profile_id", me.id).eq("claimed_on", today);
      fail(error);
      const rows = (data ?? []) as unknown as { daily_key: string; payload: { count?: number } | null }[];
      const morning = rows.some((r) => r.daily_key === "morning_wick");
      const streak = morning ? me.morningStreak : nextStreak(me.morningStreak, me.morningStreakOn, today);
      const basket = rows.find((r) => r.daily_key === "basket");
      const status: DailyStatus = {
        morningClaimed: morning,
        streak: me.morningStreak,
        nextMorningGlims: morningPayout(streak),
        tideClaimed: rows.some((r) => r.daily_key === "tide_bowl"),
        basketTaken: Number(basket?.payload?.count ?? 0),
      };
      return status;
    },
    async claimMorning() {
      return rpc<{ glims: number; streak: number }>("claim_morning_wick");
    },
    async claimTide(companionId) {
      await rpc("claim_tide_bowl", { p_companion_id: companionId });
    },
    async basket() {
      const { data, error } = await sb().from("basket_items").select("id, item:item_id(slug, name, category, description, reusable, hunger_delta, mood_delta, gear_power), donor:donated_by(username)").order("created_at");
      fail(error);
      return ((data ?? []) as unknown as { id: string; item: { slug: string; name: string; category: string; description: string; reusable: boolean; hunger_delta: number; mood_delta: number; gear_power: number }; donor: { username: string } | null }[]).map((row) => ({
        id: row.id,
        itemSlug: row.item.slug,
        name: row.item.name,
        donor: row.donor?.username ?? null,
        category: row.item.category,
        description: row.item.description,
        reusable: row.item.reusable,
        hunger: row.item.hunger_delta,
        mood: row.item.mood_delta,
        gearPower: row.item.gear_power,
      }));
    },
    async donate(itemSlug, qty) {
      await rpc("donate_to_basket", { p_item_id: itemBySlug(itemSlug).id, p_qty: qty });
    },
    async takeBasket(id) {
      await rpc("take_from_basket", { p_basket_item_id: id });
    },
    async shops() {
      await rpc("restock_shops");
      const { data, error } = await sb().from("shops").select("id, slug, name, keeper_name, blurb, next_restock_at, land:land_id(slug, name), shop_stock(qty, price, item:item_id(id, slug, name, category, rarity, description, hunger_delta, mood_delta, reusable, gear_power))");
      fail(error);
      return ((data ?? []) as Record<string, unknown>[]).map((shop) => {
        const land = shop.land as unknown as { slug: string; name: string };
        const lines = (shop.shop_stock as Record<string, unknown>[]) ?? [];
        return {
          id: String(shop.id),
          slug: String(shop.slug),
          name: String(shop.name),
          keeper: String(shop.keeper_name),
          blurb: String(shop.blurb),
          landSlug: land.slug,
          landName: land.name,
          nextRestockAt: String(shop.next_restock_at),
          lines: lines.map((line) => {
            const item = line.item as Record<string, unknown>;
            return {
              itemId: String(item.id),
              itemSlug: String(item.slug),
              name: String(item.name),
              price: Number(line.price),
              qty: Number(line.qty),
              category: String(item.category),
              rarity: String(item.rarity),
              description: String(item.description),
              hunger: Number(item.hunger_delta),
              mood: Number(item.mood_delta),
              reusable: Boolean(item.reusable),
              gearPower: Number(item.gear_power ?? 0),
            };
          }),
        } satisfies ShopView;
      });
    },
    async buy(shopId, itemId, qty, quotedPrice) {
      await rpc("buy_from_shop", { p_shop_id: shopId, p_item_id: itemId, p_qty: qty, p_quoted_price: quotedPrice });
    },
    async trades() {
      await rpc("expire_trades");
      return loadTrades(null);
    },
    async getTrade(id) {
      await rpc("expire_trades");
      const rows = await loadTrades(id);
      return rows[0] ?? null;
    },
    async createTrade(lines, askGlims, wishlist) {
      return rpc<string>("create_trade", {
        p_lines: lines.map((line) => ({ item_id: itemBySlug(line.itemSlug).id, qty: line.qty })),
        p_ask_glims: askGlims,
        p_wishlist: wishlist,
      });
    },
    async cancelTrade(id) {
      await rpc("cancel_trade", { p_trade_id: id });
    },
    async buyTrade(id) {
      await rpc("buy_trade", { p_trade_id: id });
    },
    async offerTrade(id, glims, lines) {
      await rpc("offer_trade", {
        p_trade_id: id,
        p_glims: glims,
        p_lines: lines.map((line) => ({ item_id: itemBySlug(line.itemSlug).id, qty: line.qty })),
      });
    },
    async withdrawOffer(offerId) {
      await rpc("withdraw_offer", { p_offer_id: offerId });
    },
    async acceptOffer(offerId) {
      await rpc("accept_offer", { p_offer_id: offerId });
    },
    async scoreboard(gameSlug) {
      const { data, error } = await sb().from("game_scoreboard").select("*").eq("game_slug", gameSlug).order("awarded_score", { ascending: false }).limit(40);
      fail(error);
      const start = wickMidnight().toISOString();
      const rows = ((data ?? []) as unknown as { id: string; username: string; game_slug: string; awarded_score: number; awarded_glims: number; ended_at: string }[]).map((row) => ({
        id: row.id,
        username: row.username,
        gameSlug: row.game_slug,
        score: row.awarded_score,
        glims: row.awarded_glims,
        at: row.ended_at,
      }));
      return { allTime: rows.slice(0, 10), today: rows.filter((row) => row.at >= start).slice(0, 10) };
    },
    async startGame(gameId) {
      const row = await rpc<{ session_id: string; nonce: string }>("start_game", { p_game_id: gameId });
      return { sessionId: row.session_id, nonce: row.nonce };
    },
    async submitGame(sessionId, nonce, score) {
      return rpc<{ awarded: number; glims: number }>("submit_game", { p_session_id: sessionId, p_nonce: nonce, p_client_score: score });
    },
    async boards() {
      const { data, error } = await sb().from("forum_boards").select("id, slug, title, blurb").is("circle_id", null).order("sort_order");
      fail(error);
      return (data ?? []) as BoardView[];
    },
    async threads(boardSlug) {
      const board = BOARDS.find((b) => b.slug === boardSlug);
      const boardId = board?.id;
      if (!boardId) return [];
      const { data, error } = await sb().from("forum_threads").select("id, title, is_locked, created_at, last_post_at, author:author_id(username)").eq("board_id", boardId).order("last_post_at", { ascending: false }).limit(30);
      fail(error);
      return ((data ?? []) as unknown as { id: string; title: string; is_locked: boolean; created_at: string; last_post_at: string; author: { username: string } }[]).map((row) => ({
        id: row.id,
        title: row.title,
        author: row.author?.username ?? "Keeper",
        locked: row.is_locked,
        createdAt: row.created_at,
        lastPostAt: row.last_post_at,
      }));
    },
    async posts(threadId) {
      const { data: thread, error } = await sb().from("forum_threads").select("id, title, is_locked, created_at, last_post_at, board:board_id(slug), author:author_id(username)").eq("id", threadId).maybeSingle();
      fail(error);
      if (!thread) return null;
      const { data: posts, error: postError } = await sb().from("forum_posts").select("id, body, created_at, author_id, author:author_id(username)").eq("thread_id", threadId).order("created_at");
      fail(postError);
      const row = thread as unknown as { id: string; title: string; is_locked: boolean; created_at: string; last_post_at: string; board: { slug: string }; author: { username: string } };
      return {
        thread: { id: row.id, title: row.title, author: row.author?.username ?? "Keeper", locked: row.is_locked, createdAt: row.created_at, lastPostAt: row.last_post_at },
        boardSlug: row.board?.slug ?? "",
        posts: ((posts ?? []) as unknown as { id: string; body: string; created_at: string; author_id: string; author: { username: string } }[]).map((post) => ({
          id: post.id,
          author: post.author?.username ?? "Keeper",
          authorId: post.author_id,
          body: post.body,
          createdAt: post.created_at,
        })),
      };
    },
    async createThread(boardSlug, title, body) {
      if (boardSlug.startsWith("circle:")) {
        const { data, error } = await sb().from("circles").select("id").eq("slug", boardSlug.slice(7)).maybeSingle();
        fail(error);
        if (!data) throw new Error("Unknown circle.");
        return rpc<string>("create_circle_thread", { p_circle_id: data.id, p_title: title, p_body: body });
      }
      const board = BOARDS.find((b) => b.slug === boardSlug);
      if (!board) throw new Error("Unknown board.");
      return rpc<string>("create_thread", { p_board_id: board.id, p_title: title, p_body: body });
    },
    async reply(threadId, body) {
      await rpc("create_post", { p_thread_id: threadId, p_body: body });
    },
    async report(targetType, targetId, reason) {
      await rpc("report_content", { p_target_type: targetType, p_target_id: targetId, p_reason: reason });
    },
    async circles() {
      return loadCircles(null);
    },
    async circle(slug) {
      const rows = await loadCircles(slug);
      return rows[0] ?? null;
    },
    async circleBoard(slug) {
      const { data: circle, error } = await sb().from("circles").select("id").eq("slug", slug).maybeSingle();
      fail(error);
      if (!circle) return [];
      const { data: board, error: boardError } = await sb().from("forum_boards").select("id").eq("circle_id", circle.id).maybeSingle();
      fail(boardError);
      if (!board) return [];
      const { data, error: threadError } = await sb().from("forum_threads").select("id, title, is_locked, created_at, last_post_at, author:author_id(username)").eq("board_id", board.id).order("last_post_at", { ascending: false });
      fail(threadError);
      return ((data ?? []) as unknown as { id: string; title: string; is_locked: boolean; created_at: string; last_post_at: string; author: { username: string } }[]).map((row) => ({
        id: row.id,
        title: row.title,
        author: row.author?.username ?? "Keeper",
        locked: row.is_locked,
        createdAt: row.created_at,
        lastPostAt: row.last_post_at,
      }));
    },
    async createCircle(input) {
      await rpc("create_circle", { p_name: input.name, p_slug: input.slug, p_motto: input.motto, p_about: input.about, p_is_open: input.isOpen });
    },
    async joinCircle(id) {
      await rpc("join_circle", { p_circle_id: id });
    },
    async leaveCircle(id) {
      await rpc("leave_circle", { p_circle_id: id });
    },
    async inviteCircle(id, username) {
      await rpc("invite_to_circle", { p_circle_id: id, p_username: username });
    },
    async invites() {
      const id = await userId().catch(() => null);
      if (!id) return [];
      const { data, error } = await sb().from("circle_invites").select("id, circle:circle_id(name, slug)").eq("invitee_id", id).eq("status", "pending");
      fail(error);
      return ((data ?? []) as unknown as { id: string; circle: { name: string; slug: string } }[]).map((row) => ({ id: row.id, circleSlug: row.circle.slug, circleName: row.circle.name }));
    },
    async respondInvite(id, accept) {
      await rpc("respond_invite", { p_invite_id: id, p_accept: accept });
    },
    async keeper(username) {
      const { data, error } = await sb().from("profiles").select("*, wallets(glims)").ilike("username", username).maybeSingle();
      fail(error);
      const profile = asProfile(data as Record<string, unknown> | null);
      if (!profile || profile.username.toLowerCase() !== username.toLowerCase()) return null;
      const companions = await rpc<Companion[]>("list_companions_of", { p_username: profile.username });
      return { profile, companions };
    },
    async isAdmin() {
      const me = await this.getMe();
      return Boolean(me?.isAdmin);
    },
    async stewardLookup(username) {
      return rpc<StewardFile | null>("steward_lookup", { p_username: username });
    },
    async stewardGlims(username, delta, note) {
      await rpc("steward_adjust_glims", { p_username: username, p_delta: delta, p_note: note });
    },
    async stewardItem(username, itemSlug, qty) {
      await rpc("steward_grant_item", { p_username: username, p_item_id: itemBySlug(itemSlug).id, p_qty: qty });
    },
    async stewardBan(username, ban, note) {
      await rpc("steward_ban", { p_username: username, p_ban: ban, p_note: note });
    },
    async stewardHide(postId) {
      await rpc("steward_hide_post", { p_post_id: postId, p_hide: true });
    },
    async stewardLock(threadId, lock) {
      await rpc("steward_lock_thread", { p_thread_id: threadId, p_lock: lock });
    },
    async stewardRestock(shopId) {
      await rpc("steward_force_restock", { p_shop_id: shopId });
    },
    async stewardPrice(shopId, itemId, price) {
      await rpc("steward_set_price", { p_shop_id: shopId, p_item_id: itemId, p_price: price });
    },
    async stewardReports() {
      const { data, error } = await sb().from("reports").select("id, target_type, target_id, reason, status, created_at, reporter:reporter_id(username)").order("created_at", { ascending: false }).limit(50);
      fail(error);
      return ((data ?? []) as unknown as { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; reporter: { username: string } }[]).map((row) => ({
        id: row.id,
        reporter: row.reporter?.username ?? "Keeper",
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
      }));
    },
    async stewardResolve(id, status) {
      await rpc("steward_resolve_report", { p_report_id: id, p_status: status });
    },
    async stewardLedger() {
      const { data, error } = await sb().from("glim_ledger").select("id, delta, balance_after, reason, created_at, profile:profile_id(username)").order("created_at", { ascending: false }).limit(40);
      fail(error);
      return ((data ?? []) as unknown as { id: string; delta: number; balance_after: number; reason: string; created_at: string; profile: { username: string } }[]).map((row) => ({
        id: row.id,
        username: row.profile?.username ?? "Keeper",
        delta: row.delta,
        balanceAfter: row.balance_after,
        reason: row.reason,
        createdAt: row.created_at,
      }));
    },
    async stewardFlags() {
      return rpc<FlaggedGame[]>("steward_flagged_games");
    },
    async stewardClearBasket(id) {
      await rpc("steward_clear_basket", { p_basket_item_id: id });
    },
    async battleOpponents() {
      return rpc<PvpTarget[]>("list_pvp_targets");
    },
    async ringRankings(board) {
      return rpc<RankingBoard>("ring_rankings", { p_board: board });
    },
    async ringRecent() {
      return rpc<RecentBout[]>("ring_recent");
    },
    async ringNotices() {
      return rpc<{ id: string; body: string; at: string }[]>("ring_notices");
    },
    async startBattle(input) {
      return rpc("start_battle", {
        p_companion_id: input.companionId,
        p_mode: input.mode,
        p_challenger_slug: input.challengerSlug ?? null,
        p_defender_id: input.defenderId ?? null,
        p_gear: input.gear.map((slug) => itemBySlug(slug).id),
      });
    },
    async battleTurn(battleId, action) {
      return rpc("battle_turn", { p_battle_id: battleId, p_action: action });
    },
    async getBattle(id) {
      return rpc("get_battle", { p_battle_id: id });
    },
  };
}

async function loadTrades(id: string | null): Promise<TradeView[]> {
  let query = getSupabase().from("trades").select("id, seller_id, status, ask_glims, wishlist, created_at, expires_at, seller:seller_id(username), trade_lots(qty, item:item_id(slug, name, category, description, reusable, hunger_delta, mood_delta, gear_power)), trade_offers(id, buyer_id, glims, status, buyer:buyer_id(username), trade_offer_items(qty, item:item_id(slug, name, category, description, reusable, hunger_delta, mood_delta, gear_power)))").order("created_at", { ascending: false });
  query = id ? query.eq("id", id) : query.eq("status", "open");
  const { data, error } = await query;
  fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map(mapTrade);
}

function mapTrade(row: Record<string, unknown>): TradeView {
  const seller = row.seller as unknown as { username: string };
  const lots = (row.trade_lots as unknown as { qty: number; item: { slug: string; name: string; category: string; description: string; reusable: boolean; hunger_delta: number; mood_delta: number; gear_power: number } }[]) ?? [];
  const offers = (row.trade_offers as Record<string, unknown>[]) ?? [];
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    seller: seller?.username ?? "Keeper",
    status: String(row.status),
    askGlims: Number(row.ask_glims),
    wishlist: String(row.wishlist ?? ""),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    lots: lots.map((lot) => ({
      itemSlug: lot.item.slug,
      name: lot.item.name,
      qty: lot.qty,
      category: lot.item.category,
      description: lot.item.description,
      reusable: lot.item.reusable,
      hunger: lot.item.hunger_delta,
      mood: lot.item.mood_delta,
      gearPower: lot.item.gear_power,
    })),
    offers: offers.map((offer) => {
      const buyer = offer.buyer as unknown as { username: string };
      const items = (offer.trade_offer_items as unknown as { qty: number; item: { slug: string; name: string; category: string; description: string; reusable: boolean; hunger_delta: number; mood_delta: number; gear_power: number } }[]) ?? [];
      return {
        id: String(offer.id),
        buyerId: String(offer.buyer_id),
        buyer: buyer?.username ?? "Keeper",
        glims: Number(offer.glims),
        status: String(offer.status),
        lots: items.map((lot) => ({
          itemSlug: lot.item.slug,
          name: lot.item.name,
          qty: lot.qty,
          category: lot.item.category,
          description: lot.item.description,
          reusable: lot.item.reusable,
          hunger: lot.item.hunger_delta,
          mood: lot.item.mood_delta,
          gearPower: lot.item.gear_power,
        })),
      };
    }),
  };
}

async function loadCircles(slug: string | null): Promise<CircleView[]> {
  let query = getSupabase().from("circles").select("id, slug, name, motto, about, is_open, circle_members(role, profile:profile_id(username))");
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query;
  fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    motto: String(row.motto ?? ""),
    about: String(row.about ?? ""),
    isOpen: Boolean(row.is_open),
    members: ((row.circle_members as unknown as { role: string; profile: { username: string } }[]) ?? []).map((member) => ({
      username: member.profile?.username ?? "Keeper",
      role: member.role,
    })),
  }));
}

void glimsForScore;
void featuredGame;
void GAMES;
void ITEMS;
void shopBySlug;
export type { BasketRow, InviteView, LedgerRow, PostView, PublicKeeper, ReportRow, ScoreRow, Stack, ThreadView };
