import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ItemIcon } from "../components/ItemIcon";
import { ItemTip } from "../components/ItemTip";
import type { BasketRow, DailyStatus } from "../lib/types";
import { useTown } from "../state/Town";

export function DailiesPage() {
  const { api, act, profile, companions } = useTown();
  const [daily, setDaily] = useState<DailyStatus | null>(null);
  const [basket, setBasket] = useState<BasketRow[]>([]);
  const [pet, setPet] = useState(companions[0]?.id ?? "");
  function load() {
    if (!profile) return;
    api.dailies().then(setDaily).catch(() => setDaily(null));
    api.basket().then(setBasket).catch(() => setBasket([]));
  }
  useEffect(load, [api, profile]);
  if (!profile) return <div className="card"><h1>Dailies</h1><p><Link to="/sign-in">Sign in</Link> to claim today’s gifts.</p></div>;
  return (
    <div className="stack">
      <div>
        <p className="kicker">Wick Time</p>
        <h1>Today in Lumenwick</h1>
      </div>
      <section className="card">
        <h2>The Morning Wick</h2>
        <p>Light the harbor lantern once a day. The gift starts at 200 Glims and grows by 50, up to 500. Miss a day and the streak begins again.</p>
        <p>{daily ? (daily.morningClaimed ? `Already lit. Streak ${daily.streak}.` : `Today’s gift is ${daily.nextMorningGlims} Glims.`) : "Checking the lantern…"}</p>
        <button className="btn" type="button" disabled={daily?.morningClaimed} onClick={() => void act(() => api.claimMorning(), "The wick is lit.").then(load)}>Light it</button>
      </section>
      <section className="card">
        <h2>The Tide Bowl</h2>
        <p>A free modest meal. Feed a companion now, or tuck Tide Broth into the satchel.</p>
        <div className="inline">
          <select value={pet} onChange={(e) => setPet(e.target.value)}>
            <option value="">Put broth in the satchel</option>
            {companions.map((companion) => <option key={companion.id} value={companion.id}>{companion.name}</option>)}
          </select>
          <button className="btn" type="button" disabled={daily?.tideClaimed} onClick={() => void act(() => api.claimTide(pet || null), "The bowl is shared.").then(load)}>Take the bowl</button>
        </div>
      </section>
      <section className="card">
        <h2>The Shared Basket</h2>
        <p>Visitors may take up to three items a day. No Glims live here. {daily ? `${3 - daily.basketTaken} takes left.` : ""}</p>
        <div className="stack">
          {basket.map((row) => (
            <div key={row.id} className="inline">
              <span className="lot">
                <ItemTip item={{ slug: row.itemSlug, name: row.name, category: row.category ?? "misc", description: row.description, hunger: row.hunger, mood: row.mood, gearPower: row.gearPower, reusable: row.reusable }}>
                  <ItemIcon slug={row.itemSlug} category={row.category ?? "misc"} alt="" />
                </ItemTip>
                {row.name} {row.donor ? <span className="muted">from {row.donor}</span> : null}
              </span>
              <button className="btn secondary" type="button" onClick={() => void act(() => api.takeBasket(row.id), `Took ${row.name}.`).then(load)}>Take</button>
            </div>
          ))}
          {basket.length === 0 && <p>The basket is empty.</p>}
        </div>
      </section>
    </div>
  );
}
