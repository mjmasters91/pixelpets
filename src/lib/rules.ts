import { DAILY_GAME_GLIM_CAP, GAMES, GLIM_CAP_PER_PLAY, GLIM_PER_SCORE } from "../data/catalog";

const ZONE = "America/Chicago";

export function zonedParts(date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return parts as {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
  };
}

export function wickDateKey(date = new Date()) {
  const p = zonedParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function wickClock(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function wickDayOfYear(date = new Date()) {
  const key = wickDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const cur = Date.UTC(y, m - 1, d);
  return Math.floor((cur - start) / 86400000) + 1;
}

export function wickMidnight(date = new Date()) {
  const key = wickDateKey(date);
  const noonUtc = new Date(`${key}T12:00:00Z`);
  const p = zonedParts(noonUtc);
  const chicagoAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = chicagoAsUtc - noonUtc.getTime();
  const [y, m, d] = key.split("-").map(Number);
  const localMidnightUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(localMidnightUtc - offset);
}

export function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${month}-${day}`;
}

export function hungerBand(n: number) {
  if (n >= 80) return "Stuffed";
  if (n >= 55) return "Content";
  if (n >= 35) return "Peckish";
  if (n >= 15) return "Hungry";
  if (n >= 1) return "Rumbly";
  return "Hollow";
}

export function moodBand(n: number) {
  if (n >= 80) return "Beaming";
  if (n >= 55) return "Cheerful";
  if (n >= 35) return "Settled";
  if (n >= 15) return "Restless";
  if (n >= 1) return "Gloomy";
  return "Blue";
}

export function bandTone(kind: "hunger" | "mood", n: number) {
  if (n >= 55) return "good";
  if (n >= 35) return "ok";
  if (n >= 15) return "low";
  return kind === "hunger" ? "low" : "low";
}

export function morningPayout(streak: number) {
  return Math.min(200 + Math.max(0, streak - 1) * 50, 500);
}

export function nextStreak(prevStreak: number, prevOn: string | null, today: string) {
  if (prevOn === today) return prevStreak;
  if (prevOn === addDays(today, -1)) return prevStreak + 1;
  return 1;
}

export function glimsForScore(awarded: number) {
  return Math.min(Math.floor(awarded / GLIM_PER_SCORE), GLIM_CAP_PER_PLAY);
}

export function awardScore(clientScore: number, cap: number, featured: boolean) {
  if (!Number.isFinite(clientScore) || clientScore < 0) {
    throw new Error("That score does not count.");
  }
  if (clientScore > cap) {
    throw new Error("That score is past what this game will count.");
  }
  let awarded = Math.min(Math.floor(clientScore), cap);
  if (featured) awarded = Math.min(Math.floor(awarded * 1.5), cap);
  return awarded;
}

export function payoutWithDailyCap(awarded: number, alreadyToday: number) {
  const raw = glimsForScore(awarded);
  const room = Math.max(0, DAILY_GAME_GLIM_CAP - alreadyToday);
  return Math.min(raw, room);
}

export function featuredGame(date = new Date()) {
  const index = (wickDayOfYear(date) - 1) % GAMES.length;
  return GAMES[index];
}

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const PET_NAME = /^[A-Za-z][A-Za-z0-9' -]{1,19}$/;
const CIRCLE_SLUG = /^[a-z0-9-]{3,32}$/;

export function checkUsername(value: string) {
  const username = value.trim();
  if (!USERNAME.test(username)) {
    throw new Error("Usernames are 3–20 letters, numbers, or underscores.");
  }
  return username;
}

export function checkPetName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!PET_NAME.test(name)) {
    throw new Error("Names start with a letter and stay under 20 characters.");
  }
  return name;
}

export function checkCircleSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (!CIRCLE_SLUG.test(slug)) {
    throw new Error("Circle links use 3–32 lowercase letters, numbers, or dashes.");
  }
  return slug;
}

export function checkDisplayName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) {
    throw new Error("Display names stay between 1 and 40 characters.");
  }
  if (/[<>]/.test(name)) throw new Error("Display names stay plain text.");
  return name;
}

export function checkBio(value: string) {
  const bio = value.trim();
  if (bio.length > 400) throw new Error("Bios stay under 400 characters.");
  assertClean(bio);
  return bio;
}

const BLOCKED =
  /\b(fuck|shit|bitch|asshole|cunt|nigger|faggot|retard)\b/i;
const CONTACT = /(https?:\/\/|www\.|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

export function assertClean(text: string) {
  if (CONTACT.test(text)) {
    throw new Error("Keep it on the quay — no links or outside contact.");
  }
  if (BLOCKED.test(text)) {
    throw new Error("That wording does not belong on the boards.");
  }
}

export function checkPostBody(text: string) {
  const body = text.trim();
  if (body.length < 1 || body.length > 4000) {
    throw new Error("Posts stay between 1 and 4,000 characters.");
  }
  assertClean(body);
  return body;
}

export function checkTitle(text: string) {
  const title = text.trim().replace(/\s+/g, " ");
  if (title.length < 1 || title.length > 80) {
    throw new Error("Titles stay under 80 characters.");
  }
  assertClean(title);
  return title;
}

export function decayed(hunger: number, mood: number, lastTickIso: string, now = Date.now()) {
  const secs = Math.max(0, (now - new Date(lastTickIso).getTime()) / 1000);
  const hungerDrop = Math.min(hunger, Math.floor((secs * 5) / 3600));
  const nextHunger = hunger - hungerDrop;
  let moodDrop = Math.floor((secs * 3) / 3600);
  if (nextHunger < 35) moodDrop += Math.floor((secs * 2) / 3600);
  moodDrop = Math.min(mood, moodDrop);
  return {
    hunger: nextHunger,
    mood: mood - moodDrop,
    changed: hungerDrop > 0 || moodDrop > 0,
  };
}

export function careLine(hunger: number, mood: number) {
  if (hunger === 0 && mood === 0) return "Hollow and blue — a meal and a game would help.";
  if (hunger < 15) return "Rumbly. The pantry would be welcome.";
  if (mood < 15) return "Gloomy. A toy or a brush would lift this.";
  if (hunger >= 80 && mood >= 80) return "Stuffed and beaming.";
  return `${hungerBand(hunger)} and ${moodBand(mood).toLowerCase()}.`;
}
