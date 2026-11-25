import { SPECIES } from "../data/catalog";
import { xpToLevel } from "../data/battle";

export type Fighter = {
  name: string;
  speciesSlug: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  defending: boolean;
  weapon: number;
  shield: number;
  potionHeal: number;
  potionLeft: boolean;
};

export type BattleStatus = "active" | "won" | "lost" | "fled";

export type EngineState = {
  round: number;
  status: BattleStatus;
  you: Fighter;
  foe: Fighter;
  log: string[];
};

export function speciesStats(slug: string, level: number) {
  const species = SPECIES.find((item) => item.slug === slug);
  const lv = Math.max(1, Math.min(20, level));
  const hp = (species?.baseHp ?? 30) + (lv - 1) * 6;
  return {
    maxHp: hp,
    atk: (species?.baseAtk ?? 8) + (lv - 1) * 2,
    def: (species?.baseDef ?? 8) + (lv - 1),
    spd: (species?.baseSpd ?? 8) + (lv - 1),
  };
}

export function applyXp(level: number, xp: number, gain: number) {
  let nextLevel = level;
  let nextXp = xp + gain;
  while (nextLevel < 20 && nextXp >= xpToLevel(nextLevel)) {
    nextXp -= xpToLevel(nextLevel);
    nextLevel += 1;
  }
  if (nextLevel >= 20) nextXp = Math.min(nextXp, xpToLevel(20));
  return { level: nextLevel, xp: nextXp };
}

function hit(att: Fighter, defn: Fighter, roll: number) {
  const guard = defn.def + defn.shield + (defn.defending ? defn.def : 0);
  let damage = att.atk + att.weapon + roll - Math.floor(guard / 2);
  if (roll === 6) damage += 3;
  damage = Math.max(1, damage);
  defn.hp = Math.max(0, defn.hp - damage);
  defn.defending = false;
  const crit = roll === 6 ? " A bright hit." : "";
  return `${att.name} strikes ${defn.name} for ${damage}.${crit}`;
}

function foeAction(foe: Fighter, roll: number) {
  if (foe.hp < foe.maxHp * 0.35 && roll <= 2) {
    foe.defending = true;
    return `${foe.name} braces.`;
  }
  return null;
}

export function resolveTurn(state: EngineState, action: "attack" | "defend" | "item" | "flee", rng: () => number): string[] {
  if (state.status !== "active") return ["The ring is already quiet."];
  const lines: string[] = [];
  const you = state.you;
  const foe = state.foe;
  const youFirst = you.spd >= foe.spd;

  const playerAct = () => {
    if (state.status !== "active" || you.hp <= 0) return;
    if (action === "flee") {
      const chance = Math.max(0.2, Math.min(0.9, 0.55 + (you.spd - foe.spd) * 0.03));
      const roll = rng() / 100;
      if (roll < chance) {
        state.status = "fled";
        lines.push(`${you.name} slips out of the ring.`);
      } else lines.push(`${you.name} cannot find a gap to flee.`);
      return;
    }
    if (action === "defend") {
      you.defending = true;
      lines.push(`${you.name} braces for the next hit.`);
      return;
    }
    if (action === "item") {
      if (!you.potionLeft || you.potionHeal <= 0) {
        lines.push("No sip left in that gear.");
        return;
      }
      const healed = Math.min(you.potionHeal, you.maxHp - you.hp);
      you.hp += healed;
      you.potionLeft = false;
      lines.push(`${you.name} drinks and recovers ${healed}.`);
      return;
    }
    const roll = 1 + Math.floor(rng() % 6);
    lines.push(hit(you, foe, roll));
    if (foe.hp <= 0) state.status = "won";
  };

  const foeAct = () => {
    if (state.status !== "active" || foe.hp <= 0) return;
    const think = 1 + Math.floor(rng() % 6);
    const braced = foeAction(foe, think);
    if (braced) {
      lines.push(braced);
      return;
    }
    const roll = 1 + Math.floor(rng() % 6);
    lines.push(hit(foe, you, roll));
    if (you.hp <= 0) state.status = "lost";
  };

  if (action === "flee") playerAct();
  else if (youFirst) {
    playerAct();
    foeAct();
  } else {
    foeAct();
    playerAct();
  }
  state.round += 1;
  state.log.push(...lines);
  if (state.log.length > 40) state.log = state.log.slice(-40);
  return lines;
}
