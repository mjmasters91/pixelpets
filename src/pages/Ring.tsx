import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PetPortrait } from "../components/PetPortrait";
import { CHALLENGERS } from "../data/battle";
import type { BattleView } from "../lib/types";
import { useTown } from "../state/Town";

export function RingHome() {
  const { api, act, companions, profile, satchel } = useTown();
  const [companionId, setCompanionId] = useState(companions[0]?.id ?? "");
  const [gear, setGear] = useState<string[]>([]);
  const [opponents, setOpponents] = useState<{ id: string; name: string; speciesSlug: string; owner: string; level: number }[]>([]);
  const gearItems = satchel.filter((item) => ["weapon", "shield", "potion"].includes(item.category));
  useEffect(() => {
    if (companions[0] && !companionId) setCompanionId(companions[0].id);
  }, [companions, companionId]);
  useEffect(() => {
    api.battleOpponents().then(setOpponents).catch(() => setOpponents([]));
  }, [api]);
  function toggle(slug: string) {
    setGear((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length >= 2 ? current : [...current, slug]);
  }
  async function start(mode: "pve" | "pvp", key: string) {
    const id = await api.startBattle({
      companionId,
      mode,
      challengerSlug: mode === "pve" ? key : undefined,
      defenderId: mode === "pvp" ? key : undefined,
      gear,
    });
    window.location.assign(`${import.meta.env.BASE_URL}ring/${id.id}`.replace("//", "/"));
  }
  if (!profile) return <div className="card"><h1>The Ember Ring</h1><p><Link to="/sign-in">Sign in</Link> to step into the ring.</p></div>;
  return (
    <div className="stack">
      <div>
        <p className="kicker">Cinderreach</p>
        <h1>The Ember Ring</h1>
        <p>A friendly cliff ring. Pick a companion, carry up to two pieces of gear, and choose a challenger. Wins can pay Glims, up to ten rewarded bouts and 1,500 Glims a Wick-Time day.</p>
      </div>
      <section className="card">
        <label className="field">Your companion
          <select value={companionId} onChange={(event) => setCompanionId(event.target.value)}>
            {companions.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · level {pet.level} · {pet.wins}–{pet.losses}</option>)}
          </select>
        </label>
        <p className="muted">Gear in the satchel. Two slots.</p>
        <div className="row-actions">
          {gearItems.map((item) => (
            <button key={item.itemSlug} type="button" className={`btn ${gear.includes(item.itemSlug) ? "" : "secondary"}`} onClick={() => toggle(item.itemSlug)}>{item.name}</button>
          ))}
          {gearItems.length === 0 && <span>No ring gear yet. The Shield Step in Cinderreach sells it.</span>}
        </div>
      </section>
      <section>
        <h2>Challengers</h2>
        <div className="grid-3">
          {CHALLENGERS.map((foe) => (
            <article key={foe.slug} className="card">
              <div className="pet-frame"><PetPortrait species={foe.speciesSlug} alt="" /></div>
              <h3>{foe.name}</h3>
              <p className="muted">Tier {foe.tier} · level {foe.level}</p>
              <p>{foe.blurb}</p>
              <button className="btn" type="button" disabled={!companionId} onClick={() => void act(() => start("pve", foe.slug))}>Challenge</button>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Challenge a keeper</h2>
        <p>Their companion is played by the ring, not by them. They will see the result on their record.</p>
        {opponents.map((foe) => (
          <div key={foe.id} className="inline">
            <span>{foe.name} · {foe.owner} · level {foe.level}</span>
            <button className="btn secondary" type="button" onClick={() => void act(() => start("pvp", foe.id))}>Challenge</button>
          </div>
        ))}
        {opponents.length === 0 && <p className="muted">No other companions are waiting.</p>}
      </section>
    </div>
  );
}

export function RingArena() {
  const { battleId = "" } = useParams();
  const { api, act } = useTown();
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [fx, setFx] = useState<"" | "lunge" | "foe" | "inferno">("");
  useEffect(() => {
    api.getBattle(battleId).then(setBattle).catch(() => setBattle(null));
  }, [api, battleId]);
  async function turn(action: "attack" | "defend" | "item" | "flee" | "inferno") {
    const next = await api.battleTurn(battleId, action);
    setBattle(next);
    const recent = next.log.slice(-3).join(" ");
    if (recent.includes("Inferno Crown")) setFx("inferno");
    else if (action === "attack") setFx("lunge");
    else setFx("foe");
    window.setTimeout(() => setFx(""), 720);
  }
  if (!battle) return <div className="card"><h1>The ring is empty</h1><Link to="/ring">Back</Link></div>;
  const done = battle.status !== "active";
  return (
    <div className="stack">
      <p className="kicker">Ember Ring · round {battle.round}</p>
      <div className={`ember-arena ${fx === "inferno" ? "is-inferno" : ""}`}>
        {fx === "inferno" && <div className="flame-burst" aria-hidden="true" />}
        <div className="arena">
          <FighterCard who={battle.you} lunge={fx === "lunge" || fx === "inferno"} shake={false} />
          <FighterCard who={battle.foe} lunge={false} shake={fx === "foe" || fx === "inferno"} />
        </div>
      </div>
      {done ? (
        <section className="card">
          <h1>{battle.status === "won" ? "The ring is yours" : battle.status === "lost" ? "A bow, and step back" : "You left the ring"}</h1>
          <p>{battle.rewardXp} experience{battle.rewardGlims ? ` and ${battle.rewardGlims} Glims` : ""}. Level {battle.level}. Record {battle.wins}–{battle.losses}.</p>
          <Link className="btn" to="/ring">Another bout</Link>
        </section>
      ) : (
        <div className="row-actions">
          <button className="btn" type="button" onClick={() => void act(() => turn("attack"))}>Attack</button>
          <button className="btn secondary" type="button" onClick={() => void act(() => turn("defend"))}>Defend</button>
          <button className="btn secondary" type="button" onClick={() => void act(() => turn("item"))}>Use sip</button>
          <button className="btn ghost" type="button" onClick={() => void act(() => turn("flee"))}>Flee</button>
          {battle.you.speciesSlug === "crownwyrm" && (
            <button className="btn inferno" type="button" disabled={battle.you.infernoCd > 0} onClick={() => void act(() => turn("inferno"))}>
              Inferno Crown{battle.you.infernoCd > 0 ? ` (${battle.you.infernoCd})` : ""}
            </button>
          )}
        </div>
      )}
      <section className="card battle-log">
        {battle.log.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
      </section>
    </div>
  );
}

function FighterCard({ who, shake, lunge }: { who: { name: string; speciesSlug: string; hp: number; maxHp: number }; shake: boolean; lunge: boolean }) {
  const pct = Math.max(0, Math.round((who.hp / who.maxHp) * 100));
  return (
    <article className={`card fighter ${shake ? "shake" : ""} ${lunge ? "lunge" : ""} ${pct < 35 ? "flash" : ""}`}>
      <div className="pet-frame"><PetPortrait species={who.speciesSlug} alt={who.name} /></div>
      <h2>{who.name}</h2>
      <div className="hp"><div style={{ width: `${pct}%` }} /></div>
      <p className="muted">{who.hp} / {who.maxHp}</p>
    </article>
  );
}
